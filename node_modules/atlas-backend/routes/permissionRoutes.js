const express = require('express');
const permissionController = require('../controllers/permissionController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionMiddleware'); // Korrigierter Import

const router = express.Router();

// Alle Routen hier erfordern Authentifizierung
router.use(authenticateToken);

// GET /api/permissions - Alle verfügbaren Berechtigungen abrufen
// Annahme: Jeder authentifizierte Benutzer darf die Liste der Berechtigungen sehen (wichtig für UI)
// Oder spezifische Berechtigung: authorize('permissions.read')
router.get(
    '/',
    // authorize('permissions.read'), // Ggf. hier Berechtigung hinzufügen
    permissionController.getAllPermissions
);

module.exports = router;
