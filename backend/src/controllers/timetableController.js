const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');

// GET /api/timetable
exports.getTimetable = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Day of week check (0=Sunday, 6=Saturday)
    const dayOfWeek = new Date(targetDate).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Find next working day
      const next = new Date(targetDate);
      next.setDate(next.getDate() + (dayOfWeek === 0 ? 1 : 2));
      return res.status(200).json({
        success: true,
        isHoliday: true,
        message: 'Healthcare center is closed on weekends.',
        nextAvailableDate: next.toISOString().split('T')[0],
        doctors: [],
      });
    }

    const doctors = await Doctor.find().populate('userId', 'name email');

    const timetable = await Promise.all(
      doctors.map(async (doc) => {
        const queueCount = await Appointment.countDocuments({
          doctorId: doc._id,
          date: targetDate,
          status: { $nin: ['Cancelled', 'NoShow', 'Completed'] },
        });

        const availDay = doc.availableSlots.find((s) => s.date === targetDate);
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
          isAvailable: !availDay?.isHoliday,
        };
      })
    );

    res.status(200).json({ success: true, date: targetDate, doctors: timetable });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
