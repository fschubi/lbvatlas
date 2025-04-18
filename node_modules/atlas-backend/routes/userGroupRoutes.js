const express = require('express');
const router = express.Router();
const userGroupController = require('../controllers/userGroupController');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissionMiddleware');

// Temporärer Platzhalter für checkPermission, bis Berechtigungen konfiguriert sind
const tempNoPermissionCheck = (req, res, next) => next();

/**
 * @route   GET /api/usergroups
 * @desc    Alle Benutzergruppen abrufen
 * @access  Private (nur mit Authentifizierung)
 */
router.get(
  '/',
  authMiddleware,
  // checkPermission('user_groups.read'), // Temporär deaktiviert
  tempNoPermissionCheck,
  userGroupController.getAllGroups
);

/**
 * @route   GET /api/usergroups/search
 * @desc    Benutzergruppen durchsuchen
 * @access  Private
 */
router.get(
  '/search',
  authMiddleware,
  // checkPermission('user_groups.read'), // Temporär deaktiviert
  tempNoPermissionCheck,
  userGroupController.searchGroups
);

/**
 * @route   GET /api/usergroups/:id
 * @desc    Benutzergruppe nach ID abrufen
 * @access  Private
 */
router.get(
  '/:id',
  authMiddleware,
  // checkPermission('user_groups.read'), // Temporär deaktiviert
  tempNoPermissionCheck,
  userGroupController.getGroupById
);

/**
 * @route   GET /api/usergroups/name/:name
 * @desc    Benutzergruppe nach Namen abrufen
 * @access  Private
 */
router.get(
  '/name/:name',
  authMiddleware,
  // checkPermission('user_groups.read'), // Temporär deaktiviert
  tempNoPermissionCheck,
  userGroupController.getGroupByName
);

/**
 * @route   GET /api/usergroups/:id/members
 * @desc    Mitglieder einer Benutzergruppe abrufen
 * @access  Private
 */
router.get(
  '/:id/members',
  authMiddleware,
  // checkPermission('user_groups.read'), // Temporär deaktiviert
  tempNoPermissionCheck,
  userGroupController.getGroupMembers
);

/**
 * @route   GET /api/usergroups/:id/members/search
 * @desc    Mitglieder einer Benutzergruppe durchsuchen
 * @access  Private
 */
router.get(
  '/:id/members/search',
  authMiddleware,
  // checkPermission('user_groups.read'), // Temporär deaktiviert
  tempNoPermissionCheck,
  userGroupController.searchGroupMembers
);

/**
 * @route   POST /api/usergroups
 * @desc    Neue Benutzergruppe erstellen
 * @access  Private
 */
router.post(
  '/',
  authMiddleware,
  // checkPermission('user_groups.create'), // Temporär deaktiviert
  tempNoPermissionCheck,
  userGroupController.createGroup
);

/**
 * @route   PUT /api/usergroups/:id
 * @desc    Benutzergruppe aktualisieren
 * @access  Private
 */
router.put(
  '/:id',
  authMiddleware,
  // checkPermission('user_groups.update'), // Temporär deaktiviert
  tempNoPermissionCheck,
  userGroupController.updateGroup
);

/**
 * @route   DELETE /api/usergroups/:id
 * @desc    Benutzergruppe löschen
 * @access  Private
 */
router.delete(
  '/:id',
  authMiddleware,
  // checkPermission('user_groups.delete'), // Temporär deaktiviert
  tempNoPermissionCheck,
  userGroupController.deleteGroup
);

/**
 * @route   POST /api/usergroups/:id/members
 * @desc    Mehrere Benutzer zu einer Gruppe hinzufügen
 * @access  Private
 */
router.post(
  '/:id/members',
  authMiddleware,
  // checkPermission('user_groups.update'), // Temporär deaktiviert
  tempNoPermissionCheck,
  userGroupController.addUsersToGroup
);

/**
 * @route   POST /api/usergroups/:id/members/:userId
 * @desc    Einen Benutzer zu einer Gruppe hinzufügen
 * @access  Private
 */
router.post(
  '/:id/members/:userId',
  authMiddleware,
  // checkPermission('user_groups.update'), // Temporär deaktiviert
  tempNoPermissionCheck,
  userGroupController.addUserToGroup
);

/**
 * @route   DELETE /api/usergroups/:id/members/:userId
 * @desc    Einen Benutzer aus einer Gruppe entfernen
 * @access  Private
 */
router.delete(
  '/:id/members/:userId',
  authMiddleware,
  // checkPermission('user_groups.update'), // Temporär deaktiviert
  tempNoPermissionCheck,
  userGroupController.removeUserFromGroup
);

/**
 * @route   DELETE /api/usergroups/:id/members
 * @desc    Mehrere Benutzer aus einer Gruppe entfernen
 * @access  Private
 */
router.delete(
  '/:id/members',
  authMiddleware,
  // checkPermission('user_groups.update'), // Temporär deaktiviert
  tempNoPermissionCheck,
  userGroupController.removeUsersFromGroup
);

module.exports = router;
