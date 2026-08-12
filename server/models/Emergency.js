const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    drivingSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'DrivingSession', default: null },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    locationAddress: { type: String, default: '' },
    contact: {
      name: { type: String, default: '' },
      mobile: { type: String, default: '' },
    },
    triggerType: {
      type: String,
      enum: ['MANUAL_SOS', 'CRASH_DETECTED', 'HARSH_IMPACT', 'DROWSINESS_CRITICAL'],
      default: 'MANUAL_SOS',
    },
    status: { type: String, enum: ['TRIGGERED', 'CONTACTED', 'RESOLVED'], default: 'TRIGGERED' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

emergencySchema.index({ userId: 1, createdAt: -1 });

const Emergency = mongoose.model('Emergency', emergencySchema);
module.exports = Emergency;
