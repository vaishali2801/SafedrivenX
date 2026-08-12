const { ingestSensorData } = require('./sensorService');
const { processViolation } = require('./aiService');
const { emitToUser } = require('../config/socket');

const MODES = { SAFE: 'safe', WARNING: 'warning', VIOLATION: 'violation' };

const state = {
  running: false,
  mode: MODES.SAFE,
  userId: null,
  deviceCode: 'ESP32-SIM-001',
  sessionId: null,
  timer: null,
  tickCount: 0,
  speed: 45,
  location: { latitude: 21.7645, longitude: 72.1519 },
  nextViolationAt: null,
  currentViolation: null,
};

const rnd = (min, max) => Math.random() * (max - min) + min;
const rndInt = (min, max) => Math.round(rnd(min, max));

const pickViolationType = () => {
  const types = ['PHONE_USAGE', 'OVERSPEED', 'HARSH_BRAKING', 'DROWSINESS', 'NO_HELMET', 'NO_SEATBELT'];
  return types[Math.floor(Math.random() * types.length)];
};

const emitLive = (payload) => {
  if (state.userId) emitToUser(state.userId, 'speed:update', payload);
};

const tick = async () => {
  if (!state.running) return;

  state.tickCount += 1;

  const mode = state.mode;
  let speed = state.speed;
  const helmetStatus = mode === MODES.SAFE ? 'SAFE' : mode === MODES.WARNING ? (Math.random() > 0.7 ? 'WARNING' : 'SAFE') : Math.random() > 0.5 ? 'DANGER' : 'SAFE';
  const phoneStatus = mode === MODES.SAFE ? 'SAFE' : mode === MODES.WARNING ? (Math.random() > 0.8 ? 'WARNING' : 'SAFE') : Math.random() > 0.45 ? 'DANGER' : 'SAFE';
  const beltStatus = mode === MODES.SAFE ? 'SAFE' : Math.random() > 0.85 ? 'DANGER' : 'SAFE';
  const drowsyStatus = mode === MODES.WARNING && Math.random() > 0.9 ? 'DROWSY' : 'SAFE';
  const brakeStatus = mode === MODES.WARNING && Math.random() > 0.9 ? 'HARSH' : 'NORMAL';

  if (mode === MODES.SAFE) {
    speed = Math.min(60, Math.max(25, state.speed + rndInt(-5, 5)));
  } else if (mode === MODES.WARNING) {
    speed = Math.min(80, Math.max(30, state.speed + rndInt(-4, 8)));
    if (speed > 65 && Math.random() > 0.8) speed = 82;
  } else {
    speed = Math.min(95, Math.max(40, state.speed + rndInt(-8, 12)));
  }

  state.speed = speed;
  state.location.latitude += rnd(-0.0008, 0.0008);
  state.location.longitude += rnd(-0.0008, 0.0008);

  const now = new Date();

  const feeds = [
    { sensorType: 'GPS', value: { latitude: state.location.latitude, longitude: state.location.longitude, speed } },
    { sensorType: 'ACCELEROMETER', value: { x: rnd(-0.3, 0.3), y: rnd(-0.5, 0.5), z: rnd(-1, 1), harshBraking: brakeStatus === 'HARSH' } },
    { sensorType: 'HELMET', value: { status: helmetStatus } },
    { sensorType: 'SEATBELT', value: { status: beltStatus } },
    { sensorType: 'EYE', value: { status: drowsyStatus, eyeOpen: drowsyStatus !== 'DROWSY' } },
    { sensorType: 'CAMERA', value: { phone: phoneStatus, frameId: state.tickCount } },
  ];

  for (const feed of feeds) {
    try {
      await ingestSensorData({
        deviceCode: state.deviceCode,
        sensorType: feed.sensorType,
        value: feed.value,
        batteryLevel: Math.max(40, 100 - (state.tickCount % 40)),
        metadata: { userId: state.userId },
      });
    } catch (e) {
      // ignore per-sensor failures
    }
  }

  emitLive({
    speed,
    speedLimit: 60,
    helmet: helmetStatus,
    phone: phoneStatus,
    seatBelt: beltStatus,
    brake: brakeStatus,
    drowsiness: drowsyStatus,
    gps: state.location,
    camera: phoneStatus,
    timestamp: now,
  });

  const safetyService = require('./scoringService');
  const User = require('../models/User');
  const user = await User.findById(state.userId);
  emitLive({ safetyScore: user?.safetyScore ?? 85, points: user?.totalPoints ?? 0 });

  const triggerViolation =
    mode === MODES.VIOLATION &&
    (!state.nextViolationAt || Date.now() >= state.nextViolationAt) &&
    Math.random() > 0.35;

  if (triggerViolation) {
    const type = state.currentViolation || pickViolationType();
    state.currentViolation = null;
    state.nextViolationAt = Date.now() + 20000;
    try {
      const result = await processViolation({
        userId: state.userId,
        violationType: type,
        description: `Simulated ${type.replace(/_/g, ' ')} detected`,
        drivingSessionId: state.sessionId,
        evidence: { simulated: true, confidence: 0.92 },
        location: state.location,
      });
      console.log(`[simulator] violation generated: ${type} (-${result.pointsPenalty} pts, -${result.scorePenalty} score)`);
    } catch (e) {
      console.error(`[simulator] violation error: ${e.message}`);
    }
  }

  if (state.mode !== MODES.SAFE) {
    emitLive({ mode: 'simulation', note: `Mode: ${state.mode} (randomized behaviour)` });
  }
};

const start = ({ userId, deviceCode = 'ESP32-SIM-001', sessionId = null, mode = MODES.SAFE } = {}) => {
  if (state.running) return { started: false, message: 'Simulator already running' };
  state.running = true;
  state.userId = userId;
  state.deviceCode = deviceCode;
  state.sessionId = sessionId;
  state.mode = mode;
  state.speed = 45;
  state.location = { latitude: 21.7645, longitude: 72.1519 };
  state.nextViolationAt = null;
  state.tickCount = 0;

  const schedule = () => {
    if (!state.running) return;
    const delay = 3000 + Math.random() * 2000;
    state.timer = setTimeout(async () => {
      try {
        await tick();
      } catch (e) {
        console.error(`[simulator] tick error: ${e.message}`);
      }
      schedule();
    }, delay);
  };
  schedule();
  return { started: true, message: 'Simulator started', interval: '3-5s' };
};

const stop = () => {
  state.running = false;
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
  return { stopped: true };
};

const setMode = (mode) => {
  if (!Object.values(MODES).includes(mode)) throw new Error(`Invalid mode: ${mode}`);
  state.mode = mode;
  if (mode === MODES.VIOLATION) {
    state.nextViolationAt = Date.now() + 4000;
  }
  if (state.userId) emitToUser(state.userId, 'simulation:mode', { mode });
  return { mode };
};

const setViolationType = (type) => {
  state.currentViolation = type;
};

const getState = () => ({ ...state, timer: !!state.timer });

module.exports = { start, stop, setMode, setViolationType, getState, MODES };
