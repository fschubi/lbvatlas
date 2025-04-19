const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const supplierController = require('../controllers/supplierController'); // Neuer Controller
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionMiddleware');

// Berechtigungen
const READ_SUPPLIERS = 'suppliers.read';
const CREATE_SUPPLIERS = 'suppliers.create';
const UPDATE_SUPPLIERS = 'suppliers.update';
const DELETE_SUPPLIERS = 'suppliers.delete';

// Middleware für alle Routen
router.use(authenticateToken);

// GET /api/suppliers - Alle Lieferanten
router.get('/', authorize(READ_SUPPLIERS), supplierController.getAllSuppliers);

// GET /api/suppliers/:id - Ein Lieferant
router.get(
    '/:id',
    authorize(READ_SUPPLIERS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Supplier-ID')],
    supplierController.getSupplierById
);

// POST /api/suppliers - Neuen Lieferanten erstellen
router.post(
    '/',
    authorize(CREATE_SUPPLIERS),
    [
        check('name').not().isEmpty().withMessage('Name ist erforderlich').trim()
    ],
    supplierController.createSupplier
);

// PUT /api/suppliers/:id - Lieferanten aktualisieren
router.put(
    '/:id',
    authorize(UPDATE_SUPPLIERS),
    [
        check('id').isInt({ gt: 0 }).withMessage('Ungültige Supplier-ID'),
        check('name').not().isEmpty().withMessage('Name ist erforderlich').trim()
    ],
    supplierController.updateSupplier
);

// DELETE /api/suppliers/:id - Lieferanten löschen
router.delete(
    '/:id',
    authorize(DELETE_SUPPLIERS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Supplier-ID')],
    supplierController.deleteSupplier
);

module.exports = router;
