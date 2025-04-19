const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const networkSocketController = require('../controllers/networkSocketController'); // Geändert
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionMiddleware');

// Berechtigungen (Beispiel, anpassen!)
const READ_NETWORKSOCKETS = 'networksockets.read';
const CREATE_NETWORKSOCKETS = 'networksockets.create';
const UPDATE_NETWORKSOCKETS = 'networksockets.update';
const DELETE_NETWORKSOCKETS = 'networksockets.delete';

// Middleware für alle Routen
router.use(authenticateToken);

// GET /api/network-sockets - Alle Netzwerkdosen
router.get('/', authorize(READ_NETWORKSOCKETS), networkSocketController.getAllNetworkSockets);

// GET /api/network-sockets/:id - Eine Netzwerkdose
router.get(
    '/:id',
    authorize(READ_NETWORKSOCKETS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Netzwerkdosen-ID')],
    networkSocketController.getNetworkSocketById
);

// POST /api/network-sockets - Neue Netzwerkdose erstellen
router.post(
    '/',
    authorize(CREATE_NETWORKSOCKETS),
    [
        check('outlet_number', 'Dosennummer ist erforderlich').not().isEmpty().trim(),
        check('location_id', 'Standort-ID muss eine Zahl sein').optional().isInt({ gt: 0 }),
        check('room_id', 'Raum-ID muss eine Zahl sein').optional().isInt({ gt: 0 }),
        check('is_active', 'isActive muss ein Boolean sein').optional().isBoolean(),
    ],
    networkSocketController.createNetworkSocket
);

// PUT /api/network-sockets/:id - Netzwerkdose aktualisieren
router.put(
    '/:id',
    authorize(UPDATE_NETWORKSOCKETS),
    [
        check('id').isInt({ gt: 0 }).withMessage('Ungültige Netzwerkdosen-ID'),
        check('outlet_number', 'Dosennummer darf nicht leer sein').optional().not().isEmpty().trim(),
        check('location_id', 'Standort-ID muss eine Zahl sein').optional().isInt({ gt: 0 }),
        check('room_id', 'Raum-ID muss eine Zahl sein').optional().isInt({ gt: 0 }),
        check('is_active', 'isActive muss ein Boolean sein').optional().isBoolean(),
    ],
    networkSocketController.updateNetworkSocket
);

// DELETE /api/network-sockets/:id - Netzwerkdose löschen
router.delete(
    '/:id',
    authorize(DELETE_NETWORKSOCKETS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Netzwerkdosen-ID')],
    networkSocketController.deleteNetworkSocket
);

module.exports = router;
