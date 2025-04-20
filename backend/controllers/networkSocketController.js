const networkSocketModel = require('../models/networkSocketModel'); // Geändert
const { validationResult } = require('express-validator');

class NetworkSocketController {

    // Alle Netzwerkdosen abrufen
    async getAllNetworkSockets(req, res) {
        try {
            const sockets = await networkSocketModel.getNetworkSockets();
            res.json({ success: true, data: sockets });
        } catch (error) {
            console.error('Fehler beim Abrufen der Netzwerkdosen:', error);
            res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Netzwerkdosen', error: error.message });
        }
    }

    // Netzwerkdose nach ID abrufen
    async getNetworkSocketById(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        try {
            const socketId = req.params.id;
            const socket = await networkSocketModel.getNetworkSocketById(socketId);
            if (!socket) {
                return res.status(404).json({ success: false, message: 'Netzwerkdose nicht gefunden' });
            }
            res.json({ success: true, data: socket });
        } catch (error) {
            console.error('Fehler beim Abrufen der Netzwerkdose:', error);
            res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Netzwerkdose', error: error.message });
        }
    }

    // Neue Netzwerkdose erstellen
    async createNetworkSocket(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        try {
            const socketData = req.body;
            const newSocket = await networkSocketModel.createNetworkSocket(socketData);
            res.status(201).json({ success: true, message: 'Netzwerkdose erfolgreich erstellt', data: newSocket });
        } catch (error) {
            console.error('Fehler beim Erstellen der Netzwerkdose:', error);
             if (error.message.includes('existiert bereits')) {
                return res.status(400).json({ success: false, message: error.message });
            }
            res.status(500).json({ success: false, message: 'Fehler beim Erstellen der Netzwerkdose', error: error.message });
        }
    }

    // Netzwerkdose aktualisieren
    async updateNetworkSocket(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        try {
            const socketId = req.params.id;
            const socketData = req.body;

            // Leere Felder entfernen, außer isActive=false
            Object.keys(socketData).forEach(key => {
                if (socketData[key] === undefined || socketData[key] === null || socketData[key] === '') {
                    if (key !== 'isActive') {
                        delete socketData[key];
                    }
                }
            });

             if (Object.keys(socketData).length === 0 || (Object.keys(socketData).length === 1 && socketData.hasOwnProperty('id'))) {
                return res.status(400).json({ success: false, message: 'Keine Daten zum Aktualisieren angegeben' });
            }

            const updatedSocket = await networkSocketModel.updateNetworkSocket(socketId, socketData);
            res.json({ success: true, message: 'Netzwerkdose erfolgreich aktualisiert', data: updatedSocket });
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Netzwerkdose:', error);
            if (error.message.includes('nicht gefunden')) {
                return res.status(404).json({ success: false, message: error.message });
            } else if (error.message.includes('existiert bereits')) {
                 return res.status(400).json({ success: false, message: error.message });
            }
            res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren der Netzwerkdose', error: error.message });
        }
    }

    // Netzwerkdose löschen
    async deleteNetworkSocket(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Konsistenter Fehlerfall
            return res.status(400).json({ success: false, message: 'Validierungsfehler', errors: errors.array() });
        }
        try {
            const socketId = req.params.id;
            // Rufe das Model auf. Wenn es nicht wirft, war es erfolgreich.
            await networkSocketModel.deleteNetworkSocket(socketId);

            // Erfolg! Sende 200 OK
            res.status(200).json({ success: true, message: 'Netzwerkdose erfolgreich gelöscht.' });

        } catch (error) {
            console.error('Fehler beim Löschen der Netzwerkdose Controller:', error);
            // Fehler aus dem Model spezifisch behandeln
            if (error.message === 'Diese Netzwerkdose wird von Ports verwendet und kann nicht gelöscht werden') {
                // Specific check from model succeeded
                return res.status(409).json({ success: false, message: error.message });
            } else if (error.message === 'Netzwerkdose kann nicht gelöscht werden, da sie noch verwendet wird.') {
                // Generic foreign key error from model
                return res.status(409).json({ success: false, message: error.message });
            } else if (error.message === 'Netzwerkdose nicht gefunden') {
                // Not found error from model
                return res.status(404).json({ success: false, message: error.message });
            } else if (error.message === 'Netzwerkdose konnte nicht gelöscht werden (nicht gefunden nach Prüfung).') {
                // Should not happen due to pre-check, but handle defensively
                return res.status(404).json({ success: false, message: error.message });
            }
            // Allgemeiner, unerwarteter Serverfehler
            res.status(500).json({ success: false, message: error.message || 'Allgemeiner Fehler beim Löschen der Netzwerkdose' });
        }
    }
}

module.exports = new NetworkSocketController();
