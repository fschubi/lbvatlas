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
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    logger.warn('Auth Middleware: Kein Token bereitgestellt.');
    return res.status(401).json({ success: false, message: 'Zugriff verweigert. Kein Token bereitgestellt.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    if (!userId) {
      logger.error('Auth Middleware: Ungültiger Token-Payload (fehlende ID).');
      return res.status(403).json({ success: false, message: 'Zugriff verweigert. Ungültiger Token.' });
    }

    // Benutzerdaten laden
    const userQuery = 'SELECT id, username, active FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      logger.warn(`Auth Middleware: Benutzer mit ID ${userId} aus Token nicht gefunden.`);
      return res.status(401).json({ success: false, message: 'Authentifizierung fehlgeschlagen. Benutzer nicht gefunden.' });
    }

    const user = userResult.rows[0];

    if (!user.active) {
        logger.warn(`Auth Middleware: Benutzer ${userId} ist inaktiv.`);
        return res.status(403).json({ success: false, message: 'Zugriff verweigert. Benutzerkonto ist deaktiviert.' });
    }

    // Rollen und Berechtigungen des Benutzers laden
    const permissionsQuery = `
        SELECT DISTINCT p.name
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1
    `;
    // Rollen laden (optional, wenn nur Berechtigungen gebraucht werden, aber oft nützlich)
    const roleQuery = `
        SELECT r.name
        FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1
    `;

    const [permissionsResult, roleResult] = await Promise.all([
        db.query(permissionsQuery, [userId]),
        db.query(roleQuery, [userId])
    ]);

    const permissions = permissionsResult.rows.map(row => row.name);
    const roles = roleResult.rows.map(row => row.name);

    // Benutzerinformationen an das Request-Objekt anhängen
    req.user = {
      id: user.id,
      username: user.username,
      roles: roles, // Array von Rollennamen
      permissions: permissions // Array von Berechtigungsnamen
    };

    logger.debug(`Auth Middleware: Benutzer ${user.id} authentifiziert. Rollen: [${roles.join(', ')}], Berechtigungen: [${permissions.join(', ')}]`);

    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('Auth Middleware: Token abgelaufen.');
      return res.status(401).json({ success: false, message: 'Authentifizierung fehlgeschlagen. Token abgelaufen.' });
    }
    if (error.name === 'JsonWebTokenError') {
      logger.error('Auth Middleware: Ungültiger Token.', { error: error.message });
      return res.status(403).json({ success: false, message: 'Zugriff verweigert. Ungültiger Token.' });
    }
    logger.error('Auth Middleware: Interner Fehler bei der Token-Verifizierung:', error);
    next(error);
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

/**
 * Middleware zur Überprüfung spezifischer Berechtigungen.
 * Akzeptiert eine einzelne Berechtigung oder ein Array von Berechtigungen.
 * Der Benutzer muss ALLE angegebenen Berechtigungen besitzen.
 *
 * @param {string|string[]} requiredPermissions - Die erforderliche(n) Berechtigung(en).
 * @returns {Function} Express Middleware-Funktion.
 */
const hasPermission = (requiredPermissions) => {
  // Sicherstellen, dass requiredPermissions immer ein Array ist
  const permissionsToCheck = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  // Die eigentliche Middleware-Funktion zurückgeben
  return async (req, res, next) => {
    // Prüfen, ob Benutzer und Berechtigungen im Request-Objekt vorhanden sind
    if (!req.user || !req.user.permissions) {
      logger.warn(`Zugriff verweigert (hasPermission): Benutzer nicht authentifiziert oder Berechtigungen nicht geladen für Route ${req.originalUrl}.`);
      return res.status(401).json({
        success: false,
        message: 'Nicht authentifiziert oder Berechtigungen konnten nicht geladen werden.'
      });
    }

    // Prüfen, ob der Benutzer ALLE erforderlichen Berechtigungen hat
    const hasAllPermissions = permissionsToCheck.every(permission =>
      req.user.permissions.includes(permission)
    );

    if (hasAllPermissions) {
      // Benutzer hat alle erforderlichen Berechtigungen
      logger.debug(`Zugriff erlaubt (hasPermission): Benutzer ${req.user.id} hat erforderliche Berechtigungen [${permissionsToCheck.join(', ')}] für ${req.originalUrl}.`);
      next();
    } else {
      // Mindestens eine Berechtigung fehlt
      const missingPermissions = permissionsToCheck.filter(p => !req.user.permissions.includes(p));
      logger.warn(`Zugriff verweigert (hasPermission): Benutzer ${req.user.id} fehlen Berechtigungen [${missingPermissions.join(', ')}] für ${req.originalUrl}.`);
      return res.status(403).json({
        success: false,
        message: `Zugriff verweigert: Erforderliche Berechtigung(en) [${missingPermissions.join(', ')}] nicht vorhanden.`
      });
    }
  };
};

module.exports = {
  authenticateToken,
  isAdmin,
  isManager,
  hasPermission
};
