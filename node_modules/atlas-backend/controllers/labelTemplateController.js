const { validationResult } = require('express-validator');
const labelTemplateModel = require('../models/labelTemplateModel');
const { handleDatabaseError, handleNotFoundError, handleValidationError, handleConflictError, handleForbiddenError } = require('../utils/errorHandler');

class LabelTemplateController {

    // Alle Label-Templates abrufen (eigene + globale)
    async getAllLabelTemplates(req, res) {
        try {
            const userId = req.user?.id || null; // Optionaler eingeloggter Benutzer
            const templates = await labelTemplateModel.getLabelTemplates(userId);
            res.json(templates);
        } catch (error) {
            handleDatabaseError(res, error, 'Fehler beim Abrufen der Label-Templates.');
        }
    }

    // Ein spezifisches Label-Template abrufen
    async getLabelTemplateById(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return handleValidationError(res, errors);
        }

        try {
            const { id } = req.params;
            const userId = req.user?.id || null;
            const template = await labelTemplateModel.getLabelTemplateById(parseInt(id, 10), userId);
            if (!template) {
                return handleNotFoundError(res, 'Label-Template nicht gefunden oder keine Berechtigung.');
            }
            res.json(template);
        } catch (error) {
            // Spezifische Fehlerbehandlung, falls das Model `NotFoundError` wirft
            if (error.name === 'NotFoundError') {
                 return handleNotFoundError(res, error.message);
            }
            handleDatabaseError(res, error, 'Fehler beim Abrufen des Label-Templates.');
        }
    }

    // Neues Label-Template erstellen
    async createLabelTemplate(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return handleValidationError(res, errors);
        }

        try {
            const userId = req.user.id; // Ersteller ist der eingeloggte Benutzer
            const templateData = req.body; // name, description?, settings?, is_default?
            const newTemplate = await labelTemplateModel.createLabelTemplate(templateData, userId);
            res.status(201).json(newTemplate);
        } catch (error) {
             if (error.message.includes('existiert bereits')) {
                return handleConflictError(res, error.message);
             }
            handleDatabaseError(res, error, 'Fehler beim Erstellen des Label-Templates.');
        }
    }

    // Label-Template aktualisieren
    async updateLabelTemplate(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return handleValidationError(res, errors);
        }

        try {
            const { id } = req.params;
            const userId = req.user.id; // Nur der Besitzer darf bearbeiten (Annahme, globale Templates evtl. Admins)
            const templateData = req.body; // name?, description?, settings?, is_default?

            // Hier könnte eine zusätzliche Berechtigungsprüfung für globale Templates erfolgen

            const updatedTemplate = await labelTemplateModel.updateLabelTemplate(parseInt(id, 10), templateData, userId);
            res.json(updatedTemplate);
        } catch (error) {
             if (error.message.includes('nicht gefunden') || error.message.includes('keine Berechtigung')) {
                 return handleNotFoundError(res, error.message);
             } else if (error.message.includes('existiert bereits')) {
                 return handleConflictError(res, error.message);
             }
            handleDatabaseError(res, error, 'Fehler beim Aktualisieren des Label-Templates.');
        }
    }

    // Label-Template löschen
    async deleteLabelTemplate(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return handleValidationError(res, errors);
        }

        try {
            const { id } = req.params;
            const userId = req.user.id; // Nur der Besitzer darf löschen (Annahme)

             // Hier könnte eine zusätzliche Berechtigungsprüfung für globale Templates erfolgen

            const success = await labelTemplateModel.deleteLabelTemplate(parseInt(id, 10), userId);
            if (!success) {
                // Sollte durch Fehler im Model abgedeckt sein, aber als Fallback
                return handleNotFoundError(res, 'Label-Template nicht gefunden oder konnte nicht gelöscht werden.');
            }
            res.status(204).send(); // No Content
        } catch (error) {
             if (error.message.includes('nicht gefunden') || error.message.includes('keine Berechtigung')) {
                 return handleNotFoundError(res, error.message);
             }
            handleDatabaseError(res, error, 'Fehler beim Löschen des Label-Templates.');
        }
    }

    // Versionen eines Label-Templates abrufen
    async getLabelTemplateVersions(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return handleValidationError(res, errors);
        }

        try {
            const { templateId } = req.params;
            const userId = req.user?.id || null; // Benutzer muss Zugriff auf das Template haben
            const versions = await labelTemplateModel.getLabelTemplateVersions(parseInt(templateId, 10), userId);
            res.json(versions);
        } catch (error) {
            if (error.message.includes('nicht gefunden') || error.message.includes('keine Berechtigung')) {
                 return handleNotFoundError(res, error.message);
             }
            handleDatabaseError(res, error, 'Fehler beim Abrufen der Versionen.');
        }
    }

    // Auf eine Version zurücksetzen
    async revertToLabelTemplateVersion(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return handleValidationError(res, errors);
        }

        try {
            const { templateId, versionId } = req.params;
            const userId = req.user.id; // Nur der Besitzer darf zurücksetzen (Annahme)

             // Hier könnte eine zusätzliche Berechtigungsprüfung für globale Templates erfolgen

            const success = await labelTemplateModel.revertToLabelTemplateVersion(parseInt(templateId, 10), parseInt(versionId, 10), userId);
            if (!success) {
                 // Sollte durch Fehler im Model abgedeckt sein
                 return handleDatabaseError(res, new Error('Fehler beim Zurücksetzen auf Version.'), 'Fehler beim Zurücksetzen.');
            }
            res.status(200).json({ message: 'Erfolgreich auf Version zurückgesetzt.' });
        } catch (error) {
            if (error.message.includes('nicht gefunden') || error.message.includes('keine Berechtigung')) {
                 return handleNotFoundError(res, error.message);
             }
            handleDatabaseError(res, error, 'Fehler beim Zurücksetzen auf Version.');
        }
    }

     // Label-Template importieren (z.B. als global oder für den Benutzer)
     async importLabelTemplate(req, res) {
         const errors = validationResult(req);
         if (!errors.isEmpty()) {
             // Annahme: templateData selbst wird validiert, falls nötig
             return handleValidationError(res, errors);
         }

         try {
             const userId = req.user.id; // Importeur
             const { templateData, makeGlobal } = req.body;

             // Berechtigungsprüfung für globale Vorlagen
             if (makeGlobal) {
                  // Annahme: `req.user.permissions` ist ein Array von Berechtigungsstrings
                  // Die spezifische Berechtigung muss noch definiert werden (z.B. 'CREATE_GLOBAL_LABEL_TEMPLATES')
                  const requiredPermission = 'CREATE_GLOBAL_LABEL_TEMPLATES';
                  if (!req.user.permissions?.includes(requiredPermission)) {
                      return handleForbiddenError(res, `Keine Berechtigung (${requiredPermission}) zum Erstellen globaler Label-Templates.`);
                  }
             }

             // TODO: Validierung von templateData (name, settings etc.) hinzufügen
             if (!templateData || !templateData.name || !templateData.settings) {
                 return handleValidationError(res, { message: 'Unvollständige Templatedaten für den Import.' });
             }

             const newTemplate = await labelTemplateModel.importLabelTemplate(templateData, userId, makeGlobal);
             res.status(201).json(newTemplate);
         } catch (error) {
             if (error.message.includes('existiert bereits')) {
                 return handleConflictError(res, error.message);
             }
             handleDatabaseError(res, error, 'Fehler beim Importieren des Label-Templates.');
         }
     }

     // Migration von alten Einstellungen zu einem Template anstoßen (für den aktuellen Benutzer)
     async migrateLabelSettings(req, res) {
         try {
             const userId = req.user.id;

             // Normalerweise sollte jeder Benutzer seine eigenen Einstellungen migrieren dürfen.

             const migratedTemplate = await labelTemplateModel.migrateLabelSettings(userId);

             if (!migratedTemplate) {
                 // Kein Fehler, aber auch nichts migriert
                 return res.status(200).json({ message: 'Keine Einstellungen zum Migrieren gefunden oder bereits migriert.' });
             }

             res.status(201).json({ message: 'Einstellungen erfolgreich migriert.', template: migratedTemplate });
         } catch (error) {
             handleDatabaseError(res, error, 'Fehler bei der Migration der Label-Einstellungen.');
         }
     }

      // Globalen Migrations-Endpunkt (nur für Admins)
      async migrateGlobalLabelSettings(req, res) {
         try {
             // Berechtigungsprüfung für globale Migration
             const requiredPermission = 'MANAGE_GLOBAL_LABEL_SETTINGS'; // Oder eine ähnlich benannte Berechtigung
             if (!req.user.permissions?.includes(requiredPermission)) {
                 return handleForbiddenError(res, `Keine Berechtigung (${requiredPermission}) zum Migrieren globaler Einstellungen.`);
             }

             const migratedTemplate = await labelTemplateModel.migrateLabelSettings(null); // null für global

             if (!migratedTemplate) {
                 return res.status(200).json({ message: 'Keine globalen Einstellungen zum Migrieren gefunden oder bereits migriert.' });
             }

             res.status(201).json({ message: 'Globale Einstellungen erfolgreich migriert.', template: migratedTemplate });
         } catch (error) {
             handleDatabaseError(res, error, 'Fehler bei der Migration der globalen Label-Einstellungen.');
         }
     }

}

module.exports = new LabelTemplateController();
