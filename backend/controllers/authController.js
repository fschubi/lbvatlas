const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/jwt');
const logger = require('../utils/logger');
const {
  getUserByEmail,
  getUserByUsername,
  updateLastLogin
} = require('../models/userModel');

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

    // Token generieren
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Benutzerinformationen für die Antwort vorbereiten (ohne sensible Daten)
    const userResponse = {
      id: user.id,
      username: user.username,
      name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username,
      email: user.email,
      role: user.role
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
  try {
    // Der Benutzer wurde bereits durch den authMiddleware validiert
    // und an req.user angehängt
    if (!req.user) {
      return res.status(401).json({ message: "Nicht authentifiziert" });
    }

    // Benutzerinformationen zurückgeben
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        name: req.user.first_name && req.user.last_name
          ? `${req.user.first_name} ${req.user.last_name}`
          : req.user.username,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (err) {
    logger.error("Token-Validierungsfehler:", err);
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
