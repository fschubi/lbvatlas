const NetworkPortModel = require('../models/networkPortModel');
const { validationResult } = require('express-validator');
const { toCamelCase } = require('../utils/caseConverter');

// Korrekte Struktur: Exportiere ein Objekt mit allen Methoden
const NetworkPortController = {

    async getAllPorts(req, res, next) {
        try {
            const ports = await NetworkPortModel.getAll();
            // Sende die Daten in der ApiResponse-Struktur
            res.status(200).json({
                success: true,
                data: ports.map(toCamelCase)
            });
        } catch (error) {
            console.error('Fehler im NetworkPortController (getAllPorts):', error);
            // Sende standardisierte Fehlerantwort
            res.status(500).json({
                success: false,
                message: error.message || 'Ein interner Serverfehler ist aufgetreten.'
            });
            // next(error) wird hier nicht benötigt
        }
    },

    async getPortById(req, res, next) {
        try {
            const { id } = req.params;
            const portIdNum = parseInt(id, 10);
            if (isNaN(portIdNum) || portIdNum <= 0) {
                return res.status(400).json({ message: 'Ungültige Netzwerk-Port-ID.' });
            }
            const port = await NetworkPortModel.findById(portIdNum); // Korrekter Model-Aufruf
            if (!port) {
                return res.status(404).json({ message: `Netzwerk-Port mit ID ${portIdNum} nicht gefunden.` });
            }
            res.status(200).json(toCamelCase(port));
        } catch (error) {
            console.error(`Fehler im NetworkPortController (getPortById ${req.params.id}):`, error);
            next(error);
        }
    },

    async createPort(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: 'Validierungsfehler', errors: errors.array() });
        }

        const { port_number } = req.body;
        if (port_number === undefined || port_number === null || isNaN(parseInt(port_number, 10)) || parseInt(port_number, 10) <= 0) {
            return res.status(400).json({ success: false, message: 'Ungültige oder fehlende Portnummer.' });
        }

        try {
            const portNum = parseInt(port_number, 10);
            const existingPort = await NetworkPortModel.findByPortNumber(portNum);
            if (existingPort) {
                return res.status(409).json({ success: false, message: 'Diese Portnummer existiert bereits.' });
            }

            const newPortData = { port_number: portNum };
            const port = await NetworkPortModel.create(newPortData);
            res.status(201).json({
                success: true,
                data: toCamelCase(port),
                message: `Port ${port.port_number} erfolgreich erstellt.`
            });
        } catch (error) {
            console.error('Fehler beim Erstellen des Netzwerk-Ports:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Serverfehler beim Erstellen des Netzwerk-Ports'
            });
        }
    },

    async updatePort(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: 'Validierungsfehler', errors: errors.array() });
        }

        const { id } = req.params;
        const { port_number } = req.body;
        const portId = parseInt(id, 10);
        if (isNaN(portId) || portId <= 0) {
            return res.status(400).json({ success: false, message: 'Ungültige Netzwerk-Port-ID.' });
        }

        const updateData = {};
        let parsedPortNumber = NaN;
        if (port_number !== undefined) {
            parsedPortNumber = parseInt(port_number, 10);
            if (isNaN(parsedPortNumber) || parsedPortNumber <= 0) {
                return res.status(400).json({ success: false, message: 'Ungültige Portnummer.' });
            }

            const existingPortById = await NetworkPortModel.findById(portId);
            if (!existingPortById) {
                 return res.status(404).json({ success: false, message: 'Netzwerk-Port nicht gefunden.'});
            }
            if (existingPortById.port_number !== parsedPortNumber) {
                const existingPortByNumber = await NetworkPortModel.findByPortNumber(parsedPortNumber);
                if (existingPortByNumber && existingPortByNumber.id !== portId) {
                    return res.status(409).json({ success: false, message: 'Diese Portnummer existiert bereits.' });
                }
            }
            updateData.port_number = parsedPortNumber;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: 'Keine Daten zum Aktualisieren angegeben.' });
        }

        try {
            const updatedPort = await NetworkPortModel.update(portId, updateData);
            if (!updatedPort) {
                return res.status(404).json({ success: false, message: 'Netzwerk-Port nicht gefunden.' });
            }
            res.status(200).json({
                success: true,
                data: toCamelCase(updatedPort),
                message: `Port ${updatedPort.port_number} erfolgreich aktualisiert.`
            });
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Netzwerk-Ports:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Serverfehler beim Aktualisieren des Netzwerk-Ports'
            });
        }
    },

    async deletePort(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const portId = parseInt(id, 10);

        if (isNaN(portId) || portId <= 0) {
            return res.status(400).json({ message: 'Ungültige Netzwerk-Port-ID.' });
        }

        try {
            const success = await NetworkPortModel.delete(portId);
            if (!success) {
                return res.status(404).json({ message: 'Netzwerk-Port nicht gefunden.' });
            }
            res.status(200).json({ success: true, message: 'Netzwerk-Port erfolgreich gelöscht.' });
        } catch (error) {
            console.error('Fehler beim Löschen des Netzwerk-Ports:', error);
            if (error.code === '23503') { // Foreign Key Violation
                return res.status(409).json({ message: 'Port kann nicht gelöscht werden, da er noch verwendet wird.', code: error.code });
            }
            res.status(500).json({ message: 'Serverfehler beim Löschen des Netzwerk-Ports' });
        }
    },

    // Diese Funktion scheint nicht über Routen aufgerufen zu werden und erwartet CamelCase - erstmal ignorieren oder anpassen?
    // async checkPortNumberExists(req, res) { ... }

}; // Sicherstellen, dass das Objekt hier korrekt geschlossen wird

module.exports = NetworkPortController;
