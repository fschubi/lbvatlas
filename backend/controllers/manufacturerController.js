const manufacturerModel = require('../models/manufacturerModel'); // Geändert
const { validationResult } = require('express-validator');

class ManufacturerController {
    // Hersteller abfragen
    async getAllManufacturers(req, res) {
        try {
            const manufacturers = await manufacturerModel.getManufacturers();
            return res.json({
                success: true,
                data: manufacturers
            });
        } catch (error) {
            console.error('Fehler beim Abrufen der Hersteller:', error);
            return res.status(500).json({
                success: false,
                message: 'Fehler beim Abrufen der Hersteller',
                error: error.message
            });
        }
    }

    // Hersteller nach ID abfragen
    async getManufacturerById(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const manufacturerId = req.params.id;
            const manufacturer = await manufacturerModel.getManufacturerById(manufacturerId);

            if (!manufacturer) {
                return res.status(404).json({
                    success: false,
                    message: 'Hersteller nicht gefunden'
                });
            }

            return res.json({
                success: true,
                data: manufacturer
            });
        } catch (error) {
            console.error('Fehler beim Abrufen des Herstellers:', error);
            return res.status(500).json({
                success: false,
                message: 'Fehler beim Abrufen des Herstellers',
                error: error.message
            });
        }
    }

    // Neuen Hersteller erstellen
    async createManufacturer(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const manufacturerData = req.body; // Enthält jetzt name, description, isActive
            const newManufacturer = await manufacturerModel.createManufacturer(manufacturerData);

            return res.status(201).json({
                success: true,
                message: 'Hersteller erfolgreich erstellt',
                data: newManufacturer
            });
        } catch (error) {
            console.error('Fehler beim Erstellen des Herstellers:', error);
            if (error.message.includes('existiert bereits')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Fehler beim Erstellen des Herstellers',
                error: error.message
            });
        }
    }

    // Hersteller aktualisieren
    async updateManufacturer(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const manufacturerId = req.params.id;
            const manufacturerData = req.body; // Enthält name, description, isActive

            // Nur definierte Felder übergeben (außer '', null)
            Object.keys(manufacturerData).forEach(key => {
                if (manufacturerData[key] === undefined || manufacturerData[key] === null || manufacturerData[key] === '') {
                    // Behalte isActive: false explizit bei
                    if (key !== 'isActive') {
                        delete manufacturerData[key];
                    }
                }
            });

            if (Object.keys(manufacturerData).length === 0 || (Object.keys(manufacturerData).length === 1 && manufacturerData.hasOwnProperty('id'))) {
                return res.status(400).json({ success: false, message: 'Keine Daten zum Aktualisieren angegeben' });
            }

            const updatedManufacturer = await manufacturerModel.updateManufacturer(manufacturerId, manufacturerData);

            return res.json({
                success: true,
                message: 'Hersteller erfolgreich aktualisiert',
                data: updatedManufacturer
            });
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Herstellers:', error);
            if (error.message === 'Hersteller nicht gefunden') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            } else if (error.message.includes('existiert bereits')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Fehler beim Aktualisieren des Herstellers',
                error: error.message
            });
        }
    }

    // Hersteller löschen
    async deleteManufacturer(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const manufacturerId = req.params.id;
            const result = await manufacturerModel.deleteManufacturer(manufacturerId);

            return res.json(result);
        } catch (error) {
            console.error('Fehler beim Löschen des Herstellers:', error);
            if (error.message === 'Hersteller nicht gefunden') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            } else if (error.message.includes('verwendet wird')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Fehler beim Löschen des Herstellers',
                error: error.message
            });
        }
    }
}

module.exports = new ManufacturerController();
