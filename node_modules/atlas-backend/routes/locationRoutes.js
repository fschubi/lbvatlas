const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const locationController = require('../controllers/locationController'); // Neuer Controller
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionMiddleware');

// Definiere Berechtigungs-Strings für Locations
const READ_LOCATIONS = 'locations.read';
const CREATE_LOCATIONS = 'locations.create';
const UPDATE_LOCATIONS = 'locations.update';
const DELETE_LOCATIONS = 'locations.delete';

// Alle Location-Routen erfordern Authentifizierung
router.use(authenticateToken);

// GET /api/locations - Alle Standorte abrufen
router.get(
    '/',
    authorize(READ_LOCATIONS),
    locationController.getAllLocations
);

// GET /api/locations/:id - Einen Standort abrufen
router.get(
    '/:id',
    authorize(READ_LOCATIONS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Location-ID')], // Param-Validierung
    locationController.getLocationById
);

// POST /api/locations - Neuen Standort erstellen
router.post(
  '/',
  authorize(CREATE_LOCATIONS),
  [
    check('name', 'Name ist erforderlich').not().isEmpty().trim(),
    check('name', 'Name darf maximal 100 Zeichen haben').isLength({ max: 100 }),
    check('city', 'Stadt ist erforderlich').not().isEmpty().trim()
    // Füge hier weitere Validierungen hinzu (address, zip etc.) falls nötig
  ],
  locationController.createLocation
);

// PUT /api/locations/:id - Standort aktualisieren
router.put(
  '/:id',
  authorize(UPDATE_LOCATIONS),
  [
    check('id').isInt({ gt: 0 }).withMessage('Ungültige Location-ID'),
    check('name', 'Name ist erforderlich').not().isEmpty().trim(),
    check('name', 'Name darf maximal 100 Zeichen haben').isLength({ max: 100 }),
    check('city', 'Stadt ist erforderlich').not().isEmpty().trim()
     // Füge hier weitere Validierungen hinzu (address, zip etc.) falls nötig
  ],
  locationController.updateLocation
);

// DELETE /api/locations/:id - Standort löschen
router.delete(
  '/:id',
  authorize(DELETE_LOCATIONS),
  [check('id').isInt({ gt: 0 }).withMessage('Ungültige Location-ID')], // Param-Validierung
  locationController.deleteLocation
);

// NEUE ROUTE: GET /api/locations/:locationId/rooms - Räume für einen Standort abrufen
router.get(
    '/:locationId/rooms',
    authorize(READ_LOCATIONS), // Annahme: Leseberechtigung für Standorte genügt, um Räume zu sehen?
    [check('locationId').isInt({ gt: 0 }).withMessage('Ungültige Location-ID')],
    locationController.getRoomsByLocationId // Neue Controller-Funktion
);

module.exports = router;
