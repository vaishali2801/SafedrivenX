const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const drivingController = require('../controllers/drivingController');
const { startSessionSchema, endSessionSchema } = require('../validators');

router.use(protect);

router.post('/start', validate(startSessionSchema), drivingController.startSession);
router.get('/active', drivingController.getActive);
router.post('/end', validate(endSessionSchema), drivingController.endSession);
router.get('/history', drivingController.getHistory);
router.get('/stats', drivingController.getStats);
router.get('/:id', drivingController.getSessionDetail);

module.exports = router;
