const db = require('../db');
const { NotFoundError, DatabaseError, ConflictError } = require('../utils/customErrors.js');

class ManufacturerModel {
  // Alle Hersteller abrufen
  async getManufacturers() {
    try {
      const { rows } = await db.query('SELECT * FROM manufacturers ORDER BY name');
      // Konvertiere is_active zu isActive für Frontend-Konsistenz
      return rows.map(m => ({ ...m, isActive: m.is_active }));
    } catch (error) {
      console.error('Datenbankfehler beim Abrufen aller Hersteller:', error);
      throw error;
    }
  }

  // Hersteller nach ID abrufen
  async getManufacturerById(manufacturerId) {
    try {
      const { rows } = await db.query('SELECT * FROM manufacturers WHERE id = $1', [manufacturerId]);
      if (!rows.length) return null;
      // Konvertiere is_active zu isActive
      const manufacturer = rows[0];
      return { ...manufacturer, isActive: manufacturer.is_active };
    } catch (error) {
      console.error('Datenbankfehler beim Abrufen des Herstellers nach ID:', error);
      throw error;
    }
  }

  // Neuen Hersteller erstellen
  async createManufacturer(manufacturerData) {
    try {
      // Überprüfen, ob ein Hersteller mit diesem Namen bereits existiert
      const checkQuery = 'SELECT id FROM manufacturers WHERE LOWER(name) = LOWER($1)';
      const { rows: existingManufacturers } = await db.query(checkQuery, [manufacturerData.name]);

      if (existingManufacturers.length > 0) {
        throw new Error(`Ein Hersteller mit dem Namen "${manufacturerData.name}" existiert bereits`);
      }

      // Neuen Hersteller in die Datenbank einfügen
      const insertQuery = `
        INSERT INTO manufacturers (name, description, is_active)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const values = [
        manufacturerData.name,
        manufacturerData.description || null,
        manufacturerData.isActive !== undefined ? manufacturerData.isActive : true // Verwende isActive aus den Daten
      ];
      const { rows } = await db.query(insertQuery, values);
      const newManufacturer = rows[0];

      // Konvertiere is_active zu isActive
      return { ...newManufacturer, isActive: newManufacturer.is_active };

    } catch (error) {
      console.error('Datenbankfehler beim Erstellen des Herstellers:', error);
      if (error.code === '23505') { // Unique constraint violation
          throw new Error(`Ein Hersteller mit dem Namen "${manufacturerData.name}" existiert bereits`);
      }
      throw error;
    }
  }

  // Hersteller aktualisieren
  async updateManufacturer(manufacturerId, manufacturerData) {
    try {
      // Überprüfen, ob der Hersteller existiert
      const { rows: existingManufacturers } = await db.query(
        'SELECT id, name FROM manufacturers WHERE id = $1',
        [manufacturerId]
      );

      if (existingManufacturers.length === 0) {
        throw new Error('Hersteller nicht gefunden');
      }

      const existingManufacturer = existingManufacturers[0];

      // Überprüfen, ob der neue Name bereits von einem anderen Hersteller verwendet wird
      if (manufacturerData.name && manufacturerData.name !== existingManufacturer.name) {
        const checkQuery = 'SELECT id FROM manufacturers WHERE LOWER(name) = LOWER($1) AND id != $2';
        const { rows: duplicateNames } = await db.query(checkQuery, [manufacturerData.name, manufacturerId]);

        if (duplicateNames.length > 0) {
          throw new Error(`Ein anderer Hersteller mit dem Namen "${manufacturerData.name}" existiert bereits`);
        }
      }

      // Hersteller aktualisieren
      const updateQuery = `
        UPDATE manufacturers SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          is_active = COALESCE($3, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 RETURNING *
      `;
      const values = [
        manufacturerData.name || null,
        manufacturerData.description,
        manufacturerData.isActive !== undefined ? manufacturerData.isActive : null, // Verwende isActive
        manufacturerId
      ];
      const { rows } = await db.query(updateQuery, values);
      const updatedManufacturer = rows[0];

       // Konvertiere is_active zu isActive
      return { ...updatedManufacturer, isActive: updatedManufacturer.is_active };

    } catch (error) {
      console.error('Datenbankfehler beim Aktualisieren des Herstellers:', error);
       if (error.code === '23505') { // Unique constraint violation
          throw new Error(`Ein anderer Hersteller mit dem Namen "${manufacturerData.name}" existiert bereits`);
      }
      throw error;
    }
  }

  // Hersteller löschen
  async deleteManufacturer(manufacturerId) {
    try {
      // Überprüfen, ob der Hersteller existiert
      const { rows: existsResult } = await db.query(
        'SELECT EXISTS(SELECT 1 FROM manufacturers WHERE id = $1)',
        [manufacturerId]
      );

      if (!existsResult[0].exists) {
        throw new Error('Hersteller nicht gefunden');
      }

       // Prüfen, ob der Hersteller in `device_models` verwendet wird
      const checkDeviceModelsQuery = `SELECT COUNT(*) FROM device_models WHERE manufacturer_id = $1`;
      const modelUsage = await db.query(checkDeviceModelsQuery, [manufacturerId]);
      if (parseInt(modelUsage.rows[0].count) > 0) {
          throw new Error('Hersteller kann nicht gelöscht werden, da er noch von Gerätemodellen verwendet wird.');
      }

      // Überprüfen, ob Geräte direkt diesen Hersteller verwenden (falls `manufacturer` Feld in `devices` ein String ist)
      // Dies ist weniger ideal als eine Fremdschlüsselbeziehung zu `manufacturers.id`
      // const { rows: devicesUsing } = await db.query(
      //   'SELECT EXISTS(SELECT 1 FROM devices WHERE manufacturer = (SELECT name FROM manufacturers WHERE id = $1))',
      //   [manufacturerId]
      // );
      // if (devicesUsing[0].exists) {
      //   throw new Error('Dieser Hersteller wird von Geräten verwendet und kann nicht gelöscht werden');
      // }

      // Überprüfen, ob Switches diesen Hersteller verwenden (falls `manufacturer` Feld in `network_switches` ein String ist)
      // const { rows: switchesUsing } = await db.query(
      //   'SELECT EXISTS(SELECT 1 FROM network_switches WHERE manufacturer = (SELECT name FROM manufacturers WHERE id = $1))',
      //   [manufacturerId]
      // );
      // if (switchesUsing[0].exists) {
      //   throw new Error('Dieser Hersteller wird von Switches verwendet und kann nicht gelöscht werden');
      // }

      // Hier können weitere Abhängigkeitsprüfungen hinzugefügt werden

      const { rows } = await db.query(
        'DELETE FROM manufacturers WHERE id = $1 RETURNING *',
        [manufacturerId]
      );
       const deletedManufacturer = rows[0];

      return { success: true, message: 'Hersteller gelöscht', data: { ...deletedManufacturer, isActive: deletedManufacturer.is_active } };
    } catch (error) {
      console.error('Datenbankfehler beim Löschen des Herstellers:', error);
      if (error.code === '23503') { // Foreign key violation
          throw new Error('Hersteller kann nicht gelöscht werden, da er noch verwendet wird (z.B. von Gerätemodellen).');
      }
      throw error;
    }
  }
}

module.exports = new ManufacturerModel();
