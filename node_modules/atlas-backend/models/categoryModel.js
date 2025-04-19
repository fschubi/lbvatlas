const db = require('../db');
const { NotFoundError, DatabaseError, ConflictError } = require('../utils/customErrors.js');

class CategoryModel {
  // Kategorien abfragen
  async getCategories() {
    try {
      const query = `
        SELECT * FROM categories
        ORDER BY name ASC
      `;
      const { rows } = await db.query(query);

      // Füge jedem Ergebnis das isActive-Feld hinzu (Hinweis: In der DB scheint es kein `active` Feld zu geben)
      const categoriesWithActive = rows.map(category => ({
        ...category,
        isActive: true // Annahme: Alle Kategorien sind immer aktiv
      }));

      return categoriesWithActive;
    } catch (error) {
      console.error('Fehler beim Abrufen der Kategorien:', error);
      throw error;
    }
  }

  // Kategorie nach ID abfragen
  async getCategoryById(id) {
    try {
      const query = `
        SELECT * FROM categories
        WHERE id = $1
      `;
      const { rows } = await db.query(query, [id]);

      if (rows.length === 0) {
        return null;
      }

      // Füge das isActive-Feld manuell hinzu
      const result = rows[0];
      result.isActive = true; // Annahme: Immer aktiv

      return result;
    } catch (error) {
      console.error('Fehler beim Abrufen der Kategorie nach ID:', error);
      throw error;
    }
  }

  // Neue Kategorie erstellen
  async createCategory(categoryData) {
    try {
      // Prüfen, ob die Kategorie bereits existiert
      const checkQuery = `
        SELECT id FROM categories
        WHERE LOWER(name) = LOWER($1)
      `;
      const existingCategory = await db.query(checkQuery, [categoryData.name]);

      if (existingCategory.rows.length > 0) {
        throw new Error('Eine Kategorie mit diesem Namen existiert bereits');
      }

      const query = `
        INSERT INTO categories (
          name,
          description,
          type
        )
        VALUES ($1, $2, $3)
        RETURNING *
      `;

      const values = [
        categoryData.name,
        categoryData.description || null,
        'device' // Standard-Typ für Kategorien, wie im Original
      ];

      const { rows } = await db.query(query, values);

      // Füge das isActive-Feld manuell hinzu für Frontend-Kompatibilität
      const result = {
        ...rows[0],
        isActive: true // Annahme: Immer aktiv
      };

      return result;
    } catch (error) {
      console.error('Fehler beim Erstellen der Kategorie:', error);
      if (error.code === '23505') { // Unique constraint violation
          throw new Error('Eine Kategorie mit diesem Namen existiert bereits');
      }
      throw error;
    }
  }

  // Kategorie aktualisieren
  async updateCategory(id, categoryData) {
    try {
      // Prüfen, ob ein anderer Eintrag bereits den Namen verwendet
      if (categoryData.name) {
        const checkQuery = `
          SELECT id FROM categories
          WHERE LOWER(name) = LOWER($1) AND id != $2
        `;
        const existingCategory = await db.query(checkQuery, [categoryData.name, id]);

        if (existingCategory.rows.length > 0) {
          throw new Error('Eine andere Kategorie mit diesem Namen existiert bereits');
        }
      }

      const query = `
        UPDATE categories
        SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          type = COALESCE($3, type),
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;

      const values = [
        categoryData.name || null,
        categoryData.description || null,
        categoryData.type || 'device', // Behalte den Typ bei oder setze Standard
        id
      ];

      const { rows } = await db.query(query, values);

      if (rows.length === 0) {
        throw new Error('Kategorie nicht gefunden');
      }

      // Füge das isActive-Feld manuell hinzu für Frontend-Kompatibilität
      const result = {
        ...rows[0],
        isActive: true // Annahme: Immer aktiv
      };

      return result;
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Kategorie:', error);
      if (error.code === '23505') { // Unique constraint violation
          throw new Error('Eine andere Kategorie mit diesem Namen existiert bereits');
      }
      throw error;
    }
  }

  // Kategorie löschen
  async deleteCategory(id) {
    try {
      // Prüfen, ob die Kategorie verwendet wird (z.B. von Geräten)
      const checkDevicesQuery = `SELECT COUNT(*) as count FROM devices WHERE category_id = $1`;
      const deviceUsage = await db.query(checkDevicesQuery, [id]);

      if (parseInt(deviceUsage.rows[0].count) > 0) {
        throw new Error('Kategorie kann nicht gelöscht werden, da sie noch von Geräten verwendet wird.');
      }

      // Weitere Checks hinzufügen, falls Kategorien woanders verwendet werden (z.B. Lizenzen, Zubehör?)

      const query = `
        DELETE FROM categories
        WHERE id = $1
        RETURNING *
      `;

      const { rows } = await db.query(query, [id]);

      if (rows.length === 0) {
        throw new Error('Kategorie nicht gefunden');
      }

      return { success: true, message: 'Kategorie gelöscht', data: rows[0] };
    } catch (error) {
      console.error('Fehler beim Löschen der Kategorie:', error);
      if (error.code === '23503') { // Foreign key violation
          throw new Error('Kategorie kann nicht gelöscht werden, da sie noch verwendet wird.');
      }
      throw error;
    }
  }
}

module.exports = new CategoryModel();
