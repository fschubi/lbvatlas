const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const switchController = require('../controllers/switchController'); // Geändert
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionMiddleware');

// Berechtigungen (Beispiel, anpassen!)
const READ_SWITCHES = 'switches.read';
const CREATE_SWITCHES = 'switches.create';
const UPDATE_SWITCHES = 'switches.update';
const DELETE_SWITCHES = 'switches.delete';

// Middleware für alle Routen
router.use(authenticateToken);

// GET /api/switches - Alle Switches
router.get('/', authorize(READ_SWITCHES), switchController.getAllSwitches);

// GET /api/switches/:id - Ein Switch
router.get(
    '/:id',
    authorize(READ_SWITCHES),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Switch-ID')],
    switchController.getSwitchById
);

// POST /api/switches - Neuen Switch erstellen
router.post(
    '/',
    authorize(CREATE_SWITCHES),
    [
        check('name', 'Name ist erforderlich').not().isEmpty().trim(),
        check('ip_address', 'Gültige IP-Adresse ist erforderlich').isIP().optional({ nullable: true, checkFalsy: true }),
        check('mac_address', 'Gültige MAC-Adresse ist erforderlich').isMACAddress().optional({ nullable: true, checkFalsy: true }),
        check('manufacturer_id', 'Hersteller-ID muss eine Zahl sein').optional().isInt({ gt: 0 }),
        check('location_id', 'Standort-ID muss eine Zahl sein').optional().isInt({ gt: 0 }),
        check('room_id', 'Raum-ID muss eine Zahl sein').optional().isInt({ gt: 0 }),
        check('cabinet_id', 'Schrank-ID muss eine Zahl sein').optional().isInt({ gt: 0 }),
        check('port_count', 'Portanzahl muss eine positive Zahl sein').optional().isInt({ gt: 0 }),
        check('isActive', 'isActive muss ein Boolean sein').optional().isBoolean(),
    ],
    switchController.createSwitch
);

// PUT /api/switches/:id - Switch aktualisieren
router.put(
    '/:id',
    authorize(UPDATE_SWITCHES),
    [
        check('id').isInt({ gt: 0 }).withMessage('Ungültige Switch-ID'),
        check('name', 'Name darf nicht leer sein').optional().not().isEmpty().trim(),
        check('ip_address', 'Gültige IP-Adresse ist erforderlich').optional({ nullable: true, checkFalsy: true }).isIP(),
        check('mac_address', 'Gültige MAC-Adresse ist erforderlich').optional({ nullable: true, checkFalsy: true }).isMACAddress(),
        check('manufacturer_id', 'Hersteller-ID muss eine Zahl sein').optional().isInt({ gt: 0 }),
        check('location_id', 'Standort-ID muss eine Zahl sein').optional().isInt({ gt: 0 }),
        check('room_id', 'Raum-ID muss eine Zahl sein').optional().isInt({ gt: 0 }),
        check('cabinet_id', 'Schrank-ID muss eine Zahl sein').optional().isInt({ gt: 0 }),
        check('port_count', 'Portanzahl muss eine positive Zahl sein').optional().isInt({ gt: 0 }),
        check('isActive', 'isActive muss ein Boolean sein').optional().isBoolean(),
    ],
    switchController.updateSwitch
);

// DELETE /api/switches/:id - Switch löschen
router.delete(
    '/:id',
    authorize(DELETE_SWITCHES),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Switch-ID')],
    switchController.deleteSwitch
);

module.exports = router;
