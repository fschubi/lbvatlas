/**
 * Mock-Authentifizierungsmiddleware
 *
 * Simuliert die Authentifizierung und Autorisierung für das Ticket-System
 * in der Development-Umgebung
 */

const jwt = require('jsonwebtoken');
const db = require('../db');
const logger = require('../utils/logger');

// Simulierter Benutzer für Entwicklungszwecke
const mockUser = {
  id: 1,
  username: 'admin',
  name: 'Administrator',
  email: 'admin@example.com',
  role: 'admin',
  permissions: ['read', 'write', 'delete', 'admin']
};

/**
 * Middleware zur Authentifizierung von Benutzern mittels JWT
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 * @param {Function} next - Express Next-Funktion
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    logger.warn('Auth Middleware: Kein Token bereitgestellt.');
    return res.status(401).json({ success: false, message: 'Zugriff verweigert. Kein Token bereitgestellt.' });
  }

  try {
    // Token verifizieren
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id; // Annahme: User ID ist im Token Payload als 'id'

    if (!userId) {
      logger.error('Auth Middleware: Ungültiger Token-Payload (fehlende ID).');
      return res.status(403).json({ success: false, message: 'Zugriff verweigert. Ungültiger Token.' });
    }

    // Benutzerdaten und Rollen aus der Datenbank laden
    const userQuery = 'SELECT id, username, active FROM users WHERE id = $1';
    const roleQuery = `
      SELECT r.name
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `;

    const userResult = await db.query(userQuery, [userId]);
    const roleResult = await db.query(roleQuery, [userId]);

    if (userResult.rows.length === 0) {
      logger.warn(`Auth Middleware: Benutzer mit ID ${userId} aus Token nicht gefunden.`);
      return res.status(401).json({ success: false, message: 'Authentifizierung fehlgeschlagen. Benutzer nicht gefunden.' });
    }

    const user = userResult.rows[0];

    // Prüfen, ob Benutzer aktiv ist
    if (!user.active) {
        logger.warn(`Auth Middleware: Benutzer ${userId} ist inaktiv.`);
        return res.status(403).json({ success: false, message: 'Zugriff verweigert. Benutzerkonto ist deaktiviert.' });
    }

    // Rollen extrahieren
    const roles = roleResult.rows.map(row => row.name);

    // Benutzerinformationen (inkl. Rollen) an das Request-Objekt anhängen
    req.user = {
      id: user.id,
      username: user.username,
      roles: roles // Array von Rollennamen
    };

    next(); // Authentifizierung erfolgreich

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('Auth Middleware: Token abgelaufen.');
      return res.status(401).json({ success: false, message: 'Authentifizierung fehlgeschlagen. Token abgelaufen.' });
    }
    if (error.name === 'JsonWebTokenError') {
      logger.error('Auth Middleware: Ungültiger Token.', { error: error.message });
      return res.status(403).json({ success: false, message: 'Zugriff verweigert. Ungültiger Token.' });
    }
    // Andere Fehler
    logger.error('Auth Middleware: Interner Fehler bei der Token-Verifizierung:', error);
    next(error); // An zentrale Fehlerbehandlung weiterleiten
  }
};

/**
 * Middleware zur Überprüfung der Admin-Rolle
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 * @param {Function} next - Express Next-Funktion
 */
const isAdmin = async (req, res, next) => {
  // Diese Funktion prüft jetzt gegen req.user.roles
  if (!req.user || !req.user.roles || !req.user.roles.includes('admin')) {
      logger.warn(`Zugriff verweigert (isAdmin): Benutzer ${req.user?.id} ist kein Administrator.`);
      return res.status(403).json({
        success: false,
        message: 'Zugriff verweigert: Administratorberechtigung erforderlich'
      });
  }
  next();
};

/**
 * Middleware zur Überprüfung der Manager-Rolle
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 * @param {Function} next - Express Next-Funktion
 */
const isManager = async (req, res, next) => {
   // Diese Funktion prüft jetzt gegen req.user.roles
   if (!req.user || !req.user.roles || (!req.user.roles.includes('admin') && !req.user.roles.includes('manager'))) {
      logger.warn(`Zugriff verweigert (isManager): Benutzer ${req.user?.id} ist kein Manager oder Admin.`);
      return res.status(403).json({
        success: false,
        message: 'Zugriff verweigert: Manager- oder Adminberechtigung erforderlich'
      });
  }
  next();
};

module.exports = {
  authenticateToken,
  isAdmin,
  isManager
};
