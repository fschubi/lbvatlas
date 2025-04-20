const db = require('../db');
const logger = require('../utils/logger');

const NetworkOutletModel = {
    async getAll() {
        const query = 'SELECT id, outlet_number, location_id, room_id, description, is_active, created_at, updated_at FROM network_sockets ORDER BY outlet_number ASC';
        try {
            const { rows } = await db.query(query);
            return rows;
        } catch (error) {
            logger.error('Error fetching all network outlets:', error);
            throw error;
        }
    },

    async findById(id) {
        const query = 'SELECT id, outlet_number, location_id, room_id, description, is_active, created_at, updated_at FROM network_sockets WHERE id = $1';
        try {
            const { rows } = await db.query(query, [id]);
            return rows[0];
        } catch (error) {
            logger.error(`Error fetching network outlet with id ${id}:`, error);
            throw error;
        }
    },

    async findByOutletNumber(outletNumber, locationId = null, roomId = null) {
        const query = 'SELECT * FROM network_sockets WHERE lower(outlet_number) = lower($1)';
        try {
            const { rows } = await db.query(query, [outletNumber]);
            return rows[0];
        } catch (error) {
            logger.error(`Error finding network outlet by outlet_number ${outletNumber}:`, error);
            throw error;
        }
    },

    async create(outletData) {
        const { outlet_number, location_id, room_id, description, is_active } = outletData;
        const query = `
            INSERT INTO network_sockets (outlet_number, location_id, room_id, description, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        try {
            const activeState = is_active === undefined ? true : Boolean(is_active);
            const values = [outlet_number, location_id, room_id, description, activeState];
            const { rows } = await db.query(query, values);
            logger.info(`Network outlet created with ID: ${rows[0].id}`);
            return rows[0];
        } catch (error) {
            logger.error('Error creating network outlet:', error);
            if (error.code === '23505') {
                 throw new Error(`Netzwerkdose mit der Nummer '${outlet_number}' existiert bereits.`);
            }
             if (error.code === '23503') {
                 throw new Error('Ungültige Standort-ID oder Raum-ID.');
            }
            throw error;
        }
    },

    async update(id, outletData) {
        const { outlet_number, location_id, room_id, description, is_active } = outletData;

        const fields = [];
        const values = [];
        let paramCount = 1;

        if (outlet_number !== undefined) { fields.push(`outlet_number = $${paramCount++}`); values.push(outlet_number); }
        if (location_id !== undefined) { fields.push(`location_id = $${paramCount++}`); values.push(location_id); }
        if (room_id !== undefined) { fields.push(`room_id = $${paramCount++}`); values.push(room_id); }
        if (description !== undefined) { fields.push(`description = $${paramCount++}`); values.push(description); }
        if (is_active !== undefined) { fields.push(`is_active = $${paramCount++}`); values.push(Boolean(is_active)); }

        if (fields.length === 0) {
            return this.findById(id);
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const query = `
            UPDATE network_sockets
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        try {
            const { rows } = await db.query(query, values);
             if (rows.length === 0) {
                 return null;
            }
            logger.info(`Network outlet updated with ID: ${id}`);
            return rows[0];
        } catch (error) {
            logger.error(`Error updating network outlet with ID ${id}:`, error);
             if (error.code === '23505') {
                 throw new Error(`Aktualisierung fehlgeschlagen, Unique Constraint verletzt (evtl. Dosennummer '${outlet_number}').`);
            }
            if (error.code === '23503') {
                 throw new Error('Ungültige Standort-ID oder Raum-ID beim Update.');
            }
            throw error;
        }
    },

    async delete(id) {
        const query = 'DELETE FROM network_sockets WHERE id = $1 RETURNING id';
        try {
            const { rowCount } = await db.query(query, [id]);
            if (rowCount === 0) {
                 return false;
            }
            logger.info(`Network outlet deleted with ID: ${id}`);
            return true;
        } catch (error) {
            logger.error(`Error deleting network outlet with ID ${id}:`, error);
            throw error;
        }
    }
};

module.exports = NetworkOutletModel;
