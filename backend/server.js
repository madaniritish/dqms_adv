require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const socketService = require('./src/services/socketService');
const { seedDatabase } = require('./src/config/seedData');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Attach Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
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
  const autoSeed = String(process.env.AUTO_SEED_DEV || 'true').toLowerCase() === 'true';
  const usingMemory = String(process.env.DB_MODE || '').toLowerCase() === 'memory';

  // If we're running on in-memory Mongo (no MongoDB installed),
  // seed the *current* DB so login works immediately.
  const maybeSeed = async () => {
    if (!isDev || !autoSeed || !usingMemory) return;
    const res = await seedDatabase({ force: false });
    if (res.seeded) {
      console.log('🌱 Auto-seeded dev data (in-memory DB).');
      console.log(`   Student: ${res.credentials.student.email} / ${res.credentials.student.password}`);
      console.log(`   Staff:   ${res.credentials.staff.email} / ${res.credentials.staff.password}`);
      console.log(`   Doctor:  ${res.credentials.doctor.email} / ${res.credentials.doctor.password}`);
      console.log(`   Doctor2: ${res.credentials.doctor2.email} / ${res.credentials.doctor2.password}`);
    }
  };

  maybeSeed().catch((err) => console.warn('Auto-seed skipped:', err.message));

  server.listen(PORT, () => {
    console.log(`🚀 DQMS Backend running on http://localhost:${PORT}`);
    console.log(`🔌 Socket.io listening on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
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
