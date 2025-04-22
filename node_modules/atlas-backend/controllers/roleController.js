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
  let permissionIds = req.body.permissionIds;
  if (!permissionIds && Array.isArray(req.body.permission_ids)) {
    permissionIds = req.body.permission_ids;
  }

  if (permissionIds && !Array.isArray(permissionIds)) {
    return res.status(400).json({ success: false, message: 'permissionIds muss ein Array sein.' });
  }

  const validPermissionIds = Array.isArray(permissionIds)
    ? permissionIds.filter(id => typeof id === 'number' && Number.isInteger(id))
    : [];

  try {
    logger.info('Controller: updateRole aufgerufen', { roleId, name, description, permissionIds: validPermissionIds });
    const updatedRole = await roleModel.updateRole(roleId, {
      name: name ? name.trim() : undefined,
      description: description ? description.trim() : (description === null ? null : undefined),
      permissionIds: validPermissionIds
    });

    if (!updatedRole) {
      const roleExists = await roleModel.getRoleById(roleId);
      if (!roleExists) {
        return res.status(404).json({ success: false, message: 'Rolle nicht gefunden.' });
      } else if (roleExists.is_system) {
        logger.warn(`Versuch, Name/Beschreibung der Systemrolle ${roleId} zu ändern. Nur Berechtigungen werden aktualisiert.`);
        const potentiallyUpdatedRole = await roleModel.getRoleById(roleId);
        return res.status(200).json({ success: true, message: 'Systemrolle: Nur Berechtigungen wurden aktualisiert.', data: potentiallyUpdatedRole });
      } else {
        return res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren der Rolle.' });
      }
    }
    res.status(200).json({ success: true, data: updatedRole });
  } catch (error) {
    logger.error('Fehler in updateRole Controller:', error);
    if (error.message.includes('existiert bereits')) {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (error.code === '23503' && error.constraint === 'role_permissions_permission_id_fkey') {
        return res.status(400).json({ success: false, message: 'Eine oder mehrere Berechtigungs-IDs sind ungültig.' });
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
    const permissions = await roleModel.getPermissionsForRole(roleId);
    res.status(200).json({ success: true, data: permissions });
  } catch (error) {
    logger.error('Fehler in getRolePermissions Controller:', error);
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
  getPermissionsByModule
};
