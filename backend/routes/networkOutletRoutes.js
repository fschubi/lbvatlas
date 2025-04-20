const express = require('express');
const router = express.Router();
const { check, body, param } = require('express-validator');
const NetworkOutletController = require('../controllers/networkOutletController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

// Berechtigungen (Beispielnamen, ggf. anpassen/in DB anlegen!)
const READ_NETWORK_OUTLETS = 'network_outlets.read';
const CREATE_NETWORK_OUTLETS = 'network_outlets.create';
const UPDATE_NETWORK_OUTLETS = 'network_outlets.update';
const DELETE_NETWORK_OUTLETS = 'network_outlets.delete';

const createNetworkOutletValidation = [
  body('outletNumber')
    .trim()
    .notEmpty().withMessage('Dosennummer ist erforderlich.')
    .isLength({ min: 1, max: 50 }).withMessage('Dosennummer darf maximal 50 Zeichen lang sein.'),
  body('locationId')
    .optional({ nullable: true })
    .isInt({ gt: 0 }).withMessage('Ungültige Standort-ID.'),
  body('roomId')
    .optional({ nullable: true })
    .isInt({ gt: 0 }).withMessage('Ungültige Raum-ID.'),
  body('description')
    .optional({ nullable: true })
    .isLength({ max: 255 }).withMessage('Beschreibung darf maximal 255 Zeichen lang sein.'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive muss ein Boolean sein.'),
];

const updateNetworkOutletValidation = [
  param('id').isInt({ gt: 0 }).withMessage('Ungültige ID.'),
  body('outletNumber')
    .optional()
    .trim()
    .notEmpty().withMessage('Dosennummer darf nicht leer sein, wenn angegeben.')
    .isLength({ min: 1, max: 50 }).withMessage('Dosennummer darf maximal 50 Zeichen lang sein.'),
  body('locationId')
    .optional({ nullable: true })
    .isInt({ gt: 0 }).withMessage('Ungültige Standort-ID.'),
  body('roomId')
    .optional({ nullable: true })
    .isInt({ gt: 0 }).withMessage('Ungültige Raum-ID.'),
  body('description')
    .optional({ nullable: true })
    .isLength({ max: 255 }).withMessage('Beschreibung darf maximal 255 Zeichen lang sein.'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive muss ein Boolean sein.'),
];

// GET /api/network-outlets - Alle Netzwerkdosen abrufen
router.get(
    '/',
    authenticateToken,
    checkPermission(READ_NETWORK_OUTLETS),
    NetworkOutletController.getAllOutlets
);

// GET /api/network-outlets/:id - Eine Netzwerkdose nach ID abrufen
router.get(
    '/:id',
    authenticateToken,
    checkPermission(READ_NETWORK_OUTLETS),
    param('id').isInt({ gt: 0 }).withMessage('Ungültige ID.'),
    handleValidationErrors,
    NetworkOutletController.getOutletById
);

// POST /api/network-outlets - Neue Netzwerkdose erstellen
router.post(
    '/',
    authenticateToken,
    checkPermission(CREATE_NETWORK_OUTLETS),
    createNetworkOutletValidation,
    handleValidationErrors,
    NetworkOutletController.createOutlet
);

// PUT /api/network-outlets/:id - Netzwerkdose aktualisieren
router.put(
    '/:id',
    authenticateToken,
    checkPermission(UPDATE_NETWORK_OUTLETS),
    updateNetworkOutletValidation,
    handleValidationErrors,
    NetworkOutletController.updateOutlet
);

// DELETE /api/network-outlets/:id - Netzwerkdose löschen
router.delete(
    '/:id',
    authenticateToken,
    checkPermission(DELETE_NETWORK_OUTLETS),
    param('id').isInt({ gt: 0 }).withMessage('Ungültige ID.'),
    handleValidationErrors,
    NetworkOutletController.deleteOutlet
);

module.exports = router;
