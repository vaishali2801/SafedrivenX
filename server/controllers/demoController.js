const { success } = require('../utils/response');
const demoService = require('../services/demoService');

const start = async (req, res, next) => {
  try {
    const { vehicleId } = req.body;
    const result = await demoService.start({ userId: req.userId, vehicleId });
    return success(res, 'Demo started', result, 201);
  } catch (err) {
    next(err);
  }
};

const nextStage = async (req, res, next) => {
  try {
    const result = await demoService.next();
    return success(res, 'Demo advanced to next stage', result);
  } catch (err) {
    next(err);
  }
};

const reset = async (req, res, next) => {
  try {
    const result = await demoService.reset();
    return success(res, 'Demo reset', result);
  } catch (err) {
    next(err);
  }
};

const state = async (req, res, next) => {
  try {
    return success(res, 'Demo state', demoService.getState());
  } catch (err) {
    next(err);
  }
};

module.exports = { start, nextStage, reset, state };
