const success = (res, message, data, statusCode = 200, meta) => {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
};

const error = (res, message, error = {}, statusCode = 500) =>
  res.status(statusCode).json({ success: false, message, error });

class ApiError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

module.exports = { success, error, ApiError };
