const db = require('../db');

/**
 * Asset Tag Settings Model
 * Stellt Funktionen zum Lesen und Aktualisieren der Asset Tag-Einstellungen bereit
 */
const AssetTagSettings = {
  /**
   * Alle Asset Tag-Einstellungen abrufen
   * @returns {Promise<Object>} - Die aktuellen Asset Tag-Einstellungen
   */
  getSettings: async () => {
    try {
      const result = await db.query(
        'SELECT * FROM asset_tag_settings ORDER BY id LIMIT 1'
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Fehler beim Abrufen der Asset Tag-Einstellungen:', error);
      throw error;
    }
  },

  /**
   * Asset Tag-Einstellungen aktualisieren
   * @param {number} id - ID der Einstellungen
   * @param {Object} data - Neue Daten
   * @returns {Promise<Object>} - Die aktualisierten Einstellungen
   */
  updateSettings: async (id, data) => {
    try {
      const result = await db.query(
        `UPDATE asset_tag_settings
         SET prefix = $1,
             digit_count = $2,
             current_number = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [data.prefix, data.digitCount, data.currentNumber, id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Asset Tag-Einstellungen:', error);
      throw error;
    }
  },

  /**
   * Neue Asset Tag-Einstellungen erstellen
   * @param {Object} data - Die Einstellungsdaten
   * @returns {Promise<Object>} - Die erstellten Einstellungen
   */
  createSettings: async (data) => {
    try {
      const result = await db.query(
        `INSERT INTO asset_tag_settings
         (prefix, digit_count, current_number)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [data.prefix, data.digitCount, data.currentNumber]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Fehler beim Erstellen der Asset Tag-Einstellungen:', error);
      throw error;
    }
  },

  /**
   * Generiert den nächsten Asset Tag und inkrementiert die aktuelle Nummer
   * @returns {Promise<string>} - Der nächste Asset Tag
   */
  generateNextAssetTag: async () => {
    try {
      // Transaktion verwenden, um race conditions zu vermeiden
      await db.query('BEGIN');

      // Aktuelle Einstellungen lesen
      const settingsResult = await db.query(
        'SELECT * FROM asset_tag_settings ORDER BY id LIMIT 1 FOR UPDATE'
      );

      if (settingsResult.rows.length === 0) {
        await db.query('ROLLBACK');
        throw new Error('Keine Asset Tag-Einstellungen gefunden');
      }

      const settings = settingsResult.rows[0];
      const { prefix, digit_count, current_number } = settings;

      // Nächsten Tag generieren
      const paddedNumber = current_number.toString().padStart(digit_count, '0');
      const nextAssetTag = `${prefix}${paddedNumber}`;

      // current_number inkrementieren
      await db.query(
        `UPDATE asset_tag_settings
         SET current_number = current_number + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [settings.id]
      );

      await db.query('COMMIT');

      return nextAssetTag;
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('Fehler beim Generieren des nächsten Asset Tags:', error);
      throw error;
    }
  }
};

module.exports = AssetTagSettings;
