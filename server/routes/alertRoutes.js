const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const alertController = require('../controllers/alertController');

router.use(protect);

router.get('/', alertController.getAlerts);
router.patch('/read-all', alertController.markAllRead);
router.patch('/:id/read', alertController.markRead);

module.exports = router;
