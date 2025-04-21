const express = require('express');
const router = express.Router();
const { body, check, validationResult } = require('express-validator');
const UserController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionMiddleware');
const { pool } = require('../db');
const logger = require('../utils/logger');
const { getLocations, getRoomsByLocation } = require('../models/userModel');

// Berechtigungen definieren
const USERS_READ = 'users.read';
const USERS_CREATE = 'users.create';
const USERS_UPDATE = 'users.update';
const USERS_DELETE = 'users.delete';

/**
 * @route   POST /api/users/login
 * @desc    Benutzeranmeldung
 * @access  Public
 */
router.post('/login', [
  body('username').notEmpty().withMessage('Benutzername oder E-Mail ist erforderlich'),
  body('password').notEmpty().withMessage('Passwort ist erforderlich')
], UserController.login);

// Middleware für alle folgenden Routen
router.use(authenticateToken);

/**
 * @route   GET /api/users/profile
 * @desc    Aktuelles Benutzerprofil abrufen
 * @access  Private (Authentifiziert)
 */
router.get('/profile', UserController.getProfile);

/**
 * @route   PUT /api/users/change-password
 * @desc    Passwort ändern
 * @access  Private (Authentifiziert)
 */
router.put('/change-password', [
  body('currentPassword').notEmpty().withMessage('Aktuelles Passwort ist erforderlich'),
  body('newPassword')
    .notEmpty().withMessage('Neues Passwort ist erforderlich')
    .isLength({ min: 8 }).withMessage('Passwort muss mindestens 8 Zeichen lang sein')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/)
    .withMessage('Passwort muss mindestens einen Buchstaben und eine Zahl enthalten')
], UserController.changePassword);

/**
 * @route   GET /api/users/departments
 * @desc    Alle Abteilungen abrufen
 * @access  Private (Authentifiziert, keine spezielle Berechtigung?)
 */
router.get('/departments', UserController.getDepartments);

/**
 * @route   GET /api/users/locations
 * @desc    Alle verfügbaren Standorte für Benutzer abrufen
 * @access  Private (Authentifiziert)
 */
router.get('/locations', async (req, res) => {
  try {
    // Verwenden der getLocations-Funktion aus dem userModel
    const locations = await getLocations();

    res.json({
      success: true,
      data: locations
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Standorte:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Standorte',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/users/locations/:locationId/rooms
 * @desc    Räume für einen bestimmten Standort abrufen
 * @access  Private (Authentifiziert)
 */
router.get('/locations/:locationId/rooms', async (req, res) => {
  try {
    const { locationId } = req.params;
    // Verwenden der getRoomsByLocation-Funktion aus dem userModel
    const rooms = await getRoomsByLocation(locationId);

    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Räume für Standort ${req.params.locationId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Räume',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/users
 * @desc    Alle Benutzer abrufen (jetzt /all)
 * @access  Private (Berechtigung: users.read)
 */
router.get('/all', authorize(USERS_READ), UserController.getAllUsers);

/**
 * @route   GET /api/users/search
 * @desc    Benutzer suchen
 * @access  Private (Berechtigung: users.read)
 */
router.get('/search',
    authorize(USERS_READ),
    [check('term').optional().isString().trim().withMessage('Suchbegriff muss ein String sein')],
    UserController.searchUsers
);

/**
 * @route   GET /api/users/:userId/groups
 * @desc    Gruppen eines Benutzers abrufen
 * @access  Private (Berechtigung: users.read oder usergroups.read?)
 */
router.get('/:userId/groups',
    authorize(USERS_READ), // Oder spezifischere Berechtigung prüfen?
    [check('userId').isInt({ gt: 0 }).withMessage('Ungültige User-ID')],
    UserController.getUserGroups
);

/**
 * @route   GET /api/users/:id
 * @desc    Benutzer nach ID abrufen
 * @access  Private (Berechtigung: users.read)
 */
router.get('/:id', authorize(USERS_READ), UserController.getUserById);

/**
 * @route   POST /api/users
 * @desc    Neuen Benutzer erstellen
 * @access  Private (Berechtigung: users.create)
 */
router.post('/', [
  authorize(USERS_CREATE),
  body('username')
    .notEmpty().withMessage('Benutzername ist erforderlich')
    .isLength({ min: 3 }).withMessage('Benutzername muss mindestens 3 Zeichen lang sein'),
  body('email')
    .notEmpty().withMessage('E-Mail ist erforderlich')
    .isEmail().withMessage('Ungültiges E-Mail-Format'),
  body('password')
    .notEmpty().withMessage('Passwort ist erforderlich')
    .isLength({ min: 8 }).withMessage('Passwort muss mindestens 8 Zeichen lang sein')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/)
    .withMessage('Passwort muss mindestens einen Buchstaben und eine Zahl enthalten'),
  body('first_name').notEmpty().withMessage('Vorname ist erforderlich'),
  body('last_name').notEmpty().withMessage('Nachname ist erforderlich'),
  body('role').notEmpty().withMessage('Rolle ist erforderlich')
], UserController.createUser);

/**
 * @route   PUT /api/users/:id
 * @desc    Benutzer aktualisieren
 * @access  Private (Berechtigung: users.update)
 */
router.put('/:id', [
  authorize(USERS_UPDATE),
  body('username')
    .optional()
    .isLength({ min: 3 }).withMessage('Benutzername muss mindestens 3 Zeichen lang sein'),
  body('email')
    .optional()
    .isEmail().withMessage('Ungültiges E-Mail-Format'),
  body('password')
    .optional()
    .isLength({ min: 8 }).withMessage('Passwort muss mindestens 8 Zeichen lang sein')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/)
    .withMessage('Passwort muss mindestens einen Buchstaben und eine Zahl enthalten')
], UserController.updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Benutzer löschen
 * @access  Private (Berechtigung: users.delete)
 */
router.delete('/:id', authorize(USERS_DELETE), UserController.deleteUser);

module.exports = router;
