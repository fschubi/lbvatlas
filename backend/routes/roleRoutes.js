const express = require('express');
const { body, param } = require('express-validator'); // Importiere Validatoren
const roleController = require('../controllers/roleController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionMiddleware'); // Korrigierter Import

const router = express.Router();

// Alle Routen hier erfordern Authentifizierung
router.use(authenticateToken);

// Definiere Berechtigungs-Strings (Beispiele! Müssen in DB existieren)
const READ_ROLES = 'roles.read';
const CREATE_ROLES = 'roles.create';
const UPDATE_ROLES = 'roles.update';
const DELETE_ROLES = 'roles.delete';
const ASSIGN_PERMISSIONS = 'roles.assign_permissions';

// Validation Rules
const roleIdValidation = [
  param('roleId').isInt({ gt: 0 }).withMessage('Ungültige Rollen-ID.')
];

const permissionIdValidation = [
   param('permissionId').isInt({ gt: 0 }).withMessage('Ungültige Berechtigungs-ID.')
];

const createRoleValidation = [
  body('name').trim().notEmpty().withMessage('Rollenname ist erforderlich.').isLength({ min: 2, max: 50 }).withMessage('Rollenname muss zwischen 2 und 50 Zeichen lang sein.'),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 255 }).withMessage('Beschreibung darf maximal 255 Zeichen lang sein.')
];

const updateRoleValidation = [
  ...roleIdValidation,
  body('name').trim().notEmpty().withMessage('Rollenname ist erforderlich.').isLength({ min: 2, max: 50 }).withMessage('Rollenname muss zwischen 2 und 50 Zeichen lang sein.'),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 255 }).withMessage('Beschreibung darf maximal 255 Zeichen lang sein.')
];

const assignPermissionValidation = [
  ...roleIdValidation,
  body('permission_id').isInt({ gt: 0 }).withMessage('permission_id ist erforderlich und muss eine positive Zahl sein.')
];

const removePermissionValidation = [
  ...roleIdValidation,
  ...permissionIdValidation
];

// GET /api/roles - Alle Rollen abrufen
router.get(
    '/',
    authorize(READ_ROLES), // Nur wer Rollen lesen darf
    roleController.getAllRoles
);

// POST /api/roles - Neue Rolle erstellen
router.post(
    '/',
    authorize(CREATE_ROLES),
    createRoleValidation, // Füge Validierung hinzu
    roleController.createRole
);

// PUT /api/roles/:roleId - Rolle aktualisieren
router.put(
    '/:roleId',
    authorize(UPDATE_ROLES),
    updateRoleValidation, // Füge Validierung hinzu
    roleController.updateRole
);

// DELETE /api/roles/:roleId - Rolle löschen
router.delete(
    '/:roleId',
    authorize(DELETE_ROLES),
    roleIdValidation, // Füge Validierung hinzu
    roleController.deleteRole
);

// --- Rollen-Berechtigungs-Zuweisungen ---

// GET /api/roles/:roleId/permissions - Berechtigungen einer Rolle abrufen
router.get(
    '/:roleId/permissions',
    authorize(READ_ROLES), // Wer Rollen lesen darf, darf auch deren Berechtigungen sehen?
    roleIdValidation, // Füge Validierung hinzu
    roleController.getRolePermissions
);

// POST /api/roles/:roleId/permissions - Berechtigung zu einer Rolle hinzufügen
router.post(
    '/:roleId/permissions',
    authorize(ASSIGN_PERMISSIONS),
    assignPermissionValidation, // Füge Validierung hinzu
    roleController.addPermissionToRole
);

// DELETE /api/roles/:roleId/permissions/:permissionId - Berechtigung von Rolle entfernen
router.delete(
    '/:roleId/permissions/:permissionId',
    authorize(ASSIGN_PERMISSIONS),
    removePermissionValidation,
    roleController.removePermissionFromRole
);

// --- NEU: PUT /api/roles/:roleId/permissions - Alle Berechtigungen für eine Rolle setzen ---
const updatePermissionsValidation = [
  param('roleId').isInt({ gt: 0 }).withMessage('Ungültige Rollen-ID.'),
  body('permission_ids')
    .isArray().withMessage('permission_ids muss ein Array sein.')
    .custom((ids) => {
      // Optional: Tiefere Prüfung, ob alle Elemente Zahlen sind
      if (!ids.every(id => typeof id === 'number' && Number.isInteger(id) && id > 0)) {
        throw new Error('permission_ids darf nur positive Ganzzahlen enthalten.');
      }
      return true;
    })
];

router.put(
    '/:roleId/permissions',
    authorize(ASSIGN_PERMISSIONS),
    updatePermissionsValidation,   // Validierung prüft jetzt permission_ids
    roleController.updateRolePermissions
);

module.exports = router;
