const SwitchModel = require('../models/switchModel');
const { toCamelCase, toSnakeCase } = require('../utils/caseConverter');

const SwitchController = {
  /**
   * Holt alle Switches und gibt sie als JSON zurück.
   */
  async getAllSwitches(req, res, next) {
    try {
      const switches = await SwitchModel.getAll();
      res.status(200).json(switches.map(toCamelCase));
    } catch (error) {
      console.error('Fehler beim Abrufen aller Switches:', error);
      next(error);
    }
  },

  /**
   * Holt einen einzelnen Switch anhand der ID.
   */
  async getSwitchById(req, res, next) {
    try {
      const { id } = req.params;
      const switchData = await SwitchModel.getById(id);
      if (!switchData) {
        return res.status(404).json({ message: `Switch mit ID ${id} nicht gefunden.` });
      }
      res.status(200).json(toCamelCase(switchData));
    } catch (error) {
      console.error(`Fehler beim Abrufen des Switches mit ID ${req.params.id}:`, error);
      next(error);
    }
  },

  /**
   * Erstellt einen neuen Switch.
   */
  async createSwitch(req, res, next) {
    try {
      const { name } = req.body;
      // Validierung: Name darf nicht leer sein
      if (!name || name.trim() === '') {
          return res.status(400).json({ message: 'Der Switch-Name darf nicht leer sein.' });
      }
      // Validierung: Existiert der Name bereits?
      const existingSwitch = await SwitchModel.findByName(name.trim());
      if (existingSwitch) {
          return res.status(409).json({ message: `Ein Switch mit dem Namen "${name}" existiert bereits.` });
      }

      const newSwitchData = req.body;
      const newSwitch = await SwitchModel.create(newSwitchData);
      res.status(201).json(toCamelCase(newSwitch));
    } catch (error) {
      console.error('Fehler beim Erstellen des Switches:', error);
      next(error);
    }
  },

  /**
   * Aktualisiert einen vorhandenen Switch.
   */
  async updateSwitch(req, res, next) {
    try {
      const { id } = req.params;
      const switchData = req.body;
      const { name } = switchData;

      // Validierung: Name darf nicht leer sein, wenn angegeben
      if (name !== undefined && (!name || name.trim() === '')) {
         return res.status(400).json({ message: 'Der Switch-Name darf nicht leer sein.' });
      }

      // Validierung: Existiert der Name bereits (außer für den aktuellen Switch)?
      if (name) {
          const existingSwitch = await SwitchModel.findByName(name.trim());
          if (existingSwitch && existingSwitch.id !== parseInt(id, 10)) {
              return res.status(409).json({ message: `Ein anderer Switch mit dem Namen "${name}" existiert bereits.` });
          }
      }

      const updatedSwitch = await SwitchModel.update(id, switchData);
      if (!updatedSwitch) {
        return res.status(404).json({ message: `Switch mit ID ${id} nicht gefunden.` });
      }
      res.status(200).json(toCamelCase(updatedSwitch));
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Switches mit ID ${req.params.id}:`, error);
      next(error);
    }
  },

  /**
   * Löscht einen Switch.
   */
  async deleteSwitch(req, res, next) {
    try {
      const { id } = req.params;
      // WICHTIG: Hier sollte idealerweise geprüft werden, ob der Switch noch Abhängigkeiten hat (z.B. Ports, Geräte)!
      // const dependencies = await checkSwitchDependencies(id); // Beispielhafte Funktion
      // if (dependencies.hasDependencies) {
      //    return res.status(409).json({ message: `Switch kann nicht gelöscht werden, da noch Abhängigkeiten bestehen: ${dependencies.details}` });
      // }

      const deleted = await SwitchModel.delete(id);
      if (!deleted) {
        // Sollte eigentlich nicht passieren, wenn Abhängigkeitsprüfung oben ist
        return res.status(404).json({ message: `Switch mit ID ${id} nicht gefunden oder konnte nicht gelöscht werden.` });
      }
      res.status(200).json({ message: `Switch mit ID ${id} erfolgreich gelöscht.` });
    } catch (error) {
      console.error(`Fehler beim Löschen des Switches mit ID ${req.params.id}:`, error);
      next(error);
    }
  },

    /**
     * Holt die Anzahl der Switches.
     */
    async getSwitchCount(req, res, next) {
        const { status } = req.query; // Optionaler Filter (?status=active oder ?status=inactive)
        try {
            const count = await SwitchModel.getCount(status);
            console.debug(`[DEBUG] SwitchController (getSwitchCount): Anzahl Switches ${status ? `(${status})` : ''} abgerufen: ${count}.`);
            res.status(200).json({ data: { count } });
        } catch (error) {
            console.error('Fehler im SwitchController (getSwitchCount):', error);
            next(error);
        }
    }
};

module.exports = SwitchController;
