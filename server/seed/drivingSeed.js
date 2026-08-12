const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const DrivingSession = require('../models/DrivingSession');
const DrivingEvent = require('../models/DrivingEvent');
const Violation = require('../models/Violation');
const Alert = require('../models/Alert');
const SafetyScore = require('../models/SafetyScore');
const Emergency = require('../models/Emergency');
const RewardRedemption = require('../models/RewardRedemption');
const Sensor = require('../models/Sensor');
const Device = require('../models/Device');
const Reward = require('../models/Reward');
const { seedUsers } = require('./userSeed');
const { seedRewards } = require('./rewardSeed');
const { VIOLATION_POINTS, VIOLATION_SCORE_PENALTY, VIOLATION_SEVERITY } = require('../utils/constants');
const { generateCode } = require('../utils/calculations');

const routes = [
  { from: 'Bhavnagar Bus Stand', lat: 21.7645, lng: 72.1519 },
  { from: 'GEC Bhavnagar', lat: 21.7729, lng: 72.1519 },
  { from: 'Crescent Circle', lat: 21.7622, lng: 72.1483 },
  { from: 'Nirmalnagar', lat: 21.7672, lng: 72.1469 },
  { from: 'Amul Dairy Circle', lat: 21.7691, lng: 72.1451 },
  { from: 'Kalatalav', lat: 21.7582, lng: 72.1541 },
  { from: 'Bortalav', lat: 21.7481, lng: 72.1574 },
];

const violationTypes = ['NO_HELMET', 'NO_SEATBELT', 'PHONE_USAGE', 'OVERSPEED', 'WRONG_SIDE', 'SIGNAL_JUMP', 'RASH_DRIVING', 'DROWSINESS'];

const seedDriving = async () => {
  await DrivingSession.deleteMany({});
  await DrivingEvent.deleteMany({});
  await Violation.deleteMany({});
  await Alert.deleteMany({});
  await SafetyScore.deleteMany({});
  await Emergency.deleteMany({});
  await RewardRedemption.deleteMany({});
  await Sensor.deleteMany({});
  console.log('[seed] cleared sessions, events, violations, alerts, scores, emergencies, redemptions, sensors');

  const users = await User.find({ role: 'USER' });
  const rewards = await Reward.find();

  const totalViolationPerType = {};

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const vehicle = await Vehicle.findOne({ userId: user._id });

    let earned = 0;
    let deducted = 0;
    let safeTripCount = 0;
    const sessionCount = 8 + Math.floor(Math.random() * 6);

    for (let s = 0; s < sessionCount; s++) {
      const daysAgo = Math.floor(Math.random() * 40);
      const startTime = new Date(Date.now() - daysAgo * 86400000 - Math.floor(Math.random() * 12) * 3600000);
      const durationMin = 15 + Math.floor(Math.random() * 70);
      const endTime = new Date(startTime.getTime() + durationMin * 60000);

      const route = routes[Math.floor(Math.random() * routes.length)];
      const startLocation = { latitude: route.lat, longitude: route.lng, address: route.from };
      const endLocation = {
        latitude: route.lat + (Math.random() - 0.5) * 0.05,
        longitude: route.lng + (Math.random() - 0.5) * 0.05,
        address: `${route.from} (return)`,
      };

      const distance = Math.round((rnd(4, 22) * 100)) / 100;
      const speedLimit = 60;
      const averageSpeed = Math.round(rnd(28, 52));
      const maxSpeed = Math.round(rnd(48, 88));

      const violationCount = Math.random() > 0.55 ? 0 : 1 + Math.floor(Math.random() * 2);
      const isSafe = violationCount === 0;
      if (isSafe) safeTripCount += 1;

      let sessionScore = 85 + Math.floor(Math.random() * 6);
      let sessionPointsEarned = 10;
      let sessionPointsDeducted = 0;
      const violations = [];

      for (let v = 0; v < violationCount; v++) {
        const type = violationTypes[Math.floor(Math.random() * violationTypes.length)];
        const penalty = VIOLATION_POINTS[type];
        const scorePenalty = VIOLATION_SCORE_PENALTY[type];
        sessionScore = Math.max(40, sessionScore - scorePenalty);
        sessionPointsDeducted += penalty;
        deducted += penalty;
        totalViolationPerType[type] = (totalViolationPerType[type] || 0) + 1;

        const violation = await Violation.create({
          userId: user._id,
          drivingSessionId: null,
          vehicleId: vehicle?._id || null,
          type,
          severity: VIOLATION_SEVERITY[type],
          description: `${type.replace(/_/g, ' ')} detected during trip ${s + 1}`,
          pointsPenalty: penalty,
          scorePenalty,
          evidence: { simulated: true, confidence: Math.round((0.85 + Math.random() * 0.14) * 100) / 100 },
          location: { latitude: startLocation.latitude, longitude: startLocation.longitude },
          timestamp: new Date(startTime.getTime() + v * 1800000),
        });
        violations.push(violation._id);
      }

      if (isSafe && distance >= 10) sessionPointsEarned += 25;

      const session = await DrivingSession.create({
        userId: user._id,
        vehicleId: vehicle?._id || null,
        startTime,
        endTime,
        startLocation,
        endLocation,
        distance,
        averageSpeed,
        maxSpeed,
        speedLimit,
        safetyScore: sessionScore,
        pointsEarned: sessionPointsEarned,
        pointsDeducted: sessionPointsDeducted,
        helmetCompliance: Math.round(rnd(70, 100)),
        seatBeltCompliance: Math.round(rnd(60, 100)),
        phoneUsage: violationCount,
        harshBrakingCount: violationCount ? Math.floor(Math.random() * 2) : 0,
        rashDrivingCount: violationCount ? Math.floor(Math.random() * 2) : 0,
        drowsinessDetected: violations.some((v) => v.type === 'DROWSINESS'),
        violations,
        status: 'COMPLETED',
      });

      for (const violation of violations) {
        await Violation.updateOne({ _id: violation }, { drivingSessionId: session._id });
      }

      const baseEvent = isSafe ? 'SAFE_SPEED' : 'PHONE_DETECTED';
      await DrivingEvent.create({
        userId: user._id,
        drivingSessionId: session._id,
        eventType: baseEvent,
        value: { distance, averageSpeed, maxSpeed },
        pointsChange: 0,
        scoreChange: 0,
        location: startLocation,
        timestamp: startTime,
      });

      if (violationCount) {
        const firstViolation = await Violation.findById(violations[0]);
        await Alert.create({
          userId: user._id,
          drivingSessionId: session._id,
          type: firstViolation.type === 'PHONE_USAGE' ? 'PHONE_DETECTED' : firstViolation.type,
          severity: firstViolation.severity,
          message: `${firstViolation.type.replace(/_/g, ' ')} detected during trip`,
          metadata: { violationId: firstViolation._id },
          isRead: Math.random() > 0.5,
        });
      }

      await SafetyScore.create({
        userId: user._id,
        drivingSessionId: session._id,
        score: sessionScore,
        change: 0,
        reason: 'Trip completed',
        details: { trip: s + 1 },
        createdAt: startTime,
      });

      earned += sessionPointsEarned;
    }

    const safetyScore = Math.max(55, Math.min(98, 78 + Math.floor(Math.random() * 18) + safeTripCount));
    user.safetyScore = safetyScore;
    user.totalPoints = Math.max(0, 100 + earned - deducted);
    if (i === 0) user.totalPoints = Math.max(user.totalPoints, 2450);
    if (i >= 1 && i <= 3) user.totalPoints = Math.max(user.totalPoints, 900 + i * 300);
    user.totalTrips = sessionCount;
    user.safeTrips = safeTripCount;
    user.totalDistance = Math.round(user.totalDistance + sessionCount * 12);
    user.achievements = ['FIRST_DRIVE', 'SAFE_STREAK'];
    await user.save();

    const device = await Device.findOne({ userId: user._id }) || await Device.create({
      deviceId: `ESP32-SIM-${100 + i}`,
      name: `ESP32 Sim for ${user.name}`,
      type: 'SIMULATED',
      userId: user._id,
      status: 'ONLINE',
    });

    const sensorValues = [
      { type: 'GPS', value: { latitude: 21.7645, longitude: 72.1519, speed: 0 } },
      { type: 'CAMERA', value: { phone: 'SAFE', frameId: 0 } },
      { type: 'ACCELEROMETER', value: { x: 0, y: 0, z: 1, harshBraking: false } },
      { type: 'GYROSCOPE', value: { x: 0, y: 0, z: 0 } },
      { type: 'HELMET', value: { status: 'SAFE' } },
      { type: 'SEATBELT', value: { status: 'SAFE' } },
      { type: 'ALCOHOL', value: { level: 0 } },
      { type: 'EYE', value: { status: 'SAFE', eyeOpen: true } },
    ];
    for (const sv of sensorValues) {
      await Sensor.create({
        deviceId: device._id,
        deviceCode: device.deviceId,
        userId: user._id,
        type: sv.type,
        status: 'ONLINE',
        value: sv.value,
        unit: sv.type === 'GPS' ? 'km/h' : '',
        batteryLevel: Math.round(rnd(60, 100)),
      });
    }
  }

  const driverUsers = users.slice(0, 5);
  for (const user of driverUsers) {
    await Emergency.create({
      userId: user._id,
      latitude: 21.7645,
      longitude: 72.1519,
      locationAddress: 'Bhavnagar, Gujarat',
      contact: { name: 'Home Contact', mobile: '+91-9876543210' },
      triggerType: 'MANUAL_SOS',
      status: 'RESOLVED',
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 20) * 86400000),
    });
  }

  const rankedRewards = rewards.sort((a, b) => a.pointsRequired - b.pointsRequired);
  for (const user of users.slice(0, 4)) {
    if (!rankedRewards.length) break;
    const affordable = rankedRewards.filter((r) => user.totalPoints >= r.pointsRequired);
    if (!affordable.length) continue;
    const reward = affordable[0];
    const redemption = await RewardRedemption.create({
      userId: user._id,
      rewardId: reward._id,
      rewardName: reward.name,
      pointsSpent: reward.pointsRequired,
      redemptionCode: generateCode('SDX', 8),
      status: 'CLAIMED',
    });
    user.totalPoints -= reward.pointsRequired;
    await user.save();
    reward.stock = Math.max(0, reward.stock - 1);
    await reward.save();
    console.log(`[seed] redemption: ${user.email} -> ${reward.name}`);
  }

  console.log(`[seed] driving data seeded for ${users.length} users`);
  console.log('[seed] violation distribution:', totalViolationPerType);
};

const rnd = (min, max) => Math.random() * (max - min) + min;

module.exports = { seedDriving };

if (require.main === module) {
  require('../config/db')().then(async () => {
    await seedDriving();
    process.exit(0);
  });
}
