const Appointment = require('../models/Appointment');
const Queue = require('../models/Queue');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const AuditLog = require('../models/AuditLog');
const socketService = require('../services/socketService');
const notificationService = require('../services/notificationService');
const { APPOINTMENT_STATUS, SLOT_DURATION_MIN } = require('../config/constants');

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

// GET /api/doctor/queue
exports.getDoctorQueue = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });

    const today = new Date().toISOString().split('T')[0];
    const patients = await Appointment.find({
      doctorId: doctor._id, date: today,
      status: { $nin: ['Completed', 'Cancelled', 'NoShow'] },
    }).populate('studentId', 'name rollNumber').sort({ queuePosition: 1 }).limit(5);

    const totalWaiting = await Appointment.countDocuments({
      doctorId: doctor._id, date: today,
      status: { $nin: ['Completed', 'Cancelled', 'NoShow'] },
    });

    res.status(200).json({
      success: true,
      doctor: { name: doctor.name, specialization: doctor.specialization, status: doctor.currentStatus },
      patients, totalWaiting,
      isEmpty: patients.length === 0,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/doctor/history
exports.getDoctorHistory = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });

    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const history = await Appointment.find({
      doctorId: doctor._id,
      status: { $in: ['Completed'] },
    })
      .populate('studentId', 'name rollNumber email')
      .sort({ date: -1, timeSlot: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      count: history.length,
      appointments: history,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/doctor/next
exports.callNextPatient = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });

    const today = new Date().toISOString().split('T')[0];

    // Mark current InConsultation as Completed
    const current = await Appointment.findOne({
      doctorId: doctor._id, date: today, status: 'InConsultation',
    });
    if (current) {
      current.status = APPOINTMENT_STATUS.COMPLETED;
      current.completedAt = new Date();
      await current.save();
    }

    // Find next patient (Next → InConsultation)
    const nextPatient = await Appointment.findOne({
      doctorId: doctor._id, date: today,
      status: { $in: ['Next', 'Second-Next', 'Waiting'] },
    }).populate('studentId').sort({ queuePosition: 1 });

    if (!nextPatient) {
      await Queue.findOneAndUpdate({ date: today, doctorId: doctor._id }, { currentPatientId: null });
      await Doctor.findByIdAndUpdate(doctor._id, { currentStatus: 'Available' });
      socketService.emitQueueUpdate({ date: today, doctorId: doctor._id, isEmpty: true });
      return res.status(200).json({ success: true, isEmpty: true, message: 'Queue is empty. Doctor is now available.' });
    }

    nextPatient.status = APPOINTMENT_STATUS.IN_CONSULTATION;
    await nextPatient.save();

    await Queue.findOneAndUpdate({ date: today, doctorId: doctor._id }, { currentPatientId: nextPatient._id });
    await Doctor.findByIdAndUpdate(doctor._id, { currentStatus: 'InConsultation' });

    // Decrement positions for remaining
    await Appointment.updateMany(
      {
        doctorId: doctor._id, date: today,
        status: { $nin: ['Completed', 'Cancelled', 'NoShow', 'InConsultation'] },
      },
      { $inc: { queuePosition: -1 } }
    );

    AuditLog.create({
      action: 'NEXT_PATIENT', performedBy: req.user._id,
      targetId: nextPatient._id, targetModel: 'Appointment',
      details: { doctorId: doctor._id, completedId: current?._id },
    }).catch(console.error);

    // Notify new #1 and #2
    const queue = await Queue.findOne({ date: today, doctorId: doctor._id });
    if (queue) await notifyTopTwo(queue);
    socketService.emitQueueUpdate({ date: today, doctorId: doctor._id });

    res.status(200).json({
      success: true, message: 'Next patient called.',
      currentPatient: {
        _id: nextPatient._id, student: nextPatient.studentId,
        timeSlot: nextPatient.timeSlot, status: APPOINTMENT_STATUS.IN_CONSULTATION,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
