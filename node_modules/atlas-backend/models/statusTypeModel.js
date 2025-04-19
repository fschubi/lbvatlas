const db = require('../db');

class StatusTypeModel {

  // Alle Statustypen abrufen
  async getAllStatusTypes() {
    try {
      const query = `SELECT * FROM status_types ORDER BY name ASC`;
      const { rows } = await db.query(query);
      // Optional: isActive hinzufügen, falls benötigt
      // return rows.map(st => ({ ...st, isActive: true }));
      return rows;
    } catch (error) {
      console.error('Fehler beim Abrufen aller Statustypen:', error);
      throw error;
    }
  }

  // Statustyp nach ID abrufen
  async getStatusTypeById(id) {
    try {
      const query = `SELECT * FROM status_types WHERE id = $1`;
      const { rows } = await db.query(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('Fehler beim Abrufen des Statustyps nach ID:', error);
      throw error;
    }
  }

  // Neuen Statustyp erstellen
  async createStatusType(statusData) {
    try {
      // Prüfen, ob ein Statustyp mit diesem Namen bereits existiert
      const checkQuery = `SELECT id FROM status_types WHERE LOWER(name) = LOWER($1)`;
      const { rows: existingStatus } = await db.query(checkQuery, [statusData.name]);
      if (existingStatus.length > 0) {
        throw new Error('Ein Statustyp mit diesem Namen existiert bereits');
      }

      const query = `
        INSERT INTO status_types (name, color, description, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING *
      `;
      const values = [
        statusData.name,
        statusData.color || '#ffffff', // Standardfarbe weiß
        statusData.description || null
      ];
      const { rows } = await db.query(query, values);
      return rows[0];
    } catch (error) {
      console.error('Fehler beim Erstellen des Statustyps:', error);
      if (error.code === '23505') { // Unique constraint violation
          throw new Error('Ein Statustyp mit diesem Namen existiert bereits');
      }
      throw error;
    }
  }

  // Statustyp aktualisieren
  async updateStatusType(id, statusData) { // Umbenannt von updateStatus
    try {
      // Prüfen, ob ein anderer Eintrag bereits den Namen verwendet
      if (statusData.name) {
        const checkQuery = `SELECT id FROM status_types WHERE LOWER(name) = LOWER($1) AND id != $2`;
        const { rows: existingStatus } = await db.query(checkQuery, [statusData.name, id]);
        if (existingStatus.rows.length > 0) {
          throw new Error('Ein anderer Statustyp mit diesem Namen existiert bereits');
        }
      }

      const query = `
        UPDATE status_types SET
          name = COALESCE($1, name),
          color = COALESCE($2, color),
          description = COALESCE($3, description),
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;
      const values = [
        statusData.name,
        statusData.color,
        statusData.description,
        id
      ];
      const { rows } = await db.query(query, values);

      if (rows.length === 0) {
        throw new Error('Statustyp nicht gefunden');
      }
      return rows[0];
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Statustyps:', error);
      if (error.code === '23505') { // Unique constraint violation
          throw new Error('Ein anderer Statustyp mit diesem Namen existiert bereits');
      }
      throw error;
    }
  }

  // Statustyp löschen
  async deleteStatusType(id) {
    try {
       // Prüfen, ob der Statustyp verwendet wird (z.B. von Geräten)
       const checkDevicesQuery = `SELECT COUNT(*) FROM devices WHERE status_id = $1`;
       const deviceUsage = await db.query(checkDevicesQuery, [id]);
       if (parseInt(deviceUsage.rows[0].count) > 0) {
           throw new Error('Statustyp kann nicht gelöscht werden, da er noch von Geräten verwendet wird.');
       }
        // Weitere Prüfungen hier (Lizenzen, Zubehör etc.)

      const query = `DELETE FROM status_types WHERE id = $1 RETURNING *`;
      const { rows } = await db.query(query, [id]);

      if (rows.length === 0) {
        throw new Error('Statustyp nicht gefunden');
      }
      return { success: true, message: 'Statustyp gelöscht', data: rows[0] };
    } catch (error) {
      console.error('Fehler beim Löschen des Statustyps:', error);
       if (error.code === '23503') { // Foreign key violation
          throw new Error('Statustyp kann nicht gelöscht werden, da er noch verwendet wird.');
      }
      throw error;
    }
  }
}

module.exports = new StatusTypeModel();
