const NetworkOutletModel = require('../models/networkOutletModel');
const LocationModel = require('../models/locationModel');
const RoomModel = require('../models/roomModel');
const { validationResult } = require('express-validator');
const { toCamelCase } = require('../utils/caseConverter');
const logger = require('../utils/logger');

const NetworkOutletController = {
    async getAllOutlets(req, res, next) {
        try {
            const outlets = await NetworkOutletModel.getAll();
            res.status(200).json(outlets.map(toCamelCase));
        } catch (error) {
            logger.error('Error in NetworkOutletController (getAllOutlets):', error);
            next(error);
        }
    },

    async getOutletById(req, res, next) {
        const { id } = req.params;
        const outletId = parseInt(id, 10);

        if (isNaN(outletId) || outletId <= 0) {
            return res.status(400).json({ message: 'Ungültige Netzwerkdosen-ID.' });
        }

        try {
            const outlet = await NetworkOutletModel.findById(outletId);
            if (!outlet) {
                return res.status(404).json({ message: `Netzwerkdose mit ID ${outletId} nicht gefunden.` });
            }
            res.status(200).json(toCamelCase(outlet));
        } catch (error) {
            logger.error(`Error in NetworkOutletController (getOutletById ${id}):`, error);
            next(error);
        }
    },

    async createOutlet(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
             logger.warn('[createOutlet] Validation errors:', errors.array());
            return res.status(400).json({ message: 'Validierungsfehler', errors: errors.array() });
        }

        const { outletNumber, locationId, roomId, description, isActive } = req.body;

        if (!outletNumber) {
            return res.status(400).json({ message: 'Die Dosennummer ist erforderlich.' });
        }
        if (locationId === undefined) {
            return res.status(400).json({ message: 'Die Standort-ID ist erforderlich.' });
        }
        if (roomId === undefined) {
            return res.status(400).json({ message: 'Die Raum-ID ist erforderlich.'});
        }

        try {
            const existingOutlet = await NetworkOutletModel.findByOutletNumber(outletNumber);
            if (existingOutlet) {
                return res.status(409).json({ message: `Netzwerkdose mit der Nummer '${outletNumber}' existiert bereits.` });
            }

            const outletData = {
                outlet_number: outletNumber,
                location_id: locationId || null,
                room_id: roomId || null,
                description: description || null,
                is_active: isActive === undefined ? true : isActive,
            };

            const outlet = await NetworkOutletModel.create(outletData);
            res.status(201).json(toCamelCase(outlet));
        } catch (error) {
            logger.error('Error in NetworkOutletController (createOutlet):', error);
            res.status(500).json({ message: error.message || 'Fehler beim Erstellen der Netzwerkdose.' });
        }
    },

    async updateOutlet(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
             logger.warn('[updateOutlet] Validation errors:', errors.array());
            return res.status(400).json({ message: 'Validierungsfehler', errors: errors.array() });
        }

        const { id } = req.params;
        const outletId = parseInt(id, 10);
        if (isNaN(outletId) || outletId <= 0) {
            return res.status(400).json({ message: 'Ungültige Netzwerkdosen-ID.' });
        }

        const { outletNumber, locationId, roomId, description, isActive } = req.body;
        const updateData = { outlet_number: outletNumber, location_id: locationId, room_id: roomId, description: description, is_active: isActive };

        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

         if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'Keine Daten zum Aktualisieren angegeben.' });
        }

        try {
            const existingOutlet = await NetworkOutletModel.findById(outletId);
            if (!existingOutlet) {
                return res.status(404).json({ message: 'Netzwerkdose nicht gefunden.' });
            }

            if (outletNumber && outletNumber !== existingOutlet.outlet_number) {
                const conflictingOutlet = await NetworkOutletModel.findByOutletNumber(outletNumber);
                if (conflictingOutlet && conflictingOutlet.id !== parseInt(id)) {
                    return res.status(409).json({ message: `Netzwerkdose mit der Nummer '${outletNumber}' existiert bereits.` });
                }
            }

            const updatedOutlet = await NetworkOutletModel.update(outletId, updateData);
            if (!updatedOutlet) {
                return res.status(404).json({ message: 'Netzwerkdose nach Update nicht gefunden.' });
            }
            res.status(200).json(toCamelCase(updatedOutlet));
        } catch (error) {
            logger.error('Error in NetworkOutletController (updateOutlet):', error);
            res.status(500).json({ message: error.message || 'Fehler beim Aktualisieren der Netzwerkdose.' });
        }
    },

    async deleteOutlet(req, res) {
        const { id } = req.params;
        const outletId = parseInt(id, 10);

        if (isNaN(outletId) || outletId <= 0) {
            return res.status(400).json({ message: 'Ungültige Netzwerkdosen-ID.' });
        }

        try {
            const success = await NetworkOutletModel.delete(outletId);
            if (!success) {
                return res.status(404).json({ message: `Netzwerkdose mit ID ${outletId} nicht gefunden.` });
            }
            res.status(200).json({ success: true, message: 'Netzwerkdose erfolgreich gelöscht.' });
        } catch (error) {
            logger.error(`Error deleting network outlet ${outletId}:`, error);
             if (error.code === '23503') { // Foreign Key Violation
                return res.status(409).json({ message: 'Netzwerkdose kann nicht gelöscht werden, da sie noch verwendet wird (z.B. in Ports).', code: error.code });
            }
            res.status(500).json({ message: 'Serverfehler beim Löschen der Netzwerkdose.' });
        }
    }
};

module.exports = NetworkOutletController;
