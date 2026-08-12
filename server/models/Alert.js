const mongoose = require('mongoose');

const ALERT_TYPES = [
  'SPEED_WARNING',
  'OVERSPEED',
  'PHONE_DETECTED',
  'NO_HELMET',
  'NO_SEATBELT',
  'HARSH_BRAKING',
  'DROWSINESS',
  'RASH_DRIVING',
  'WRONG_SIDE',
  'SIGNAL_JUMP',
  'ALCOHOL_DETECTED',
  'EMERGENCY',
];

const alertSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    drivingSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'DrivingSession', default: null },
    type: { type: String, enum: ALERT_TYPES, required: true },
    severity: { type: String, enum: ['INFO', 'WARNING', 'CRITICAL'], default: 'WARNING' },
    message: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

alertSchema.index({ userId: 1, createdAt: -1 });
alertSchema.index({ isRead: 1 });

const Alert = mongoose.model('Alert', alertSchema);
module.exports = Alert;
module.exports.ALERT_TYPES = ALERT_TYPES;
