const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const categoryController = require('../controllers/categoryController'); // Neuer Controller
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionMiddleware');

// Berechtigungen
const READ_CATEGORIES = 'categories.read';
const CREATE_CATEGORIES = 'categories.create';
const UPDATE_CATEGORIES = 'categories.update';
const DELETE_CATEGORIES = 'categories.delete';

// Middleware für alle Routen
router.use(authenticateToken);

// GET /api/categories - Alle Kategorien
router.get('/', authorize(READ_CATEGORIES), categoryController.getAllCategories);

// GET /api/categories/:id - Eine Kategorie
router.get(
    '/:id',
    authorize(READ_CATEGORIES),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Category-ID')],
    categoryController.getCategoryById
);

// POST /api/categories - Neue Kategorie erstellen
router.post(
    '/',
    authorize(CREATE_CATEGORIES),
    [
        check('name').not().isEmpty().withMessage('Name ist erforderlich').trim()
        // Füge weitere Validierungen hinzu (z.B. parent_id)
    ],
    categoryController.createCategory
);

// PUT /api/categories/:id - Kategorie aktualisieren
router.put(
    '/:id',
    authorize(UPDATE_CATEGORIES),
    [
        check('id').isInt({ gt: 0 }).withMessage('Ungültige Category-ID'),
        check('name').not().isEmpty().withMessage('Name ist erforderlich').trim()
        // Füge weitere Validierungen hinzu
    ],
    categoryController.updateCategory
);

// DELETE /api/categories/:id - Kategorie löschen
router.delete(
    '/:id',
    authorize(DELETE_CATEGORIES),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Category-ID')],
    categoryController.deleteCategory
);

module.exports = router;
