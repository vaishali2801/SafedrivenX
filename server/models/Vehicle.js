const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vehicleNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    vehicleType: {
      type: String,
      enum: ['MOTORCYCLE', 'CAR', 'COMMERCIAL'],
      default: 'MOTORCYCLE',
    },
    brand: { type: String, default: '' },
    model: { type: String, default: '' },
    year: { type: Number, default: null },
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', default: null },
    image: { type: String, default: '' },
  },
  { timestamps: true }
);

vehicleSchema.index({ userId: 1, vehicleNumber: 1 });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
module.exports = Vehicle;
