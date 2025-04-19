/**
 * Router für Audit-Funktionen
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  getAuditLog,
  getAuthLog,
  getPasswordChangeLog,
  exportAuditLogCSV
} = require('../controllers/auditController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionMiddleware');

// Audit-Log abfragen (nur für Administratoren)
router.get('/logs', authMiddleware, getAuditLog);

// Auth-Log abfragen (nur für Administratoren)
router.get('/auth-logs', authMiddleware, getAuthLog);

// Passwortänderungs-Log abfragen (nur für Administratoren)
router.get('/password-logs', authMiddleware, getPasswordChangeLog);

// Audit-Log als CSV exportieren (nur für Administratoren)
router.get('/export/csv', authMiddleware, exportAuditLogCSV);

module.exports = router;
