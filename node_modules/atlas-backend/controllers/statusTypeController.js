const statusTypeModel = require('../models/statusTypeModel');
const { validationResult } = require('express-validator');

class StatusTypeController {

    // Alle Statustypen abrufen
    async getAllStatusTypes(req, res) {
        try {
            const statusTypes = await statusTypeModel.getAllStatusTypes();
            res.json({ success: true, data: statusTypes });
        } catch (error) {
            console.error('Fehler beim Abrufen der Statustypen:', error);
            res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Statustypen', error: error.message });
        }
    }

    // Statustyp nach ID abrufen
    async getStatusTypeById(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        try {
            const statusId = req.params.id;
            const statusType = await statusTypeModel.getStatusTypeById(statusId);
            if (!statusType) {
                return res.status(404).json({ success: false, message: 'Statustyp nicht gefunden' });
            }
            res.json({ success: true, data: statusType });
        } catch (error) {
            console.error('Fehler beim Abrufen des Statustyps:', error);
            res.status(500).json({ success: false, message: 'Fehler beim Abrufen des Statustyps', error: error.message });
        }
    }

    // Neuen Statustyp erstellen
    async createStatusType(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        try {
            const statusData = req.body;
            const newStatusType = await statusTypeModel.createStatusType(statusData);
            res.status(201).json({ success: true, message: 'Statustyp erfolgreich erstellt', data: newStatusType });
        } catch (error) {
            console.error('Fehler beim Erstellen des Statustyps:', error);
             if (error.message.includes('existiert bereits')) {
                return res.status(400).json({ success: false, message: error.message });
            }
            res.status(500).json({ success: false, message: 'Fehler beim Erstellen des Statustyps', error: error.message });
        }
    }

    // Statustyp aktualisieren
    async updateStatusType(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        try {
            const statusId = req.params.id;
            const statusData = req.body;

            // Leere Felder entfernen
            Object.keys(statusData).forEach(key => {
                if (statusData[key] === undefined || statusData[key] === null || statusData[key] === '') {
                    delete statusData[key];
                }
            });

             if (Object.keys(statusData).length === 0 || (Object.keys(statusData).length === 1 && statusData.hasOwnProperty('id'))) {
                return res.status(400).json({ success: false, message: 'Keine Daten zum Aktualisieren angegeben' });
            }

            const updatedStatusType = await statusTypeModel.updateStatusType(statusId, statusData);
            res.json({ success: true, message: 'Statustyp erfolgreich aktualisiert', data: updatedStatusType });
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Statustyps:', error);
             if (error.message === 'Statustyp nicht gefunden') {
                return res.status(404).json({ success: false, message: error.message });
            } else if (error.message.includes('existiert bereits')) {
                 return res.status(400).json({ success: false, message: error.message });
            }
            res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren des Statustyps', error: error.message });
        }
    }

    // Statustyp löschen
    async deleteStatusType(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        try {
            const statusId = req.params.id;
            const result = await statusTypeModel.deleteStatusType(statusId);
            res.json(result);
        } catch (error) {
            console.error('Fehler beim Löschen des Statustyps:', error);
            if (error.message === 'Statustyp nicht gefunden') {
                return res.status(404).json({ success: false, message: error.message });
            } else if (error.message.includes('verwendet wird')) {
                 return res.status(400).json({ success: false, message: error.message });
            }
            res.status(500).json({ success: false, message: 'Fehler beim Löschen des Statustyps', error: error.message });
        }
    }
}

module.exports = new StatusTypeController();
