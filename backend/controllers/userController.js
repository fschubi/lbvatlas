/**
 * Benutzer-Controller für das ATLAS-System
 */

const { pool } = require('../db');
const logger = require('../utils/logger');
const {
  getAllUsers: getAllUsersModel,
  getUserById: getUserByIdModel,
  getUserRoles: getUserRolesModel,
  getDepartments: getDepartmentsModel,
  getUserByUsername: getUserByUsernameModel,
  getUserByEmail: getUserByEmailModel,
  createUser: createUserModel,
  updateUser: updateUserModel,
  deleteUser: deleteUserModel,
  verifyPassword: verifyPasswordModel
} = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/jwt');
const { validationResult } = require('express-validator');

// Import der benötigten Models (Pfade ggf. anpassen)
const DeviceModel = require('../models/deviceModel');
const LicenseModel = require('../models/licenseModel');
const AccessoryModel = require('../models/accessoryModel');

/**
 * Login-Handler
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Prüfen, ob Benutzername oder E-Mail
    let user = null;
    if (username.includes('@')) {
      user = await getUserByEmailModel(username);
    } else {
      user = await getUserByUsernameModel(username);
    }

    if (!user) {
      return res.status(401).json({ message: 'Benutzername oder E-Mail nicht gefunden' });
    }

    // Passwort überprüfen
    const isPasswordValid = await verifyPasswordModel(user, password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Ungültiges Passwort' });
    }

    // JWT Token generieren
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Benutzerinfo ohne Passwort
    const userInfo = {
      id: user.id,
      username: user.username,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      role: user.role
    };

    res.json({
      message: 'Login erfolgreich',
      token,
      user: userInfo
    });
  } catch (error) {
    logger.error('Fehler beim Login:', error);
    res.status(500).json({ message: 'Serverfehler beim Login' });
  }
};

/**
 * Benutzerprofil abrufen
 */
const getProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    const user = await getUserByIdModel(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Benutzerprofil nicht gefunden' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Fehler beim Abrufen des Benutzerprofils:', error);
    res.status(500).json({ message: 'Serverfehler beim Abrufen des Benutzerprofils' });
  }
};

/**
 * Passwort ändern
 */
const changePassword = async (req, res) => {
  try {
    // Validierungsergebnisse prüfen (aus Route)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Formatieren der Fehler für eine bessere API-Antwort
      const formattedErrors = errors.array().map(err => ({ field: err.param, message: err.msg }));
      return res.status(400).json({ success: false, message: "Validierungsfehler", errors: formattedErrors });
    }

    const { currentPassword, newPassword } = req.body;

    // Sicherstellen, dass req.user existiert (sollte durch authMiddleware der Fall sein)
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Nicht autorisiert oder Benutzer-ID fehlt.' });
    }
    const userId = req.user.id;

    // Benutzer holen (inklusive Passwort-Hash)
    const user = await getUserByIdModel(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Benutzer nicht gefunden.' });
    }

    // Aktuelles Passwort überprüfen
    const isPasswordValid = await verifyPasswordModel(user, currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Aktuelles Passwort ist ungültig.' });
    }

    // Neues Passwort hashen (wird innerhalb von updateUserModel gemacht, wenn `password` übergeben wird)
    // const salt = await bcrypt.genSalt(10);
    // const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Passwort im Model aktualisieren, nur das neue Passwort übergeben
    await updateUserModel(userId, { password: newPassword });

    res.json({ success: true, message: 'Passwort erfolgreich geändert.' });

  } catch (error) {
    logger.error(`Fehler beim Ändern des Passworts für Benutzer ${req.user?.id}:`, error);
    res.status(500).json({ success: false, message: 'Serverfehler beim Ändern des Passworts.' });
  }
};

/**
 * Alle Benutzerrollen abrufen
 */
const getUserRoles = async (req, res) => {
  try {
    const roles = await getUserRolesModel();
    res.json(roles);
  } catch (error) {
    logger.error('Fehler beim Abrufen der Benutzerrollen:', error);
    res.status(500).json({ message: 'Serverfehler beim Abrufen der Benutzerrollen' });
  }
};

/**
 * Abteilungen abrufen
 */
const getDepartments = async (req, res) => {
  try {
    const departments = await getDepartmentsModel();
    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Abteilungen:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Abteilungen'
    });
  }
};

/**
 * Alle Benutzer abrufen
 */
const getAllUsers = async (req, res) => {
  try {
    const sortBy = req.query.sortBy || 'username';
    const sortOrder = req.query.sortOrder || 'ASC';

    const filters = {
      name: req.query.name || req.query.search,
      department: req.query.department,
      location: req.query.location,
      room: req.query.room,
      role: req.query.role,
      active: req.query.active !== undefined ?
        (req.query.active === 'true' || req.query.active === '1') : undefined
    };

    // Abrufen aller Benutzer mit den angegebenen Filtern und der Sortierung
    const users = await getAllUsersModel(filters, sortBy, sortOrder);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Benutzer:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Benutzer'
    });
  }
};

/**
 * Benutzer nach ID abrufen
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await getUserByIdModel(id);

    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    res.json(user);
  } catch (error) {
    logger.error(`Fehler beim Abrufen des Benutzers mit ID ${req.params.id}:`, error);
    res.status(500).json({ message: 'Serverfehler beim Abrufen des Benutzers' });
  }
};

/**
 * Neuen Benutzer erstellen
 */
const createUser = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      first_name,
      last_name,
      gender,
      role,
      department,
      location,
      room,
      phone,
      is_active
    } = req.body;

    // Prüfen, ob Benutzername bereits existiert
    const existingUser = await getUserByUsernameModel(username);
    if (existingUser) {
      return res.status(400).json({ message: 'Benutzername existiert bereits' });
    }

    // Prüfen, ob E-Mail bereits existiert
    const existingEmail = await getUserByEmailModel(email);
    if (existingEmail) {
      return res.status(400).json({ message: 'E-Mail existiert bereits' });
    }

    // Benutzer erstellen
    const userData = {
      username,
      email,
      password,
      first_name,
      last_name,
      gender,
      role,
      department,
      location,
      room,
      phone,
      active: is_active !== undefined ? is_active : true
    };

    const newUser = await createUserModel(userData);

    res.status(201).json({
      message: 'Benutzer erfolgreich erstellt',
      user: newUser
    });
  } catch (error) {
    logger.error('Fehler beim Erstellen des Benutzers:', error);
    res.status(500).json({ message: 'Serverfehler beim Erstellen des Benutzers' });
  }
};

/**
 * Benutzer aktualisieren
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      username,
      email,
      password,
      first_name,
      last_name,
      display_name,
      role,
      department_id,
      location_id,
      room_id,
      phone,
      active,
      can_receive_emails
    } = req.body;

    // Validierung (optional, aber empfohlen, z.B. mit express-validator)
    // ... Validierungslogik hier ...

    // Datenobjekt für das Model zusammenstellen
    const userData = {};
    if (username !== undefined) userData.username = username;
    if (email !== undefined) userData.email = email;
    if (password) {
       // Zusätzliche Sicherheitsprüfung: Mindestlänge etc.
       if (password.length < 8) {
          return res.status(400).json({ success: false, message: 'Neues Passwort muss mindestens 8 Zeichen lang sein.' });
       }
       userData.password = password;
    }
    if (first_name !== undefined) userData.first_name = first_name;
    if (last_name !== undefined) userData.last_name = last_name;
    if (display_name !== undefined) userData.display_name = display_name;
    if (role !== undefined) userData.role = role;
    // Sicherstellen, dass IDs als null oder Zahl übergeben werden
    if (department_id !== undefined) userData.department_id = department_id === '' || department_id === null ? null : parseInt(department_id);
    if (location_id !== undefined) userData.location_id = location_id === '' || location_id === null ? null : parseInt(location_id);
    if (room_id !== undefined) userData.room_id = room_id === '' || room_id === null ? null : parseInt(room_id);
    if (phone !== undefined) userData.phone = phone;
    if (active !== undefined) userData.active = Boolean(active);
    if (can_receive_emails !== undefined) {
      userData.can_receive_emails = Boolean(can_receive_emails);
    }

    // Prüfen, ob überhaupt Daten zum Aktualisieren vorhanden sind
    if (Object.keys(userData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keine Daten zum Aktualisieren angegeben.'
      });
    }

    const updatedUser = await updateUserModel(id, userData);

    if (!updatedUser) {
      // updateUserModel gibt null zurück, wenn der Benutzer nicht gefunden wurde
      return res.status(404).json({ success: false, message: 'Benutzer nicht gefunden.' });
    }

    res.json({
      success: true,
      message: 'Benutzer erfolgreich aktualisiert.',
      data: updatedUser // Das aktualisierte User-Objekt (ohne Passwort-Hash) zurückgeben
    });

  } catch (error) {
    logger.error(`Fehler beim Aktualisieren des Benutzers mit ID ${req.params.id}:`, error);
    // Spezifische Fehlermeldung für unique constraints oder andere erwartete Fehler
    if (error.message.includes('existiert bereits')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    // Allgemeiner Serverfehler
    res.status(500).json({ success: false, message: 'Serverfehler beim Aktualisieren des Benutzers.' });
  }
};

/**
 * Benutzer löschen
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prüfen, ob Benutzer existiert
    const existingUser = await getUserByIdModel(id);
    if (!existingUser) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    // Benutzer löschen
    await deleteUserModel(id);

    res.json({
      message: 'Benutzer erfolgreich gelöscht',
      data: { id }
    });
  } catch (error) {
    logger.error(`Fehler beim Löschen des Benutzers mit ID ${req.params.id}:`, error);
    res.status(500).json({ message: 'Serverfehler beim Löschen des Benutzers' });
  }
};

/**
 * Alle Standorte abrufen
 */
const getLocations = async (req, res) => {
  try {
    const query = `
      SELECT id, name, address, city
      FROM locations
      WHERE active = true
      ORDER BY name
    `;

    const { rows } = await pool.query(query);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Standorte:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Standorte'
    });
  }
};

/**
 * Räume für einen bestimmten Standort abrufen
 */
const getRoomsForLocation = async (req, res) => {
  try {
    const { locationId } = req.params;

    const query = `
      SELECT id, name, description
      FROM rooms
      WHERE location_id = $1 AND active = true
      ORDER BY name
    `;

    const { rows } = await pool.query(query, [locationId]);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Räume für Standort ${req.params.locationId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Räume'
    });
  }
};

/**
 * Zugeordnete Geräte für einen Benutzer abrufen
 */
const getUserDevices = async (req, res) => {
  try {
    const { userId } = req.params;
    // Sicherstellen, dass die Model-Funktion existiert (ggf. anpassen)
    if (typeof DeviceModel.findByUserId !== 'function') {
        logger.warn('DeviceModel.findByUserId ist nicht implementiert.');
        return res.status(501).json({ success: false, message: 'Funktion zum Abrufen von Benutzergeräten nicht implementiert.' });
    }
    const devices = await DeviceModel.findByUserId(userId);
    res.json({ success: true, data: devices });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Geräte für Benutzer ${req.params.userId}:`, error);
    res.status(500).json({ success: false, message: 'Serverfehler beim Abrufen der Geräte.' });
  }
};

/**
 * Zugeordnete Lizenzen für einen Benutzer abrufen
 */
const getUserLicenses = async (req, res) => {
  try {
    const { userId } = req.params;
    // Sicherstellen, dass die Model-Funktion existiert (ggf. anpassen)
     if (typeof LicenseModel.findByUserId !== 'function') {
        logger.warn('LicenseModel.findByUserId ist nicht implementiert.');
        return res.status(501).json({ success: false, message: 'Funktion zum Abrufen von Benutzerlizenzen nicht implementiert.' });
    }
    const licenses = await LicenseModel.findByUserId(userId);
    res.json({ success: true, data: licenses });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Lizenzen für Benutzer ${req.params.userId}:`, error);
    res.status(500).json({ success: false, message: 'Serverfehler beim Abrufen der Lizenzen.' });
  }
};

/**
 * Zugeordnetes Zubehör für einen Benutzer abrufen
 */
const getUserAccessories = async (req, res) => {
  try {
    const { userId } = req.params;
    // Sicherstellen, dass die Model-Funktion existiert (ggf. anpassen)
    if (typeof AccessoryModel.findByUserId !== 'function') {
        logger.warn('AccessoryModel.findByUserId ist nicht implementiert.');
        return res.status(501).json({ success: false, message: 'Funktion zum Abrufen von Benutzerzubehör nicht implementiert.' });
    }
    const accessories = await AccessoryModel.findByUserId(userId);
    res.json({ success: true, data: accessories });
  } catch (error) {
    logger.error(`Fehler beim Abrufen des Zubehörs für Benutzer ${req.params.userId}:`, error);
    res.status(500).json({ success: false, message: 'Serverfehler beim Abrufen des Zubehörs.' });
  }
};

module.exports = {
  login,
  getProfile,
  changePassword,
  getUserRoles,
  getDepartments,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getLocations,
  getRoomsForLocation,
  getUserDevices,
  getUserLicenses,
  getUserAccessories
};
