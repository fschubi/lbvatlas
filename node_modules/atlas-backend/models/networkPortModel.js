const db = require('../db');

class NetworkPortModel {
  // Netzwerk-Ports abfragen
  async getAllNetworkPorts() {
    try {
      // Füge Joins hinzu, um Switch- und Socket-Informationen zu erhalten
      const query = `
        SELECT
          np.*,
          ns.name AS switch_name,
          nk.outlet_number AS socket_outlet_number
        FROM network_ports np
        LEFT JOIN network_switches ns ON np.switch_id = ns.id
        LEFT JOIN network_sockets nk ON np.socket_id = nk.id
        ORDER BY np.port_number ASC
      `;
      const { rows } = await db.query(query);
      return rows;
    } catch (error) {
      console.error('Datenbankfehler beim Abrufen aller Netzwerk-Ports:', error);
      throw error;
    }
  }

  // Netzwerk-Port nach ID abfragen
  async getNetworkPortById(portId) {
    try {
      const query = `
        SELECT
          np.*,
          ns.name AS switch_name,
          nk.outlet_number AS socket_outlet_number
        FROM network_ports np
        LEFT JOIN network_switches ns ON np.switch_id = ns.id
        LEFT JOIN network_sockets nk ON np.socket_id = nk.id
        WHERE np.id = $1
      `;
      const { rows } = await db.query(query, [portId]);
      return rows[0] || null;
    } catch (error) {
      console.error('Datenbankfehler beim Abrufen des Netzwerk-Ports nach ID:', error);
      throw error;
    }
  }

  // Netzwerk-Port erstellen
  async createNetworkPort(portData) {
    try {
      const { port_number, switch_id, socket_id, description } = portData;

      // Prüfen, ob die Portnummer am gegebenen Switch bereits existiert
      if (switch_id && port_number) {
        const checkQuery = `SELECT id FROM network_ports WHERE switch_id = $1 AND port_number = $2`;
        const { rows: existingPort } = await db.query(checkQuery, [switch_id, port_number]);
        if (existingPort.length > 0) {
            throw new Error(`Portnummer ${port_number} existiert bereits auf diesem Switch.`);
        }
      }

      // Prüfen, ob der Port mit einer Dose verbunden wird, die bereits verwendet wird
      if (socket_id) {
          const socketCheckQuery = `SELECT id FROM network_ports WHERE socket_id = $1`;
          const { rows: socketInUse } = await db.query(socketCheckQuery, [socket_id]);
          if (socketInUse.length > 0) {
              throw new Error('Diese Netzwerkdose ist bereits mit einem anderen Port verbunden.');
          }
      }

      const query = `
        INSERT INTO network_ports (port_number, switch_id, socket_id, description, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id
      `;
      const values = [
          port_number,
          switch_id || null,
          socket_id || null,
          description || null
      ];
      const { rows } = await db.query(query, values);
      const newPortId = rows[0].id;

      // Den neu erstellten Port mit Details zurückgeben
      return await this.getNetworkPortById(newPortId);

    } catch (error) {
      console.error('Datenbankfehler beim Erstellen des Netzwerk-Ports:', error);
      if (error.code === '23505') { // Unique constraint violation
           throw new Error(`Portnummer ${portData.port_number} existiert bereits auf diesem Switch oder die Dose ist bereits verbunden.`);
      }
      if (error.code === '23503') { // Foreign key violation
            throw new Error('Ungültige Switch-ID oder Socket-ID angegeben.');
      }
      throw error;
    }
  }

  // Netzwerk-Port aktualisieren
  async updateNetworkPort(portId, portData) {
    try {
      const { port_number, switch_id, socket_id, description } = portData;

      // Prüfen, ob der Port existiert
      const { rows: existsResult } = await db.query('SELECT switch_id, socket_id FROM network_ports WHERE id = $1', [portId]);
      if (existsResult.length === 0) {
        throw new Error('Netzwerk-Port nicht gefunden');
      }
      const currentPort = existsResult[0];

      // Prüfen, ob die neue Portnummer am gegebenen Switch bereits existiert (außer bei dem aktuellen Port)
      if (switch_id && port_number) {
        const checkQuery = `SELECT id FROM network_ports WHERE switch_id = $1 AND port_number = $2 AND id != $3`;
        const { rows: duplicatePort } = await db.query(checkQuery, [switch_id, port_number, portId]);
        if (duplicatePort.length > 0) {
            throw new Error(`Portnummer ${port_number} existiert bereits auf diesem Switch.`);
        }
      }

       // Prüfen, ob der Port mit einer Dose verbunden wird, die bereits verwendet wird (von einem *anderen* Port)
      if (socket_id) {
          const socketCheckQuery = `SELECT id FROM network_ports WHERE socket_id = $1 AND id != $2`;
          const { rows: socketInUse } = await db.query(socketCheckQuery, [socket_id, portId]);
          if (socketInUse.length > 0) {
              throw new Error('Diese Netzwerkdose ist bereits mit einem anderen Port verbunden.');
          }
      }

      // Port aktualisieren
       const updateQuery = `
        UPDATE network_ports SET
          port_number = COALESCE($1, port_number),
          switch_id = COALESCE($2, switch_id),
          socket_id = COALESCE($3, socket_id),
          description = COALESCE($4, description),
          updated_at = NOW()
        WHERE id = $5
        RETURNING id
      `;
        const values = [
          port_number,
          switch_id,
          socket_id,
          description,
          portId
        ];
      const { rows } = await db.query(updateQuery, values);

      // Den aktualisierten Port mit Details zurückgeben
      return await this.getNetworkPortById(portId);

    } catch (error) {
      console.error('Datenbankfehler beim Aktualisieren des Netzwerk-Ports:', error);
       if (error.code === '23505') { // Unique constraint violation
           throw new Error(`Portnummer ${portData.port_number} existiert bereits auf diesem Switch oder die Dose ist bereits verbunden.`);
      }
       if (error.code === '23503') { // Foreign key violation
            throw new Error('Ungültige Switch-ID oder Socket-ID angegeben.');
      }
      throw error;
    }
  }

  // Netzwerk-Port löschen
  async deleteNetworkPort(portId) {
    try {
      // Prüfen, ob der Port existiert
      const { rows: existsResult } = await db.query('SELECT * FROM network_ports WHERE id = $1', [portId]);
      if (existsResult.length === 0) {
        throw new Error('Netzwerk-Port nicht gefunden');
      }
      const deletedPortData = existsResult[0];

      // Port löschen
      await db.query('DELETE FROM network_ports WHERE id = $1', [portId]);

      return { success: true, message: 'Netzwerk-Port gelöscht', data: deletedPortData };

    } catch (error) {
      console.error('Datenbankfehler beim Löschen des Netzwerk-Ports:', error);
       // Keine direkten Foreign-Key-Constraints erwartet, die das Löschen verhindern
      throw error;
    }
  }
}

module.exports = new NetworkPortModel();
