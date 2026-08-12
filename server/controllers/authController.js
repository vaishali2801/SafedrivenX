const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { signToken } = require('../utils/jwt');
const { success, ApiError } = require('../utils/response');

const register = async (req, res, next) => {
  try {
    const { name, email, mobile, password, licenseNumber, vehicleNumber, vehicleType, brand, model } =
      req.body;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return next(new ApiError('Email already registered', 409));

    const existingMobile = await User.findOne({ mobile });
    if (existingMobile) return next(new ApiError('Mobile number already registered', 409));

    const existingVehicle = await Vehicle.findOne({ vehicleNumber: vehicleNumber.toUpperCase() });
    if (existingVehicle) return next(new ApiError('Vehicle number already registered', 409));

    const user = await User.create({ name, email, mobile, password, licenseNumber });

    const vehicle = await Vehicle.create({
      userId: user._id,
      vehicleNumber: vehicleNumber.toUpperCase(),
      vehicleType,
      brand: brand || '',
      model: model || '',
    });

    user.vehicleId = vehicle._id;
    await user.save();

    const token = signToken(user._id.toString(), user.role);

    return success(
      res,
      'Registration successful',
      { token, user: user.toSafeJSON(), vehicle },
      201
    );
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) return next(new ApiError('Invalid email or password', 401));
    if (!user.isActive) return next(new ApiError('Account is deactivated', 403));

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return next(new ApiError('Invalid email or password', 401));

    user.lastActiveAt = new Date();
    await user.save();

    const token = signToken(user._id.toString(), user.role);

    return success(res, 'Login successful', { token, user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).populate('vehicleId').lean();
    return success(res, 'Profile fetched', { user });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    return success(res, 'Logged out successfully', {});
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me, logout };
