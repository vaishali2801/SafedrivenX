const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const simulationController = require('../controllers/simulationController');
const { simulationViolationSchema, sosSchema } = require('../validators');

router.use(protect);

router.post('/start', simulationController.start);
router.post('/stop', simulationController.stop);
router.post('/safe', simulationController.safe);
router.post('/warning', simulationController.warning);
router.post('/violation', validate(simulationViolationSchema), simulationController.violation);
router.post('/emergency', validate(sosSchema), simulationController.emergency);

module.exports = router;
