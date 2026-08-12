const SafetyScore = require('../models/SafetyScore');
const DrivingEvent = require('../models/DrivingEvent');
const {
  SAFE_BEHAVIOUR_POINTS,
  SAFE_BEHAVIOUR_SCORE,
  VIOLATION_POINTS,
  VIOLATION_SCORE_PENALTY,
  INITIAL_SAFETY_SCORE,
  MAX_SAFETY_SCORE,
  MIN_SAFETY_SCORE,
} = require('../utils/constants');
const { clampScore } = require('../utils/calculations');
const { emitToUser } = require('../config/socket');

const getCurrentScore = (user) => user.safetyScore ?? INITIAL_SAFETY_SCORE;

const applyScoreChange = async (user, scoreChange, reason, details = {}, session = null) => {
  const current = getCurrentScore(user);
  const newScore = clampScore(current + scoreChange);

  user.safetyScore = newScore;
  await user.save({ session });

  const record = session
    ? await SafetyScore.create(
        {
          userId: user._id,
          drivingSessionId: details.drivingSessionId || null,
          score: newScore,
          change: scoreChange,
          reason,
          details,
        },
        { session }
      )
    : await SafetyScore.create({
        userId: user._id,
        drivingSessionId: details.drivingSessionId || null,
        score: newScore,
        change: scoreChange,
        reason,
        details,
      });

  emitToUser(user._id.toString(), 'score:update', {
    safetyScore: newScore,
    change: scoreChange,
    reason,
    scoreHistoryId: record._id,
  });

  return { newScore, change: scoreChange, record };
};

const applyPointsChange = async (user, pointsChange, reason) => {
  const newPoints = Math.max(0, (user.totalPoints || 0) + pointsChange);
  user.totalPoints = newPoints;
  await user.save();

  emitToUser(user._id.toString(), 'points:update', {
    totalPoints: newPoints,
    change: pointsChange,
    reason,
  });

  return { newPoints, change: pointsChange };
};

const VIOLATION_TO_EVENT = {
  NO_HELMET: 'NO_HELMET',
  NO_SEATBELT: 'NO_SEATBELT',
  PHONE_USAGE: 'PHONE_DETECTED',
  OVERSPEED: 'OVERSPEED',
  WRONG_SIDE: 'WRONG_SIDE',
  SIGNAL_JUMP: 'SIGNAL_JUMP',
  RASH_DRIVING: 'RASH_DRIVING',
  DRINK_DRIVING: 'DRINK_DRIVING',
  DROWSINESS: 'DROWSINESS',
};

const SAFE_TO_EVENT = {
  HELMET: 'HELMET_VERIFIED',
  SEAT_BELT: 'SEATBELT_VERIFIED',
  SPEED_LIMIT: 'SAFE_SPEED',
  NO_MOBILE_USAGE: 'NO_MOBILE_USAGE',
  SMOOTH_DRIVING: 'SMOOTH_DRIVING',
  SAFE_BRAKING: 'SAFE_BRAKING',
  TRAFFIC_SIGNALS: 'SIGNAL_COMPLIANCE',
  DRIVE_10_KM: 'DRIVE_10_KM',
  DAILY_CHALLENGE: 'DAILY_CHALLENGE',
  WEEKLY_SAFE_DRIVER: 'WEEKLY_SAFE_DRIVER',
};

const recordEvent = async ({
  userId,
  drivingSessionId = null,
  eventType,
  value = {},
  pointsChange = 0,
  scoreChange = 0,
  location = null,
}) => {
  const event = await DrivingEvent.create({
    userId,
    drivingSessionId,
    eventType,
    value,
    pointsChange,
    scoreChange,
    location,
  });
  return event;
};

const handleViolation = async ({
  user,
  violationType,
  drivingSessionId = null,
  description = '',
  evidence = {},
  location = null,
  options = {},
}) => {
  const pointsPenalty = options.pointsPenalty ?? VIOLATION_POINTS[violationType] ?? 50;
  const scorePenalty = options.scorePenalty ?? VIOLATION_SCORE_PENALTY[violationType] ?? 5;

  const { newScore } = await applyScoreChange(
    user,
    -scorePenalty,
    `Violation: ${violationType}`,
    { drivingSessionId, violationType }
  );

  const { newPoints } = await applyPointsChange(user, -pointsPenalty, `Violation: ${violationType}`);

  const event = await recordEvent({
    userId: user._id,
    drivingSessionId,
    eventType: VIOLATION_TO_EVENT[violationType] || violationType,
    value: { description, ...evidence },
    pointsChange: -pointsPenalty,
    scoreChange: -scorePenalty,
    location,
  });

  return {
    newScore,
    newPoints,
    pointsPenalty,
    scorePenalty,
    event,
  };
};

const handleSafeBehaviour = async ({
  user,
  behaviour,
  drivingSessionId = null,
  details = {},
  location = null,
}) => {
  const pointsGain = SAFE_BEHAVIOUR_POINTS[behaviour] || 0;
  const scoreGain = SAFE_BEHAVIOUR_SCORE[behaviour] || 0;

  let scoreResult = null;
  if (scoreGain > 0) {
    scoreResult = await applyScoreChange(user, scoreGain, `Safe: ${behaviour}`, {
      drivingSessionId,
      behaviour,
    });
  }

  const pointsResult = await applyPointsChange(user, pointsGain, `Safe behaviour: ${behaviour}`);

  const event = await recordEvent({
    userId: user._id,
    drivingSessionId,
    eventType: SAFE_TO_EVENT[behaviour] || behaviour,
    value: details,
    pointsChange: pointsGain,
    scoreChange: scoreGain,
    location,
  });

  return {
    pointsGain,
    scoreGain,
    newScore: scoreResult ? scoreResult.newScore : user.safetyScore,
    newPoints: pointsResult.newPoints,
    event,
  };
};

const getScoreHistory = (userId, limit = 30) =>
  SafetyScore.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();

const getWeeklyScoreTrend = (userId, days = 7) =>
  SafetyScore.find({ userId, createdAt: { $gte: new Date(Date.now() - days * 86400000) } })
    .sort({ createdAt: 1 })
    .lean();

module.exports = {
  getCurrentScore,
  applyScoreChange,
  applyPointsChange,
  recordEvent,
  handleViolation,
  handleSafeBehaviour,
  getScoreHistory,
  getWeeklyScoreTrend,
  MAX_SAFETY_SCORE,
  MIN_SAFETY_SCORE,
};
