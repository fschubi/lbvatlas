const switchModel = require('../models/switchModel'); // Geändert
const { validationResult } = require('express-validator');

class SwitchController {

  // Alle Switches abrufen
  async getAllSwitches(req, res) {
    try {
      const switches = await switchModel.getSwitches();
      res.json({ success: true, data: switches });
    } catch (error) {
      console.error('Fehler beim Abrufen der Switches:', error);
      res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Switches', error: error.message });
    }
  }

  // Switch nach ID abrufen
  async getSwitchById(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const switchId = req.params.id;
      const switchData = await switchModel.getSwitchById(switchId);
      if (!switchData) {
        return res.status(404).json({ success: false, message: 'Switch nicht gefunden' });
      }
      res.json({ success: true, data: switchData });
    } catch (error) {
      console.error('Fehler beim Abrufen des Switches:', error);
      res.status(500).json({ success: false, message: 'Fehler beim Abrufen des Switches', error: error.message });
    }
  }

  // Neuen Switch erstellen
  async createSwitch(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const switchData = req.body;
      const newSwitch = await switchModel.createSwitch(switchData);
      res.status(201).json({ success: true, message: 'Switch erfolgreich erstellt', data: newSwitch });
    } catch (error) {
      console.error('Fehler beim Erstellen des Switches:', error);
       if (error.code === 'DUPLICATE_SWITCH' || (error.message && error.message.includes('existiert bereits'))) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Fehler beim Erstellen des Switches', error: error.message });
    }
  }

  // Switch aktualisieren
  async updateSwitch(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const switchId = req.params.id;
      const switchData = req.body;

       // Leere Felder entfernen, außer isActive=false
      Object.keys(switchData).forEach(key => {
        if (switchData[key] === undefined || switchData[key] === null || switchData[key] === '') {
          if (key !== 'isActive') {
            delete switchData[key];
          }
        }
      });

      if (Object.keys(switchData).length === 0 || (Object.keys(switchData).length === 1 && switchData.hasOwnProperty('id'))) {
        return res.status(400).json({ success: false, message: 'Keine Daten zum Aktualisieren angegeben' });
      }

      const updatedSwitch = await switchModel.updateSwitch(switchId, switchData);
      res.json({ success: true, message: 'Switch erfolgreich aktualisiert', data: updatedSwitch });
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Switches:', error);
       if (error.message === 'Switch nicht gefunden') {
        return res.status(404).json({ success: false, message: error.message });
      } else if (error.code === 'DUPLICATE_SWITCH' || (error.message && error.message.includes('existiert bereits'))) {
         return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren des Switches', error: error.message });
    }
  }

  // Switch löschen
  async deleteSwitch(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const switchId = req.params.id;
      const result = await switchModel.deleteSwitch(switchId);
       res.json(result);
    } catch (error) {
      console.error('Fehler beim Löschen des Switches:', error);
       if (error.message === 'Switch nicht gefunden') {
        return res.status(404).json({ success: false, message: error.message });
      } else if (error.message.includes('verwendet wird')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Fehler beim Löschen des Switches', error: error.message });
    }
  }
}

module.exports = new SwitchController();
