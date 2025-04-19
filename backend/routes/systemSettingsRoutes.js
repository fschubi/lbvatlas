const express = require('express');
const systemSettingsController = require('../controllers/systemSettingsController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Alle Routen erfordern Authentifizierung UND spezifische System-Admin-Berechtigung
router.use(authenticateToken);
router.use(systemSettingsController.permissionMiddleware); // Nutzt die Middleware aus dem Controller

// GET /api/system-settings - Globale Systemeinstellungen abrufen
router.get('/', systemSettingsController.controllerMethods.getSystemSettings);

// POST /api/system-settings - Globale Systemeinstellungen speichern/aktualisieren
// PUT könnte hier semantisch passender sein, aber POST wird oft für "create or update" verwendet.
router.post('/', systemSettingsController.controllerMethods.saveSystemSettings);
// Alternativ: router.put('/', systemSettingsController.controllerMethods.saveSystemSettings);

module.exports = router;
