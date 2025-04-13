/**
 * Passwort-Management-Modell für das ATLAS-System
 */

const { pool } = require('../db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Aktive Passwortrichtlinie abrufen
 * @returns {Promise<Object>} Die aktive Passwortrichtlinie
 */
const getActivePasswordPolicy = async () => {
  try {
    const query = `
      SELECT * FROM password_policies
      WHERE active = true
      ORDER BY id LIMIT 1
    `;

    const { rows } = await pool.query(query);

    if (rows.length === 0) {
      throw new Error('Keine aktive Passwortrichtlinie gefunden');
    }

    return rows[0];
  } catch (error) {
    logger.error('Fehler beim Abrufen der Passwortrichtlinie:', error);
    throw error;
  }
};

/**
 * Passwort gegen Richtlinien validieren
 * @param {string} password - Das zu überprüfende Passwort
 * @returns {Promise<{valid: boolean, message: string}>} Validierungsergebnis mit Nachricht
 */
const validatePassword = async (password) => {
  try {
    const policy = await getActivePasswordPolicy();

    // Längenprüfung
    if (password.length < policy.min_length) {
      return {
        valid: false,
        message: `Das Passwort muss mindestens ${policy.min_length} Zeichen lang sein.`
      };
    }

    // Großbuchstaben prüfen
    if (policy.require_uppercase && !/[A-Z]/.test(password)) {
      return {
        valid: false,
        message: 'Das Passwort muss mindestens einen Großbuchstaben enthalten.'
      };
    }

    // Kleinbuchstaben prüfen
    if (policy.require_lowercase && !/[a-z]/.test(password)) {
      return {
        valid: false,
        message: 'Das Passwort muss mindestens einen Kleinbuchstaben enthalten.'
      };
    }

    // Zahlen prüfen
    if (policy.require_numbers && !/[0-9]/.test(password)) {
      return {
        valid: false,
        message: 'Das Passwort muss mindestens eine Zahl enthalten.'
      };
    }

    // Sonderzeichen prüfen
    if (policy.require_special_chars && !/[^A-Za-z0-9]/.test(password)) {
      return {
        valid: false,
        message: 'Das Passwort muss mindestens ein Sonderzeichen enthalten.'
      };
    }

    return {
      valid: true,
      message: 'Passwort entspricht allen Richtlinien.'
    };
  } catch (error) {
    logger.error('Fehler bei der Passwortvalidierung:', error);
    throw error;
  }
};

/**
 * Prüft, ob das Passwort bereits verwendet wurde
 * @param {number} userId - ID des Benutzers
 * @param {string} password - Zu prüfendes Passwort
 * @returns {Promise<boolean>} True, wenn das Passwort bereits verwendet wurde
 */
const isPasswordUsed = async (userId, password) => {
  try {
    // Holen der Passwort-Historie
    const userQuery = 'SELECT password_history FROM users WHERE id = $1';
    const { rows } = await pool.query(userQuery, [userId]);

    if (rows.length === 0) {
      throw new Error('Benutzer nicht gefunden');
    }

    const passwordHistory = rows[0].password_history || [];

    // Prüfen, ob eines der alten Passwörter übereinstimmt
    for (const oldPasswordHash of passwordHistory) {
      const matches = await bcrypt.compare(password, oldPasswordHash);
      if (matches) {
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.error(`Fehler bei der Prüfung auf Passwortwiederverwendung für Benutzer ${userId}:`, error);
    throw error;
  }
};

/**
 * Passwort ändern mit Validierung gegen Richtlinien
 * @param {number} userId - ID des Benutzers
 * @param {string} oldPassword - Altes Passwort
 * @param {string} newPassword - Neues Passwort
 * @param {Object} clientInfo - Client-Informationen (IP, User-Agent)
 * @param {number} changedByUserId - ID des Benutzers, der die Änderung durchführt
 * @returns {Promise<{success: boolean, message: string}>} Ergebnis der Passwortänderung
 */
const changePassword = async (userId, oldPassword, newPassword, clientInfo, changedByUserId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Benutzer abrufen
    const userQuery = 'SELECT * FROM users WHERE id = $1';
    const userResult = await client.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, message: 'Benutzer nicht gefunden' };
    }

    const user = userResult.rows[0];

    // Altes Passwort überprüfen
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isPasswordValid) {
      await client.query('ROLLBACK');
      return { success: false, message: 'Aktuelles Passwort ist falsch' };
    }

    // Neues Passwort validieren
    const validation = await validatePassword(newPassword);
    if (!validation.valid) {
      await client.query('ROLLBACK');
      return { success: false, message: validation.message };
    }

    // Richtlinie abrufen
    const policy = await getActivePasswordPolicy();

    // Prüfen, ob das Passwort bereits verwendet wurde
    if (policy.prevent_reuse_count > 0) {
      const passwordUsed = await isPasswordUsed(userId, newPassword);
      if (passwordUsed) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: `Dieses Passwort wurde bereits in der Vergangenheit verwendet. Bitte wählen Sie ein anderes Passwort.`
        };
      }
    }

    // Passwort hashen
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Passwort-Historie aktualisieren
    let passwordHistory = user.password_history || [];
    passwordHistory.push(user.password_hash); // Aktuelles Passwort zur Historie hinzufügen

    // Größe der Historie begrenzen
    while (passwordHistory.length > policy.prevent_reuse_count) {
      passwordHistory.shift(); // Ältesten Eintrag entfernen
    }

    // Berechnen des Ablaufdatums
    const passwordExpiresAt = policy.password_expiry_days > 0
      ? new Date(Date.now() + policy.password_expiry_days * 24 * 60 * 60 * 1000)
      : null;

    // Benutzer aktualisieren
    const updateQuery = `
      UPDATE users SET
        password_hash = $1,
        password_history = $2,
        password_changed_at = NOW(),
        password_expires_at = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING id
    `;

    await client.query(updateQuery, [
      newPasswordHash,
      passwordHistory,
      passwordExpiresAt,
      userId
    ]);

    // Passwortänderung protokollieren
    const changedByUser = changedByUserId === userId ? user : await getUserById(changedByUserId);
    const logQuery = `
      INSERT INTO password_change_log (
        user_id, username, action, changed_by_user_id,
        changed_by_username, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await client.query(logQuery, [
      userId,
      user.username,
      'change',
      changedByUserId,
      changedByUser.username,
      clientInfo.ip,
      clientInfo.userAgent
    ]);

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Passwort erfolgreich geändert',
      passwordExpiresAt
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Fehler beim Ändern des Passworts für Benutzer ${userId}:`, error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Passwort-Reset-Token erstellen
 * @param {string} email - E-Mail des Benutzers
 * @param {Object} clientInfo - Client-Informationen (IP, User-Agent)
 * @returns {Promise<{success: boolean, message: string, token?: string}>} Ergebnis des Token-Erstellen
 */
const createPasswordResetToken = async (email, clientInfo) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Benutzer per E-Mail finden
    const userQuery = 'SELECT * FROM users WHERE email = $1 AND active = TRUE';
    const userResult = await client.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, message: 'Kein aktiver Benutzer mit dieser E-Mail gefunden' };
    }

    const user = userResult.rows[0];

    // Token generieren
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Stunden gültig

    // Token in der Datenbank speichern
    const updateQuery = `
      UPDATE users SET
        password_reset_token = $1,
        password_reset_expires_at = $2
      WHERE id = $3
    `;

    await client.query(updateQuery, [token, expiresAt, user.id]);

    // Ereignis protokollieren
    const logQuery = `
      INSERT INTO password_change_log (
        user_id, username, action, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5)
    `;

    await client.query(logQuery, [
      user.id,
      user.username,
      'reset_requested',
      clientInfo.ip,
      clientInfo.userAgent
    ]);

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Passwort-Reset-Token erfolgreich erstellt',
      token,
      expiresAt
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Fehler beim Erstellen des Passwort-Reset-Tokens:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Passwort mit Token zurücksetzen
 * @param {string} token - Das Reset-Token
 * @param {string} newPassword - Das neue Passwort
 * @param {Object} clientInfo - Client-Informationen (IP, User-Agent)
 * @returns {Promise<{success: boolean, message: string}>} Ergebnis des Zurücksetzens
 */
const resetPasswordWithToken = async (token, newPassword, clientInfo) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Benutzer mit diesem Token finden
    const userQuery = `
      SELECT * FROM users
      WHERE password_reset_token = $1
      AND password_reset_expires_at > NOW()
      AND active = TRUE
    `;

    const userResult = await client.query(userQuery, [token]);

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, message: 'Ungültiger oder abgelaufener Token' };
    }

    const user = userResult.rows[0];

    // Neues Passwort validieren
    const validation = await validatePassword(newPassword);
    if (!validation.valid) {
      await client.query('ROLLBACK');
      return { success: false, message: validation.message };
    }

    // Richtlinie abrufen
    const policy = await getActivePasswordPolicy();

    // Prüfen, ob das Passwort bereits verwendet wurde
    if (policy.prevent_reuse_count > 0) {
      const passwordUsed = await isPasswordUsed(user.id, newPassword);
      if (passwordUsed) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: `Dieses Passwort wurde bereits in der Vergangenheit verwendet. Bitte wählen Sie ein anderes Passwort.`
        };
      }
    }

    // Passwort hashen
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Passwort-Historie aktualisieren
    let passwordHistory = user.password_history || [];
    passwordHistory.push(user.password_hash); // Aktuelles Passwort zur Historie hinzufügen

    // Größe der Historie begrenzen
    while (passwordHistory.length > policy.prevent_reuse_count) {
      passwordHistory.shift(); // Ältesten Eintrag entfernen
    }

    // Berechnen des Ablaufdatums
    const passwordExpiresAt = policy.password_expiry_days > 0
      ? new Date(Date.now() + policy.password_expiry_days * 24 * 60 * 60 * 1000)
      : null;

    // Benutzer aktualisieren
    const updateQuery = `
      UPDATE users SET
        password_hash = $1,
        password_history = $2,
        password_changed_at = NOW(),
        password_expires_at = $3,
        password_reset_token = NULL,
        password_reset_expires_at = NULL,
        updated_at = NOW()
      WHERE id = $4
    `;

    await client.query(updateQuery, [
      newPasswordHash,
      passwordHistory,
      passwordExpiresAt,
      user.id
    ]);

    // Passwortänderung protokollieren
    const logQuery = `
      INSERT INTO password_change_log (
        user_id, username, action, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5)
    `;

    await client.query(logQuery, [
      user.id,
      user.username,
      'reset_completed',
      clientInfo.ip,
      clientInfo.userAgent
    ]);

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Passwort erfolgreich zurückgesetzt'
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Fehler beim Zurücksetzen des Passworts mit Token:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Fehlgeschlagenen Login-Versuch protokollieren und Kontosperre prüfen
 * @param {number} userId - ID des Benutzers
 * @param {string} username - Benutzername
 * @param {Object} clientInfo - Client-Informationen (IP, User-Agent)
 * @returns {Promise<{accountLocked: boolean, lockedUntil: Date|null}>}
 */
const recordFailedLoginAttempt = async (userId, username, clientInfo) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Richtlinie abrufen
    const policy = await getActivePasswordPolicy();

    // Fehlgeschlagene Versuche inkrementieren
    const updateQuery = `
      UPDATE users SET
        failed_login_attempts = failed_login_attempts + 1
      WHERE id = $1
      RETURNING failed_login_attempts
    `;

    const updateResult = await client.query(updateQuery, [userId]);
    const failedAttempts = updateResult.rows[0].failed_login_attempts;

    // Wenn maximale Anzahl erreicht, Konto sperren
    let accountLocked = false;
    let lockedUntil = null;

    if (failedAttempts >= policy.max_failed_attempts) {
      lockedUntil = new Date(Date.now() + policy.lockout_duration_minutes * 60 * 1000);

      const lockQuery = `
        UPDATE users SET
          account_locked_until = $1
        WHERE id = $2
      `;

      await client.query(lockQuery, [lockedUntil, userId]);
      accountLocked = true;
    }

    // Fehlgeschlagenen Login protokollieren
    const logQuery = `
      INSERT INTO auth_log (
        user_id, username, action, ip_address, user_agent, success, failure_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await client.query(logQuery, [
      userId,
      username,
      'failed_login',
      clientInfo.ip,
      clientInfo.userAgent,
      false,
      accountLocked ? 'Konto gesperrt nach zu vielen fehlgeschlagenen Versuchen' : 'Falsches Passwort'
    ]);

    await client.query('COMMIT');

    return {
      accountLocked,
      lockedUntil
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Fehler beim Protokollieren des fehlgeschlagenen Logins für Benutzer ${userId}:`, error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Erfolgreichen Login protokollieren und Zähler zurücksetzen
 * @param {number} userId - ID des Benutzers
 * @param {string} username - Benutzername
 * @param {Object} clientInfo - Client-Informationen (IP, User-Agent)
 */
const recordSuccessfulLogin = async (userId, username, clientInfo) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Fehlgeschlagene Versuche zurücksetzen und letzten Login aktualisieren
    const updateQuery = `
      UPDATE users SET
        failed_login_attempts = 0,
        account_locked_until = NULL,
        last_login = NOW()
      WHERE id = $1
    `;

    await client.query(updateQuery, [userId]);

    // Login protokollieren
    const logQuery = `
      INSERT INTO auth_log (
        user_id, username, action, ip_address, user_agent, success
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await client.query(logQuery, [
      userId,
      username,
      'login',
      clientInfo.ip,
      clientInfo.userAgent,
      true
    ]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Fehler beim Protokollieren des erfolgreichen Logins für Benutzer ${userId}:`, error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Prüfen, ob ein Passwort abgelaufen ist
 * @param {number} userId - ID des Benutzers
 * @returns {Promise<{expired: boolean, expiresAt: Date|null}>}
 */
const isPasswordExpired = async (userId) => {
  try {
    const query = `
      SELECT password_expires_at FROM users
      WHERE id = $1
    `;

    const { rows } = await pool.query(query, [userId]);

    if (rows.length === 0) {
      throw new Error('Benutzer nicht gefunden');
    }

    const expiresAt = rows[0].password_expires_at;

    if (!expiresAt) {
      return { expired: false, expiresAt: null };
    }

    const expired = new Date(expiresAt) < new Date();

    return {
      expired,
      expiresAt
    };
  } catch (error) {
    logger.error(`Fehler beim Prüfen des Passwortablaufs für Benutzer ${userId}:`, error);
    throw error;
  }
};

/**
 * Hilfsfunktion zum Abrufen eines Benutzers anhand seiner ID
 * @param {number} userId - Benutzer-ID
 * @returns {Promise<Object|null>} - Benutzerobjekt oder null
 */
const getUserById = async (userId) => {
  try {
    const query = 'SELECT id, username FROM users WHERE id = $1';
    const { rows } = await pool.query(query, [userId]);
    return rows.length ? rows[0] : null;
  } catch (error) {
    logger.error(`Fehler beim Abrufen des Benutzers mit ID ${userId}:`, error);
    throw error;
  }
};

module.exports = {
  getActivePasswordPolicy,
  validatePassword,
  isPasswordUsed,
  changePassword,
  createPasswordResetToken,
  resetPasswordWithToken,
  recordFailedLoginAttempt,
  recordSuccessfulLogin,
  isPasswordExpired
};
