const { success, ApiError } = require('../utils/response');
const rewardService = require('../services/rewardService');

const getRewards = async (req, res, next) => {
  try {
    const rewards = await rewardService.getActiveRewards();
    return success(res, 'Rewards fetched', { rewards });
  } catch (err) {
    next(err);
  }
};

const getReward = async (req, res, next) => {
  try {
    const reward = await rewardService.getRewardById(req.params.id);
    if (!reward) return next(new ApiError('Reward not found', 404));
    return success(res, 'Reward fetched', { reward });
  } catch (err) {
    next(err);
  }
};

const redeem = async (req, res, next) => {
  try {
    const result = await rewardService.redeemReward(req.user, req.params.id);
    return success(res, 'Reward redeemed successfully', {
      redemption: result.redemption,
      reward: result.reward,
      remainingPoints: result.user.totalPoints,
    }, 201);
  } catch (err) {
    if (err.message === 'Insufficient points') {
      return next(new ApiError('Insufficient points', 400, {
        requiredPoints: err.requiredPoints,
        currentPoints: err.currentPoints,
      }));
    }
    next(err);
  }
};

const myRedemptions = async (req, res, next) => {
  try {
    const redemptions = await rewardService.getMyRedemptions(req.userId);
    return success(res, 'My redemptions fetched', { redemptions });
  } catch (err) {
    next(err);
  }
};

module.exports = { getRewards, getReward, redeem, myRedemptions };
