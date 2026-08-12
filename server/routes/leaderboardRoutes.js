const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const leaderboardController = require('../controllers/leaderboardController');

router.get('/', protect, leaderboardController.getLeaderboard);

module.exports = router;
