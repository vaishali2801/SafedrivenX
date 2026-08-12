const mongoose = require('mongoose');

const EVENT_TYPES = [
  'HELMET_VERIFIED',
  'NO_HELMET',
  'SEATBELT_VERIFIED',
  'NO_SEATBELT',
  'SAFE_SPEED',
  'NO_MOBILE_USAGE',
  'PHONE_DETECTED',
  'OVERSPEED',
  'SAFE_BRAKING',
  'HARSH_BRAKING',
  'DROWSINESS',
  'RASH_DRIVING',
  'SMOOTH_DRIVING',
  'SIGNAL_COMPLIANCE',
  'SIGNAL_JUMP',
  'WRONG_SIDE',
  'DRINK_DRIVING',
  'DRIVE_10_KM',
  'DAILY_CHALLENGE',
  'WEEKLY_SAFE_DRIVER',
  'EMERGENCY',
];

const drivingEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    drivingSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DrivingSession',
      default: null,
    },
    eventType: { type: String, enum: EVENT_TYPES, required: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, default: {} },
    pointsChange: { type: Number, default: 0 },
    scoreChange: { type: Number, default: 0 },
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

drivingEventSchema.index({ userId: 1, timestamp: -1 });
drivingEventSchema.index({ drivingSessionId: 1 });

const DrivingEvent = mongoose.model('DrivingEvent', drivingEventSchema);
module.exports = DrivingEvent;
module.exports.EVENT_TYPES = EVENT_TYPES;
