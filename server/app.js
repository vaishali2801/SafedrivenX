const express = require('express');
const http = require('http');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const multer = require('multer');
const env = require('./config/env');
const { initSocket } = require('./config/socket');
const { apiLimiter } = require('./middleware/rateLimitMiddleware');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);

if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(mongoSanitize());
app.use(hpp());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  res.status(200).json({
    success: true,
    message: 'File uploaded (local mock storage)',
    data: { filename: req.file.originalname, size: req.file.size },
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SAFEdriveX API is healthy',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    },
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SAFEdriveX - AI-Powered Road Safety & Reward System API',
    data: {
      baseUrl: `/api`,
      auth: { register: 'POST /api/auth/register', login: 'POST /api/auth/login', me: 'GET /api/auth/me', logout: 'POST /api/auth/logout' },
      users: { profile: 'GET|PATCH /api/users/profile', password: 'PATCH /api/users/password', stats: 'GET /api/users/stats', vehicles: 'GET|POST /api/users/vehicles' },
      driving: { start: 'POST /api/driving/start', active: 'GET /api/driving/active', end: 'POST /api/driving/end', history: 'GET /api/driving/history', stats: 'GET /api/driving/stats', detail: 'GET /api/driving/:id' },
      safety: { score: 'GET /api/safety/score', history: 'GET /api/safety/score/history', trend: 'GET /api/safety/score/trend', events: 'GET /api/safety/events', violations: 'GET /api/safety/violations' },
      alerts: { list: 'GET /api/alerts', read: 'PATCH /api/alerts/:id/read', readAll: 'PATCH /api/alerts/read-all' },
      rewards: { list: 'GET /api/rewards', get: 'GET /api/rewards/:id', redeem: 'POST /api/rewards/:id/redeem', myRedemptions: 'GET /api/rewards/my-redemptions' },
      leaderboard: 'GET /api/leaderboard?period=weekly|monthly|all-time',
      emergency: { sos: 'POST /api/emergency/sos', history: 'GET /api/emergency/history', get: 'GET /api/emergency/:id', resolve: 'PATCH /api/emergency/:id/resolve' },
      sensors: { data: 'POST /api/sensors/data', list: 'GET /api/sensors', device: 'GET /api/sensors/:deviceId', status: 'PATCH /api/sensors/:deviceId/:type/status', register: 'POST /api/sensors/register' },
      ai: { helmet: 'POST /api/ai/helmet', phone: 'POST /api/ai/phone', seatbelt: 'POST /api/ai/seatbelt', drowsiness: 'POST /api/ai/drowsiness', lane: 'POST /api/ai/lane', behaviour: 'POST /api/ai/driving-behaviour' },
      dashboard: 'GET /api/dashboard',
      simulation: { start: 'POST /api/simulation/start', stop: 'POST /api/simulation/stop', safe: 'POST /api/simulation/safe', warning: 'POST /api/simulation/warning', violation: 'POST /api/simulation/violation', emergency: 'POST /api/simulation/emergency' },
      demo: { start: 'POST /api/demo/start', next: 'POST /api/demo/next', reset: 'POST /api/demo/reset', state: 'GET /api/demo/state' },
      admin: { dashboard: 'GET /api/admin/dashboard', analytics: 'GET /api/admin/analytics', users: 'GET /api/admin/users', violations: 'GET /api/admin/violations', sensors: 'GET /api/admin/sensors', monitoring: 'GET /api/admin/sensors/monitoring', rewards: 'GET|POST /api/admin/rewards' },
      docs: 'See README.md and POSTMAN_COLLECTION.md',
      demoCredentials: { driver: 'demo@safedrivex.com / Demo@123', admin: 'admin@safedrivex.com / Admin@123' },
    },
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SAFEdriveX - AI-Powered Road Safety & Reward System API',
    data: {
      docs: 'See README.md for full API documentation',
      version: '1.0.0',
      health: '/health',
    },
  });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/driving', require('./routes/drivingRoutes'));
app.use('/api/safety', require('./routes/safetyRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/rewards', require('./routes/rewardRoutes'));
app.use('/api/leaderboard', require('./routes/leaderboardRoutes'));
app.use('/api/emergency', require('./routes/emergencyRoutes'));
app.use('/api/sensors', require('./routes/sensorRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/simulation', require('./routes/simulationRoutes'));
app.use('/api/demo', require('./routes/demoRoutes'));

app.use(apiLimiter);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
