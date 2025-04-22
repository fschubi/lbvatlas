const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, checkRole } = require('../middleware/auth');

// Öffentliche Routen
router.post('/login', userController.login);
router.post('/register', userController.register);

// Geschützte Routen - Benutzer Management
router.use(authenticateToken); // Authentifizierung für alle folgenden Routen

// Benutzer Profil
router.get('/profile', userController.getUserProfile);
router.put('/profile', userController.updateUserProfile);
router.put('/password', userController.changePassword);

// Admin Routen
router.get('/all', checkRole(['admin']), userController.getAllUsers);
router.get('/:id', checkRole(['admin']), userController.getUserById);
router.post('/', checkRole(['admin']), userController.createUser);
router.put('/:id', checkRole(['admin']), userController.updateUser);
router.delete('/:id', checkRole(['admin']), userController.deleteUser);

// Rollen Management
router.get('/:id/roles', checkRole(['admin']), userController.getUserRoles);
router.post('/:id/roles', checkRole(['admin']), userController.assignRole);
router.delete('/:id/roles/:roleId', checkRole(['admin']), userController.removeRole);

module.exports = router;
