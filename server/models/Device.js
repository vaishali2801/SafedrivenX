const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, default: '' },
    type: {
      type: String,
      enum: ['ESP32', 'RASPBERRY_PI', 'ARDUINO', 'SIMULATED', 'OTHER'],
      default: 'ESP32',
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    firmwareVersion: { type: String, default: '' },
    status: { type: String, enum: ['ONLINE', 'OFFLINE', 'WARNING', 'ERROR'], default: 'ONLINE' },
    lastSeen: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

deviceSchema.index({ userId: 1 });

const Device = mongoose.model('Device', deviceSchema);
module.exports = Device;
