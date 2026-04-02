const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { SESSION_TIMEOUT_SEC } = require('../config/constants');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized. No token provided.' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check session timeout (30 min idle)
    const now = Math.floor(Date.now() / 1000);
    if (decoded.lastActivity && now - decoded.lastActivity > SESSION_TIMEOUT_SEC) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    // Attach user to request
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }

    if (user.isLocked()) {
      return res.status(403).json({
        success: false,
        message: `Account is locked. Try again after ${new Date(user.lockedUntil).toLocaleTimeString()}.`,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Not authorized. Invalid token.' });
  }
};

module.exports = { protect };
