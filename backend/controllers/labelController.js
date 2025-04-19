const settingsModel = require('../models/settingsModel'); // Annahme: Model bleibt vorerst gleich oder wird später aufgeteilt
const { validationResult } = require('express-validator');

class LabelController {

  // Label-Einstellungen abrufen (benutzerspezifisch oder global)
  async getLabelSettings(req, res) {
    try {
      const userId = req.user ? req.user.id : null; // User ID aus Authentifizierung
      const settings = await settingsModel.getLabelSettings(userId);

      return res.status(200).json({
        success: true,
        data: settings
      });

    } catch (error) {
      console.error('Fehler beim Abrufen der Label-Einstellungen:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Label-Einstellungen',
        error: error.message
      });
    }
  }

  // Label-Einstellungen speichern (nur für authentifizierte Benutzer)
  async saveLabelSettings(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
      }

      const settings = req.body;
      if (!settings || typeof settings !== 'object' || Object.keys(settings).length === 0) {
        return res.status(400).json({ success: false, message: 'Keine gültigen Einstellungen übermittelt' });
      }

      const savedSettings = await settingsModel.saveLabelSettings(userId, settings);

      return res.status(200).json({
        success: true,
        message: 'Label-Einstellungen erfolgreich gespeichert',
        data: { settingsId: savedSettings.id } // Oder was auch immer das Model zurückgibt
      });
    } catch (error) {
      console.error('Fehler beim Speichern der Label-Einstellungen:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Speichern der Label-Einstellungen',
        error: error.message
      });
    }
  }

  // Label-Vorlagen abrufen (benutzerspezifisch oder global)
  async getLabelTemplates(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      const templates = await settingsModel.getLabelTemplates(userId);

      res.status(200).json({
        success: true,
        message: 'Etiketten-Vorlagen erfolgreich abgerufen',
        data: templates
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Etiketten-Vorlagen:', error);
      res.status(500).json({
        success: false,
        message: 'Serverfehler beim Abrufen der Etiketten-Vorlagen',
        error: error.message
      });
    }
  }

  // Etiketten-Vorlage nach ID abrufen
  async getLabelTemplateById(req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

      const userId = req.user ? req.user.id : null;
      const templateId = req.params.id;
      const template = await settingsModel.getLabelTemplateById(templateId, userId);

      if (!template) {
        return res.status(404).json({ success: false, message: 'Etiketten-Vorlage nicht gefunden oder keine Berechtigung' });
      }

      res.status(200).json({ success: true, data: template });

    } catch (error) {
      console.error('Fehler beim Abrufen der Etiketten-Vorlage:', error);
      res.status(500).json({ success: false, message: 'Serverfehler beim Abrufen der Etiketten-Vorlage', error: error.message });
    }
  }

  // Neue Etiketten-Vorlage erstellen
  async createLabelTemplate(req, res) {
    try {
       const errors = validationResult(req);
       if (!errors.isEmpty()) {
         return res.status(400).json({ success: false, message: 'Validierungsfehler', errors: errors.array() });
       }

      const userId = req.user ? req.user.id : null;
      const templateData = req.body;

      // Validierung (Basis) - spezifischere Validierung in Route
      if (!templateData.name || !templateData.settings) {
        return res.status(400).json({ success: false, message: 'Name und Einstellungen sind erforderlich' });
      }

      const newTemplate = await settingsModel.createLabelTemplate(templateData, userId);

      res.status(201).json({ success: true, message: 'Etiketten-Vorlage erfolgreich erstellt', data: newTemplate });

    } catch (error) {
      console.error('Fehler beim Erstellen der Etiketten-Vorlage:', error);
      if (error.message.includes('existiert bereits') || error.code === '23505') {
        return res.status(400).json({ success: false, message: 'Eine Vorlage mit diesem Namen existiert bereits.' });
      }
      res.status(500).json({ success: false, message: 'Serverfehler beim Erstellen der Etiketten-Vorlage', error: error.message });
    }
  }

  // Etiketten-Vorlage aktualisieren
  async updateLabelTemplate(req, res) {
    try {
       const errors = validationResult(req);
       if (!errors.isEmpty()) {
         return res.status(400).json({ success: false, message: 'Validierungsfehler', errors: errors.array() });
       }

      const userId = req.user ? req.user.id : null;
      const templateId = req.params.id;
      const templateData = req.body;

      // Nur definierte Felder übergeben
       Object.keys(templateData).forEach(key => (templateData[key] === undefined || templateData[key] === null) && delete templateData[key]);

       if (Object.keys(templateData).length === 0 && !req.body.settings) { // Prüfen ob überhaupt Daten da sind (settings könnte {} sein)
           return res.status(400).json({ success: false, message: 'Keine Daten zum Aktualisieren angegeben' });
       }
       // Falls settings übergeben wird, sicherstellen dass es ein Objekt ist
       if (req.body.settings && typeof req.body.settings !== 'object') {
           return res.status(400).json({ success: false, message: 'Ungültiges Format für Einstellungen' });
       }

      const updatedTemplate = await settingsModel.updateLabelTemplate(templateId, templateData, userId);

      res.status(200).json({ success: true, message: 'Etiketten-Vorlage erfolgreich aktualisiert', data: updatedTemplate });

    } catch (error) {
      console.error('Fehler beim Aktualisieren der Etiketten-Vorlage:', error);
      if (error.message.includes('nicht gefunden') || error.message.includes('keine Berechtigung')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message.includes('existiert bereits') || error.code === '23505') {
        return res.status(400).json({ success: false, message: 'Eine andere Vorlage mit diesem Namen existiert bereits.' });
      }
      res.status(500).json({ success: false, message: 'Serverfehler beim Aktualisieren der Etiketten-Vorlage', error: error.message });
    }
  }

  // Etiketten-Vorlage löschen
  async deleteLabelTemplate(req, res) {
    try {
       const errors = validationResult(req);
       if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
       }

      const userId = req.user ? req.user.id : null;
      const templateId = req.params.id;

      const deletedTemplate = await settingsModel.deleteLabelTemplate(templateId, userId);

      res.status(200).json({ success: true, message: 'Etiketten-Vorlage erfolgreich gelöscht', data: deletedTemplate });

    } catch (error) {
      console.error('Fehler beim Löschen der Etiketten-Vorlage:', error);
      if (error.message.includes('nicht gefunden') || error.message.includes('keine Berechtigung')) {
        return res.status(404).json({ success: false, message: error.message });
      }
       if (error.code === '23503') { // Foreign Key Violation
         return res.status(400).json({
           success: false,
           message: 'Vorlage kann nicht gelöscht werden, da sie möglicherweise noch verwendet wird.'
         });
       }
      res.status(500).json({ success: false, message: 'Serverfehler beim Löschen der Etiketten-Vorlage', error: error.message });
    }
  }

  // Versionsverlauf einer Etiketten-Vorlage abrufen
  async getLabelTemplateVersions(req, res) {
    try {
       const errors = validationResult(req);
       if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
       }
      const userId = req.user ? req.user.id : null;
      const templateId = req.params.id;

      const versions = await settingsModel.getLabelTemplateVersions(templateId, userId);

      res.status(200).json({ success: true, message: 'Versionsverlauf erfolgreich abgerufen', data: versions });

    } catch (error) {
      console.error('Fehler beim Abrufen des Versionsverlaufs:', error);
      if (error.message.includes('nicht gefunden') || error.message.includes('keine Berechtigung')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Serverfehler beim Abrufen des Versionsverlaufs', error: error.message });
    }
  }

  // Zu einer früheren Version zurückkehren
  async revertToLabelTemplateVersion(req, res) {
    try {
       const errors = validationResult(req);
       if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
       }
      const userId = req.user ? req.user.id : null;
      const templateId = req.params.id;
      const versionId = req.params.versionId;

      const updatedTemplate = await settingsModel.revertToLabelTemplateVersion(templateId, versionId, userId);

      res.status(200).json({ success: true, message: 'Erfolgreich zur ausgewählten Version zurückgekehrt', data: updatedTemplate });

    } catch (error) {
      console.error('Fehler beim Zurückkehren zur Version:', error);
      if (error.message.includes('nicht gefunden') || error.message.includes('keine Berechtigung')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Serverfehler beim Zurückkehren zur Version', error: error.message });
    }
  }

  // Etiketten-Vorlage importieren
  async importLabelTemplate(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      const templateData = req.body;

      if (!templateData || typeof templateData !== 'object' || !templateData.name || !templateData.settings || typeof templateData.settings !== 'object') {
        return res.status(400).json({ success: false, message: 'Ungültige Vorlagendaten für den Import' });
      }

      const importedTemplate = await settingsModel.importLabelTemplate(templateData, userId);

      res.status(201).json({ success: true, message: 'Etiketten-Vorlage erfolgreich importiert', data: importedTemplate });

    } catch (error) {
      console.error('Fehler beim Importieren der Etiketten-Vorlage:', error);
       if (error.code === '23505') {
           return res.status(400).json({
             success: false,
             message: 'Eine Vorlage mit diesem Namen existiert bereits.'
           });
       }
      res.status(500).json({ success: false, message: 'Serverfehler beim Importieren der Etiketten-Vorlage', error: error.message });
    }
  }

  // Automatische Migration der alten Einstellungen zu einer Vorlage
  async migrateLabelSettings(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      if (!userId) {
          return res.status(401).json({ success: false, message: 'Nicht authentifiziert für Migration' });
      }

      const migratedTemplate = await settingsModel.migrateLabelSettings(userId);

      if (!migratedTemplate) {
        return res.status(404).json({ success: false, message: 'Keine Einstellungen zum Migrieren gefunden oder Migration bereits erfolgt' });
      }

      res.status(200).json({ success: true, message: 'Einstellungen erfolgreich zu Vorlage migriert', data: migratedTemplate });

    } catch (error) {
      console.error('Fehler bei der Migration der Einstellungen:', error);
      res.status(500).json({ success: false, message: 'Serverfehler bei der Migration der Einstellungen', error: error.message });
    }
  }
}

module.exports = new LabelController();
