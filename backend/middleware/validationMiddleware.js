const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Middleware to handle validation errors from express-validator.
 * If validation errors exist, sends a 400 response with the errors.
 * Otherwise, passes control to the next middleware.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Log validation errors for debugging purposes
    logger.warn(`Validation errors for ${req.method} ${req.originalUrl}: %o`, errors.array());
    return res.status(400).json({
      message: 'Validierungsfehler. Bitte überprüfen Sie Ihre Eingaben.',
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  handleValidationErrors,
};
