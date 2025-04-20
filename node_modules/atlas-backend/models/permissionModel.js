const db = require('../db');
const logger = require('../utils/logger');

// Finde alle Berechtigungen
const findAll = async () => {
  logger.debug('permissionModel: findAll aufgerufen');
  try {
    const queryText = 'SELECT id, name, description, module, action FROM permissions ORDER BY module, name';
    const { rows } = await db.query(queryText);
    return rows;
  } catch (error) {
    logger.error('Fehler beim Abrufen aller Berechtigungen im Model:', error);
    throw error; // Fehler weiterleiten, damit der Controller ihn fangen kann
  }
};

// Finde alle Berechtigungen für eine bestimmte Rolle
const findRolePermissions = async (roleId) => {
  logger.debug('permissionModel: findRolePermissions aufgerufen', { roleId });
  try {
    // Gibt die vollständigen Berechtigungsobjekte zurück, die der Rolle zugewiesen sind
    const queryText = `
      SELECT p.id, p.name, p.description, p.module, p.action
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.module, p.name
    `;
    const { rows } = await db.query(queryText, [roleId]);
    return rows;
     // Alternativ: Nur die IDs zurückgeben, falls vom Frontend erwartet
    // return rows.map(row => row.id);
  } catch (error) {
     logger.error(`Fehler beim Abrufen der Berechtigungen für Rolle ${roleId} im Model:`, error);
    throw error;
  }
};

module.exports = {
  findAll,
  findRolePermissions,
};
