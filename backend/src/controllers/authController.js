const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

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

    // Check if account is locked
    if (user.isLocked()) {
      return res.status(403).json({
        success: false,
        message: `Account is locked due to too many failed attempts. Try again at ${new Date(user.lockedUntil).toLocaleTimeString()}.`,
      });
    }

    // Validate password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      await user.incrementFailedLogins();
      const remaining = 5 - user.failedLogins;
      return res.status(401).json({
        success: false,
        message: remaining > 0
          ? `Invalid credentials. ${remaining} attempt(s) remaining before lockout.`
          : 'Account locked for 30 minutes due to too many failed attempts.',
      });
    }

    // Reset failed logins on success
    await user.resetFailedLogins();

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
