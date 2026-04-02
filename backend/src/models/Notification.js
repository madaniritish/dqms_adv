const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
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
    message: {
      type: String,
      required: true,
    },
    channel: {
      type: String,
      enum: ['socket', 'email', 'sms'],
      required: true,
    },
    type: {
      type: String,
      enum: ['Second-Next', 'Next', 'Cancelled', 'Emergency', 'Confirmation', 'NoShow'],
      required: true,
    },
    deliveredAt: {
      type: Date,
      default: Date.now,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
