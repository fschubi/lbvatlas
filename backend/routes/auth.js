const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authMiddleware } = require('../middleware/auth');

// Login-Route
router.post("/login", authController.login);

// Temporärer Fix - Dummy-Antwort für Validierung zurückgeben
router.get('/validate', authMiddleware, (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      id: '1',
      username: 'admin',
      name: 'Administrator',
      email: 'admin@example.com',
      role: 'admin'
    }
  });
});

// Logout-Route
router.post("/logout", authMiddleware, authController.logout);

module.exports = router;
