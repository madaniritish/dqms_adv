const User = require('../models/User');
const Doctor = require('../models/Doctor');

async function seedDatabase({ force = false } = {}) {
  if (force) {
    await User.deleteMany({});
    await Doctor.deleteMany({});
  } else {
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) return { seeded: false, reason: 'users_exist' };
  }

  // Create users
  const studentUser = await User.create({
    name: 'Vamsi Krishna',
    email: 'vamsi@student.nitw.ac.in',
    passwordHash: 'Student@123',
    role: 'student',
    rollNumber: '23CS1001',
    department: 'Computer Science',
  });

  const staffUser = await User.create({
    name: 'Raju Compounder',
    email: 'raju@nitw.ac.in',
    passwordHash: 'Staff@123',
    role: 'staff',
  });

  const doctorUser = await User.create({
    name: 'Dr. Priya Sharma',
    email: 'priya@nitw.ac.in',
    passwordHash: 'Doctor@123',
    role: 'doctor',
  });

  const doctorUser2 = await User.create({
    name: 'Dr. Anil Kumar',
    email: 'anil@nitw.ac.in',
    passwordHash: 'Doctor@123',
    role: 'doctor',
  });

  // Generate available slots for next 7 days
  const generateSlots = (start = '09:00', end = '17:00', interval = 12) => {
    const slots = [];
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let cur = sh * 60 + sm;
    const endMin = eh * 60 + em;
    while (cur <= endMin) {
      slots.push(`${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`);
      cur += interval;
    }
    return slots;
  };

  const getDateStr = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
  };

  const availSlots = Array.from({ length: 7 }, (_, i) => ({
    date: getDateStr(i),
    times: generateSlots(),
  }));

  await Doctor.create({
    userId: doctorUser._id,
    name: 'Dr. Priya Sharma',
    specialization: 'General Medicine',
    qualification: 'MBBS, MD',
    roomNumber: 'Room 101',
    availableSlots: availSlots,
    maxPatientsPerDay: 40,
    slotDurationMin: 12,
  });

  await Doctor.create({
    userId: doctorUser2._id,
    name: 'Dr. Anil Kumar',
    specialization: 'Dermatology',
    qualification: 'MBBS, DVD',
    roomNumber: 'Room 103',
    availableSlots: availSlots,
    maxPatientsPerDay: 30,
    slotDurationMin: 15,
  });

  return {
    seeded: true,
    credentials: {
      student: { email: 'vamsi@student.nitw.ac.in', password: 'Student@123' },
      staff: { email: 'raju@nitw.ac.in', password: 'Staff@123' },
      doctor: { email: 'priya@nitw.ac.in', password: 'Doctor@123' },
      doctor2: { email: 'anil@nitw.ac.in', password: 'Doctor@123' },
    },
  };
}

module.exports = { seedDatabase };

