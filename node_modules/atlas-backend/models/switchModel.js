const db = require('../db');

class SwitchModel {
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
          // Optional: Behalte auch das Original-Feld für interne Zwecke?
          // is_active: is_active !== undefined ? is_active : true
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
         // Optional: Behalte auch das Original-Feld für interne Zwecke?
        // is_active: is_active !== undefined ? is_active : true
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
      const checkQuery = `SELECT id, name FROM network_switches WHERE LOWER(name) = LOWER($1)`;
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

      const insertQuery = `
        INSERT INTO network_switches (
          name, description, model, manufacturer_id, ip_address, mac_address,
          management_url, location_id, room_id, cabinet_id, rack_position,
          port_count, uplink_port, notes, is_active, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
        RETURNING id
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
        switchData.isActive !== undefined ? switchData.isActive : true // Verwende isActive
      ];

      const { rows } = await client.query(insertQuery, values);
      const newSwitchId = rows[0].id;

      await client.query('COMMIT');

      // Hole den neu erstellten Switch mit allen Details
      const result = await this.getSwitchById(newSwitchId);
      return result;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Fehler beim Erstellen des Switches:', error);
       if (error.code === '23505') { // Unique constraint violation (könnte auch Name sein)
          throw new Error(`Ein Switch mit diesem Namen "${switchData.name}" existiert bereits`);
      }
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
        const checkQuery = `SELECT id FROM network_switches WHERE LOWER(name) = LOWER($1) AND id != $2`;
        const existingSwitch = await client.query(checkQuery, [switchData.name, id]);

        if (existingSwitch.rows.length > 0) {
          await client.query('ROLLBACK');
          const error = new Error(`Ein anderer Switch mit dem Namen "${switchData.name}" existiert bereits`);
          error.code = 'DUPLICATE_SWITCH';
          throw error;
        }
      }

      const updateQuery = `
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
        RETURNING id
      `;

      const values = [
        switchData.name,
        switchData.description,
        switchData.model,
        switchData.manufacturer_id,
        switchData.ip_address,
        switchData.mac_address,
        switchData.management_url,
        switchData.location_id,
        switchData.room_id,
        switchData.cabinet_id,
        switchData.rack_position,
        switchData.port_count,
        switchData.uplink_port,
        switchData.notes,
        switchData.isActive !== undefined ? switchData.isActive : null, // Verwende isActive
        id
      ];

      const { rows } = await client.query(updateQuery, values);

      await client.query('COMMIT');

      if (rows.length === 0) {
        throw new Error('Switch nicht gefunden');
      }

      // Hole den aktualisierten Switch mit allen Details
      const result = await this.getSwitchById(id);
      return result;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Fehler beim Aktualisieren des Switches:', error);
      if (error.code === '23505') { // Unique constraint violation (könnte auch Name sein)
          throw new Error(`Ein anderer Switch mit dem Namen "${switchData.name}" existiert bereits`);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  // Switch löschen
  async deleteSwitch(id) {
    try {
      // Prüfen, ob der Switch existiert
      const { rows: existsResult } = await db.query('SELECT EXISTS(SELECT 1 FROM network_switches WHERE id = $1)', [id]);
      if (!existsResult[0].exists) {
        throw new Error('Switch nicht gefunden');
      }

      // Prüfen, ob Ports mit diesem Switch verbunden sind
      const checkPortsQuery = `SELECT COUNT(*) FROM network_ports WHERE switch_id = $1`;
      const portUsage = await db.query(checkPortsQuery, [id]);
      if (parseInt(portUsage.rows[0].count) > 0) {
          throw new Error('Switch kann nicht gelöscht werden, da er noch von Netzwerkports verwendet wird.');
      }

      // Hier könnten weitere Prüfungen erfolgen je nach Anwendungsfall (z.B. verbundene Geräte)

      const query = `DELETE FROM network_switches WHERE id = $1 RETURNING *`;
      const { rows } = await db.query(query, [id]);

      if (rows.length === 0) {
        // Sollte durch die Existenzprüfung oben nicht passieren
        throw new Error('Switch nicht gefunden beim Löschen');
      }

      const deletedSwitch = rows[0];
      return { success: true, message: 'Switch gelöscht', data: { ...deletedSwitch, isActive: deletedSwitch.is_active } };

    } catch (error) {
      console.error('Fehler beim Löschen des Switches:', error);
      if (error.code === '23503') { // Foreign key violation
          throw new Error('Switch kann nicht gelöscht werden, da er noch verwendet wird (z.B. von Ports).');
      }
      throw error;
    }
  }
}

module.exports = new SwitchModel();
