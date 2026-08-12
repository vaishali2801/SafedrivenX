const { ApiError } = require('../utils/response');

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new ApiError('Admin access required', 403));
  }
  next();
};

module.exports = { adminOnly };
