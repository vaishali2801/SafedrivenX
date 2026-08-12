const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const demoController = require('../controllers/demoController');

router.use(protect);

router.post('/start', demoController.start);
router.post('/next', demoController.nextStage);
router.post('/reset', demoController.reset);
router.get('/state', demoController.state);

module.exports = router;
