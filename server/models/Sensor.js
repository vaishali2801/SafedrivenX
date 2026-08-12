const mongoose = require('mongoose');

const SENSOR_TYPES = [
  'GPS',
  'CAMERA',
  'ACCELEROMETER',
  'GYROSCOPE',
  'HELMET',
  'SEATBELT',
  'ALCOHOL',
  'EYE',
  'RAIN',
  'ULTRASONIC',
];

const sensorSchema = new mongoose.Schema(
  {
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', default: null },
    deviceCode: { type: String, default: '', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    type: { type: String, enum: SENSOR_TYPES, required: true },
    status: { type: String, enum: ['ONLINE', 'OFFLINE', 'WARNING', 'ERROR'], default: 'ONLINE' },
    value: { type: mongoose.Schema.Types.Mixed, default: {} },
    unit: { type: String, default: '' },
    lastUpdated: { type: Date, default: Date.now },
    batteryLevel: { type: Number, default: 100, min: 0, max: 100 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

sensorSchema.index({ deviceCode: 1, type: 1 });
sensorSchema.index({ userId: 1, type: 1 });

const Sensor = mongoose.model('Sensor', sensorSchema);
module.exports = Sensor;
module.exports.SENSOR_TYPES = SENSOR_TYPES;
