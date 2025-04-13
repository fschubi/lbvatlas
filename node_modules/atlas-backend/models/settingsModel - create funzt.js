const db = require('../db');

class SettingsModel {
  // Kategorien abfragen
  async getCategories() {
    try {
      const query = `
        SELECT * FROM categories
        ORDER BY name ASC
      `;
      const { rows } = await db.query(query);

      // Füge jedem Ergebnis das isActive-Feld hinzu
      const categoriesWithActive = rows.map(category => ({
        ...category,
        isActive: true // Alle Kategorien sind standardmäßig aktiv
      }));

      return categoriesWithActive;
    } catch (error) {
      console.error('Fehler beim Abrufen der Kategorien:', error);
      throw error;
    }
  }

  // Kategorie nach ID abfragen
  async getCategoryById(id) {
    try {
      const query = `
        SELECT * FROM categories
        WHERE id = $1
      `;
      const { rows } = await db.query(query, [id]);

      if (rows.length === 0) {
        return null;
      }

      // Füge das isActive-Feld manuell hinzu
      const result = rows[0];
      result.isActive = true; // Immer aktiv

      return result;
    } catch (error) {
      console.error('Fehler beim Abrufen der Kategorie nach ID:', error);
      throw error;
    }
  }

  // Neue Kategorie erstellen
  async createCategory(categoryData) {
    try {
      // Prüfen, ob die Kategorie bereits existiert
      const checkQuery = `
        SELECT id FROM categories
        WHERE name = $1
      `;
      const existingCategory = await db.query(checkQuery, [categoryData.name]);

      if (existingCategory.rows.length > 0) {
        throw new Error('Eine Kategorie mit diesem Namen existiert bereits');
      }

      const query = `
        INSERT INTO categories ( description, type)
        VALUES ($1, $2, $3)
        RETURNING *
      `;

      const values = [
        categoryData.
        categoryData.description || null,
        'device' // Standardtyp, da er in der Datenbank benötigt wird
      ];

      const { rows } = await db.query(query, values);

      // Füge das isActive-Feld manuell hinzu
      const result = rows[0];
      result.isActive = true; // Standardwert true

      return result;
    } catch (error) {
      console.error('Fehler beim Erstellen der Kategorie:', error);
      throw error;
    }
  }

  // Kategorie aktualisieren
  async updateCategory(id, categoryData) {
    try {
      // Prüfen, ob ein anderer Eintrag bereits den Namen verwendet
      if (categoryData.name) {
        const checkQuery = `
          SELECT id FROM categories
          WHERE name = $1 AND id != $2
        `;
        const existingCategory = await db.query(checkQuery, [categoryData. id]);

        if (existingCategory.rows.length > 0) {
          throw new Error('Eine andere Kategorie mit diesem Namen existiert bereits');
        }
      }

      const query = `
        UPDATE categories
        SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;

      const values = [
        categoryData.name || null,
        categoryData.description || null,
        id
      ];

      const { rows } = await db.query(query, values);

      if (rows.length === 0) {
        throw new Error('Kategorie nicht gefunden');
      }

      // Füge das isActive-Feld manuell hinzu
      const result = rows[0];
      result.isActive = true; // Immer aktiv, da wir das Feld nicht in der DB haben

      return result;
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Kategorie:', error);
      throw error;
    }
  }

  // Kategorie löschen
  async deleteCategory(id) {
    try {
      // Prüfen, ob die Kategorie verwendet wird (vereinfacht)
      const checkQuery = `
        SELECT COUNT(*) as count FROM devices
        WHERE category_id = $1
      `;
      const usageCheck = await db.query(checkQuery, [id]);

      if (parseInt(usageCheck.rows[0].count) > 0) {
        throw new Error('Diese Kategorie wird von Geräten verwendet und kann nicht gelöscht werden');
      }

      const query = `
        DELETE FROM categories
        WHERE id = $1
        RETURNING *
      `;

      const { rows } = await db.query(query, [id]);

      if (rows.length === 0) {
        throw new Error('Kategorie nicht gefunden');
      }

      return rows[0];
    } catch (error) {
      console.error('Fehler beim Löschen der Kategorie:', error);
      throw error;
    }
  }

  // Standorte abfragen
  async getLocations() {
    try {
      const query = `
        SELECT * FROM locations
        ORDER BY name ASC
      `;
      const { rows } = await db.query(query);
      return rows;
    } catch (error) {
      console.error('Fehler beim Abrufen der Standorte:', error);
      throw error;
    }
  }

  // Standort nach ID abfragen
  async getLocationById(id) {
    try {
      const query = `
        SELECT * FROM locations
        WHERE id = $1
      `;
      const { rows } = await db.query(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('Fehler beim Abrufen des Standorts nach ID:', error);
      throw error;
    }
  }

  // Neuen Standort erstellen
  async createLocation(locationData) {
    try {
      // Prüfen, ob der Standort bereits existiert
      const checkQuery = `
        SELECT id FROM locations
        WHERE name = $1
      `;
      const existingLocation = await db.query(checkQuery, [locationData.name]);

      if (existingLocation.rows.length > 0) {
        throw new Error('Ein Standort mit diesem Namen existiert bereits');
      }

      const query = `
        INSERT INTO locations ( address, postal_code, city, country, description)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [
        locationData.
        locationData.address || null,
        locationData.postal_code || null,
        locationData.city || null,
        locationData.country || 'Deutschland', // Standard-Land
        locationData.description || null
      ];

      const { rows } = await db.query(query, values);
      return rows[0];
    } catch (error) {
      console.error('Fehler beim Erstellen des Standorts:', error);
      throw error;
    }
  }

  // Standort aktualisieren
  async updateLocation(id, locationData) {
    try {
      // Prüfen, ob ein anderer Eintrag bereits den Namen verwendet
      if (locationData.name) {
        const checkQuery = `
          SELECT id FROM locations
          WHERE name = $1 AND id != $2
        `;
        const existingLocation = await db.query(checkQuery, [locationData. id]);

        if (existingLocation.rows.length > 0) {
          throw new Error('Ein anderer Standort mit diesem Namen existiert bereits');
        }
      }

      const query = `
        UPDATE locations
        SET
          name = COALESCE($1, name),
          address = COALESCE($2, address),
          postal_code = COALESCE($3, postal_code),
          city = COALESCE($4, city),
          country = COALESCE($5, country),
          description = COALESCE($6, description),
          updated_at = NOW()
        WHERE id = $7
        RETURNING *
      `;

      const values = [
        locationData.name || null,
        locationData.address || null,
        locationData.postal_code || null,
        locationData.city || null,
        locationData.country || null,
        locationData.description || null,
        id
      ];

      const { rows } = await db.query(query, values);

      if (rows.length === 0) {
        throw new Error('Standort nicht gefunden');
      }

      return rows[0];
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Standorts:', error);
      throw error;
    }
  }

  // Standort löschen
  async deleteLocation(id) {
    try {
      // Prüfen, ob der Standort verwendet wird (vereinfacht)
      const checkQuery = `
        SELECT COUNT(*) as count FROM devices
        WHERE location = (SELECT name FROM locations WHERE id = $1)
      `;
      const usageCheck = await db.query(checkQuery, [id]);

      if (parseInt(usageCheck.rows[0].count) > 0) {
        throw new Error('Dieser Standort wird von Geräten verwendet und kann nicht gelöscht werden');
      }

      const query = `
        DELETE FROM locations
        WHERE id = $1
        RETURNING *
      `;

      const { rows } = await db.query(query, [id]);

      if (rows.length === 0) {
        throw new Error('Standort nicht gefunden');
      }

      return rows[0];
    } catch (error) {
      console.error('Fehler beim Löschen des Standorts:', error);
      throw error;
    }
  }

  // Abteilungen abfragen
  async getDepartments() {
    try {
      const query = `
        SELECT * FROM departments
        ORDER BY name ASC
      `;
      const { rows } = await db.query(query);
      return rows;
    } catch (error) {
      console.error('Fehler beim Abrufen der Abteilungen:', error);
      throw error;
    }
  }

  // Abteilung nach ID abfragen
  async getDepartmentById(id) {
    try {
      const query = `
        SELECT * FROM departments
        WHERE id = $1
      `;
      const { rows } = await db.query(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('Fehler beim Abrufen der Abteilung nach ID:', error);
      throw error;
    }
  }

  // Neue Abteilung erstellen
  async createDepartment(departmentData) {
    try {
      // Prüfen, ob die Abteilung bereits existiert
      const checkQuery = `
        SELECT id FROM departments
        WHERE name = $1
      `;
      const existingDepartment = await db.query(checkQuery, [departmentData.name]);

      if (existingDepartment.rows.length > 0) {
        throw new Error('Eine Abteilung mit diesem Namen existiert bereits');
      }

      const query = `
        INSERT INTO departments ( description, active)
        VALUES ($1, $2, $3)
        RETURNING *
      `;

      const values = [
        departmentData.
        departmentData.description || null,
        departmentData.isActive !== undefined ? departmentData.isActive : true
      ];

      const { rows } = await db.query(query, values);
      return rows[0];
    } catch (error) {
      console.error('Fehler beim Erstellen der Abteilung:', error);
      throw error;
    }
  }

  // Abteilung aktualisieren
  async updateDepartment(id, departmentData) {
    try {
      // Prüfen, ob ein anderer Eintrag bereits den Namen verwendet
      if (departmentData.name) {
        const checkQuery = `
          SELECT id FROM departments
          WHERE name = $1 AND id != $2
        `;
        const existingDepartment = await db.query(checkQuery, [departmentData. id]);

        if (existingDepartment.rows.length > 0) {
          throw new Error('Eine andere Abteilung mit diesem Namen existiert bereits');
        }
      }

      const query = `
        UPDATE departments
        SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          active = COALESCE($3, active),
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;

      const values = [
        departmentData.name || null,
        departmentData.description || null,
        departmentData.isActive !== undefined ? departmentData.isActive : null,
        id
      ];

      const { rows } = await db.query(query, values);

      if (rows.length === 0) {
        throw new Error('Abteilung nicht gefunden');
      }

      return rows[0];
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Abteilung:', error);
      throw error;
    }
  }

  // Abteilung löschen
  async deleteDepartment(id) {
    try {
      // Direktes Löschen ohne Verwendungsprüfung
      // In einer realen Umgebung sollte hier eine Prüfung auf Referenzen erfolgen,
      // momentan ist die Tabelle aber nicht mit anderen verknüpft
      const query = `
        DELETE FROM departments
        WHERE id = $1
        RETURNING *
      `;

      const { rows } = await db.query(query, [id]);

      if (rows.length === 0) {
        throw new Error('Abteilung nicht gefunden');
      }

      return rows[0];
    } catch (error) {
      console.error('Fehler beim Löschen der Abteilung:', error);
      throw error;
    }
  }

  // Räume abfragen
  async getRooms() {
    try {
      const query = `
        SELECT
          r.*,
          l.name as location_name
        FROM rooms r
        LEFT JOIN locations l ON r.location_id = l.id
        ORDER BY r.name ASC
      `;
      const { rows } = await db.query(query);
      return rows;
    } catch (error) {
      console.error('Fehler beim Abrufen der Räume:', error);
      throw error;
    }
  }

  // Raum nach ID abfragen
  async getRoomById(id) {
    try {
      const query = `
        SELECT
          r.*,
          l.name as location_name
        FROM rooms r
        LEFT JOIN locations l ON r.location_id = l.id
        WHERE r.id = $1
      `;
      const { rows } = await db.query(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('Fehler beim Abrufen des Raums nach ID:', error);
      throw error;
    }
  }

  // Neuen Raum erstellen
  async createRoom(roomData) {
    try {
      // Prüfen, ob der Raum bereits existiert
      const checkQuery = `
        SELECT id FROM rooms
        WHERE name = $1
      `;
      const existingRoom = await db.query(checkQuery, [roomData.name]);

      if (existingRoom.rows.length > 0) {
        throw new Error('Ein Raum mit diesem Namen existiert bereits');
      }

      const query = `
        INSERT INTO rooms (

          description,
          location_id,
          active,
          building
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      // Rückkompatibilität: Falls building vorhanden ist, aber kein location_id,
      // verwende building als Ersatz
      const building = roomData.building ||
        (roomData.location_id ? null : roomData.location_name);

      const values = [
        roomData.
        roomData.description || null,
        roomData.location_id || null,
        roomData.active !== undefined ? roomData.active : true,
        building
      ];

      const { rows } = await db.query(query, values);

      // Hole den Standortnamen, falls location_id gesetzt ist
      if (rows[0].location_id) {
        const locationQuery = `
          SELECT name FROM locations
          WHERE id = $1
        `;
        const locationResult = await db.query(locationQuery, [rows[0].location_id]);
        if (locationResult.rows.length > 0) {
          rows[0].location_name = locationResult.rows[0].name;
        }
      }

      return rows[0];
    } catch (error) {
      console.error('Fehler beim Erstellen des Raums:', error);
      throw error;
    }
  }

  // Raum aktualisieren
  async updateRoom(id, roomData) {
    try {
      // Prüfen, ob ein anderer Eintrag bereits den Namen verwendet
      if (roomData.name) {
        const checkQuery = `
          SELECT id FROM rooms
          WHERE name = $1 AND id != $2
        `;
        const existingRoom = await db.query(checkQuery, [roomData. id]);

        if (existingRoom.rows.length > 0) {
          throw new Error('Ein anderer Raum mit diesem Namen existiert bereits');
        }
      }

      const query = `
        UPDATE rooms
        SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          location_id = COALESCE($3, location_id),
          active = COALESCE($4, active),
          building = COALESCE($5, building),
          updated_at = NOW()
        WHERE id = $6
        RETURNING *
      `;

      // Rückkompatibilität: Falls building vorhanden ist, aber kein location_id,
      // verwende building als Ersatz
      const building = roomData.building ||
        (roomData.location_id ? null : roomData.location_name);

      const values = [
        roomData.name || null,
        roomData.description || null,
        roomData.location_id || null,
        roomData.active !== undefined ? roomData.active : null,
        building,
        id
      ];

      const { rows } = await db.query(query, values);

      if (rows.length === 0) {
        throw new Error('Raum nicht gefunden');
      }

      // Hole den Standortnamen, falls location_id gesetzt ist
      if (rows[0].location_id) {
        const locationQuery = `
          SELECT name FROM locations
          WHERE id = $1
        `;
        const locationResult = await db.query(locationQuery, [rows[0].location_id]);
        if (locationResult.rows.length > 0) {
          rows[0].location_name = locationResult.rows[0].name;
        }
      }

      return rows[0];
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Raums:', error);
      throw error;
    }
  }

  // Raum löschen
  async deleteRoom(id) {
    try {
      // Prüfen, ob der Raum verwendet wird (vereinfacht)
      const checkQuery = `
        SELECT COUNT(*) as count FROM devices
        WHERE room_id = $1
      `;
      const usageCheck = await db.query(checkQuery, [id]);

      if (parseInt(usageCheck.rows[0].count) > 0) {
        throw new Error('Dieser Raum wird von Geräten verwendet und kann nicht gelöscht werden');
      }

      const query = `
        DELETE FROM rooms
        WHERE id = $1
        RETURNING *
      `;

      const { rows } = await db.query(query, [id]);

      if (rows.length === 0) {
        throw new Error('Raum nicht gefunden');
      }

      return rows[0];
    } catch (error) {
      console.error('Fehler beim Löschen des Raums:', error);
      throw error;
    }
  }

  // Globale Systemeinstellungen
  async getSystemSettings() {
    try {
      const query = `
        SELECT * FROM system_settings
        ORDER BY key ASC
      `;
      const { rows } = await db.query(query);

      // Formatiere Einstellungen als Key-Value-Objekt
      const settings = {};
      rows.forEach(row => {
        settings[row.key] = row.value;
      });

      return settings;
    } catch (error) {
      console.error('Fehler beim Abrufen der Systemeinstellungen:', error);
      throw error;
    }
  }

  // Systemeinstellungen aktualisieren
  async updateSystemSettings(settingsData) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Einstellungen einzeln aktualisieren oder erstellen
      const result = {};

      for (const [key, value] of Object.entries(settingsData)) {
        const query = `
          INSERT INTO system_settings (key, value, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (key)
          DO UPDATE SET value = $2, updated_at = NOW()
          RETURNING *
        `;

        const { rows } = await client.query(query, [key, value]);
        result[key] = rows[0].value;
      }

      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Fehler beim Aktualisieren der Systemeinstellungen:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Löscht einen Switch anhand der ID
  async deleteSwitch(switchId) {
    try {
      // Überprüfen, ob der Switch existiert
      const { rows: existsResult } = await db.query('SELECT EXISTS(SELECT 1 FROM network_switches WHERE id = $1)', [switchId]);

      if (!existsResult[0].exists) {
        throw new Error('Switch nicht gefunden');
      }

      // Switch löschen
      const { rows } = await db.query(
        'DELETE FROM network_switches WHERE id = $1 RETURNING *',
        [switchId]
      );

      return rows[0];
    } catch (error) {
      console.error('Datenbankfehler beim Löschen des Switches:', error);
      throw error;
    }
  }

  // Alle Hersteller abrufen
  async getManufacturers() {
    try {
      const { rows } = await db.query('SELECT * FROM manufacturers ORDER BY name');
      return rows;
    } catch (error) {
      console.error('Datenbankfehler beim Abrufen aller Hersteller:', error);
      throw error;
    }
  }

  // Hersteller nach ID abrufen
  async getManufacturerById(manufacturerId) {
    try {
      const { rows } = await db.query('SELECT * FROM manufacturers WHERE id = $1', [manufacturerId]);
      return rows.length ? rows[0] : null;
    } catch (error) {
      console.error('Datenbankfehler beim Abrufen des Herstellers nach ID:', error);
      throw error;
    }
  }

  // Neuen Hersteller erstellen
  async createManufacturer(manufacturerData) {
    try {
      // Überprüfen, ob ein Hersteller mit diesem Namen bereits existiert
      const { rows: existingManufacturers } = await db.query(
        'SELECT * FROM manufacturers WHERE LOWER(name) = LOWER($1)',
        [manufacturerData.name]
      );

      if (existingManufacturers.length > 0) {
        throw new Error(`Ein Hersteller mit dem Namen "${manufacturerData.name}" existiert bereits`);
      }

      // Neuen Hersteller in die Datenbank einfügen
      const { rows } = await db.query(
        `INSERT INTO manufacturers (

          description,
          logo_url,
          website,
          contact_info,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          manufacturerData.
          manufacturerData.description,
          manufacturerData.logo_url,
          manufacturerData.website,
          manufacturerData.contact_info,
          manufacturerData.is_active
        ]
      );

      return rows[0];
    } catch (error) {
      console.error('Datenbankfehler beim Erstellen des Herstellers:', error);
      throw error;
    }
  }

  // Hersteller aktualisieren
  async updateManufacturer(manufacturerId, manufacturerData) {
    try {
      // Überprüfen, ob der Hersteller existiert
      const { rows: existingManufacturers } = await db.query(
        'SELECT * FROM manufacturers WHERE id = $1',
        [manufacturerId]
      );

      if (existingManufacturers.length === 0) {
        throw new Error('Hersteller nicht gefunden');
      }

      const existingManufacturer = existingManufacturers[0];

      // Überprüfen, ob der neue Name bereits von einem anderen Hersteller verwendet wird
      if (manufacturerData.name && manufacturerData.name !== existingManufacturer.name) {
        const { rows: duplicateNames } = await db.query(
          'SELECT * FROM manufacturers WHERE LOWER(name) = LOWER($1) AND id != $2',
          [manufacturerData. manufacturerId]
        );

        if (duplicateNames.length > 0) {
          throw new Error(`Ein Hersteller mit dem Namen "${manufacturerData.name}" existiert bereits`);
        }
      }

      // Hersteller aktualisieren
      const { rows } = await db.query(
        `UPDATE manufacturers SET
          name = $1,
          description = $2,
          logo_url = $3,
          website = $4,
          contact_info = $5,
          is_active = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7 RETURNING *`,
        [
          manufacturerData.name || existingManufacturer.
          manufacturerData.description !== undefined ? manufacturerData.description : existingManufacturer.description,
          manufacturerData.logo_url !== undefined ? manufacturerData.logo_url : existingManufacturer.logo_url,
          manufacturerData.website !== undefined ? manufacturerData.website : existingManufacturer.website,
          manufacturerData.contact_info !== undefined ? manufacturerData.contact_info : existingManufacturer.contact_info,
          manufacturerData.is_active !== undefined ? manufacturerData.is_active : existingManufacturer.is_active,
          manufacturerId
        ]
      );

      return rows[0];
    } catch (error) {
      console.error('Datenbankfehler beim Aktualisieren des Herstellers:', error);
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

      // Überprüfen, ob Geräte diesen Hersteller verwenden
      const { rows: devicesUsing } = await db.query(
        'SELECT EXISTS(SELECT 1 FROM devices WHERE manufacturer_id = $1)',
        [manufacturerId]
      );

      if (devicesUsing[0].exists) {
        throw new Error('Dieser Hersteller wird von Geräten verwendet und kann nicht gelöscht werden');
      }

      // Überprüfen, ob Switches diesen Hersteller verwenden
      const { rows: switchesUsing } = await db.query(
        'SELECT EXISTS(SELECT 1 FROM network_switches WHERE manufacturer_id = $1)',
        [manufacturerId]
      );

      if (switchesUsing[0].exists) {
        throw new Error('Dieser Hersteller wird von Switches verwendet und kann nicht gelöscht werden');
      }

      // Hier können weitere Abhängigkeitsprüfungen hinzugefügt werden

      const { rows } = await db.query(
        'DELETE FROM manufacturers WHERE id = $1 RETURNING *',
        [manufacturerId]
      );

      return rows[0];
    } catch (error) {
      console.error('Datenbankfehler beim Löschen des Herstellers:', error);
      throw error;
    }
  }

  // Lieferanten abfragen
  async getSuppliers() {
    try {
      const query = `
        SELECT * FROM suppliers
        ORDER BY name ASC
      `;
      const { rows } = await db.query(query);

      // Ergebnisse zurückgeben und is_active-Feld in isActive konvertieren
      return rows.map(supplier => ({
        ...supplier,
        isActive: supplier.is_active
      }));
    } catch (error) {
      console.error('Fehler beim Abrufen der Lieferanten:', error);
      throw error;
    }
  }

  // Lieferant nach ID abfragen
  async getSupplierById(id) {
    try {
      const query = `
        SELECT * FROM suppliers
        WHERE id = $1
      `;
      const { rows } = await db.query(query, [id]);

      if (rows.length === 0) {
        return null;
      }

      // Ergebnis zurückgeben und is_active-Feld in isActive konvertieren
      const supplier = rows[0];
      return {
        ...supplier,
        isActive: supplier.is_active
      };
    } catch (error) {
      console.error('Fehler beim Abrufen des Lieferanten nach ID:', error);
      throw error;
    }
  }

  // Neuen Lieferanten erstellen
  async createSupplier(supplierData) {
    try {
      // Prüfen, ob der Lieferant bereits existiert
      const checkQuery = `
        SELECT id FROM suppliers
        WHERE name = $1
      `;
      const existingSupplier = await db.query(checkQuery, [supplierData.name]);

      if (existingSupplier.rows.length > 0) {
        throw new Error('Ein Lieferant mit diesem Namen existiert bereits');
      }

      const query = `
        INSERT INTO suppliers (
           description, website, address, city, postal_code,
          contact_person, contact_email, contact_phone, contract_number,
          notes, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [
        supplierData.
        supplierData.description || null,
        supplierData.website || null,
        supplierData.address || null,
        supplierData.city || null,
        supplierData.postal_code || null,
        supplierData.contact_person || null,
        supplierData.contact_email || null,
        supplierData.contact_phone || null,
        supplierData.contract_number || null,
        supplierData.notes || null,
        supplierData.is_active !== undefined ? supplierData.is_active : true
      ];

      const { rows } = await db.query(query, values);

      // Ergebnis zurückgeben und is_active-Feld in isActive konvertieren
      const supplier = rows[0];
      return {
        ...supplier,
        isActive: supplier.is_active
      };
    } catch (error) {
      console.error('Fehler beim Erstellen des Lieferanten:', error);
      throw error;
    }
  }

  // Lieferant aktualisieren
  async updateSupplier(id, supplierData) {
    try {
      // Prüfen, ob ein anderer Eintrag bereits den Namen verwendet
      if (supplierData.name) {
        const checkQuery = `
          SELECT id FROM suppliers
          WHERE name = $1 AND id != $2
        `;
        const existingSupplier = await db.query(checkQuery, [supplierData. id]);

        if (existingSupplier.rows.length > 0) {
          throw new Error('Ein anderer Lieferant mit diesem Namen existiert bereits');
        }
      }

      const query = `
        UPDATE suppliers
        SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          website = COALESCE($3, website),
          address = COALESCE($4, address),
          city = COALESCE($5, city),
          postal_code = COALESCE($6, postal_code),
          contact_person = COALESCE($7, contact_person),
          contact_email = COALESCE($8, contact_email),
          contact_phone = COALESCE($9, contact_phone),
          contract_number = COALESCE($10, contract_number),
          notes = COALESCE($11, notes),
          is_active = COALESCE($12, is_active),
          updated_at = NOW()
        WHERE id = $13
        RETURNING *
      `;

      const values = [
        supplierData.name || null,
        supplierData.description || null,
        supplierData.website || null,
        supplierData.address || null,
        supplierData.city || null,
        supplierData.postal_code || null,
        supplierData.contact_person || null,
        supplierData.contact_email || null,
        supplierData.contact_phone || null,
        supplierData.contract_number || null,
        supplierData.notes || null,
        supplierData.is_active !== undefined ? supplierData.is_active : null,
        id
      ];

      const { rows } = await db.query(query, values);

      if (rows.length === 0) {
        throw new Error('Lieferant nicht gefunden');
      }

      // Ergebnis zurückgeben und is_active-Feld in isActive konvertieren
      const supplier = rows[0];
      return {
        ...supplier,
        isActive: supplier.is_active
      };
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Lieferanten:', error);
      throw error;
    }
  }

  // Lieferant löschen
  async deleteSupplier(id) {
    try {
      // Prüfen, ob der Lieferant verwendet wird (vereinfacht)
      // Diese Logik müsste angepasst werden, wenn Lieferanten mit anderen Entitäten verknüpft sind
      const checkQuery = `
        SELECT COUNT(*) as count FROM devices
        WHERE supplier_id = $1
      `;

      // Hinweis: Diese Abfrage wird nur ausgeführt, wenn die Spalte supplier_id
      // in der devices-Tabelle existiert. Andernfalls sollte dieser Check entfernt werden.
      try {
        const usageCheck = await db.query(checkQuery, [id]);
        if (parseInt(usageCheck.rows[0].count) > 0) {
          throw new Error('Dieser Lieferant wird von Geräten verwendet und kann nicht gelöscht werden');
        }
      } catch (err) {
        // Wenn die Abfrage fehlschlägt (z.B. weil die Spalte nicht existiert),
        // fahren wir einfach mit dem Löschen fort
        console.log('Hinweis: Verwendungsprüfung wurde übersprungen:', err.message);
      }

      const query = `
        DELETE FROM suppliers
        WHERE id = $1
        RETURNING *
      `;

      const { rows } = await db.query(query, [id]);

      if (rows.length === 0) {
        throw new Error('Lieferant nicht gefunden');
      }

      // Ergebnis zurückgeben und is_active-Feld in isActive konvertieren
      const supplier = rows[0];
      return {
        ...supplier,
        isActive: supplier.is_active
      };
    } catch (error) {
      console.error('Fehler beim Löschen des Lieferanten:', error);
      throw error;
    }
  }

  // Switches abfragen
  async getSwitches() {
    try {
      const query = `
        SELECT
          s.*,
          l.name as location_
          r.name as room_
          m.name as manufacturer_name
        FROM network_switches s
        LEFT JOIN locations l ON s.location_id = l.id
        LEFT JOIN rooms r ON s.room_id = r.id
        LEFT JOIN manufacturers m ON s.manufacturer_id = m.id
        ORDER BY s.name ASC
      `;
      const { rows } = await db.query(query);

      // Ergebnisse zurückgeben und is_active-Feld in isActive konvertieren
      return rows.map(switchItem => ({
        ...switchItem,
        isActive: switchItem.is_active
      }));
    } catch (error) {
      console.error('Fehler beim Abrufen der Switches:', error);
      throw error;
    }
  }

  // Switch nach ID abfragen
  async getSwitchById(id) {
    try {
      const query = `
        SELECT
          s.*,
          l.name as location_
          r.name as room_
          m.name as manufacturer_name
        FROM network_switches s
        LEFT JOIN locations l ON s.location_id = l.id
        LEFT JOIN rooms r ON s.room_id = r.id
        LEFT JOIN manufacturers m ON s.manufacturer_id = m.id
        WHERE s.id = $1
      `;
      const { rows } = await db.query(query, [id]);

      if (rows.length === 0) {
        return null;
      }

      // Ergebnis zurückgeben und is_active-Feld in isActive konvertieren
      const switchItem = rows[0];
      return {
        ...switchItem,
        isActive: switchItem.is_active
      };
    } catch (error) {
      console.error('Fehler beim Abrufen des Switches nach ID:', error);
      throw error;
    }
  }

  // Neuen Switch erstellen
  async createSwitch(switchData) {
    try {
      // Prüfen, ob ein Switch mit demselben Namen bereits existiert
      const checkQuery = `
        SELECT id FROM network_switches
        WHERE name = $1
      `;
      const existingSwitch = await db.query(checkQuery, [switchData.name]);

      if (existingSwitch.rows.length > 0) {
        throw new Error('Ein Switch mit diesem Namen existiert bereits');
      }

      const query = `
        INSERT INTO network_switches (
           description, model, manufacturer_id, ip_address, mac_address,
          management_url, location_id, room_id, cabinet_id, rack_position,
          port_count, uplink_port, notes, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const values = [
        switchData.
        switchData.description || null,
        switchData.model || null,
        switchData.manufacturer_id || null,
        switchData.ip_address || null,
        switchData.mac_address || null,
        switchData.management_url || null,
        switchData.location_id || null,
        switchData.room_id || null,
        switchData.cabinet_id || null,
        switchData.rack_position || null,
        switchData.port_count || null,
        switchData.uplink_port || null,
        switchData.notes || null,
        switchData.is_active !== undefined ? switchData.is_active : true
      ];

      const { rows } = await db.query(query, values);

      // Zusätzliche Informationen für den zurückgegebenen Switch abfragen
      if (rows.length > 0) {
        const switchWithDetails = await this.getSwitchById(rows[0].id);
        return switchWithDetails;
      }

      // Ergebnis zurückgeben und is_active-Feld in isActive konvertieren
      const switchItem = rows[0];
      return {
        ...switchItem,
        isActive: switchItem.is_active
      };
    } catch (error) {
      console.error('Fehler beim Erstellen des Switches:', error);
      throw error;
    }
  }

  // Switch aktualisieren
  async updateSwitch(id, switchData) {
    try {
      // Prüfen, ob ein anderer Switch bereits den Namen verwendet
      if (switchData.name) {
        const checkQuery = `
          SELECT id FROM network_switches
          WHERE name = $1 AND id != $2
        `;
        const existingSwitch = await db.query(checkQuery, [switchData. id]);

        if (existingSwitch.rows.length > 0) {
          throw new Error('Ein anderer Switch mit diesem Namen existiert bereits');
        }
      }

      const query = `
        UPDATE network_switches
        SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          model = COALESCE($3, model),
          manufacturer_id = COALESCE($4, manufacturer_id),
          ip_address = COALESCE($5, ip_address),
          mac_address = COALESCE($6, mac_address),
          management_url = COALESCE($7, management_url),
          location_id = COALESCE($8, location_id),
          room_id = COALESCE($9, room_id),
          cabinet_id = COALESCE($10, cabinet_id),
          rack_position = COALESCE($11, rack_position),
          port_count = COALESCE($12, port_count),
          uplink_port = COALESCE($13, uplink_port),
          notes = COALESCE($14, notes),
          is_active = COALESCE($15, is_active),
          updated_at = NOW()
        WHERE id = $16
        RETURNING *
      `;

      const values = [
        switchData.name || null,
        switchData.description || null,
        switchData.model || null,
        switchData.manufacturer_id || null,
        switchData.ip_address || null,
        switchData.mac_address || null,
        switchData.management_url || null,
        switchData.location_id || null,
        switchData.room_id || null,
        switchData.cabinet_id || null,
        switchData.rack_position || null,
        switchData.port_count || null,
        switchData.uplink_port || null,
        switchData.notes || null,
        switchData.is_active !== undefined ? switchData.is_active : null,
        id
      ];

      const { rows } = await db.query(query, values);

      if (rows.length === 0) {
        throw new Error('Switch nicht gefunden');
      }

      // Zusätzliche Informationen für den zurückgegebenen Switch abfragen
      const switchWithDetails = await this.getSwitchById(id);
      return switchWithDetails;
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Switches:', error);
      throw error;
    }
  }

  // Switch löschen
  async deleteSwitch(id) {
    try {
      // Prüfen, ob der Switch verwendet wird
      // Hier könnten weitere Prüfungen erfolgen je nach Anwendungsfall

      const query = `
        DELETE FROM network_switches
        WHERE id = $1
        RETURNING *
      `;

      const { rows } = await db.query(query, [id]);

      if (rows.length === 0) {
        throw new Error('Switch nicht gefunden');
      }

      // Ergebnis zurückgeben und is_active-Feld in isActive konvertieren
      const switchItem = rows[0];
      return {
        ...switchItem,
        isActive: switchItem.is_active
      };
    } catch (error) {
      console.error('Fehler beim Löschen des Switches:', error);
      throw error;
    }
  }

  // Netzwerkdosen abfragen
  async getNetworkSockets() {
    try {
      const { rows } = await db.query(`
        SELECT
          network_sockets.id,
          network_sockets.description,
          network_sockets.room_id,
          network_sockets.created_at,
          network_sockets.updated_at,
          network_sockets.outlet_number,
          network_sockets.location_id,
          network_sockets.is_active,
          r.name as room_name,
          l.name as location_name
        FROM network_sockets
        LEFT JOIN rooms r ON network_sockets.room_id = r.id
        LEFT JOIN locations l ON network_sockets.location_id = l.id
        ORDER BY network_sockets.id
      `);

      return {
        success: true,
        data: rows
      };
    } catch (error) {
      console.error('Datenbankfehler beim Abrufen der Netzwerkdosen:', error);
      throw error;
    }
  }

  // Netzwerkdose nach ID abfragen
  async getNetworkSocketById(socketId) {
    try {
      const { rows } = await db.query(`
        SELECT
          network_sockets.id,
          network_sockets.description,
          network_sockets.room_id,
          network_sockets.created_at,
          network_sockets.updated_at,
          network_sockets.outlet_number,
          network_sockets.location_id,
          network_sockets.is_active,
          r.name as room_name,
          l.name as location_name
        FROM network_sockets
        LEFT JOIN rooms r ON network_sockets.room_id = r.id
        LEFT JOIN locations l ON network_sockets.location_id = l.id
        WHERE network_sockets.id = $1
      `, [socketId]);

      if (rows.length === 0) {
        return null;
      }

      return {
        success: true,
        data: rows[0]
      };
    } catch (error) {
      console.error('Datenbankfehler beim Abrufen der Netzwerkdose:', error);
      throw error;
    }
  }

  // Netzwerkdose erstellen (mit Raum- und Standortnamen)
async createNetworkSocket(socketData) {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Prüfen, ob die Dosennummer schon existiert
    const outletCheck = await client.query(
      'SELECT id FROM network_sockets WHERE outlet_number = $1',
      [socketData.outlet_number]
    );

    if (outletCheck.rows.length > 0) {
      throw new Error(`Eine Netzwerkdose mit der Dosennummer "${socketData.outlet_number}" existiert bereits.`);
    }

    // Neue Netzwerkdose einfügen
    const insertResult = await client.query(`
      INSERT INTO network_sockets (
        description,
        location_id,
        room_id,
        outlet_number,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      socketData.description || '',
      socketData.location_id,
      socketData.room_id,
      socketData.outlet_number,
      socketData.is_active === undefined ? true : socketData.is_active
    ]);

    const insertedId = insertResult.rows[0].id;

    // Details inklusive Raumname und Standortname abrufen
    const details = await client.query(`
      SELECT
        s.*,
        r.name AS room_name,
        l.name AS location_name
      FROM network_sockets s
      LEFT JOIN rooms r ON s.room_id = r.id
      LEFT JOIN locations l ON s.location_id = l.id
      WHERE s.id = $1
    `, [insertedId]);

    await client.query('COMMIT');

    return {
      success: true,
      data: details.rows[0]
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Fehler beim Erstellen der Netzwerkdose:', error);
    throw error;
  } finally {
    client.release();
  }
}


  // Netzwerkdose aktualisieren
  async updateNetworkSocket(socketId, socketData) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Prüfen, ob die Netzwerkdose existiert
      const existCheck = await client.query(
        'SELECT id FROM network_sockets WHERE id = $1',
        [socketId]
      );

      if (existCheck.rows.length === 0) {
        throw new Error(`Netzwerkdose mit ID ${socketId} nicht gefunden.`);
      }

      // Prüfen, ob eine andere Netzwerkdose mit der gleichen Dosennummer existiert
      const outletNumberCheck = await client.query(
        'SELECT id FROM network_sockets WHERE outlet_number = $1 AND id != $2',
        [socketData.outlet_number, socketId]
      );

      if (outletNumberCheck.rows.length > 0) {
        throw new Error(`Eine andere Netzwerkdose mit der Dosennummer "${socketData.outlet_number}" existiert bereits.`);
      }

      // Netzwerkdose aktualisieren
      const { rows } = await client.query(`
        UPDATE network_sockets
        SET name = $1,
            description = $2,
            location_id = $3,
            room_id = $4,
            outlet_number = $5,
            is_active = $6
        WHERE id = $7
        RETURNING *,
                 (SELECT name FROM rooms WHERE id = $4) as room_
                 (SELECT name FROM locations WHERE id = $3) as location_name
      `, [
        socketData.outlet_number || '', // Verwende outlet_number als  da name NOT NULL sein könnte
        socketData.description || '',
        socketData.location_id,
        socketData.room_id,
        socketData.outlet_number || '',
        socketData.is_active === undefined ? true : socketData.is_active,
        socketId
      ]);

      await client.query('COMMIT');

      return {
        success: true,
        data: rows[0],
        message: 'Netzwerkdose erfolgreich aktualisiert'
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Fehler beim Aktualisieren der Netzwerkdose:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Netzwerkdose löschen
  async deleteNetworkSocket(socketId) {
    try {
      // Prüfen, ob die Netzwerkdose existiert
      const { rows: existsResult } = await db.query(
        'SELECT EXISTS(SELECT 1 FROM network_sockets WHERE id = $1)',
        [socketId]
      );

      if (!existsResult[0].exists) {
        throw new Error('Netzwerkdose nicht gefunden');
      }

      // Prüfen, ob die Netzwerkdose von Ports verwendet wird
      const { rows: usedByPorts } = await db.query(
        'SELECT EXISTS(SELECT 1 FROM network_ports WHERE socket_id = $1)',
        [socketId]
      );

      if (usedByPorts[0].exists) {
        throw new Error('Diese Netzwerkdose wird von Ports verwendet und kann nicht gelöscht werden');
      }

      // Netzwerkdose löschen
      const { rows } = await db.query(
        'DELETE FROM network_sockets WHERE id = $1 RETURNING *',
        [socketId]
      );

      return {
        success: true,
        data: rows[0],
        message: 'Netzwerkdose erfolgreich gelöscht'
      };
    } catch (error) {
      console.error('Datenbankfehler beim Löschen der Netzwerkdose:', error);
      throw error;
    }
  }
}

module.exports = new SettingsModel();
