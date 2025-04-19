const db = require('../db');
const { pool } = require('../db');
const { NotFoundError, DatabaseError, ConflictError } = require('../utils/customErrors.js');

class LocationModel {
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
        WHERE LOWER(name) = LOWER($1)
      `;
      const existingLocation = await db.query(checkQuery, [locationData.name]);

      if (existingLocation.rows.length > 0) {
        throw new ConflictError('Ein Standort mit diesem Namen existiert bereits.');
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
        locationData.country || 'Deutschland',
        locationData.description || null
      ];

      const { rows } = await db.query(query, values);
      return rows[0];
    } catch (error) {
      console.error('Fehler beim Erstellen des Standorts:', error);
      if (error.code === '23505' || error instanceof ConflictError) {
           throw new ConflictError('Ein Standort mit diesem Namen existiert bereits.');
      }
      throw new DatabaseError(`Fehler beim Erstellen des Standorts: ${error.message}`);
    }
  }

  // Standort aktualisieren
  async updateLocation(id, locationData) {
    try {
        // Prüfen, ob ein anderer Standort bereits den neuen Namen verwendet
        if (locationData.name) {
            const checkQuery = `
                SELECT id FROM locations
                WHERE LOWER(name) = LOWER($1) AND id != $2
            `;
            const existingLocation = await db.query(checkQuery, [locationData.name, id]);
            if (existingLocation.rows.length > 0) {
                throw new ConflictError('Ein anderer Standort mit diesem Namen existiert bereits.');
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
        locationData.name,
        locationData.address,
        locationData.postal_code,
        locationData.city,
        locationData.country,
        locationData.description,
        id
      ];

      const { rows } = await db.query(query, values);

      if (rows.length === 0) {
        throw new NotFoundError('Standort nicht gefunden');
      }
      return rows[0];
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Standorts:', error);
      if (error.code === '23505' || error instanceof ConflictError) {
           throw new ConflictError('Ein anderer Standort mit diesem Namen existiert bereits.');
      }
      throw new DatabaseError(`Fehler beim Aktualisieren des Standorts: ${error.message}`);
    }
  }

  // Standort löschen
  async deleteLocation(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Prüfen, ob der Standort noch in Räumen verwendet wird
      const roomCheck = await db.query(
        'SELECT COUNT(*) FROM rooms WHERE location_id = $1',
        [id]
      );
      if (roomCheck.rows[0].count > 0) {
        throw new ConflictError('Standort kann nicht gelöscht werden, da ihm noch Räume zugewiesen sind.');
      }

      // 2. Prüfen, ob der Standort noch in Geräten verwendet wird (FEHLERHAFT, DA SPALTE NICHT EXISTIERT)
      // const deviceCheck = await db.query(
      //   'SELECT COUNT(*) FROM devices WHERE location_id = $1',
      //   [id]
      // );
      // if (deviceCheck.rows[0].count > 0) {
      //  throw new Error('Standort kann nicht gelöscht werden, da ihm noch Geräte zugewiesen sind.');
      // }

      // Weitere Prüfungen hier hinzufügen (z.B. für Zubehör, Lizenzen etc., falls nötig)

      // 3. Standort löschen
      const result = await db.query('DELETE FROM locations WHERE id = $1 RETURNING *', [id]);

      if (result.rowCount === 0) {
        throw new NotFoundError('Standort nicht gefunden oder bereits gelöscht.');
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Fehler beim Löschen des Standorts:', error);
      if (error instanceof ConflictError || error instanceof NotFoundError) {
          throw error;
      }
      throw new DatabaseError(`Fehler beim Löschen des Standorts: ${error.message}`);
    } finally {
      client.release();
    }
  }

}

module.exports = new LocationModel();
