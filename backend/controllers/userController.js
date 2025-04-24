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
      gender,
      role,
      department,
      location,
      room,
      phone,
      is_active
    } = req.body;

    // Prüfen, ob Benutzer existiert
    const existingUser = await getUserByIdModel(id);
    if (!existingUser) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    // Prüfen, ob der neue Benutzername bereits existiert (außer für denselben Benutzer)
    if (username !== existingUser.username) {
      const userWithUsername = await getUserByUsernameModel(username);
      if (userWithUsername) {
        return res.status(400).json({ message: 'Benutzername existiert bereits' });
      }
    }

    // Prüfen, ob die neue E-Mail bereits existiert (außer für denselben Benutzer)
    if (email !== existingUser.email) {
      const userWithEmail = await getUserByEmailModel(email);
      if (userWithEmail) {
        return res.status(400).json({ message: 'E-Mail existiert bereits' });
      }
    }

    // Benutzerdaten vorbereiten
    const userData = {
      username,
      email,
      first_name,
      last_name,
      gender,
      role,
      department,
      location,
      room,
      phone,
      active: is_active
    };

    // Optional Passwort hinzufügen, wenn angegeben
    if (password) {
      userData.password = password;
    }

    // Benutzer aktualisieren
    const updatedUser = await updateUserModel(id, userData);

    res.json({
      message: 'Benutzer erfolgreich aktualisiert',
      user: updatedUser
    });
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren des Benutzers mit ID ${req.params.id}:`, error);
    res.status(500).json({ message: 'Serverfehler beim Aktualisieren des Benutzers' });
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
  getRoomsForLocation
};
