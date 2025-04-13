/**
 * Berechtigungsmiddleware für ATLAS
 * Prüft, ob der aktuelle Benutzer die erforderlichen Rollen hat
 */

// Hilfsfunktion zur Rollenprüfung
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    // Temporär für Entwicklung: Middleware deaktivieren und immer durchlassen
    return next();

    // Sobald das Authentifizierungssystem vollständig ist, kann dieser Code aktiviert werden:
    /*
    // Überprüfen, ob der Request einen Benutzer enthält (sollte von authMiddleware gesetzt worden sein)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Nicht authentifiziert'
      });
    }

    // Prüfen, ob der Benutzer eine der erlaubten Rollen hat
    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));

    if (!hasRole && allowedRoles.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'Unzureichende Berechtigungen für diese Aktion'
      });
    }

    // Benutzer ist autorisiert
    next();
    */
  };
};

module.exports = {
  authorize
};
