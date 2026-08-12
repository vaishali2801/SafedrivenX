const { success } = require('../utils/response');
const simulatorService = require('../services/simulatorService');
const { startSession } = require('../services/drivingService');
const { processViolation } = require('../services/aiService');

const start = async (req, res, next) => {
  try {
    const { deviceCode, mode, sessionId } = req.body;
    let activeSessionId = sessionId || null;
    if (!activeSessionId) {
      const active = await require('../models/DrivingSession').findOne({
        userId: req.userId,
        status: 'ACTIVE',
      }).lean();
      if (!active) {
        const session = await startSession(req.userId);
        activeSessionId = session._id.toString();
      } else {
        activeSessionId = active._id.toString();
      }
    }

    const result = simulatorService.start({
      userId: req.userId,
      deviceCode: deviceCode || 'ESP32-SIM-001',
      sessionId: activeSessionId,
      mode: mode || 'safe',
    });

    return success(res, result.message, { ...result, sessionId: activeSessionId });
  } catch (err) {
    next(err);
  }
};

const stop = async (req, res, next) => {
  try {
    const result = simulatorService.stop();
    return success(res, 'Simulator stopped', result);
  } catch (err) {
    next(err);
  }
};

const safe = async (req, res, next) => {
  try {
    const result = simulatorService.setMode('safe');
    return success(res, 'Simulator set to safe mode', result);
  } catch (err) {
    next(err);
  }
};

const warning = async (req, res, next) => {
  try {
    const result = simulatorService.setMode('warning');
    return success(res, 'Simulator set to warning mode', result);
  } catch (err) {
    next(err);
  }
};

const violation = async (req, res, next) => {
  try {
    const { type } = req.body;
    simulatorService.setMode('violation');
    if (type) simulatorService.setViolationType(type);

    const active = await require('../models/DrivingSession').findOne({
      userId: req.userId,
      status: 'ACTIVE',
    }).lean();

    const result = await processViolation({
      userId: req.userId,
      violationType: type || 'PHONE_USAGE',
      description: `Simulated ${(type || 'PHONE_USAGE').replace(/_/g, ' ')} event`,
      drivingSessionId: active?._id || null,
      evidence: { simulated: true, confidence: 0.95 },
    });

    return success(res, 'Violation simulated', {
      violationType: type || 'PHONE_USAGE',
      alert: result.alert,
      violation: result.violation,
      pointsDeducted: result.pointsPenalty,
      scoreDeducted: result.scorePenalty,
      safetyScore: result.newScore,
      totalPoints: result.newPoints,
    }, 201);
  } catch (err) {
    next(err);
  }
};

const emergency = async (req, res, next) => {
  try {
    const { triggerType, latitude, longitude } = req.body;
    simulatorService.setMode('warning');
    const emergencyService = require('../services/emergencyService');
    const active = await require('../models/DrivingSession').findOne({
      userId: req.userId,
      status: 'ACTIVE',
    }).lean();

    const result = await emergencyService.triggerEmergency({
      userId: req.userId,
      drivingSessionId: active?._id || null,
      latitude,
      longitude,
      triggerType: triggerType || 'MANUAL_SOS',
    });

    return success(res, 'Emergency simulated', {
      emergency: result.emergency,
      message: 'Emergency alert prepared and location shared with emergency contacts.',
    }, 201);
  } catch (err) {
    next(err);
  }
};

module.exports = { start, stop, safe, warning, violation, emergency };
