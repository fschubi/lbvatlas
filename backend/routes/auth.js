const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authMiddleware } = require('../middleware/auth');

// Login-Route
router.post("/login", authController.login);

// Route zur Validierung des Tokens und Abruf der Benutzerdaten (inkl. Berechtigungen)
// Entferne den temporären Fix und verwende den echten Controller
router.get('/validate', authMiddleware, authController.validate);

// Logout-Route
router.post("/logout", authMiddleware, authController.logout);

module.exports = router;
