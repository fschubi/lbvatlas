const db = require('../db');
const logger = require('../utils/logger');

/**
 * Alle Benutzergruppen abrufen
 * @param {Object} req - Express Request Objekt
 * @param {Object} res - Express Response Objekt
 */
exports.getAllGroups = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        ug.*,
        (SELECT COUNT(*) FROM user_group_members WHERE group_id = ug.id) as user_count
      FROM
        user_groups ug
      ORDER BY
        ug.name
    `);

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Benutzergruppen:', error);
    return res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Benutzergruppen',
      error: error.message
    });
  }
};

/**
 * Benutzergruppe nach ID abrufen
 * @param {Object} req - Express Request Objekt
 * @param {Object} res - Express Response Objekt
 */
exports.getGroupById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(`
      SELECT
        ug.*,
        (SELECT COUNT(*) FROM user_group_members WHERE group_id = ug.id) as user_count
      FROM
        user_groups ug
      WHERE
        ug.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Benutzergruppe nicht gefunden'
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Benutzergruppe mit ID ${id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Benutzergruppe',
      error: error.message
    });
  }
};

/**
 * Benutzergruppe nach Namen abrufen
 * @param {Object} req - Express Request Objekt
 * @param {Object} res - Express Response Objekt
 */
exports.getGroupByName = async (req, res) => {
  const { name } = req.params;

  try {
    const result = await db.query(`
      SELECT
        ug.*,
        (SELECT COUNT(*) FROM user_group_members WHERE group_id = ug.id) as user_count
      FROM
        user_groups ug
      WHERE
        ug.name ILIKE $1
    `, [name]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Benutzergruppe nicht gefunden'
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Benutzergruppe mit Namen ${name}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Benutzergruppe',
      error: error.message
    });
  }
};

/**
 * Neue Benutzergruppe erstellen
 * @param {Object} req - Express Request Objekt
 * @param {Object} res - Express Response Objekt
 */
exports.createGroup = async (req, res) => {
  const { name, description } = req.body;
  const created_by = req.user.id;

  // Validierung
  if (!name || name.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Der Gruppenname ist erforderlich'
    });
  }

  try {
    // Prüfen, ob Gruppe mit diesem Namen bereits existiert
    const existingGroup = await db.query('SELECT id FROM user_groups WHERE name = $1', [name]);
    if (existingGroup.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Eine Gruppe mit diesem Namen existiert bereits'
      });
    }

    // Neue Gruppe erstellen
    const result = await db.query(
      'INSERT INTO user_groups (name, description, created_by) VALUES ($1, $2, $3) RETURNING *',
      [name, description, created_by]
    );

    return res.status(201).json({
      success: true,
      message: 'Benutzergruppe erfolgreich erstellt',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Fehler beim Erstellen der Benutzergruppe:', error);
    return res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Benutzergruppe',
      error: error.message
    });
  }
};

/**
 * Benutzergruppe aktualisieren
 * @param {Object} req - Express Request Objekt
 * @param {Object} res - Express Response Objekt
 */
exports.updateGroup = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  // Validierung
  if (!name || name.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Der Gruppenname ist erforderlich'
    });
  }

  try {
    // Prüfen, ob Gruppe existiert
    const groupExists = await db.query('SELECT id FROM user_groups WHERE id = $1', [id]);
    if (groupExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Benutzergruppe nicht gefunden'
      });
    }

    // Prüfen, ob Name bereits von einer anderen Gruppe verwendet wird
    const existingGroup = await db.query('SELECT id FROM user_groups WHERE name = $1 AND id != $2', [name, id]);
    if (existingGroup.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Eine andere Gruppe mit diesem Namen existiert bereits'
      });
    }

    // Gruppe aktualisieren
    const result = await db.query(
      'UPDATE user_groups SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Benutzergruppe erfolgreich aktualisiert',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren der Benutzergruppe mit ID ${id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Benutzergruppe',
      error: error.message
    });
  }
};

/**
 * Benutzergruppe löschen
 * @param {Object} req - Express Request Objekt
 * @param {Object} res - Express Response Objekt
 */
exports.deleteGroup = async (req, res) => {
  const { id } = req.params;

  try {
    // Prüfen, ob Gruppe existiert
    const groupExists = await db.query('SELECT id FROM user_groups WHERE id = $1', [id]);
    if (groupExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Benutzergruppe nicht gefunden'
      });
    }

    // Gruppe löschen (Mitgliedschaften werden aufgrund von CASCADE automatisch gelöscht)
    await db.query('DELETE FROM user_groups WHERE id = $1', [id]);

    return res.status(200).json({
      success: true,
      message: 'Benutzergruppe erfolgreich gelöscht'
    });
  } catch (error) {
    logger.error(`Fehler beim Löschen der Benutzergruppe mit ID ${id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Benutzergruppe',
      error: error.message
    });
  }
};

/**
 * Mitglieder einer Benutzergruppe abrufen
 * @param {Object} req - Express Request Objekt
 * @param {Object} res - Express Response Objekt
 */
exports.getGroupMembers = async (req, res) => {
  const { id } = req.params;

  try {
    // Prüfen, ob Gruppe existiert
    const groupExists = await db.query('SELECT id FROM user_groups WHERE id = $1', [id]);
    if (groupExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Benutzergruppe nicht gefunden'
      });
    }

    // Gruppenmitglieder abrufen
    const result = await db.query(`
      SELECT
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.email,
        ugm.added_at,
        (SELECT CONCAT(us.first_name, ' ', us.last_name) FROM users us WHERE us.id = ugm.added_by) as added_by
      FROM
        users u
      JOIN
        user_group_members ugm ON u.id = ugm.user_id
      WHERE
        ugm.group_id = $1
      ORDER BY
        u.last_name, u.first_name
    `, [id]);

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Mitglieder für Gruppe mit ID ${id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Gruppenmitglieder',
      error: error.message
    });
  }
};

/**
 * Mehrere Benutzer zu einer Gruppe hinzufügen
 * @param {Object} req - Express Request Objekt
 * @param {Object} res - Express Response Objekt
 */
exports.addUsersToGroup = async (req, res) => {
  const { id } = req.params;
  const { userIds } = req.body;
  const added_by = req.user.id;

  // DEBUG: Zeige den Inhalt der Anfrage an
  console.log('[DEBUG addUsersToGroup] Request body:', JSON.stringify(req.body));
  console.log('[DEBUG addUsersToGroup] userIds:', userIds);
  console.log('[DEBUG addUsersToGroup] params id:', id);
  console.log('[DEBUG addUsersToGroup] user id:', added_by);

  // Validierung
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Benutzerliste ist erforderlich'
    });
  }

  try {
    // Prüfen, ob Gruppe existiert
    const groupExists = await db.query('SELECT id FROM user_groups WHERE id = $1', [id]);
    if (groupExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Benutzergruppe nicht gefunden'
      });
    }

    // Benutzer zu Gruppe hinzufügen (ignoriere Duplikate)
    const values = userIds.map(userId => `(${id}, ${userId}, ${added_by})`).join(', ');

    await db.query(`
      INSERT INTO user_group_members (group_id, user_id, added_by)
      VALUES ${values}
      ON CONFLICT (group_id, user_id) DO NOTHING
    `);

    return res.status(200).json({
      success: true,
      message: 'Benutzer erfolgreich zur Gruppe hinzugefügt'
    });
  } catch (error) {
    logger.error(`Fehler beim Hinzufügen von Benutzern zur Gruppe mit ID ${id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Fehler beim Hinzufügen von Benutzern zur Gruppe',
      error: error.message
    });
  }
};

/**
 * Einen Benutzer zu einer Gruppe hinzufügen
 * @param {Object} req - Express Request Objekt
 * @param {Object} res - Express Response Objekt
 */
exports.addUserToGroup = async (req, res) => {
  const { id, userId } = req.params;
  const added_by = req.user.id;

  // DEBUG: Zeige den Inhalt der Anfrage an
  console.log('[DEBUG addUserToGroup] Request params:', { id, userId });
  console.log('[DEBUG addUserToGroup] user id:', added_by);

  // Konvertiere userId zu einem Integer
  const userIdInt = parseInt(userId, 10);
  if (isNaN(userIdInt)) {
    return res.status(400).json({
      success: false,
      message: 'Ungültige Benutzer-ID: Muss eine Zahl sein'
    });
  }

  try {
    // Prüfen, ob Gruppe existiert
    const groupExists = await db.query('SELECT id FROM user_groups WHERE id = $1', [id]);
    if (groupExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Benutzergruppe nicht gefunden'
      });
    }

    // Prüfen, ob Benutzer existiert
    const userExists = await db.query('SELECT id FROM users WHERE id = $1', [userIdInt]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    console.log('[DEBUG addUserToGroup] Executing query to add user', userIdInt, 'to group', id);

    // Benutzer zu Gruppe hinzufügen, falls noch nicht Mitglied
    await db.query(`
      INSERT INTO user_group_members (group_id, user_id, added_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (group_id, user_id) DO NOTHING
    `, [id, userIdInt, added_by]);

    return res.status(200).json({
      success: true,
      message: 'Benutzer erfolgreich zur Gruppe hinzugefügt'
    });
  } catch (error) {
    logger.error(`Fehler beim Hinzufügen des Benutzers ${userId} zur Gruppe ${id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Fehler beim Hinzufügen des Benutzers zur Gruppe',
      error: error.message
    });
  }
};

/**
 * Einen Benutzer aus einer Gruppe entfernen
 * @param {Object} req - Express Request Objekt
 * @param {Object} res - Express Response Objekt
 */
exports.removeUserFromGroup = async (req, res) => {
  const { id, userId } = req.params;

  try {
    // Prüfen, ob Gruppe existiert
    const groupExists = await db.query('SELECT id FROM user_groups WHERE id = $1', [id]);
    if (groupExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Benutzergruppe nicht gefunden'
      });
    }

    // Benutzer aus Gruppe entfernen
    await db.query('DELETE FROM user_group_members WHERE group_id = $1 AND user_id = $2', [id, userId]);

    return res.status(200).json({
      success: true,
      message: 'Benutzer erfolgreich aus der Gruppe entfernt'
    });
  } catch (error) {
    logger.error(`Fehler beim Entfernen des Benutzers ${userId} aus der Gruppe ${id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Fehler beim Entfernen des Benutzers aus der Gruppe',
      error: error.message
    });
  }
};

/**
 * Mehrere Benutzer aus einer Gruppe entfernen
 * @param {Object} req - Express Request Objekt
 * @param {Object} res - Express Response Objekt
 */
exports.removeUsersFromGroup = async (req, res) => {
  const { id } = req.params;
  const { userIds } = req.body;

  // Validierung
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Benutzerliste ist erforderlich'
    });
  }

  try {
    // Prüfen, ob Gruppe existiert
    const groupExists = await db.query('SELECT id FROM user_groups WHERE id = $1', [id]);
    if (groupExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Benutzergruppe nicht gefunden'
      });
    }

    // Benutzer aus Gruppe entfernen
    await db.query('DELETE FROM user_group_members WHERE group_id = $1 AND user_id = ANY($2)', [id, userIds]);

    return res.status(200).json({
      success: true,
      message: 'Benutzer erfolgreich aus der Gruppe entfernt'
    });
  } catch (error) {
    logger.error(`Fehler beim Entfernen von Benutzern aus der Gruppe ${id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Fehler beim Entfernen von Benutzern aus der Gruppe',
      error: error.message
    });
  }
};

/**
 * Benutzergruppen durchsuchen
 * @param {Object} req - Express Request Objekt
 * @param {Object} res - Express Response Objekt
 */
exports.searchGroups = async (req, res) => {
  const { searchTerm } = req.query;

  if (!searchTerm) {
    return exports.getAllGroups(req, res);
  }

  try {
    const result = await db.query(`
      SELECT
        ug.*,
        (SELECT COUNT(*) FROM user_group_members WHERE group_id = ug.id) as user_count
      FROM
        user_groups ug
      WHERE
        ug.name ILIKE $1 OR
        ug.description ILIKE $1
      ORDER BY
        ug.name
    `, [`%${searchTerm}%`]);

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error(`Fehler bei der Suche nach Benutzergruppen mit Term '${searchTerm}':`, error);
    return res.status(500).json({
      success: false,
      message: 'Fehler bei der Suche nach Benutzergruppen',
      error: error.message
    });
  }
};

/**
 * Mitglieder einer Benutzergruppe durchsuchen
 * @param {Object} req - Express Request Objekt
 * @param {Object} res - Express Response Objekt
 */
exports.searchGroupMembers = async (req, res) => {
  const { id } = req.params;
  const { searchTerm } = req.query;

  if (!searchTerm) {
    return exports.getGroupMembers(req, res);
  }

  try {
    // Prüfen, ob Gruppe existiert
    const groupExists = await db.query('SELECT id FROM user_groups WHERE id = $1', [id]);
    if (groupExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Benutzergruppe nicht gefunden'
      });
    }

    // Nach Gruppenmitgliedern suchen
    const result = await db.query(`
      SELECT
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.email,
        ugm.added_at,
        (SELECT CONCAT(us.first_name, ' ', us.last_name) FROM users us WHERE us.id = ugm.added_by) as added_by
      FROM
        users u
      JOIN
        user_group_members ugm ON u.id = ugm.user_id
      WHERE
        ugm.group_id = $1 AND
        (
          u.username ILIKE $2 OR
          u.first_name ILIKE $2 OR
          u.last_name ILIKE $2 OR
          u.email ILIKE $2 OR
          CONCAT(u.first_name, ' ', u.last_name) ILIKE $2
        )
      ORDER BY
        u.last_name, u.first_name
    `, [id, `%${searchTerm}%`]);

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error(`Fehler bei der Suche nach Mitgliedern der Gruppe ${id} mit Term '${searchTerm}':`, error);
    return res.status(500).json({
      success: false,
      message: 'Fehler bei der Suche nach Gruppenmitgliedern',
      error: error.message
    });
  }
};
