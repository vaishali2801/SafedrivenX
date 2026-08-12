let io = null;
const SOCKET_ROOM_PREFIX = 'user:';

const initSocket = (server) => {
  const { Server } = require('socket.io');
  const env = require('./env');

  io = new Server(server, {
    cors: {
      origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.on('connection', (socket) => {
    const { userId } = socket.handshake.query || {};
    if (userId) {
      socket.join(`${SOCKET_ROOM_PREFIX}${userId}`);
      socket.data.userId = userId;
      io.emit('driver:join', { userId, message: 'Driver connected' });
    }
    console.log(`[socket] client connected: ${socket.id} userId=${userId || 'anonymous'}`);

    socket.on('driver:join', (data) => {
      const id = data?.userId || userId;
      if (id) socket.join(`${SOCKET_ROOM_PREFIX}${id}`);
      socket.broadcast.emit('driver:join', { userId: id, message: 'Driver joined' });
    });

    socket.on('disconnect', () => {
      if (socket.data.userId) {
        io.emit('driver:leave', { userId: socket.data.userId, message: 'Driver disconnected' });
      }
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return;
  io.to(`${SOCKET_ROOM_PREFIX}${userId}`).emit(event, payload);
};

const emitToAll = (event, payload) => {
  if (!io) return;
  io.emit(event, payload);
};

module.exports = { initSocket, getIO, emitToUser, emitToAll, SOCKET_ROOM_PREFIX };
