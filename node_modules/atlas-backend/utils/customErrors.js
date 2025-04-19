/**
 * Definition von benutzerdefinierten Fehlerklassen für spezifische HTTP-Statuscodes.
 */

// Basisklasse für Anwendungsfehler
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Fehler, die vorhersehbar sind (vs. Programmierfehler)

    Error.captureStackTrace(this, this.constructor);
  }
}

// Fehler für nicht gefundene Ressourcen (404)
class NotFoundError extends AppError {
  constructor(message = 'Ressource nicht gefunden') {
    super(message, 404);
  }
}

// Fehler für Datenbankoperationen (oft 500, kann aber angepasst werden)
class DatabaseError extends AppError {
  constructor(message = 'Datenbankfehler', originalError = null) {
    super(message, 500);
    this.originalError = originalError; // Optional die ursprüngliche DB-Fehlermeldung speichern
  }
}

// Fehler für Validierungsprobleme (400)
class ValidationError extends AppError {
  constructor(message = 'Ungültige Eingabedaten', errors = null) {
    super(message, 400);
    this.errors = errors; // Optional ein Objekt/Array mit Detailfehlern speichern
  }
}

// Fehler für Konflikte (z.B. unique constraint) (409)
class ConflictError extends AppError {
  constructor(message = 'Konflikt: Ressource existiert bereits oder kann nicht erstellt werden') {
    super(message, 409);
  }
}

// Fehler für nicht autorisierte Zugriffe (401)
class UnauthorizedError extends AppError {
  constructor(message = 'Nicht authentifiziert') {
    super(message, 401);
  }
}

// Fehler für verbotene Zugriffe (403)
class ForbiddenError extends AppError {
  constructor(message = 'Zugriff verweigert') {
    super(message, 403);
  }
}

module.exports = {
  AppError,
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError
};
