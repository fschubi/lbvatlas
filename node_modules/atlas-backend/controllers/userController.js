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
  verifyPassword: verifyPasswordModel,
  searchUsers: searchUsersModel
} = require('../models/userModel');
const userGroupModel = require('../models/userGroupModel');
const deviceModel = require('../models/deviceModel');
const licenseModel = require('../models/licenseModel');
const accessoryModel = require('../models/accessoryModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/jwt');
const { validationResult } = require('express-validator');

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
  res.status(501).json({ message: 'Noch nicht implementiert' });
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
      role,
      department_id,
      location_id,
      room_id,
      active,
      login_allowed,
      email_notifications_enabled
    } = req.body;

    // Prüfen, ob Benutzername bereits existiert
    const existingUser = await getUserByUsernameModel(username);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Benutzername existiert bereits' });
    }

    // Prüfen, ob E-Mail bereits existiert
    const existingEmail = await getUserByEmailModel(email);
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'E-Mail existiert bereits' });
    }

    // Benutzer erstellen
    const userData = {
      username,
      email,
      password,
      first_name,
      last_name,
      role,
      department_id: department_id || null,
      location_id: location_id || null,
      room_id: room_id || null,
      active: active !== undefined ? active : true,
      login_allowed: login_allowed !== undefined ? login_allowed : true,
      email_notifications_enabled: email_notifications_enabled !== undefined ? email_notifications_enabled : true
    };

    logger.info('[createUser] Erstelle Benutzer mit Daten:', { ...userData, password: '[REDACTED]' });
    const newUser = await createUserModel(userData);

    // Entferne sensible Daten vor der Rückgabe
    const { password_hash, ...userToReturn } = newUser;

    res.status(201).json({
      success: true,
      message: 'Benutzer erfolgreich erstellt',
      data: userToReturn
    });
  } catch (error) {
    logger.error('Fehler beim Erstellen des Benutzers:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Serverfehler beim Erstellen des Benutzers'
    });
  }
};

/**
 * Benutzer aktualisieren
 */
const updateUser = async (req, res) => {
  const { id } = req.params;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const {
      username,
      email,
      password,
      first_name,
      last_name,
      role,
      department_id,
      location_id,
      room_id,
      active,
      login_allowed,
      email_notifications_enabled
    } = req.body;

    // Build userData object only with provided fields
    const userData = {};
    if (username !== undefined) userData.username = username;
    if (email !== undefined) userData.email = email;
    if (password) userData.password = password; // Passwort nur übergeben, wenn es geändert werden soll
    if (first_name !== undefined) userData.first_name = first_name;
    if (last_name !== undefined) userData.last_name = last_name;
    if (role !== undefined) userData.role = role;
    if (department_id !== undefined) userData.department_id = department_id;
    if (location_id !== undefined) userData.location_id = location_id;
    if (room_id !== undefined) userData.room_id = room_id;
    if (active !== undefined) userData.active = active;
    if (login_allowed !== undefined) userData.login_allowed = login_allowed;
    if (email_notifications_enabled !== undefined) userData.email_notifications_enabled = email_notifications_enabled;

    logger.info(`[updateUser] Aktualisiere Benutzer ID ${id} mit Daten:`, { ...userData, password: userData.password ? '[REDACTED]' : undefined });

    if (Object.keys(userData).length === 0) {
      return res.status(400).json({ success: false, message: 'Keine Daten zum Aktualisieren angegeben.' });
    }

    const updatedUser = await updateUserModel(id, userData);

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'Benutzer nicht gefunden' });
    }

    // Entferne sensible Daten vor der Rückgabe
    const { password_hash, ...userToReturn } = updatedUser;

    res.json({
      success: true,
      message: 'Benutzer erfolgreich aktualisiert',
      data: userToReturn
    });
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren des Benutzers mit ID ${id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message || 'Serverfehler beim Aktualisieren des Benutzers'
    });
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
 * Benutzer suchen (Aktualisiert)
 */
const searchUsers = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { term } = req.query;
  console.log(`[UserController] Anfrage: searchUsers mit term: ${term}`);

  try {
      // Model-Funktion aufrufen
      const users = await searchUsersModel(term);

      console.log(`[UserController] Suchergebnisse für "${term}" gefunden:`, users);
      return res.json({
          success: true,
          data: users
      });
  } catch (error) {
      logger.error('Fehler bei der Benutzersuche:', error);
      return res.status(500).json({
          success: false,
          message: 'Serverfehler bei der Benutzersuche'
      });
  }
};

/**
 * Gruppen eines Benutzers abrufen (Aktualisiert)
 */
const getUserGroups = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { userId } = req.params;
  console.log(`[UserController] Anfrage: getUserGroups für userId: ${userId}`);

  try {
      // Model-Funktion aufrufen
      const groups = await userGroupModel.getGroupsByUserId(userId);

      console.log(`[UserController] Gruppen für userId ${userId} gefunden:`, groups);
      return res.json({
          success: true,
          data: groups
      });
  } catch (error) {
      logger.error(`Fehler beim Abrufen der Gruppen für Benutzer ${userId}:`, error);
      return res.status(500).json({
          success: false,
          message: `Serverfehler beim Abrufen der Gruppen für Benutzer ${userId}`
      });
  }
};

/**
 * NEU: Zugewiesene Geräte für einen Benutzer abrufen
 */
const getUserDevices = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { userId } = req.params;
  logger.info(`[UserController] Anfrage: getUserDevices für userId: ${userId}`);

  try {
    const devices = await deviceModel.getAllDevices({ user_id: userId });
    logger.info(`[UserController] Geräte für userId ${userId} gefunden: ${devices.length}`);
    return res.json({
      success: true,
      data: devices
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Geräte für Benutzer ${userId}:`, error);
    return res.status(500).json({
      success: false,
      message: `Serverfehler beim Abrufen der Geräte für Benutzer ${userId}: ${error.message}`
    });
  }
};

/**
 * NEU: Zugewiesene Lizenzen für einen Benutzer abrufen
 */
const getUserLicenses = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { userId } = req.params;
  logger.info(`[UserController] Anfrage: getUserLicenses für userId: ${userId}`);

  try {
    const licenses = await licenseModel.getAllLicenses({ user_id: userId });
    logger.info(`[UserController] Lizenzen für userId ${userId} gefunden: ${licenses.length}`);
    return res.json({
      success: true,
      data: licenses
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Lizenzen für Benutzer ${userId}:`, error);
    return res.status(500).json({
      success: false,
      message: `Serverfehler beim Abrufen der Lizenzen für Benutzer ${userId}: ${error.message}`
    });
  }
};

/**
 * NEU: Zugewiesenes Zubehör für einen Benutzer abrufen
 */
const getUserAccessories = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { userId } = req.params;
  logger.info(`[UserController] Anfrage: getUserAccessories für userId: ${userId}`);

  try {
    const accessories = await accessoryModel.getAllAccessories({ user_id: userId });
    logger.info(`[UserController] Zubehör für userId ${userId} gefunden: ${accessories.length}`);
    return res.json({
      success: true,
      data: accessories
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen des Zubehörs für Benutzer ${userId}:`, error);
    return res.status(500).json({
      success: false,
      message: `Serverfehler beim Abrufen des Zubehörs für Benutzer ${userId}: ${error.message}`
    });
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
  searchUsers,
  getUserGroups,
  getUserDevices,
  getUserLicenses,
  getUserAccessories
};
