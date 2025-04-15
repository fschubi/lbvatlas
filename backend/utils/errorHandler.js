const logger = require('./logger');

/**
 * Zentrale Fehlerbehandlung für die Anwendung
 * @param {Error} error - Der aufgetretene Fehler
 * @param {Response} [res] - Optional: Express Response Objekt
 * @returns {Error} - Behandelter Fehler
 */
const handleError = (error, res = null) => {
  // Logge den Fehler
  logger.error('Fehler aufgetreten:', error);

  // Wenn ein Response-Objekt vorhanden ist, sende eine Fehlerantwort
  if (res) {
    const statusCode = error.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
      ? 'Ein Serverfehler ist aufgetreten'
      : error.message;

    res.status(statusCode).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }

  // Spezielle Fehlertypen behandeln
  if (error.code === '23505') { // Unique Violation
    return {
      statusCode: 409,
      message: 'Dieser Eintrag existiert bereits'
    };
  }

  if (error.code === '23503') { // Foreign Key Violation
    return {
      statusCode: 409,
      message: 'Der referenzierte Eintrag existiert nicht'
    };
  }

  if (error.code === '42P01') { // Undefined Table
    return {
      statusCode: 500,
      message: 'Datenbankfehler: Tabelle nicht gefunden'
    };
  }

  // Standardfehler zurückgeben
  return {
    statusCode: error.statusCode || 500,
    message: error.message || 'Ein unerwarteter Fehler ist aufgetreten'
  };
};

module.exports = {
  handleError
};
