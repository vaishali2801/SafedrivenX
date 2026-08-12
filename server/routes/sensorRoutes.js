const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { sensorLimiter } = require('../middleware/rateLimitMiddleware');
const sensorController = require('../controllers/sensorController');
const { sensorDataSchema, sensorStatusSchema } = require('../validators');

router.use(protect);

router.post('/data', sensorLimiter, validate(sensorDataSchema), sensorController.postData);
router.get('/', sensorController.getAll);
router.post('/register', sensorController.registerDevice);
router.get('/:deviceId', sensorController.getByDevice);
router.patch('/:deviceId/:sensorType/status', validate(sensorStatusSchema), sensorController.updateStatus);

module.exports = router;
