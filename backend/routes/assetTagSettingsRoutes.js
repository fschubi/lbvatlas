const express = require('express');
const router = express.Router();
const { body, check } = require('express-validator');
const assetTagSettingsController = require('../controllers/assetTagSettingsController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionMiddleware');

// Berechtigungen
const READ_ASSET_TAG_SETTINGS = 'asset_tag_settings.read';
const CREATE_ASSET_TAG_SETTINGS = 'asset_tag_settings.create';
const UPDATE_ASSET_TAG_SETTINGS = 'asset_tag_settings.update';
const GENERATE_NEXT_ASSET_TAG = 'asset_tag_settings.generate_next';

// Middleware für alle Routen
router.use(authenticateToken);

// Asset Tag-Einstellungen Validierungen (aus settings.js kopiert)
const assetTagSettingsValidation = [
  body('prefix')
    .notEmpty().withMessage('Das Präfix darf nicht leer sein')
    .isString().withMessage('Das Präfix muss ein Text sein')
    .isLength({ max: 10 }).withMessage('Das Präfix darf maximal 10 Zeichen lang sein'),
  body('digitCount')
    .notEmpty().withMessage('Die Anzahl der Stellen darf nicht leer sein')
    .isInt({ min: 1, max: 10 }).withMessage('Die Anzahl der Stellen muss zwischen 1 und 10 liegen'),
  body('currentNumber')
    .notEmpty().withMessage('Die aktuelle Nummer darf nicht leer sein')
    .isInt({ min: 1 }).withMessage('Die aktuelle Nummer muss mindestens 1 sein')
];

// GET /api/asset-tag-settings - Einstellungen abrufen
router.get('/', authorize(READ_ASSET_TAG_SETTINGS), assetTagSettingsController.getSettings);

// POST /api/asset-tag-settings - Einstellungen erstellen
router.post(
    '/',
    authorize(CREATE_ASSET_TAG_SETTINGS),
    assetTagSettingsValidation,
    assetTagSettingsController.createSettings
);

// PUT /api/asset-tag-settings/:id - Einstellungen aktualisieren
router.put(
    '/:id',
    authorize(UPDATE_ASSET_TAG_SETTINGS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Einstellungs-ID')], // ID-Validierung hinzugefügt
    assetTagSettingsValidation,
    assetTagSettingsController.updateSettings
);

// GET /api/asset-tag-settings/next - Nächsten Asset Tag generieren
router.get('/next', authorize(GENERATE_NEXT_ASSET_TAG), assetTagSettingsController.generateNextAssetTag);

module.exports = router;
