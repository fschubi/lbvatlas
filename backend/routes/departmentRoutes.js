const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const departmentController = require('../controllers/departmentController'); // Neuer Controller
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionMiddleware');

// Berechtigungen
const READ_DEPARTMENTS = 'departments.read';
const CREATE_DEPARTMENTS = 'departments.create';
const UPDATE_DEPARTMENTS = 'departments.update';
const DELETE_DEPARTMENTS = 'departments.delete';

// Middleware für alle Routen
router.use(authenticateToken);

// GET /api/departments - Alle Abteilungen
router.get('/', authorize(READ_DEPARTMENTS), departmentController.getAllDepartments);

// GET /api/departments/:id - Eine Abteilung
router.get(
    '/:id',
    authorize(READ_DEPARTMENTS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Department-ID')],
    departmentController.getDepartmentById
);

// POST /api/departments - Neue Abteilung erstellen
router.post(
    '/',
    authorize(CREATE_DEPARTMENTS),
    [
        check('name', 'Name ist erforderlich').not().isEmpty().trim(),
        check('name', 'Name darf maximal 100 Zeichen haben').isLength({ max: 100 })
    ],
    departmentController.createDepartment
);

// PUT /api/departments/:id - Abteilung aktualisieren
router.put(
    '/:id',
    authorize(UPDATE_DEPARTMENTS),
    [
        check('id').isInt({ gt: 0 }).withMessage('Ungültige Department-ID'),
        check('name', 'Name ist erforderlich').not().isEmpty().trim(),
        check('name', 'Name darf maximal 100 Zeichen haben').isLength({ max: 100 })
    ],
    departmentController.updateDepartment
);

// DELETE /api/departments/:id - Abteilung löschen
router.delete(
    '/:id',
    authorize(DELETE_DEPARTMENTS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Department-ID')],
    departmentController.deleteDepartment
);

module.exports = router;
