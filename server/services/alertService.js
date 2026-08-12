const Alert = require('../models/Alert');
const { emitToUser } = require('../config/socket');

const ALERT_MESSAGES = {
  SPEED_WARNING: 'You are approaching the speed limit',
  OVERSPEED: 'Over speed detected, slow down immediately',
  PHONE_DETECTED: 'Phone usage detected while driving',
  NO_HELMET: 'Helmet not detected',
  NO_SEATBELT: 'Seat belt not detected',
  HARSH_BRAKING: 'Harsh braking detected',
  DROWSINESS: 'Drowsiness detected, please take a break',
  RASH_DRIVING: 'Rash driving behaviour detected',
  WRONG_SIDE: 'Driving on the wrong side',
  SIGNAL_JUMP: 'Traffic signal jump detected',
  ALCOHOL_DETECTED: 'Alcohol detected, do not drive',
  EMERGENCY: 'Emergency triggered - SOS initiated',
};

const DEFAULT_SEVERITY = {
  PHONE_DETECTED: 'CRITICAL',
  NO_HELMET: 'CRITICAL',
  NO_SEATBELT: 'CRITICAL',
  ALCOHOL_DETECTED: 'CRITICAL',
  WRONG_SIDE: 'CRITICAL',
  SIGNAL_JUMP: 'CRITICAL',
  RASH_DRIVING: 'CRITICAL',
  OVERSPEED: 'WARNING',
  DROWSINESS: 'WARNING',
  SPEED_WARNING: 'WARNING',
  HARSH_BRAKING: 'WARNING',
  EMERGENCY: 'CRITICAL',
};

const createAlert = async ({
  userId,
  drivingSessionId = null,
  type,
  message,
  severity = null,
  metadata = {},
}) => {
  const alert = await Alert.create({
    userId,
    drivingSessionId,
    type,
    severity: severity || DEFAULT_SEVERITY[type] || 'INFO',
    message: message || ALERT_MESSAGES[type] || 'Safety alert',
    metadata,
  });

  emitToUser(userId, 'alert:new', {
    id: alert._id,
    type: alert.type,
    severity: alert.severity,
    message: alert.message,
    metadata: alert.metadata,
    createdAt: alert.createdAt,
  });

  return alert;
};

const markAlertRead = async (userId, alertId) => {
  const alert = await Alert.findOneAndUpdate(
    { _id: alertId, userId },
    { isRead: true },
    { new: true }
  );
  return alert;
};

const markAllRead = async (userId) => {
  const result = await Alert.updateMany({ userId, isRead: false }, { isRead: true });
  return result.modifiedCount;
};

const getRecentAlerts = (userId, limit = 10) =>
  Alert.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();

module.exports = {
  createAlert,
  markAlertRead,
  markAllRead,
  getRecentAlerts,
  ALERT_MESSAGES,
  DEFAULT_SEVERITY,
};
