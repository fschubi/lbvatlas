const express = require('express');
const router = express.Router();
const roleModel = require('../models/roleModel');
const { authenticateToken } = require('../middleware/auth');

// Alle Berechtigungen abrufen
router.get('/', authenticateToken, async (req, res) => {
  try {
    const permissions = await roleModel.getAllPermissions();
    res.json({ success: true, data: permissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Berechtigungen nach Modul abrufen
router.get('/module/:module', authenticateToken, async (req, res) => {
  try {
    const permissions = await roleModel.getPermissionsByModule(req.params.module);
    res.json({ success: true, data: permissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
