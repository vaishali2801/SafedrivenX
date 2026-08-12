const { ApiError } = require('../utils/response');

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const details = error.details.reduce((acc, d) => {
        const key = d.path.join('.');
        acc[key] = d.message.replace(/"/g, '');
        return acc;
      }, {});
      return next(new ApiError('Validation failed', 422, details));
    }

    req[source] = value;
    next();
  };
};

module.exports = { validate };
