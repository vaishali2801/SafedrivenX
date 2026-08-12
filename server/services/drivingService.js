const DrivingSession = require('../models/DrivingSession');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Violation = require('../models/Violation');
const { DEFAULT_SPEED_LIMIT, LOCATIONS } = require('../utils/constants');
const { emitToUser } = require('../config/socket');

const getActiveSession = (userId) =>
  DrivingSession.findOne({ userId, status: 'ACTIVE' })
    .populate('violations')
    .lean();

const startSession = async (userId, vehicleId = null, opts = {}) => {
  const existing = await DrivingSession.findOne({ userId, status: 'ACTIVE' }).lean();
  if (existing) {
    const err = new Error('An active driving session already exists');
    err.statusCode = 409;
    err.existingSession = existing;
    throw err;
  }

  const startLocation = opts.startLocation || LOCATIONS.BHAVNAGAR;

  const session = await DrivingSession.create({
    userId,
    vehicleId: vehicleId || null,
    startTime: new Date(),
    startLocation,
    speedLimit: opts.speedLimit || DEFAULT_SPEED_LIMIT,
    safetyScore: opts.initialScore || 85,
    status: 'ACTIVE',
  });

  emitToUser(userId, 'driving:start', {
    sessionId: session._id,
    message: 'Driving session started',
    startTime: session.startTime,
  });

  return session;
};

const endSession = async (userId, opts = {}) => {
  const session = await DrivingSession.findOne({ userId, status: 'ACTIVE' });
  if (!session) {
    const err = new Error('No active driving session found');
    err.statusCode = 404;
    throw err;
  }

  const user = await User.findById(userId);

  session.endTime = new Date();
  session.endLocation = opts.endLocation || session.endLocation || LOCATIONS.BHAVNAGAR;
  session.status = 'COMPLETED';

  const violationCount = (session.violations || []).length;
  const safe = violationCount === 0;

  let bonusPoints = 0;
  let bonusReason = '';
  if (safe && session.distance >= 10) {
    bonusPoints = 25;
    bonusReason = 'Safe 10+ km drive';
  } else if (safe) {
    bonusPoints = 15;
    bonusReason = 'Safe journey completed';
  } else {
    bonusPoints = 5;
    bonusReason = 'Journey completed';
  }

  session.pointsEarned += bonusPoints;
  session.pointsDeducted = (session.pointsDeducted || 0);

  await session.save();

  user.totalTrips = (user.totalTrips || 0) + 1;
  if (safe) user.safeTrips = (user.safeTrips || 0) + 1;
  user.totalDistance = (user.totalDistance || 0) + (session.distance || 0);
  user.totalPoints = (user.totalPoints || 0) + bonusPoints;
  await user.save();

  emitToUser(userId, 'driving:end', {
    sessionId: session._id,
    message: 'Driving session completed',
    distance: session.distance,
    bonusPoints,
    safe,
    finalScore: session.safetyScore,
  });

  emitToUser(userId, 'points:update', {
    totalPoints: user.totalPoints,
    change: bonusPoints,
    reason: bonusReason,
  });

  return { session, user, bonusPoints, safe, bonusReason };
};

const getHistory = async (userId, { page = 1, limit = 10, startDate, endDate, status, minScore, maxScore, hasViolations } = {}) => {
  const filter = { userId };
  if (startDate || endDate) {
    filter.startTime = {};
    if (startDate) filter.startTime.$gte = new Date(startDate);
    if (endDate) filter.startTime.$lte = new Date(new Date(endDate).getTime() + 86399999);
  }
  if (status) filter.status = status;
  if (minScore || maxScore) {
    filter.safetyScore = {};
    if (minScore) filter.safetyScore.$gte = Number(minScore);
    if (maxScore) filter.safetyScore.$lte = Number(maxScore);
  }
  if (hasViolations !== undefined && hasViolations !== '') {
    filter.violations = hasViolations === 'true' || hasViolations === true ? { $ne: [] } : { $eq: [] };
  }

  const skip = (page - 1) * limit;
  const [sessions, total] = await Promise.all([
    DrivingSession.find(filter)
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit)
      .populate('violations', 'type severity pointsPenalty timestamp')
      .lean(),
    DrivingSession.countDocuments(filter),
  ]);

  return { sessions, total, page, limit, pages: Math.ceil(total / limit) };
};

const getStats = async (userId) => {
  const sessions = await DrivingSession.find({ userId, status: 'COMPLETED' }).lean();
  const user = await User.findById(userId).lean();

  const totalTrips = sessions.length;
  const distance = sessions.reduce((a, s) => a + (s.distance || 0), 0);
  const averageSpeed =
    sessions.length > 0
      ? sessions.reduce((a, s) => a + (s.averageSpeed || 0), 0) / sessions.length
      : 0;
  const violationCount = sessions.reduce(
    (a, s) => a + ((s.violations || []).length),
    0
  );

  return {
    totalTrips,
    safeTrips: user?.safeTrips || 0,
    distance: Math.round(distance * 100) / 100,
    averageScore: user?.safetyScore || 85,
    averageSpeed: Math.round(averageSpeed * 100) / 100,
    violations: violationCount,
    maxScore: 100,
  };
};

const updateSessionFromEvent = async (session, { type, pointsChange = 0 }) => {
  if (!session) return;
  session.safetyScore = Math.min(100, Math.max(0, session.safetyScore));

  if (pointsChange > 0) session.pointsEarned += pointsChange;
  if (pointsChange < 0) session.pointsDeducted += -pointsChange;

  await session.save();
  return session;
};

const getSessionById = (userId, sessionId) =>
  DrivingSession.findOne({ _id: sessionId, userId })
    .populate('violations')
    .populate('vehicleId')
    .lean();

module.exports = {
  getActiveSession,
  startSession,
  endSession,
  getHistory,
  getStats,
  getSessionById,
  updateSessionFromEvent,
};
