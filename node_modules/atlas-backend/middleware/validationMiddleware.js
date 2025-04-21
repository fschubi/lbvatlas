const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { param, body } = require('express-validator');

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

// Validierung für ID-Parameter in Routen
exports.validateIdParam = [
  param('id').isInt({ gt: 0 }).withMessage('ID muss eine positive Ganzzahl sein.')
];

// Validierung für Lizenztyp-Daten (POST/PUT)
exports.validateLicenseType = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name ist erforderlich.')
    .isString().withMessage('Name muss eine Zeichenkette sein.')
    .isLength({ min: 2, max: 100 }).withMessage('Name muss zwischen 2 und 100 Zeichen lang sein.'),
  body('description')
    .optional({ checkFalsy: true }) // Erlaubt leere Strings oder null/undefined
    .trim()
    .isString().withMessage('Beschreibung muss eine Zeichenkette sein.')
    .isLength({ max: 500 }).withMessage('Beschreibung darf maximal 500 Zeichen lang sein.')
];

// Korrigierter Export: Referenziert die bereits definierten exports
module.exports = {
  handleValidationErrors,
  validateIdParam: exports.validateIdParam,
  validateLicenseType: exports.validateLicenseType,
};
