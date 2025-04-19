const labelSettingsModel = require('../models/labelSettingsModel');
const { handleDatabaseError, handleNotFoundError, handleValidationError } = require('../utils/errorHandler');

class LabelSettingsController {

    // Benutzerspezifische Label-Einstellungen abrufen
    async getUserLabelSettings(req, res) {
        const userId = req.user.id; // Annahme: Benutzer-ID ist im req.user Objekt nach Authentifizierung
        try {
            const settings = await labelSettingsModel.getLabelSettings(userId);
            if (settings) {
                res.json(settings);
            } else {
                // Wenn keine benutzerspezifischen Einstellungen, versuche globale
                const globalSettings = await labelSettingsModel.getLabelSettings(null);
                if (globalSettings) {
                    res.json(globalSettings);
                } else {
                    handleNotFoundError(res, 'Keine Label-Einstellungen gefunden.');
                }
            }
        } catch (error) {
            handleDatabaseError(res, error);
        }
    }

    // Globale Label-Einstellungen abrufen (nur für Admins)
    async getGlobalLabelSettings(req, res) {
        // Hier sollte eine Berechtigungsprüfung erfolgen, ob der Benutzer Admin ist
        // Beispiel: if (!req.user.isAdmin) { return res.status(403).json({ message: 'Zugriff verweigert' }); }
        try {
            const settings = await labelSettingsModel.getLabelSettings(null);
            if (settings) {
                res.json(settings);
            } else {
                handleNotFoundError(res, 'Keine globalen Label-Einstellungen gefunden.');
            }
        } catch (error) {
            handleDatabaseError(res, error);
        }
    }

    // Benutzerspezifische Label-Einstellungen speichern/aktualisieren
    async saveUserLabelSettings(req, res) {
        const userId = req.user.id;
        const settingsData = req.body; // Erwarte das Einstellungs-JSON im Body

        // Einfache Validierung: Prüfen, ob settingsData ein Objekt ist
        if (typeof settingsData !== 'object' || settingsData === null) {
            return handleValidationError(res, { message: 'Ungültige Einstellungsdaten. Ein JSON-Objekt wird erwartet.' });
        }

        try {
            const savedSettings = await labelSettingsModel.saveLabelSettings(settingsData, userId);
            res.status(200).json(savedSettings);
        } catch (error) {
            handleDatabaseError(res, error);
        }
    }

    // Globale Label-Einstellungen speichern/aktualisieren (nur für Admins)
    async saveGlobalLabelSettings(req, res) {
        // Berechtigungsprüfung für Admin
        // Beispiel: if (!req.user.isAdmin) { return res.status(403).json({ message: 'Zugriff verweigert' }); }
        const settingsData = req.body;

        if (typeof settingsData !== 'object' || settingsData === null) {
            return handleValidationError(res, { message: 'Ungültige Einstellungsdaten. Ein JSON-Objekt wird erwartet.' });
        }

        try {
            const savedSettings = await labelSettingsModel.saveLabelSettings(settingsData, null); // userId = null für globale Einstellungen
            res.status(200).json(savedSettings);
        } catch (error) {
            handleDatabaseError(res, error);
        }
    }
}

module.exports = new LabelSettingsController();
