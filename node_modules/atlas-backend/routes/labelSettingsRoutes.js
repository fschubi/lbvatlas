const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const labelController = require('../controllers/labelController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionMiddleware');
const labelSettingsController = require('../controllers/labelSettingsController');

// Berechtigungen (Beispiel, anpassen!)
const READ_LABEL_SETTINGS = 'labels.settings.read';
const UPDATE_LABEL_SETTINGS = 'labels.settings.update'; // Nur eigene Einstellungen
const READ_LABEL_TEMPLATES = 'labels.templates.read';
const CREATE_LABEL_TEMPLATES = 'labels.templates.create';
const UPDATE_LABEL_TEMPLATES = 'labels.templates.update'; // Eigene/Globale?
const DELETE_LABEL_TEMPLATES = 'labels.templates.delete'; // Eigene/Globale?
const IMPORT_LABEL_TEMPLATES = 'labels.templates.import';
const MANAGE_LABEL_VERSIONS = 'labels.templates.versions'; // Für Verlauf und Revert
const MIGRATE_OLD_SETTINGS = 'labels.settings.migrate'; // Spezielle Berechtigung für Migration
const MANAGE_GLOBAL_SETTINGS = 'MANAGE_GLOBAL_LABEL_SETTINGS'; // Beispiel-Berechtigung

// Middleware für alle Routen
router.use(authenticateToken);

// --- Label Einstellungen --- //

// GET /api/labels/settings - Eigene oder globale Einstellungen abrufen
router.get('/settings', authorize(READ_LABEL_SETTINGS), labelController.getLabelSettings);

// POST /api/labels/settings - Eigene Einstellungen speichern
router.post('/settings', authorize(UPDATE_LABEL_SETTINGS), labelController.saveLabelSettings);

// POST /api/labels/settings/migrate - Alte Einstellungen migrieren
router.post('/settings/migrate', authorize(MIGRATE_OLD_SETTINGS), labelController.migrateLabelSettings);

// --- Label Vorlagen --- //

// GET /api/labels/templates - Alle verfügbaren Vorlagen abrufen
router.get('/templates', authorize(READ_LABEL_TEMPLATES), labelController.getLabelTemplates);

// POST /api/labels/templates - Neue Vorlage erstellen
router.post(
    '/templates',
    authorize(CREATE_LABEL_TEMPLATES),
    [
        check('name', 'Name der Vorlage ist erforderlich').not().isEmpty().trim(),
        check('settings', 'Einstellungen sind erforderlich und müssen ein Objekt sein').isObject()
    ],
    labelController.createLabelTemplate
);

// POST /api/labels/templates/import - Vorlage importieren
router.post(
    '/templates/import',
    authorize(IMPORT_LABEL_TEMPLATES),
    [
        check('name', 'Name der Vorlage ist erforderlich').not().isEmpty().trim(),
        check('settings', 'Einstellungen sind erforderlich und müssen ein Objekt sein').isObject()
    ],
    labelController.importLabelTemplate
);

// GET /api/labels/templates/:id - Eine spezifische Vorlage abrufen
router.get(
    '/templates/:id',
    authorize(READ_LABEL_TEMPLATES),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Vorlagen-ID')],
    labelController.getLabelTemplateById
);

// PUT /api/labels/templates/:id - Eine Vorlage aktualisieren
router.put(
    '/templates/:id',
    authorize(UPDATE_LABEL_TEMPLATES),
    [
        check('id').isInt({ gt: 0 }).withMessage('Ungültige Vorlagen-ID'),
        check('name', 'Name der Vorlage darf nicht leer sein').optional().not().isEmpty().trim(),
        check('settings', 'Einstellungen müssen ein Objekt sein').optional().isObject()
    ],
    labelController.updateLabelTemplate
);

// DELETE /api/labels/templates/:id - Eine Vorlage löschen
router.delete(
    '/templates/:id',
    authorize(DELETE_LABEL_TEMPLATES),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Vorlagen-ID')],
    labelController.deleteLabelTemplate
);

// GET /api/labels/templates/:id/versions - Versionsverlauf einer Vorlage abrufen
router.get(
    '/templates/:id/versions',
    authorize(MANAGE_LABEL_VERSIONS),
    [check('id').isInt({ gt: 0 }).withMessage('Ungültige Vorlagen-ID')],
    labelController.getLabelTemplateVersions
);

// POST /api/labels/templates/:id/versions/:versionId/revert - Zu einer Version zurückkehren
router.post(
    '/templates/:id/versions/:versionId/revert',
    authorize(MANAGE_LABEL_VERSIONS),
    [
        check('id').isInt({ gt: 0 }).withMessage('Ungültige Vorlagen-ID'),
        check('versionId').isInt({ gt: 0 }).withMessage('Ungültige Versions-ID')
    ],
    labelController.revertToLabelTemplateVersion
);

// GET /api/label-settings/user - Eigene oder globale Einstellungen abrufen
router.get('/user', labelSettingsController.getUserLabelSettings);

// POST /api/label-settings/user - Eigene Einstellungen speichern/aktualisieren
router.post('/user', labelSettingsController.saveUserLabelSettings);

// --- Routen nur für Admins/Berechtigte ---

// GET /api/label-settings/global - Globale Einstellungen abrufen
router.get(
    '/global',
    authorize([MANAGE_GLOBAL_SETTINGS]),
    labelSettingsController.getGlobalLabelSettings
);

// POST /api/label-settings/global - Globale Einstellungen speichern/aktualisieren
router.post(
    '/global',
    authorize([MANAGE_GLOBAL_SETTINGS]),
    labelSettingsController.saveGlobalLabelSettings
);

module.exports = router;
