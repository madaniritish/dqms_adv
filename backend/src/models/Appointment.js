const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      index: true,
    },
    timeSlot: {
      type: String, // Format: "HH:MM"
      required: true,
    },
    queuePosition: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: [
        'Waiting',
        'Second-Next',
        'Next',
        'InConsultation',
        'Completed',
        'Cancelled',
        'NoShow',
        'Rescheduled',
        'EmergencyShift',
      ],
      default: 'Waiting',
      index: true,
    },
    slotChangeCount: {
      type: Number,
      default: 0,
    },
    isEmergency: {
      type: Boolean,
      default: false,
    },
    emergencyReason: { type: String },
    emergencySeverity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
    },
    notifiedSecondNext: { type: Boolean, default: false },
    notifiedNext: { type: Boolean, default: false },
    nextNotifiedAt: { type: Date },
    noShowMarkedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String },
  },
  { timestamps: true }
);

// Compound index for BR-1: one active entry per student per date
appointmentSchema.index(
  { studentId: 1, date: 1, status: 1 },
  {
    partialFilterExpression: {
      status: { $in: ['Waiting', 'Second-Next', 'Next', 'InConsultation'] },
    },
  }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
