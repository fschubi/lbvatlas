const db = require('../db');
const { NotFoundError, DatabaseError, ConflictError } = require('../utils/customErrors.js');

class DepartmentModel {
  // Abteilungen abfragen
  async getDepartments() {
    try {
      const query = `SELECT * FROM departments ORDER BY name ASC`;
      const { rows } = await db.query(query);
      // Konvertiere 'active' zu 'isActive' für Frontend-Konsistenz
      return rows.map(dept => ({ ...dept, isActive: dept.active }));
    } catch (error) {
      console.error('Fehler beim Abrufen der Abteilungen:', error);
      throw error;
    }
  }

  // Abteilung nach ID abfragen
  async getDepartmentById(id) {
    try {
      const query = `SELECT * FROM departments WHERE id = $1`;
      const { rows } = await db.query(query, [id]);
      if (rows.length === 0) {
        return null;
      }
      const department = rows[0];
      // Konvertiere 'active' zu 'isActive'
      return { ...department, isActive: department.active };
    } catch (error) {
      console.error('Fehler beim Abrufen der Abteilung nach ID:', error);
      throw error;
    }
  }

  // Neue Abteilung erstellen
  async createDepartment(departmentData) {
    try {
      // Prüfen, ob die Abteilung bereits existiert
      const checkQuery = `SELECT id FROM departments WHERE LOWER(name) = LOWER($1)`;
      const existingDepartment = await db.query(checkQuery, [departmentData.name]);

      if (existingDepartment.rows.length > 0) {
        throw new Error('Eine Abteilung mit diesem Namen existiert bereits');
      }

      const insertQuery = `
        INSERT INTO departments (name, description, active)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const values = [
        departmentData.name,
        departmentData.description || null,
        departmentData.isActive !== undefined ? departmentData.isActive : true // Verwende isActive aus Daten
      ];
      const { rows } = await db.query(insertQuery, values);
      const newDepartment = rows[0];

       // Konvertiere 'active' zu 'isActive'
      return { ...newDepartment, isActive: newDepartment.active };
    } catch (error) {
      console.error('Fehler beim Erstellen der Abteilung:', error);
       if (error.code === '23505') { // Unique constraint violation
          throw new Error('Eine Abteilung mit diesem Namen existiert bereits');
      }
      throw error;
    }
  }

  // Abteilung aktualisieren
  async updateDepartment(id, departmentData) {
    try {
      // Prüfen, ob ein anderer Eintrag bereits den Namen verwendet
      if (departmentData.name) {
        const checkQuery = `SELECT id FROM departments WHERE LOWER(name) = LOWER($1) AND id != $2`;
        const existingDepartment = await db.query(checkQuery, [departmentData.name, id]);

        if (existingDepartment.rows.length > 0) {
          throw new Error('Eine andere Abteilung mit diesem Namen existiert bereits');
        }
      }

      const updateQuery = `
        UPDATE departments SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          active = COALESCE($3, active),
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;
      const values = [
        departmentData.name || null,
        departmentData.description,
        departmentData.isActive !== undefined ? departmentData.isActive : null, // Verwende isActive aus Daten
        id
      ];
      const { rows } = await db.query(updateQuery, values);

      if (rows.length === 0) {
        throw new Error('Abteilung nicht gefunden');
      }
      const updatedDepartment = rows[0];

      // Konvertiere 'active' zu 'isActive'
      return { ...updatedDepartment, isActive: updatedDepartment.active };
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Abteilung:', error);
      if (error.code === '23505') { // Unique constraint violation
          throw new Error('Eine andere Abteilung mit diesem Namen existiert bereits');
      }
      throw error;
    }
  }

  // Abteilung löschen
  async deleteDepartment(id) {
    try {
       // Prüfen, ob die Abteilung verwendet wird (z.B. von Benutzern)
       const checkUsersQuery = `SELECT COUNT(*) FROM users WHERE department_id = $1`;
       const userUsage = await db.query(checkUsersQuery, [id]);

       if (parseInt(userUsage.rows[0].count) > 0) {
           throw new Error('Abteilung kann nicht gelöscht werden, da sie noch von Benutzern verwendet wird.');
       }
       // Hier könnten weitere Checks hinzugefügt werden (z.B. Assets, wenn diese einer Abteilung zugeordnet sind)

      const query = `DELETE FROM departments WHERE id = $1 RETURNING *`;
      const { rows } = await db.query(query, [id]);

      if (rows.length === 0) {
        throw new Error('Abteilung nicht gefunden');
      }
      const deletedDepartment = rows[0];

      return { success: true, message: 'Abteilung gelöscht', data: { ...deletedDepartment, isActive: deletedDepartment.active } };
    } catch (error) {
      console.error('Fehler beim Löschen der Abteilung:', error);
      if (error.code === '23503') { // Foreign key violation
          throw new Error('Abteilung kann nicht gelöscht werden, da sie noch verwendet wird.');
      }
      throw error;
    }
  }
}

module.exports = new DepartmentModel();
