let _io = null;

// Map of userId -> socket.id for targeted notifications
const userSockets = new Map();

const init = (io) => {
  _io = io;

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Register user to socket mapping
    socket.on('register', (userId) => {
      userSockets.set(userId, socket.id);
      socket.join(`user:${userId}`);
      console.log(`👤 User ${userId} registered to socket ${socket.id}`);
    });

    // Join role rooms
    socket.on('joinRoom', (room) => {
      socket.join(room);
      console.log(`🏠 Socket ${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', () => {
      // Remove from userSockets map
      for (const [userId, sid] of userSockets.entries()) {
        if (sid === socket.id) {
          userSockets.delete(userId);
          break;
        }
      }
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
};

// Emit full queue update to all connected clients
const emitQueueUpdate = (queueData) => {
  if (!_io) return;
  _io.emit('queue:update', queueData);
};

// Emit to a specific user room
const emitToUser = (userId, event, data) => {
  if (!_io) return;
  _io.to(`user:${userId}`).emit(event, data);
};

// Emit to all staff room
const emitToStaff = (event, data) => {
  if (!_io) return;
  _io.to('room:staff').emit(event, data);
};

// Emit to all doctors room
const emitToDoctor = (doctorId, event, data) => {
  if (!_io) return;
  _io.to(`doctor:${doctorId}`).emit(event, data);
};

// Notify student they are "Second-Next"
const notifySecondNext = (userId, data) => {
  emitToUser(userId, 'notification:second', {
    type: 'Second-Next',
    message: '⚠️ You are second in line. Please start heading to the Healthcare Center.',
    ...data,
  });
};

// Notify student they are "Next"
const notifyNext = (userId, data) => {
  emitToUser(userId, 'notification:next', {
    type: 'Next',
    message: '🟢 You are NEXT! Please arrive at the Healthcare Center immediately.',
    ...data,
  });
};

// Notify of emergency reorder
const notifyEmergency = (userId, data) => {
  emitToUser(userId, 'notification:emergency', {
    type: 'Emergency',
    message: '🚨 Queue updated due to an emergency case. Your position has changed.',
    ...data,
  });
};

const getIO = () => _io;

module.exports = {
  init,
  emitQueueUpdate,
  emitToUser,
  emitToStaff,
  emitToDoctor,
  notifySecondNext,
  notifyNext,
  notifyEmergency,
  userSockets,
};
