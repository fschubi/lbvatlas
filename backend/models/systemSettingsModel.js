const db = require('../db');
const { DatabaseError, NotFoundError } = require('../utils/customErrors');

// Annahme: Es gibt eine Tabelle `system_settings` mit z.B. einer Spalte `settings` (JSONB)
// und ggf. einem eindeutigen Schlüssel oder nur einer Zeile.

class SystemSettingsModel {

    /**
     * Ruft die globalen Systemeinstellungen ab.
     * @returns {Promise<object|null>} Ein Promise, das das Einstellungs-JSON-Objekt oder null auflöst.
     * @throws {DatabaseError} Wenn ein Datenbankfehler auftritt.
     */
    async getSystemSettings() {
        // Wir gehen davon aus, dass es nur einen Satz globaler Einstellungen gibt,
        // eventuell identifiziert durch einen festen Schlüssel oder einfach die erste Zeile.
        // Beispiel: SELECT settings FROM system_settings WHERE key = 'global' LIMIT 1;
        // Oder einfacher: SELECT settings FROM system_settings LIMIT 1;
        const query = 'SELECT settings FROM system_settings LIMIT 1';

        try {
            const { rows } = await db.query(query);
            if (rows.length > 0) {
                return rows[0].settings; // Das JSON-Objekt zurückgeben
            }
            // Keine Einstellungen gefunden, was initial okay sein kann.
            console.log('Keine Systemeinstellungen in der Datenbank gefunden.');
            return null;
        } catch (error) {
            console.error('Fehler beim Abrufen der Systemeinstellungen:', error);
            throw new DatabaseError('Datenbankfehler beim Abrufen der Systemeinstellungen.');
        }
    }

    /**
     * Speichert oder aktualisiert die globalen Systemeinstellungen.
     * @param {object} settings Das JSON-Objekt mit den zu speichernden Einstellungen.
     * @returns {Promise<object>} Ein Promise, das das gespeicherte Einstellungs-Objekt auflöst.
     * @throws {DatabaseError} Wenn ein Datenbankfehler auftritt.
     * @throws {Error} Wenn die übergebenen Einstellungen kein gültiges Objekt sind.
     */
    async saveSystemSettings(settings) {
        if (typeof settings !== 'object' || settings === null) {
            throw new Error('Ungültige Systemeinstellungen: Ein Objekt wurde erwartet.');
        }

        // Wir verwenden INSERT ... ON CONFLICT DO UPDATE, um sicherzustellen, dass nur eine Zeile existiert
        // (benötigt einen UNIQUE Index, z.B. auf einer fiktiven 'key' Spalte oder einfach einen PRIMARY KEY)
        // Beispiel: Angenommen, es gibt eine Spalte `id` mit dem Wert 1 für die globalen Einstellungen.
        const query = `
            INSERT INTO system_settings (id, settings) VALUES (1, $1)
            ON CONFLICT (id) DO UPDATE
            SET settings = EXCLUDED.settings,
                updated_at = CURRENT_TIMESTAMP
            RETURNING settings;
        `;

        try {
            const { rows } = await db.query(query, [settings]);
            if (rows.length > 0) {
                return rows[0].settings; // Die erfolgreich gespeicherten/aktualisierten Einstellungen zurückgeben
            }
            // Dieser Fall sollte durch RETURNING eigentlich nicht eintreten, außer bei unerwarteten Fehlern.
            throw new DatabaseError('Fehler beim Speichern der Systemeinstellungen: Keine Daten zurückgegeben.');
        } catch (error) {
            console.error('Fehler beim Speichern der Systemeinstellungen:', error);
            throw new DatabaseError('Datenbankfehler beim Speichern der Systemeinstellungen.');
        }
    }
}

module.exports = new SystemSettingsModel();
