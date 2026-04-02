const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema(
  {
    queueID: {
      type: String,
      required: true,
      unique: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    entries: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
      },
    ],
    currentSize: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    currentPatientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for uniqueness per doctor per date
queueSchema.index({ date: 1, doctorId: 1 }, { unique: true });

module.exports = mongoose.model('Queue', queueSchema);
