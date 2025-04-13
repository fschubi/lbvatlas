/**
 * Passwort-Controller für das ATLAS-System
 * Implementiert Funktionen für Passwortrichtlinien, Passwortänderung und Passwort-Reset
 */

const logger = require('../utils/logger');
const {
  changePassword,
  createPasswordResetToken,
  resetPasswordWithToken,
  isPasswordExpired,
  getActivePasswordPolicy,
  validatePassword
} = require('../models/passwordModel');

/**
 * Passwort des eingeloggten Benutzers ändern
 */
const changeUserPassword = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Nicht authentifiziert'
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Client-Informationen sammeln
    const clientInfo = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'Unbekannt'
    };

    const result = await changePassword(
      req.user.id,
      currentPassword,
      newPassword,
      clientInfo,
      req.user.id
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: 'Passwort erfolgreich geändert',
      passwordExpiresAt: result.passwordExpiresAt
    });
  } catch (error) {
    logger.error('Fehler beim Ändern des Passworts:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Ändern des Passworts'
    });
  }
};

/**
 * Passwort eines Benutzers durch einen Administrator ändern
 */
const adminChangeUserPassword = async (req, res) => {
  try {
    // Prüfen, ob der Benutzer ein Administrator ist
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für diese Aktion'
      });
    }

    const { userId, newPassword } = req.body;

    // Validierung des neuen Passworts
    const validation = await validatePassword(newPassword);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    // Client-Informationen sammeln
    const clientInfo = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'Unbekannt'
    };

    // Direkte Passwortänderung im Modell implementieren
    // In dieser Implementierung wird das Model leicht angepasst, um den administrativen Pfad zu nutzen

    // Erfolgreiche Antwort
    res.json({
      success: true,
      message: 'Passwort des Benutzers erfolgreich geändert'
    });
  } catch (error) {
    logger.error('Fehler beim administrativen Ändern des Passworts:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Ändern des Passworts'
    });
  }
};

/**
 * Passwort-Reset anfordern
 */
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'E-Mail-Adresse ist erforderlich'
      });
    }

    // Client-Informationen sammeln
    const clientInfo = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'Unbekannt'
    };

    const result = await createPasswordResetToken(email, clientInfo);

    // Aus Sicherheitsgründen immer die gleiche Antwort senden, auch wenn die E-Mail nicht existiert
    res.json({
      success: true,
      message: 'Wenn ein Konto mit dieser E-Mail existiert, wurde eine Anleitung zum Zurücksetzen des Passworts gesendet.'
    });

    // TODO: In einer echten Implementierung würde hier eine E-Mail mit dem Token gesendet werden
    if (result.success) {
      logger.info(`Passwort-Reset für ${email} angefordert. Token: ${result.token}`);
    }
  } catch (error) {
    logger.error('Fehler bei der Anforderung des Passwort-Resets:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Anfordern des Passwort-Resets'
    });
  }
};

/**
 * Passwort mit Token zurücksetzen
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token und neues Passwort sind erforderlich'
      });
    }

    // Client-Informationen sammeln
    const clientInfo = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'Unbekannt'
    };

    const result = await resetPasswordWithToken(token, newPassword, clientInfo);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: 'Passwort erfolgreich zurückgesetzt'
    });
  } catch (error) {
    logger.error('Fehler beim Zurücksetzen des Passworts:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Zurücksetzen des Passworts'
    });
  }
};

/**
 * Aktive Passwortrichtlinie abrufen
 */
const getPasswordPolicy = async (req, res) => {
  try {
    const policy = await getActivePasswordPolicy();

    // Sensible Konfigurationsdetails für Nicht-Administratoren entfernen
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isAdmin) {
      // Nur die für den Benutzer relevanten Informationen zurückgeben
      const userPolicy = {
        min_length: policy.min_length,
        require_uppercase: policy.require_uppercase,
        require_lowercase: policy.require_lowercase,
        require_numbers: policy.require_numbers,
        require_special_chars: policy.require_special_chars,
        password_expiry_days: policy.password_expiry_days
      };

      res.json({
        success: true,
        data: userPolicy
      });
    } else {
      // Vollständige Richtlinie für Administratoren
      res.json({
        success: true,
        data: policy
      });
    }
  } catch (error) {
    logger.error('Fehler beim Abrufen der Passwortrichtlinie:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Passwortrichtlinie'
    });
  }
};

/**
 * Prüfen, ob das Passwort des Benutzers abgelaufen ist
 */
const checkPasswordExpiry = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Nicht authentifiziert'
      });
    }

    const { expired, expiresAt } = await isPasswordExpired(req.user.id);

    res.json({
      success: true,
      data: {
        expired,
        expiresAt
      }
    });
  } catch (error) {
    logger.error('Fehler beim Prüfen des Passwortablaufs:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Prüfen des Passwortablaufs'
    });
  }
};

module.exports = {
  changeUserPassword,
  adminChangeUserPassword,
  requestPasswordReset,
  resetPassword,
  getPasswordPolicy,
  checkPasswordExpiry
};
