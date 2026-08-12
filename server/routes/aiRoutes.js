const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const aiController = require('../controllers/aiController');
const { aiDetectionSchema, aiBehaviourSchema } = require('../validators');

router.use(protect);

router.post('/helmet', validate(aiDetectionSchema), aiController.helmet);
router.post('/phone', validate(aiDetectionSchema), aiController.phone);
router.post('/seatbelt', validate(aiDetectionSchema), aiController.seatbelt);
router.post('/drowsiness', validate(aiDetectionSchema), aiController.drowsiness);
router.post('/lane', aiController.lane);
router.post('/driving-behaviour', validate(aiBehaviourSchema), aiController.drivingBehaviour);

module.exports = router;
