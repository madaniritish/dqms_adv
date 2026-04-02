require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const { corsOriginCallback } = require('./config/corsOrigin');

// Routes
const authRoutes = require('./routes/auth');
const queueRoutes = require('./routes/queue');
const staffRoutes = require('./routes/staff');
const doctorRoutes = require('./routes/doctor');
const timetableRoutes = require('./routes/timetable');

const app = express();

// Security middleware
app.use(helmet());
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(cors({
  origin: corsOriginCallback,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/timetable', timetableRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, status: 'DQMS Backend is running', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;
