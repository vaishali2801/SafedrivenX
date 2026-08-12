const { success } = require('../utils/response');
const User = require('../models/User');
const DrivingSession = require('../models/DrivingSession');
const Alert = require('../models/Alert');
const Violation = require('../models/Violation');
const { getSensorSnapshot } = require('../services/sensorService');
const { getRecentAlerts } = require('../services/alertService');
const scoringService = require('../services/scoringService');

const getDashboard = async (req, res, next) => {
  try {
    const userId = req.userId;

    const [user, activeSession, sensorSnapshot, recentAlerts, weeklyScore] = await Promise.all([
      User.findById(userId).populate('vehicleId').lean(),
      DrivingSession.findOne({ userId, status: 'ACTIVE' }).populate('violations').lean(),
      getSensorSnapshot(userId),
      getRecentAlerts(userId, 10),
      scoringService.getWeeklyScoreTrend(userId, 7),
    ]);

    const gps = sensorSnapshot.gps || {};
    const speed = gps.value?.speed ?? activeSession?.averageSpeed ?? 0;

    const drivingStats = {
      totalTrips: user.totalTrips || 0,
      safeTrips: user.safeTrips || 0,
      distance: user.totalDistance || 0,
      violations: activeSession?.violations?.length || 0,
    };

    return success(res, 'Dashboard fetched successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        vehicle: user.vehicleId,
      },
      live: {
        currentSpeed: speed,
        speedLimit: activeSession?.speedLimit || 60,
        helmetStatus: sensorSnapshot.helmet?.value?.status || 'SAFE',
        phoneStatus: sensorSnapshot.camera?.value?.phone || 'SAFE',
        seatBeltStatus: sensorSnapshot.seatbelt?.value?.status || 'SAFE',
        brakeStatus: sensorSnapshot.accel?.value?.harshBraking ? 'HARSH' : 'NORMAL',
        drowsinessStatus: sensorSnapshot.eye?.value?.status || 'SAFE',
        gps: gps.value || null,
      },
      safetyScore: user.safetyScore,
      points: user.totalPoints,
      activeSession: activeSession || null,
      recentAlerts,
      weeklyScore,
      drivingStats,
      sensorStatus: sensorSnapshot,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };
