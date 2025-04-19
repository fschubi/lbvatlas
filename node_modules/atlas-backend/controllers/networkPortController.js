const networkPortModel = require('../models/networkPortModel'); // Geändert
const { validationResult } = require('express-validator');

class NetworkPortController {

  // Alle Netzwerk-Ports abrufen
  async getAllNetworkPorts(req, res) {
    try {
      const ports = await networkPortModel.getAllNetworkPorts();
      res.json({ success: true, data: ports });
    } catch (error) {
      console.error('Fehler beim Abrufen der Netzwerk-Ports:', error);
      res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Netzwerk-Ports', error: error.message });
    }
  }

  // Netzwerk-Port nach ID abrufen
  async getNetworkPortById(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const portId = req.params.id;
      const port = await networkPortModel.getNetworkPortById(portId);
      if (!port) {
        return res.status(404).json({ success: false, message: 'Netzwerk-Port nicht gefunden' });
      }
      res.json({ success: true, data: port });
    } catch (error) {
      console.error('Fehler beim Abrufen des Netzwerk-Ports:', error);
      res.status(500).json({ success: false, message: 'Fehler beim Abrufen des Netzwerk-Ports', error: error.message });
    }
  }

  // Neuen Netzwerk-Port erstellen
  async createNetworkPort(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const portData = req.body;
      const newPort = await networkPortModel.createNetworkPort(portData);
      res.status(201).json({ success: true, message: 'Netzwerk-Port erfolgreich erstellt', data: newPort });
    } catch (error) {
      console.error('Fehler beim Erstellen des Netzwerk-Ports:', error);
      if (error.message.includes('existiert bereits') || error.message.includes('verbunden') || error.message.includes('Ungültige')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Fehler beim Erstellen des Netzwerk-Ports', error: error.message });
    }
  }

  // Netzwerk-Port aktualisieren
  async updateNetworkPort(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const portId = req.params.id;
      const portData = req.body;

      // Leere Felder entfernen
      Object.keys(portData).forEach(key => {
        if (portData[key] === undefined || portData[key] === null || portData[key] === '') {
          delete portData[key];
        }
      });

      if (Object.keys(portData).length === 0 || (Object.keys(portData).length === 1 && portData.hasOwnProperty('id'))) {
        return res.status(400).json({ success: false, message: 'Keine Daten zum Aktualisieren angegeben' });
      }

      const updatedPort = await networkPortModel.updateNetworkPort(portId, portData);
      res.json({ success: true, message: 'Netzwerk-Port erfolgreich aktualisiert', data: updatedPort });
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Netzwerk-Ports:', error);
      if (error.message === 'Netzwerk-Port nicht gefunden') {
        return res.status(404).json({ success: false, message: error.message });
      } else if (error.message.includes('existiert bereits') || error.message.includes('verbunden') || error.message.includes('Ungültige')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren des Netzwerk-Ports', error: error.message });
    }
  }

  // Netzwerk-Port löschen
  async deleteNetworkPort(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const portId = req.params.id;
      const result = await networkPortModel.deleteNetworkPort(portId);
      res.json(result);
    } catch (error) {
      console.error('Fehler beim Löschen des Netzwerk-Ports:', error);
      if (error.message === 'Netzwerk-Port nicht gefunden') {
        return res.status(404).json({ success: false, message: error.message });
      }
      // Keine spezifischen Fehler für Abhängigkeiten erwartet, daher nur 500
      res.status(500).json({ success: false, message: 'Fehler beim Löschen des Netzwerk-Ports', error: error.message });
    }
  }
}

module.exports = new NetworkPortController();
