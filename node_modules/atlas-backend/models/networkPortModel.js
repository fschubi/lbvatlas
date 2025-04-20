const pool = require('../db');
const { toSnakeCase } = require('../utils/caseConverter'); // Obwohl hier nicht direkt verwendet, für Konsistenz

const NetworkPortModel = {
  /**
   * Holt alle Netzwerk-Ports aus der Datenbank, sortiert nach Portnummer.
   * @returns {Promise<Array>} Ein Array von NetworkPort-Objekten.
   */
  async getAll() {
    const query = 'SELECT * FROM network_ports ORDER BY port_number ASC';
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Fehler beim Abrufen aller Netzwerk-Ports:', error);
      throw error;
    }
  },

  /**
   * Holt einen Netzwerk-Port anhand seiner ID.
   * @param {number} id - Die ID des Ports.
   * @returns {Promise<object|null>} Das NetworkPort-Objekt oder null, wenn nicht gefunden.
   */
  async getById(id) {
    const query = 'SELECT * FROM network_ports WHERE id = $1';
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.error(`Fehler beim Abrufen des Netzwerk-Ports mit ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Findet einen Netzwerk-Port anhand seiner Portnummer.
   * @param {number} portNumber - Die zu suchende Portnummer.
   * @returns {Promise<object|null>} Das NetworkPort-Objekt oder null, wenn nicht gefunden.
   */
  async findByPortNumber(portNumber) {
    const query = 'SELECT * FROM network_ports WHERE port_number = $1';
    try {
      const result = await pool.query(query, [portNumber]);
      return result.rows[0];
    } catch (error) {
      console.error(`Fehler bei der Suche nach Netzwerk-Port mit Nummer ${portNumber}:`, error);
      throw error;
    }
  },

  /**
   * Erstellt einen neuen Netzwerk-Port in der Datenbank.
   * Erwartet 'port_number' im Datenobjekt.
   * @param {object} portData - Die Daten des neuen Ports (snake_case erwartet, aber hier nur port_number relevant).
   * @returns {Promise<object>} Das neu erstellte NetworkPort-Objekt.
   */
  async create(portData) {
    // Stelle sicher, dass nur relevante Daten verwendet werden
    const { port_number } = toSnakeCase(portData); // Konvertiere zur Sicherheit

    if (port_number === undefined || port_number === null) {
        throw new Error('Portnummer muss angegeben werden.');
    }

    const query = 'INSERT INTO network_ports (port_number) VALUES ($1) RETURNING *';
    try {
      const result = await pool.query(query, [port_number]);
      return result.rows[0];
    } catch (error) {
      console.error('Fehler beim Erstellen des Netzwerk-Ports:', error);
      // Prüfe auf UNIQUE constraint violation
      if (error.code === '23505') { // PostgreSQL unique violation code
        throw new Error(`Ein Netzwerk-Port mit der Nummer ${port_number} existiert bereits.`);
      }
      throw error;
    }
  },

  /**
   * Aktualisiert einen vorhandenen Netzwerk-Port.
   * Erwartet 'port_number' im Datenobjekt.
   * @param {number} id - Die ID des zu aktualisierenden Ports.
   * @param {object} portData - Die neuen Daten für den Port (snake_case erwartet).
   * @returns {Promise<object|null>} Das aktualisierte NetworkPort-Objekt oder null, wenn nicht gefunden.
   */
  async update(id, portData) {
    const { port_number } = toSnakeCase(portData); // Konvertiere zur Sicherheit

    if (port_number === undefined || port_number === null) {
      throw new Error('Portnummer muss für das Update angegeben werden.');
    }

    // updated_at wird automatisch durch CURRENT_TIMESTAMP gesetzt
    const query = 'UPDATE network_ports SET port_number = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
    try {
      const result = await pool.query(query, [port_number, id]);
      return result.rows[0]; // Gibt das aktualisierte Objekt zurück
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Netzwerk-Ports mit ID ${id}:`, error);
       // Prüfe auf UNIQUE constraint violation
       if (error.code === '23505') {
        throw new Error(`Ein anderer Netzwerk-Port mit der Nummer ${port_number} existiert bereits.`);
      }
      throw error;
    }
  },

  /**
   * Löscht einen Netzwerk-Port anhand seiner ID.
   * @param {number} id - Die ID des zu löschenden Ports.
   * @returns {Promise<boolean>} True, wenn erfolgreich gelöscht, sonst false.
   */
  async delete(id) {
    const query = 'DELETE FROM network_ports WHERE id = $1';
    try {
      const result = await pool.query(query, [id]);
      return result.rowCount > 0; // Gibt true zurück, wenn eine Zeile gelöscht wurde
    } catch (error) {
      // Möglicher Fehler: FK-Verletzung, wenn Ports noch verwendet werden? Prüfen!
      console.error(`Fehler beim Löschen des Netzwerk-Ports mit ID ${id}:`, error);
      // Optional: Spezifische Fehler für FK-Verletzungen behandeln
      // if (error.code === '23503') { ... }
      throw error;
    }
  }
};

module.exports = NetworkPortModel;
