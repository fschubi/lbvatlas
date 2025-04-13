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
        INSERT INTO categories (
          name,
          description,
          type
        )
        VALUES ($1, $2, $3)
        RETURNING *
      `;

      const values = [
        categoryData.name,
        categoryData.description || null,
        'device' // Standard-Typ für Kategorien
      ];

      const { rows } = await db.query(query, values);

      // Füge das isActive-Feld manuell hinzu für Frontend-Kompatibilität
      const result = {
        ...rows[0],
        isActive: true // Standard: true
      };

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
        const existingCategory = await db.query(checkQuery, [categoryData.name, id]);

        if (existingCategory.rows.length > 0) {
          throw new Error('Eine andere Kategorie mit diesem Namen existiert bereits');
        }
      }

      const query = `
        UPDATE categories
        SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          type = COALESCE($3, type),
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;

      const values = [
        categoryData.name || null,
        categoryData.description || null,
        categoryData.type || 'device', // Standard-Typ falls nicht angegeben
        id
      ];

      const { rows } = await db.query(query, values);

      if (rows.length === 0) {
        throw new Error('Kategorie nicht gefunden');
      }

      // Füge das isActive-Feld manuell hinzu für Frontend-Kompatibilität
      const result = {
        ...rows[0],
        isActive: true // Standard: true
      };

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
        INSERT INTO locations (
          name, address, postal_code, city, country, description
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [
        locationData.name,
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
        const existingLocation = await db.query(checkQuery, [locationData.name, id]);

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
        INSERT INTO departments (
          name,
          description,
          active
        )
        VALUES ($1, $2, $3)
        RETURNING *
      `;

      const values = [
        departmentData.name,
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
        const existingDepartment = await db.query(checkQuery, [departmentData.name, id]);

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
          name,
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
        roomData.name,
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
        const existingRoom = await db.query(checkQuery, [roomData.name, id]);

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
          name,
          description,
          is_active
        ) VALUES ($1, $2, $3) RETURNING *`,
        [
          manufacturerData.name,
          manufacturerData.description || null,
          manufacturerData.is_active !== undefined ? manufacturerData.is_active : true
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
          [manufacturerData.name, manufacturerId]
        );

        if (duplicateNames.length > 0) {
          throw new Error(`Ein Hersteller mit dem Namen "${manufacturerData.name}" existiert bereits`);
        }
      }

      // Hersteller aktualisieren
      const { rows } = await db.query(
        `UPDATE manufacturers SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          is_active = COALESCE($3, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 RETURNING *`,
        [
          manufacturerData.name || null,
          manufacturerData.description || null,
          manufacturerData.is_active !== undefined ? manufacturerData.is_active : null,
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
        'SELECT EXISTS(SELECT 1 FROM devices WHERE manufacturer = (SELECT name FROM manufacturers WHERE id = $1))',
        [manufacturerId]
      );

      if (devicesUsing[0].exists) {
        throw new Error('Dieser Hersteller wird von Geräten verwendet und kann nicht gelöscht werden');
      }

      // Überprüfen, ob Switches diesen Hersteller verwenden
      const { rows: switchesUsing } = await db.query(
        'SELECT EXISTS(SELECT 1 FROM network_switches WHERE manufacturer = (SELECT name FROM manufacturers WHERE id = $1))',
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
          name, description, website, address, city, postal_code,
          contact_person, contact_email, contact_phone, contract_number,
          notes, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [
        supplierData.name,
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
        const existingSupplier = await db.query(checkQuery, [supplierData.name, id]);

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
          l.name as location_name,
          r.name as room_name,
          m.name as manufacturer_name
        FROM network_switches s
        LEFT JOIN locations l ON s.location_id = l.id
        LEFT JOIN rooms r ON s.room_id = r.id
        LEFT JOIN manufacturers m ON s.manufacturer_id = m.id
        ORDER BY s.name ASC
      `;
      const { rows } = await db.query(query);

      // Ergebnisse zurückgeben und is_active-Feld in isActive konvertieren
      return rows.map(switchItem => {
        const { is_active, ...rest } = switchItem;
        return {
          ...rest,
          isActive: is_active !== undefined ? is_active : true,
          is_active: is_active !== undefined ? is_active : true // Behalte auch das Original-Feld
        };
      });
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
          l.name as location_name,
          r.name as room_name,
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
      const { is_active, ...rest } = rows[0];
      return {
        ...rest,
        isActive: is_active !== undefined ? is_active : true,
        is_active: is_active !== undefined ? is_active : true // Behalte auch das Original-Feld
      };
    } catch (error) {
      console.error('Fehler beim Abrufen des Switches nach ID:', error);
      throw error;
    }
  }

  // Neuen Switch erstellen
  async createSwitch(switchData) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Prüfen, ob ein Switch mit demselben Namen bereits existiert
      const checkQuery = `
        SELECT id, name FROM network_switches
        WHERE LOWER(name) = LOWER($1)
      `;
      const existingSwitch = await client.query(checkQuery, [switchData.name]);

      if (existingSwitch.rows.length > 0) {
        await client.query('ROLLBACK');
        const error = new Error(`Ein Switch mit dem Namen "${switchData.name}" existiert bereits`);
        error.code = 'DUPLICATE_SWITCH';
        error.details = {
          existingName: existingSwitch.rows[0].name,
          existingId: existingSwitch.rows[0].id
        };
        throw error;
      }

      const query = `
        INSERT INTO network_switches (
          name, description, model, manufacturer_id, ip_address, mac_address,
          management_url, location_id, room_id, cabinet_id, rack_position,
          port_count, uplink_port, notes, is_active, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        switchData.name,
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

      const { rows } = await client.query(query, values);

      await client.query('COMMIT');

      // Zusätzliche Informationen für den zurückgegebenen Switch abfragen
      if (rows.length > 0) {
        const switchWithDetails = await this.getSwitchById(rows[0].id);
        return switchWithDetails;
      }

      return rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Fehler beim Erstellen des Switches:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Switch aktualisieren
  async updateSwitch(id, switchData) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Prüfen, ob ein anderer Switch bereits den Namen verwendet
      if (switchData.name) {
        const checkQuery = `
          SELECT id FROM network_switches
          WHERE LOWER(name) = LOWER($1) AND id != $2
        `;
        const existingSwitch = await client.query(checkQuery, [switchData.name, id]);

        if (existingSwitch.rows.length > 0) {
          await client.query('ROLLBACK');
          const error = new Error(`Ein Switch mit dem Namen "${switchData.name}" existiert bereits`);
          error.code = 'DUPLICATE_SWITCH';
          error.details = {
            existingName: existingSwitch.rows[0].name,
            existingId: existingSwitch.rows[0].id
          };
          throw error;
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

      const { rows } = await client.query(query, values);

      await client.query('COMMIT');

      if (rows.length === 0) {
        throw new Error('Switch nicht gefunden');
      }

      // Zusätzliche Informationen für den zurückgegebenen Switch abfragen
      const switchWithDetails = await this.getSwitchById(id);
      return switchWithDetails;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Fehler beim Aktualisieren des Switches:', error);
      throw error;
    } finally {
      client.release();
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
        SET description = $1,
            location_id = $2,
            room_id = $3,
            outlet_number = $4,
            is_active = $5
        WHERE id = $6
        RETURNING *,
                 (SELECT name FROM rooms WHERE id = $3) AS room_name,
                 (SELECT name FROM locations WHERE id = $2) AS location_name
      `, [
        socketData.description || '',            // $1
        socketData.location_id,                  // $2
        socketData.room_id,                      // $3
        socketData.outlet_number || '',          // $4
        socketData.is_active === undefined ? true : socketData.is_active, // $5
        socketId                                 // $6
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

  // Netzwerk-Switch erstellen
  async createNetworkSwitch(switchData) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Prüfen, ob ein Switch mit diesem Namen bereits existiert
      const checkQuery = `
        SELECT id FROM network_switches
        WHERE name = $1
      `;
      const existingSwitch = await db.query(checkQuery, [switchData.name]);

      if (existingSwitch.rows.length > 0) {
        throw new Error('Ein Netzwerk-Switch mit diesem Namen existiert bereits');
      }

      const query = `
        INSERT INTO network_switches (
          name,
          description,
          manufacturer_id,
          model,
          serial_number,
          firmware_version,
          ip_address,
          mac_address,
          location_id,
          room_id,
          cabinet_id,
          rack_id,
          rack_position,
          port_count,
          status,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
          CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
        )
        RETURNING *,
          (SELECT name FROM locations WHERE id = $9) as location_name,
          (SELECT name FROM rooms WHERE id = $10) as room_name,
          (SELECT name FROM manufacturers WHERE id = $3) as manufacturer_name
      `;

      const values = [
        switchData.name,
        switchData.description || null,
        switchData.manufacturer_id || null,
        switchData.model || null,
        switchData.serial_number || null,
        switchData.firmware_version || null,
        switchData.ip_address || null,
        switchData.mac_address || null,
        switchData.location_id || null,
        switchData.room_id || null,
        switchData.cabinet_id || null,
        switchData.rack_id || null,
        switchData.rack_position || null,
        switchData.port_count || null,
        switchData.status || 'active'
      ];

      const { rows } = await client.query(query, values);
      await client.query('COMMIT');
      return rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Fehler beim Erstellen des Netzwerk-Switches:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Netzwerk-Ports abfragen
  async getAllNetworkPorts() {
    try {
      const { rows } = await db.query(
        'SELECT * FROM network_ports ORDER BY port_number'
      );
      return rows;
    } catch (error) {
      console.error('Datenbankfehler beim Abrufen aller Netzwerk-Ports:', error);
      throw error;
    }
  }

  // Netzwerk-Port nach ID abfragen
  async getNetworkPortById(portId) {
    try {
      const { rows } = await db.query(
        'SELECT * FROM network_ports WHERE id = $1',
        [portId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Datenbankfehler beim Abrufen des Netzwerk-Ports nach ID:', error);
      throw error;
    }
  }

  // Netzwerk-Port erstellen
  async createNetworkPort(portData) {
    try {
      const { port_number } = portData;

      // Prüfen, ob die Portnummer bereits existiert
      const { rows: existsResult } = await db.query(
        'SELECT EXISTS(SELECT 1 FROM network_ports WHERE port_number = $1)',
        [port_number]
      );

      if (existsResult[0].exists) {
        throw new Error('Diese Portnummer existiert bereits');
      }

      // Port erstellen
      const { rows } = await db.query(
        'INSERT INTO network_ports (port_number) VALUES ($1) RETURNING *',
        [port_number]
      );

      return rows[0];
    } catch (error) {
      console.error('Datenbankfehler beim Erstellen des Netzwerk-Ports:', error);
      throw error;
    }
  }

  // Netzwerk-Port aktualisieren
  async updateNetworkPort(portId, portData) {
    try {
      const { port_number } = portData;

      // Prüfen, ob der Port existiert
      const { rows: existsResult } = await db.query(
        'SELECT EXISTS(SELECT 1 FROM network_ports WHERE id = $1)',
        [portId]
      );

      if (!existsResult[0].exists) {
        return null;
      }

      // Prüfen, ob die neue Portnummer bereits existiert (außer bei dem aktuellen Port)
      if (port_number) {
        const { rows: duplicateResult } = await db.query(
          'SELECT EXISTS(SELECT 1 FROM network_ports WHERE port_number = $1 AND id != $2)',
          [port_number, portId]
        );

        if (duplicateResult[0].exists) {
          throw new Error('Diese Portnummer existiert bereits');
        }
      }

      // Port aktualisieren
      const { rows } = await db.query(
        'UPDATE network_ports SET port_number = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [port_number, portId]
      );

      return rows[0];
    } catch (error) {
      console.error('Datenbankfehler beim Aktualisieren des Netzwerk-Ports:', error);
      throw error;
    }
  }

  // Netzwerk-Port löschen
  async deleteNetworkPort(portId) {
    try {
      // Prüfen, ob der Port existiert
      const { rows: existsResult } = await db.query(
        'SELECT EXISTS(SELECT 1 FROM network_ports WHERE id = $1)',
        [portId]
      );

      if (!existsResult[0].exists) {
        return null;
      }

      // Port löschen
      await db.query(
        'DELETE FROM network_ports WHERE id = $1',
        [portId]
      );

      return true;
    } catch (error) {
      console.error('Datenbankfehler beim Löschen des Netzwerk-Ports:', error);
      throw error;
    }
  }

  // -------- Gerätemodelle --------

  // Alle Gerätemodelle mit Geräteanzahl abrufen
  async getDeviceModels() {
    try {
      const result = await db.query(`
        SELECT
          dm.*,
          m.name AS manufacturer_name,
          c.name AS category_name,
          COUNT(d.id) AS device_count
        FROM
          device_models dm
        LEFT JOIN manufacturers m ON dm.manufacturer_id = m.id
        LEFT JOIN categories c ON dm.category_id = c.id
        LEFT JOIN devices d ON dm.id = d.model::integer
        GROUP BY
          dm.id, m.name, c.name
        ORDER BY dm.name ASC
      `);
      return result.rows;
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
          (SELECT COUNT(*) FROM devices WHERE model::integer = dm.id) AS device_count
        FROM
          device_models dm
        LEFT JOIN manufacturers m ON dm.manufacturer_id = m.id
        LEFT JOIN categories c ON dm.category_id = c.id
        WHERE dm.id = $1
      `, [id]);

      return result.rows[0] || null;
    } catch (error) {
      console.error(`Fehler beim Abrufen des Gerätemodells mit ID ${id}:`, error);
      throw error;
    }
  }

  // Neues Gerätemodell erstellen
  async createDeviceModel(modelData) {
    try {
      // Überprüfen, ob ein Modell mit diesem Namen bereits existiert
      const existingCheck = await db.query(
        'SELECT id FROM device_models WHERE name = $1',
        [modelData.name]
      );

      if (existingCheck.rows.length > 0) {
        throw new Error(`Ein Gerätemodell mit dem Namen "${modelData.name}" existiert bereits`);
      }

      const { name, description, manufacturerId, categoryId, specifications, cpu, ram, hdd, warrantyMonths, isActive } = modelData;

      const result = await db.query(`
        INSERT INTO device_models (
          name,
          description,
          manufacturer_id,
          category_id,
          specifications,
          cpu,
          ram,
          hdd,
          warranty_months,
          is_active,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `, [name, description, manufacturerId, categoryId, specifications, cpu, ram, hdd, warrantyMonths, isActive]);

      return result.rows[0];
    } catch (error) {
      console.error('Fehler beim Erstellen des Gerätemodells:', error);
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
        const existingCheck = await db.query(
          'SELECT id FROM device_models WHERE name = $1 AND id != $2',
          [modelData.name, id]
        );

        if (existingCheck.rows.length > 0) {
          throw new Error(`Ein Gerätemodell mit dem Namen "${modelData.name}" existiert bereits`);
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
        isActive: 'is_active'
      };

      Object.entries(fieldMap).forEach(([jsField, dbField]) => {
        if (modelData[jsField] !== undefined) {
          updateFields.push(`${dbField} = $${paramIndex++}`);
          values.push(modelData[jsField]);
        }
      });

      // updated_at immer aktualisieren
      updateFields.push(`updated_at = NOW()`);

      // Wenn keine Felder zum Aktualisieren vorhanden sind
      if (updateFields.length === 1) {
        throw new Error('Keine Daten zum Aktualisieren angegeben');
      }

      // ID für WHERE-Klausel
      values.push(id);

      const query = `
        UPDATE device_models
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Gerätemodells mit ID ${id}:`, error);
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
      const deviceCheck = await db.query(
        'SELECT COUNT(*) FROM devices WHERE model::integer = $1',
        [id]
      );

      if (parseInt(deviceCheck.rows[0].count) > 0) {
        throw new Error(`Das Gerätemodell "${existingModel.name}" wird von ${deviceCheck.rows[0].count} Geräten verwendet und kann nicht gelöscht werden`);
      }

      // Modell löschen
      const result = await db.query(
        'DELETE FROM device_models WHERE id = $1 RETURNING *',
        [id]
      );

      return result.rows[0];
    } catch (error) {
      console.error(`Fehler beim Löschen des Gerätemodells mit ID ${id}:`, error);
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
        FROM
          device_models dm
        LEFT JOIN devices d ON dm.id = d.model::integer
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

  async updateStatus(id, statusData) {
    try {
      // Prüfen, ob ein anderer Eintrag bereits den Namen verwendet
      if (statusData.name) {
        const checkQuery = `
          SELECT id FROM status_types
          WHERE name = $1 AND id != $2
        `;
        const existingStatus = await db.query(checkQuery, [statusData.name, id]);

        if (existingStatus.rows.length > 0) {
          throw new Error('Ein anderer Statustyp mit diesem Namen existiert bereits');
        }
      }

      const query = `
        UPDATE status_types
        SET
          name = COALESCE($1, name),
          color = COALESCE($2, color),
          description = COALESCE($3, description),
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;

      const values = [
        statusData.name || null,
        statusData.color || null,
        statusData.description || null,
        id
      ];

      const { rows } = await db.query(query, values);

      if (rows.length === 0) {
        throw new Error('Statustyp nicht gefunden');
      }

      return rows[0];
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Statustyps:', error);
      throw error;
    }
  }

  // Label-Einstellungen abfragen
  async getLabelSettings(userId = null) {
    try {
      let query;
      let params;

      if (userId) {
        // Benutzer-spezifische Einstellungen abrufen
        query = `
          SELECT settings FROM label_settings
          WHERE user_id = $1
          ORDER BY updated_at DESC
          LIMIT 1
        `;
        params = [userId];
      } else {
        // Globale Einstellungen abrufen (user_id ist NULL)
        query = `
          SELECT settings FROM label_settings
          WHERE user_id IS NULL
          ORDER BY updated_at DESC
          LIMIT 1
        `;
        params = [];
      }

      const result = await db.query(query, params);

      // Wenn keine Einstellungen gefunden wurden, versuche die globalen Einstellungen
      if (result.rows.length === 0 && userId) {
        return this.getLabelSettings(null); // Rekursiver Aufruf für globale Einstellungen
      }

      return result.rows.length > 0 ? result.rows[0].settings : null;
    } catch (error) {
      console.error('Fehler beim Abrufen der Label-Einstellungen:', error);
      throw error;
    }
  }

  // Label-Einstellungen speichern
  async saveLabelSettings(userId, settingsData) {
    try {
      // Prüfen, ob bereits Einstellungen für diesen Benutzer existieren
      const existingQuery = `
        SELECT id FROM label_settings
        WHERE user_id ${userId ? '= $1' : 'IS NULL'}
        LIMIT 1
      `;
      const existingParams = userId ? [userId] : [];
      const existingResult = await db.query(existingQuery, existingParams);

      let result;

      if (existingResult.rows.length > 0) {
        // Bestehende Einstellungen aktualisieren
        const settingsId = existingResult.rows[0].id;
        const updateQuery = `
          UPDATE label_settings
          SET settings = $1, updated_at = NOW()
          WHERE id = $2
          RETURNING *
        `;

        result = await db.query(updateQuery, [
          JSON.stringify(settingsData),
          settingsId
        ]);
      } else {
        // Neue Einstellungen erstellen
        const insertQuery = `
          INSERT INTO label_settings (user_id, settings, created_at, updated_at)
          VALUES ($1, $2, NOW(), NOW())
          RETURNING *
        `;

        result = await db.query(insertQuery, [
          userId,
          JSON.stringify(settingsData)
        ]);
      }

      return result.rows[0];
    } catch (error) {
      console.error('Fehler beim Speichern der Label-Einstellungen:', error);
      throw error;
    }
  }

  // Label-Templates abrufen
  async getLabelTemplates(userId = null) {
    try {
      // Abfrage für globale und benutzerspezifische Vorlagen
      const query = `
        SELECT * FROM label_templates
        WHERE user_id IS NULL OR user_id = $1
        ORDER BY
          CASE WHEN user_id IS NULL THEN 1 ELSE 0 END, -- Benutzerspezifische Vorlagen zuerst
          CASE WHEN is_default = true THEN 0 ELSE 1 END, -- Standardvorlagen zuerst
          name ASC
      `;

      const result = await db.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Fehler beim Abrufen der Label-Templates:', error);
      throw error;
    }
  }

  // Label-Template nach ID abrufen
  async getLabelTemplateById(id, userId = null) {
    try {
      const query = `
        SELECT * FROM label_templates
        WHERE id = $1 AND (user_id IS NULL OR user_id = $2)
      `;

      const result = await db.query(query, [id, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Fehler beim Abrufen des Label-Templates:', error);
      throw error;
    }
  }

  // Neues Label-Template erstellen
  async createLabelTemplate(templateData, userId = null) {
    try {
      // Prüfen, ob ein Template mit diesem Namen bereits existiert für diesen Benutzer
      const checkQuery = `
        SELECT id FROM label_templates
        WHERE name = $1 AND (user_id = $2 OR (user_id IS NULL AND $2 IS NULL))
      `;
      const existingTemplate = await db.query(checkQuery, [templateData.name, userId]);

      if (existingTemplate.rows.length > 0) {
        throw new Error('Eine Vorlage mit diesem Namen existiert bereits');
      }

      // Wenn dies die erste Vorlage des Benutzers ist, setze sie als Standard
      let isDefault = templateData.isDefault;
      if (isDefault === undefined) {
        const userTemplates = await db.query(
          'SELECT id FROM label_templates WHERE user_id = $1',
          [userId]
        );
        isDefault = userTemplates.rows.length === 0;
      }

      const query = `
        INSERT INTO label_templates (
          user_id,
          name,
          description,
          settings,
          is_default,
          version
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [
        userId,
        templateData.name,
        templateData.description || null,
        JSON.stringify(templateData.settings),
        isDefault,
        1 // Erste Version
      ];

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Fehler beim Erstellen des Label-Templates:', error);
      throw error;
    }
  }

  // Label-Template aktualisieren
  async updateLabelTemplate(id, templateData, userId = null) {
    try {
      // Prüfen, ob das Template existiert und dem Benutzer gehört
      const existingTemplate = await this.getLabelTemplateById(id, userId);

      if (!existingTemplate) {
        throw new Error('Vorlage nicht gefunden oder keine Berechtigung');
      }

      // Prüfen, ob ein anderes Template mit diesem Namen existiert
      if (templateData.name && templateData.name !== existingTemplate.name) {
        const checkQuery = `
          SELECT id FROM label_templates
          WHERE name = $1 AND id != $2 AND (user_id = $3 OR (user_id IS NULL AND $3 IS NULL))
        `;
        const duplicateTemplate = await db.query(checkQuery, [templateData.name, id, userId]);

        if (duplicateTemplate.rows.length > 0) {
          throw new Error('Eine andere Vorlage mit diesem Namen existiert bereits');
        }
      }

      // Erhöhe Version, wenn sich die Einstellungen geändert haben
      let newVersion = existingTemplate.version;
      if (templateData.settings && JSON.stringify(templateData.settings) !== JSON.stringify(existingTemplate.settings)) {
        newVersion += 1;
      }

      // Setze app.current_user_id für den Versionierungstrigger
      await db.query("SELECT set_config('app.current_user_id', $1, true)", [userId ? userId.toString() : '']);

      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      if (templateData.name !== undefined) {
        updateFields.push(`name = $${paramIndex}`);
        values.push(templateData.name);
        paramIndex++;
      }

      if (templateData.description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        values.push(templateData.description);
        paramIndex++;
      }

      if (templateData.settings !== undefined) {
        updateFields.push(`settings = $${paramIndex}`);
        values.push(JSON.stringify(templateData.settings));
        paramIndex++;
      }

      if (templateData.isDefault !== undefined) {
        updateFields.push(`is_default = $${paramIndex}`);
        values.push(templateData.isDefault);
        paramIndex++;
      }

      updateFields.push(`version = $${paramIndex}`);
      values.push(newVersion);
      paramIndex++;

      updateFields.push(`updated_at = NOW()`);

      // Ergänze ID und user_id als letzte Parameter
      values.push(id);
      values.push(userId);

      const query = `
        UPDATE label_templates
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND (user_id = $${paramIndex + 1} OR (user_id IS NULL AND user_id IS NULL))
        RETURNING *
      `;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Vorlage konnte nicht aktualisiert werden');
      }

      // Wenn diese Vorlage als Standard gesetzt wird, setze alle anderen Vorlagen dieses Benutzers auf nicht-Standard
      if (templateData.isDefault === true) {
        await db.query(
          'UPDATE label_templates SET is_default = false WHERE id != $1 AND user_id = $2',
          [id, userId]
        );
      }

      return result.rows[0];
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Label-Templates:', error);
      throw error;
    }
  }

  // Label-Template löschen
  async deleteLabelTemplate(id, userId = null) {
    try {
      // Prüfen, ob das Template existiert und dem Benutzer gehört
      const existingTemplate = await this.getLabelTemplateById(id, userId);

      if (!existingTemplate) {
        throw new Error('Vorlage nicht gefunden oder keine Berechtigung');
      }

      // Globale Vorlagen können nur von Administratoren gelöscht werden (prüfe in Controller)
      if (existingTemplate.user_id === null && userId !== null) {
        throw new Error('Keine Berechtigung zum Löschen globaler Vorlagen');
      }

      const query = `
        DELETE FROM label_templates
        WHERE id = $1 AND (user_id = $2 OR (user_id IS NULL AND $2 IS NULL))
        RETURNING *
      `;

      const result = await db.query(query, [id, userId]);

      if (result.rows.length === 0) {
        throw new Error('Vorlage konnte nicht gelöscht werden');
      }

      // Wenn die gelöschte Vorlage die Standardvorlage war, setze eine andere Vorlage als Standard
      if (existingTemplate.is_default) {
        const otherTemplates = await db.query(
          'SELECT id FROM label_templates WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1',
          [userId]
        );

        if (otherTemplates.rows.length > 0) {
          await db.query(
            'UPDATE label_templates SET is_default = true WHERE id = $1',
            [otherTemplates.rows[0].id]
          );
        }
      }

      return result.rows[0];
    } catch (error) {
      console.error('Fehler beim Löschen des Label-Templates:', error);
      throw error;
    }
  }

  // Vorherige Versionen eines Templates abrufen
  async getLabelTemplateVersions(templateId, userId = null) {
    try {
      // Erst prüfen, ob der Benutzer Zugriff auf das Template hat
      const template = await this.getLabelTemplateById(templateId, userId);

      if (!template) {
        throw new Error('Vorlage nicht gefunden oder keine Berechtigung');
      }

      const query = `
        SELECT * FROM label_template_versions
        WHERE template_id = $1
        ORDER BY version DESC
      `;

      const result = await db.query(query, [templateId]);
      return result.rows;
    } catch (error) {
      console.error('Fehler beim Abrufen der Template-Versionen:', error);
      throw error;
    }
  }

  // Zu einer bestimmten Version zurückkehren
  async revertToLabelTemplateVersion(templateId, versionId, userId = null) {
    try {
      // Erst prüfen, ob der Benutzer Zugriff auf das Template hat
      const template = await this.getLabelTemplateById(templateId, userId);

      if (!template) {
        throw new Error('Vorlage nicht gefunden oder keine Berechtigung');
      }

      // Die gewünschte Version abrufen
      const versionQuery = `
        SELECT * FROM label_template_versions
        WHERE id = $1 AND template_id = $2
      `;

      const versionResult = await db.query(versionQuery, [versionId, templateId]);

      if (versionResult.rows.length === 0) {
        throw new Error('Version nicht gefunden');
      }

      const versionData = versionResult.rows[0];

      // Template mit den Einstellungen der gewünschten Version aktualisieren
      return await this.updateLabelTemplate(
        templateId,
        {
          settings: versionData.settings,
          // Erhöhe Version um 1 vom aktuellen Stand
          version: template.version + 1
        },
        userId
      );
    } catch (error) {
      console.error('Fehler beim Zurückkehren zur Template-Version:', error);
      throw error;
    }
  }

  // Import/Export Funktionen
  async importLabelTemplate(templateData, userId = null) {
    try {
      // Prüfe, ob das Template gültig ist
      if (!templateData.name || !templateData.settings) {
        throw new Error('Ungültige Vorlagendaten: Name und Einstellungen sind erforderlich');
      }

      // Erstelle ein neues Template mit importierten Daten
      return await this.createLabelTemplate({
        name: templateData.name,
        description: templateData.description || `Importiert am ${new Date().toLocaleDateString()}`,
        settings: templateData.settings,
        isDefault: false // Importierte Vorlagen sind nie automatisch Standard
      }, userId);
    } catch (error) {
      console.error('Fehler beim Importieren des Label-Templates:', error);
      throw error;
    }
  }

  // Cache-Funktion (vereinfacht ohne Redis)
  async getCachedLabelTemplate(id, userId = null) {
    // Hier würde normalerweise ein Redis-Cache verwendet werden
    // Für diese Implementierung geben wir nur direkt das Template zurück
    return await this.getLabelTemplateById(id, userId);
  }

  // Automatische Migration von Einstellungen
  async migrateLabelSettings(userId = null) {
    try {
      // Bestehende Einstellungen abrufen
      const currentSettings = await this.getLabelSettings(userId);

      if (!currentSettings) {
        return null; // Keine Einstellungen zum Migrieren vorhanden
      }

      // Prüfen, ob bereits ein Template mit den aktuellen Einstellungen existiert
      const templateName = 'Migriert von Einstellungen';

      try {
        // Versuche, ein neues Template zu erstellen
        const newTemplate = await this.createLabelTemplate({
          name: templateName,
          description: 'Automatisch aus den Benutzereinstellungen erstellt',
          settings: currentSettings,
          isDefault: true
        }, userId);

        return newTemplate;
      } catch (error) {
        // Falls ein Template mit diesem Namen bereits existiert, aktualisiere es
        if (error.message.includes('existiert bereits')) {
          const existingTemplates = await db.query(
            'SELECT id FROM label_templates WHERE name = $1 AND user_id = $2',
            [templateName, userId]
          );

          if (existingTemplates.rows.length > 0) {
            return await this.updateLabelTemplate(
              existingTemplates.rows[0].id,
              { settings: currentSettings },
              userId
            );
          }
        }

        throw error;
      }
    } catch (error) {
      console.error('Fehler bei der Migration der Label-Einstellungen:', error);
      throw error;
    }
  }
}

module.exports = new SettingsModel();
