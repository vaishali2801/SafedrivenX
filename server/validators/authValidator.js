const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().required().min(2).max(80),
  email: Joi.string().email().required(),
  mobile: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .message('Mobile must be a valid 10-digit Indian number')
    .required(),
  password: Joi.string().min(6).max(128).required(),
  licenseNumber: Joi.string().optional().allow(''),
  vehicleNumber: Joi.string()
    .required()
    .pattern(/^[A-Za-z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Za-z]{0,2}[-\s]?[0-9]{4}$/)
    .message('Vehicle number must be a valid format, e.g. GJ04AB1234'),
  vehicleType: Joi.string().valid('MOTORCYCLE', 'CAR', 'COMMERCIAL').default('MOTORCYCLE'),
  brand: Joi.string().optional().allow(''),
  model: Joi.string().optional().allow(''),
  year: Joi.number().integer().min(1990).max(2030).optional().allow(null),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

module.exports = { registerSchema, loginSchema };
