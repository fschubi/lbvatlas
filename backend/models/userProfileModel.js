/**
 * Modell für Benutzerprofile im ATLAS-System
 */

const db = require('../db');
const logger = require('../utils/logger');

/**
 * Benutzerprofil nach Benutzer-ID abrufen
 * @param {number} userId - Benutzer-ID
 * @returns {Promise<Object>} - Benutzerprofil
 */
const getProfileByUserId = async (userId) => {
  try {
    // Prüfen, ob ein Profil existiert
    const checkQuery = `
      SELECT id FROM user_profiles
      WHERE user_id = $1
    `;

    const checkResult = await db.query(checkQuery, [userId]);

    // Falls kein Profil existiert, eins erstellen
    if (checkResult.rows.length === 0) {
      const createQuery = `
        INSERT INTO user_profiles (user_id)
        VALUES ($1)
        RETURNING *
      `;

      const createResult = await db.query(createQuery, [userId]);
      return createResult.rows[0];
    }

    // Profil abrufen
    const query = `
      SELECT *
      FROM user_profiles
      WHERE user_id = $1
    `;

    const result = await db.query(query, [userId]);
    return result.rows[0];
  } catch (error) {
    logger.error(`Fehler beim Abrufen des Profils für Benutzer ${userId}:`, error);
    throw error;
  }
};

/**
 * Benutzerprofil aktualisieren
 * @param {number} userId - Benutzer-ID
 * @param {Object} profileData - Profildaten
 * @returns {Promise<Object>} - Aktualisiertes Benutzerprofil
 */
const updateProfile = async (userId, profileData) => {
  try {
    // Sicherstellen, dass ein Profil existiert
    await getProfileByUserId(userId);

    const { phone, department, position, bio } = profileData;

    const query = `
      UPDATE user_profiles
      SET
        phone = COALESCE($1, phone),
        department = COALESCE($2, department),
        position = COALESCE($3, position),
        bio = COALESCE($4, bio),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $5
      RETURNING *
    `;

    const result = await db.query(query, [phone, department, position, bio, userId]);
    return result.rows[0];
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren des Profils für Benutzer ${userId}:`, error);
    throw error;
  }
};

/**
 * Profilbild aktualisieren
 * @param {number} userId - Benutzer-ID
 * @param {string} profilePicture - Pfad zum Profilbild
 * @returns {Promise<Object>} - Aktualisiertes Benutzerprofil
 */
const updateProfilePicture = async (userId, profilePicture) => {
  try {
    // Sicherstellen, dass ein Profil existiert
    await getProfileByUserId(userId);

    const query = `
      UPDATE user_profiles
      SET
        profile_picture = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
      RETURNING *
    `;

    const result = await db.query(query, [profilePicture, userId]);
    return result.rows[0];
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren des Profilbilds für Benutzer ${userId}:`, error);
    throw error;
  }
};

/**
 * Passwortänderung protokollieren
 * @param {number} userId - Benutzer-ID
 * @returns {Promise<Object>} - Aktualisiertes Benutzerprofil
 */
const logPasswordChange = async (userId) => {
  try {
    // Sicherstellen, dass ein Profil existiert
    await getProfileByUserId(userId);

    const query = `
      UPDATE user_profiles
      SET
        last_password_change = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING *
    `;

    const result = await db.query(query, [userId]);
    return result.rows[0];
  } catch (error) {
    logger.error(`Fehler beim Protokollieren der Passwortänderung für Benutzer ${userId}:`, error);
    throw error;
  }
};

/**
 * Benutzervoreinstellungen nach Benutzer-ID abrufen
 * @param {number} userId - Benutzer-ID
 * @returns {Promise<Object>} - Benutzervoreinstellungen
 */
const getPreferencesByUserId = async (userId) => {
  try {
    // Prüfen, ob Voreinstellungen existieren
    const checkQuery = `
      SELECT id FROM user_preferences
      WHERE user_id = $1
    `;

    const checkResult = await db.query(checkQuery, [userId]);

    // Falls keine Voreinstellungen existieren, welche erstellen
    if (checkResult.rows.length === 0) {
      const createQuery = `
        INSERT INTO user_preferences (user_id)
        VALUES ($1)
        RETURNING *
      `;

      const createResult = await db.query(createQuery, [userId]);
      return createResult.rows[0];
    }

    // Voreinstellungen abrufen
    const query = `
      SELECT *
      FROM user_preferences
      WHERE user_id = $1
    `;

    const result = await db.query(query, [userId]);
    return result.rows[0];
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Voreinstellungen für Benutzer ${userId}:`, error);
    throw error;
  }
};

/**
 * Benutzervoreinstellungen aktualisieren
 * @param {number} userId - Benutzer-ID
 * @param {Object} preferencesData - Voreinstellungsdaten
 * @returns {Promise<Object>} - Aktualisierte Benutzervoreinstellungen
 */
const updatePreferences = async (userId, preferencesData) => {
  try {
    // Sicherstellen, dass Voreinstellungen existieren
    await getPreferencesByUserId(userId);

    const { theme, language, notifications_enabled, email_notifications, dashboard_layout } = preferencesData;

    // Dashboard-Layout muss als JSON gespeichert werden
    let dashboardLayoutJson = null;
    if (dashboard_layout) {
      dashboardLayoutJson = typeof dashboard_layout === 'string'
        ? dashboard_layout
        : JSON.stringify(dashboard_layout);
    }

    const query = `
      UPDATE user_preferences
      SET
        theme = COALESCE($1, theme),
        language = COALESCE($2, language),
        notifications_enabled = COALESCE($3, notifications_enabled),
        email_notifications = COALESCE($4, email_notifications),
        dashboard_layout = COALESCE($5, dashboard_layout),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $6
      RETURNING *
    `;

    const result = await db.query(query, [
      theme,
      language,
      notifications_enabled === undefined ? null : notifications_enabled,
      email_notifications === undefined ? null : email_notifications,
      dashboardLayoutJson,
      userId
    ]);

    return result.rows[0];
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren der Voreinstellungen für Benutzer ${userId}:`, error);
    throw error;
  }
};

module.exports = {
  getProfileByUserId,
  updateProfile,
  updateProfilePicture,
  logPasswordChange,
  getPreferencesByUserId,
  updatePreferences
};
