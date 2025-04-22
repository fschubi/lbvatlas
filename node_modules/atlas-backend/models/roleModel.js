const db = require('../db');
const logger = require('../utils/logger');

// Importiere auch die Transaktionsfunktionen
const {
  query,
  beginTransaction,
  transactionQuery,
  commitTransaction,
  rollbackTransaction,
  pool // Optional, falls direkter Pool-Zugriff noch benötigt wird
} = require('../db');

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
   * Rolle und ihre Berechtigungen aktualisieren (mit Transaktionsfunktionen)
   * @param {number} id - Rollen-ID
   * @param {Object} roleData - { name?: string, description?: string, permissionIds?: number[] }
   * @returns {Promise<Object | null>} - Aktualisierte Rolle oder null bei Fehler/Nicht gefunden
   */
  updateRole: async (id, { name, description, permissionIds }) => {
    logger.debug('roleModel: updateRole aufgerufen', { id, name, description, permissionIds });
    let client;
    try {
      client = await beginTransaction(); // Transaktion starten

      // 1. Rolle prüfen und ob es eine Systemrolle ist
      const roleCheckResult = await transactionQuery(client, 'SELECT id, is_system FROM roles WHERE id = $1', [id]);
      if (roleCheckResult.rows.length === 0) {
        // Wichtig: Rollback nur, wenn Transaktion gestartet wurde
        await rollbackTransaction(client);
        logger.warn(`roleModel: updateRole - Rolle ${id} nicht gefunden.`);
        return null; // Rolle nicht gefunden
      }
      const isSystemRole = roleCheckResult.rows[0].is_system;

      // 2. Name/Beschreibung aktualisieren (nur wenn Daten vorhanden UND keine Systemrolle)
      if (!isSystemRole && (name !== undefined || description !== undefined)) {
         const updateFields = [];
         const updateValues = [];
         let paramIndex = 1;

         if (name !== undefined) {
           updateFields.push(`name = $${paramIndex++}`);
           updateValues.push(name);
         }
         if (description !== undefined) {
           updateFields.push(`description = $${paramIndex++}`);
           // Stelle sicher, dass explizites null als null übergeben wird
           updateValues.push(description === null ? null : description);
         }
         updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

         if (updateFields.length > 1) { // Nur updaten, wenn Felder vorhanden sind
             updateValues.push(id); // ID als letzter Parameter für WHERE
             const updateQueryText = `UPDATE roles SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
             logger.debug('roleModel: updateRole - Update Query:', { query: updateQueryText, values: updateValues });
             await transactionQuery(client, updateQueryText, updateValues);
         }
      } else if (isSystemRole && (name !== undefined || description !== undefined)) {
        logger.warn(`roleModel: updateRole - Versuch, Name/Beschreibung der Systemrolle ${id} zu ändern, wird ignoriert.`);
      }

      // 3. & 4. Berechtigungen aktualisieren (wenn permissionIds übergeben wurde)
      if (permissionIds && Array.isArray(permissionIds)) {
        logger.debug(`roleModel: updateRole - Aktualisiere Berechtigungen für Rolle ${id}`);
        // 3. Alte Berechtigungen löschen
        await transactionQuery(client, 'DELETE FROM role_permissions WHERE role_id = $1', [id]);

        // 4. Neue Berechtigungen einfügen (wenn welche vorhanden sind)
        if (permissionIds.length > 0) {
          const insertValues = permissionIds.map((_, index) => `($1, $${index + 2})`).join(',');
          const insertQueryText = `INSERT INTO role_permissions (role_id, permission_id) VALUES ${insertValues}`;
          const insertParams = [id, ...permissionIds];
          logger.debug('roleModel: updateRole - Insert Permissions Query:', { query: insertQueryText, params: insertParams });
          await transactionQuery(client, insertQueryText, insertParams);
        }
      }

      await commitTransaction(client); // Transaktion abschließen

      // 5. Aktualisierte Rolle zurückgeben (erneut abrufen, um Konsistenz sicherzustellen)
      // Verwende die normale query-Funktion, da die Transaktion abgeschlossen ist
      const updatedRole = await RoleModel.getRoleById(id);
      return updatedRole;

    } catch (error) {
      // Rollback nur, wenn Client existiert (Transaktion gestartet wurde)
      if (client) {
        await rollbackTransaction(client);
      }
      logger.error(`Fehler beim Aktualisieren der Rolle mit ID ${id} (Transaktion):`, error);
      // Spezifische Fehlerbehandlung
      if (error.code === '23505' && error.constraint === 'roles_name_key') {
        throw new Error(`Eine Rolle mit dem Namen '${name}' existiert bereits.`);
      }
      if (error.code === '23503' && error.constraint === 'role_permissions_permission_id_fkey') {
        throw new Error('Eine oder mehrere angegebene Berechtigungs-IDs sind ungültig.');
      }
      throw error; // Allgemeinen Fehler weiterwerfen
    }
    // 'finally' Block mit client.release() wird nicht mehr benötigt, da commit/rollback das übernehmen
  },

  /**
   * Rolle löschen (mit Transaktionsfunktionen)
   * @param {string | number} id - Rollen-ID
   * @returns {Promise<boolean>} - Erfolg
   */
  deleteRole: async (id) => {
    logger.debug('roleModel: deleteRole aufgerufen', { id });
    let client;
    try {
      client = await beginTransaction();

      // Sperre die Rolle zur Sicherheit (optional, aber gut bei nebenläufigen Zugriffen)
      const roleResult = await transactionQuery(client, 'SELECT id, is_system FROM roles WHERE id = $1 FOR UPDATE', [id]);
      if (roleResult.rows.length === 0) {
        await rollbackTransaction(client);
        return false; // Nicht gefunden
      }
      if (roleResult.rows[0].is_system) {
        logger.warn(`Versuch, Systemrolle ${id} zu löschen, abgelehnt.`);
        await rollbackTransaction(client);
        return false;
      }

      // Zuerst Verknüpfungen in role_permissions löschen
      await transactionQuery(client, 'DELETE FROM role_permissions WHERE role_id = $1', [id]);

      // Dann die Rolle löschen
      const deleteResult = await transactionQuery(client, 'DELETE FROM roles WHERE id = $1', [id]);

      await commitTransaction(client);
      return deleteResult.rowCount > 0;

    } catch (error) {
      if (client) {
        await rollbackTransaction(client);
      }
      logger.error(`Fehler beim Löschen der Rolle mit ID ${id} (Transaktion):`, error);
      // Prüfen, ob die Rolle noch Benutzern zugewiesen ist
       if (error.code === '23503' && error.constraint === 'user_roles_role_id_fkey') {
         logger.warn(`Versuch, Rolle ${id} zu löschen, die noch Benutzern zugewiesen ist.`);
         throw new Error('Rolle kann nicht gelöscht werden, da sie noch Benutzern zugewiesen ist.');
       }
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
      // Nutze die Standard query Funktion
      const queryText = `
        SELECT id, name, description, module, action, category
        FROM permissions
        ORDER BY module, action
      `;
      const { rows } = await query(queryText);
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
      // Nutze die Standard query Funktion
      const queryText = `
        SELECT id, name, description, module, action, category
        FROM permissions
        WHERE module = $1
        ORDER BY action
      `;
      const { rows } = await query(queryText, [module]);
      return rows;
    } catch (error) {
      logger.error(`Fehler beim Abrufen der Berechtigungen für Modul ${module} (in roleModel):`, error);
      throw error;
    }
  },

  /**
   * Berechtigungen einer Rolle abrufen
   * @param {string | number} roleId - Rollen-ID
   * @returns {Promise<Array>} - Array von Permission-Objekten
   */
  getPermissionsForRole: async (roleId) => {
    logger.debug('roleModel: getPermissionsForRole aufgerufen', { roleId });
    if (roleId === undefined || roleId === null) {
        logger.error('roleModel.getPermissionsForRole: Ungültige roleId empfangen:', roleId);
        throw new Error('Ungültige Rollen-ID für Berechtigungsabfrage.');
    }
    try {
      // Nutze die Standard query Funktion
      const queryText = `
        SELECT p.id, p.name, p.description, p.module, p.action
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = $1
        ORDER BY p.module, p.action
      `;
      const { rows } = await query(queryText, [roleId]);
      return rows;
    } catch (error) {
      logger.error(`Fehler beim Abrufen der Berechtigungen für Rolle ${roleId}:`, error);
      throw error;
    }
  },

  /**
   * Rollenhierarchie abrufen
   * @returns {Promise<Array>} - Array von Rollenhierarchien
   */
  getRoleHierarchy: async () => {
    try {
      const queryText = `
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

      const { rows } = await query(queryText);
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
      const queryText = `
        SELECT r.*
        FROM roles r
        JOIN role_hierarchy rh ON r.id = rh.parent_role_id
        WHERE rh.child_role_id = $1
        ORDER BY r.name
      `;

      const { rows } = await query(queryText, [roleId]);
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
      const queryText = `
        SELECT r.*
        FROM roles r
        JOIN role_hierarchy rh ON r.id = rh.child_role_id
        WHERE rh.parent_role_id = $1
        ORDER BY r.name
      `;

      const { rows } = await query(queryText, [roleId]);
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
      const queryText = `
        INSERT INTO role_hierarchy (parent_role_id, child_role_id)
        VALUES ($1, $2)
        ON CONFLICT (parent_role_id, child_role_id) DO NOTHING
        RETURNING *
      `;

      const { rows } = await query(queryText, [parentRoleId, childRoleId]);
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
      const queryText = `
        DELETE FROM role_hierarchy
        WHERE parent_role_id = $1 AND child_role_id = $2
        RETURNING id
      `;

      const { rows } = await query(queryText, [parentRoleId, childRoleId]);
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
      const queryText = `
        SELECT * FROM get_user_permissions($1)
      `;

      const { rows } = await query(queryText, [userId]);
      return rows;
    } catch (error) {
      logger.error(`Fehler beim Abrufen der Berechtigungen für Benutzer ${userId}:`, error);
      throw error;
    }
  }
};

module.exports = RoleModel;
