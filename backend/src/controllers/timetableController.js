const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const {
  SLOT_DURATION_MIN,
  QUEUE_START_HOUR,
  QUEUE_START_MIN,
  CLOSING_HOUR,
  CLOSING_MIN,
  CUTOFF_MIN_BEFORE_CLOSE,
} = require('../config/constants');

// Generate consistent time slots for a given doctor.
// Matches the logic used by `queueController` so timetable aligns with booking.
const generateSlotsForDoctor = (doctor) => {
  const startH = QUEUE_START_HOUR;
  const startM = QUEUE_START_MIN;
  const closeH = CLOSING_HOUR;
  const closeM = CLOSING_MIN;
  const cutoff = closeH * 60 + closeM - CUTOFF_MIN_BEFORE_CLOSE;

  let current = startH * 60 + startM;
  const maxSlots = doctor.maxPatientsPerDay || 40;
  const step = doctor.slotDurationMin || SLOT_DURATION_MIN;

  const slots = [];
  while (current <= cutoff && slots.length < maxSlots) {
    const h = Math.floor(current / 60).toString().padStart(2, '0');
    const m = (current % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
    current += step;
  }
  return slots;
};

// GET /api/timetable
exports.getTimetable = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const doctors = await Doctor.find().populate('userId', 'name email');

    const timetable = await Promise.all(
      doctors.map(async (doc) => {
        // Ensure the requested day exists in the doctor's schedule.
        // This makes timetable durable and always available for Sat/Sun too.
        const existingDay = doc.availableSlots?.find((s) => s.date === targetDate);
        const shouldGenerate = !existingDay || !Array.isArray(existingDay.times) || existingDay.times.length === 0;

        if (shouldGenerate) {
          const times = generateSlotsForDoctor(doc);
          doc.availableSlots = (doc.availableSlots || []).filter((s) => s.date !== targetDate);
          doc.availableSlots.push({ date: targetDate, times, isHoliday: false });
          doc.markModified('availableSlots');
          await doc.save();
        }

        const updatedDay = doc.availableSlots?.find((s) => s.date === targetDate);
        const queueCount = await Appointment.countDocuments({
          doctorId: doc._id,
          date: targetDate,
          status: { $nin: ['Cancelled', 'NoShow', 'Completed'] },
        });

        const availDay = updatedDay;
        const isAvailableNow = doc.currentStatus !== 'Offline' && doc.isAvailableToday !== false;

        return {
          _id: doc._id,
          name: doc.name,
          specialization: doc.specialization,
          qualification: doc.qualification,
          roomNumber: doc.roomNumber,
          currentStatus: doc.currentStatus,
          maxPatientsPerDay: doc.maxPatientsPerDay,
          queueLength: queueCount,
          slotsRemaining: Math.max(0, (doc.maxPatientsPerDay || 40) - queueCount),
          availableTimes: availDay?.times || [],
          isAvailable: isAvailableNow,
        };
      })
    );

    res.status(200).json({ success: true, date: targetDate, isHoliday: false, doctors: timetable });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
