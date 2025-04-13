/**
 * Datenbankverbindung für die ATLAS-Anwendung
 *
 * Diese Datei stellt eine PostgreSQL-Datenbankverbindung bereit
 * und ermöglicht den Zugriff auf die Datenbank.
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');
const logger = require('./utils/logger');

// Lade Umgebungsvariablen
dotenv.config();

// Konfiguriere PostgreSQL-Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'atlas',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20, // Maximale Anzahl von Clients im Pool
  idleTimeoutMillis: 30000, // Zeit in Millisekunden, die ein Client inaktiv im Pool bleibt
  connectionTimeoutMillis: 2000 // Zeit in Millisekunden, bevor ein Timeout auftritt, wenn keine Verbindung hergestellt werden kann
});

// Ein IIFE (Immediately Invoked Function Expression), das eine Testverbindung herstellt
(async () => {
  try {
    const client = await pool.connect();
    logger.info('Verbindung zur Datenbank erfolgreich hergestellt');
    client.release();
  } catch (err) {
    logger.error('Fehler bei der Datenbankverbindung:', err);
  }
})();

// Event-Handler für Verbindungsfehler
pool.on('error', (err) => {
  logger.error('Unerwarteter Fehler im PostgreSQL-Client:', err);
});

/**
 * Führt eine SQL-Abfrage aus
 * @param {string} text - SQL-Abfrage
 * @param {Array} params - Parameter für die Abfrage
 * @returns {Promise<Object>} - Abfrageergebnis
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Abfrage ausgeführt', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Fehler bei der Abfrage', { text, duration, error: error.message });
    throw error;
  }
};

/**
 * Startet eine Transaktion
 * @returns {Promise<Object>} - Transaktions-Client
 */
const beginTransaction = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    logger.debug('Transaktion gestartet');
    return client;
  } catch (error) {
    client.release();
    logger.error('Fehler beim Starten der Transaktion', { error: error.message });
    throw error;
  }
};

/**
 * Führt eine Abfrage innerhalb einer Transaktion aus
 * @param {Object} client - Transaktions-Client
 * @param {string} text - SQL-Abfrage
 * @param {Array} params - Parameter für die Abfrage
 * @returns {Promise<Object>} - Abfrageergebnis
 */
const transactionQuery = async (client, text, params) => {
  const start = Date.now();
  try {
    const res = await client.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Transaktionsabfrage ausgeführt', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Fehler bei der Transaktionsabfrage', { text, duration, error: error.message });
    throw error;
  }
};

/**
 * Führt ein Commit für eine Transaktion durch
 * @param {Object} client - Transaktions-Client
 * @returns {Promise<void>}
 */
const commitTransaction = async (client) => {
  try {
    await client.query('COMMIT');
    logger.debug('Transaktion erfolgreich abgeschlossen');
  } catch (error) {
    logger.error('Fehler beim Abschließen der Transaktion', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Führt ein Rollback für eine Transaktion durch
 * @param {Object} client - Transaktions-Client
 * @returns {Promise<void>}
 */
const rollbackTransaction = async (client) => {
  try {
    await client.query('ROLLBACK');
    logger.debug('Transaktion zurückgerollt');
  } catch (error) {
    logger.error('Fehler beim Zurückrollen der Transaktion', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  query,
  beginTransaction,
  transactionQuery,
  commitTransaction,
  rollbackTransaction,
  pool
};
