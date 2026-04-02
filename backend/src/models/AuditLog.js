const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'LOGIN',
        'LOGOUT',
        'QUEUE_JOIN',
        'QUEUE_CANCEL',
        'SLOT_MOVE',
        'EMERGENCY_OVERRIDE',
        'NO_SHOW_MARK',
        'NO_SHOW_CANCEL',
        'NEXT_PATIENT',
        'ACCOUNT_LOCK',
        'ACCOUNT_UNLOCK',
      ],
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'targetModel',
    },
    targetModel: {
      type: String,
      enum: ['User', 'Appointment', 'Queue', 'Doctor'],
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    ipAddress: { type: String },
    userAgent: { type: String },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
