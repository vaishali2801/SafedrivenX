const { emitToUser, emitToAll, getIO } = require('../config/socket');

const broadcastLiveState = (userId, state) => {
  emitToUser(userId, 'monitoring:state', state);
};

const broadcastSpeed = (userId, payload) => emitToUser(userId, 'speed:update', payload);

const broadcastSafety = (userId, payload) => emitToUser(userId, 'safety:update', payload);

const broadcastGlobal = (event, payload) => emitToAll(event, payload);

const monitoringNamespace = () => {
  const io = getIO();
  const ns = io.of('/monitoring');
  ns.on('connection', (socket) => {
    socket.on('subscribe', ({ userId }) => {
      if (userId) socket.join(`monitoring:${userId}`);
    });
    socket.on('unsubscribe', ({ userId }) => {
      if (userId) socket.leave(`monitoring:${userId}`);
    });
  });
  return ns;
};

module.exports = {
  broadcastLiveState,
  broadcastSpeed,
  broadcastSafety,
  broadcastGlobal,
  monitoringNamespace,
};
