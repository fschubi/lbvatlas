const db = require('../db');
const logger = require('../utils/logger');

const RoleModel = {
  /**
   * Alle Rollen abrufen
   * @returns {Promise<Array>} - Array von Rollen
   */
  getAllRoles: async () => {
    logger.debug('roleModel: getAllRoles aufgerufen');
    try {
      const query = `
        SELECT id, name, description, is_system, created_at, updated_at
        FROM roles
        ORDER BY name
      `;
      const { rows } = await db.query(query);
      return rows;
    } catch (error) {
      logger.error('Fehler beim Abrufen aller Rollen:', error);
      throw error;
    }
  },

  /**
   * Rolle nach ID abrufen
   * @param {string | number} id - Rollen-ID
   * @returns {Promise<Object | null>} - Rolle oder null
   */
  getRoleById: async (id) => {
    logger.debug('roleModel: getRoleById aufgerufen', { id });
    try {
      const query = `
        SELECT id, name, description, is_system, created_at, updated_at
        FROM roles
        WHERE id = $1
      `;
      const { rows } = await db.query(query, [id]);
      return rows[0] || null; // Gebe null zurück, wenn nichts gefunden wurde
    } catch (error) {
      logger.error(`Fehler beim Abrufen der Rolle mit ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Rolle nach Namen abrufen
   * @param {string} name - Rollenname
   * @returns {Promise<Object>} - Rolle
   */
  getRoleByName: async (name) => {
    try {
      const query = `
        SELECT * FROM roles
        WHERE name = $1
      `;

      const { rows } = await db.query(query, [name]);
      return rows[0];
    } catch (error) {
      logger.error(`Fehler beim Abrufen der Rolle mit Namen ${name}:`, error);
      throw error;
    }
  },

  /**
   * Neue Rolle erstellen
   * @param {Object} roleData - { name: string, description?: string }
   * @returns {Promise<Object>} - Erstellte Rolle
   */
  createRole: async ({ name, description }) => {
    logger.debug('roleModel: createRole aufgerufen', { name, description });
    try {
       // is_system wird standardmäßig auf false gesetzt
      const query = `
        INSERT INTO roles (name, description, is_system)
        VALUES ($1, $2, false)
        RETURNING id, name, description, is_system, created_at, updated_at
      `;
      const { rows } = await db.query(query, [name, description || null]);
      return rows[0];
    } catch (error) {
      logger.error('Fehler beim Erstellen der Rolle:', error);
      // Spezifische Fehlerbehandlung für z.B. Unique Constraint
      if (error.code === '23505') { // Unique violation
        throw new Error(`Eine Rolle mit dem Namen '${name}' existiert bereits.`);
      }
      throw error;
    }
  },

  /**
   * Rolle aktualisieren
   * @param {string | number} id - Rollen-ID
   * @param {Object} roleData - { name: string, description?: string }
   * @returns {Promise<Object | null>} - Aktualisierte Rolle oder null
   */
  updateRole: async (id, { name, description }) => {
     logger.debug('roleModel: updateRole aufgerufen', { id, name, description });
    try {
      // Wichtig: is_system sollte hier nicht geändert werden können
      const query = `
        UPDATE roles
        SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND is_system = false -- Systemrollen nicht ändern
        RETURNING id, name, description, is_system, created_at, updated_at
      `;
      const { rows } = await db.query(query, [name, description || null, id]);
      return rows[0] || null; // null wenn ID nicht gefunden oder Systemrolle
    } catch (error) {
      logger.error(`Fehler beim Aktualisieren der Rolle mit ID ${id}:`, error);
       if (error.code === '23505') { // Unique violation
        throw new Error(`Eine Rolle mit dem Namen '${name}' existiert bereits.`);
      }
      throw error;
    }
  },

  /**
   * Rolle löschen
   * @param {string | number} id - Rollen-ID
   * @returns {Promise<boolean>} - Erfolg (true wenn gelöscht, false wenn nicht gefunden/Systemrolle)
   */
  deleteRole: async (id) => {
    logger.debug('roleModel: deleteRole aufgerufen', { id });
    try {
      // Zuerst prüfen, ob es eine Systemrolle ist
      const role = await RoleModel.getRoleById(id);
      if (role && role.is_system) {
        logger.warn(`Versuch, Systemrolle ${id} zu löschen, abgelehnt.`);
        return false; // Verhindere das Löschen von Systemrollen
      }

      // TODO: Prüfen, ob Rolle noch Benutzern zugewiesen ist?
      // Ggf. Zuerst Verknüpfungen in role_permissions löschen
       await db.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);

      const query = `
        DELETE FROM roles
        WHERE id = $1
        RETURNING id
      `;
      const { rowCount } = await db.query(query, [id]);
      return rowCount > 0;
    } catch (error) {
      logger.error(`Fehler beim Löschen der Rolle mit ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Alle Berechtigungen abrufen
   * @returns {Promise<Array>} - Array von Berechtigungen
   */
  getAllPermissions: async () => {
    logger.debug('roleModel (via getAllPermissions): getAllPermissions aufgerufen');
    try {
      const query = `
        SELECT id, name, description, module, action, category
        FROM permissions
        ORDER BY module, action
      `;
      const { rows } = await db.query(query);
      return rows;
    } catch (error) {
      logger.error('Fehler beim Abrufen aller Berechtigungen (in roleModel):', error);
      throw error;
    }
  },

  /**
   * Berechtigungen nach Modul abrufen
   * @param {string} module - Modulname
   * @returns {Promise<Array>} - Array von Berechtigungen
   */
  getPermissionsByModule: async (module) => {
    logger.debug('roleModel (via getPermissionsByModule): getPermissionsByModule aufgerufen', { module });
    try {
      const query = `
        SELECT id, name, description, module, action, category
        FROM permissions
        WHERE module = $1
        ORDER BY action
      `;
      const { rows } = await db.query(query, [module]);
      return rows;
    } catch (error) {
      logger.error(`Fehler beim Abrufen der Berechtigungen für Modul ${module} (in roleModel):`, error);
      throw error;
    }
  },

  /**
   * Berechtigungen einer Rolle abrufen
   * @param {string | number} roleId - Rollen-ID
   * @returns {Promise<Array>} - Array von Berechtigungen
   */
  getRolePermissions: async (roleId) => {
    logger.debug('roleModel (via getRolePermissions): getRolePermissions aufgerufen', { roleId });
    // Stelle sicher, dass roleId nicht undefined oder null ist
    if (roleId === undefined || roleId === null) {
        logger.error('roleModel.getRolePermissions: Ungültige roleId empfangen:', roleId);
        throw new Error('Ungültige Rollen-ID für Berechtigungsabfrage.');
    }
    try {
      const query = `
        SELECT p.id, p.name, p.description, p.module, p.action -- p.category entfernt
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = $1
        ORDER BY p.module, p.action
      `;
      const { rows } = await db.query(query, [roleId]);
      return rows;
    } catch (error) {
      // Doppeltes Logging entfernt
      logger.error(`Fehler beim Abrufen der Berechtigungen für Rolle ${roleId}:`, error);
      throw error;
    }
  },

  /**
   * Berechtigung einer Rolle zuweisen
   * @param {number} roleId - Rollen-ID
   * @param {number} permissionId - Berechtigungs-ID
   * @returns {Promise<Object>} - Zugewiesene Berechtigung
   */
  assignPermissionToRole: async (roleId, permissionId) => {
    try {
      const query = `
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ($1, $2)
        ON CONFLICT (role_id, permission_id) DO NOTHING
        RETURNING *
      `;

      const { rows } = await db.query(query, [roleId, permissionId]);
      return rows[0];
    } catch (error) {
      logger.error(`Fehler beim Zuweisen der Berechtigung ${permissionId} zur Rolle ${roleId}:`, error);
      throw error;
    }
  },

  /**
   * Berechtigung von einer Rolle entfernen
   * @param {number} roleId - Rollen-ID
   * @param {number} permissionId - Berechtigungs-ID
   * @returns {Promise<boolean>} - Erfolg
   */
  removePermissionFromRole: async (roleId, permissionId) => {
    logger.debug('roleModel: removePermissionFromRole aufgerufen', { roleId, permissionId });
    try {
      const query = `
        DELETE FROM role_permissions
        WHERE role_id = $1 AND permission_id = $2
        RETURNING *
      `;
      const { rowCount } = await db.query(query, [roleId, permissionId]);
      return rowCount > 0;
    } catch (error) {
      logger.error(`Fehler beim Entfernen der Berechtigung ${permissionId} von Rolle ${roleId}:`, error);
      throw error;
    }
  },

  /**
   * NEU: Alle Berechtigungen für eine Rolle setzen (überschreibt bestehende).
   * @param {number | string} roleId - Die ID der Rolle.
   * @param {number[]} permissionIds - Ein Array mit den IDs der Berechtigungen, die die Rolle haben soll.
   * @returns {Promise<void>}
   */
  setRolePermissions: async (roleId, permissionIds) => {
    logger.debug('roleModel: setRolePermissions aufgerufen', { roleId, permissionIds });
    // Verwende die Transaktionsfunktionen aus db.js
    const client = await db.beginTransaction();

    try {
      // Transaktion ist bereits gestartet durch beginTransaction()

      // 1. Lösche alle vorhandenen Berechtigungen für diese Rolle (innerhalb der Transaktion)
      logger.debug(`Lösche alte Berechtigungen für Rolle ${roleId}`);
      await db.transactionQuery(client, 'DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

      // 2. Füge die neuen Berechtigungen hinzu (nur wenn permissionIds nicht leer ist)
      if (permissionIds && permissionIds.length > 0) {
        logger.debug(`Füge ${permissionIds.length} neue Berechtigungen für Rolle ${roleId} hinzu`);

        // Baue die VALUES-Klausel für mehrere Inserts
        const valuesClause = permissionIds.map((_, index) => `($1, $${index + 2})`).join(',');
        // Die Parameterliste für die Abfrage: [roleId, permId1, permId2, ...]
        const queryParams = [roleId, ...permissionIds];

        const insertQuery = `
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ${valuesClause}
          ON CONFLICT (role_id, permission_id) DO NOTHING
        `;

        // Führe die Abfrage innerhalb der Transaktion aus
        await db.transactionQuery(client, insertQuery, queryParams);
      }

      await db.commitTransaction(client); // Schließe Transaktion erfolgreich ab
      logger.info(`Berechtigungen für Rolle ${roleId} erfolgreich aktualisiert.`);

    } catch (error) {
      await db.rollbackTransaction(client); // Mache Änderungen rückgängig bei Fehler
      logger.error(`Fehler beim Setzen der Berechtigungen für Rolle ${roleId} (Rollback durchgeführt):`, error);
      throw error; // Leite den Fehler weiter
    } finally {
      // Das Freigeben des Clients wird jetzt von commitTransaction/rollbackTransaction übernommen
      // client.release(); // Nicht mehr nötig
    }
  },

  /**
   * Rollenhierarchie abrufen
   * @returns {Promise<Array>} - Array von Rollenhierarchien
   */
  getRoleHierarchy: async () => {
    try {
      const query = `
        SELECT
          rh.id,
          parent.id AS parent_id,
          parent.name AS parent_name,
          child.id AS child_id,
          child.name AS child_name
        FROM role_hierarchy rh
        JOIN roles parent ON rh.parent_role_id = parent.id
        JOIN roles child ON rh.child_role_id = child.id
        ORDER BY parent.name, child.name
      `;

      const { rows } = await db.query(query);
      return rows;
    } catch (error) {
      logger.error('Fehler beim Abrufen der Rollenhierarchie:', error);
      throw error;
    }
  },

  /**
   * Übergeordnete Rolle einer Rolle abrufen
   * @param {number} roleId - Rollen-ID
   * @returns {Promise<Array>} - Array von übergeordneten Rollen
   */
  getParentRoles: async (roleId) => {
    try {
      const query = `
        SELECT r.*
        FROM roles r
        JOIN role_hierarchy rh ON r.id = rh.parent_role_id
        WHERE rh.child_role_id = $1
        ORDER BY r.name
      `;

      const { rows } = await db.query(query, [roleId]);
      return rows;
    } catch (error) {
      logger.error(`Fehler beim Abrufen der übergeordneten Rollen für Rolle ${roleId}:`, error);
      throw error;
    }
  },

  /**
   * Untergeordnete Rollen einer Rolle abrufen
   * @param {number} roleId - Rollen-ID
   * @returns {Promise<Array>} - Array von untergeordneten Rollen
   */
  getChildRoles: async (roleId) => {
    try {
      const query = `
        SELECT r.*
        FROM roles r
        JOIN role_hierarchy rh ON r.id = rh.child_role_id
        WHERE rh.parent_role_id = $1
        ORDER BY r.name
      `;

      const { rows } = await db.query(query, [roleId]);
      return rows;
    } catch (error) {
      logger.error(`Fehler beim Abrufen der untergeordneten Rollen für Rolle ${roleId}:`, error);
      throw error;
    }
  },

  /**
   * Rollenhierarchie erstellen
   * @param {number} parentRoleId - ID der übergeordneten Rolle
   * @param {number} childRoleId - ID der untergeordneten Rolle
   * @returns {Promise<Object>} - Erstellte Rollenhierarchie
   */
  createRoleHierarchy: async (parentRoleId, childRoleId) => {
    try {
      const query = `
        INSERT INTO role_hierarchy (parent_role_id, child_role_id)
        VALUES ($1, $2)
        ON CONFLICT (parent_role_id, child_role_id) DO NOTHING
        RETURNING *
      `;

      const { rows } = await db.query(query, [parentRoleId, childRoleId]);
      return rows[0];
    } catch (error) {
      logger.error(`Fehler beim Erstellen der Rollenhierarchie zwischen ${parentRoleId} und ${childRoleId}:`, error);
      throw error;
    }
  },

  /**
   * Rollenhierarchie löschen
   * @param {number} parentRoleId - ID der übergeordneten Rolle
   * @param {number} childRoleId - ID der untergeordneten Rolle
   * @returns {Promise<boolean>} - Erfolg
   */
  deleteRoleHierarchy: async (parentRoleId, childRoleId) => {
    try {
      const query = `
        DELETE FROM role_hierarchy
        WHERE parent_role_id = $1 AND child_role_id = $2
        RETURNING id
      `;

      const { rows } = await db.query(query, [parentRoleId, childRoleId]);
      return rows.length > 0;
    } catch (error) {
      logger.error(`Fehler beim Löschen der Rollenhierarchie zwischen ${parentRoleId} und ${childRoleId}:`, error);
      throw error;
    }
  },

  /**
   * Berechtigungen eines Benutzers abrufen
   * @param {number} userId - Benutzer-ID
   * @returns {Promise<Array>} - Array von Berechtigungen
   */
  getUserPermissions: async (userId) => {
    try {
      const query = `
        SELECT * FROM get_user_permissions($1)
      `;

      const { rows } = await db.query(query, [userId]);
      return rows;
    } catch (error) {
      logger.error(`Fehler beim Abrufen der Berechtigungen für Benutzer ${userId}:`, error);
      throw error;
    }
  }
};

module.exports = RoleModel;
