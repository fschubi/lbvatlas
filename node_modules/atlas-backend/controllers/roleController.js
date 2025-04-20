const roleModel = require('../models/roleModel');
const permissionModel = require('../models/permissionModel');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errorHandler');
const { validationResult } = require('express-validator');

// Definiere Funktionen als eigenständige Konstanten

// GET /api/roles
const getAllRoles = async (req, res, next) => {
  try {
    logger.info('Controller: getAllRoles aufgerufen');
    const roles = await roleModel.getAllRoles();
    res.status(200).json({ success: true, data: roles });
  } catch (error) {
    logger.error('Fehler in getAllRoles Controller:', error);
    next(error);
  }
};

// POST /api/roles
const createRole = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, description } = req.body;
  try {
    logger.info('Controller: createRole aufgerufen', { name, description });
    const newRole = await roleModel.createRole({ name: name.trim(), description });
    res.status(201).json({ success: true, data: newRole });
  } catch (error) {
    logger.error('Fehler in createRole Controller:', error);
    if (error.message.includes('existiert bereits')) {
      return res.status(409).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// PUT /api/roles/:roleId
const updateRole = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { roleId } = req.params;
  const { name, description } = req.body;
  try {
    logger.info('Controller: updateRole aufgerufen', { roleId, name, description });
    const updatedRole = await roleModel.updateRole(roleId, { name: name.trim(), description });
    if (!updatedRole) {
      const roleExists = await roleModel.getRoleById(roleId);
      if (!roleExists) {
        return res.status(404).json({ success: false, message: 'Rolle nicht gefunden.' });
      } else {
        return res.status(403).json({ success: false, message: 'Systemrollen können nicht bearbeitet werden.' });
      }
    }
    res.status(200).json({ success: true, data: updatedRole });
  } catch (error) {
    logger.error('Fehler in updateRole Controller:', error);
    if (error.message.includes('existiert bereits')) {
      return res.status(409).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// DELETE /api/roles/:roleId
const deleteRole = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { roleId } = req.params;
  try {
    logger.info('Controller: deleteRole aufgerufen', { roleId });
    const deleted = await roleModel.deleteRole(roleId);
    if (!deleted) {
      const roleExists = await roleModel.getRoleById(roleId);
      if (!roleExists) {
        return res.status(404).json({ success: false, message: 'Rolle nicht gefunden.' });
      } else {
        return res.status(403).json({ success: false, message: 'Systemrollen können nicht gelöscht werden.' });
      }
    }
    res.status(200).json({ success: true, message: 'Rolle erfolgreich gelöscht' });
  } catch (error) {
    logger.error('Fehler in deleteRole Controller:', error);
    next(error);
  }
};

// GET /api/roles/:roleId/permissions
const getRolePermissions = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { roleId } = req.params;
  try {
    logger.info('Controller: getRolePermissions aufgerufen', { roleId });
    const role = await roleModel.getRoleById(roleId);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Rolle nicht gefunden.' });
    }
    const permissions = await permissionModel.findRolePermissions(roleId);
    res.status(200).json({ success: true, data: permissions });
  } catch (error) {
    logger.error('Fehler in getRolePermissions Controller:', error);
    next(error);
  }
};

// POST /api/roles/:roleId/permissions
const addPermissionToRole = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { roleId } = req.params;
  const { permission_id } = req.body;
  try {
    logger.info('Controller: addPermissionToRole aufgerufen', { roleId, permission_id });
    const role = await roleModel.getRoleById(roleId);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Rolle nicht gefunden.' });
    }
    // TODO: Prüfen ob Permission existiert?

    const success = await roleModel.assignPermissionToRole(roleId, permission_id);
    res.status(200).json({ success: true, message: 'Berechtigung erfolgreich zugewiesen' });
  } catch (error) {
    logger.error('Fehler in addPermissionToRole Controller:', error);
    if (error.code === '23503') { // foreign_key_violation
      return res.status(404).json({ success: false, message: 'Berechtigung nicht gefunden.' });
    }
    next(error);
  }
};

// DELETE /api/roles/:roleId/permissions/:permissionId
const removePermissionFromRole = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { roleId, permissionId } = req.params;
  try {
    logger.info('Controller: removePermissionFromRole aufgerufen', { roleId, permissionId });
    const removed = await roleModel.removePermissionFromRole(roleId, permissionId);
    if (!removed) {
      return res.status(404).json({ success: false, message: 'Berechtigungszuweisung nicht gefunden oder konnte nicht entfernt werden.' });
    }
    res.status(200).json({ success: true, message: 'Berechtigung erfolgreich entfernt' });
  } catch (error) {
    logger.error('Fehler in removePermissionFromRole Controller:', error);
    next(error);
  }
};

// PUT /api/roles/:roleId/permissions
const updateRolePermissions = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { roleId } = req.params;
  const { permission_ids: permissionIds } = req.body;

  if (!Array.isArray(permissionIds)) {
    return res.status(400).json({ success: false, message: "'permissionIds' muss ein Array sein." });
  }

  if (!permissionIds.every(id => typeof id === 'number' && Number.isInteger(id) && id > 0)) {
    return res.status(400).json({ success: false, message: "'permissionIds' darf nur positive Ganzzahlen enthalten." });
  }

  try {
    logger.info(`Controller: updateRolePermissions aufgerufen für Rolle ${roleId}`, { permissionIds });

    const role = await roleModel.getRoleById(roleId);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Rolle nicht gefunden.' });
    }
    if (role.is_system) {
      return res.status(403).json({ success: false, message: 'Berechtigungen für Systemrollen können nicht geändert werden.' });
    }

    await roleModel.setRolePermissions(roleId, permissionIds);

    res.status(200).json({ success: true, message: 'Berechtigungen erfolgreich aktualisiert.' });

  } catch (error) {
    logger.error(`Fehler in updateRolePermissions Controller für Rolle ${roleId}:`, error);
    if (error.code === '23503') {
      return res.status(400).json({ success: false, message: 'Eine oder mehrere der angegebenen Berechtigungs-IDs sind ungültig.' });
    }
    next(error);
  }
};

// Berechtigungen nach Modul abrufen
const getPermissionsByModule = async (req, res) => {
  try {
    const permissions = await roleModel.getPermissionsByModule(req.params.module);
    res.json({ success: true, data: permissions });
  } catch (error) {
    handleError(res, error);
  }
};

// Korrigierter Export nur mit den tatsächlich in roleRoutes.js verwendeten Funktionen
module.exports = {
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  addPermissionToRole,
  removePermissionFromRole,
  updateRolePermissions,
  getPermissionsByModule
};
