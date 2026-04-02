const mongoose = require('mongoose');

const noShowLogSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    month: {
      type: String, // YYYY-MM
      required: true,
    },
    count: {
      type: Number,
      default: 1,
    },
    cancelledByStaff: {
      type: Boolean,
      default: false,
    },
    cancelledAt: { type: Date },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Compound index for monthly count queries
noShowLogSchema.index({ studentId: 1, month: 1 });

module.exports = mongoose.model('NoShowLog', noShowLogSchema);
