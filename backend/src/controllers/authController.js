const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Doctor = require('../models/Doctor');

const signToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, lastActivity: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    // Find user with passwordHash
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Validate password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate JWT
    const token = signToken(user);

    // Audit log
    await AuditLog.create({
      action: 'LOGIN',
      performedBy: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { role: user.role },
    });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// POST /api/auth/register
// Student self-signup (durable storage via MongoDB)
exports.register = async (req, res) => {
  try {
    const { name, email, password, rollNumber, department, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const normalizedRole = String(role || 'student').toLowerCase();
    if (!['student', 'staff', 'doctor'].includes(normalizedRole)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash: String(password),
      role: normalizedRole,
      rollNumber: normalizedRole === 'student' ? (rollNumber ? String(rollNumber).trim() : undefined) : undefined,
      department: normalizedRole === 'student' ? (department ? String(department).trim() : undefined) : undefined,
    });

    // If a doctor account is created, create a minimal Doctor profile
    // so that doctor dashboard endpoints work correctly.
    if (normalizedRole === 'doctor') {
      await Doctor.create({
        userId: user._id,
        name: user.name,
        specialization: 'General Medicine',
        qualification: '',
        roomNumber: '',
        availableSlots: [],
        maxPatientsPerDay: 40,
        slotDurationMin: 12,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
        department: user.department,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  try {
    if (req.user) {
      await AuditLog.create({
        action: 'LOGOUT',
        performedBy: req.user._id,
        ipAddress: req.ip,
        details: {},
      });
    }
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during logout.' });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
