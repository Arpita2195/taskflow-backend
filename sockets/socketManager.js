const { EVENTS } = require('./events');

const initSocket = (io) => {
  // Middleware: attach userId from handshake auth
  io.use((socket, next) => {
    const userId = socket.handshake.auth?.userId;
    if (userId) {
      socket.userId = userId;
    }
    next();
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (user: ${socket.userId})`);

    // Join personal room for direct notifications
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Join a project board room
    socket.on(EVENTS.JOIN_BOARD, ({ projectId }) => {
      socket.join(`project:${projectId}`);
      console.log(`📋 User ${socket.userId} joined project:${projectId}`);
      socket.to(`project:${projectId}`).emit(EVENTS.USER_JOINED, { userId: socket.userId });
    });

    // Leave board room
    socket.on(EVENTS.LEAVE_BOARD, ({ projectId }) => {
      socket.leave(`project:${projectId}`);
      socket.to(`project:${projectId}`).emit(EVENTS.USER_LEFT, { userId: socket.userId });
    });

    // Real-time cursor / presence (optional)
    socket.on(EVENTS.CURSOR_MOVE, ({ projectId, position }) => {
      socket.to(`project:${projectId}`).emit(EVENTS.CURSOR_MOVE, {
        userId: socket.userId,
        position,
      });
    });
    
    // Live Sync Video Call
    socket.on('start-live-sync', ({ projectId, userName }) => {
      console.log(`📹 Live Sync started in project:${projectId} by ${userName}`);
      socket.to(`project:${projectId}`).emit('live-sync-started', {
        userName,
        projectId
      });
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
      // Broadcast user offline to all rooms they were in
      io.emit(EVENTS.USER_OFFLINE, { userId: socket.userId });
    });
  });
};

module.exports = { initSocket };
