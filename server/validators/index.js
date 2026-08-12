const Joi = require('joi');

const startSessionSchema = Joi.object({
  vehicleId: Joi.string().optional().allow('', null),
  speedLimit: Joi.number().min(20).max(120).optional(),
  startLocation: Joi.object({
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180),
    address: Joi.string().allow('').optional(),
  }).optional(),
});

const endSessionSchema = Joi.object({
  endLocation: Joi.object({
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180),
    address: Joi.string().allow('').optional(),
  }).optional(),
});

const aiDetectionSchema = Joi.object({
  detected: Joi.boolean().required(),
  confidence: Joi.number().min(0).max(1).default(1),
  level: Joi.string().optional().allow(''),
});

const aiBehaviourSchema = Joi.object({
  behaviour: Joi.string().required(),
  detected: Joi.boolean().default(false),
  confidence: Joi.number().min(0).max(1).default(1),
  speed: Joi.number().min(0).optional(),
  harshBraking: Joi.boolean().default(false),
  rashDriving: Joi.boolean().default(false),
});

const sensorDataSchema = Joi.object({
  deviceId: Joi.string().required(),
  sensorType: Joi.string().required(),
  value: Joi.object().required(),
  batteryLevel: Joi.number().min(0).max(100).optional(),
  metadata: Joi.object().optional(),
});

const sensorStatusSchema = Joi.object({
  status: Joi.string().valid('ONLINE', 'OFFLINE', 'WARNING', 'ERROR').required(),
});

const sosSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).optional().allow(null),
  longitude: Joi.number().min(-180).max(180).optional().allow(null),
  triggerType: Joi.string()
    .valid('MANUAL_SOS', 'CRASH_DETECTED', 'HARSH_IMPACT', 'DROWSINESS_CRITICAL')
    .default('MANUAL_SOS'),
  contact: Joi.object({
    name: Joi.string().allow('').optional(),
    mobile: Joi.string().allow('').optional(),
  }).optional(),
});

const simulationViolationSchema = Joi.object({
  type: Joi.string()
    .valid(
      'NO_HELMET',
      'NO_SEATBELT',
      'PHONE_USAGE',
      'OVERSPEED',
      'WRONG_SIDE',
      'SIGNAL_JUMP',
      'RASH_DRIVING',
      'DRINK_DRIVING',
      'DROWSINESS'
    )
    .default('PHONE_USAGE'),
});

const profileSchema = Joi.object({
  name: Joi.string().min(2).max(80).optional(),
  mobile: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .message('Mobile must be a valid 10-digit Indian number')
    .optional(),
  licenseNumber: Joi.string().allow('').optional(),
  profileImage: Joi.string().allow('').uri().optional(),
  emergencyContact: Joi.object({
    name: Joi.string().allow('').optional(),
    mobile: Joi.string().allow('').optional(),
  }).optional(),
});

const passwordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).max(128).required(),
});

const vehicleSchema = Joi.object({
  vehicleNumber: Joi.string()
    .required()
    .pattern(/^[A-Za-z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Za-z]{0,2}[-\s]?[0-9]{4}$/)
    .message('Vehicle number must be a valid format, e.g. GJ04AB1234'),
  vehicleType: Joi.string().valid('MOTORCYCLE', 'CAR', 'COMMERCIAL').default('MOTORCYCLE'),
  brand: Joi.string().allow('').optional(),
  model: Joi.string().allow('').optional(),
  year: Joi.number().integer().min(1990).max(2030).optional().allow(null),
});

const rewardSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  description: Joi.string().allow('').optional(),
  pointsRequired: Joi.number().min(1),
  category: Joi.string()
    .valid('COUPON', 'CASHBACK', 'VOUCHER', 'SERVICE', 'INSURANCE', 'GIFT')
    .default('COUPON'),
  image: Joi.string().allow('').optional(),
  stock: Joi.number().integer().min(0),
  isActive: Joi.boolean(),
});

module.exports = {
  startSessionSchema,
  endSessionSchema,
  aiDetectionSchema,
  aiBehaviourSchema,
  sensorDataSchema,
  sensorStatusSchema,
  sosSchema,
  simulationViolationSchema,
  profileSchema,
  passwordSchema,
  vehicleSchema,
  rewardSchema,
};
