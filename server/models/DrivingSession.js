const mongoose = require('mongoose');

const drivingSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },

    startTime: { type: Date, default: Date.now },
    endTime: { type: Date, default: null },

    startLocation: {
      latitude: { type: Number, default: 21.7645 },
      longitude: { type: Number, default: 72.1519 },
      address: { type: String, default: '' },
    },
    endLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      address: { type: String, default: '' },
    },

    distance: { type: Number, default: 0 },
    averageSpeed: { type: Number, default: 0 },
    maxSpeed: { type: Number, default: 0 },
    speedLimit: { type: Number, default: 60 },

    safetyScore: { type: Number, default: 85 },
    pointsEarned: { type: Number, default: 0 },
    pointsDeducted: { type: Number, default: 0 },

    helmetCompliance: { type: Number, default: 0 },
    seatBeltCompliance: { type: Number, default: 0 },
    phoneUsage: { type: Number, default: 0 },
    harshBrakingCount: { type: Number, default: 0 },
    rashDrivingCount: { type: Number, default: 0 },
    drowsinessDetected: { type: Boolean, default: false },

    violations: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Violation' },
    ],

    status: { type: String, enum: ['ACTIVE', 'COMPLETED', 'EMERGENCY'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

drivingSessionSchema.index({ userId: 1, status: 1 });
drivingSessionSchema.index({ userId: 1, startTime: -1 });
drivingSessionSchema.index({ vehicleId: 1 });

const DrivingSession = mongoose.model('DrivingSession', drivingSessionSchema);
module.exports = DrivingSession;
