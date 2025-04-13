/**
 * Routen für Benutzergruppen im ATLAS-System
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');

// Mock-Controller-Funktionen (später durch echte Controller ersetzen)
const userGroupController = {
  getAllGroups: (req, res) => {
    res.json({
      success: true,
      data: [
        { id: 1, name: 'Administratoren', description: 'Systemadministratoren mit vollen Rechten', created_at: new Date().toISOString() },
        { id: 2, name: 'IT-Support', description: 'IT-Support-Mitarbeiter', created_at: new Date().toISOString() },
        { id: 3, name: 'Benutzer', description: 'Standardbenutzer', created_at: new Date().toISOString() }
      ]
    });
  },

  getGroupById: (req, res) => {
    const groupId = parseInt(req.params.id, 10);
    res.json({
      success: true,
      data: { id: groupId, name: 'Gruppe ' + groupId, description: 'Beschreibung für Gruppe ' + groupId, created_at: new Date().toISOString() }
    });
  },

  createGroup: (req, res) => {
    const { name, description } = req.body;
    res.status(201).json({
      success: true,
      data: { id: 99, name, description, created_at: new Date().toISOString() }
    });
  },

  updateGroup: (req, res) => {
    const groupId = parseInt(req.params.id, 10);
    const { name, description } = req.body;
    res.json({
      success: true,
      data: { id: groupId, name, description, updated_at: new Date().toISOString() }
    });
  },

  deleteGroup: (req, res) => {
    const groupId = parseInt(req.params.id, 10);
    res.json({
      success: true,
      message: `Gruppe mit ID ${groupId} erfolgreich gelöscht`
    });
  },

  getGroupMembers: (req, res) => {
    const groupId = parseInt(req.params.id, 10);
    res.json({
      success: true,
      data: [
        { id: 1, username: 'admin', name: 'Administrator', email: 'admin@example.com', added_at: new Date().toISOString() },
        { id: 2, username: 'jsupport', name: 'John Support', email: 'jsupport@example.com', added_at: new Date().toISOString() }
      ]
    });
  },

  addUserToGroup: (req, res) => {
    const groupId = parseInt(req.params.id, 10);
    const { userId } = req.body;
    res.status(201).json({
      success: true,
      message: `Benutzer ${userId} erfolgreich zur Gruppe ${groupId} hinzugefügt`
    });
  },

  removeUserFromGroup: (req, res) => {
    const groupId = parseInt(req.params.id, 10);
    const userId = parseInt(req.params.userId, 10);
    res.json({
      success: true,
      message: `Benutzer ${userId} erfolgreich aus der Gruppe ${groupId} entfernt`
    });
  }
};

// Alle Benutzergruppen abrufen
router.get('/', userGroupController.getAllGroups);

// Eine bestimmte Benutzergruppe abrufen
router.get('/:id', userGroupController.getGroupById);

// Neue Benutzergruppe erstellen
router.post('/', userGroupController.createGroup);

// Benutzergruppe aktualisieren
router.put('/:id', userGroupController.updateGroup);

// Benutzergruppe löschen
router.delete('/:id', userGroupController.deleteGroup);

// Mitglieder einer Benutzergruppe abrufen
router.get('/:id/members', userGroupController.getGroupMembers);

// Benutzer zu einer Gruppe hinzufügen
router.post('/:id/members', userGroupController.addUserToGroup);

// Benutzer aus einer Gruppe entfernen
router.delete('/:id/members/:userId', userGroupController.removeUserFromGroup);

module.exports = router;
