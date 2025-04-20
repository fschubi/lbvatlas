const db = require('../db');

class DeviceModelModel {
  // Alle Gerätemodelle mit Geräteanzahl abrufen
  async getDeviceModels() {
    try {
      const result = await db.query(`
        SELECT
          dm.*,
          m.name AS manufacturer_name,
          c.name AS category_name,
          COUNT(d.id) AS device_count
        FROM device_models dm
        LEFT JOIN manufacturers m ON dm.manufacturer_id = m.id
        LEFT JOIN categories c ON dm.category_id = c.id
        LEFT JOIN devices d ON dm.id = d.model
        GROUP BY dm.id, m.name, c.name
        ORDER BY dm.name ASC
      `);
      // Konvertiere is_active zu isActive
      return result.rows.map(model => ({ ...model, isActive: model.is_active }));
    } catch (error) {
      console.error('Fehler beim Abrufen der Gerätemodelle:', error);
      throw error;
    }
  }

  // Gerätemodell nach ID abrufen
  async getDeviceModelById(id) {
    try {
      const result = await db.query(`
        SELECT
          dm.*,
          m.name AS manufacturer_name,
          c.name AS category_name,
          (SELECT COUNT(*) FROM devices WHERE model = dm.id) AS device_count
        FROM device_models dm
        LEFT JOIN manufacturers m ON dm.manufacturer_id = m.id
        LEFT JOIN categories c ON dm.category_id = c.id
        WHERE dm.id = $1
      `, [id]);

      if (result.rows.length === 0) return null;

       const model = result.rows[0];
      // Konvertiere is_active zu isActive
      return { ...model, isActive: model.is_active };

    } catch (error) {
      console.error(`Fehler beim Abrufen des Gerätemodells mit ID ${id}:`, error);
      throw error;
    }
  }

  // Neues Gerätemodell erstellen
  async createDeviceModel(modelData) {
    try {
      // Überprüfen, ob ein Modell mit diesem Namen bereits existiert
      const existingCheck = await db.query('SELECT id FROM device_models WHERE LOWER(name) = LOWER($1)', [modelData.name]);
      if (existingCheck.rows.length > 0) {
        throw new Error(`Ein Gerätemodell mit dem Namen "${modelData.name}" existiert bereits`);
      }

      const query = `
        INSERT INTO device_models (
          name, description, manufacturer_id, category_id, specifications, cpu, ram, hdd, warranty_months, is_active, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING id
      `;
      const values = [
          modelData.name,
          modelData.description || null,
          modelData.manufacturer_id || null,
          modelData.category_id || null,
          modelData.specifications || null,
          modelData.cpu || null,
          modelData.ram || null,
          modelData.hdd || null,
          modelData.warranty_months || null,
          modelData.is_active !== undefined ? modelData.is_active : true
      ];
      const { rows } = await db.query(query, values);
      const newModelId = rows[0].id;

      // Hole das neu erstellte Modell mit Details
      return await this.getDeviceModelById(newModelId);

    } catch (error) {
      console.error('Fehler beim Erstellen des Gerätemodells:', error);
      if (error.code === '23505') { // Unique constraint violation
          throw new Error(`Ein Gerätemodell mit dem Namen "${modelData.name}" existiert bereits`);
      }
       if (error.code === '23503') { // Foreign key violation
            throw new Error('Ungültige Hersteller-ID oder Kategorie-ID angegeben.');
      }
      throw error;
    }
  }

  // Gerätemodell aktualisieren
  async updateDeviceModel(id, modelData) {
    try {
      // Überprüfen, ob das Modell existiert
      const existingModel = await this.getDeviceModelById(id);
      if (!existingModel) {
        throw new Error('Gerätemodell nicht gefunden');
      }

      // Überprüfen, ob ein anderes Modell mit diesem Namen existiert
      if (modelData.name) {
        const existingCheck = await db.query('SELECT id FROM device_models WHERE LOWER(name) = LOWER($1) AND id != $2', [modelData.name, id]);
        if (existingCheck.rows.length > 0) {
          throw new Error(`Ein anderes Gerätemodell mit dem Namen "${modelData.name}" existiert bereits`);
        }
      }

      // Dynamisches Update für die angegebenen Felder
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      const fieldMap = {
        name: 'name',
        description: 'description',
        manufacturerId: 'manufacturer_id',
        categoryId: 'category_id',
        specifications: 'specifications',
        cpu: 'cpu',
        ram: 'ram',
        hdd: 'hdd',
        warrantyMonths: 'warranty_months',
        isActive: 'is_active' // Verwende isActive für die Zuordnung
      };

      Object.entries(fieldMap).forEach(([jsField, dbField]) => {
        if (modelData[jsField] !== undefined) {
          updateFields.push(`${dbField} = $${paramIndex}`);
          // Behandle null explizit für Fremdschlüssel
          if ((dbField === 'manufacturer_id' || dbField === 'category_id') && modelData[jsField] === null) {
              values.push(null);
          } else {
               values.push(modelData[jsField]);
          }
          paramIndex++;
        }
      });

      // updated_at immer aktualisieren
      updateFields.push(`updated_at = NOW()`);

      // Wenn keine Felder zum Aktualisieren vorhanden sind (nur updated_at)
      if (updateFields.length === 1) {
        throw new Error('Keine Daten zum Aktualisieren angegeben');
      }

      // ID für WHERE-Klausel
      values.push(id);

      const query = `
        UPDATE device_models
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id
      `;

      const { rows } = await db.query(query, values);

       // Hole das aktualisierte Modell mit Details
      return await this.getDeviceModelById(id);

    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Gerätemodells mit ID ${id}:`, error);
      if (error.code === '23505') { // Unique constraint violation
          throw new Error(`Ein anderes Gerätemodell mit dem Namen "${modelData.name}" existiert bereits`);
      }
       if (error.code === '23503') { // Foreign key violation
            throw new Error('Ungültige Hersteller-ID oder Kategorie-ID angegeben.');
      }
      throw error;
    }
  }

  // Gerätemodell löschen
  async deleteDeviceModel(id) {
    try {
      // Überprüfen, ob das Modell existiert
      const existingModel = await this.getDeviceModelById(id);
      if (!existingModel) {
        throw new Error('Gerätemodell nicht gefunden');
      }

      // Überprüfen, ob Geräte mit diesem Modell verknüpft sind
      const deviceCheck = await db.query('SELECT COUNT(*) FROM devices WHERE model = $1', [id]);
      if (parseInt(deviceCheck.rows[0].count) > 0) {
        throw new Error(`Das Gerätemodell "${existingModel.name}" wird von ${deviceCheck.rows[0].count} Geräten verwendet und kann nicht gelöscht werden`);
      }

      // Modell löschen
      const { rows } = await db.query('DELETE FROM device_models WHERE id = $1 RETURNING *', [id]);
      const deletedModel = rows[0];

      return { success: true, message: 'Gerätemodell gelöscht', data: { ...deletedModel, isActive: deletedModel.is_active } };

    } catch (error) {
      console.error(`Fehler beim Löschen des Gerätemodells mit ID ${id}:`, error);
       if (error.code === '23503') { // Foreign key violation (sollte durch die Geräteprüfung abgedeckt sein)
          throw new Error(`Das Gerätemodell wird noch verwendet und kann nicht gelöscht werden.`);
      }
      throw error;
    }
  }

  // Anzahl der Geräte pro Modell abrufen
  async getDeviceCountsByModel() {
    try {
      const result = await db.query(`
        SELECT
          dm.id,
          COUNT(d.id) AS device_count
        FROM device_models dm
        LEFT JOIN devices d ON dm.id = d.model
        GROUP BY dm.id
      `);

      // Umwandeln in ein Objekt mit ID als Schlüssel
      const countMap = {};
      result.rows.forEach(row => {
        countMap[row.id] = parseInt(row.device_count);
      });

      return countMap;
    } catch (error) {
      console.error('Fehler beim Abrufen der Geräteanzahl pro Modell:', error);
      throw error;
    }
  }
}

module.exports = new DeviceModelModel();
