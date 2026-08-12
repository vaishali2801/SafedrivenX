const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const rewardController = require('../controllers/rewardController');

router.use(protect);

router.get('/', rewardController.getRewards);
router.get('/my-redemptions', rewardController.myRedemptions);
router.get('/:id', rewardController.getReward);
router.post('/:id/redeem', rewardController.redeem);

module.exports = router;
