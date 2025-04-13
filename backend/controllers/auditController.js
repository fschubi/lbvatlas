/**
 * Audit-Controller für das ATLAS-System
 * Implementiert Funktionen zum Abrufen und Exportieren von Audit-Logs
 */

const { pool } = require('../db');
const logger = require('../utils/logger');

/**
 * Audit-Log mit Filteroptionen abfragen
 */
const getAuditLog = async (req, res) => {
  try {
    // Nur Administratoren dürfen auf Audit-Logs zugreifen
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für diese Aktion'
      });
    }

    // Parameter für Filterung und Paginierung
    const {
      user_id,
      username,
      action,
      entity_type,
      entity_id,
      start_date,
      end_date,
      page = 1,
      limit = 50
    } = req.query;

    // SQL-Abfrage aufbauen
    let query = `
      SELECT a.*, u.username as actor_username
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;

    const values = [];
    let valueIndex = 1;

    // Filter anwenden
    if (user_id) {
      query += ` AND a.user_id = $${valueIndex++}`;
      values.push(user_id);
    }

    if (username) {
      query += ` AND a.username ILIKE $${valueIndex++}`;
      values.push(`%${username}%`);
    }

    if (action) {
      query += ` AND a.action = $${valueIndex++}`;
      values.push(action);
    }

    if (entity_type) {
      query += ` AND a.entity_type = $${valueIndex++}`;
      values.push(entity_type);
    }

    if (entity_id) {
      query += ` AND a.entity_id = $${valueIndex++}`;
      values.push(entity_id);
    }

    if (start_date) {
      query += ` AND a.timestamp >= $${valueIndex++}`;
      values.push(new Date(start_date));
    }

    if (end_date) {
      query += ` AND a.timestamp <= $${valueIndex++}`;
      values.push(new Date(end_date));
    }

    // Gesamtanzahl der Datensätze ermitteln
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS count_query`;
    const countResult = await pool.query(countQuery, values);
    const totalItems = parseInt(countResult.rows[0].count);

    // Sortierung und Paginierung hinzufügen
    query += ` ORDER BY a.timestamp DESC`;
    query += ` LIMIT $${valueIndex++} OFFSET $${valueIndex++}`;

    const offset = (page - 1) * limit;
    values.push(limit, offset);

    // Abfrage ausführen
    const result = await pool.query(query, values);

    // Erfolgreiche Antwort
    res.json({
      success: true,
      data: {
        items: result.rows,
        totalItems,
        page,
        limit
      }
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen des Audit-Logs:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen des Audit-Logs'
    });
  }
};

/**
 * Authentifizierungs-Log mit Filteroptionen abfragen
 */
const getAuthLog = async (req, res) => {
  try {
    // Nur Administratoren dürfen auf Auth-Logs zugreifen
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für diese Aktion'
      });
    }

    // Parameter für Filterung und Paginierung
    const {
      user_id,
      username,
      action,
      start_date,
      end_date,
      success,
      page = 1,
      limit = 50
    } = req.query;

    // SQL-Abfrage aufbauen
    let query = `
      SELECT * FROM auth_log
      WHERE 1=1
    `;

    const values = [];
    let valueIndex = 1;

    // Filter anwenden
    if (user_id) {
      query += ` AND user_id = $${valueIndex++}`;
      values.push(user_id);
    }

    if (username) {
      query += ` AND username ILIKE $${valueIndex++}`;
      values.push(`%${username}%`);
    }

    if (action) {
      query += ` AND action = $${valueIndex++}`;
      values.push(action);
    }

    if (success !== undefined) {
      query += ` AND success = $${valueIndex++}`;
      values.push(success === 'true' || success === '1');
    }

    if (start_date) {
      query += ` AND timestamp >= $${valueIndex++}`;
      values.push(new Date(start_date));
    }

    if (end_date) {
      query += ` AND timestamp <= $${valueIndex++}`;
      values.push(new Date(end_date));
    }

    // Gesamtanzahl der Datensätze ermitteln
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS count_query`;
    const countResult = await pool.query(countQuery, values);
    const totalItems = parseInt(countResult.rows[0].count);

    // Sortierung und Paginierung hinzufügen
    query += ` ORDER BY timestamp DESC`;
    query += ` LIMIT $${valueIndex++} OFFSET $${valueIndex++}`;

    const offset = (page - 1) * limit;
    values.push(limit, offset);

    // Abfrage ausführen
    const result = await pool.query(query, values);

    // Erfolgreiche Antwort
    res.json({
      success: true,
      data: {
        items: result.rows,
        totalItems,
        page,
        limit
      }
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen des Authentifizierungs-Logs:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen des Authentifizierungs-Logs'
    });
  }
};

/**
 * Passwortänderungs-Log mit Filteroptionen abfragen
 */
const getPasswordChangeLog = async (req, res) => {
  try {
    // Nur Administratoren dürfen auf Passwortänderungs-Logs zugreifen
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für diese Aktion'
      });
    }

    // Parameter für Filterung und Paginierung
    const {
      user_id,
      username,
      action,
      changed_by_user_id,
      start_date,
      end_date,
      page = 1,
      limit = 50
    } = req.query;

    // SQL-Abfrage aufbauen
    let query = `
      SELECT * FROM password_change_log
      WHERE 1=1
    `;

    const values = [];
    let valueIndex = 1;

    // Filter anwenden
    if (user_id) {
      query += ` AND user_id = $${valueIndex++}`;
      values.push(user_id);
    }

    if (username) {
      query += ` AND username ILIKE $${valueIndex++}`;
      values.push(`%${username}%`);
    }

    if (action) {
      query += ` AND action = $${valueIndex++}`;
      values.push(action);
    }

    if (changed_by_user_id) {
      query += ` AND changed_by_user_id = $${valueIndex++}`;
      values.push(changed_by_user_id);
    }

    if (start_date) {
      query += ` AND timestamp >= $${valueIndex++}`;
      values.push(new Date(start_date));
    }

    if (end_date) {
      query += ` AND timestamp <= $${valueIndex++}`;
      values.push(new Date(end_date));
    }

    // Gesamtanzahl der Datensätze ermitteln
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS count_query`;
    const countResult = await pool.query(countQuery, values);
    const totalItems = parseInt(countResult.rows[0].count);

    // Sortierung und Paginierung hinzufügen
    query += ` ORDER BY timestamp DESC`;
    query += ` LIMIT $${valueIndex++} OFFSET $${valueIndex++}`;

    const offset = (page - 1) * limit;
    values.push(limit, offset);

    // Abfrage ausführen
    const result = await pool.query(query, values);

    // Erfolgreiche Antwort
    res.json({
      success: true,
      data: {
        items: result.rows,
        totalItems,
        page,
        limit
      }
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen des Passwortänderungs-Logs:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen des Passwortänderungs-Logs'
    });
  }
};

/**
 * Audit-Log als CSV exportieren
 */
const exportAuditLogCSV = async (req, res) => {
  try {
    // Nur Administratoren dürfen Audit-Logs exportieren
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung für diese Aktion'
      });
    }

    // Parameter für Filterung
    const {
      user_id,
      username,
      action,
      entity_type,
      entity_id,
      start_date,
      end_date
    } = req.query;

    // SQL-Abfrage aufbauen
    let query = `
      SELECT
        a.id,
        a.user_id,
        a.username,
        u.username as actor_username,
        a.action,
        a.entity_type,
        a.entity_id,
        a.ip_address,
        a.timestamp,
        a.old_values,
        a.new_values
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;

    const values = [];
    let valueIndex = 1;

    // Filter anwenden
    if (user_id) {
      query += ` AND a.user_id = $${valueIndex++}`;
      values.push(user_id);
    }

    if (username) {
      query += ` AND a.username ILIKE $${valueIndex++}`;
      values.push(`%${username}%`);
    }

    if (action) {
      query += ` AND a.action = $${valueIndex++}`;
      values.push(action);
    }

    if (entity_type) {
      query += ` AND a.entity_type = $${valueIndex++}`;
      values.push(entity_type);
    }

    if (entity_id) {
      query += ` AND a.entity_id = $${valueIndex++}`;
      values.push(entity_id);
    }

    if (start_date) {
      query += ` AND a.timestamp >= $${valueIndex++}`;
      values.push(new Date(start_date));
    }

    if (end_date) {
      query += ` AND a.timestamp <= $${valueIndex++}`;
      values.push(new Date(end_date));
    }

    // Sortierung hinzufügen
    query += ` ORDER BY a.timestamp DESC`;

    // Abfrage ausführen
    const result = await pool.query(query, values);

    // CSV-Header setzen
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit_log.csv');

    // CSV-Header-Zeile
    res.write('ID,User ID,Username,Actor Username,Action,Entity Type,Entity ID,IP Address,Timestamp,Old Values,New Values\n');

    // CSV-Daten schreiben
    result.rows.forEach((row) => {
      const oldValues = row.old_values ? JSON.stringify(row.old_values).replace(/"/g, '""') : '';
      const newValues = row.new_values ? JSON.stringify(row.new_values).replace(/"/g, '""') : '';

      res.write(`${row.id},${row.user_id},"${row.username}","${row.actor_username}","${row.action}","${row.entity_type}",${row.entity_id},"${row.ip_address}","${row.timestamp}","${oldValues}","${newValues}"\n`);
    });

    res.end();
  } catch (error) {
    logger.error('Fehler beim Exportieren des Audit-Logs:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Exportieren des Audit-Logs'
    });
  }
};

module.exports = {
  getAuditLog,
  getAuthLog,
  getPasswordChangeLog,
  exportAuditLogCSV
};
