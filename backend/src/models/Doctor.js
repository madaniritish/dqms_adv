const mongoose = require('mongoose');

const availableSlotSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    times: [{ type: String }], // ["09:00","09:12","09:24",...]
    isHoliday: { type: Boolean, default: false },
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    specialization: {
      type: String,
      required: true,
      trim: true,
    },
    qualification: { type: String, trim: true },
    roomNumber: { type: String, trim: true },
    phone: { type: String, trim: true },
    availableSlots: [availableSlotSchema],
    maxPatientsPerDay: { type: Number, default: 40 },
    slotDurationMin: { type: Number, default: 12 },
    isAvailableToday: { type: Boolean, default: true },
    currentStatus: {
      type: String,
      enum: ['Available', 'InConsultation', 'OnBreak', 'Offline'],
      default: 'Available',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Doctor', doctorSchema);
