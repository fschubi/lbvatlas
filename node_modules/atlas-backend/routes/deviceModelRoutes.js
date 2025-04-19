const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const deviceModelController = require('../controllers/deviceModelController'); // Wird als nächstes erstellt
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionMiddleware');

// Berechtigungen
const READ_DEVICEMODELS = 'devicemodels.read';
const CREATE_DEVICEMODELS = 'devicemodels.create';
const UPDATE_DEVICEMODELS = 'devicemodels.update';
const DELETE_DEVICEMODELS = 'devicemodels.delete';

// Middleware für alle Routen
router.use(authenticateToken);

// GET /api/devicemodels - Alle Gerätemodelle
router.get('/', authorize(READ_DEVICEMODELS), deviceModelController.getAllDeviceModels);

// GET /api/devicemodels/counts - Anzahl Geräte pro Modell (Beispiel für spezielle Route)
router.get('/counts', authorize(READ_DEVICEMODELS), deviceModelController.getDeviceCountsByModel);

// GET /api/devicemodels/:id - Ein Gerätemodell
router.get(
    '/:id',
    authorize(READ_DEVICEMODELS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige DeviceModel-ID')],
    deviceModelController.getDeviceModelById
);

// POST /api/devicemodels - Neues Gerätemodell erstellen
router.post(
    '/',
    authorize(CREATE_DEVICEMODELS),
    [
        check('name', 'Name ist erforderlich').not().isEmpty().trim(),
        check('manufacturerId', 'Hersteller-ID ist erforderlich und muss eine Zahl sein').isInt({ gt: 0 }),
        check('categoryId', 'Kategorie-ID ist erforderlich und muss eine Zahl sein').isInt({ gt: 0 }),
        check('warrantyMonths', 'Garantie muss eine Zahl sein (optional)').optional().isInt({ min: 0 }),
        check('isActive', 'isActive muss ein Boolean sein (optional)').optional().isBoolean()
    ],
    deviceModelController.createDeviceModel
);

// PUT /api/devicemodels/:id - Gerätemodell aktualisieren
router.put(
    '/:id',
    authorize(UPDATE_DEVICEMODELS),
    [
        check('id').isInt({ gt: 0 }).withMessage('Ungültige DeviceModel-ID'),
        check('name', 'Name ist erforderlich').optional().not().isEmpty().trim(), // Optional, falls nur andere Felder geändert werden
        check('manufacturerId', 'Hersteller-ID muss eine Zahl sein').optional().isInt({ gt: 0 }),
        check('categoryId', 'Kategorie-ID muss eine Zahl sein').optional().isInt({ gt: 0 }),
        check('warrantyMonths', 'Garantie muss eine Zahl sein').optional().isInt({ min: 0 }),
        check('isActive', 'isActive muss ein Boolean sein').optional().isBoolean()
    ],
    deviceModelController.updateDeviceModel
);

// DELETE /api/devicemodels/:id - Gerätemodell löschen
router.delete(
    '/:id',
    authorize(DELETE_DEVICEMODELS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige DeviceModel-ID')],
    deviceModelController.deleteDeviceModel
);

module.exports = router;
