const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const userController = require('../controllers/userController');
const { profileSchema, passwordSchema, vehicleSchema } = require('../validators');

router.use(protect);

router.get('/profile', userController.getProfile);
router.patch('/profile', validate(profileSchema), userController.updateProfile);
router.patch('/password', validate(passwordSchema), userController.updatePassword);
router.get('/stats', userController.getStats);
router.get('/vehicles', userController.getMyVehicles);
router.post('/vehicles', validate(vehicleSchema), userController.addVehicle);

module.exports = router;
