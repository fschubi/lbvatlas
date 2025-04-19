const permissionModel = require('../models/permissionModel');
const logger = require('../utils/logger');

// GET /api/permissions
const getAllPermissions = async (req, res, next) => {
  try {
    logger.info('Controller: getAllPermissions aufgerufen');
    const permissions = await permissionModel.findAll();
    res.status(200).json({ success: true, data: permissions });
  } catch (error) {
    logger.error('Fehler in getAllPermissions Controller:', error);
    next(error); // Fehler an zentrale Fehlerbehandlung weiterleiten
  }
};

module.exports = {
  getAllPermissions,
};
