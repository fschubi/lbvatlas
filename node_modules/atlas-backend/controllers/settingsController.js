const settingsModel = require('../models/settingsModel');
const { validationResult } = require('express-validator');

class SettingsController {
  // Kategorien abfragen
  async getAllCategories(req, res) {
    try {
      const categories = await settingsModel.getCategories();

      return res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Fehler beim Abrufen aller Kategorien:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Kategorien',
        error: error.message
      });
    }
  }

  // Kategorie nach ID abfragen
  async getCategoryById(req, res) {
    try {
      const categoryId = req.params.id;
      const category = await settingsModel.getCategoryById(categoryId);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Kategorie nicht gefunden'
        });
      }

      return res.json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Kategorie nach ID:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Kategorie',
        error: error.message
      });
    }
  }

  // Neue Kategorie erstellen
  async createCategory(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const categoryData = {
        name: req.body.name,
        description: req.body.description,
        isActive: req.body.isActive
      };

      const newCategory = await settingsModel.createCategory(categoryData);

      return res.status(201).json({
        success: true,
        message: 'Kategorie erfolgreich erstellt',
        data: newCategory
      });
    } catch (error) {
      console.error('Fehler beim Erstellen der Kategorie:', error);

      // Spezifische Fehlermeldung bei Duplikaten
      if (error.message.includes('existiert bereits')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Erstellen der Kategorie',
        error: error.message
      });
    }
  }

  // Kategorie aktualisieren
  async updateCategory(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const categoryId = req.params.id;
      const categoryData = {
        name: req.body.name,
        description: req.body.description,
        isActive: req.body.isActive
      };

      const updatedCategory = await settingsModel.updateCategory(categoryId, categoryData);

      return res.json({
        success: true,
        message: 'Kategorie erfolgreich aktualisiert',
        data: updatedCategory
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Kategorie:', error);

      // Unterschiedliche Statuscodes je nach Fehlertyp
      if (error.message === 'Kategorie nicht gefunden') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      } else if (error.message.includes('existiert bereits')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Aktualisieren der Kategorie',
        error: error.message
      });
    }
  }

  // Kategorie löschen
  async deleteCategory(req, res) {
    try {
      const categoryId = req.params.id;

      const deletedCategory = await settingsModel.deleteCategory(categoryId);

      return res.json({
        success: true,
        message: 'Kategorie erfolgreich gelöscht',
        data: deletedCategory
      });
    } catch (error) {
      console.error('Fehler beim Löschen der Kategorie:', error);

      // Unterschiedliche Statuscodes je nach Fehlertyp
      if (error.message === 'Kategorie nicht gefunden') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      } else if (error.message.includes('wird von')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Löschen der Kategorie',
        error: error.message
      });
    }
  }

  // Standorte abfragen
  async getAllLocations(req, res) {
    try {
      const locations = await settingsModel.getLocations();

      return res.json({
        success: true,
        data: locations
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Standorte:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Standorte',
        error: error.message
      });
    }
  }

  // Standort nach ID abfragen
  async getLocationById(req, res) {
    try {
      const locationId = req.params.id;
      const location = await settingsModel.getLocationById(locationId);

      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'Standort nicht gefunden'
        });
      }

      return res.json({
        success: true,
        data: location
      });
    } catch (error) {
      console.error('Fehler beim Abrufen des Standorts:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen des Standorts',
        error: error.message
      });
    }
  }

  // Neuen Standort erstellen
  async createLocation(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const locationData = {
        name: req.body.name,
        address: req.body.address,
        postal_code: req.body.postal_code,
        city: req.body.city,
        country: req.body.country,
        description: req.body.description
      };

      const newLocation = await settingsModel.createLocation(locationData);

      return res.status(201).json({
        success: true,
        message: 'Standort erfolgreich erstellt',
        data: newLocation
      });
    } catch (error) {
      console.error('Fehler beim Erstellen des Standorts:', error);

      if (error.message.includes('existiert bereits')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Erstellen des Standorts',
        error: error.message
      });
    }
  }

  // Standort aktualisieren
  async updateLocation(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const locationId = req.params.id;
      const locationData = {
        name: req.body.name,
        address: req.body.address,
        postal_code: req.body.postal_code,
        city: req.body.city,
        country: req.body.country,
        description: req.body.description
      };

      const updatedLocation = await settingsModel.updateLocation(locationId, locationData);

      return res.json({
        success: true,
        message: 'Standort erfolgreich aktualisiert',
        data: updatedLocation
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Standorts:', error);

      if (error.message === 'Standort nicht gefunden') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      } else if (error.message.includes('existiert bereits')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Aktualisieren des Standorts',
        error: error.message
      });
    }
  }

  // Standort löschen
  async deleteLocation(req, res) {
    try {
      const locationId = req.params.id;

      const deletedLocation = await settingsModel.deleteLocation(locationId);

      return res.json({
        success: true,
        message: 'Standort erfolgreich gelöscht',
        data: deletedLocation
      });
    } catch (error) {
      console.error('Fehler beim Löschen des Standorts:', error);

      // Unterschiedliche Statuscodes je nach Fehlertyp
      if (error.message === 'Standort nicht gefunden') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      } else if (error.message.includes('wird von')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Löschen des Standorts',
        error: error.message
      });
    }
  }

  // Abteilungen abfragen
  async getAllDepartments(req, res) {
    try {
      const departments = await settingsModel.getDepartments();

      return res.json({
        success: true,
        data: departments
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Abteilungen:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Abteilungen',
        error: error.message
      });
    }
  }

  // Abteilung nach ID abfragen
  async getDepartmentById(req, res) {
    try {
      const departmentId = req.params.id;
      const department = await settingsModel.getDepartmentById(departmentId);

      if (!department) {
        return res.status(404).json({
          success: false,
          message: 'Abteilung nicht gefunden'
        });
      }

      return res.json({
        success: true,
        data: department
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Abteilung:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Abteilung',
        error: error.message
      });
    }
  }

  // Neue Abteilung erstellen
  async createDepartment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const departmentData = {
        name: req.body.name,
        description: req.body.description,
        isActive: req.body.isActive
      };

      const newDepartment = await settingsModel.createDepartment(departmentData);

      return res.status(201).json({
        success: true,
        message: 'Abteilung erfolgreich erstellt',
        data: newDepartment
      });
    } catch (error) {
      console.error('Fehler beim Erstellen der Abteilung:', error);

      if (error.message.includes('existiert bereits')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Erstellen der Abteilung',
        error: error.message
      });
    }
  }

  // Abteilung aktualisieren
  async updateDepartment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const departmentId = req.params.id;
      const departmentData = {
        name: req.body.name,
        description: req.body.description,
        isActive: req.body.isActive
      };

      const updatedDepartment = await settingsModel.updateDepartment(departmentId, departmentData);

      return res.json({
        success: true,
        message: 'Abteilung erfolgreich aktualisiert',
        data: updatedDepartment
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Abteilung:', error);

      if (error.message === 'Abteilung nicht gefunden') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      } else if (error.message.includes('existiert bereits')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Aktualisieren der Abteilung',
        error: error.message
      });
    }
  }

  // Abteilung löschen
  async deleteDepartment(req, res) {
    try {
      const departmentId = req.params.id;

      const deletedDepartment = await settingsModel.deleteDepartment(departmentId);

      return res.json({
        success: true,
        message: 'Abteilung erfolgreich gelöscht',
        data: deletedDepartment
      });
    } catch (error) {
      console.error('Fehler beim Löschen der Abteilung:', error);

      if (error.message === 'Abteilung nicht gefunden') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      } else if (error.message.includes('wird von')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Löschen der Abteilung',
        error: error.message
      });
    }
  }

  // Räume abfragen
  async getAllRooms(req, res) {
    try {
      const rooms = await settingsModel.getRooms();

      return res.json({
        success: true,
        data: rooms
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Räume:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Räume',
        error: error.message
      });
    }
  }

  // Raum nach ID abfragen
  async getRoomById(req, res) {
    try {
      const roomId = req.params.id;
      const room = await settingsModel.getRoomById(roomId);

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Raum nicht gefunden'
        });
      }

      return res.json({
        success: true,
        data: room
      });
    } catch (error) {
      console.error('Fehler beim Abrufen des Raums:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen des Raums',
        error: error.message
      });
    }
  }

  // Neuen Raum erstellen
  async createRoom(req, res) {
    try {
      // Daten aus Request-Body extrahieren
      const {
        name,
        description,
        location_id,
        building,
        active
      } = req.body;

      // Validierungsfehler überprüfen
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validierungsfehler',
          errors: errors.array()
        });
      }

      // Raum erstellen
      const roomData = {
        name,
        description,
        location_id: location_id || null,
        building: building || null,
        active: active !== undefined ? active : true
      };

      const newRoom = await settingsModel.createRoom(roomData);

      return res.status(201).json({
        success: true,
        message: 'Raum erfolgreich erstellt',
        data: newRoom
      });
    } catch (error) {
      console.error('Fehler beim Erstellen des Raums:', error);

      if (error.message.includes('existiert bereits')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Erstellen des Raums',
        error: error.message
      });
    }
  }

  // Raum aktualisieren
  async updateRoom(req, res) {
    try {
      const roomId = req.params.id;

      // Daten aus Request-Body extrahieren
      const {
        name,
        description,
        location_id,
        building,
        active
      } = req.body;

      // Validierungsfehler überprüfen
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validierungsfehler',
          errors: errors.array()
        });
      }

      // Raum aktualisieren
      const roomData = {
        name,
        description,
        location_id: location_id || null,
        building: building || null,
        active
      };

      const updatedRoom = await settingsModel.updateRoom(roomId, roomData);

      return res.json({
        success: true,
        message: 'Raum erfolgreich aktualisiert',
        data: updatedRoom
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Raums:', error);

      if (error.message === 'Raum nicht gefunden') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      } else if (error.message.includes('existiert bereits')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Aktualisieren des Raums',
        error: error.message
      });
    }
  }

  // Raum löschen
  async deleteRoom(req, res) {
    try {
      const roomId = req.params.id;

      const deletedRoom = await settingsModel.deleteRoom(roomId);

      return res.json({
        success: true,
        message: 'Raum erfolgreich gelöscht',
        data: deletedRoom
      });
    } catch (error) {
      console.error('Fehler beim Löschen des Raums:', error);

      if (error.message === 'Raum nicht gefunden') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      } else if (error.message.includes('wird von')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Löschen des Raums',
        error: error.message
      });
    }
  }

  // Systemeinstellungen abrufen
  async getSystemSettings(req, res) {
    try {
      const settings = await settingsModel.getSystemSettings();

      return res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Systemeinstellungen:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Systemeinstellungen',
        error: error.message
      });
    }
  }

  // Systemeinstellungen aktualisieren
  async updateSystemSettings(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const settingsData = req.body;

      // Minimal validieren
      if (typeof settingsData !== 'object' || Object.keys(settingsData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Keine gültigen Einstellungen angegeben'
        });
      }

      const updatedSettings = await settingsModel.updateSystemSettings(settingsData);

      return res.json({
        success: true,
        message: 'Systemeinstellungen erfolgreich aktualisiert',
        data: updatedSettings
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Systemeinstellungen:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Aktualisieren der Systemeinstellungen',
        error: error.message
      });
    }
  }

  // Lieferanten abfragen
  async getAllSuppliers(req, res) {
    try {
      const suppliers = await settingsModel.getSuppliers();

      return res.json({
        success: true,
        data: suppliers
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Lieferanten:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Lieferanten',
        error: error.message
      });
    }
  }

  // Lieferant nach ID abfragen
  async getSupplierById(req, res) {
    try {
      const supplierId = req.params.id;
      const supplier = await settingsModel.getSupplierById(supplierId);

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'Lieferant nicht gefunden'
        });
      }

      return res.json({
        success: true,
        data: supplier
      });
    } catch (error) {
      console.error('Fehler beim Abrufen des Lieferanten:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen des Lieferanten',
        error: error.message
      });
    }
  }

  // Neuen Lieferanten erstellen
  async createSupplier(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const supplierData = {
        name: req.body.name,
        description: req.body.description,
        website: req.body.website,
        address: req.body.address,
        city: req.body.city,
        postal_code: req.body.postal_code,
        contact_person: req.body.contact_person,
        contact_email: req.body.contact_email,
        contact_phone: req.body.contact_phone,
        contract_number: req.body.contract_number,
        notes: req.body.notes,
        is_active: req.body.isActive
      };

      const newSupplier = await settingsModel.createSupplier(supplierData);

      return res.status(201).json({
        success: true,
        message: 'Lieferant erfolgreich erstellt',
        data: newSupplier
      });
    } catch (error) {
      console.error('Fehler beim Erstellen des Lieferanten:', error);

      // Spezifische Fehlermeldung bei Duplikaten
      if (error.message.includes('existiert bereits')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Erstellen des Lieferanten',
        error: error.message
      });
    }
  }

  // Lieferant aktualisieren
  async updateSupplier(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const supplierId = req.params.id;
      const supplierData = {
        name: req.body.name,
        description: req.body.description,
        website: req.body.website,
        address: req.body.address,
        city: req.body.city,
        postal_code: req.body.postal_code,
        contact_person: req.body.contact_person,
        contact_email: req.body.contact_email,
        contact_phone: req.body.contact_phone,
        contract_number: req.body.contract_number,
        notes: req.body.notes,
        is_active: req.body.isActive
      };

      const updatedSupplier = await settingsModel.updateSupplier(supplierId, supplierData);

      return res.json({
        success: true,
        message: 'Lieferant erfolgreich aktualisiert',
        data: updatedSupplier
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Lieferanten:', error);

      // Unterschiedliche Statuscodes je nach Fehlertyp
      if (error.message === 'Lieferant nicht gefunden') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      } else if (error.message.includes('existiert bereits')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Aktualisieren des Lieferanten',
        error: error.message
      });
    }
  }

  // Lieferant löschen
  async deleteSupplier(req, res) {
    try {
      const supplierId = req.params.id;

      const deletedSupplier = await settingsModel.deleteSupplier(supplierId);

      return res.json({
        success: true,
        message: 'Lieferant erfolgreich gelöscht',
        data: deletedSupplier
      });
    } catch (error) {
      console.error('Fehler beim Löschen des Lieferanten:', error);

      // Unterschiedliche Statuscodes je nach Fehlertyp
      if (error.message === 'Lieferant nicht gefunden') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      } else if (error.message.includes('wird von')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Löschen des Lieferanten',
        error: error.message
      });
    }
  }

  // Switches abfragen
  async getAllSwitches(req, res) {
    try {
      const switches = await settingsModel.getSwitches();

      return res.json({
        success: true,
        data: switches
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Switches:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Switches',
        error: error.message
      });
    }
  }

  // Switch nach ID abfragen
  async getSwitchById(req, res) {
    try {
      const switchId = req.params.id;
      const switchData = await settingsModel.getSwitchById(switchId);

      if (!switchData) {
        return res.status(404).json({
          success: false,
          message: 'Switch nicht gefunden'
        });
      }

      return res.json({
        success: true,
        data: switchData
      });
    } catch (error) {
      console.error('Fehler beim Abrufen des Switches:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen des Switches',
        error: error.message
      });
    }
  }

  // Neuen Switch erstellen
  async createSwitch(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const switchData = {
        name: req.body.name,
        description: req.body.description,
        model: req.body.model,
        manufacturer_id: req.body.manufacturer_id,
        ip_address: req.body.ip_address,
        mac_address: req.body.mac_address,
        management_url: req.body.management_url,
        location_id: req.body.location_id,
        room_id: req.body.room_id,
        cabinet_id: req.body.cabinet_id,
        rack_position: req.body.rack_position,
        port_count: req.body.port_count,
        uplink_port: req.body.uplink_port,
        notes: req.body.notes,
        is_active: req.body.isActive
      };

      const newSwitch = await settingsModel.createSwitch(switchData);

      return res.status(201).json({
        success: true,
        message: 'Switch erfolgreich erstellt',
        data: newSwitch
      });
    } catch (error) {
      console.error('Fehler beim Erstellen des Switches:', error);

      // Spezifische Fehlermeldung bei Duplikaten
      if (error.message.includes('existiert bereits')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Erstellen des Switches',
        error: error.message
      });
    }
  }

  // Switch aktualisieren
  async updateSwitch(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const switchId = req.params.id;
      const switchData = {
        name: req.body.name,
        description: req.body.description,
        model: req.body.model,
        manufacturer_id: req.body.manufacturer_id,
        ip_address: req.body.ip_address,
        mac_address: req.body.mac_address,
        management_url: req.body.management_url,
        location_id: req.body.location_id,
        room_id: req.body.room_id,
        cabinet_id: req.body.cabinet_id,
        rack_position: req.body.rack_position,
        port_count: req.body.port_count,
        uplink_port: req.body.uplink_port,
        notes: req.body.notes,
        is_active: req.body.isActive
      };

      const updatedSwitch = await settingsModel.updateSwitch(switchId, switchData);

      return res.json({
        success: true,
        message: 'Switch erfolgreich aktualisiert',
        data: updatedSwitch
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Switches:', error);

      // Unterschiedliche Statuscodes je nach Fehlertyp
      if (error.message === 'Switch nicht gefunden') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      } else if (error.message.includes('existiert bereits')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Aktualisieren des Switches',
        error: error.message
      });
    }
  }

  // Switch löschen
  async deleteSwitch(req, res) {
    try {
      const switchId = req.params.id;

      const deletedSwitch = await settingsModel.deleteSwitch(switchId);

      return res.json({
        success: true,
        message: 'Switch erfolgreich gelöscht',
        data: deletedSwitch
      });
    } catch (error) {
      console.error('Fehler beim Löschen des Switches:', error);

      // Unterschiedliche Statuscodes je nach Fehlertyp
      if (error.message === 'Switch nicht gefunden') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      } else if (error.message.includes('wird von')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Löschen des Switches',
        error: error.message
      });
    }
  }

  // Hersteller abfragen
  async getAllManufacturers(req, res) {
    try {
      const manufacturers = await settingsModel.getManufacturers();

      return res.json({
        success: true,
        data: manufacturers
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Hersteller:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Hersteller',
        error: error.message
      });
    }
  }

  // Hersteller nach ID abfragen
  async getManufacturerById(req, res) {
    try {
      const manufacturerId = req.params.id;
      const manufacturer = await settingsModel.getManufacturerById(manufacturerId);

      if (!manufacturer) {
        return res.status(404).json({
          success: false,
          message: 'Hersteller nicht gefunden'
        });
      }

      return res.json({
        success: true,
        data: manufacturer
      });
    } catch (error) {
      console.error('Fehler beim Abrufen des Herstellers:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen des Herstellers',
        error: error.message
      });
    }
  }

  // Neuen Hersteller erstellen
  async createManufacturer(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const manufacturerData = {
        name: req.body.name,
        description: req.body.description,
        logo_url: req.body.logo_url,
        website: req.body.website,
        contact_info: req.body.contact_info,
        is_active: req.body.isActive
      };

      const newManufacturer = await settingsModel.createManufacturer(manufacturerData);

      return res.status(201).json({
        success: true,
        message: 'Hersteller erfolgreich erstellt',
        data: newManufacturer
      });
    } catch (error) {
      console.error('Fehler beim Erstellen des Herstellers:', error);

      // Spezifische Fehlermeldung bei Duplikaten
      if (error.message.includes('existiert bereits')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Erstellen des Herstellers',
        error: error.message
      });
    }
  }

  // Hersteller aktualisieren
  async updateManufacturer(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const manufacturerId = req.params.id;
      const manufacturerData = {
        name: req.body.name,
        description: req.body.description,
        logo_url: req.body.logo_url,
        website: req.body.website,
        contact_info: req.body.contact_info,
        is_active: req.body.isActive
      };

      const updatedManufacturer = await settingsModel.updateManufacturer(manufacturerId, manufacturerData);

      return res.json({
        success: true,
        message: 'Hersteller erfolgreich aktualisiert',
        data: updatedManufacturer
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Herstellers:', error);

      // Unterschiedliche Statuscodes je nach Fehlertyp
      if (error.message === 'Hersteller nicht gefunden') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      } else if (error.message.includes('existiert bereits')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Aktualisieren des Herstellers',
        error: error.message
      });
    }
  }

  // Hersteller löschen
  async deleteManufacturer(req, res) {
    try {
      const manufacturerId = req.params.id;

      const deletedManufacturer = await settingsModel.deleteManufacturer(manufacturerId);

      return res.json({
        success: true,
        message: 'Hersteller erfolgreich gelöscht',
        data: deletedManufacturer
      });
    } catch (error) {
      console.error('Fehler beim Löschen des Herstellers:', error);

      // Unterschiedliche Statuscodes je nach Fehlertyp
      if (error.message === 'Hersteller nicht gefunden') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      } else if (error.message.includes('wird von')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Löschen des Herstellers',
        error: error.message
      });
    }
  }

  // Netzwerkdosen abfragen
  async getAllNetworkSockets(req, res) {
    try {
      const sockets = await settingsModel.getNetworkSockets();
      res.json(sockets);
    } catch (error) {
      console.error('Fehler beim Abrufen aller Netzwerkdosen:', error);
      res.status(500).json({ message: 'Serverfehler beim Abrufen der Netzwerkdosen' });
    }
  }

  // Netzwerkdose nach ID abfragen
  async getNetworkSocketById(req, res) {
    const id = parseInt(req.params.id, 10);
    try {
      const result = await settingsModel.getNetworkSocketById(id);
      if (!result) {
        return res.status(404).json({ message: 'Netzwerkdose nicht gefunden' });
      }
      res.status(200).json(result);
    } catch (error) {
      console.error('Fehler beim Abrufen der Netzwerkdose:', error);
      res.status(500).json({ message: 'Fehler beim Abrufen der Netzwerkdose' });
    }
  }

  // Neue Netzwerkdose erstellen
  async createNetworkSocket(req, res) {
    const socketData = req.body;

    if (!socketData.outlet_number) {
      return res.status(400).json({ message: 'Dosennummer ist ein Pflichtfeld' });
    }

    try {
      const result = await settingsModel.createNetworkSocket(socketData);
      res.status(201).json(result);
    } catch (error) {
      console.error('Fehler beim Erstellen der Netzwerkdose:', error);
      res.status(500).json({ message: 'Fehler beim Erstellen der Netzwerkdose' });
    }
  }

  // Netzwerkdose aktualisieren
  async updateNetworkSocket(req, res) {
    const id = parseInt(req.params.id, 10);
    const socketData = req.body;

    if (!socketData.outlet_number) {
      return res.status(400).json({ message: 'Dosennummer ist ein Pflichtfeld' });
    }

    try {
      const updated = await settingsModel.updateNetworkSocket(id, socketData);
      if (!updated) {
        return res.status(404).json({ message: 'Netzwerkdose nicht gefunden' });
      }
      res.status(200).json({ message: 'Netzwerkdose aktualisiert', data: updated });
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Netzwerkdose:', error);
      res.status(500).json({ message: 'Fehler beim Aktualisieren der Netzwerkdose' });
    }
  }

  // Netzwerkdose löschen
  async deleteNetworkSocket(req, res) {
    const socketId = req.params.id;

    if (!socketId) {
      return res.status(400).json({ message: 'ID der Netzwerkdose fehlt' });
    }

    try {
      const { rowCount } = await settingsModel.deleteNetworkSocket(socketId);
      if (rowCount === 0) {
        return res.status(404).json({ message: 'Netzwerkdose nicht gefunden' });
      }

      res.json({ success: true, message: 'Netzwerkdose gelöscht' });
    } catch (error) {
      console.error('Fehler beim Löschen der Netzwerkdose:', error);
      res.status(500).json({ message: 'Interner Serverfehler' });
    }
  }

  // Netzwerk-Switch erstellen
  async createNetworkSwitch(req, res) {
    try {
      const switchData = req.body;
      const result = await settingsModel.createNetworkSwitch(switchData);
      res.status(201).json(result);
    } catch (error) {
      console.error('Fehler beim Erstellen des Netzwerk-Switches:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Alle Netzwerk-Switches abrufen
  async getNetworkSwitches(req, res) {
    try {
      const switches = await settingsModel.getSwitches();
      res.json(switches);
    } catch (error) {
      console.error('Fehler beim Abrufen der Netzwerk-Switches:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Netzwerk-Switch nach ID abrufen
  async getNetworkSwitchById(req, res) {
    try {
      const switchId = req.params.id;
      const switchItem = await settingsModel.getSwitchById(switchId);

      if (!switchItem) {
        return res.status(404).json({ error: 'Netzwerk-Switch nicht gefunden' });
      }

      res.json(switchItem);
    } catch (error) {
      console.error('Fehler beim Abrufen des Netzwerk-Switches:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Netzwerk-Switch aktualisieren
  async updateNetworkSwitch(req, res) {
    try {
      const switchId = req.params.id;
      const switchData = req.body;
      const result = await settingsModel.updateSwitch(switchId, switchData);
      res.json(result);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Netzwerk-Switches:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Netzwerk-Switch löschen
  async deleteNetworkSwitch(req, res) {
    try {
      const switchId = req.params.id;
      const result = await settingsModel.deleteNetworkSwitch(switchId);
      return res.json(result);
    } catch (error) {
      console.error('Fehler beim Löschen des Netzwerk-Switches:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Löschen des Netzwerk-Switches',
        error: error.message
      });
    }
  }

  // Netzwerk-Ports abfragen
  async getAllNetworkPorts(req, res) {
    try {
      const ports = await settingsModel.getAllNetworkPorts();
      return res.json({
        success: true,
        data: ports
      });
    } catch (error) {
      console.error('Fehler beim Abrufen aller Netzwerk-Ports:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Netzwerk-Ports',
        error: error.message
      });
    }
  }

  // Netzwerk-Port nach ID abfragen
  async getNetworkPortById(req, res) {
    try {
      const portId = req.params.id;
      const port = await settingsModel.getNetworkPortById(portId);

      if (!port) {
        return res.status(404).json({
          success: false,
          message: 'Netzwerk-Port nicht gefunden'
        });
      }

      return res.json({
        success: true,
        data: port
      });
    } catch (error) {
      console.error('Fehler beim Abrufen des Netzwerk-Ports nach ID:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen des Netzwerk-Ports',
        error: error.message
      });
    }
  }

  // Netzwerk-Port erstellen
  async createNetworkPort(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validierungsfehler',
          errors: errors.array()
        });
      }

      const portData = req.body;
      const result = await settingsModel.createNetworkPort(portData);

      return res.status(201).json({
        success: true,
        message: 'Netzwerk-Port erfolgreich erstellt',
        data: result
      });
    } catch (error) {
      console.error('Fehler beim Erstellen des Netzwerk-Ports:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Erstellen des Netzwerk-Ports',
        error: error.message
      });
    }
  }

  // Netzwerk-Port aktualisieren
  async updateNetworkPort(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validierungsfehler',
          errors: errors.array()
        });
      }

      const portId = req.params.id;
      const portData = req.body;
      const result = await settingsModel.updateNetworkPort(portId, portData);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Netzwerk-Port nicht gefunden'
        });
      }

      return res.json({
        success: true,
        message: 'Netzwerk-Port erfolgreich aktualisiert',
        data: result
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Netzwerk-Ports:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Aktualisieren des Netzwerk-Ports',
        error: error.message
      });
    }
  }

  // Netzwerk-Port löschen
  async deleteNetworkPort(req, res) {
    try {
      const portId = req.params.id;
      const result = await settingsModel.deleteNetworkPort(portId);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Netzwerk-Port nicht gefunden'
        });
      }

      return res.json({
        success: true,
        message: 'Netzwerk-Port erfolgreich gelöscht'
      });
    } catch (error) {
      console.error('Fehler beim Löschen des Netzwerk-Ports:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Löschen des Netzwerk-Ports',
        error: error.message
      });
    }
  }

  // -------- Gerätemodelle --------

  // Alle Gerätemodelle abrufen
  async getAllDeviceModels(req, res) {
    try {
      const deviceModels = await settingsModel.getDeviceModels();

      return res.json({
        success: true,
        data: deviceModels
      });
    } catch (error) {
      console.error('Fehler beim Abrufen aller Gerätemodelle:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Gerätemodelle',
        error: error.message
      });
    }
  }

  // Gerätemodell nach ID abrufen
  async getDeviceModelById(req, res) {
    try {
      const deviceModelId = req.params.id;
      const deviceModel = await settingsModel.getDeviceModelById(deviceModelId);

      if (!deviceModel) {
        return res.status(404).json({
          success: false,
          message: 'Gerätemodell nicht gefunden'
        });
      }

      return res.json({
        success: true,
        data: deviceModel
      });
    } catch (error) {
      console.error('Fehler beim Abrufen des Gerätemodells nach ID:', error);
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen des Gerätemodells',
        error: error.message
      });
    }
  }

  // Neues Gerätemodell erstellen
  async createDeviceModel(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const modelData = {
        name: req.body.name,
        description: req.body.description,
        manufacturerId: req.body.manufacturerId,
        categoryId: req.body.categoryId,
        specifications: req.body.specifications,
        cpu: req.body.cpu,
        ram: req.body.ram,
        hdd: req.body.hdd,
        warrantyMonths: req.body.warrantyMonths,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true
      };

      const newDeviceModel = await settingsModel.createDeviceModel(modelData);

      return res.status(201).json({
        success: true,
        message: 'Gerätemodell erfolgreich erstellt',
        data: newDeviceModel
      });
    } catch (error) {
      console.error('Fehler beim Erstellen des Gerätemodells:', error);

      // Spezifische Fehlermeldung bei Duplikaten
      if (error.message.includes('existiert bereits')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Erstellen des Gerätemodells',
        error: error.message
      });
    }
  }

  // Gerätemodell aktualisieren
  async updateDeviceModel(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const deviceModelId = req.params.id;
      const modelData = {
        name: req.body.name,
        description: req.body.description,
        manufacturerId: req.body.manufacturerId,
        categoryId: req.body.categoryId,
        specifications: req.body.specifications,
        cpu: req.body.cpu,
        ram: req.body.ram,
        hdd: req.body.hdd,
        warrantyMonths: req.body.warrantyMonths,
        isActive: req.body.isActive
      };

      // Leere Felder entfernen
      Object.keys(modelData).forEach(key => {
        if (modelData[key] === undefined) {
          delete modelData[key];
        }
      });

      const updatedDeviceModel = await settingsModel.updateDeviceModel(deviceModelId, modelData);

      return res.json({
        success: true,
        message: 'Gerätemodell erfolgreich aktualisiert',
        data: updatedDeviceModel
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Gerätemodells:', error);

      // Unterschiedliche Statuscodes je nach Fehlertyp
      if (error.message === 'Gerätemodell nicht gefunden') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      } else if (error.message.includes('existiert bereits')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Aktualisieren des Gerätemodells',
        error: error.message
      });
    }
  }

  // Gerätemodell löschen
  async deleteDeviceModel(req, res) {
    try {
      const deviceModelId = req.params.id;

      const deletedDeviceModel = await settingsModel.deleteDeviceModel(deviceModelId);

      return res.json({
        success: true,
        message: 'Gerätemodell erfolgreich gelöscht',
        data: deletedDeviceModel
      });
    } catch (error) {
      console.error('Fehler beim Löschen des Gerätemodells:', error);

      // Unterschiedliche Statuscodes je nach Fehlertyp
      if (error.message === 'Gerätemodell nicht gefunden') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      } else if (error.message.includes('wird von')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Löschen des Gerätemodells',
        error: error.message
      });
    }
  }

  // Anzahl der Geräte pro Modell abrufen
  async getDeviceCountsByModel(req, res) {
    try {
      const deviceCounts = await settingsModel.getDeviceCountsByModel();

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

  // Statustypen löschen
  async deleteStatusType(req, res) {
    try {
      const statusTypeId = req.params.id;

      const deletedStatusType = await settingsModel.deleteStatusType(statusTypeId);

      return res.json({
        success: true,
        message: 'Statustyp erfolgreich gelöscht',
        data: deletedStatusType
      });
    } catch (error) {
      console.error('Fehler beim Löschen des Statustyps:', error);

      // Unterschiedliche Statuscodes je nach Fehlertyp
      if (error.message === 'Statustyp nicht gefunden') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      } else if (error.message.includes('wird von')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Fehler beim Löschen des Statustyps',
        error: error.message
      });
    }
  }

  // Label-Einstellungen abrufen
  async getLabelSettings(req, res) {
    try {
      const userId = req.user ? req.user.id : null;

      // Aus der Datenbank abfragen
      const db = req.app.get('db');

      // Zuerst benutzerspezifische Einstellungen versuchen zu holen
      const userSettings = await db.query(
        `SELECT settings FROM label_settings
         WHERE user_id = $1
         LIMIT 1`,
        [userId]
      );

      // Wenn Benutzereinstellungen vorhanden sind, diese zurückgeben
      if (userSettings.rows.length > 0) {
        return res.status(200).json({
          success: true,
          data: userSettings.rows[0].settings
        });
      }

      // Wenn keine Benutzereinstellungen gefunden wurden, globale Standardeinstellungen holen
      const defaultSettings = await db.query(
        `SELECT settings FROM label_settings
         WHERE user_id IS NULL
         LIMIT 1`
      );

      // Wenn Standardeinstellungen gefunden wurden, diese zurückgeben
      if (defaultSettings.rows.length > 0) {
        return res.status(200).json({
          success: true,
          data: defaultSettings.rows[0].settings
        });
      }

      // Fallback zu leeren Einstellungen, wenn nichts gefunden wurde
      return res.status(200).json({
        success: true,
        data: {}
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

  // Label-Einstellungen speichern
  async saveLabelSettings(req, res) {
    try {
      const userId = req.user ? req.user.id : null;

      // Wenn kein Benutzer authentifiziert ist, Fehler zurückgeben
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Nicht authentifiziert'
        });
      }

      const settings = req.body;

      // Einstellungen validieren
      if (!settings || Object.keys(settings).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Keine gültigen Einstellungen übermittelt'
        });
      }

      const db = req.app.get('db');

      // Prüfen, ob bereits Einstellungen für diesen Benutzer vorhanden sind
      const existingSettings = await db.query(
        `SELECT id FROM label_settings
         WHERE user_id = $1
         LIMIT 1`,
        [userId]
      );

      let result;

      if (existingSettings.rows.length > 0) {
        // Existierende Einstellungen aktualisieren
        result = await db.query(
          `UPDATE label_settings
           SET settings = $1, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2
           RETURNING id`,
          [settings, userId]
        );
      } else {
        // Neue Einstellungen einfügen
        result = await db.query(
          `INSERT INTO label_settings (user_id, settings)
           VALUES ($1, $2)
           RETURNING id`,
          [userId, settings]
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Label-Einstellungen erfolgreich gespeichert',
        data: {
          id: result.rows[0].id
        }
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

  // Label-Vorlagen abrufen
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
      const userId = req.user ? req.user.id : null;
      const templateId = req.params.id;

      const template = await settingsModel.getLabelTemplateById(templateId, userId);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Etiketten-Vorlage nicht gefunden'
        });
      }

      res.status(200).json({
        success: true,
        data: template
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Etiketten-Vorlage:', error);
      res.status(500).json({
        success: false,
        message: 'Serverfehler beim Abrufen der Etiketten-Vorlage',
        error: error.message
      });
    }
  }

  // Neue Etiketten-Vorlage erstellen
  async createLabelTemplate(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      const templateData = req.body;

      // Validierung
      if (!templateData.name || !templateData.settings) {
        return res.status(400).json({
          success: false,
          message: 'Name und Einstellungen sind erforderlich'
        });
      }

      const newTemplate = await settingsModel.createLabelTemplate(templateData, userId);

      res.status(201).json({
        success: true,
        message: 'Etiketten-Vorlage erfolgreich erstellt',
        data: newTemplate
      });
    } catch (error) {
      console.error('Fehler beim Erstellen der Etiketten-Vorlage:', error);

      if (error.message.includes('existiert bereits')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Serverfehler beim Erstellen der Etiketten-Vorlage',
        error: error.message
      });
    }
  }

  // Etiketten-Vorlage aktualisieren
  async updateLabelTemplate(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      const templateId = req.params.id;
      const templateData = req.body;

      const updatedTemplate = await settingsModel.updateLabelTemplate(templateId, templateData, userId);

      res.status(200).json({
        success: true,
        message: 'Etiketten-Vorlage erfolgreich aktualisiert',
        data: updatedTemplate
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Etiketten-Vorlage:', error);

      if (error.message.includes('nicht gefunden') || error.message.includes('keine Berechtigung')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('existiert bereits')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Serverfehler beim Aktualisieren der Etiketten-Vorlage',
        error: error.message
      });
    }
  }

  // Etiketten-Vorlage löschen
  async deleteLabelTemplate(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      const templateId = req.params.id;

      const deletedTemplate = await settingsModel.deleteLabelTemplate(templateId, userId);

      res.status(200).json({
        success: true,
        message: 'Etiketten-Vorlage erfolgreich gelöscht',
        data: deletedTemplate
      });
    } catch (error) {
      console.error('Fehler beim Löschen der Etiketten-Vorlage:', error);

      if (error.message.includes('nicht gefunden') || error.message.includes('keine Berechtigung')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Serverfehler beim Löschen der Etiketten-Vorlage',
        error: error.message
      });
    }
  }

  // Versionsverlauf einer Etiketten-Vorlage abrufen
  async getLabelTemplateVersions(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      const templateId = req.params.id;

      const versions = await settingsModel.getLabelTemplateVersions(templateId, userId);

      res.status(200).json({
        success: true,
        message: 'Versionsverlauf erfolgreich abgerufen',
        data: versions
      });
    } catch (error) {
      console.error('Fehler beim Abrufen des Versionsverlaufs:', error);

      if (error.message.includes('nicht gefunden') || error.message.includes('keine Berechtigung')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Serverfehler beim Abrufen des Versionsverlaufs',
        error: error.message
      });
    }
  }

  // Zu einer früheren Version zurückkehren
  async revertToLabelTemplateVersion(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      const templateId = req.params.id;
      const versionId = req.params.versionId;

      const updatedTemplate = await settingsModel.revertToLabelTemplateVersion(templateId, versionId, userId);

      res.status(200).json({
        success: true,
        message: 'Erfolgreich zur ausgewählten Version zurückgekehrt',
        data: updatedTemplate
      });
    } catch (error) {
      console.error('Fehler beim Zurückkehren zur Version:', error);

      if (error.message.includes('nicht gefunden') || error.message.includes('keine Berechtigung')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Serverfehler beim Zurückkehren zur Version',
        error: error.message
      });
    }
  }

  // Etiketten-Vorlage importieren
  async importLabelTemplate(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      const templateData = req.body;

      if (!templateData || !templateData.name || !templateData.settings) {
        return res.status(400).json({
          success: false,
          message: 'Ungültige Vorlagendaten für den Import'
        });
      }

      const importedTemplate = await settingsModel.importLabelTemplate(templateData, userId);

      res.status(201).json({
        success: true,
        message: 'Etiketten-Vorlage erfolgreich importiert',
        data: importedTemplate
      });
    } catch (error) {
      console.error('Fehler beim Importieren der Etiketten-Vorlage:', error);
      res.status(500).json({
        success: false,
        message: 'Serverfehler beim Importieren der Etiketten-Vorlage',
        error: error.message
      });
    }
  }

  // Automatische Migration der Einstellungen zu Template
  async migrateLabelSettings(req, res) {
    try {
      const userId = req.user ? req.user.id : null;

      const migratedTemplate = await settingsModel.migrateLabelSettings(userId);

      if (!migratedTemplate) {
        return res.status(404).json({
          success: false,
          message: 'Keine Einstellungen zum Migrieren gefunden'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Einstellungen erfolgreich zu Vorlage migriert',
        data: migratedTemplate
      });
    } catch (error) {
      console.error('Fehler bei der Migration der Einstellungen:', error);
      res.status(500).json({
        success: false,
        message: 'Serverfehler bei der Migration der Einstellungen',
        error: error.message
      });
    }
  }

  // Temporäre Auth Middleware
  tempAuthMiddleware(req, res, next) {
    // Temporäre User-ID für Testphase
    req.user = { id: 1 };
    next();
  }
}

module.exports = new SettingsController();
