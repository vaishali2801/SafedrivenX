const { emitToUser, emitToAll } = require('../config/socket');
const { processViolation, processSafeEvent } = require('./aiService');
const { startSession, endSession } = require('./drivingService');
const simulatorService = require('./simulatorService');

const STAGES = ['SAFE_DRIVING', 'SAFE_BEHAVIOUR', 'PHONE_DETECTED', 'DRIVER_RECOVERED', 'JOURNEY_COMPLETED'];

const demoState = {
  active: false,
  userId: null,
  sessionId: null,
  stageIndex: 0,
};

const STAGE_NAMES = {
  SAFE_DRIVING: 'STAGE 1: Safe driving',
  SAFE_BEHAVIOUR: 'STAGE 2: Safe behaviour rewarded',
  PHONE_DETECTED: 'STAGE 3: Phone detected - violation',
  DRIVER_RECOVERED: 'STAGE 4: Driver becomes safe',
  JOURNEY_COMPLETED: 'STAGE 5: Journey completed',
};

const start = async ({ userId, vehicleId = null, sessionId = null }) => {
  const User = require('../models/User');
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  demoState.active = true;
  demoState.userId = userId;
  demoState.stageIndex = 0;

  let session = sessionId ? { _id: sessionId } : null;
  if (!session) {
    const DrivingSession = require('../models/DrivingSession');
    const active = await DrivingSession.findOne({ userId, status: 'ACTIVE' }).lean();
    if (active) {
      session = { _id: active._id };
      demoState.sessionId = active._id.toString();
    } else {
      session = await startSession(userId, vehicleId);
      demoState.sessionId = session._id.toString();
    }
  } else {
    demoState.sessionId = sessionId;
  }

  simulatorService.start({ userId, sessionId: demoState.sessionId, mode: 'safe' });

  emitToUser(userId, 'driving:start', { sessionId: demoState.sessionId });
  emitToAll('demo:stage', { stage: STAGES[0], stageName: STAGE_NAMES.SAFE_DRIVING });

  return {
    stage: STAGES[0],
    stageName: STAGE_NAMES.SAFE_DRIVING,
    status: 'safe',
    speed: 45,
    helmet: 'SAFE',
    phone: 'SAFE',
    safetyScore: user.safetyScore,
    points: user.totalPoints,
    sessionId: demoState.sessionId,
  };
};

const next = async () => {
  if (!demoState.active) throw Object.assign(new Error('Demo not started. POST /api/demo/start first'), { statusCode: 400 });

  const userId = demoState.userId;
  const User = require('../models/User');
  const user = await User.findById(userId);

  const stage = STAGES[demoState.stageIndex];
  demoState.stageIndex += 1;
  const nextStage = STAGES[demoState.stageIndex];

  switch (stage) {
    case 'SAFE_DRIVING': {
      const result = await processSafeEvent({
        userId,
        behaviour: 'SPEED_LIMIT',
        drivingSessionId: demoState.sessionId,
        details: { speed: 45, speedLimit: 60, stage: 2 },
      });
      emitToUser(userId, 'safety:update', { safetyScore: result.newScore, totalPoints: result.newPoints, change: { points: 15, score: 3 }, stage: 2 });
      return {
        stage: 'SAFE_BEHAVIOUR',
        stageName: STAGE_NAMES.SAFE_BEHAVIOUR,
        status: 'safe',
        speed: 45,
        pointsAdded: 15,
        scoreAdded: 3,
        safetyScore: result.newScore,
        points: result.newPoints,
      };
    }
    case 'SAFE_BEHAVIOUR': {
      const result = await processViolation({
        userId,
        violationType: 'PHONE_USAGE',
        description: 'Phone usage detected by AI camera',
        drivingSessionId: demoState.sessionId,
        evidence: { confidence: 0.94, simulated: true },
      });
      emitToUser(userId, 'phone:update', { status: 'DANGER', confidence: 0.94 });
      return {
        stage: 'PHONE_DETECTED',
        stageName: STAGE_NAMES.PHONE_DETECTED,
        status: 'danger',
        violationType: 'PHONE_USAGE',
        pointsDeducted: result.pointsPenalty,
        scoreDeducted: result.scorePenalty,
        safetyScore: result.newScore,
        points: result.newPoints,
        alert: { type: 'PHONE_DETECTED', severity: 'CRITICAL', message: 'Phone usage detected while driving' },
      };
    }
    case 'PHONE_DETECTED': {
      emitToUser(userId, 'phone:update', { status: 'SAFE' });
      return {
        stage: 'DRIVER_RECOVERED',
        stageName: STAGE_NAMES.DRIVER_RECOVERED,
        status: 'safe',
        phone: 'SAFE',
        speed: 'NORMAL',
        note: 'Driver put the phone away. Continue driving safely.',
      };
    }
    case 'DRIVER_RECOVERED': {
      const result = await endSession(userId);
      demoState.active = false;
      simulatorService.stop();
      return {
        stage: 'JOURNEY_COMPLETED',
        stageName: STAGE_NAMES.JOURNEY_COMPLETED,
        status: 'completed',
        journeyCompleted: true,
        finalScore: user.safetyScore,
        pointsEarned: result.bonusPoints,
        totalPoints: result.user.totalPoints,
        message: 'Journey completed. +50 points for completing the safe challenge.',
      };
    }
    default:
      return { stage: 'DONE', message: 'Demo complete. POST /api/demo/reset to run again.' };
  }
};

const reset = async () => {
  simulatorService.stop();
  demoState.active = false;
  demoState.userId = null;
  demoState.sessionId = null;
  demoState.stageIndex = 0;
  return { message: 'Demo reset. POST /api/demo/start to run again.' };
};

const getState = () => ({
  active: demoState.active,
  stage: demoState.active ? STAGES[Math.min(demoState.stageIndex, STAGES.length - 1)] : null,
  stageName: demoState.active ? STAGE_NAMES[STAGES[Math.min(demoState.stageIndex, STAGES.length - 1)]] : null,
  sessionId: demoState.sessionId,
  stageIndex: demoState.stageIndex,
});

module.exports = { start, next, reset, getState, STAGES, STAGE_NAMES };
