const express = require('express');
const { body, param } = require('express-validator');
const labelTemplateController = require('../controllers/labelTemplateController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionMiddleware');

const router = express.Router();

// --- Berechtigungen (Beispiele, müssen in der DB existieren!) ---
const VIEW_LABEL_TEMPLATES = 'VIEW_LABEL_TEMPLATES';
const MANAGE_OWN_LABEL_TEMPLATES = 'MANAGE_OWN_LABEL_TEMPLATES';
const MANAGE_GLOBAL_LABEL_TEMPLATES = 'MANAGE_GLOBAL_LABEL_TEMPLATES'; // Zum Erstellen/Bearbeiten/Löschen globaler Templates
const IMPORT_GLOBAL_LABEL_TEMPLATES = 'IMPORT_GLOBAL_LABEL_TEMPLATES'; // Zum Importieren als globale Vorlage
const MIGRATE_LABEL_SETTINGS = 'MIGRATE_LABEL_SETTINGS';
const MIGRATE_GLOBAL_LABEL_SETTINGS = 'MIGRATE_GLOBAL_LABEL_SETTINGS';

// --- Validierungsregeln ---
const validateId = param('id').isInt({ min: 1 }).withMessage('ID muss eine positive ganze Zahl sein.');
const validateTemplateId = param('templateId').isInt({ min: 1 }).withMessage('Template ID muss eine positive ganze Zahl sein.');
const validateVersionId = param('versionId').isInt({ min: 1 }).withMessage('Version ID muss eine positive ganze Zahl sein.');
const validateTemplateBody = [
    body('name').notEmpty().isString().trim().withMessage('Name ist erforderlich und muss eine Zeichenkette sein.'),
    body('description').optional({ nullable: true }).isString().trim().withMessage('Beschreibung muss eine Zeichenkette sein.'),
    body('settings').isObject().withMessage('Einstellungen müssen ein JSON-Objekt sein.'),
    body('is_default').optional().isBoolean().withMessage('is_default muss ein Boolean sein.')
];
const validateImportBody = [
    body('templateData').isObject().withMessage('templateData muss ein Objekt sein.'),
    body('templateData.name').notEmpty().isString().trim().withMessage('templateData.name ist erforderlich.'),
    body('templateData.settings').isObject().withMessage('templateData.settings müssen ein Objekt sein.'),
    body('makeGlobal').optional().isBoolean().withMessage('makeGlobal muss ein Boolean sein.')
];

// Alle Routen erfordern Authentifizierung
router.use(authenticateToken);

// GET /api/label-templates - Alle zugänglichen Templates abrufen (eigene + globale)
router.get('/', authorize([VIEW_LABEL_TEMPLATES]), labelTemplateController.getAllLabelTemplates);

// GET /api/label-templates/:id - Ein spezifisches Template abrufen
router.get('/:id', authorize([VIEW_LABEL_TEMPLATES]), validateId, labelTemplateController.getLabelTemplateById);

// POST /api/label-templates - Neues eigenes Template erstellen
router.post('/', authorize([MANAGE_OWN_LABEL_TEMPLATES]), validateTemplateBody, labelTemplateController.createLabelTemplate);

// PUT /api/label-templates/:id - Eigenes Template aktualisieren
// Hinweis: Globale Templates erfordern MANAGE_GLOBAL_LABEL_TEMPLATES (Prüfung im Controller/Model)
router.put('/:id', authorize([MANAGE_OWN_LABEL_TEMPLATES]), validateId, validateTemplateBody, labelTemplateController.updateLabelTemplate);

// DELETE /api/label-templates/:id - Eigenes Template löschen
// Hinweis: Globale Templates erfordern MANAGE_GLOBAL_LABEL_TEMPLATES (Prüfung im Controller/Model)
router.delete('/:id', authorize([MANAGE_OWN_LABEL_TEMPLATES]), validateId, labelTemplateController.deleteLabelTemplate);

// --- Versionierung ---
// GET /api/label-templates/:templateId/versions - Versionen eines Templates abrufen
router.get('/:templateId/versions', authorize([VIEW_LABEL_TEMPLATES]), validateTemplateId, labelTemplateController.getLabelTemplateVersions);

// POST /api/label-templates/:templateId/versions/:versionId/revert - Auf eine Version zurücksetzen
// Hinweis: Globale Templates erfordern MANAGE_GLOBAL_LABEL_TEMPLATES (Prüfung im Controller/Model)
router.post('/:templateId/versions/:versionId/revert', authorize([MANAGE_OWN_LABEL_TEMPLATES]), validateTemplateId, validateVersionId, labelTemplateController.revertToLabelTemplateVersion);

// --- Import & Migration ---

// POST /api/label-templates/import - Template importieren (für sich selbst oder global)
// Berechtigung für globalen Import wird im Controller geprüft!
router.post('/import', authorize([MANAGE_OWN_LABEL_TEMPLATES, IMPORT_GLOBAL_LABEL_TEMPLATES]), validateImportBody, labelTemplateController.importLabelTemplate);

// POST /api/label-templates/migrate/user - Eigene alte Einstellungen migrieren
router.post('/migrate/user', authorize([MIGRATE_LABEL_SETTINGS]), labelTemplateController.migrateLabelSettings);

// POST /api/label-templates/migrate/global - Globale alte Einstellungen migrieren (Admin)
router.post('/migrate/global', authorize([MIGRATE_GLOBAL_LABEL_SETTINGS]), labelTemplateController.migrateGlobalLabelSettings);

module.exports = router;
