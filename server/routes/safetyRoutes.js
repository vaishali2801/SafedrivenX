const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const safetyController = require('../controllers/safetyController');

router.use(protect);

router.get('/score', safetyController.getScore);
router.get('/score/history', safetyController.getHistory);
router.get('/score/trend', safetyController.getWeeklyTrend);
router.get('/events', safetyController.getEvents);
router.get('/violations', safetyController.getViolations);

module.exports = router;
