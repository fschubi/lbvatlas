const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const InventorySessionController = require('../controllers/inventorySessionController');
const { authenticateToken, hasPermission } = require('../middleware/authMiddleware');
const PERMISSIONS = require('../constants/permissions');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

/**
 * @route   GET /api/inventory-sessions
 * @desc    Alle Inventursitzungen abrufen
 * @access  Private
 */
router.get('/', authenticateToken, hasPermission(PERMISSIONS.INVENTORY_SESSION_READ), InventorySessionController.getAllSessions);

/**
 * @route   GET /api/inventory-sessions/active
 * @desc    Aktive Inventursitzung abrufen
 * @access  Private
 */
router.get('/active', authenticateToken, hasPermission(PERMISSIONS.INVENTORY_SESSION_READ), InventorySessionController.getActiveSession);

/**
 * @route   GET /api/inventory-sessions/:id
 * @desc    Inventursitzung nach ID abrufen
 * @access  Private
 */
router.get('/:id', authenticateToken, hasPermission(PERMISSIONS.INVENTORY_SESSION_READ), InventorySessionController.getSessionById);

/**
 * @route   GET /api/inventory-sessions/:id/items
 * @desc    Inventureinträge für eine Sitzung abrufen
 * @access  Private
 */
router.get('/:id/items', authenticateToken, hasPermission(PERMISSIONS.INVENTORY_SESSION_READ), InventorySessionController.getSessionItems);

/**
 * @route   POST /api/inventory-sessions
 * @desc    Neue Inventursitzung erstellen
 * @access  Private (Admin, Manager, Inventory Manager)
 */
router.post('/', authenticateToken, hasPermission(PERMISSIONS.INVENTORY_SESSION_MANAGE), [
  body('title').notEmpty().withMessage('Titel ist erforderlich'),
  body('start_date').optional().isISO8601().withMessage('Startdatum muss ein gültiges Datum sein'),
  body('end_date').optional().isISO8601().withMessage('Enddatum muss ein gültiges Datum sein'),
  body('is_active').optional().isBoolean().withMessage('Aktivstatus muss ein Boolean sein'),
  body('notes').optional().isString().withMessage('Notizen müssen ein Text sein')
], handleValidationErrors, InventorySessionController.createSession);

/**
 * @route   POST /api/inventory-sessions/:id/items
 * @desc    Neuen Inventureintrag zu einer Sitzung hinzufügen
 * @access  Private (Admin, Manager, Inventory Manager)
 */
router.post('/:id/items', authenticateToken, hasPermission(PERMISSIONS.INVENTORY_SESSION_MANAGE), [
  body('device_id').notEmpty().withMessage('Geräte-ID ist erforderlich').isInt().withMessage('Geräte-ID muss eine Zahl sein'),
  body('status').notEmpty().withMessage('Status ist erforderlich').isIn(['bestätigt', 'vermisst', 'beschädigt']).withMessage('Status muss bestätigt, vermisst oder beschädigt sein'),
  body('location').optional().isString().withMessage('Standort muss ein Text sein')
], handleValidationErrors, InventorySessionController.addItemToSession);

/**
 * @route   PUT /api/inventory-sessions/:id
 * @desc    Inventursitzung aktualisieren
 * @access  Private (Admin, Manager, Inventory Manager)
 */
router.put('/:id', authenticateToken, hasPermission(PERMISSIONS.INVENTORY_SESSION_MANAGE), [
  body('title').optional().notEmpty().withMessage('Titel darf nicht leer sein'),
  body('start_date').optional().isISO8601().withMessage('Startdatum muss ein gültiges Datum sein'),
  body('end_date').optional().isISO8601().withMessage('Enddatum muss ein gültiges Datum sein'),
  body('is_active').optional().isBoolean().withMessage('Aktivstatus muss ein Boolean sein'),
  body('notes').optional().isString().withMessage('Notizen müssen ein Text sein')
], handleValidationErrors, InventorySessionController.updateSession);

/**
 * @route   PATCH /api/inventory-sessions/:id/end
 * @desc    Inventursitzung beenden
 * @access  Private (Admin, Manager, Inventory Manager)
 */
router.patch('/:id/end', authenticateToken, hasPermission(PERMISSIONS.INVENTORY_SESSION_MANAGE), InventorySessionController.endSession);

/**
 * @route   DELETE /api/inventory-sessions/:id
 * @desc    Inventursitzung löschen
 * @access  Private (Admin, Inventory Manager)
 */
router.delete('/:id', authenticateToken, hasPermission(PERMISSIONS.INVENTORY_SESSION_MANAGE), InventorySessionController.deleteSession);

module.exports = router;
