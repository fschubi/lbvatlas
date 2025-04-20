const express = require('express');
const router = express.Router();
const { check } = require('express-validator');

// Versuche, den Cache für den Controller zu löschen
try {
    delete require.cache[require.resolve('../controllers/networkPortController')];
    console.log('Cache for NetworkPortController cleared.');
} catch (e) {
    console.warn('Could not clear cache for NetworkPortController:', e);
}

const NetworkPortController = require('../controllers/networkPortController');
console.log('Imported NetworkPortController (after cache clear attempt):', NetworkPortController);
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

// Berechtigungen (Beispiel, anpassen!)
const READ_NETWORKPORTS = 'network_ports.read';
const CREATE_NETWORKPORTS = 'network_ports.create';
const UPDATE_NETWORKPORTS = 'network_ports.update';
const DELETE_NETWORKPORTS = 'network_ports.delete';

// Middleware für alle Routen
// router.use(isAuthenticated); // Entfernt, da pro Route angewendet

// GET /api/network-ports - Alle Netzwerk-Ports
router.get(
    '/',
    authenticateToken,
    checkPermission(READ_NETWORKPORTS),
    NetworkPortController.getAllPorts
);

// GET /api/network-ports/:id - Ein Netzwerk-Port
router.get(
    '/:id',
    authenticateToken,
    checkPermission(READ_NETWORKPORTS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Netzwerk-Port-ID')],
    NetworkPortController.getPortById
);

// POST /api/network-ports - Neuen Netzwerk-Port erstellen
router.post(
    '/',
    authenticateToken,
    checkPermission(CREATE_NETWORKPORTS),
    // Logging Middleware
    (req, res, next) => {
        console.log('[Route /network-ports POST] Received body:', req.body);
        next();
    },
    // Validierungsregeln (NUR für port_number)
    [
        check('port_number', 'Portnummer ist erforderlich').isInt({ gt: 0 })
        // Entfernt: Custom Check für switch_id/network_socket_id
        // Entfernt: Check für switch_id
        // Entfernt: Check für network_socket_id
        // Entfernt: Check für is_active
    ],
    NetworkPortController.createPort
);

// PUT /api/network-ports/:id - Netzwerk-Port aktualisieren
router.put(
    '/:id',
    authenticateToken,
    checkPermission(UPDATE_NETWORKPORTS),
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
    NetworkPortController.updatePort
);

// DELETE /api/network-ports/:id - Netzwerk-Port löschen
router.delete(
    '/:id',
    authenticateToken,
    checkPermission(DELETE_NETWORKPORTS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Netzwerk-Port-ID')],
    NetworkPortController.deletePort
);

module.exports = router;
