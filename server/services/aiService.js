const Violation = require('../models/Violation');
const { createAlert } = require('./alertService');
const {
  handleViolation,
  handleSafeBehaviour,
  recordEvent,
} = require('./scoringService');
const DrivingSession = require('../models/DrivingSession');
const {
  VIOLATION_SEVERITY,
  VIOLATION_POINTS,
  VIOLATION_SCORE_PENALTY,
} = require('../utils/constants');
const { emitToUser } = require('../config/socket');

const VIOLATION_TO_ALERT = {
  NO_HELMET: 'NO_HELMET',
  NO_SEATBELT: 'NO_SEATBELT',
  PHONE_USAGE: 'PHONE_DETECTED',
  OVERSPEED: 'OVERSPEED',
  WRONG_SIDE: 'WRONG_SIDE',
  SIGNAL_JUMP: 'SIGNAL_JUMP',
  RASH_DRIVING: 'RASH_DRIVING',
  DRINK_DRIVING: 'ALCOHOL_DETECTED',
  DROWSINESS: 'DROWSINESS',
};

const processViolation = async ({
  userId,
  violationType,
  description = '',
  drivingSessionId = null,
  evidence = {},
  location = null,
}) => {
  const User = require('../models/User');
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  let session = null;
  if (drivingSessionId) {
    session = await DrivingSession.findOne({ _id: drivingSessionId, userId });
  } else {
    session = await DrivingSession.findOne({ userId, status: 'ACTIVE' });
  }
  const sessionId = session ? session._id : drivingSessionId;

  const pointsPenalty = VIOLATION_POINTS[violationType] || 50;
  const scorePenalty = VIOLATION_SCORE_PENALTY[violationType] || 5;
  const severity = VIOLATION_SEVERITY[violationType] || 'WARNING';

  const { newScore, newPoints, event } = await handleViolation({
    user,
    violationType,
    drivingSessionId: sessionId,
    description,
    evidence,
    location,
  });

  const violation = await Violation.create({
    userId,
    drivingSessionId: sessionId,
    vehicleId: user.vehicleId || null,
    type: violationType,
    severity,
    description,
    pointsPenalty,
    scorePenalty,
    evidence,
    location,
  });

  if (session) {
    session.violations.push(violation._id);
    session.safetyScore = newScore;
    if (violationType === 'DROWSINESS') session.drowsinessDetected = true;
    if (violationType === 'HARSH_BRAKING' && (evidence.eventType === 'HARSH_BRAKING')) {
      session.harshBrakingCount += 1;
    }
    await session.save();
  }

  const alert = await createAlert({
    userId,
    drivingSessionId: sessionId,
    type: VIOLATION_TO_ALERT[violationType] || violationType,
    severity,
    message: description || violationType.replace(/_/g, ' ').toLowerCase(),
    metadata: { violationId: violation._id, pointsPenalty, scorePenalty, confidence: evidence.confidence },
  });

  emitToUser(userId, 'violation:new', {
    id: violation._id,
    type: violation.type,
    severity: violation.severity,
    pointsPenalty: violation.pointsPenalty,
    scorePenalty: violation.scorePenalty,
    timestamp: violation.timestamp,
    message: alert.message,
  });

  emitToUser(userId, 'safety:update', {
    safetyScore: newScore,
    totalPoints: newPoints,
    change: { points: -pointsPenalty, score: -scorePenalty },
  });

  return {
    violation,
    alert,
    newScore,
    newPoints,
    pointsPenalty,
    scorePenalty,
    sessionId: sessionId ? sessionId.toString() : null,
    event,
  };
};

const processSafeEvent = async ({
  userId,
  behaviour,
  drivingSessionId = null,
  details = {},
  location = null,
}) => {
  const User = require('../models/User');
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  let session = null;
  if (drivingSessionId) {
    session = await DrivingSession.findOne({ _id: drivingSessionId, userId });
  } else {
    session = await DrivingSession.findOne({ userId, status: 'ACTIVE' });
  }
  const sessionId = session ? session._id : drivingSessionId;

  const { newScore, newPoints, pointsGain, event } = await handleSafeBehaviour({
    user,
    behaviour,
    drivingSessionId: sessionId,
    details,
    location,
  });

  if (session) {
    session.safetyScore = newScore;
    await session.save();
  }

  emitToUser(userId, 'safety:update', {
    safetyScore: newScore,
    totalPoints: newPoints,
    change: { points: pointsGain, score: 0 },
    behaviour,
  });

  return { newScore, newPoints, pointsGain, event, sessionId: sessionId ? sessionId.toString() : null };
};

const logEventOnly = async ({ userId, eventType, value = {}, location = null, drivingSessionId = null }) => {
  const event = await recordEvent({
    userId,
    drivingSessionId,
    eventType,
    value,
    location,
  });
  emitToUser(userId, 'driving:event', { eventType, value, timestamp: event.timestamp });
  return event;
};

module.exports = {
  processViolation,
  processSafeEvent,
  logEventOnly,
  VIOLATION_TO_ALERT,
};
