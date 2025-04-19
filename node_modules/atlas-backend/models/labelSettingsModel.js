const db = require('../db');
const { NotFoundError, DatabaseError } = require('../utils/customErrors.js');

class LabelSettingsModel {
  // Label-Einstellungen für einen Benutzer oder global abrufen
  async getLabelSettings(userId = null) {
    const query = `
      SELECT settings
      FROM label_settings
      WHERE user_id IS ${userId ? '$1' : 'NULL'};
    `;
    const params = userId ? [userId] : [];

    try {
      const { rows } = await db.query(query, params);
      if (rows.length > 0) {
        return rows[0].settings; // Das JSON-Objekt zurückgeben
      }
      return null; // Keine Einstellungen gefunden
    } catch (error) {
      console.error('Fehler beim Abrufen der Label-Einstellungen:', error);
      throw new DatabaseError('Datenbankfehler beim Abrufen der Label-Einstellungen.');
    }
  }

  // Label-Einstellungen für einen Benutzer oder global speichern/aktualisieren
  async saveLabelSettings(settings, userId = null) {
    const query = `
      INSERT INTO label_settings (user_id, settings)
      VALUES (${userId ? '$1' : 'NULL'}, $${userId ? 2 : 1})
      ON CONFLICT (user_id) DO UPDATE
      SET settings = EXCLUDED.settings,
          updated_at = CURRENT_TIMESTAMP;
    `;
    const params = userId ? [userId, settings] : [settings];

    try {
      await db.query(query, params);
      return settings; // Die gespeicherten Einstellungen zurückgeben
    } catch (error) {
      console.error('Fehler beim Speichern der Label-Einstellungen:', error);
      throw new DatabaseError('Datenbankfehler beim Speichern der Label-Einstellungen.');
    }
  }

  // Löschen der Einstellungen für einen Benutzer (z.B. wenn Benutzer gelöscht wird)
  async deleteLabelSettings(userId) {
    if (!userId) {
      throw new Error('User ID muss angegeben werden, um Einstellungen zu löschen.')
    }
    const query = `DELETE FROM label_settings WHERE user_id = $1`;
    try {
      const result = await db.query(query, [userId]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Fehler beim Löschen der Label-Einstellungen für Benutzer:', userId, error);
      throw new DatabaseError('Datenbankfehler beim Löschen der Label-Einstellungen.');
    }
  }
}

module.exports = new LabelSettingsModel();
