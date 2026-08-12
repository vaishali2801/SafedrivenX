const Reward = require('../models/Reward');
const RewardRedemption = require('../models/RewardRedemption');
const { generateCode } = require('../utils/calculations');
const { emitToUser } = require('../config/socket');
const mongoose = require('mongoose');

let transactionSupported = null;

const supportsTransactions = async () => {
  if (transactionSupported !== null) return transactionSupported;
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    transactionSupported = !!(hello && (hello.setName || hello.msg === 'isdbgrid'));
  } catch (e) {
    transactionSupported = false;
  }
  return transactionSupported;
};

const getActiveRewards = (limit = 50) =>
  Reward.find({ isActive: true, stock: { $gt: 0 } })
    .sort({ pointsRequired: 1 })
    .limit(limit)
    .lean();

const getRewardById = (id) => Reward.findById(id).lean();

const redeemWithTransaction = async (user, rewardId) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await doRedemption(user, rewardId, session);
    });
    await session.endSession();
    return result;
  } catch (error) {
    await session.endSession();
    throw error;
  }
};

const redeemWithoutTransaction = async (user, rewardId) => {
  return doRedemption(user, rewardId, null);
};

const doRedemption = async (user, rewardId, session) => {
  const q = () => (session ? Reward.findById(rewardId).session(session) : Reward.findById(rewardId));
  const reward = await q();
  if (!reward) throw Object.assign(new Error('Reward not found'), { statusCode: 404 });
  if (!reward.isActive) throw Object.assign(new Error('Reward is not active'), { statusCode: 400 });
  if (reward.stock <= 0) throw Object.assign(new Error('Reward out of stock'), { statusCode: 409 });

  const freshUser = session ? await UserModel().findById(user._id).session(session) : user;
  if (freshUser.totalPoints < reward.pointsRequired) {
    const err = new Error('Insufficient points');
    err.statusCode = 400;
    err.insufficient = true;
    err.requiredPoints = reward.pointsRequired;
    err.currentPoints = freshUser.totalPoints;
    throw err;
  }

  const redemptionCode = generateCode('SDX', 8);
  const redemptionData = {
    userId: freshUser._id,
    rewardId: reward._id,
    rewardName: reward.name,
    pointsSpent: reward.pointsRequired,
    redemptionCode,
  };

  const redemption = session
    ? (await RewardRedemption.create([redemptionData], { session }))[0]
    : await RewardRedemption.create(redemptionData);

  freshUser.totalPoints -= reward.pointsRequired;
  await freshUser.save(session ? { session } : {});

  reward.stock -= 1;
  await reward.save(session ? { session } : {});

  return { redemption, reward: reward.toObject(), user: freshUser };
};

function UserModel() {
  return require('../models/User');
}

const redeemReward = async (user, rewardId) => {
  const result = (await supportsTransactions())
    ? await redeemWithTransaction(user, rewardId)
    : await redeemWithoutTransaction(user, rewardId);

  emitToUser(user._id.toString(), 'points:update', {
    totalPoints: result.user.totalPoints,
    change: -result.reward.pointsRequired,
    reason: `Redeemed: ${result.reward.name}`,
  });

  return result;
};

const getMyRedemptions = (userId, limit = 30) =>
  RewardRedemption.find({ userId })
    .populate('rewardId', 'name pointsRequired category image')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

module.exports = { getActiveRewards, getRewardById, redeemReward, getMyRedemptions };
