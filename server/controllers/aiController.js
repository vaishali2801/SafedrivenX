const { success } = require('../utils/response');
const aiService = require('../services/aiService');

const requireActiveSession = async (userId) => {
  const DrivingSession = require('../models/DrivingSession');
  const session = await DrivingSession.findOne({ userId, status: 'ACTIVE' }).lean();
  return session ? session._id.toString() : null;
};

const helmet = async (req, res, next) => {
  try {
    const { detected, confidence = 1 } = req.body;
    const sessionId = await requireActiveSession(req.userId);
    if (detected) {
      await aiService.processSafeEvent({
        userId: req.userId,
        behaviour: 'HELMET',
        drivingSessionId: sessionId,
        details: { confidence, source: 'ai/helmet' },
      });
      return success(res, 'Helmet detected', { detected, confidence, status: 'HELMET_VERIFIED' });
    }
    const result = await aiService.processViolation({
      userId: req.userId,
      violationType: 'NO_HELMET',
      description: 'No helmet detected',
      drivingSessionId: sessionId,
      evidence: { confidence, source: 'ai/helmet' },
    });
    return success(res, 'No helmet detected', {
      detected: false,
      confidence,
      status: 'NO_HELMET',
      pointsDeducted: result.pointsPenalty,
      safetyScore: result.newScore,
    });
  } catch (err) {
    next(err);
  }
};

const phone = async (req, res, next) => {
  try {
    const { detected, confidence = 1 } = req.body;
    const sessionId = await requireActiveSession(req.userId);
    if (detected) {
      const result = await aiService.processViolation({
        userId: req.userId,
        violationType: 'PHONE_USAGE',
        description: 'Phone usage detected while driving',
        drivingSessionId: sessionId,
        evidence: { confidence, source: 'ai/phone' },
      });
      return success(res, 'Phone detected', {
        detected: true,
        confidence,
        status: 'PHONE_DETECTED',
        pointsDeducted: result.pointsPenalty,
        safetyScore: result.newScore,
        violationId: result.violation._id,
      });
    }
    await aiService.logEventOnly({
      userId: req.userId,
      eventType: 'SIGNAL_COMPLIANCE',
      drivingSessionId: sessionId,
      value: { phoneSafe: true, confidence, source: 'ai/phone' },
    });
    return success(res, 'No phone usage', { detected: false, confidence, status: 'PHONE_SAFE' });
  } catch (err) {
    next(err);
  }
};

const seatbelt = async (req, res, next) => {
  try {
    const { detected, confidence = 1 } = req.body;
    const sessionId = await requireActiveSession(req.userId);
    if (detected) {
      await aiService.processSafeEvent({
        userId: req.userId,
        behaviour: 'SEAT_BELT',
        drivingSessionId: sessionId,
        details: { confidence, source: 'ai/seatbelt' },
      });
      return success(res, 'Seatbelt detected', { detected, confidence, status: 'SEATBELT_VERIFIED' });
    }
    const result = await aiService.processViolation({
      userId: req.userId,
      violationType: 'NO_SEATBELT',
      description: 'Seat belt not detected',
      drivingSessionId: sessionId,
      evidence: { confidence, source: 'ai/seatbelt' },
    });
    return success(res, 'No seatbelt detected', {
      detected: false,
      confidence,
      status: 'NO_SEATBELT',
      pointsDeducted: result.pointsPenalty,
      safetyScore: result.newScore,
    });
  } catch (err) {
    next(err);
  }
};

const drowsiness = async (req, res, next) => {
  try {
    const { detected, confidence = 1, level = 'MODERATE' } = req.body;
    const sessionId = await requireActiveSession(req.userId);
    if (detected) {
      const result = await aiService.processViolation({
        userId: req.userId,
        violationType: 'DROWSINESS',
        description: `Drowsiness detected (${level})`,
        drivingSessionId: sessionId,
        evidence: { confidence, level, source: 'ai/drowsiness' },
      });
      return success(res, 'Drowsiness detected', {
        detected: true,
        confidence,
        status: 'DROWSINESS_DETECTED',
        pointsDeducted: result.pointsPenalty,
        safetyScore: result.newScore,
      });
    }
    return success(res, 'No drowsiness', { detected: false, confidence, status: 'ALERT' });
  } catch (err) {
    next(err);
  }
};

const lane = async (req, res, next) => {
  try {
    const { laneDeviation, confidence = 1 } = req.body;
    const sessionId = await requireActiveSession(req.userId);
    if (laneDeviation) {
      const result = await aiService.processViolation({
        userId: req.userId,
        violationType: 'WRONG_SIDE',
        description: 'Wrong side / lane deviation detected',
        drivingSessionId: sessionId,
        evidence: { confidence, laneDeviation, source: 'ai/lane' },
      });
      return success(res, 'Lane deviation detected', {
        laneDeviation: true,
        confidence,
        status: 'WRONG_SIDE',
        pointsDeducted: result.pointsPenalty,
        safetyScore: result.newScore,
      });
    }
    return success(res, 'Lane clear', { laneDeviation: false, confidence, status: 'LANE_OK' });
  } catch (err) {
    next(err);
  }
};

const drivingBehaviour = async (req, res, next) => {
  try {
    const {
      behaviour,
      detected,
      confidence = 1,
      speed = 0,
      harshBraking = false,
      rashDriving = false,
    } = req.body;
    const sessionId = await requireActiveSession(req.userId);

    const map = {
      PHONE_USAGE: { violation: 'PHONE_USAGE', safeEvent: null },
      OVERSPEED: { violation: 'OVERSPEED', safeEvent: 'SPEED_LIMIT' },
      HARSH_BRAKING: { violation: 'HARSH_BRAKING', safeEvent: 'SAFE_BRAKING' },
      RASH_DRIVING: { violation: 'RASH_DRIVING', safeEvent: 'SMOOTH_DRIVING' },
      DROWSINESS: { violation: 'DROWSINESS', safeEvent: null },
      NO_HELMET: { violation: 'NO_HELMET', safeEvent: 'HELMET' },
      NO_SEATBELT: { violation: 'NO_SEATBELT', safeEvent: 'SEAT_BELT' },
    };

    const rule = map[behaviour];
    if (!rule) {
      await aiService.logEventOnly({
        userId: req.userId,
        eventType: 'SAFE_SPEED',
        drivingSessionId: sessionId,
        value: { behaviour, speed, confidence },
      });
      return success(res, 'Behaviour logged', { behaviour, detected, confidence, status: 'LOGGED' });
    }

    if (detected || harshBraking || rashDriving) {
      const result = await aiService.processViolation({
        userId: req.userId,
        violationType: rule.violation,
        description: `${behaviour} detected by AI`,
        drivingSessionId: sessionId,
        evidence: { confidence, speed, harshBraking, rashDriving, source: 'ai/behaviour' },
      });
      return success(res, 'Unsafe behaviour detected', {
        behaviour,
        detected: true,
        confidence,
        status: 'VIOLATION',
        pointsDeducted: result.pointsPenalty,
        safetyScore: result.newScore,
        violationId: result.violation._id,
      });
    }

    if (rule.safeEvent) {
      const result = await aiService.processSafeEvent({
        userId: req.userId,
        behaviour: rule.safeEvent,
        drivingSessionId: sessionId,
        details: { confidence, speed, source: 'ai/behaviour' },
      });
      return success(res, 'Safe behaviour detected', {
        behaviour,
        detected: false,
        confidence,
        status: 'SAFE',
        pointsAdded: result.pointsGain,
        safetyScore: result.newScore,
      });
    }

    return success(res, 'No unsafe behaviour', { behaviour, detected: false, confidence, status: 'SAFE' });
  } catch (err) {
    next(err);
  }
};

module.exports = { helmet, phone, seatbelt, drowsiness, lane, drivingBehaviour };
