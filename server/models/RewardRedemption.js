const mongoose = require('mongoose');

const rewardRedemptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rewardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reward', required: true },
    rewardName: { type: String, required: true },
    pointsSpent: { type: Number, required: true, min: 0 },
    redemptionCode: { type: String, required: true, unique: true },
    status: { type: String, enum: ['PENDING', 'CLAIMED', 'EXPIRED'], default: 'PENDING' },
  },
  { timestamps: true }
);

rewardRedemptionSchema.index({ userId: 1, createdAt: -1 });

const RewardRedemption = mongoose.model('RewardRedemption', rewardRedemptionSchema);
module.exports = RewardRedemption;
