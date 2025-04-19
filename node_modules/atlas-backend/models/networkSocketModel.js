const db = require('../db');

class NetworkSocketModel {
  // Netzwerkdosen abfragen
  async getNetworkSockets() {
    try {
      const query = `
        SELECT
          s.id,
          s.description,
          s.room_id,
          s.created_at,
          s.updated_at,
          s.outlet_number,
          s.location_id,
          s.is_active,
          r.name as room_name,
          l.name as location_name
        FROM network_sockets s
        LEFT JOIN rooms r ON s.room_id = r.id
        LEFT JOIN locations l ON s.location_id = l.id
        ORDER BY s.id
      `;
      const { rows } = await db.query(query);
      // Konvertiere is_active zu isActive
      return rows.map(socket => ({ ...socket, isActive: socket.is_active }));
    } catch (error) {
      console.error('Datenbankfehler beim Abrufen der Netzwerkdosen:', error);
      throw error;
    }
  }

  // Netzwerkdose nach ID abfragen
  async getNetworkSocketById(socketId) {
    try {
      const query = `
        SELECT
          s.id,
          s.description,
          s.room_id,
          s.created_at,
          s.updated_at,
          s.outlet_number,
          s.location_id,
          s.is_active,
          r.name as room_name,
          l.name as location_name
        FROM network_sockets s
        LEFT JOIN rooms r ON s.room_id = r.id
        LEFT JOIN locations l ON s.location_id = l.id
        WHERE s.id = $1
      `;
      const { rows } = await db.query(query, [socketId]);

      if (rows.length === 0) {
        return null;
      }
       const socket = rows[0];
      // Konvertiere is_active zu isActive
      return { ...socket, isActive: socket.is_active };
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
        'SELECT id FROM network_sockets WHERE LOWER(outlet_number) = LOWER($1)',
        [socketData.outlet_number]
      );

      if (outletCheck.rows.length > 0) {
        throw new Error(`Eine Netzwerkdose mit der Dosennummer "${socketData.outlet_number}" existiert bereits.`);
      }

      // Neue Netzwerkdose einfügen
      const insertQuery = `
        INSERT INTO network_sockets (
          description, location_id, room_id, outlet_number, is_active
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      const values = [
        socketData.description || '',
        socketData.location_id,
        socketData.room_id,
        socketData.outlet_number,
        socketData.isActive !== undefined ? socketData.isActive : true // Verwende isActive
      ];
      const { rows: insertResult } = await client.query(insertQuery, values);
      const insertedId = insertResult[0].id;

      // Details inklusive Raumname und Standortname abrufen
      const detailsQuery = `
        SELECT
          s.*,
          r.name AS room_name,
          l.name AS location_name
        FROM network_sockets s
        LEFT JOIN rooms r ON s.room_id = r.id
        LEFT JOIN locations l ON s.location_id = l.id
        WHERE s.id = $1
      `;
      const { rows: details } = await client.query(detailsQuery, [insertedId]);

      await client.query('COMMIT');

      const createdSocket = details[0];
      return { ...createdSocket, isActive: createdSocket.is_active }; // Konvertiere is_active

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Fehler beim Erstellen der Netzwerkdose:', error);
      if (error.code === '23505') { // Unique constraint violation (vermutlich outlet_number)
          throw new Error(`Eine Netzwerkdose mit der Dosennummer "${socketData.outlet_number}" existiert bereits.`);
      }
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
      const existCheck = await client.query('SELECT id FROM network_sockets WHERE id = $1', [socketId]);
      if (existCheck.rows.length === 0) {
        throw new Error(`Netzwerkdose mit ID ${socketId} nicht gefunden.`);
      }

      // Prüfen, ob eine andere Netzwerkdose mit der gleichen Dosennummer existiert
      if (socketData.outlet_number) {
        const outletNumberCheck = await client.query(
          'SELECT id FROM network_sockets WHERE LOWER(outlet_number) = LOWER($1) AND id != $2',
          [socketData.outlet_number, socketId]
        );
        if (outletNumberCheck.rows.length > 0) {
          throw new Error(`Eine andere Netzwerkdose mit der Dosennummer "${socketData.outlet_number}" existiert bereits.`);
        }
      }

      // Netzwerkdose aktualisieren
      const updateQuery = `
        UPDATE network_sockets SET
          description = COALESCE($1, description),
          location_id = COALESCE($2, location_id),
          room_id = COALESCE($3, room_id),
          outlet_number = COALESCE($4, outlet_number),
          is_active = COALESCE($5, is_active),
          updated_at = NOW()
        WHERE id = $6
        RETURNING id
      `;
      const values = [
        socketData.description,
        socketData.location_id,
        socketData.room_id,
        socketData.outlet_number,
        socketData.isActive !== undefined ? socketData.isActive : null, // Verwende isActive
        socketId
      ];
      const { rows } = await client.query(updateQuery, values);

      await client.query('COMMIT');

       if (rows.length === 0) {
           throw new Error(`Netzwerkdose mit ID ${socketId} konnte nicht aktualisiert werden.`);
       }

       // Hole die aktualisierte Dose mit allen Details
       const updatedSocket = await this.getNetworkSocketById(socketId);
       return updatedSocket;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Fehler beim Aktualisieren der Netzwerkdose:', error);
       if (error.code === '23505') { // Unique constraint violation (vermutlich outlet_number)
          throw new Error(`Eine andere Netzwerkdose mit der Dosennummer "${socketData.outlet_number}" existiert bereits.`);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  // Netzwerkdose löschen
  async deleteNetworkSocket(socketId) {
    try {
      // Prüfen, ob die Netzwerkdose existiert
      const { rows: existsResult } = await db.query('SELECT EXISTS(SELECT 1 FROM network_sockets WHERE id = $1)', [socketId]);
      if (!existsResult[0].exists) {
        throw new Error('Netzwerkdose nicht gefunden');
      }

      // Prüfen, ob die Netzwerkdose von Ports verwendet wird
      const { rows: usedByPorts } = await db.query('SELECT EXISTS(SELECT 1 FROM network_ports WHERE socket_id = $1)', [socketId]);
      if (usedByPorts[0].exists) {
        throw new Error('Diese Netzwerkdose wird von Ports verwendet und kann nicht gelöscht werden');
      }

      // Netzwerkdose löschen
      const { rows } = await db.query('DELETE FROM network_sockets WHERE id = $1 RETURNING *', [socketId]);

      const deletedSocket = rows[0];
      return { success: true, message: 'Netzwerkdose gelöscht', data: { ...deletedSocket, isActive: deletedSocket.is_active } };

    } catch (error) {
      console.error('Datenbankfehler beim Löschen der Netzwerkdose:', error);
      if (error.code === '23503') { // Foreign key violation
          throw new Error('Netzwerkdose kann nicht gelöscht werden, da sie noch verwendet wird (z.B. von Ports).');
      }
      throw error;
    }
  }
}

module.exports = new NetworkSocketModel();
