// const settingsModel = require('../models/settingsModel'); // Veraltet
const supplierModel = require('../models/supplierModel'); // Korrektes Model importieren
const { validationResult } = require('express-validator');

class SupplierController {
    // Lieferanten abfragen
    async getAllSuppliers(req, res) {
        try {
            // Verwende das korrekte Model und prüfe den Funktionsnamen (wahrscheinlich .getAll() oder .getAllSuppliers())
            const suppliers = await supplierModel.getAll(); // Annahme: Funktion heißt getAll
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
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const supplierId = req.params.id;
            // Verwende das korrekte Model und prüfe den Funktionsnamen
            const supplier = await supplierModel.getById(supplierId); // Annahme: Funktion heißt getById

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
                is_active: req.body.is_active // Achte auf korrekten Feldnamen vom Frontend
            };

            // Verwende das korrekte Model und prüfe den Funktionsnamen
            const newSupplier = await supplierModel.create(supplierData); // Annahme: Funktion heißt create

            return res.status(201).json({
                success: true,
                message: 'Lieferant erfolgreich erstellt',
                data: newSupplier
            });
        } catch (error) {
            console.error('Fehler beim Erstellen des Lieferanten:', error);
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
                is_active: req.body.is_active // Achte auf korrekten Feldnamen vom Frontend
            };

             // Nur definierte Felder übergeben
            Object.keys(supplierData).forEach(key => supplierData[key] === undefined && delete supplierData[key]);

             if (Object.keys(supplierData).length === 0) {
                 return res.status(400).json({ success: false, message: 'Keine Daten zum Aktualisieren angegeben' });
            }

            // Verwende das korrekte Model und prüfe den Funktionsnamen
            const updatedSupplier = await supplierModel.update(supplierId, supplierData); // Annahme: Funktion heißt update

            return res.json({
                success: true,
                message: 'Lieferant erfolgreich aktualisiert',
                data: updatedSupplier
            });
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Lieferanten:', error);
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
             const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const supplierId = req.params.id;
            // Verwende das korrekte Model und prüfe den Funktionsnamen
            const deletedSupplier = await supplierModel.delete(supplierId); // Annahme: Funktion heißt delete

            return res.json({
                success: true,
                message: 'Lieferant erfolgreich gelöscht',
                data: deletedSupplier // Ggf. nur { success: true, message: ... } zurückgeben?
            });
        } catch (error) {
            console.error('Fehler beim Löschen des Lieferanten:', error);
            if (error.message === 'Lieferant nicht gefunden') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            } else if (error.message.includes('wird von')) { // Oder spezifischere Prüfung
                 return res.status(400).json({
                    success: false,
                    message: 'Lieferant kann nicht gelöscht werden, da er noch verwendet wird.'
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Fehler beim Löschen des Lieferanten',
                error: error.message
            });
        }
    }
}

module.exports = new SupplierController();
