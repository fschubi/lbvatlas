/**
 * Controller für Benutzerprofile im ATLAS-System
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../db');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Modelle importieren
const userProfileModel = require('../models/userProfileModel');
const userModel = require('../models/userModel');

// Upload-Konfiguration für Profilbilder
const profilePictureStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'profile_pictures');

    // Ordner erstellen, falls noch nicht vorhanden
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueFilename = `${uuidv4()}_${file.originalname.replace(/\s/g, '_')}`;
    cb(null, uniqueFilename);
  }
});

const profilePictureUpload = multer({
  storage: profilePictureStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  },
  fileFilter: function (req, file, cb) {
    // Nur Bilder akzeptieren
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }

    cb(new Error('Nur Bilddateien (jpeg, jpg, png, gif) sind erlaubt'));
  }
}).single('profile_picture');

/**
 * Benutzerprofil abrufen
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 */
const getUserProfile = async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  // Prüfen, ob der Benutzer sein eigenes Profil abruft oder Admin-Rechte hat
  if (userId !== req.user?.id && req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Zugriff verweigert: Sie können nur Ihr eigenes Profil abrufen'
    });
  }

  try {
    const userProfile = await userProfileModel.getProfileByUserId(userId);

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'Benutzerprofil nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: userProfile
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen des Benutzerprofils für User ${userId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Benutzerprofils'
    });
  }
};

/**
 * Benutzerprofil aktualisieren
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 */
const updateUserProfile = async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  // Prüfen, ob der Benutzer sein eigenes Profil aktualisiert oder Admin-Rechte hat
  if (userId !== req.user?.id && req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Zugriff verweigert: Sie können nur Ihr eigenes Profil aktualisieren'
    });
  }

  try {
    const { phone, department, position, bio } = req.body;

    // Aktualisiere das Profil
    const updatedProfile = await userProfileModel.updateProfile(userId, {
      phone,
      department,
      position,
      bio
    });

    res.json({
      success: true,
      data: updatedProfile
    });
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren des Benutzerprofils für User ${userId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Benutzerprofils'
    });
  }
};

/**
 * Profilbild hochladen
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 */
const uploadProfilePicture = (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  // Prüfen, ob der Benutzer sein eigenes Profilbild hochlädt oder Admin-Rechte hat
  if (userId !== req.user?.id && req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Zugriff verweigert: Sie können nur Ihr eigenes Profilbild hochladen'
    });
  }

  profilePictureUpload(req, res, async (err) => {
    if (err) {
      logger.error(`Fehler beim Hochladen des Profilbilds für User ${userId}:`, err);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    // Falls keine Datei übermittelt wurde
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei übermittelt'
      });
    }

    try {
      // Relativpfad für die Datenbank speichern
      const relativePath = `profile_pictures/${req.file.filename}`;

      // Altes Profilbild abrufen
      const userProfile = await userProfileModel.getProfileByUserId(userId);
      const oldProfilePicture = userProfile?.profile_picture;

      // Profilbild aktualisieren
      const updatedProfile = await userProfileModel.updateProfilePicture(userId, relativePath);

      // Altes Bild löschen, falls vorhanden
      if (oldProfilePicture) {
        const oldFilePath = path.join(__dirname, '..', 'uploads', oldProfilePicture);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      res.json({
        success: true,
        data: {
          profile_picture: relativePath
        }
      });
    } catch (error) {
      logger.error(`Fehler beim Speichern des Profilbilds für User ${userId}:`, error);

      // Bei Fehler hochgeladene Datei wieder löschen
      if (req.file) {
        const filePath = req.file.path;
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Fehler beim Speichern des Profilbilds'
      });
    }
  });
};

/**
 * Passwort ändern
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 */
const changePassword = async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  // Prüfen, ob der Benutzer sein eigenes Passwort ändert oder Admin-Rechte hat
  if (userId !== req.user?.id && req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Zugriff verweigert: Sie können nur Ihr eigenes Passwort ändern'
    });
  }

  try {
    const { current_password, new_password } = req.body;

    // Aktuelle Benutzerdaten abrufen
    const user = await userModel.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Admin darf Passwörter ohne Angabe des alten Passworts ändern
    if (req.user.role !== 'admin') {
      // Aktuelles Passwort überprüfen
      const isPasswordValid = await userModel.verifyPassword(user, current_password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Falsches aktuelles Passwort'
        });
      }
    }

    // Neues Passwort validieren
    if (!new_password || new_password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Das neue Passwort muss mindestens 8 Zeichen lang sein'
      });
    }

    // Passwort-Hash generieren
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(new_password, salt);

    // Passwort aktualisieren
    await userModel.updatePassword(userId, passwordHash);

    // Passwortänderung protokollieren
    await userProfileModel.logPasswordChange(userId);

    res.json({
      success: true,
      message: 'Passwort erfolgreich geändert'
    });
  } catch (error) {
    logger.error(`Fehler beim Ändern des Passworts für User ${userId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Ändern des Passworts'
    });
  }
};

/**
 * Benutzervoreinstellungen abrufen
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 */
const getUserPreferences = async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  // Prüfen, ob der Benutzer seine eigenen Voreinstellungen abruft oder Admin-Rechte hat
  if (userId !== req.user?.id && req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Zugriff verweigert: Sie können nur Ihre eigenen Voreinstellungen abrufen'
    });
  }

  try {
    const preferences = await userProfileModel.getPreferencesByUserId(userId);

    if (!preferences) {
      return res.status(404).json({
        success: false,
        message: 'Benutzervoreinstellungen nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Benutzervoreinstellungen für User ${userId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Benutzervoreinstellungen'
    });
  }
};

/**
 * Benutzervoreinstellungen aktualisieren
 * @param {Object} req - Express Request-Objekt
 * @param {Object} res - Express Response-Objekt
 */
const updateUserPreferences = async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  // Prüfen, ob der Benutzer seine eigenen Voreinstellungen aktualisiert oder Admin-Rechte hat
  if (userId !== req.user?.id && req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Zugriff verweigert: Sie können nur Ihre eigenen Voreinstellungen aktualisieren'
    });
  }

  try {
    const { theme, language, notifications_enabled, email_notifications, dashboard_layout } = req.body;

    // Voreinstellungen aktualisieren oder erstellen, falls sie noch nicht existieren
    const updatedPreferences = await userProfileModel.updatePreferences(userId, {
      theme,
      language,
      notifications_enabled,
      email_notifications,
      dashboard_layout
    });

    res.json({
      success: true,
      data: updatedPreferences
    });
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren der Benutzervoreinstellungen für User ${userId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Benutzervoreinstellungen'
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  uploadProfilePicture,
  changePassword,
  getUserPreferences,
  updateUserPreferences
};
