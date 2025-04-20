const express = require('express');
const router = express.Router();
const userGroupController = require('../controllers/userGroupController');
const { authMiddleware } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissionMiddleware');

/**
 * @route   GET /api/usergroups
 * @desc    Alle Benutzergruppen abrufen
 * @access  Private
 */
router.get(
  '/',
  authMiddleware,
  checkPermission('usergroups.read'),
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
  checkPermission('usergroups.read'),
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
  checkPermission('usergroups.read'),
  userGroupController.getGroupById
);

/**
 * @route   GET /api/usergroups/name/:name
 * @desc    Prüft, ob ein Gruppenname existiert (wird in UserGroupManagement.tsx verwendet)
 * @access  Private
 */
router.get(
  '/check-name/:name',
  authMiddleware,
  checkPermission('usergroups.read'),
  userGroupController.checkGroupNameExists
);

/**
 * @route   GET /api/usergroups/:id/members
 * @desc    Mitglieder einer Benutzergruppe abrufen
 * @access  Private
 */
router.get(
  '/:id/members',
  authMiddleware,
  checkPermission('usergroups.read'),
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
  checkPermission('usergroups.read'),
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
  checkPermission('usergroups.create'),
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
  checkPermission('usergroups.update'),
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
  checkPermission('usergroups.delete'),
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
  checkPermission('usergroups.manage_members'),
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
  checkPermission('usergroups.manage_members'),
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
  checkPermission('usergroups.manage_members'),
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
  checkPermission('usergroups.manage_members'),
  userGroupController.removeUsersFromGroup
);

module.exports = router;
