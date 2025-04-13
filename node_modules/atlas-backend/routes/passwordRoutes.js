/**
 * Router für Passwort-Management-Funktionen
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  changeUserPassword,
  adminChangeUserPassword,
  requestPasswordReset,
  resetPassword,
  getPasswordPolicy,
  checkPasswordExpiry
} = require('../controllers/passwordController');

// Passwort des eingeloggten Benutzers ändern (erfordert Authentifizierung)
router.post('/change', authMiddleware, changeUserPassword);

// Passwort eines Benutzers als Administrator ändern (erfordert Admin-Rolle)
router.post('/admin/change', authMiddleware, adminChangeUserPassword);

// Passwort-Reset anfordern (öffentlicher Zugang)
router.post('/request-reset', requestPasswordReset);

// Passwort mit Token zurücksetzen (öffentlicher Zugang)
router.post('/reset', resetPassword);

// Aktive Passwortrichtlinie abrufen
router.get('/policy', authMiddleware, getPasswordPolicy);

// Prüfen, ob das Passwort des eingeloggten Benutzers abgelaufen ist
router.get('/expiry', authMiddleware, checkPasswordExpiry);

module.exports = router;
