const { success, ApiError } = require('../utils/response');
const sensorService = require('../services/sensorService');
const Device = require('../models/Device');

const postData = async (req, res, next) => {
  try {
    const { deviceId, sensorType, value, batteryLevel, metadata = {} } = req.body;
    const sensor = await sensorService.ingestSensorData({
      deviceCode: deviceId,
      sensorType,
      value,
      batteryLevel,
      metadata: { ...metadata, userId: req.userId },
    });
    return success(res, 'Sensor data received', { sensor }, 201);
  } catch (err) {
    next(err);
  }
};

const getAll = async (req, res, next) => {
  try {
    const sensors = await sensorService.getSensorsForUser(req.userId);
    return success(res, 'Sensors fetched', { sensors });
  } catch (err) {
    next(err);
  }
};

const getByDevice = async (req, res, next) => {
  try {
    const device = await sensorService.getDeviceByCode(req.params.deviceId);
    if (!device) return next(new ApiError('Device not found', 404));
    const sensors = await sensorService.getDeviceSensors(req.params.deviceId);
    return success(res, 'Device sensors fetched', { device, sensors });
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const sensor = await sensorService.updateSensorStatus(
      req.params.deviceId,
      req.params.sensorType,
      status
    );
    return success(res, 'Sensor status updated', { sensor });
  } catch (err) {
    next(err);
  }
};

const registerDevice = async (req, res, next) => {
  try {
    const { deviceId, name, type, firmwareVersion } = req.body;
    let device = await Device.findOne({ deviceId });
    if (device) return next(new ApiError('Device already registered', 409));
    device = await Device.create({
      deviceId,
      name: name || deviceId,
      type: type || 'ESP32',
      userId: req.userId,
      firmwareVersion,
    });
    return success(res, 'Device registered', { device }, 201);
  } catch (err) {
    next(err);
  }
};

module.exports = { postData, getAll, getByDevice, updateStatus, registerDevice };
