const { success } = require('../utils/response');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const DrivingSession = require('../models/DrivingSession');
const Violation = require('../models/Violation');
const Reward = require('../models/Reward');
const RewardRedemption = require('../models/RewardRedemption');
const Sensor = require('../models/Sensor');
const Emergency = require('../models/Emergency');
const Alert = require('../models/Alert');
const { ApiError } = require('../utils/response');

const getDashboard = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      totalTrips,
      todayTrips,
      totalViolations,
      todayViolations,
      totalEmergencies,
      activeSessions,
      totalRedemptions,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true, lastActiveAt: { $gte: todayStart } }),
      DrivingSession.countDocuments({ status: 'COMPLETED' }),
      DrivingSession.countDocuments({ status: 'COMPLETED', endTime: { $gte: todayStart } }),
      Violation.countDocuments(),
      Violation.countDocuments({ timestamp: { $gte: todayStart } }),
      Emergency.countDocuments({ status: { $ne: 'RESOLVED' } }),
      DrivingSession.countDocuments({ status: 'ACTIVE' }),
      RewardRedemption.countDocuments(),
    ]);

    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('name email role safetyScore totalPoints isActive').lean();
    const recentViolations = await Violation.find().sort({ timestamp: -1 }).limit(5)
      .populate('userId', 'name email').lean();

    return success(res, 'Admin dashboard fetched', {
      stats: {
        totalUsers,
        activeUsers,
        totalTrips,
        todayTrips,
        totalViolations,
        todayViolations,
        totalEmergencies,
        activeSessions,
        totalRedemptions,
      },
      recentUsers,
      recentViolations,
    });
  } catch (err) {
    next(err);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role, status } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)).lean(),
      User.countDocuments(filter),
    ]);
    return success(res, 'Users fetched', {
      users,
      pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) return next(new ApiError('User not found', 404));
    const [vehicles, sessions, violations] = await Promise.all([
      Vehicle.find({ userId: user._id }).lean(),
      DrivingSession.find({ userId: user._id }).sort({ startTime: -1 }).limit(10).lean(),
      Violation.find({ userId: user._id }).sort({ timestamp: -1 }).limit(10).lean(),
    ]);
    return success(res, 'User details fetched', { user, vehicles, sessions, violations });
  } catch (err) {
    next(err);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    ).select('-password');
    if (!user) return next(new ApiError('User not found', 404));
    return success(res, 'User status updated', { user });
  } catch (err) {
    next(err);
  }
};

const getViolations = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, severity, status } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const [violations, total] = await Promise.all([
      Violation.find(filter)
        .populate('userId', 'name email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Violation.countDocuments(filter),
    ]);
    return success(res, 'Violations fetched', {
      violations,
      pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

const getSensors = async (req, res, next) => {
  try {
    const sensors = await Sensor.find().sort({ type: 1, lastUpdated: -1 }).lean();
    const byType = {};
    for (const s of sensors) {
      if (!byType[s.type]) byType[s.type] = [];
      byType[s.type].push(s);
    }
    return success(res, 'Sensors fetched', { sensors, byType });
  } catch (err) {
    next(err);
  }
};

const getRewards = async (req, res, next) => {
  try {
    const rewards = await Reward.find().sort({ pointsRequired: 1 }).lean();
    return success(res, 'Rewards fetched', { rewards });
  } catch (err) {
    next(err);
  }
};

const createReward = async (req, res, next) => {
  try {
    if (!req.body.name || !req.body.pointsRequired) {
      return next(new ApiError('name and pointsRequired are required', 422));
    }
    const reward = await Reward.create(req.body);
    return success(res, 'Reward created', { reward }, 201);
  } catch (err) {
    next(err);
  }
};

const updateReward = async (req, res, next) => {
  try {
    const reward = await Reward.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!reward) return next(new ApiError('Reward not found', 404));
    return success(res, 'Reward updated', { reward });
  } catch (err) {
    next(err);
  }
};

const deleteReward = async (req, res, next) => {
  try {
    const reward = await Reward.findByIdAndDelete(req.params.id);
    if (!reward) return next(new ApiError('Reward not found', 404));
    return success(res, 'Reward deleted', {});
  } catch (err) {
    next(err);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, totalTrips, safeTrips, totalViolations, avgSafety, totalRedemptions, totalDistance, totalEmergencies] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        DrivingSession.countDocuments({ status: 'COMPLETED' }),
        DrivingSession.countDocuments({ status: 'COMPLETED', violations: { $size: 0 } }),
        Violation.countDocuments(),
        User.aggregate([{ $group: { _id: null, avg: { $avg: '$safetyScore' } } }]),
        RewardRedemption.countDocuments(),
        User.aggregate([{ $group: { _id: null, total: { $sum: '$totalDistance' } } }]),
        Emergency.countDocuments(),
      ]);

    const violationsByType = await Violation.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    const violationDistribution = violationsByType.reduce((acc, v) => {
      acc[v._id] = v.count;
      return acc;
    }, {});

    const dailySessions = await DrivingSession.aggregate([
      { $match: { status: 'COMPLETED' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
          trips: { $sum: 1 },
          distance: { $sum: '$distance' },
          avgScore: { $avg: '$safetyScore' },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 14 },
    ]);

    const avgSafetyScore = avgSafety.length ? Math.round(avgSafety[0].avg) : 85;
    const totalDistanceKm = totalDistance.length ? Math.round(totalDistance[0].total) : 0;

    return success(res, 'Admin analytics fetched', {
      stats: {
        totalUsers,
        activeUsers,
        totalTrips,
        safeTrips,
        unsafeTrips: totalTrips - safeTrips,
        totalViolations,
        averageSafetyScore: avgSafetyScore,
        totalRewardsRedeemed: totalRedemptions,
        totalDistance: totalDistanceKm,
        totalEmergencies,
      },
      violationDistribution,
      dailySessions,
    });
  } catch (err) {
    next(err);
  }
};

const getSensorMonitoring = async (req, res, next) => {
  try {
    const sensors = await Sensor.find().sort({ lastUpdated: -1 }).lean();
    const byType = {};
    for (const s of sensors) {
      if (!byType[s.type]) byType[s.type] = s;
    }
    const order = ['GPS', 'CAMERA', 'ACCELEROMETER', 'GYROSCOPE', 'HELMET', 'SEATBELT', 'ALCOHOL', 'EYE'];
    const result = order
      .filter((t) => byType[t])
      .map((t) => ({
        type: t,
        status: byType[t].status,
        lastUpdated: byType[t].lastUpdated,
        battery: byType[t].batteryLevel,
        deviceId: byType[t].deviceCode,
        value: byType[t].value,
      }));

    const devices = await require('../models/Device').find().sort({ lastSeen: -1 }).lean();
    return success(res, 'Sensor monitoring data fetched', { sensors: result, devices });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboard,
  getUsers,
  getUserById,
  updateUserStatus,
  getViolations,
  getSensors,
  getRewards,
  createReward,
  updateReward,
  deleteReward,
  getAnalytics,
  getSensorMonitoring,
};
