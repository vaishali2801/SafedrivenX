const { success } = require('../utils/response');
const scoringService = require('../services/scoringService');
const SafetyScore = require('../models/SafetyScore');
const DrivingEvent = require('../models/DrivingEvent');

const getScore = async (req, res, next) => {
  try {
    const user = req.user;
    return success(res, 'Safety score fetched', {
      safetyScore: user.safetyScore,
      maxScore: 100,
      change: 0,
    });
  } catch (err) {
    next(err);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const history = await scoringService.getScoreHistory(req.userId, 50);
    return success(res, 'Safety score history fetched', { history });
  } catch (err) {
    next(err);
  }
};

const getWeeklyTrend = async (req, res, next) => {
  try {
    const records = await scoringService.getWeeklyScoreTrend(req.userId, 7);
    return success(res, 'Weekly score trend fetched', { trend: records });
  } catch (err) {
    next(err);
  }
};

const getEvents = async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      DrivingEvent.find({ userId: req.userId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      DrivingEvent.countDocuments({ userId: req.userId }),
    ]);
    return success(res, 'Driving events fetched', {
      events,
      pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

const getViolations = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const Violation = require('../models/Violation');
    const skip = (page - 1) * limit;
    const [violations, total] = await Promise.all([
      Violation.find({ userId: req.userId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Violation.countDocuments({ userId: req.userId }),
    ]);
    return success(res, 'My violations fetched', {
      violations,
      pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getScore, getHistory, getWeeklyTrend, getEvents, getViolations };
