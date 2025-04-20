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
      if (manufacturerData.name && manufacturerData.name.toLowerCase() !== existingManufacturer.name.toLowerCase()) {
        const checkQuery = 'SELECT id FROM manufacturers WHERE LOWER(name) = LOWER($1) AND id != $2';
        const { rows: duplicateNames } = await db.query(checkQuery, [manufacturerData.name, manufacturerId]);

        if (duplicateNames.length > 0) {
          throw new Error(`Ein anderer Hersteller mit dem Namen "${manufacturerData.name}" existiert bereits`);
        }
      }

      // *** KORREKTUR: Query und Values erweitern ***
      const updateFields = [];
      const values = [];
      let valueIndex = 1;

      // Dynamisch Felder hinzufügen, die im manufacturerData Objekt vorhanden sind
      if (manufacturerData.name !== undefined) {
        updateFields.push(`name = $${valueIndex++}`);
        values.push(manufacturerData.name);
      }
      if (manufacturerData.description !== undefined) {
        updateFields.push(`description = $${valueIndex++}`);
        values.push(manufacturerData.description);
      }
       if (manufacturerData.website !== undefined) {
        updateFields.push(`website = $${valueIndex++}`);
        values.push(manufacturerData.website || null); // Leeren String als NULL speichern
      }
       if (manufacturerData.contact_email !== undefined) { // snake_case verwenden, wie es vom Frontend kommt
        updateFields.push(`contact_email = $${valueIndex++}`);
        values.push(manufacturerData.contact_email || null);
      }
       if (manufacturerData.contact_phone !== undefined) { // snake_case verwenden
        updateFields.push(`contact_phone = $${valueIndex++}`);
        values.push(manufacturerData.contact_phone || null);
      }
       if (manufacturerData.is_active !== undefined) { // snake_case verwenden
        updateFields.push(`is_active = $${valueIndex++}`);
        values.push(manufacturerData.is_active);
      }

      // Wenn keine Felder zum Aktualisieren vorhanden sind (sollte durch Controller abgefangen werden, aber sicherheitshalber)
      if (updateFields.length === 0) {
         console.warn('[updateManufacturer] Keine Felder zum Aktualisieren für ID:', manufacturerId);
         // Gebe den existierenden Hersteller zurück, da nichts geändert wurde
         return { ...existingManufacturer, isActive: existingManufacturer.is_active };
      }

      // Update-Query zusammensetzen
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`); // Immer aktualisieren
      const updateQuery = `
        UPDATE manufacturers SET
          ${updateFields.join(',\n          ')}
        WHERE id = $${valueIndex++} RETURNING *
      `;
      values.push(manufacturerId); // ID als letzten Wert hinzufügen

      // Debugging-Ausgabe für Query und Values
      console.log('[updateManufacturer] Executing Query:', updateQuery);
      console.log('[updateManufacturer] With Values:', values);

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
