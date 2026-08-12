const { success, ApiError } = require('../utils/response');
const emergencyService = require('../services/emergencyService');

const sos = async (req, res, next) => {
  try {
    const { latitude, longitude, triggerType, contact } = req.body;
    const activeSession = await require('../models/DrivingSession').findOne({
      userId: req.userId,
      status: 'ACTIVE',
    }).lean();

    const result = await emergencyService.triggerEmergency({
      userId: req.userId,
      drivingSessionId: activeSession?._id || null,
      latitude,
      longitude,
      triggerType,
      contact,
    });

    return success(res, 'Emergency alert prepared and location shared with emergency contacts.', {
      emergency: result.emergency,
      latitude: result.resolvedLat,
      longitude: result.resolvedLng,
    }, 201);
  } catch (err) {
    next(err);
  }
};

const history = async (req, res, next) => {
  try {
    const emergencies = await emergencyService.getHistory(req.userId, 20);
    return success(res, 'Emergency history fetched', { emergencies });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const emergency = await emergencyService.getById(req.userId, req.params.id);
    if (!emergency) return next(new ApiError('Emergency record not found', 404));
    return success(res, 'Emergency record fetched', { emergency });
  } catch (err) {
    next(err);
  }
};

const resolve = async (req, res, next) => {
  try {
    const emergency = await emergencyService.resolveEmergency(req.userId, req.params.id);
    return success(res, 'Emergency resolved', { emergency });
  } catch (err) {
    next(err);
  }
};

module.exports = { sos, history, getById, resolve };
