const { pool } = require('../db');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

/**
 * Alle Benutzer abrufen
 * @param {Object} filters - Filteroptionen (name, role, department, location, room)
 * @param {string} sortBy - Sortierfeld
 * @param {string} sortOrder - Sortierreihenfolge (ASC oder DESC)
 * @returns {Promise<Array>} - Liste der Benutzer
 */
const getAllUsers = async (
  filters = {},
  sortBy = 'username',
  sortOrder = 'ASC'
) => {
  try {
    let query = `
      SELECT
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        u.display_name,
        u.role,
        u.active,
        u.created_at,
        u.updated_at,
        u.last_login,
        u.department_id,
        d.name AS department_name,
        u.location_id,
        l.name AS location_name,
        u.room_id,
        r.name AS room_name,
        COALESCE(
          (SELECT COUNT(*) FROM devices WHERE assigned_to_user_id = u.id),
          0
        ) as assigned_devices_count
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      LEFT JOIN locations l ON l.id = u.location_id
      LEFT JOIN rooms r ON r.id = u.room_id
      WHERE 1=1
    `;

    const values = [];
    let valueIndex = 1;

    // Name-Filter (username, first_name, last_name, display_name)
    if (filters.name) {
      query += `
        AND (
          u.username ILIKE $${valueIndex}
          OR u.first_name ILIKE $${valueIndex}
          OR u.last_name ILIKE $${valueIndex}
          OR u.display_name ILIKE $${valueIndex}
        )
      `;
      values.push(`%${filters.name}%`);
      valueIndex++;
    }

    // Rolle-Filter
    if (filters.role) {
      query += ` AND u.role = $${valueIndex}`;
      values.push(filters.role);
      valueIndex++;
    }

    // Abteilungs-Filter
    if (filters.department) {
      query += ` AND (d.name ILIKE $${valueIndex} OR d.id = $${valueIndex + 1})`;
      values.push(`%${filters.department}%`);

      // Versuche, die departmentId als Ganzzahl zu interpretieren
      let departmentId = null;
      try {
        departmentId = parseInt(filters.department);
        if (isNaN(departmentId)) departmentId = null;
      } catch (e) {
        departmentId = null;
      }

      values.push(departmentId);
      valueIndex += 2;
    }

    // Standort-Filter
    if (filters.location) {
      query += ` AND (l.name ILIKE $${valueIndex} OR l.id = $${valueIndex + 1})`;
      values.push(`%${filters.location}%`);

      // Versuche, die locationId als Ganzzahl zu interpretieren
      let locationId = null;
      try {
        locationId = parseInt(filters.location);
        if (isNaN(locationId)) locationId = null;
      } catch (e) {
        locationId = null;
      }

      values.push(locationId);
      valueIndex += 2;
    }

    // Raum-Filter
    if (filters.room) {
      query += ` AND (r.name ILIKE $${valueIndex} OR r.id = $${valueIndex + 1})`;
      values.push(`%${filters.room}%`);

      // Versuche, die roomId als Ganzzahl zu interpretieren
      let roomId = null;
      try {
        roomId = parseInt(filters.room);
        if (isNaN(roomId)) roomId = null;
      } catch (e) {
        roomId = null;
      }

      values.push(roomId);
      valueIndex += 2;
    }

    // Status-Filter
    if (filters.active !== undefined) {
      query += ` AND u.active = $${valueIndex}`;
      values.push(filters.active);
      valueIndex++;
    }

    // Sortieren
    const validSortColumns = ['username', 'email', 'first_name', 'last_name', 'display_name', 'role', 'created_at', 'last_login', 'assigned_devices_count', 'department_name', 'location_name', 'room_name'];
    const actualSortBy = validSortColumns.includes(sortBy) ? sortBy : 'username';

    // Sicherstellen, dass sortOrder ein String ist, bevor toUpperCase aufgerufen wird
    const sortOrderStr = sortOrder ? String(sortOrder) : 'ASC';
    const actualSortOrder = ['ASC', 'DESC'].includes(sortOrderStr.toUpperCase()) ? sortOrderStr.toUpperCase() : 'ASC';

    let sortField = actualSortBy;
    if (actualSortBy === 'department_name') {
      sortField = 'd.name';
    } else if (actualSortBy === 'location_name') {
      sortField = 'l.name';
    } else if (actualSortBy === 'room_name') {
      sortField = 'r.name';
    } else if (!actualSortBy.includes('.')) {
      sortField = `u.${actualSortBy}`;
    }

    query += ` ORDER BY ${sortField} ${actualSortOrder}`;

    const { rows } = await pool.query(query, values);
    return rows;
  } catch (error) {
    logger.error('Fehler beim Abrufen aller Benutzer:', error);
    throw error;
  }
};

/**
 * Benutzer anhand der ID abrufen
 * @param {number} id - Benutzer-ID
 * @returns {Promise<Object|null>} - Benutzerobjekt oder null
 */
const getUserById = async (id) => {
  try {
    const query = `
      SELECT
        u.id,
        u.username,
        u.email,
        u.password_hash,
        u.first_name,
        u.last_name,
        u.display_name,
        u.role,
        u.active,
        u.created_at,
        u.updated_at,
        u.last_login,
        u.department_id,
        d.name AS department_name,
        u.location_id,
        l.name AS location_name,
        u.room_id,
        r.name AS room_name,
        COALESCE(
          (SELECT COUNT(*) FROM devices WHERE assigned_to_user_id = u.id),
          0
        ) as assigned_devices_count
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      LEFT JOIN locations l ON l.id = u.location_id
      LEFT JOIN rooms r ON r.id = u.room_id
      WHERE u.id = $1
    `;

    const { rows } = await pool.query(query, [id]);
    return rows.length ? rows[0] : null;
  } catch (error) {
    logger.error(`Fehler beim Abrufen des Benutzers mit ID ${id}:`, error);
    throw error;
  }
};

/**
 * Benutzer anhand des Benutzernamens abrufen
 * @param {string} username - Benutzername
 * @returns {Promise<Object|null>} - Benutzerobjekt oder null
 */
const getUserByUsername = async (username) => {
  try {
    const query = `
      SELECT
        u.id,
        u.username,
        u.email,
        u.password_hash,
        u.first_name,
        u.last_name,
        u.display_name,
        u.role, -- Rolle des Benutzers
        r.id AS role_id, -- ID der Rolle des Benutzers
        u.active,
        u.created_at,
        u.updated_at,
        u.last_login,
        u.department_id,
        d.name AS department_name,
        u.location_id,
        l.name AS location_name,
        u.room_id,
        ro.name AS room_name,
        -- Berechtigungen des Benutzers sammeln (über die Rolle)
        COALESCE(
            (
              SELECT array_agg(p.name)
              FROM role_permissions rp
              JOIN permissions p ON p.id = rp.permission_id
              WHERE rp.role_id = r.id
            ),
            '{}'
        ) AS permissions
      FROM users u
      LEFT JOIN roles r ON r.name = u.role -- Join mit roles über den Namen (oder ID, falls u.role die ID ist)
      LEFT JOIN departments d ON d.id = u.department_id
      LEFT JOIN locations l ON l.id = u.location_id
      LEFT JOIN rooms ro ON ro.id = u.room_id
      WHERE u.username = $1
    `;

    const { rows } = await pool.query(query, [username]);
    return rows.length ? rows[0] : null;
  } catch (error) {
    logger.error(`Fehler beim Abrufen des Benutzers mit Benutzername ${username}:`, error);
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
          location_id,
          room_id,
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
 * Benutzer anhand der E-Mail-Adresse abrufen
 * @param {string} email - E-Mail-Adresse
 * @returns {Promise<Object|null>} - Benutzerobjekt oder null
 */
const getUserByEmail = async (email) => {
  try {
    const query = `
      SELECT
        u.id,
        u.username,
        u.email,
        u.password_hash,
        u.first_name,
        u.last_name,
        u.display_name,
        u.role, -- Rolle des Benutzers
        r.id AS role_id, -- ID der Rolle des Benutzers
        u.active,
        u.created_at,
        u.updated_at,
        u.last_login,
        u.department_id,
        d.name AS department_name,
        u.location_id,
        l.name AS location_name,
        u.room_id,
        ro.name AS room_name,
        -- Berechtigungen des Benutzers sammeln (über die Rolle)
        COALESCE(
            (
              SELECT array_agg(p.name)
              FROM role_permissions rp
              JOIN permissions p ON p.id = rp.permission_id
              WHERE rp.role_id = r.id
            ),
            '{}'
        ) AS permissions
      FROM users u
      LEFT JOIN roles r ON r.name = u.role -- Join mit roles über den Namen (oder ID, falls u.role die ID ist)
      LEFT JOIN departments d ON d.id = u.department_id
      LEFT JOIN locations l ON l.id = u.location_id
      LEFT JOIN rooms ro ON ro.id = u.room_id
      WHERE u.email = $1
    `;
    const { rows } = await pool.query(query, [email]);
    return rows.length ? rows[0] : null;
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
        display_name,
        department_id,
        location_id,
        room_id,
        role,
        active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, username, email, first_name, last_name, display_name,
        department_id, location_id, room_id, role, active, created_at
    `;

    const { rows } = await pool.query(query, [
      userData.username,
      hashedPassword,
      userData.email,
      userData.first_name,
      userData.last_name,
      userData.display_name || `${userData.first_name} ${userData.last_name}`,
      userData.department_id || null,
      userData.location_id || null,
      userData.room_id || null,
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
  logger.debug(`[userModel] updateUser aufgerufen für ID: ${id} mit Daten:`, userData);
  try {
    const setClauses = [];
    const values = [];
    let valueIndex = 1;

    // Passwort separat behandeln
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      setClauses.push(`password_hash = $${valueIndex}`);
      values.push(hashedPassword);
      valueIndex++;
      delete userData.password;
    }

    // Dynamisch SET-Klauseln für andere Felder erstellen
    for (const key in userData) {
      if (userData[key] === undefined) continue;

      // Annahme: Controller liefert bereits korrekte snake_case Schlüssel
      const dbKey = key;

      if (dbKey === 'active') {
          const boolValue = typeof userData[key] === 'boolean' ? userData[key] : (String(userData[key]).toLowerCase() === 'true' || userData[key] === 1);
          setClauses.push(`${dbKey} = $${valueIndex}`);
          values.push(boolValue);
          valueIndex++;
      } else {
          const value = userData[key] === '' && (dbKey === 'department_id' || dbKey === 'location_id' || dbKey === 'room_id') ? null : userData[key];
          setClauses.push(`${dbKey} = $${valueIndex}`);
          values.push(value);
          valueIndex++;
      }
    }

    if (setClauses.length === 0) {
      logger.warn(`[userModel] updateUser für ID ${id} aufgerufen, aber keine Felder zum Aktualisieren gefunden (nach Passwortbehandlung).`);
      const currentUser = await getUserById(id); // Hole aktuellen User für Rückgabe
      return currentUser;
    }

    setClauses.push(`updated_at = NOW()`);

    // Korrigierter Query-String Aufbau
    const query = `
      UPDATE users SET
        ${setClauses.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING id, username, email, first_name, last_name, display_name,
        department_id, location_id, room_id, role, active, created_at, updated_at
    `; // Korrektes Komma nach join()

    values.push(id);

    logger.debug(`[userModel] updateUser Query: ${query}`);
    logger.debug(`[userModel] updateUser Values: ${JSON.stringify(values)}`); // JSON.stringify für bessere Lesbarkeit

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
        logger.error(`[userModel] updateUser für ID ${id} hat keine Zeile zurückgegeben.`);
        throw new Error('Benutzer nach Update nicht gefunden oder Update fehlgeschlagen.');
    }

    logger.debug(`[userModel] updateUser erfolgreich für ID ${id}, Ergebnis:`, rows[0]);
    return rows[0];
  } catch (error) {
    logger.error(`[userModel] Fehler beim Aktualisieren des Benutzers mit ID ${id}:`, error);
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
 * Rollen eines bestimmten Benutzers abrufen
 * @param {number} userId - Die ID des Benutzers
 * @returns {Promise<Array<{id: number, name: string}>>} - Liste der Rollenobjekte des Benutzers (mit ID und Name)
 */
const getUserRoles = async (userId) => {
  if (!userId) {
    logger.error('getUserRoles: Keine userId übergeben.');
    throw new Error('Benutzer-ID ist erforderlich, um Rollen abzurufen.');
  }
  try {
    // Korrekte Abfrage an user_roles und roles Tabelle
    const query = `
      SELECT r.id, r.name
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `;
    const { rows } = await pool.query(query, [userId]);
    // Gibt Array von Objekten zurück, z.B. [{ id: 1, name: 'admin' }]
    return rows;
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Rollen für Benutzer ${userId}:`, error);
    throw error;
  }
};

/**
 * Abteilungen abrufen
 * @returns {Promise<Array>} - Liste der verfügbaren Abteilungen
 */
const getDepartments = async () => {
  try {
    const query = 'SELECT * FROM departments WHERE active = true ORDER BY name';
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    logger.error('Fehler beim Abrufen der Abteilungen:', error);
    throw error;
  }
};

/**
 * Standorte abrufen
 * @returns {Promise<Array>} - Liste der verfügbaren Standorte
 */
const getLocations = async () => {
  try {
    const query = 'SELECT * FROM locations ORDER BY name';
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    logger.error('Fehler beim Abrufen der Standorte:', error);
    throw error;
  }
};

/**
 * Räume für einen Standort abrufen
 * @param {number} locationId - ID des Standorts
 * @returns {Promise<Array>} - Liste der verfügbaren Räume
 */
const getRoomsByLocation = async (locationId) => {
  try {
    const query = 'SELECT * FROM rooms WHERE location_id = $1 AND active = true ORDER BY name';
    const { rows } = await pool.query(query, [locationId]);
    return rows;
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Räume für Standort ${locationId}:`, error);
    throw error;
  }
};

/**
 * NEUE FUNKTION: Benutzer suchen
 * @param {string} term - Suchbegriff
 * @returns {Promise<Array>} - Liste der gefundenen Benutzer
 */
const searchUsers = async (term) => {
  if (!term || typeof term !== 'string' || term.trim().length === 0) {
    // Wenn kein Suchbegriff vorhanden ist, alle Benutzer zurückgeben (oder leeres Array?)
    // Hier wählen wir, alle Benutzer zurückzugeben, analog zu keiner Filterung.
    // return getAllUsers(); // Könnte zu Performance-Problemen führen
    return []; // Sicherer, ein leeres Array zurückzugeben, wenn der Term ungültig ist.
  }

  const searchTerm = `%${term.trim()}%`;

  try {
    const query = `
      SELECT
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        u.display_name,
        u.role,
        u.active,
        u.created_at,
        u.updated_at,
        u.last_login,
        u.department_id,
        d.name AS department_name,
        u.location_id,
        l.name AS location_name,
        u.room_id,
        r.name AS room_name,
        COALESCE(
          (SELECT COUNT(*) FROM devices WHERE assigned_to_user_id = u.id),
          0
        ) as assigned_devices_count
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      LEFT JOIN locations l ON l.id = u.location_id
      LEFT JOIN rooms r ON r.id = u.room_id
      WHERE
        u.username ILIKE $1
        OR u.first_name ILIKE $1
        OR u.last_name ILIKE $1
        OR u.display_name ILIKE $1
        OR u.email ILIKE $1
      ORDER BY u.username ASC
    `;

    const { rows } = await pool.query(query, [searchTerm]);
    return rows;
  } catch (error) {
    logger.error(`Fehler bei der Benutzersuche mit Begriff "${term}":`, error);
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
  getDepartments,
  getLocations,
  getRoomsByLocation,
  createAdminUserIfNotExists,
  searchUsers
};
