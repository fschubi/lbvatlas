const categoryModel = require('../models/categoryModel'); // Geändert
const { validationResult } = require('express-validator');

class CategoryController {
    // Kategorien abfragen
    async getAllCategories(req, res) {
        try {
            const categories = await categoryModel.getCategories();
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
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const categoryId = req.params.id;
            const category = await categoryModel.getCategoryById(categoryId);

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

            const categoryData = req.body;
            const newCategory = await categoryModel.createCategory(categoryData);

            return res.status(201).json({
                success: true,
                message: 'Kategorie erfolgreich erstellt',
                data: newCategory
            });
        } catch (error) {
            console.error('Fehler beim Erstellen der Kategorie:', error);
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
            const categoryData = req.body;

            // Nur definierte Felder übergeben
            Object.keys(categoryData).forEach(key => (categoryData[key] === undefined || categoryData[key] === '' || categoryData[key] === null) && delete categoryData[key]);

            if (Object.keys(categoryData).length === 0) {
                 return res.status(400).json({ success: false, message: 'Keine Daten zum Aktualisieren angegeben' });
            }

            const updatedCategory = await categoryModel.updateCategory(categoryId, categoryData);

            return res.json({
                success: true,
                message: 'Kategorie erfolgreich aktualisiert',
                data: updatedCategory
            });
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Kategorie:', error);
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
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const categoryId = req.params.id;
            const result = await categoryModel.deleteCategory(categoryId);

            return res.json(result);
        } catch (error) {
            console.error('Fehler beim Löschen der Kategorie:', error);
            if (error.message === 'Kategorie nicht gefunden') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            } else if (error.message.includes('verwendet wird')) {
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
}

module.exports = new CategoryController();
