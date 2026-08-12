const Sensor = require('../models/Sensor');
const Device = require('../models/Device');
const { SENSOR_TYPES } = require('../utils/constants');
const { emitToUser, emitToAll } = require('../config/socket');

const SENSOR_TYPE_TO_SOCKET = {
  GPS: 'gps:update',
  CAMERA: 'camera:update',
  ACCELEROMETER: 'accel:update',
  HELMET: 'helmet:update',
  SEATBELT: 'seatbelt:update',
};

const SENSOR_TYPE_TO_STATUS = {
  GPS: { status: 'ONLINE', unit: 'km/h' },
  CAMERA: { status: 'ONLINE', unit: '' },
  ACCELEROMETER: { status: 'ONLINE', unit: 'm/s²' },
  GYROSCOPE: { status: 'ONLINE', unit: 'deg/s' },
  HELMET: { status: 'ONLINE', unit: '' },
  SEATBELT: { status: 'ONLINE', unit: '' },
  ALCOHOL: { status: 'ONLINE', unit: 'ppm' },
  EYE: { status: 'ONLINE', unit: '' },
  RAIN: { status: 'ONLINE', unit: '' },
  ULTRASONIC: { status: 'ONLINE', unit: 'cm' },
};

const ingestSensorData = async ({ deviceCode, sensorType, value, batteryLevel, metadata = {} }) => {
  if (!SENSOR_TYPES.includes(sensorType)) {
    throw Object.assign(new Error(`Unknown sensor type: ${sensorType}`), { statusCode: 422 });
  }

  let device = await Device.findOne({ deviceId: deviceCode });
  if (!device) {
    device = await Device.create({
      deviceId: deviceCode,
      name: deviceCode,
      type: 'ESP32',
      status: 'ONLINE',
      lastSeen: new Date(),
    });
  } else {
    device.status = 'ONLINE';
    device.lastSeen = new Date();
    await device.save();
  }

  const defaults = SENSOR_TYPE_TO_STATUS[sensorType] || {};
  const sensor = await Sensor.findOneAndUpdate(
    { deviceCode, type: sensorType },
    {
      deviceId: device._id,
      userId: metadata.userId || device.userId || null,
      status: defaults.status || 'ONLINE',
      value,
      unit: defaults.unit || '',
      lastUpdated: new Date(),
      batteryLevel: batteryLevel ?? device.metadata?.battery ?? 100,
      metadata,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  emitToUser(metadata.userId, SENSOR_TYPE_TO_SOCKET[sensorType] || 'sensor:update', {
    deviceCode,
    type: sensorType,
    value,
    lastUpdated: sensor.lastUpdated,
    batteryLevel: sensor.batteryLevel,
  });

  emitToAll('sensor:update', { deviceCode, type: sensorType, value });

  return sensor;
};

const getSensorsForUser = (userId) =>
  Sensor.find({ $or: [{ userId }, { userId: null }] }).sort({ type: 1 }).lean();

const getDeviceSensors = (deviceCode) =>
  Sensor.find({ deviceCode }).sort({ type: 1 }).lean();

const getDeviceByCode = (deviceCode) => Device.findOne({ deviceId: deviceCode }).lean();

const updateSensorStatus = async (deviceCode, sensorType, status) => {
  const sensor = await Sensor.findOneAndUpdate(
    { deviceCode, type: sensorType },
    { status },
    { new: true }
  );
  if (!sensor) throw Object.assign(new Error('Sensor not found'), { statusCode: 404 });
  emitToAll('sensor:status', { deviceCode, type: sensorType, status });
  return sensor;
};

const getSensorSnapshot = async (userId) => {
  const sensors = await Sensor.find({ $or: [{ userId }, { userId: null }] }).lean();
  const snapshot = {};
  const keyFor = (type) =>
    ({ GPS: 'gps', CAMERA: 'camera', ACCELEROMETER: 'accel', GYROSCOPE: 'gyro', HELMET: 'helmet', SEATBELT: 'seatbelt', ALCOHOL: 'alcohol', EYE: 'eye' }[type]);

  for (const s of sensors) {
    const key = keyFor(s.type);
    if (key) snapshot[key] = { status: s.status, value: s.value, lastUpdated: s.lastUpdated, battery: s.batteryLevel, deviceId: s.deviceCode };
  }
  return snapshot;
};

module.exports = {
  ingestSensorData,
  getSensorsForUser,
  getDeviceSensors,
  getDeviceByCode,
  updateSensorStatus,
  getSensorSnapshot,
  SENSOR_TYPE_TO_SOCKET,
};
