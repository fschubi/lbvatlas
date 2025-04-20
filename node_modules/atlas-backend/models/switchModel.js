const pool = require('../db');
const { toSnakeCase } = require('../utils/caseConverter');

const SwitchModel = {
  /**
   * Holt alle Switches aus der Datenbank, sortiert nach Name.
   * @returns {Promise<Array>} Ein Array von Switch-Objekten.
   */
  async getAll() {
    const query = 'SELECT * FROM network_switches ORDER BY name ASC';
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Fehler beim Abrufen aller Switches:', error);
      throw error;
    }
  },

  /**
   * Holt einen Switch anhand seiner ID.
   * @param {number} id - Die ID des Switches.
   * @returns {Promise<object|null>} Das Switch-Objekt oder null, wenn nicht gefunden.
   */
  async getById(id) {
    const query = 'SELECT * FROM network_switches WHERE id = $1';
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.error(`Fehler beim Abrufen des Switches mit ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Überprüft, ob ein Switch-Name bereits existiert (optional unter Ausschluss einer ID).
   * Nützlich, um Duplikate beim Erstellen/Aktualisieren zu verhindern.
   * @param {string} name - Der zu prüfende Name.
   * @param {number|null} excludeId - Die ID, die bei der Prüfung ignoriert werden soll (beim Update).
   * @returns {Promise<boolean>} True, wenn der Name existiert, sonst false.
   */
  async checkNameExists(name, excludeId = null) {
    let query = 'SELECT 1 FROM network_switches WHERE lower(name) = lower($1)';
    const params = [name];
    if (excludeId !== null) {
      query += ' AND id != $2';
      params.push(excludeId);
    }
    const { rows } = await pool.query(query, params);
    const exists = rows.length > 0;
    return exists;
  },

  /**
   * Erstellt einen neuen Switch in der Datenbank.
   * @param {object} switchData - Die Daten des neuen Switches (snake_case).
   * @returns {Promise<object>} Das neu erstellte Switch-Objekt.
   */
  async create(switchData) {
    const snakeCaseData = toSnakeCase(switchData);
    const columns = Object.keys(snakeCaseData).join(', ');
    const placeholders = Object.keys(snakeCaseData).map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(snakeCaseData);

    const query = `INSERT INTO network_switches (${columns}) VALUES (${placeholders}) RETURNING *`;
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Fehler beim Erstellen des Switches:', error);
      throw error;
    }
  },

  /**
   * Aktualisiert einen vorhandenen Switch.
   * @param {number} id - Die ID des zu aktualisierenden Switches.
   * @param {object} switchData - Die neuen Daten für den Switch (snake_case).
   * @returns {Promise<object|null>} Das aktualisierte Switch-Objekt oder null, wenn nicht gefunden.
   */
  async update(id, switchData) {
    const snakeCaseData = toSnakeCase(switchData);
    // Felder, die nicht aktualisiert werden sollen (z.B. id, created_at)
    delete snakeCaseData.id;
    delete snakeCaseData.created_at;
    delete snakeCaseData.updated_at; // Auch updatedAt entfernen, da es automatisch gesetzt werden sollte

    const setClauses = Object.keys(snakeCaseData).map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = Object.values(snakeCaseData);

    // Füge die ID als letzten Parameter für die WHERE-Klausel hinzu
    values.push(id);
    const query = `UPDATE network_switches SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`;

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Switches mit ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Löscht einen Switch anhand seiner ID.
   * @param {number} id - Die ID des zu löschenden Switches.
   * @returns {Promise<{ message?: string }>} Ein Bestätigungsobjekt oder null, wenn nicht gefunden.
   */
  async delete(id) {
    const query = 'DELETE FROM network_switches WHERE id = $1';
    try {
      const result = await pool.query(query, [id]);
      return result.rowCount > 0; // Gibt true zurück, wenn eine Zeile gelöscht wurde
    } catch (error) {
      console.error(`Fehler beim Löschen des Switches mit ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Ruft die Anzahl der Switches ab, optional gefiltert nach Status.
   * @param {string|null} statusFilter - 'active', 'inactive' oder null für alle.
   * @returns {Promise<number>} Die Anzahl der Switches.
   */
  async getCount(statusFilter = null) {
    let query = 'SELECT COUNT(*) AS count FROM network_switches';
    const params = [];
    if (statusFilter === 'active') {
      query += ' WHERE is_active = true';
    } else if (statusFilter === 'inactive') {
      query += ' WHERE is_active = false';
    }
    // Weitere Filter könnten hier hinzugefügt werden

    try {
      const result = await pool.query(query, params);
      const count = parseInt(result.rows[0].count, 10);
      return count;
    } catch (error) {
      console.error('Fehler beim Zählen der Switches:', error);
      throw error;
    }
  },

  // Zusätzliche Funktionen nach Bedarf, z.B. für Suche oder Validierung
  async findByName(name) {
    const query = 'SELECT * FROM network_switches WHERE LOWER(name) = LOWER($1)';
    try {
      const result = await pool.query(query, [name]);
      return result.rows[0];
    } catch (error) {
      console.error(`Fehler bei der Suche nach Switch mit Namen "${name}":`, error);
      throw error;
    }
  }
};

module.exports = SwitchModel;
