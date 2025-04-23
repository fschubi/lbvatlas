const express = require('express');
const router = express.Router();
const userGroupController = require('../controllers/userGroupController');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissionMiddleware');

// Temporärer Platzhalter für checkPermission, bis Berechtigungen konfiguriert sind
const tempNoPermissionCheck = (req, res, next) => next();

/**
 * @route   GET /api/user-groups
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
 * @route   GET /api/user-groups/search
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
 * @route   GET /api/user-groups/:id
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
 * @route   GET /api/user-groups/name/:name
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
 * @route   GET /api/user-groups/:id/members
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
 * @route   GET /api/user-groups/:id/members/search
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
 * @route   POST /api/user-groups
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
 * @route   PUT /api/user-groups/:id
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
 * @route   DELETE /api/user-groups/:id
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
 * @route   POST /api/user-groups/:id/members
 * @desc    Einen oder mehrere Benutzer zu einer Gruppe hinzufügen
 * @access  Private
 */
router.post(
  '/:id/members',
  authMiddleware,
  tempNoPermissionCheck,
  (req, res, next) => {
    console.log('[DEBUG route] POST /:id/members handler');
    console.log('[DEBUG route] Request body:', JSON.stringify(req.body));
    console.log('[DEBUG route] Request params:', JSON.stringify(req.params));

    // Hier prüfen wir, welche Art von Daten wir haben:
    // 1. userId oder user_id als Body-Parameter: Der neue Fall vom Frontend
    // 2. userIds als Array im Body: Der unterstützte Standardfall

    if (req.body.userId !== undefined || req.body.user_id !== undefined) {
      // Einzelnen Benutzer zur Gruppe hinzufügen
      // userId aus dem Body in den Request setzen, damit der Controller sie verwenden kann
      req.params.userId = req.body.userId || req.body.user_id;

      // Weiterleitung an den Controller für einzelne Benutzer
      console.log('[DEBUG route] Redirecting to addUserToGroup controller with userId:', req.params.userId);
      return userGroupController.addUserToGroup(req, res, next);
    } else if (req.body.userIds !== undefined) {
      // Mehrere Benutzer zur Gruppe hinzufügen (Standard)
      console.log('[DEBUG route] Using standard addUsersToGroup controller');
      return userGroupController.addUsersToGroup(req, res, next);
    } else {
      // Keine userIds oder userId im Body
      return res.status(400).json({
        success: false,
        message: 'Entweder userId/user_id oder userIds muss im Request-Body angegeben werden'
      });
    }
  }
);

/**
 * @route   DELETE /api/user-groups/:id/members/:userId
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
 * @route   DELETE /api/user-groups/:id/members
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

/**
 * @route   POST /api/user-groups/:id/members/:userId
 * @desc    Einen Benutzer zu einer Gruppe hinzufügen (Alternative URL-Form)
 * @access  Private
 */
router.post(
  '/:id/members/:userId',
  authMiddleware,
  // checkPermission('user_groups.update'), // Temporär deaktiviert
  tempNoPermissionCheck,
  userGroupController.addUserToGroup
);

module.exports = router;
