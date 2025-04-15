const roleModel = require('../models/roleModel');
const { handleError } = require('../utils/errorHandler');

const roleController = {
  // Alle Rollen abrufen
  getAllRoles: async (req, res) => {
    try {
      const roles = await roleModel.getAllRoles();
      res.json({ success: true, data: roles });
    } catch (error) {
      handleError(res, error);
    }
  },

  // Rolle nach ID abrufen
  getRoleById: async (req, res) => {
    try {
      const role = await roleModel.getRoleById(req.params.id);
      if (!role) {
        return res.status(404).json({ success: false, message: 'Rolle nicht gefunden' });
      }
      res.json({ success: true, data: role });
    } catch (error) {
      handleError(res, error);
    }
  },

  // Neue Rolle erstellen
  createRole: async (req, res) => {
    try {
      const { name, description } = req.body;
      const role = await roleModel.createRole({ name, description });
      res.status(201).json({ success: true, data: role });
    } catch (error) {
      handleError(res, error);
    }
  },

  // Rolle aktualisieren
  updateRole: async (req, res) => {
    try {
      const { name, description } = req.body;
      const role = await roleModel.updateRole(req.params.id, { name, description });
      if (!role) {
        return res.status(404).json({ success: false, message: 'Rolle nicht gefunden' });
      }
      res.json({ success: true, data: role });
    } catch (error) {
      handleError(res, error);
    }
  },

  // Rolle löschen
  deleteRole: async (req, res) => {
    try {
      const success = await roleModel.deleteRole(req.params.id);
      if (!success) {
        return res.status(404).json({ success: false, message: 'Rolle nicht gefunden' });
      }
      res.json({ success: true, message: 'Rolle erfolgreich gelöscht' });
    } catch (error) {
      handleError(res, error);
    }
  },

  // Berechtigungen einer Rolle abrufen
  getRolePermissions: async (req, res) => {
    try {
      const permissions = await roleModel.getRolePermissions(req.params.id);
      res.json({ success: true, data: permissions });
    } catch (error) {
      handleError(res, error);
    }
  },

  // Berechtigung einer Rolle zuweisen
  assignPermission: async (req, res) => {
    try {
      const { permission_id } = req.body;
      await roleModel.assignPermission(req.params.id, permission_id);
      res.json({ success: true, message: 'Berechtigung erfolgreich zugewiesen' });
    } catch (error) {
      handleError(res, error);
    }
  },

  // Berechtigung von einer Rolle entfernen
  removePermission: async (req, res) => {
    try {
      await roleModel.removePermission(req.params.id, req.params.permissionId);
      res.json({ success: true, message: 'Berechtigung erfolgreich entfernt' });
    } catch (error) {
      handleError(res, error);
    }
  }
};

module.exports = roleController;
