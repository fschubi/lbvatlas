const systemSettingsModel = require('../models/systemSettingsModel');
const { handleDatabaseError, handleNotFoundError, handleValidationError, handleForbiddenError } = require('../utils/errorHandler');

// Definiere die erforderliche Berechtigung für den Zugriff auf Systemeinstellungen
const REQUIRED_PERMISSION = 'MANAGE_SYSTEM_SETTINGS';

class SystemSettingsController {

    // Middleware zur Berechtigungsprüfung
    _checkPermission(req, res, next) {
        if (!req.user || !req.user.permissions?.includes(REQUIRED_PERMISSION)) {
            return handleForbiddenError(res, `Keine Berechtigung (${REQUIRED_PERMISSION}) zum Verwalten der Systemeinstellungen.`);
        }
        next();
    }

    // Systemeinstellungen abrufen
    async getSystemSettings(req, res) {
        try {
            const settings = await systemSettingsModel.getSystemSettings();
            if (settings === null) {
                // Es ist kein Fehler, wenn initial keine Einstellungen vorhanden sind.
                // Sende ein leeres Objekt oder eine spezifische Nachricht.
                return res.json({});
            }
            res.json(settings);
        } catch (error) {
            handleDatabaseError(res, error, 'Fehler beim Abrufen der Systemeinstellungen.');
        }
    }

    // Systemeinstellungen speichern/aktualisieren
    async saveSystemSettings(req, res) {
        const settingsData = req.body;

        // Grundlegende Validierung: Ist es ein Objekt?
        if (typeof settingsData !== 'object' || settingsData === null) {
            return handleValidationError(res, { message: 'Ungültige Systemeinstellungen. Ein JSON-Objekt wird erwartet.' });
        }

        // Zusätzliche Validierung der Struktur oder bestimmter Felder könnte hier erfolgen.

        try {
            const savedSettings = await systemSettingsModel.saveSystemSettings(settingsData);
            res.status(200).json(savedSettings);
        } catch (error) {
            // Fehler vom Model abfangen (z.B. ungültige Daten)
            if (error.message.includes('Ungültige Systemeinstellungen')) {
                 return handleValidationError(res, { message: error.message });
            }
            handleDatabaseError(res, error, 'Fehler beim Speichern der Systemeinstellungen.');
        }
    }

    // Exportiere die Methoden und die Middleware für die Routen
    get controllerMethods() {
        return {
            getSystemSettings: this.getSystemSettings.bind(this),
            saveSystemSettings: this.saveSystemSettings.bind(this),
        };
    }

    get permissionMiddleware() {
        return this._checkPermission.bind(this);
    }
}

module.exports = new SystemSettingsController();
