const locationModel = require('../models/locationModel'); // Geändert
const { validationResult } = require('express-validator');

class LocationController {
    // Standorte abfragen
    async getAllLocations(req, res) {
        try {
            const locations = await locationModel.getLocations();

            return res.json({
                success: true,
                data: locations
            });
        } catch (error) {
            console.error('Fehler beim Abrufen der Standorte:', error);
            return res.status(500).json({
                success: false,
                message: 'Fehler beim Abrufen der Standorte',
                error: error.message
            });
        }
    }

    // Standort nach ID abfragen
    async getLocationById(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const locationId = req.params.id;
            const location = await locationModel.getLocationById(locationId);

            if (!location) {
                return res.status(404).json({
                    success: false,
                    message: 'Standort nicht gefunden'
                });
            }

            return res.json({
                success: true,
                data: location
            });
        } catch (error) {
            console.error('Fehler beim Abrufen des Standorts:', error);
            return res.status(500).json({
                success: false,
                message: 'Fehler beim Abrufen des Standorts',
                error: error.message
            });
        }
    }

    // Neuen Standort erstellen
    async createLocation(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const locationData = req.body;
            const newLocation = await locationModel.createLocation(locationData);

            return res.status(201).json({
                success: true,
                message: 'Standort erfolgreich erstellt',
                data: newLocation
            });
        } catch (error) {
            console.error('Fehler beim Erstellen des Standorts:', error);

            if (error.message.includes('existiert bereits')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Fehler beim Erstellen des Standorts',
                error: error.message
            });
        }
    }

    // Standort aktualisieren
    async updateLocation(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const locationId = req.params.id;
            const locationData = req.body;

            // Nur definierte Felder übergeben (außer '', null)
            Object.keys(locationData).forEach(key => {
                if (locationData[key] === undefined || locationData[key] === null || locationData[key] === '') {
                    // Behalte active: false explizit bei
                    if (key !== 'active') {
                        delete locationData[key];
                    }
                }
            });

            if (Object.keys(locationData).length === 0 || (Object.keys(locationData).length === 1 && locationData.hasOwnProperty('id'))) {
                return res.status(400).json({ success: false, message: 'Keine Daten zum Aktualisieren angegeben' });
            }

            const updatedLocation = await locationModel.updateLocation(locationId, locationData);

            return res.json({
                success: true,
                message: 'Standort erfolgreich aktualisiert',
                data: updatedLocation
            });
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Standorts:', error);

            if (error.message === 'Standort nicht gefunden') {
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
                message: 'Fehler beim Aktualisieren des Standorts',
                error: error.message
            });
        }
    }

    // Standort löschen
    async deleteLocation(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const locationId = req.params.id;
            const result = await locationModel.deleteLocation(locationId);

            return res.json(result); // Erfolgsmeldung kommt vom Model
        } catch (error) {
            console.error('Fehler beim Löschen des Standorts:', error);

            if (error.message === 'Standort nicht gefunden') {
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
                message: 'Fehler beim Löschen des Standorts',
                error: error.message
            });
        }
    }
}

module.exports = new LocationController();
