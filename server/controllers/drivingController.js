const { success, ApiError } = require('../utils/response');
const drivingService = require('../services/drivingService');

const startSession = async (req, res, next) => {
  try {
    const { vehicleId, startLocation, speedLimit } = req.body;
    const session = await drivingService.startSession(req.userId, vehicleId, {
      startLocation,
      speedLimit,
    });
    return success(res, 'Driving session started', { session }, 201);
  } catch (err) {
    next(err);
  }
};

const getActive = async (req, res, next) => {
  try {
    const session = await drivingService.getActiveSession(req.userId);
    if (!session) return success(res, 'No active session', { session: null });
    return success(res, 'Active session fetched', { session });
  } catch (err) {
    next(err);
  }
};

const endSession = async (req, res, next) => {
  try {
    const result = await drivingService.endSession(req.userId, {
      endLocation: req.body.endLocation,
    });
    return success(res, 'Driving session ended', {
      session: result.session,
      bonusPoints: result.bonusPoints,
      safe: result.safe,
    });
  } catch (err) {
    next(err);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, startDate, endDate, status, minScore, maxScore, hasViolations } = req.query;
    const result = await drivingService.getHistory(req.userId, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      startDate,
      endDate,
      status,
      minScore,
      maxScore,
      hasViolations,
    });
    return success(res, 'Driving history fetched', {
      sessions: result.sessions,
      pagination: { page: result.page, limit: result.limit, total: result.total, pages: result.pages },
    });
  } catch (err) {
    next(err);
  }
};

const getSessionDetail = async (req, res, next) => {
  try {
    const session = await drivingService.getSessionById(req.userId, req.params.id);
    if (!session) return next(new ApiError('Session not found', 404));
    return success(res, 'Session details fetched', { session });
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await drivingService.getStats(req.userId);
    return success(res, 'Driving stats fetched', { stats });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  startSession,
  getActive,
  endSession,
  getHistory,
  getSessionDetail,
  getStats,
};
