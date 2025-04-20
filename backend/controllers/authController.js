const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/jwt');
const logger = require('../utils/logger');
const {
  getUserByEmail,
  getUserByUsername,
  updateLastLogin
} = require('../models/userModel');
const db = require('../db'); // Importiere die DB-Verbindung

/**
 * Login-Controller
 * @param {Request} req - Express Request-Objekt
 * @param {Response} res - Express Response-Objekt
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Benutzer anhand der E-Mail oder des Benutzernamens suchen
    let user;
    if (email.includes('@')) {
      user = await getUserByEmail(email);
    } else {
      user = await getUserByUsername(email); // Email-Feld wird auch für Benutzernamen verwendet
    }

    if (!user) {
      return res.status(401).json({ message: "Benutzer nicht gefunden" });
    }

    // Passwort vergleichen
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Passwort ist falsch" });
    }

    // Letzten Login aktualisieren
    await updateLastLogin(user.id);

    // Token generieren (nur Kerninfos ins Token!)
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role // Rollenname hier wichtig für spätere Abfragen
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Benutzerinformationen für die Antwort vorbereiten (inkl. permissions)
    const userResponse = {
      id: user.id,
      username: user.username,
      name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [] // Permissions aus userModel hinzufügen
    };

    res.json({
      message: "Login erfolgreich",
      token,
      user: userResponse
    });
  } catch (err) {
    logger.error("Login-Fehler:", err);
    res.status(500).json({ message: "Serverfehler beim Login" });
  }
};

/**
 * Token-Validierungs-Controller
 * @param {Request} req - Express Request-Objekt
 * @param {Response} res - Express Response-Objekt
 */
exports.validate = async (req, res) => {
  // Original-Code wiederhergestellt
  try {
    // Der Benutzer wurde bereits durch den authMiddleware validiert
    // und an req.user angehängt (enthält id, username, email, role aus dem Token)
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Nicht authentifiziert oder ungültige Benutzerdaten im Token" });
    }

    const userId = req.user.id;
    const userRoleName = req.user.role; // Annahme: Rolle ist als Name im Token

    // Hole die Berechtigungen für die Rolle des Benutzers
    let permissions = [];
    // Log mit INFO für Sichtbarkeit beibehalten
    logger.info(`[AuthValidate] Versuche Berechtigungen für Rolle '${userRoleName}' zu laden...`);
    try {
      // WICHTIG: Hole die role_id basierend auf dem Rollennamen
      const roleResult = await db.query('SELECT id FROM roles WHERE name = $1', [userRoleName]);
      if (roleResult.rows.length === 0) {
          logger.warn(`Rolle '${userRoleName}' für Benutzer ${userId} nicht in der DB gefunden.`);
          // Keine Rolle -> Keine Berechtigungen
      } else {
          const roleId = roleResult.rows[0].id;
          const permissionsQuery = `
            SELECT p.name
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = $1
          `;
          const permissionsResult = await db.query(permissionsQuery, [roleId]);
          permissions = permissionsResult.rows.map(row => row.name);
          // Log mit INFO für Sichtbarkeit beibehalten
          logger.info(`Berechtigungen für Benutzer ${userId} (Rolle: ${userRoleName}, ID: ${roleId}): ${permissions.join(', ')}`);
      }
    } catch (dbError) {
      logger.error(`Fehler beim Abrufen der Berechtigungen für Benutzer ${userId} (Rolle: ${userRoleName}):`, dbError);
      permissions = []; // Im Fehlerfall leere Berechtigungen
    }

    // Benutzerinformationen für die Antwort zusammenstellen
    const userResponse = {
      id: req.user.id,
      username: req.user.username,
      // Token enthält normalerweise nicht first/last name, daher username als Fallback
      name: req.user.name || req.user.username,
      email: req.user.email,
      role: userRoleName,
      permissions: permissions // Füge das Berechtigungs-Array hinzu
    };

    res.json({
      message: "Token validiert",
      user: userResponse
    });

  } catch (err) {
    // Allgemeiner Fehler in der Validierungslogik
    logger.error("Token-Validierungsfehler (Controller):", err);
    res.status(500).json({ message: "Serverfehler bei der Token-Validierung" });
  }
};

/**
 * Logout-Controller
 * @param {Request} req - Express Request-Objekt
 * @param {Response} res - Express Response-Objekt
 */
exports.logout = async (req, res) => {
  try {
    // Der Logout erfolgt clientseitig durch Entfernen des Tokens
    // Hier könnten in Zukunft Blacklisting von Tokens oder andere Logout-Logik implementiert werden

    res.json({ message: "Logout erfolgreich" });
  } catch (err) {
    logger.error("Logout-Fehler:", err);
    res.status(500).json({ message: "Serverfehler beim Logout" });
  }
};
