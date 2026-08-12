const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const emergencyController = require('../controllers/emergencyController');
const { sosSchema } = require('../validators');

router.use(protect);

router.post('/sos', validate(sosSchema), emergencyController.sos);
router.get('/history', emergencyController.history);
router.get('/:id', emergencyController.getById);
router.patch('/:id/resolve', emergencyController.resolve);

module.exports = router;
