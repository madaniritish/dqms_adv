const Appointment = require('../models/Appointment');
const Queue = require('../models/Queue');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const AuditLog = require('../models/AuditLog');
const socketService = require('../services/socketService');
const notificationService = require('../services/notificationService');
const {
  SLOT_DURATION_MIN,
  CANCEL_CUTOFF_MIN,
  MOVE_SLOT_CUTOFF_MIN,
  APPOINTMENT_STATUS,
  QUEUE_START_HOUR,
  QUEUE_START_MIN,
  CLOSING_HOUR,
  CLOSING_MIN,
  CUTOFF_MIN_BEFORE_CLOSE,
  NOSHOW_WAIT_MIN,
  CLINIC_TZ_OFFSET_MIN,
} = require('../config/constants');

// Convert stored {date: YYYY-MM-DD, timeSlot: HH:MM} to a Date.
// We interpret HH:MM as "clinic local time" and convert to UTC epoch for comparisons.
const toSlotDateTime = (dateStr, timeSlot) => {
  if (!dateStr || !timeSlot) return null;
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const [hh, mm] = String(timeSlot).split(':').map(Number);
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const utcMs = Date.UTC(y, m - 1, d, hh, mm, 0, 0);
  const offsetMs = CLINIC_TZ_OFFSET_MIN * 60 * 1000;
  return new Date(utcMs - offsetMs);
};

const getClinicDateStr = (nowMs) => {
  const offsetMs = CLINIC_TZ_OFFSET_MIN * 60 * 1000;
  return new Date(nowMs + offsetMs).toISOString().split('T')[0];
};

const isDuplicateKeyError = (err) => err && err.code === 11000;

// Auto-mark overdue appointments as NoShow.
// This keeps Queue Status correct and moves missed appointments into History automatically.
const autoMarkNoShowsForStudent = async (studentId) => {
  const now = new Date();

  const overdueCandidates = await Appointment.find({
    studentId,
    status: { $in: ['Waiting', 'Second-Next', 'Next'] },
  }).select('_id date timeSlot status');

  if (!overdueCandidates || overdueCandidates.length === 0) return 0;

  let marked = 0;
  const graceMs = NOSHOW_WAIT_MIN * 60 * 1000;

  for (const appt of overdueCandidates) {
    const slotTime = toSlotDateTime(appt.date, appt.timeSlot);
    if (!slotTime) continue;

    if (now.getTime() >= slotTime.getTime() + graceMs) {
      await Appointment.findByIdAndUpdate(appt._id, {
        status: APPOINTMENT_STATUS.NO_SHOW,
        noShowMarkedAt: new Date(),
      });
      marked += 1;
    }
  }

  return marked;
};

// Helper: get or create queue for a date + doctor
const getOrCreateQueue = async (date, doctorId) => {
  const queueID = `${date}-${doctorId}`;
  let queue = await Queue.findOne({ date, doctorId });
  if (!queue) {
    queue = await Queue.create({ queueID, date, doctorId, entries: [], currentSize: 0 });
  }
  return queue;
};

// Helper: generate time slots
const generateSlots = (doctor) => {
  const slots = [];
  const startH = QUEUE_START_HOUR, startM = QUEUE_START_MIN;
  const closeH = CLOSING_HOUR, closeM = CLOSING_MIN;
  const cutoff = closeH * 60 + closeM - CUTOFF_MIN_BEFORE_CLOSE;
  let current = startH * 60 + startM;
  const maxSlots = doctor.maxPatientsPerDay || 40;
  while (current <= cutoff && slots.length < maxSlots) {
    const h = Math.floor(current / 60).toString().padStart(2, '0');
    const m = (current % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
    current += doctor.slotDurationMin || SLOT_DURATION_MIN;
  }
  return slots;
};

// Helper: get taken slots
const getTakenSlots = async (date, doctorId) => {
  const appts = await Appointment.find({
    date, doctorId, status: { $nin: ['Cancelled', 'NoShow', 'Completed'] },
  }).select('timeSlot');
  return appts.map((a) => a.timeSlot);
};

// Helper: broadcast queue update
const broadcastQueueUpdate = async (date, doctorId) => {
  const queue = await Queue.findOne({ date, doctorId }).populate({
    path: 'entries',
    populate: { path: 'studentId', select: 'name rollNumber email' },
  });
  if (queue) socketService.emitQueueUpdate({ date, doctorId, queue });
};

// Helper: notify #1 and #2
const notifyTopTwo = async (queue) => {
  const activeEntries = await Appointment.find({
    _id: { $in: queue.entries },
    status: { $in: ['Waiting', 'Second-Next', 'Next', 'EmergencyShift'] },
  }).populate('studentId').sort({ queuePosition: 1 });

  for (let i = 0; i < activeEntries.length; i++) {
    const appt = activeEntries[i];
    const student = appt.studentId;
    if (i === 0 && appt.status !== 'Next') {
      await Appointment.findByIdAndUpdate(appt._id, { status: 'Next', notifiedNext: true, nextNotifiedAt: new Date() });
      socketService.notifyNext(student._id.toString(), { appointmentId: appt._id, position: 1 });
      notificationService.sendNextEmail(student, appt).catch(console.error);
      notificationService.logNotification({ studentId: student._id, appointmentId: appt._id, message: 'You are NEXT', channel: 'socket', type: 'Next' }).catch(console.error);
    } else if (i === 1 && appt.status !== 'Second-Next') {
      await Appointment.findByIdAndUpdate(appt._id, { status: 'Second-Next', notifiedSecondNext: true });
      socketService.notifySecondNext(student._id.toString(), { appointmentId: appt._id, position: 2 });
      notificationService.sendSecondNextEmail(student, appt).catch(console.error);
      notificationService.logNotification({ studentId: student._id, appointmentId: appt._id, message: 'You are Second-Next', channel: 'socket', type: 'Second-Next' }).catch(console.error);
    } else if (i >= 2 && appt.status !== 'Waiting') {
      await Appointment.findByIdAndUpdate(appt._id, { status: 'Waiting' });
    }
  }
};

// GET /api/queue/slots
exports.getAvailableSlots = async (req, res) => {
  try {
    const { date, doctorId } = req.query;
    if (!date || !doctorId) return res.status(400).json({ success: false, message: 'Date and doctorId required.' });
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });
    const allSlots = generateSlots(doctor);
    const takenSlots = await getTakenSlots(date, doctorId);
    const available = allSlots.filter((s) => !takenSlots.includes(s));

    // If the selected date is "today", only keep slots that are still in the future.
    // This fixes the UI showing 9:00 even when it's already afternoon.
    const nowMs = Date.now();
    if (String(date) === getClinicDateStr(nowMs)) {
      const filtered = available.filter((s) => {
        const slotTime = toSlotDateTime(date, s);
        return slotTime && nowMs < slotTime.getTime();
      });
      res.status(200).json({ success: true, slots: filtered, takenSlots, allSlots });
      return;
    }

    res.status(200).json({ success: true, slots: available, takenSlots, allSlots });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/queue/join
exports.joinQueue = async (req, res) => {
  try {
    const { date, doctorId } = req.body;
    const studentId = req.user._id;

    if (!date || !doctorId) return res.status(400).json({ success: false, message: 'Date and doctorId are required.' });

    // BR-1: One active entry per student per date
    const existing = await Appointment.findOne({
      studentId, date, status: { $in: ['Waiting', 'Second-Next', 'Next', 'InConsultation'] },
    });
    if (existing) return res.status(409).json({ success: false, message: 'You already have an active appointment for this date.' });

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });

    // BR-2: Cutoff check
    const now = new Date();
    const [y, m, d] = date.split('-').map(Number);
    const cutoffTime = new Date(y, m - 1, d, CLOSING_HOUR, CLOSING_MIN - CUTOFF_MIN_BEFORE_CLOSE);
    if (now >= cutoffTime) return res.status(400).json({ success: false, message: 'Queue is closed. Please select a future date.' });

    // BR-3: Next available slot
    const allSlots = generateSlots(doctor);
    const takenSlots = await getTakenSlots(date, doctorId);
    let available = allSlots.filter((s) => !takenSlots.includes(s));

    // If joining for today's date, remove past slots so the assignment is the next future slot.
    const nowMs = Date.now();
    if (String(date) === getClinicDateStr(nowMs)) {
      available = available.filter((s) => {
        const slotTime = toSlotDateTime(date, s);
        return slotTime && nowMs < slotTime.getTime();
      });
    }

    if (available.length === 0) return res.status(400).json({ success: false, message: 'No slots available. Please try another date.' });

    const queue = await getOrCreateQueue(date, doctorId);
    let appointment = null;
    let assignedSlot = null;
    let queuePosition = null;

    // Concurrency-safe reservation:
    // try each currently available slot; if one collides due to another
    // concurrent booking, move to the next free slot.
    for (const candidateSlot of available) {
      try {
        assignedSlot = candidateSlot;
        queuePosition = (await Appointment.countDocuments({
          doctorId, date, status: { $nin: ['Cancelled', 'NoShow', 'Completed'] },
        })) + 1;

        appointment = await Appointment.create({
          studentId, doctorId, date, timeSlot: candidateSlot,
          queuePosition, status: APPOINTMENT_STATUS.WAITING,
        });
        break;
      } catch (createErr) {
        if (isDuplicateKeyError(createErr)) {
          // Duplicate active slot (or active student/date collision) under concurrency.
          // If it's a student/date collision, return conflict immediately.
          const keyPattern = createErr.keyPattern || {};
          if (keyPattern.studentId && keyPattern.date) {
            return res.status(409).json({ success: false, message: 'You already have an active appointment for this date.' });
          }
          // Otherwise, slot collision: continue to next candidate slot.
          continue;
        }
        throw createErr;
      }
    }

    if (!appointment) {
      return res.status(409).json({
        success: false,
        message: 'Slots were just booked by others. Please try again to get the latest available slot.',
      });
    }

    await Queue.findByIdAndUpdate(queue._id, {
      $push: { entries: appointment._id },
      $inc: { currentSize: 1 },
    });

    AuditLog.create({ action: 'QUEUE_JOIN', performedBy: studentId, targetId: appointment._id, targetModel: 'Appointment', details: { date, doctorId, slot: assignedSlot } }).catch(console.error);

    // Confirmation email
    const student = await User.findById(studentId);
    notificationService.sendConfirmationEmail(student, appointment, doctor).catch(console.error);

    // Notify top 2
    const freshQueue = await Queue.findOne({ date, doctorId });
    await notifyTopTwo(freshQueue);
    await broadcastQueueUpdate(date, doctorId);

    res.status(201).json({
      success: true,
      message: 'Successfully joined the queue.',
      appointment: {
        _id: appointment._id,
        date, timeSlot: assignedSlot, queuePosition,
        estimatedWaitMin: (queuePosition - 1) * SLOT_DURATION_MIN,
        doctor: { name: doctor.name, specialization: doctor.specialization },
        status: APPOINTMENT_STATUS.WAITING,
      },
    });
  } catch (err) {
    console.error('joinQueue error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/queue/status/:studentId
exports.getQueueStatus = async (req, res) => {
  try {
    const studentId = req.params.studentId;

    // Keep status correct by marking overdue appointments as NoShow.
    // Without this, old booked slots remain "active" forever.
    await autoMarkNoShowsForStudent(studentId);

    const appointment = await Appointment.findOne({
      studentId, status: { $in: ['Waiting', 'Second-Next', 'Next', 'InConsultation'] },
    }).populate('doctorId', 'name specialization roomNumber').sort({ createdAt: -1 });

    if (!appointment) return res.status(200).json({ success: true, active: false, message: 'No active appointment.' });

    const aheadCount = await Appointment.countDocuments({
      doctorId: appointment.doctorId._id, date: appointment.date,
      queuePosition: { $lt: appointment.queuePosition },
      status: { $nin: ['Cancelled', 'NoShow', 'Completed'] },
    });

    res.status(200).json({
      success: true, active: true,
      appointment: {
        _id: appointment._id, date: appointment.date,
        timeSlot: appointment.timeSlot, queuePosition: appointment.queuePosition,
        status: appointment.status, patientsAhead: aheadCount,
        estimatedWaitMin: aheadCount * SLOT_DURATION_MIN,
        doctor: appointment.doctorId, isEmergency: appointment.isEmergency,
        notifiedNext: appointment.notifiedNext, nextNotifiedAt: appointment.nextNotifiedAt,
        slotChangeCount: appointment.slotChangeCount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/queue/history/:studentId
exports.getHistory = async (req, res) => {
  try {
    const studentId = req.params.studentId;

    // Ensure missed appointments appear as NoShow in History.
    await autoMarkNoShowsForStudent(studentId);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const fromDate = sixMonthsAgo.toISOString().split('T')[0];
    const appointments = await Appointment.find({
      studentId, date: { $gte: fromDate },
      status: { $in: ['Completed', 'Cancelled', 'NoShow', 'Rescheduled'] },
    }).populate('doctorId', 'name specialization').sort({ date: -1 });
    res.status(200).json({ success: true, count: appointments.length, appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/queue/slots/later
exports.getLaterSlots = async (req, res) => {
  try {
    const { appointmentId } = req.query;
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found.' });
    const doctor = await Doctor.findById(appointment.doctorId);
    const allSlots = generateSlots(doctor);
    const takenSlots = await getTakenSlots(appointment.date, appointment.doctorId);
    const laterSlots = allSlots.filter((s) => s > appointment.timeSlot && !takenSlots.includes(s));
    res.status(200).json({ success: true, currentSlot: appointment.timeSlot, laterSlots });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/queue/move
exports.moveSlot = async (req, res) => {
  try {
    const { appointmentId, newSlot } = req.body;
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found.' });

    if (newSlot <= appointment.timeSlot)
      return res.status(400).json({ success: false, message: 'Can only move to a later time slot.' });

    const nowMs = Date.now();
    const slotTime = toSlotDateTime(appointment.date, appointment.timeSlot);
    if (!slotTime) {
      return res.status(400).json({ success: false, message: 'Invalid appointment time.' });
    }
    if (nowMs >= slotTime.getTime()) {
      return res.status(400).json({
        success: false,
        message: 'Appointment time has passed. It will be marked as No-Show and moved to History.',
      });
    }
    if ((slotTime.getTime() - nowMs) / 60000 < MOVE_SLOT_CUTOFF_MIN)
      return res.status(400).json({ success: false, message: `Cannot change slot within ${MOVE_SLOT_CUTOFF_MIN} minutes of appointment.` });

    const taken = await getTakenSlots(appointment.date, appointment.doctorId);
    if (taken.includes(newSlot))
      return res.status(409).json({ success: false, message: 'Selected slot is no longer available.' });

    const aheadCount = await Appointment.countDocuments({
      doctorId: appointment.doctorId, date: appointment.date,
      timeSlot: { $lte: newSlot }, status: { $nin: ['Cancelled', 'NoShow', 'Completed'] },
      _id: { $ne: appointment._id },
    });

    const oldSlot = appointment.timeSlot;
    appointment.timeSlot = newSlot;
    appointment.slotChangeCount += 1;
    appointment.queuePosition = aheadCount + 1;
    appointment.status = APPOINTMENT_STATUS.WAITING;
    await appointment.save();

    AuditLog.create({ action: 'SLOT_MOVE', performedBy: req.user._id, targetId: appointment._id, targetModel: 'Appointment', details: { oldSlot, newSlot } }).catch(console.error);
    const student = await User.findById(appointment.studentId);
    const doctor = await Doctor.findById(appointment.doctorId);
    notificationService.sendConfirmationEmail(student, appointment, doctor).catch(console.error);
    await broadcastQueueUpdate(appointment.date, appointment.doctorId.toString());

    res.status(200).json({ success: true, message: 'Slot moved successfully.', appointment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/queue/cancel/:appointmentId
exports.cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found.' });

    if (appointment.studentId.toString() !== req.user._id.toString() && req.user.role !== 'staff')
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this appointment.' });

    const nowMs = Date.now();
    const slotTime = toSlotDateTime(appointment.date, appointment.timeSlot);
    if (!slotTime) {
      return res.status(400).json({ success: false, message: 'Invalid appointment time.' });
    }
    if (nowMs >= slotTime.getTime()) {
      return res.status(400).json({
        success: false,
        message: 'Appointment time has passed. It will be marked as No-Show and moved to History.',
      });
    }
    if ((slotTime.getTime() - nowMs) / 60000 < CANCEL_CUTOFF_MIN)
      return res.status(400).json({ success: false, message: `Cannot cancel within ${CANCEL_CUTOFF_MIN} minutes of appointment.` });

    appointment.status = APPOINTMENT_STATUS.CANCELLED;
    appointment.cancelledAt = new Date();
    await appointment.save();

    await Queue.findOneAndUpdate(
      { date: appointment.date, doctorId: appointment.doctorId },
      { $pull: { entries: appointment._id }, $inc: { currentSize: -1 } }
    );

    AuditLog.create({ action: 'QUEUE_CANCEL', performedBy: req.user._id, targetId: appointment._id, targetModel: 'Appointment', details: {} }).catch(console.error);
    const student = await User.findById(appointment.studentId);
    notificationService.sendCancellationEmail(student, appointment).catch(console.error);
    await broadcastQueueUpdate(appointment.date, appointment.doctorId.toString());

    res.status(200).json({ success: true, message: 'Appointment cancelled successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
