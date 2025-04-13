/**
 * Routen für Benutzerprofile im ATLAS-System
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const userProfileController = require('../controllers/userProfileController');

// Alle Routen für Benutzerprofile schützen
router.use(authenticate);

// Benutzerprofil abrufen
router.get('/users/:userId/profile', userProfileController.getUserProfile);

// Benutzerprofil aktualisieren
router.put('/users/:userId/profile', userProfileController.updateUserProfile);

// Profilbild hochladen
router.post('/users/:userId/profile/picture', userProfileController.uploadProfilePicture);

// Passwort ändern
router.post('/users/:userId/password', userProfileController.changePassword);

// Benutzervoreinstellungen abrufen
router.get('/users/:userId/preferences', userProfileController.getUserPreferences);

// Benutzervoreinstellungen aktualisieren
router.put('/users/:userId/preferences', userProfileController.updateUserPreferences);

module.exports = router;
