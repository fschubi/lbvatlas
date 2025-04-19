const roomModel = require('../models/roomModel'); // Geändert
const { validationResult } = require('express-validator');

class RoomController {
    // Alle Räume abfragen
    async getAllRooms(req, res) {
        try {
            const rooms = await roomModel.getRooms();
            return res.json({ success: true, data: rooms });
        } catch (error) {
            console.error('Fehler beim Abrufen der Räume:', error);
            return res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Räume', error: error.message });
        }
    }

    // Raum nach ID abfragen
    async getRoomById(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const roomId = req.params.id;
            const room = await roomModel.getRoomById(roomId);
            if (!room) {
                return res.status(404).json({ success: false, message: 'Raum nicht gefunden' });
            }
            return res.json({ success: true, data: room });
        } catch (error) {
            console.error('Fehler beim Abrufen des Raums:', error);
            return res.status(500).json({ success: false, message: 'Fehler beim Abrufen des Raums', error: error.message });
        }
    }

    // Neuen Raum erstellen
    async createRoom(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const roomData = req.body;
            const newRoom = await roomModel.createRoom(roomData);
            return res.status(201).json({ success: true, message: 'Raum erfolgreich erstellt', data: newRoom });
        } catch (error) {
            console.error('Fehler beim Erstellen des Raums:', error);
            if (error.message.includes('existiert bereits')) {
                return res.status(400).json({ success: false, message: error.message });
            }
            return res.status(500).json({ success: false, message: 'Fehler beim Erstellen des Raums', error: error.message });
        }
    }

    // Raum aktualisieren
    async updateRoom(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const roomId = req.params.id;
            const roomData = req.body;

            // Nur definierte Felder übergeben
            Object.keys(roomData).forEach(key => (roomData[key] === undefined) && delete roomData[key]);

            // location_id = null explizit erlauben, wenn vorhanden
            if (roomData.location_id === undefined) {
                delete roomData.location_id;
            }

            // Entferne leere Felder, behalte aber `active: false`
            Object.keys(roomData).forEach(key => {
                if (roomData[key] === null || roomData[key] === '') {
                    if (key !== 'active') {
                        delete roomData[key];
                    }
                }
            });

            // Mindestens ein Feld muss zum Aktualisieren vorhanden sein (außer ID)
            const fieldsToUpdate = Object.keys(roomData);
            if (fieldsToUpdate.length === 0 || (fieldsToUpdate.length === 1 && fieldsToUpdate[0] === 'id')) {
                return res.status(400).json({ success: false, message: 'Keine Daten zum Aktualisieren angegeben' });
            }

            const updatedRoom = await roomModel.updateRoom(roomId, roomData);
            return res.json({ success: true, message: 'Raum erfolgreich aktualisiert', data: updatedRoom });
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Raums:', error);
            if (error.message === 'Raum nicht gefunden') {
                return res.status(404).json({ success: false, message: error.message });
            } else if (error.message.includes('existiert bereits')) {
                return res.status(400).json({ success: false, message: error.message });
            }
            return res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren des Raums', error: error.message });
        }
    }

    // Raum löschen
    async deleteRoom(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const roomId = req.params.id;
            const result = await roomModel.deleteRoom(roomId);
            return res.json(result); // Erfolgsmeldung kommt vom Model
        } catch (error) {
            console.error('Fehler beim Löschen des Raums:', error);
            if (error.message === 'Raum nicht gefunden') {
                return res.status(404).json({ success: false, message: error.message });
            } else if (error.message.includes('verwendet wird')) {
                return res.status(400).json({ success: false, message: error.message });
            }
            return res.status(500).json({ success: false, message: 'Fehler beim Löschen des Raums', error: error.message });
        }
    }
}

module.exports = new RoomController();
