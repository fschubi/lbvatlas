
const settingsModel = require('../models/settingsModel');

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

// Alle Netzwerkdosen abrufen
async function getAllNetworkSockets(req, res) {
  try {
    const result = await settingsModel.getNetworkSockets();
    res.status(200).json(result);
  } catch (error) {
    console.error('Fehler beim Abrufen aller Netzwerkdosen:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen aller Netzwerkdosen' });
  }
}

// Einzelne Netzwerkdose abrufen
async function getNetworkSocketById(req, res) {
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

// Netzwerkdose erstellen
async function createNetworkSocket(req, res) {
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
async function updateNetworkSocket(req, res) {
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
async function deleteNetworkSocket(req, res) {
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

module.exports = {
  deleteNetworkSocket,
  getAllNetworkSockets,
  getNetworkSocketById,
  createNetworkSocket,
  updateNetworkSocket
};
