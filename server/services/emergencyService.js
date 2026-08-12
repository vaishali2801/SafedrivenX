const Emergency = require('../models/Emergency');
const { emitToUser, emitToAll } = require('../config/socket');

const triggerEmergency = async ({
  userId,
  drivingSessionId = null,
  latitude = null,
  longitude = null,
  triggerType = 'MANUAL_SOS',
  contact = null,
  metadata = {},
}) => {
  const User = require('../models/User');
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const gps = await SensorLatest();
  const sensorGps = gps && gps.value;
  const resolvedLat = latitude ?? sensorGps?.latitude ?? user.lastKnownLatitude ?? null;
  const resolvedLng = longitude ?? sensorGps?.longitude ?? user.lastKnownLongitude ?? null;

  const emergencyContact = contact || user.emergencyContact || {};

  const emergency = await Emergency.create({
    userId,
    drivingSessionId,
    latitude: resolvedLat,
    longitude: resolvedLng,
    locationAddress: metadata.address || '',
    contact: emergencyContact,
    triggerType,
    status: 'TRIGGERED',
    metadata,
  });

  emitToUser(userId, 'emergency:trigger', {
    id: emergency._id,
    triggerType,
    latitude: resolvedLat,
    longitude: resolvedLng,
    contact: emergencyContact,
    status: emergency.status,
    message: 'Emergency alert prepared and location shared with emergency contacts.',
  });

  emitToAll('emergency:new', {
    id: emergency._id,
    userId,
    triggerType,
    latitude: resolvedLat,
    longitude: resolvedLng,
    createdAt: emergency.createdAt,
  });

  return { emergency, resolvedLat, resolvedLng };
};

async function SensorLatest() {
  const Sensor = require('../models/Sensor');
  return Sensor.findOne({ type: 'GPS' }).sort({ lastUpdated: -1 }).lean();
}

const getHistory = (userId, limit = 20) =>
  Emergency.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();

const getById = (userId, id) =>
  Emergency.findOne({ _id: id, userId }).lean();

const resolveEmergency = async (userId, id) => {
  const emergency = await Emergency.findOneAndUpdate(
    { _id: id, userId },
    { status: 'RESOLVED' },
    { new: true }
  );
  if (!emergency) throw Object.assign(new Error('Emergency record not found'), { statusCode: 404 });
  emitToUser(userId, 'emergency:resolved', { id, status: emergency.status });
  return emergency;
};

module.exports = { triggerEmergency, getHistory, getById, resolveEmergency };
