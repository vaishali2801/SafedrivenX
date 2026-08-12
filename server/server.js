const http = require('http');
const connectDB = require('./config/db');
const env = require('./config/env');
const { initSocket } = require('./config/socket');

const app = require('./app');

const startServer = async () => {
  await connectDB();

  const server = http.createServer(app);
  const io = initSocket(server);

  server.listen(env.PORT, () => {
    console.log(`[server] SAFEdriveX API running on http://localhost:${env.PORT}`);
    console.log(`[server] Environment: ${env.NODE_ENV}`);
    console.log(`[server] Socket.IO ready on ws://localhost:${env.PORT}`);
  });

  const shutdown = () => {
    console.log('[server] Shutting down...');
    io.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

startServer();
