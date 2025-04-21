const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionMiddleware');
const { check } = require('express-validator');
const {
    USERS_READ, USERS_CREATE, USERS_UPDATE, USERS_DELETE,
    // Add other necessary permission constants if needed
} = require('../constants/permissions');

// Definiere Berechtigungs-Strings für Users
const READ_USERS = 'users.read';
const CREATE_USERS = 'users.create';
const UPDATE_USERS = 'users.update';
const DELETE_USERS = 'users.delete';

// Öffentliche Routen
router.post('/login', userController.login);

// Geschützte Routen - Authentifizierung für alle folgenden Routen
router.use(authenticateToken);

// === Benutzer Management (allgemein) ===

// WICHTIG: Allgemeinste Route zuerst!
// GET /api/users - Alle Benutzer abrufen
router.get(
    '/',
    // authorize(READ_USERS), // Temporär auskommentiert zum Testen
    userController.getAllUsers
);

// GET /api/users/search - Benutzer suchen
router.get(
    '/search',
    authorize(READ_USERS),
    [check('term').optional().isString().trim().withMessage('Suchbegriff muss ein String sein')],
    userController.searchUsers
);

// GET /api/users/profile - Eigenes Profil (Spezifischere Route)
router.get('/profile', userController.getProfile);
// PUT /api/users/profile - Eigenes Profil aktualisieren
router.put(
    '/profile',
    // Middleware, um die ID des eingeloggten Benutzers in req.params zu setzen
    (req, res, next) => {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        req.params.id = String(req.user.id); // Stelle sicher, dass es ein String ist, wie es von :id erwartet wird
        next();
    },
    authorize(UPDATE_USERS), // Oder eine spezifischere Berechtigung?
    userController.updateUser // Verwende die allgemeine updateUser-Funktion
);
// PUT /api/users/password - Eigenes Passwort ändern
router.put('/password', userController.changePassword);

// POST /api/users - Neuen Benutzer erstellen
router.post(
    '/',
    authorize(CREATE_USERS),
    userController.createUser
);

// --- Routen mit :userId Parameter ---

// GET /api/users/:userId/groups - Gruppen eines Benutzers
router.get(
    '/:userId/groups',
    authorize(READ_USERS),
    [check('userId').isInt({ gt: 0 }).withMessage('Ungültige User-ID')],
    userController.getUserGroups
);

// GET /api/users/:userId/devices - Geräte eines Benutzers
router.get(
    '/:userId/devices',
    authorize(READ_USERS),
    [check('userId').isInt({ gt: 0 }).withMessage('Ungültige Benutzer-ID')],
    userController.getUserDevices
);

// GET /api/users/:userId/licenses - Lizenzen eines Benutzers
router.get(
    '/:userId/licenses',
    authorize(USERS_READ),
    [check('userId').isInt({ gt: 0 }).withMessage('Ungültige Benutzer-ID')],
    userController.getUserLicenses
);

// GET /api/users/:userId/accessories - Zubehör eines Benutzers
router.get(
    '/:userId/accessories',
    authorize(USERS_READ),
    [check('userId').isInt({ gt: 0 }).withMessage('Ungültige Benutzer-ID')],
    userController.getUserAccessories
);

// --- Routen mit :id Parameter (Spezifisch für einen Benutzer) ---
// WICHTIG: Diese müssen NACH allen anderen spezifischeren Routen kommen!

// GET /api/users/:id - Benutzer nach ID abrufen
router.get(
    '/:id',
    authorize(READ_USERS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige User-ID')],
    userController.getUserById
);

// PUT /api/users/:id - Benutzer aktualisieren
router.put(
    '/:id',
    authorize(UPDATE_USERS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige User-ID')],
    userController.updateUser
);

// DELETE /api/users/:id - Benutzer löschen
router.delete(
    '/:id',
    authorize(DELETE_USERS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige User-ID')],
    userController.deleteUser
);

module.exports = router;
