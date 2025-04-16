const express = require('express');
const router = express.Router();
const { roleController } = require('../controllers');
const { authenticateToken } = require('../middleware/auth');

// Alle Berechtigungen abrufen
router.get('/', authenticateToken, roleController.getAllPermissions);

// Berechtigungen nach Modul abrufen
router.get('/module/:module', authenticateToken, roleController.getPermissionsByModule);

module.exports = router;
