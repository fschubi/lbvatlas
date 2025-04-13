const { pool } = require('../db');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

/**
 * Alle Benutzer abrufen mit optionaler Filterung
 * @param {Object} filters - Filteroptionen
 * @param {string} filters.name - Nach Namen filtern
 * @param {string} filters.department - Nach Abteilung filtern
 * @param {string} filters.role - Nach Rolle filtern
 * @param {string} filters.email - Nach E-Mail filtern
 * @param {number} page - Seitennummer für Pagination
 * @param {number} limit - Ergebnisse pro Seite
 * @param {string} sortBy - Sortierfeld
 * @param {string} sortOrder - Sortierreihenfolge (asc/desc)
 * @param {string} search - Suchbegriff für mehrere Felder
 * @returns {Promise<Array>} - Array von Benutzern
 */
const getAllUsers = async (filters = {}, page = 1, limit = 10, sortBy = 'id', sortOrder = 'asc', search = '') => {
  try {
    const offset = (page - 1) * limit;
    let query = `
      SELECT
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        d.name AS department,
        l.name AS location,
        r.name AS room,
        u.role,
        u.active,
        u.created_at,
        u.last_login,
        COALESCE(
          (SELECT COUNT(*) FROM devices WHERE assigned_to_user_id = u.id),
          0
        ) as assigned_devices_count
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN locations l ON u.location_id = l.id
      LEFT JOIN rooms r ON u.room_id = r.id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 1;

    // Suchfilter
    if (search) {
      query += ` AND (
        u.username ILIKE $${paramCount}
        OR u.email ILIKE $${paramCount}
        OR u.first_name ILIKE $${paramCount}
        OR u.last_name ILIKE $${paramCount}
      )`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    // Name Filter
    if (filters.name) {
      query += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount})`;
      queryParams.push(`%${filters.name}%`);
      paramCount++;
    }

    // Abteilungsfilter
    if (filters.department) {
      query += ` AND d.name = $${paramCount}`;
      queryParams.push(filters.department);
      paramCount++;
    }

    // Standortfilter
    if (filters.location) {
      query += ` AND l.name = $${paramCount}`;
      queryParams.push(filters.location);
      paramCount++;
    }

    // Raumfilter
    if (filters.room) {
      query += ` AND r.name = $${paramCount}`;
      queryParams.push(filters.room);
      paramCount++;
    }

    // Rollenfilter
    if (filters.role) {
      query += ` AND u.role = $${paramCount}`;
      queryParams.push(filters.role);
      paramCount++;
    }

    // E-Mail-Filter
    if (filters.email) {
      query += ` AND u.email ILIKE $${paramCount}`;
      queryParams.push(`%${filters.email}%`);
      paramCount++;
    }

    // Sortierung - Anpassen für department, location und room
    let sortColumn = sortBy;
    if (sortBy === 'department') {
      sortColumn = 'd.name';
    } else if (sortBy === 'location') {
      sortColumn = 'l.name';
    } else if (sortBy === 'room') {
      sortColumn = 'r.name';
    } else {
      sortColumn = `u.${sortBy}`;
    }

    query += ` ORDER BY ${sortColumn} ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;

    // Pagination
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    // Gesamtanzahl für Pagination
    const countQuery = `
      SELECT COUNT(*) FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN locations l ON u.location_id = l.id
      LEFT JOIN rooms r ON u.room_id = r.id
      WHERE 1=1
    `;

    // Filterparameter für Zählung wiederverwenden
    let countParams = [];
    let countParamIdx = 1;

    if (search) {
      countQuery += ` AND (
        u.username ILIKE $${countParamIdx}
        OR u.email ILIKE $${countParamIdx}
        OR u.first_name ILIKE $${countParamIdx}
        OR u.last_name ILIKE $${countParamIdx}
      )`;
      countParams.push(`%${search}%`);
      countParamIdx++;
    }

    if (filters.name) {
      countQuery += ` AND (u.first_name ILIKE $${countParamIdx} OR u.last_name ILIKE $${countParamIdx})`;
      countParams.push(`%${filters.name}%`);
      countParamIdx++;
    }

    if (filters.department) {
      countQuery += ` AND d.name = $${countParamIdx}`;
      countParams.push(filters.department);
      countParamIdx++;
    }

    if (filters.location) {
      countQuery += ` AND l.name = $${countParamIdx}`;
      countParams.push(filters.location);
      countParamIdx++;
    }

    if (filters.room) {
      countQuery += ` AND r.name = $${countParamIdx}`;
      countParams.push(filters.room);
      countParamIdx++;
    }

    if (filters.role) {
      countQuery += ` AND u.role = $${countParamIdx}`;
      countParams.push(filters.role);
      countParamIdx++;
    }

    if (filters.email) {
      countQuery += ` AND u.email ILIKE $${countParamIdx}`;
      countParams.push(`%${filters.email}%`);
      countParamIdx++;
    }

    const { rows: users } = await pool.query(query, queryParams);
    const { rows: countResult } = await pool.query(countQuery, countParams);

    const total = parseInt(countResult[0].count);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('Fehler beim Abrufen der Benutzer:', error);
    throw error;
  }
};

/**
 * Benutzer anhand der ID abrufen
 * @param {number} id - Benutzer-ID
 * @returns {Promise<Object>} - Benutzerobjekt
 */
const getUserById = async (id) => {
  try {
    const query = `
      SELECT
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        d.name AS department,
        l.name AS location,
        r.name AS room,
        u.role,
        u.active,
        u.created_at,
        u.last_login,
        COALESCE(
          (SELECT COUNT(*) FROM devices WHERE assigned_to_user_id = u.id),
          0
        ) as assigned_devices_count
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN locations l ON u.location_id = l.id
      LEFT JOIN rooms r ON u.room_id = r.id
      WHERE u.id = $1
    `;

    const { rows } = await pool.query(query, [id]);
    return rows[0];
  } catch (error) {
    logger.error(`Fehler beim Abrufen des Benutzers mit ID ${id}:`, error);
    throw error;
  }
};

/**
 * Benutzer nach Benutzernamen abrufen
 * @param {string} username - Benutzername
 * @returns {Promise<Object>} - Benutzerobjekt
 */
const getUserByUsername = async (username) => {
  try {
    const query = `
      SELECT * FROM users WHERE username = $1
    `;

    const { rows } = await pool.query(query, [username]);
    return rows[0];
  } catch (error) {
    logger.error(`Fehler beim Abrufen des Benutzers mit Benutzernamen ${username}:`, error);
    throw error;
  }
};

/**
 * Hilfsfunktion zum Erstellen eines Admin-Benutzers, falls keiner existiert
 * @returns {Promise<void>}
 */
const createAdminUserIfNotExists = async () => {
  try {
    // Prüfen, ob bereits ein Admin existiert
    const query = `SELECT * FROM users WHERE username = 'admin'`;
    const { rows } = await pool.query(query);

    if (rows.length === 0) {
      // Admin-Benutzer erstellen (Passwort: admin123)
      const adminQuery = `
        INSERT INTO users (
          username,
          password_hash,
          email,
          first_name,
          last_name,
          gender,
          department_id,
          location_id,
          room,
          phone,
          role,
          active
        ) VALUES (
          'admin',
          '$2a$10$6P.RdAHALbUALnQzz4bgbO5rSPOgbRTKfHJBLQ45Ymwa.rSxk5uXe',
          'admin@example.com',
          'Admin',
          'User',
          'male',
          NULL,
          NULL,
          NULL,
          NULL,
          'admin',
          true
        ) RETURNING id`;

      await pool.query(adminQuery);
      logger.info('Admin-Benutzer wurde erfolgreich erstellt');
    }
  } catch (error) {
    logger.error('Fehler beim Erstellen des Admin-Benutzers:', error);
  }
};

// Beim Starten der Anwendung Admin-Benutzer erstellen
createAdminUserIfNotExists();

/**
 * Benutzer nach E-Mail abrufen
 * @param {string} email - E-Mail-Adresse
 * @returns {Promise<Object>} - Benutzerobjekt
 */
const getUserByEmail = async (email) => {
  try {
    const query = `
      SELECT * FROM users WHERE email = $1
    `;

    const { rows } = await pool.query(query, [email]);
    return rows[0];
  } catch (error) {
    logger.error(`Fehler beim Abrufen des Benutzers mit E-Mail ${email}:`, error);
    throw error;
  }
};

/**
 * Neuen Benutzer erstellen
 * @param {Object} userData - Benutzerdaten
 * @returns {Promise<Object>} - Erstellter Benutzer
 */
const createUser = async (userData) => {
  try {
    // Passwort hashen
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const query = `
      INSERT INTO users (
        username,
        password_hash,
        email,
        first_name,
        last_name,
        department_id,
        role,
        active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, username, email, first_name, last_name, department_id, role, active, created_at
    `;

    const { rows } = await pool.query(query, [
      userData.username,
      hashedPassword,
      userData.email,
      userData.first_name,
      userData.last_name,
      userData.department_id,
      userData.role || 'user', // Standardrolle, falls keine angegeben
      userData.active !== undefined ? userData.active : true // Standardwert für aktiv
    ]);

    return rows[0];
  } catch (error) {
    logger.error('Fehler beim Erstellen des Benutzers:', error);
    throw error;
  }
};

/**
 * Benutzer aktualisieren
 * @param {number} id - Benutzer-ID
 * @param {Object} userData - Zu aktualisierende Benutzerdaten
 * @returns {Promise<Object>} - Aktualisierter Benutzer
 */
const updateUser = async (id, userData) => {
  try {
    // Ermittle aktuelle Daten für Felder, die nicht aktualisiert werden
    const currentUserQuery = 'SELECT * FROM users WHERE id = $1';
    const currentUser = await pool.query(currentUserQuery, [id]);

    if (currentUser.rows.length === 0) {
      throw new Error('Benutzer nicht gefunden');
    }

    // Bereite Passwort vor, falls aktualisiert
    let hashedPassword = currentUser.rows[0].password_hash;
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(userData.password, salt);
    }

    const query = `
      UPDATE users SET
        username = $1,
        password_hash = $2,
        email = $3,
        first_name = $4,
        last_name = $5,
        department_id = $6,
        role = $7,
        active = $8,
        updated_at = NOW()
      WHERE id = $9
      RETURNING id, username, email, first_name, last_name, department_id, role, active, created_at, updated_at
    `;

    const { rows } = await pool.query(query, [
      userData.username || currentUser.rows[0].username,
      hashedPassword,
      userData.email || currentUser.rows[0].email,
      userData.first_name || currentUser.rows[0].first_name,
      userData.last_name || currentUser.rows[0].last_name,
      userData.department_id || currentUser.rows[0].department_id,
      userData.role || currentUser.rows[0].role,
      userData.active !== undefined ? userData.active : currentUser.rows[0].active,
      id
    ]);

    return rows[0];
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren des Benutzers mit ID ${id}:`, error);
    throw error;
  }
};

/**
 * Benutzer löschen
 * @param {number} id - Benutzer-ID
 * @returns {Promise<boolean>} - Erfolg des Löschvorgangs
 */
const deleteUser = async (id) => {
  try {
    // Prüfen, ob Geräte zugewiesen sind
    const deviceQuery = 'SELECT COUNT(*) FROM devices WHERE user_id = $1';
    const deviceResult = await pool.query(deviceQuery, [id]);

    if (parseInt(deviceResult.rows[0].count) > 0) {
      throw new Error('Benutzer hat zugewiesene Geräte und kann nicht gelöscht werden');
    }

    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const { rows } = await pool.query(query, [id]);

    return rows.length > 0;
  } catch (error) {
    logger.error(`Fehler beim Löschen des Benutzers mit ID ${id}:`, error);
    throw error;
  }
};

/**
 * Login-Zeit aktualisieren
 * @param {number} id - Benutzer-ID
 * @returns {Promise<void>}
 */
const updateLastLogin = async (id) => {
  try {
    const query = 'UPDATE users SET last_login = NOW() WHERE id = $1';
    await pool.query(query, [id]);
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren der Login-Zeit für Benutzer ${id}:`, error);
    throw error;
  }
};

/**
 * Verifiziert das Passwort eines Benutzers
 * @param {Object} user - Benutzerobjekt
 * @param {string} password - Zu verifizierendes Passwort
 * @returns {Promise<boolean>} - Ist das Passwort korrekt?
 */
const verifyPassword = async (user, password) => {
  try {
    return await bcrypt.compare(password, user.password_hash);
  } catch (error) {
    logger.error('Fehler bei der Passwortüberprüfung:', error);
    throw error;
  }
};

/**
 * Benutzerrollen abrufen
 * @returns {Promise<Array>} - Liste der verfügbaren Rollen
 */
const getUserRoles = async () => {
  try {
    const query = 'SELECT DISTINCT role FROM users';
    const { rows } = await pool.query(query);
    return rows.map(row => row.role);
  } catch (error) {
    logger.error('Fehler beim Abrufen der Benutzerrollen:', error);
    throw error;
  }
};

/**
 * Abteilungen abrufen
 * @returns {Promise<Array>} - Liste der verfügbaren Abteilungen
 */
const getDepartments = async () => {
  try {
    const query = 'SELECT * FROM departments';
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    logger.error('Fehler beim Abrufen der Abteilungen:', error);
    throw error;
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  getUserByUsername,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  updateLastLogin,
  verifyPassword,
  getUserRoles,
  getDepartments
};
