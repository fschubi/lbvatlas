const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionMiddleware');
const { check } = require('express-validator');

// Definiere Berechtigungs-Strings für Users
const READ_USERS = 'users.read';
const CREATE_USERS = 'users.create';
const UPDATE_USERS = 'users.update';
const DELETE_USERS = 'users.delete';

// Öffentliche Routen
router.post('/login', userController.login);
router.post('/register', userController.register);

// Geschützte Routen - Authentifizierung für alle folgenden Routen
router.use(authenticateToken);

// Benutzer Profil (spezifisch für den eingeloggten Benutzer)
router.get('/profile', userController.getUserProfile);
router.put('/profile', userController.updateUserProfile);
router.put('/password', userController.changePassword);

// Benutzer Management (allgemein)
router.get(
    '/all',
    authorize(READ_USERS),
    userController.getAllUsers
);

// NEUE ROUTE: Benutzersuche
router.get(
    '/search',
    authorize(READ_USERS),
    [check('term').optional().isString().trim().withMessage('Suchbegriff muss ein String sein')],
    userController.searchUsers
);

// NEUE ROUTE: Gruppen eines Benutzers abrufen
router.get(
    '/:userId/groups',
    authorize(READ_USERS),
    [check('userId').isInt({ gt: 0 }).withMessage('Ungültige User-ID')],
    userController.getUserGroups
);

router.get(
    '/:id',
    authorize(READ_USERS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige User-ID')],
    userController.getUserById
);

router.post(
    '/',
    authorize(CREATE_USERS),
    userController.createUser
);

router.put(
    '/:id',
    authorize(UPDATE_USERS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige User-ID')],
    userController.updateUser
);

router.delete(
    '/:id',
    authorize(DELETE_USERS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige User-ID')],
    userController.deleteUser
);

module.exports = router;
