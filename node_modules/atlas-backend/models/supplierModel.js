const db = require('../db');
const { NotFoundError, DatabaseError, ConflictError } = require('../utils/customErrors.js');

class SupplierModel {
  // ... rest of the file

  // Alle Lieferanten abrufen
  async getAll() {
    try {
      const { rows } = await db.query('SELECT * FROM suppliers ORDER BY name');
      return rows;
    } catch (error) {
      console.error('[supplierModel.getAll]', error);
      throw new Error('Fehler beim Abrufen aller Lieferanten');
    }
  }

  // Lieferant nach ID abrufen
  async getById(id) {
    try {
      const { rows } = await db.query('SELECT * FROM suppliers WHERE id = $1', [id]);
      if (rows.length === 0) {
        return null; // Oder Fehler werfen?
      }
      return rows[0];
    } catch (error) {
      console.error(`[supplierModel.getById(${id})]`, error);
      throw new Error('Fehler beim Abrufen des Lieferanten nach ID');
    }
  }

  // Hilfsfunktion zur Prüfung, ob Name bereits existiert
  async checkNameExists(name, excludeId = null) {
    try {
      let query = 'SELECT id FROM suppliers WHERE lower(name) = lower($1)';
      const params = [name];
      if (excludeId) {
        query += ' AND id != $2';
        params.push(excludeId);
      }
      const { rows } = await db.query(query, params);
      return rows.length > 0;
    } catch (error) {
      console.error(`[supplierModel.checkNameExists(${name}, ${excludeId})]`, error);
      throw new Error('Fehler bei der Prüfung des Lieferantennamens');
    }
  }

  // Neuen Lieferanten erstellen
  async create(supplierData) {
    const {
      name,
      description,
      website,
      address,
      city,
      postal_code,
      contact_person,
      contact_email,
      contact_phone,
      contract_number,
      notes,
      is_active = true // Defaultwert
    } = supplierData;

    try {
      // Prüfen, ob Name bereits existiert
      if (await this.checkNameExists(name)) {
        throw new Error(`Ein Lieferant mit dem Namen "${name}" existiert bereits.`);
      }

      const query = `
        INSERT INTO suppliers (
          name, description, website, address, city, postal_code,
          contact_person, contact_email, contact_phone, contract_number,
          notes, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      const values = [
        name, description, website, address, city, postal_code,
        contact_person, contact_email, contact_phone, contract_number,
        notes, is_active
      ];

      const { rows } = await db.query(query, values);
      return rows[0];
    } catch (error) {
      console.error('[supplierModel.create]', error);
      // Spezifischen Fehler weitergeben, falls vorhanden
      if (error.message.includes('existiert bereits')) {
        throw error;
      }
      throw new Error('Fehler beim Erstellen des Lieferanten');
    }
  }

  // Lieferant aktualisieren
  async update(id, supplierData) {
    try {
      // Prüfen, ob Lieferant existiert
      const existingSupplier = await this.getById(id);
      if (!existingSupplier) {
        throw new Error('Lieferant nicht gefunden');
      }

      // Prüfen, ob neuer Name bereits von anderem Lieferanten verwendet wird
      if (supplierData.name && supplierData.name !== existingSupplier.name) {
        if (await this.checkNameExists(supplierData.name, id)) {
          throw new Error(`Ein anderer Lieferant mit dem Namen "${supplierData.name}" existiert bereits.`);
        }
      }

      // Dynamisches Update-Statement erstellen
      const fields = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(supplierData).forEach(key => {
        // Konvertiere camelCase zu snake_case falls nötig (supplierData kommt vom Controller)
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        // Prüfe ob das Feld in der DB-Tabelle existiert (optional, zur Sicherheit)
        const validColumns = ['name', 'description', 'website', 'address', 'city', 'postal_code', 'contact_person', 'contact_email', 'contact_phone', 'contract_number', 'notes', 'is_active'];
        if (validColumns.includes(snakeKey)) {
          fields.push(`${snakeKey} = $${paramIndex}`);
          values.push(supplierData[key]);
          paramIndex++;
        }
      });

      if (fields.length === 0) {
        return existingSupplier; // Keine Änderungen
      }

      values.push(id); // ID für WHERE-Klausel
      const query = `
        UPDATE suppliers
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const { rows } = await db.query(query, values);
      return rows[0];
    } catch (error) {
      console.error(`[supplierModel.update(${id})]`, error);
      // Spezifischen Fehler weitergeben
      if (error.message.includes('existiert bereits') || error.message === 'Lieferant nicht gefunden') {
        throw error;
      }
      throw new Error('Fehler beim Aktualisieren des Lieferanten');
    }
  }

  // Lieferant löschen
  async delete(id) {
    try {
      // **WICHTIG:** Hier müsste geprüft werden, ob der Lieferant noch in anderen Tabellen
      // (z.B. devices, licenses) verwendet wird, bevor er gelöscht wird.
      // Beispiel (vereinfacht):
      // const deviceCheck = await db.query('SELECT id FROM devices WHERE supplier_id = $1 LIMIT 1', [id]);
      // if (deviceCheck.rows.length > 0) {
      //     throw new Error('Lieferant wird noch von Geräten verwendet.');
      // }
      // (Füge ähnliche Prüfungen für andere relevante Tabellen hinzu)

      const { rowCount } = await db.query('DELETE FROM suppliers WHERE id = $1', [id]);
      if (rowCount === 0) {
        throw new Error('Lieferant nicht gefunden');
      }
      // Rückgabe ist hier nicht unbedingt nötig, da Controller nur Nachricht sendet
      return { id: id, message: 'Lieferant gelöscht' };
    } catch (error) {
      console.error(`[supplierModel.delete(${id})]`, error);
      // Spezifischen Fehler weitergeben
      if (error.message === 'Lieferant nicht gefunden' || error.message.includes('verwendet')) {
        throw error;
      }
      throw new Error('Fehler beim Löschen des Lieferanten');
    }
  }
}

module.exports = new SupplierModel();
