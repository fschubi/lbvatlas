const express = require('express');
const router = express.Router();
const { check, body } = require('express-validator');
const settingsController = require('../controllers/settingsController');
const assetTagSettingsController = require('../controllers/assetTagSettingsController');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authorizeMiddleware');
const { ROLES } = require('../constants/roles');

console.log('Controller geladen:', Object.keys(settingsController));


// Temporär authMiddleware entfernen für das Frontend-Testing
const tempAuthMiddleware = (req, res, next) => next();
const tempCheckRole = () => (req, res, next) => next();
const authenticateToken = tempAuthMiddleware; // Für Kompatibilität

// Kategorie-Routen
router.get('/categories', settingsController.getAllCategories);
router.get('/categories/:id', settingsController.getCategoryById);
router.post('/categories', [
  check('name').not().isEmpty().withMessage('Name ist erforderlich')
], settingsController.createCategory);
router.put('/categories/:id', [
  check('name').not().isEmpty().withMessage('Name ist erforderlich')
], settingsController.updateCategory);
router.delete('/categories/:id', settingsController.deleteCategory);

// Hersteller-Routen
router.get('/manufacturers', settingsController.getAllManufacturers);
router.get('/manufacturers/:id', settingsController.getManufacturerById);
router.post('/manufacturers', [
  check('name').not().isEmpty().withMessage('Name ist erforderlich')
], settingsController.createManufacturer);
router.put('/manufacturers/:id', [
  check('name').not().isEmpty().withMessage('Name ist erforderlich')
], settingsController.updateManufacturer);
router.delete('/manufacturers/:id', settingsController.deleteManufacturer);

// Standorte Routen
router.get('/locations', settingsController.getAllLocations);
router.get('/locations/:id', settingsController.getLocationById);

router.post(
  '/locations',
  tempAuthMiddleware,
  tempCheckRole(['admin', 'manager']),
  [
    check('name', 'Name ist erforderlich').not().isEmpty(),
    check('name', 'Name darf maximal 100 Zeichen haben').isLength({ max: 100 }),
    check('city', 'Stadt ist erforderlich').not().isEmpty()
  ],
  settingsController.createLocation
);

router.put(
  '/locations/:id',
  tempAuthMiddleware,
  tempCheckRole(['admin', 'manager']),
  [
    check('name', 'Name ist erforderlich').not().isEmpty(),
    check('name', 'Name darf maximal 100 Zeichen haben').isLength({ max: 100 }),
    check('city', 'Stadt ist erforderlich').not().isEmpty()
  ],
  settingsController.updateLocation
);

router.delete(
  '/locations/:id',
  tempAuthMiddleware,
  tempCheckRole(['admin']),
  settingsController.deleteLocation
);

// Abteilungen Routen
router.get('/departments', settingsController.getAllDepartments);
router.get('/departments/:id', settingsController.getDepartmentById);

router.post(
  '/departments',
  tempAuthMiddleware,
  tempCheckRole(['admin', 'manager']),
  [
    check('name', 'Name ist erforderlich').not().isEmpty(),
    check('name', 'Name darf maximal 100 Zeichen haben').isLength({ max: 100 })
  ],
  settingsController.createDepartment
);

router.put(
  '/departments/:id',
  tempAuthMiddleware,
  tempCheckRole(['admin', 'manager']),
  [
    check('name', 'Name ist erforderlich').not().isEmpty(),
    check('name', 'Name darf maximal 100 Zeichen haben').isLength({ max: 100 })
  ],
  settingsController.updateDepartment
);

router.delete(
  '/departments/:id',
  tempAuthMiddleware,
  tempCheckRole(['admin']),
  settingsController.deleteDepartment
);

// Räume Routen
router.get('/rooms', settingsController.getAllRooms);
router.get('/rooms/:id', settingsController.getRoomById);

router.post(
  '/rooms',
  tempAuthMiddleware,
  tempCheckRole(['admin', 'manager']),
  [
    check('name', 'Name ist erforderlich').not().isEmpty(),
    check('name', 'Name darf maximal 100 Zeichen haben').isLength({ max: 100 }),
    check('location_id', 'Standort-ID muss eine Zahl sein').optional().isNumeric()
  ],
  settingsController.createRoom
);

router.put(
  '/rooms/:id',
  tempAuthMiddleware,
  tempCheckRole(['admin', 'manager']),
  [
    check('name', 'Name darf maximal 100 Zeichen haben').optional().isLength({ max: 100 }),
    check('location_id', 'Standort-ID muss eine Zahl sein').optional().isNumeric()
  ],
  settingsController.updateRoom
);

router.delete(
  '/rooms/:id',
  tempAuthMiddleware,
  tempCheckRole(['admin']),
  settingsController.deleteRoom
);

// Lieferanten-Routen
router.get('/suppliers', tempAuthMiddleware, settingsController.getAllSuppliers);
router.get('/suppliers/:id', tempAuthMiddleware, settingsController.getSupplierById);

router.post(
  '/suppliers',
  tempAuthMiddleware,
  tempCheckRole(['admin', 'manager']),
  [
    check('name').not().isEmpty().withMessage('Name ist erforderlich')
  ],
  settingsController.createSupplier
);

router.put(
  '/suppliers/:id',
  tempAuthMiddleware,
  tempCheckRole(['admin', 'manager']),
  [
    check('name').not().isEmpty().withMessage('Name ist erforderlich')
  ],
  settingsController.updateSupplier
);

router.delete(
  '/suppliers/:id',
  tempAuthMiddleware,
  tempCheckRole(['admin']),
  settingsController.deleteSupplier
);

// Systemeinstellungen Routen
router.get(
  '/system',
  tempAuthMiddleware,
  tempCheckRole(['admin']),
  settingsController.getSystemSettings
);

router.put(
  '/system',
  tempAuthMiddleware,
  tempCheckRole(['admin']),
  [
    check('*', 'Systemeinstellungen müssen gültige Werte enthalten').optional()
  ],
  settingsController.updateSystemSettings
);

// Switch-Routen
router.get('/switches', tempAuthMiddleware, settingsController.getAllSwitches);
router.get('/switches/:id', tempAuthMiddleware, settingsController.getSwitchById);

router.post(
  '/switches',
  tempAuthMiddleware,
  tempCheckRole(['admin', 'manager']),
  [
    check('name').not().isEmpty().withMessage('Name ist erforderlich')
  ],
  settingsController.createSwitch
);

router.put(
  '/switches/:id',
  tempAuthMiddleware,
  tempCheckRole(['admin', 'manager']),
  [
    check('name').not().isEmpty().withMessage('Name ist erforderlich')
  ],
  settingsController.updateSwitch
);

router.delete(
  '/switches/:id',
  tempAuthMiddleware,
  tempCheckRole(['admin']),
  settingsController.deleteSwitch
);

// Netzwerkdosen-Routen
router.get('/network-sockets', settingsController.getAllNetworkSockets);
router.get('/network-sockets/:id', settingsController.getNetworkSocketById);
router.post('/network-sockets', settingsController.createNetworkSocket);
router.put('/network-sockets/:id', settingsController.updateNetworkSocket);
router.delete('/network-sockets/:id', settingsController.deleteNetworkSocket);

// Netzwerk-Ports-Routen
router.get('/network-ports', settingsController.getAllNetworkPorts);
router.get('/network-ports/:id', settingsController.getNetworkPortById);
router.post('/network-ports', settingsController.createNetworkPort);
router.put('/network-ports/:id', settingsController.updateNetworkPort);
router.delete('/network-ports/:id', settingsController.deleteNetworkPort);

// Gerätemodell-Routen
router.get('/device-models', settingsController.getAllDeviceModels);
router.get('/device-models/:id', settingsController.getDeviceModelById);
router.get('/device-models-count', settingsController.getDeviceCountsByModel);

router.post(
  '/device-models',
  tempAuthMiddleware,
  tempCheckRole(['admin', 'manager']),
  [
    check('name').not().isEmpty().withMessage('Name ist erforderlich'),
    check('manufacturerId').not().isEmpty().withMessage('Hersteller ist erforderlich'),
    check('categoryId').not().isEmpty().withMessage('Kategorie ist erforderlich')
  ],
  settingsController.createDeviceModel
);

router.put(
  '/device-models/:id',
  tempAuthMiddleware,
  tempCheckRole(['admin', 'manager']),
  [
    check('name').optional().not().isEmpty().withMessage('Name darf nicht leer sein'),
    check('manufacturerId').optional().isNumeric().withMessage('Hersteller-ID muss eine Zahl sein'),
    check('categoryId').optional().isNumeric().withMessage('Kategorie-ID muss eine Zahl sein'),
    check('warrantyMonths').optional().isNumeric().withMessage('Garantiezeit muss eine Zahl sein')
  ],
  settingsController.updateDeviceModel
);

router.delete(
  '/device-models/:id',
  tempAuthMiddleware,
  tempCheckRole(['admin']),
  settingsController.deleteDeviceModel
);

// Asset Tag-Einstellungen Validierungen
const assetTagSettingsValidation = [
  body('prefix')
    .notEmpty().withMessage('Das Präfix darf nicht leer sein')
    .isString().withMessage('Das Präfix muss ein Text sein')
    .isLength({ max: 10 }).withMessage('Das Präfix darf maximal 10 Zeichen lang sein'),
  body('digitCount')
    .notEmpty().withMessage('Die Anzahl der Stellen darf nicht leer sein')
    .isInt({ min: 1, max: 10 }).withMessage('Die Anzahl der Stellen muss zwischen 1 und 10 liegen'),
  body('currentNumber')
    .notEmpty().withMessage('Die aktuelle Nummer darf nicht leer sein')
    .isInt({ min: 1 }).withMessage('Die aktuelle Nummer muss mindestens 1 sein')
];

// Asset Tag-Einstellungen Routen
router.get('/asset-tags', authenticateToken, assetTagSettingsController.getSettings);
router.post('/asset-tags', authenticateToken, assetTagSettingsValidation, assetTagSettingsController.createSettings);
router.put('/asset-tags/:id', authenticateToken, assetTagSettingsValidation, assetTagSettingsController.updateSettings);
router.get('/asset-tags/next', authenticateToken, assetTagSettingsController.generateNextAssetTag);

// Label-Settings Routen
router.get('/label-settings', tempAuthMiddleware, settingsController.getLabelSettings);
router.post('/label-settings', tempAuthMiddleware, settingsController.saveLabelSettings);

// Label-Templates Routen
router.get('/label-templates', tempAuthMiddleware, settingsController.getLabelTemplates);
router.get('/label-templates/:id', tempAuthMiddleware, settingsController.getLabelTemplateById);
router.post('/label-templates', tempAuthMiddleware, settingsController.createLabelTemplate);
router.put('/label-templates/:id', tempAuthMiddleware, settingsController.updateLabelTemplate);
router.delete('/label-templates/:id', tempAuthMiddleware, settingsController.deleteLabelTemplate);

// Label-Template Versionsverwaltung
router.get('/label-templates/:id/versions', tempAuthMiddleware, settingsController.getLabelTemplateVersions);
router.post('/label-templates/:id/revert/:versionId', tempAuthMiddleware, settingsController.revertToLabelTemplateVersion);

// Import/Export und Migration
router.post('/label-templates/import', tempAuthMiddleware, settingsController.importLabelTemplate);
router.post('/label-settings/migrate', tempAuthMiddleware, settingsController.migrateLabelSettings);

module.exports = router;
