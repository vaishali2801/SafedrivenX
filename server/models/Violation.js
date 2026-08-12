const mongoose = require('mongoose');

const VIOLATION_TYPES = [
  'NO_HELMET',
  'NO_SEATBELT',
  'PHONE_USAGE',
  'OVERSPEED',
  'WRONG_SIDE',
  'SIGNAL_JUMP',
  'RASH_DRIVING',
  'DRINK_DRIVING',
  'DROWSINESS',
];

const violationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    drivingSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DrivingSession',
      default: null,
      index: true,
    },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    type: { type: String, enum: VIOLATION_TYPES, required: true, index: true },
    severity: { type: String, enum: ['INFO', 'WARNING', 'CRITICAL'], default: 'WARNING' },
    description: { type: String, default: '' },
    pointsPenalty: { type: Number, default: 0 },
    scorePenalty: { type: Number, default: 0 },
    evidence: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['ACTIVE', 'REVIEWED', 'DISMISSED'], default: 'ACTIVE' },
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

violationSchema.index({ userId: 1, timestamp: -1 });

const Violation = mongoose.model('Violation', violationSchema);
module.exports = Violation;
module.exports.VIOLATION_TYPES = VIOLATION_TYPES;
