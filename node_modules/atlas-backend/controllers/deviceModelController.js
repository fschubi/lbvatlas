const deviceModelModel = require('../models/deviceModelModel'); // Geändert
const { validationResult } = require('express-validator');

class DeviceModelController {

  // Alle Gerätemodelle abrufen
  async getAllDeviceModels(req, res) {
    try {
      const models = await deviceModelModel.getDeviceModels();
      res.json({ success: true, data: models });
    } catch (error) {
      console.error('Fehler beim Abrufen der Gerätemodelle:', error);
      res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Gerätemodelle', error: error.message });
    }
  }

  // Gerätemodell nach ID abrufen
  async getDeviceModelById(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const modelId = req.params.id;
      const model = await deviceModelModel.getDeviceModelById(modelId);
      if (!model) {
        return res.status(404).json({ success: false, message: 'Gerätemodell nicht gefunden' });
      }
      res.json({ success: true, data: model });
    } catch (error) {
      console.error('Fehler beim Abrufen des Gerätemodells:', error);
      res.status(500).json({ success: false, message: 'Fehler beim Abrufen des Gerätemodells', error: error.message });
    }
  }

  // Neues Gerätemodell erstellen
  async createDeviceModel(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const modelData = req.body;
      const newModel = await deviceModelModel.createDeviceModel(modelData);
      res.status(201).json({ success: true, message: 'Gerätemodell erfolgreich erstellt', data: newModel });
    } catch (error) {
      console.error('Fehler beim Erstellen des Gerätemodells:', error);
      if (error.message.includes('existiert bereits') || error.message.includes('Ungültige')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Fehler beim Erstellen des Gerätemodells', error: error.message });
    }
  }

  // Gerätemodell aktualisieren
  async updateDeviceModel(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const modelId = req.params.id;
      const modelData = req.body;

      // Leere Felder entfernen, außer isActive=false
      Object.keys(modelData).forEach(key => {
        if ((modelData[key] === undefined || modelData[key] === null || modelData[key] === '') && key !== 'isActive') {
          delete modelData[key];
        }
        // Stelle sicher, dass IDs als Zahlen oder null übergeben werden
        if ((key === 'manufacturerId' || key === 'categoryId') && modelData[key] === '') {
          modelData[key] = null;
        }
      });

      if (Object.keys(modelData).length === 0 || (Object.keys(modelData).length === 1 && modelData.hasOwnProperty('id'))) {
        return res.status(400).json({ success: false, message: 'Keine Daten zum Aktualisieren angegeben' });
      }

      const updatedModel = await deviceModelModel.updateDeviceModel(modelId, modelData);
      res.json({ success: true, message: 'Gerätemodell erfolgreich aktualisiert', data: updatedModel });
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Gerätemodells:', error);
      if (error.message === 'Gerätemodell nicht gefunden') {
        return res.status(404).json({ success: false, message: error.message });
      } else if (error.message.includes('existiert bereits') || error.message.includes('Ungültige')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren des Gerätemodells', error: error.message });
    }
  }

  // Gerätemodell löschen
  async deleteDeviceModel(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validierungsfehler', errors: errors.array() });
    }
    try {
      const modelId = req.params.id;
      await deviceModelModel.deleteDeviceModel(modelId);
      res.status(200).json({ success: true, message: 'Gerätemodell erfolgreich gelöscht.' });
    } catch (error) {
      console.error('Fehler beim Löschen des Gerätemodells (Controller):', error);
      if (error.message === 'Gerätemodell nicht gefunden') {
        return res.status(404).json({ success: false, message: error.message });
      } else if (error.message.includes('verwendet wird')) {
        return res.status(409).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: error.message || 'Allgemeiner Fehler beim Löschen des Gerätemodells' });
    }
  }

  // Anzahl der Geräte pro Modell abrufen
  async getDeviceCountsByModel(req, res) {
    try {
      const deviceCounts = await deviceModelModel.getDeviceCountsByModel(); // Geändert
      return res.json({
        success: true,
        data: deviceCounts
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Geräteanzahl pro Modell:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Geräteanzahl',
        error: error.message
      });
    }
  }
}

module.exports = new DeviceModelController();
