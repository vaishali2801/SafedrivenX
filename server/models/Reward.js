const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    pointsRequired: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: ['COUPON', 'CASHBACK', 'VOUCHER', 'SERVICE', 'INSURANCE', 'GIFT'],
      default: 'COUPON',
    },
    image: { type: String, default: '' },
    stock: { type: Number, default: 100, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Reward = mongoose.model('Reward', rewardSchema);
module.exports = Reward;
