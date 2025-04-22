const db = require('../db');
const logger = require('../utils/logger');
const roleModel = require('../models/roleModel');
const userModel = require('../models/userModel');

/**
 * Middleware zur Überprüfung der Benutzerberechtigungen
 * @param {string} requiredPermission - Erforderliche Berechtigung
 * @returns {Function} Express Middleware-Funktion
 */
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // Benutzer-ID aus dem Authentifizierungstoken
      const userId = req.user.id;

      // Benutzerberechtigungen abrufen
      const query = `
        SELECT * FROM get_user_permissions($1)
        WHERE permission_name = $2
      `;

      const { rows } = await db.query(query, [userId, requiredPermission]);

      // Prüfen, ob Benutzer die erforderliche Berechtigung hat
      if (rows.length === 0) {
        logger.warn(`Zugriff verweigert: Benutzer ${userId} hat keine Berechtigung für ${requiredPermission}`);
        return res.status(403).json({
          success: false,
          message: 'Keine Berechtigung für diese Aktion'
        });
      }

      // Berechtigung vorhanden, Request fortsetzen
      next();
    } catch (error) {
      logger.error(`Fehler bei der Berechtigungsprüfung für ${requiredPermission}:`, error);
      res.status(500).json({
        success: false,
        message: 'Fehler bei der Berechtigungsprüfung',
        error: error.message
      });
    }
  };
};

/**
 * Middleware zur Überprüfung mehrerer Benutzerberechtigungen (ODER-Verknüpfung)
 * @param {Array<string>} requiredPermissions - Array von erforderlichen Berechtigungen
 * @returns {Function} Express Middleware-Funktion
 */
const checkAnyPermission = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      // Benutzer-ID aus dem Authentifizierungstoken
      const userId = req.user.id;

      // Benutzerberechtigungen abrufen
      const query = `
        SELECT * FROM get_user_permissions($1)
        WHERE permission_name = ANY($2)
      `;

      const { rows } = await db.query(query, [userId, requiredPermissions]);

      // Prüfen, ob Benutzer mindestens eine der erforderlichen Berechtigungen hat
      if (rows.length === 0) {
        logger.warn(`Zugriff verweigert: Benutzer ${userId} hat keine der erforderlichen Berechtigungen: ${requiredPermissions.join(', ')}`);
        return res.status(403).json({
          success: false,
          message: 'Keine Berechtigung für diese Aktion'
        });
      }

      // Mindestens eine Berechtigung vorhanden, Request fortsetzen
      next();
    } catch (error) {
      logger.error(`Fehler bei der Berechtigungsprüfung für ${requiredPermissions.join(', ')}:`, error);
      res.status(500).json({
        success: false,
        message: 'Fehler bei der Berechtigungsprüfung',
        error: error.message
      });
    }
  };
};

/**
 * Middleware zur Überprüfung mehrerer Benutzerberechtigungen (UND-Verknüpfung)
 * @param {Array<string>} requiredPermissions - Array von erforderlichen Berechtigungen
 * @returns {Function} Express Middleware-Funktion
 */
const checkAllPermissions = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      // Benutzer-ID aus dem Authentifizierungstoken
      const userId = req.user.id;

      // Benutzerberechtigungen abrufen
      const query = `
        SELECT * FROM get_user_permissions($1)
        WHERE permission_name = ANY($2)
      `;

      const { rows } = await db.query(query, [userId, requiredPermissions]);

      // Prüfen, ob Benutzer alle erforderlichen Berechtigungen hat
      if (rows.length < requiredPermissions.length) {
        const missingPermissions = requiredPermissions.filter(
          permission => !rows.some(row => row.permission_name === permission)
        );

        logger.warn(`Zugriff verweigert: Benutzer ${userId} fehlen Berechtigungen: ${missingPermissions.join(', ')}`);
        return res.status(403).json({
          success: false,
          message: 'Fehlende Berechtigungen für diese Aktion',
          missingPermissions
        });
      }

      // Alle Berechtigungen vorhanden, Request fortsetzen
      next();
    } catch (error) {
      logger.error(`Fehler bei der Berechtigungsprüfung für ${requiredPermissions.join(', ')}:`, error);
      res.status(500).json({
        success: false,
        message: 'Fehler bei der Berechtigungsprüfung',
        error: error.message
      });
    }
  };
};

/**
 * Middleware zur Überprüfung der Gruppenmitgliedschaft
 * @param {string} groupName - Name der erforderlichen Gruppe
 * @returns {Function} Express Middleware-Funktion
 */
const checkGroupMembership = (groupName) => {
  return async (req, res, next) => {
    try {
      // Benutzer-ID aus dem Authentifizierungstoken
      const userId = req.user.id;

      // Benutzergruppen abrufen
      const query = `
        SELECT * FROM get_user_groups($1)
        WHERE name = $2
      `;

      const { rows } = await db.query(query, [userId, groupName]);

      // Prüfen, ob Benutzer Mitglied der erforderlichen Gruppe ist
      if (rows.length === 0) {
        logger.warn(`Zugriff verweigert: Benutzer ${userId} ist kein Mitglied der Gruppe ${groupName}`);
        return res.status(403).json({
          success: false,
          message: `Keine Mitgliedschaft in der erforderlichen Gruppe: ${groupName}`
        });
      }

      // Gruppenmitgliedschaft vorhanden, Request fortsetzen
      next();
    } catch (error) {
      logger.error(`Fehler bei der Gruppenmitgliedschaftsprüfung für ${groupName}:`, error);
      res.status(500).json({
        success: false,
        message: 'Fehler bei der Gruppenmitgliedschaftsprüfung',
        error: error.message
      });
    }
  };
};

/**
 * Middleware Factory zur Überprüfung von Benutzerberechtigungen.
 * Akzeptiert eine oder mehrere erforderliche Berechtigungen.
 * Wenn mehrere Berechtigungen übergeben werden, muss der Benutzer ALLE davon besitzen (AND-Logik).
 *
 * @param {...string} requiredPermissions - Die erforderliche(n) Berechtigung(en) (z.B. 'roles.create', 'devices.read').
 * @returns {Function} - Die Express-Middleware-Funktion.
 */
const authorize = (...requiredPermissions) => {
  return async (req, res, next) => {
    // Stelle sicher, dass der Benutzer authentifiziert ist (sollte durch authMiddleware geschehen sein)
    if (!req.user || !req.user.id) {
      logger.warn('Authorization Middleware: Kein Benutzer im Request gefunden. AuthMiddleware korrekt ausgeführt?');
      return res.status(401).json({ success: false, message: 'Nicht authentifiziert.' });
    }

    const userId = req.user.id;

    try {
      // 1. Hole die Rollen des Benutzers
      const userRoles = await userModel.getUserRoles(userId);
      if (!userRoles || userRoles.length === 0) {
        logger.warn(`Authorization Middleware: Benutzer ${userId} hat keine Rollen zugewiesen.`);
        return res.status(403).json({ success: false, message: 'Zugriff verweigert. Keine Rollen zugewiesen.' });
      }

      // 2. Hole die Berechtigungen für jede Rolle und sammle sie
      let allPermissionObjects = [];
      for (const role of userRoles) {
        const permissionsForRole = await roleModel.getPermissionsForRole(role.id);
        allPermissionObjects = allPermissionObjects.concat(permissionsForRole);
      }

      // 3. Extrahiere eindeutige Berechtigungsnamen (Strings)
      const userPermissionNamesSet = new Set(allPermissionObjects.map(p => p.name).filter(Boolean));
      const userPermissionNames = Array.from(userPermissionNamesSet);

      // 4. Prüfe, ob ALLE erforderlichen Berechtigungen vorhanden sind
      const hasAllPermissions = requiredPermissions.every(requiredPerm =>
        userPermissionNames.includes(requiredPerm)
      );

      if (hasAllPermissions) {
        next();
      } else {
        const missingPermissions = requiredPermissions.filter(rp => !userPermissionNames.includes(rp));
        logger.warn(`Authorization Middleware: Benutzer ${userId} hat KEINEN Zugriff. Fehlende Berechtigungen: ${missingPermissions.join(', ')}`);
        return res.status(403).json({ success: false, message: 'Zugriff verweigert. Fehlende Berechtigungen.' });
      }
    } catch (error) {
      logger.error(`Authorization Middleware: Fehler beim Prüfen der Berechtigungen für User ${userId}:`, error);
      res.status(500).json({ success: false, message: 'Interner Fehler bei der Berechtigungsprüfung.' });
    }
  };
};

module.exports = {
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  checkGroupMembership,
  authorize
};
