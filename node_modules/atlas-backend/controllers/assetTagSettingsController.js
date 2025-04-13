const AssetTagSettings = require('../models/assetTagSettings');
const { validationResult } = require('express-validator');

/**
 * Controller für Asset Tag-Einstellungen
 */
const assetTagSettingsController = {
  /**
   * Einstellungen abrufen
   * @param {Object} req - Express Request Objekt
   * @param {Object} res - Express Response Objekt
   */
  getSettings: async (req, res) => {
    try {
      const settings = await AssetTagSettings.getSettings();

      if (!settings) {
        return res.status(404).json({
          status: 'error',
          message: 'Keine Asset Tag-Einstellungen gefunden'
        });
      }

      // Umwandlung von snake_case zu camelCase für Frontend
      const response = {
        id: settings.id,
        prefix: settings.prefix,
        currentNumber: settings.current_number,
        digitCount: settings.digit_count,
        isActive: settings.is_active,
        createdAt: settings.created_at,
        updatedAt: settings.updated_at
      };

      res.status(200).json({
        status: 'success',
        data: response
      });
    } catch (error) {
      console.error('Error in getSettings:', error);
      res.status(500).json({
        status: 'error',
        message: 'Serverfehler beim Abrufen der Asset Tag-Einstellungen',
        error: error.message
      });
    }
  },

  /**
   * Einstellungen aktualisieren
   * @param {Object} req - Express Request Objekt
   * @param {Object} res - Express Response Objekt
   */
  updateSettings: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validierungsfehler',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { prefix, digitCount, currentNumber } = req.body;

      const updated = await AssetTagSettings.updateSettings(id, {
        prefix,
        digitCount,
        currentNumber
      });

      if (!updated) {
        return res.status(404).json({
          status: 'error',
          message: 'Asset Tag-Einstellungen nicht gefunden'
        });
      }

      // Umwandlung von snake_case zu camelCase für Frontend
      const response = {
        id: updated.id,
        prefix: updated.prefix,
        currentNumber: updated.current_number,
        digitCount: updated.digit_count,
        isActive: updated.is_active,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at
      };

      res.status(200).json({
        status: 'success',
        message: 'Asset Tag-Einstellungen erfolgreich aktualisiert',
        data: response
      });
    } catch (error) {
      console.error('Error in updateSettings:', error);
      res.status(500).json({
        status: 'error',
        message: 'Serverfehler beim Aktualisieren der Asset Tag-Einstellungen',
        error: error.message
      });
    }
  },

  /**
   * Neue Einstellungen erstellen
   * @param {Object} req - Express Request Objekt
   * @param {Object} res - Express Response Objekt
   */
  createSettings: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validierungsfehler',
          errors: errors.array()
        });
      }

      const { prefix, digitCount, currentNumber } = req.body;

      // Prüfen ob bereits Einstellungen existieren
      const existingSettings = await AssetTagSettings.getSettings();
      if (existingSettings) {
        return res.status(400).json({
          status: 'error',
          message: 'Es existieren bereits Asset Tag-Einstellungen. Bitte verwenden Sie die Update-Funktion.'
        });
      }

      const created = await AssetTagSettings.createSettings({
        prefix,
        digitCount,
        currentNumber
      });

      // Umwandlung von snake_case zu camelCase für Frontend
      const response = {
        id: created.id,
        prefix: created.prefix,
        currentNumber: created.current_number,
        digitCount: created.digit_count,
        isActive: created.is_active,
        createdAt: created.created_at,
        updatedAt: created.updated_at
      };

      res.status(201).json({
        status: 'success',
        message: 'Asset Tag-Einstellungen erfolgreich erstellt',
        data: response
      });
    } catch (error) {
      console.error('Error in createSettings:', error);
      res.status(500).json({
        status: 'error',
        message: 'Serverfehler beim Erstellen der Asset Tag-Einstellungen',
        error: error.message
      });
    }
  },

  /**
   * Nächsten Asset Tag generieren
   * @param {Object} req - Express Request Objekt
   * @param {Object} res - Express Response Objekt
   */
  generateNextAssetTag: async (req, res) => {
    try {
      const nextAssetTag = await AssetTagSettings.generateNextAssetTag();

      res.status(200).json({
        status: 'success',
        data: {
          assetTag: nextAssetTag
        }
      });
    } catch (error) {
      console.error('Error in generateNextAssetTag:', error);
      res.status(500).json({
        status: 'error',
        message: 'Serverfehler beim Generieren des nächsten Asset Tags',
        error: error.message
      });
    }
  }
};

module.exports = assetTagSettingsController;
