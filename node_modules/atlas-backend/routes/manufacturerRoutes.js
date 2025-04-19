const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const manufacturerController = require('../controllers/manufacturerController'); // Geändert
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionMiddleware');

// Berechtigungen
const READ_MANUFACTURERS = 'manufacturers.read';
const CREATE_MANUFACTURERS = 'manufacturers.create';
const UPDATE_MANUFACTURERS = 'manufacturers.update';
const DELETE_MANUFACTURERS = 'manufacturers.delete';

// Middleware für alle Routen
router.use(authenticateToken);

// GET /api/manufacturers - Alle Hersteller
router.get('/', authorize(READ_MANUFACTURERS), manufacturerController.getAllManufacturers);

// GET /api/manufacturers/:id - Ein Hersteller
router.get(
    '/:id',
    authorize(READ_MANUFACTURERS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Manufacturer-ID')],
    manufacturerController.getManufacturerById
);

// POST /api/manufacturers - Neuen Hersteller erstellen
router.post(
    '/',
    authorize(CREATE_MANUFACTURERS),
    [
        check('name', 'Name ist erforderlich').not().isEmpty().trim(),
        // Weitere Validierungen für description, website etc. hinzufügen
    ],
    manufacturerController.createManufacturer
);

// PUT /api/manufacturers/:id - Hersteller aktualisieren
router.put(
    '/:id',
    authorize(UPDATE_MANUFACTURERS),
    [
        check('id').isInt({ gt: 0 }).withMessage('Ungültige Manufacturer-ID'),
        check('name', 'Name ist erforderlich').not().isEmpty().trim(),
         // Weitere Validierungen
    ],
    manufacturerController.updateManufacturer
);

// DELETE /api/manufacturers/:id - Hersteller löschen
router.delete(
    '/:id',
    authorize(DELETE_MANUFACTURERS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Manufacturer-ID')],
    manufacturerController.deleteManufacturer
);

module.exports = router;
