const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { success } = require('../utils/response');
const { ApiError } = require('../utils/response');

const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).populate('vehicleId').lean();
    return success(res, 'Profile fetched', { user });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, mobile, licenseNumber, profileImage, emergencyContact } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return next(new ApiError('User not found', 404));

    if (name) user.name = name;
    if (mobile) user.mobile = mobile;
    if (licenseNumber) user.licenseNumber = licenseNumber;
    if (profileImage) user.profileImage = profileImage;
    if (emergencyContact) user.emergencyContact = { ...user.emergencyContact, ...emergencyContact };

    await user.save();
    return success(res, 'Profile updated', { user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId).select('+password');
    if (!user) return next(new ApiError('User not found', 404));

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return next(new ApiError('Current password is incorrect', 400));

    user.password = newPassword;
    await user.save();
    return success(res, 'Password updated successfully', {});
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).lean();
    return success(res, 'User stats fetched', {
      stats: {
        totalTrips: user.totalTrips || 0,
        safeTrips: user.safeTrips || 0,
        distance: user.totalDistance || 0,
        points: user.totalPoints || 0,
        safetyScore: user.safetyScore || 85,
        achievements: user.achievements || [],
      },
    });
  } catch (err) {
    next(err);
  }
};

const getMyVehicles = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ userId: req.userId }).lean();
    return success(res, 'Vehicles fetched', { vehicles });
  } catch (err) {
    next(err);
  }
};

const addVehicle = async (req, res, next) => {
  try {
    const { vehicleNumber, vehicleType, brand, model, year } = req.body;
    const exists = await Vehicle.findOne({ vehicleNumber: vehicleNumber.toUpperCase() });
    if (exists) return next(new ApiError('Vehicle number already registered', 409));

    const vehicle = await Vehicle.create({
      userId: req.userId,
      vehicleNumber: vehicleNumber.toUpperCase(),
      vehicleType,
      brand,
      model,
      year,
    });

    const user = await User.findById(req.userId);
    if (!user.vehicleId) {
      user.vehicleId = vehicle._id;
      await user.save();
    }

    return success(res, 'Vehicle added', { vehicle }, 201);
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, updateProfile, updatePassword, getStats, getMyVehicles, addVehicle };
