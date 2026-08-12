const jwt = require('jsonwebtoken');
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const { ApiError } = require('../utils/response');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) throw new ApiError('Not authorized, no token provided', 401);

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new ApiError('Session expired, please login again', 401);
      }
      throw new ApiError('Invalid token', 401);
    }

    const user = await User.findById(decoded.userId);
    if (!user) throw new ApiError('User no longer exists', 401);
    if (!user.isActive) throw new ApiError('Account is deactivated', 403);

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { protect };
