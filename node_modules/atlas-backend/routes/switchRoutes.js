const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const switchController = require('../controllers/switchController'); // Geändert
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

// Berechtigungen (Beispiel, anpassen!)
const READ_SWITCHES = 'switches.read';
const CREATE_SWITCHES = 'switches.create';
const UPDATE_SWITCHES = 'switches.update';
const DELETE_SWITCHES = 'switches.delete';

// Middleware für alle Routen
router.use(authenticateToken);

// GET /api/switches - Alle Switches
router.get('/', checkPermission(READ_SWITCHES), switchController.getAllSwitches);

// GET /api/switches/count - Anzahl der Switches abrufen
router.get('/count', checkPermission(READ_SWITCHES), switchController.getSwitchCount);

// GET /api/switches/:id - Ein Switch
router.get('/:id', checkPermission(READ_SWITCHES), switchController.getSwitchById);

// POST /api/switches - Neuen Switch erstellen
router.post('/', checkPermission(CREATE_SWITCHES), switchController.createSwitch);

// PUT /api/switches/:id - Switch aktualisieren
router.put('/:id', checkPermission(UPDATE_SWITCHES), switchController.updateSwitch);

// DELETE /api/switches/:id - Switch löschen
router.delete('/:id', checkPermission(DELETE_SWITCHES), switchController.deleteSwitch);

module.exports = router;
