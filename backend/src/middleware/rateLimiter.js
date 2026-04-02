const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 1 minute.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit per authenticated user, fall back to IP
    return req.user ? req.user._id.toString() : req.ip;
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter };
