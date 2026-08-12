const Alert = require('../models/Alert');
const { success } = require('../utils/response');
const alertService = require('../services/alertService');

const getAlerts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, severity, unread } = req.query;
    const filter = { userId: req.userId };
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (unread === 'true') filter.isRead = false;

    const skip = (page - 1) * limit;
    const [alerts, total, unreadCount] = await Promise.all([
      Alert.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)).lean(),
      Alert.countDocuments(filter),
      Alert.countDocuments({ userId: req.userId, isRead: false }),
    ]);

    return success(res, 'Alerts fetched', {
      alerts,
      unreadCount,
      pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

const markRead = async (req, res, next) => {
  try {
    const alert = await alertService.markAlertRead(req.userId, req.params.id);
    if (!alert) return next(new ApiError('Alert not found', 404));
    return success(res, 'Alert marked as read', { alert });
  } catch (err) {
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    const count = await alertService.markAllRead(req.userId);
    return success(res, 'All alerts marked as read', { count });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAlerts, markRead, markAllRead };
