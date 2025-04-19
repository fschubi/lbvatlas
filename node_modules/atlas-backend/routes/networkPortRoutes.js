const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const networkPortController = require('../controllers/networkPortController'); // Geändert
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionMiddleware');

// Berechtigungen (Beispiel, anpassen!)
const READ_NETWORKPORTS = 'networkports.read';
const CREATE_NETWORKPORTS = 'networkports.create';
const UPDATE_NETWORKPORTS = 'networkports.update';
const DELETE_NETWORKPORTS = 'networkports.delete';

// Middleware für alle Routen
router.use(authenticateToken);

// GET /api/network-ports - Alle Netzwerk-Ports
router.get('/', authorize(READ_NETWORKPORTS), networkPortController.getAllNetworkPorts);

// GET /api/network-ports/:id - Ein Netzwerk-Port
router.get(
    '/:id',
    authorize(READ_NETWORKPORTS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Netzwerk-Port-ID')],
    networkPortController.getNetworkPortById
);

// POST /api/network-ports - Neuen Netzwerk-Port erstellen
router.post(
    '/',
    authorize(CREATE_NETWORKPORTS),
    [
        check('port_number', 'Portnummer ist erforderlich').isInt({ gt: 0 }),
        // Entweder switch_id ODER network_socket_id muss angegeben werden
        check().custom((value, { req }) => {
            if (!req.body.switch_id && !req.body.network_socket_id) {
                throw new Error('Entweder Switch-ID oder Netzwerkdosen-ID muss angegeben werden');
            }
            if (req.body.switch_id && req.body.network_socket_id) {
                throw new Error('Es darf nur Switch-ID oder Netzwerkdosen-ID angegeben werden, nicht beides');
            }
            return true;
        }),
        check('switch_id', 'Switch-ID muss eine Zahl sein').optional({ nullable: true }).isInt({ gt: 0 }),
        check('network_socket_id', 'Netzwerkdosen-ID muss eine Zahl sein').optional({ nullable: true }).isInt({ gt: 0 }),
        check('is_active', 'isActive muss ein Boolean sein').optional().isBoolean(),
    ],
    networkPortController.createNetworkPort
);

// PUT /api/network-ports/:id - Netzwerk-Port aktualisieren
router.put(
    '/:id',
    authorize(UPDATE_NETWORKPORTS),
    [
        check('id').isInt({ gt: 0 }).withMessage('Ungültige Netzwerk-Port-ID'),
        check('port_number', 'Portnummer muss eine positive Zahl sein').optional().isInt({ gt: 0 }),
        // Validierung für switch_id/network_socket_id (optional, aber wenn, dann exklusiv)
        check().custom((value, { req }) => {
            if (req.body.switch_id && req.body.network_socket_id) {
                throw new Error('Es darf nur Switch-ID oder Netzwerkdosen-ID angegeben werden, nicht beides');
            }
            return true;
        }),
        check('switch_id', 'Switch-ID muss eine Zahl sein').optional({ nullable: true }).isInt({ gt: 0 }),
        check('network_socket_id', 'Netzwerkdosen-ID muss eine Zahl sein').optional({ nullable: true }).isInt({ gt: 0 }),
        check('is_active', 'isActive muss ein Boolean sein').optional().isBoolean(),
    ],
    networkPortController.updateNetworkPort
);

// DELETE /api/network-ports/:id - Netzwerk-Port löschen
router.delete(
    '/:id',
    authorize(DELETE_NETWORKPORTS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Netzwerk-Port-ID')],
    networkPortController.deleteNetworkPort
);

module.exports = router;
