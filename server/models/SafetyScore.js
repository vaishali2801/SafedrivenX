const mongoose = require('mongoose');

const safetyScoreSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    drivingSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'DrivingSession', default: null },
    score: { type: Number, required: true, min: 0, max: 100 },
    change: { type: Number, default: 0 },
    reason: { type: String, default: '' },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

safetyScoreSchema.index({ userId: 1, createdAt: -1 });

const SafetyScore = mongoose.model('SafetyScore', safetyScoreSchema);
module.exports = SafetyScore;
