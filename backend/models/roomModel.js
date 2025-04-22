const db = require('../db');
const { NotFoundError, DatabaseError, ConflictError } = require('../utils/customErrors.js');

class RoomModel {
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
      // Prüfen, ob der Raum bereits existiert (innerhalb des gleichen Standorts, falls location_id angegeben)
      let checkQuery = `SELECT id FROM rooms WHERE LOWER(name) = LOWER($1)`;
      const params = [roomData.name];
      if (roomData.location_id) {
        checkQuery += ` AND location_id = $2`;
        params.push(roomData.location_id);
      }
      const existingRoom = await db.query(checkQuery, params);

      if (existingRoom.rows.length > 0) {
        throw new Error('Ein Raum mit diesem Namen existiert bereits an diesem Standort.');
      }

      const query = `
        INSERT INTO rooms (
          name,
          description,
          location_id,
          active,
          building,
          floor,
          room_number
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [
        roomData.name,
        roomData.description || null,
        roomData.location_id || null,
        roomData.active !== undefined ? roomData.active : true,
        roomData.building || null,
        roomData.floor || null,
        roomData.room_number || null
      ];

      const { rows } = await db.query(query, values);
      const newRoomId = rows[0].id;

      // Hole den neu erstellten Raum mit Standortnamen
      const result = await this.getRoomById(newRoomId);
      return result;

    } catch (error) {
      console.error('Fehler beim Erstellen des Raums:', error);
      if (error.code === '23505') { // Unique constraint violation
           throw new Error('Ein Raum mit diesem Namen existiert bereits an diesem Standort.');
      }
      throw error;
    }
  }

  // Raum aktualisieren
  async updateRoom(id, roomData) {
    try {
       // Prüfen, ob ein anderer Raum bereits den Namen verwendet (innerhalb des gleichen Standorts)
      if (roomData.name) {
        let checkQuery = `SELECT id FROM rooms WHERE LOWER(name) = LOWER($1) AND id != $2`;
        const params = [roomData.name, id];
        // Wenn location_id mitgegeben wird, prüfe nur innerhalb dieses Standorts
        if (roomData.location_id !== undefined) {
            checkQuery += ` AND location_id ${roomData.location_id === null ? 'IS NULL' : '= $3'}`;
            if (roomData.location_id !== null) params.push(roomData.location_id);
        } else {
             // Wenn location_id nicht mitgegeben wird, prüfe innerhalb des aktuellen Standorts des Raums
             checkQuery += ` AND location_id = (SELECT location_id FROM rooms WHERE id = $2)`;
        }

        const existingRoom = await db.query(checkQuery, params);
        if (existingRoom.rows.length > 0) {
          throw new Error('Ein anderer Raum mit diesem Namen existiert bereits an diesem Standort.');
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
          floor = COALESCE($6, floor),
          room_number = COALESCE($7, room_number),
          updated_at = NOW()
        WHERE id = $8
        RETURNING id
      `;

      const values = [
        roomData.name,
        roomData.description,
        roomData.location_id, // Kann auch null sein
        roomData.active !== undefined ? roomData.active : null,
        roomData.building,
        roomData.floor,
        roomData.room_number,
        id
      ];

      const { rows } = await db.query(query, values);

      if (rows.length === 0) {
        throw new Error('Raum nicht gefunden');
      }

       // Hole den aktualisierten Raum mit Standortnamen
      const result = await this.getRoomById(id);
      return result;

    } catch (error) {
      console.error('Fehler beim Aktualisieren des Raums:', error);
       if (error.code === '23505') { // Unique constraint violation
           throw new Error('Ein anderer Raum mit diesem Namen existiert bereits an diesem Standort.');
      }
      throw error;
    }
  }

  // Raum löschen
  async deleteRoom(id) {
    try {
      // Prüfen, ob der Raum verwendet wird (z.B. von Geräten, Switches etc.)
      const checkDevicesQuery = `SELECT COUNT(*) FROM devices WHERE room_id = $1`;
      const checkSwitchesQuery = `SELECT COUNT(*) FROM network_switches WHERE room_id = $1`;
      const checkSocketsQuery = `SELECT COUNT(*) FROM network_sockets WHERE room_id = $1`;

      const deviceUsage = await db.query(checkDevicesQuery, [id]);
      const switchUsage = await db.query(checkSwitchesQuery, [id]);
      const socketUsage = await db.query(checkSocketsQuery, [id]);

      if (parseInt(deviceUsage.rows[0].count) > 0 || parseInt(switchUsage.rows[0].count) > 0 || parseInt(socketUsage.rows[0].count) > 0) {
        throw new Error('Raum kann nicht gelöscht werden, da er noch von Geräten, Switches oder Netzwerkdosen verwendet wird.');
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

      return { success: true, message: 'Raum gelöscht', data: rows[0] };
    } catch (error) {
      console.error('Fehler beim Löschen des Raums:', error);
       if (error.code === '23503') { // Foreign key violation
           throw new Error('Raum kann nicht gelöscht werden, da er noch verwendet wird.');
       }
      throw error;
    }
  }
}

module.exports = new RoomModel();
