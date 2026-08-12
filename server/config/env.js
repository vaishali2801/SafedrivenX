const dotenv = require('dotenv');

dotenv.config();

const required = ['MONGO_URI', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.warn(
    `[env] Missing environment variables: ${missing.join(', ')}. ` +
      'Copy .env.example to .env and fill the values.'
  );
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/safedrivex',
  JWT_SECRET:
    process.env.JWT_SECRET || 'safedrivex_dev_secret_do_not_use_in_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  DEFAULT_EMERGENCY_CONTACT: process.env.DEFAULT_EMERGENCY_CONTACT || '+91-9876543210',
  isProduction: process.env.NODE_ENV === 'production',
};

module.exports = env;
