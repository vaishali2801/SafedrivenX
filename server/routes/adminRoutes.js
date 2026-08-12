const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const adminController = require('../controllers/adminController');
const { rewardSchema } = require('../validators');

router.use(protect, adminOnly);

router.get('/dashboard', adminController.getDashboard);
router.get('/analytics', adminController.getAnalytics);
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.get('/violations', adminController.getViolations);
router.get('/sensors', adminController.getSensors);
router.get('/sensors/monitoring', adminController.getSensorMonitoring);
router.get('/rewards', adminController.getRewards);
router.post('/rewards', validate(rewardSchema), adminController.createReward);
router.patch('/rewards/:id', validate(rewardSchema), adminController.updateReward);
router.delete('/rewards/:id', adminController.deleteReward);

module.exports = router;
