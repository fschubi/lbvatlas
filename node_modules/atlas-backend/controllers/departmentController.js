const departmentModel = require('../models/departmentModel'); // Geändert
const { validationResult } = require('express-validator');

class DepartmentController {
    // Abteilungen abfragen
    async getAllDepartments(req, res) {
        try {
            const departments = await departmentModel.getDepartments();
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
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const departmentId = req.params.id;
            const department = await departmentModel.getDepartmentById(departmentId);

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

            const departmentData = req.body; // Enthält name, description, isActive
            const newDepartment = await departmentModel.createDepartment(departmentData);

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
            const departmentData = req.body; // Enthält name, description, isActive

            // Nur definierte Felder übergeben (außer '', null)
            Object.keys(departmentData).forEach(key => {
                if (departmentData[key] === undefined || departmentData[key] === null || departmentData[key] === '') {
                    // Behalte isActive: false explizit bei
                    if (key !== 'isActive') {
                        delete departmentData[key];
                    }
                }
            });

            if (Object.keys(departmentData).length === 0 || (Object.keys(departmentData).length === 1 && departmentData.hasOwnProperty('id'))) {
                return res.status(400).json({ success: false, message: 'Keine Daten zum Aktualisieren angegeben' });
            }

            const updatedDepartment = await departmentModel.updateDepartment(departmentId, departmentData);

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
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const departmentId = req.params.id;
            const result = await departmentModel.deleteDepartment(departmentId);

            return res.json(result);
        } catch (error) {
            console.error('Fehler beim Löschen der Abteilung:', error);
            if (error.message === 'Abteilung nicht gefunden') {
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
                message: 'Fehler beim Löschen der Abteilung',
                error: error.message
            });
        }
    }
}

module.exports = new DepartmentController();
