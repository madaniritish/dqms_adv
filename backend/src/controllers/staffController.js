const Appointment = require('../models/Appointment');
const Queue = require('../models/Queue');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const NoShowLog = require('../models/NoShowLog');
const AuditLog = require('../models/AuditLog');
const socketService = require('../services/socketService');
const notificationService = require('../services/notificationService');
const { APPOINTMENT_STATUS } = require('../config/constants');

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
      socketService.notifyNext(student._id.toString(), { appointmentId: appt._id });
      notificationService.sendNextEmail(student, appt).catch(console.error);
    } else if (i === 1 && appt.status !== 'Second-Next') {
      await Appointment.findByIdAndUpdate(appt._id, { status: 'Second-Next', notifiedSecondNext: true });
      socketService.notifySecondNext(student._id.toString(), { appointmentId: appt._id });
      notificationService.sendSecondNextEmail(student, appt).catch(console.error);
    }
  }
};

// GET /api/staff/queue
exports.getStaffQueue = async (req, res) => {
  try {
    const { date, doctorId, status } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const filter = { date: date || today };
    if (doctorId) filter.doctorId = doctorId;
    if (status) filter.status = status;
    else filter.status = { $nin: ['Completed', 'Cancelled'] };

    const appointments = await Appointment.find(filter)
      .populate('studentId', 'name email rollNumber phone')
      .populate('doctorId', 'name specialization roomNumber')
      .sort({ queuePosition: 1 });

    res.status(200).json({ success: true, count: appointments.length, appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/staff/emergency
exports.markEmergency = async (req, res) => {
  try {
    const { patientId, severity, reason } = req.body;
    if (!patientId || !severity || !reason)
      return res.status(400).json({ success: false, message: 'patientId, severity, and reason are required.' });

    const appointment = await Appointment.findById(patientId);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found.' });

    const queue = await Queue.findOne({ date: appointment.date, doctorId: appointment.doctorId });
    if (!queue) return res.status(404).json({ success: false, message: 'Queue not found.' });

    const oldPosition = appointment.queuePosition;

    // Shift all patients with lower positions up by 1
    const affectedAppts = await Appointment.find({
      _id: { $in: queue.entries, $ne: appointment._id },
      status: { $nin: ['Cancelled', 'NoShow', 'Completed'] },
      queuePosition: { $lt: oldPosition },
    });

    const bulkOps = affectedAppts.map((a) => ({
      updateOne: {
        filter: { _id: a._id },
        update: { $inc: { queuePosition: 1 }, $set: { status: 'Waiting' } },
      },
    }));
    if (bulkOps.length > 0) await Appointment.bulkWrite(bulkOps);

    // Set emergency patient to #1
    appointment.queuePosition = 1;
    appointment.isEmergency = true;
    appointment.status = APPOINTMENT_STATUS.NEXT;
    appointment.emergencySeverity = severity;
    appointment.emergencyReason = reason;
    appointment.notifiedNext = true;
    appointment.nextNotifiedAt = new Date();
    await appointment.save();

    // Reorder queue entries array
    const filteredEntries = queue.entries.filter((e) => e.toString() !== appointment._id.toString());
    queue.entries = [appointment._id, ...filteredEntries];
    await queue.save();

    // BR-10: Audit log
    AuditLog.create({
      action: 'EMERGENCY_OVERRIDE', performedBy: req.user._id,
      targetId: appointment._id, targetModel: 'Appointment',
      details: { severity, reason, oldPosition, patientId: appointment.studentId },
    }).catch(console.error);

    // Notify emergency patient
    const student = await User.findById(appointment.studentId);
    socketService.notifyNext(student._id.toString(), { appointmentId: appointment._id, isEmergency: true });

    // Notify all affected patients
    for (const a of affectedAppts) {
      const affected = await User.findById(a.studentId);
      if (affected) socketService.notifyEmergency(affected._id.toString(), { appointmentId: a._id });
    }

    socketService.emitQueueUpdate({ date: appointment.date, doctorId: appointment.doctorId });
    res.status(200).json({ success: true, message: 'Emergency override applied. Patient moved to position #1.' });
  } catch (err) {
    console.error('markEmergency error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/staff/noshow
exports.markNoShow = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found.' });
    if (appointment.status !== 'Next')
      return res.status(400).json({ success: false, message: 'Can only mark No-Show for the current #1 patient.' });

    appointment.status = APPOINTMENT_STATUS.NO_SHOW;
    appointment.noShowMarkedAt = new Date();
    await appointment.save();

    // Remove from queue and decrement size
    const queue = await Queue.findOneAndUpdate(
      { date: appointment.date, doctorId: appointment.doctorId },
      { $pull: { entries: appointment._id }, $inc: { currentSize: -1 } },
      { new: true }
    );

    // Decrement positions of remaining
    if (queue) {
      await Appointment.updateMany(
        { _id: { $in: queue.entries }, status: { $nin: ['Cancelled', 'NoShow', 'Completed', 'InConsultation'] } },
        { $inc: { queuePosition: -1 } }
      );
    }

    // Log no-show
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    NoShowLog.create({
      studentId: appointment.studentId, appointmentId: appointment._id,
      date: appointment.date, month, staffId: req.user._id,
    }).catch(console.error);

    AuditLog.create({
      action: 'NO_SHOW_MARK', performedBy: req.user._id,
      targetId: appointment._id, targetModel: 'Appointment',
      details: { studentId: appointment.studentId },
    }).catch(console.error);

    // Refresh and notify new top 2
    const freshQueue = await Queue.findOne({ date: appointment.date, doctorId: appointment.doctorId });
    if (freshQueue && freshQueue.entries.length > 0) {
      await notifyTopTwo(freshQueue);
    } else {
      socketService.emitQueueUpdate({ date: appointment.date, doctorId: appointment.doctorId, isEmpty: true });
    }
    socketService.emitQueueUpdate({ date: appointment.date, doctorId: appointment.doctorId });

    res.status(200).json({ success: true, message: 'No-show recorded and queue advanced.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
