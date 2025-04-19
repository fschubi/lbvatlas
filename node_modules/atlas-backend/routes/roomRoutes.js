const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const roomController = require('../controllers/roomController'); // Neuer Controller
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionMiddleware');

// Berechtigungen
const READ_ROOMS = 'rooms.read';
const CREATE_ROOMS = 'rooms.create';
const UPDATE_ROOMS = 'rooms.update';
const DELETE_ROOMS = 'rooms.delete';

// Middleware für alle Routen
router.use(authenticateToken);

// GET /api/rooms - Alle Räume
router.get('/', authorize(READ_ROOMS), roomController.getAllRooms);

// GET /api/rooms/:id - Ein Raum
router.get(
    '/:id',
    authorize(READ_ROOMS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Room-ID')],
    roomController.getRoomById
);

// POST /api/rooms - Neuen Raum erstellen
router.post(
    '/',
    authorize(CREATE_ROOMS),
    [
        check('name', 'Name ist erforderlich').not().isEmpty().trim(),
        check('name', 'Name darf maximal 100 Zeichen haben').isLength({ max: 100 }),
        check('location_id', 'Standort-ID muss eine Zahl sein').optional().isInt({ gt: 0 })
    ],
    roomController.createRoom
);

// PUT /api/rooms/:id - Raum aktualisieren
router.put(
    '/:id',
    authorize(UPDATE_ROOMS),
    [
        check('id').isInt({ gt: 0 }).withMessage('Ungültige Room-ID'),
        check('name', 'Name darf maximal 100 Zeichen haben').optional().isLength({ max: 100 }).trim(),
        check('location_id', 'Standort-ID muss eine Zahl sein').optional().isInt({ gt: 0 })
    ],
    roomController.updateRoom
);

// DELETE /api/rooms/:id - Raum löschen
router.delete(
    '/:id',
    authorize(DELETE_ROOMS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Room-ID')],
    roomController.deleteRoom
);

module.exports = router;
