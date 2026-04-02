require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const socketService = require('./src/services/socketService');
const { seedDatabase } = require('./src/config/seedData');
const { corsOriginCallback } = require('./src/config/corsOrigin');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Attach Socket.io
const io = new Server(server, {
  cors: {
    origin: corsOriginCallback,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Initialize socket service
socketService.init(io);

// Connect to MongoDB and start server
connectDB().then(() => {
  const isDev = (process.env.NODE_ENV || 'development') === 'development';

  // Seed the database if it's empty so the app is always ready to use.
  const maybeSeed = async () => {
    try {
      const res = await seedDatabase({ force: false });
      if (res.seeded) {
        console.log('🌱 Database was empty. Auto-seeded initial data.');
        console.log('📋 Test Credentials:');
        console.log(`   Student: ${res.credentials.student.email} / ${res.credentials.student.password}`);
        console.log(`   Staff:   ${res.credentials.staff.email} / ${res.credentials.staff.password}`);
        console.log(`   Doctor:  ${res.credentials.doctor.email} / ${res.credentials.doctor.password}`);
      } else {
        console.log(`ℹ️ Seeding skipped: ${res.reason === 'users_exist' ? 'Database already has users.' : res.reason}`);
      }
    } catch (err) {
      console.warn('❌ Auto-seed failed:', err.message);
    }
  };

  // Check critical environment variables
  if (!process.env.JWT_SECRET) {
    console.error('❌ CRITICAL ERROR: JWT_SECRET is not defined in environment variables.');
    if (!isDev) process.exit(1);
  }

  maybeSeed().then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 DQMS Backend running on http://localhost:${PORT}`);
      console.log(`🔌 Socket.io listening on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Primary URL: ${process.env.RENDER_EXTERNAL_URL || 'Not specified'}`);
    });
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled Promise Rejection:', err.message);
  server.close(() => process.exit(1));
});
