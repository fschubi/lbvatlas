const db = require('../db');
// const redisClient = require('../redisClient'); // Vorerst auskommentiert

class LabelTemplateModel {

    // Label-Templates abrufen (globale und benutzerspezifische)
    async getLabelTemplates(userId = null) {
        try {
            // Abfrage für globale und benutzerspezifische Vorlagen
            const query = `
                SELECT
                    lt.id,
                    lt.user_id,
                    lt.name,
                    lt.description,
                    lt.settings,
                    lt.is_default,
                    lt.created_at,
                    lt.updated_at,
                    lt.version,
                    u.username as created_by_username
                FROM label_templates lt
                LEFT JOIN users u ON lt.user_id = u.id
                WHERE lt.user_id IS NULL OR lt.user_id = $1
                ORDER BY
                  CASE WHEN lt.user_id IS NULL THEN 1 ELSE 0 END, -- Benutzerspezifische Vorlagen zuerst
                  CASE WHEN lt.is_default = true THEN 0 ELSE 1 END, -- Standardvorlagen zuerst
                  lt.name ASC
            `;

            const result = await db.query(query, [userId]);
            return result.rows;
        } catch (error) {
            console.error('Fehler beim Abrufen der Label-Templates:', error);
            throw error;
        }
    }

    // Label-Template nach ID abrufen
    async getLabelTemplateById(id, userId = null) {
        try {
            /* Vorerst auskommentiert
            // Versuche zuerst, aus dem Cache zu lesen
            const cachedTemplate = await this.getCachedLabelTemplate(id, userId);
            if (cachedTemplate) {
                console.log(`Label-Template ${id} aus Cache geladen.`);
                return cachedTemplate;
            }
            */

            const query = `
                SELECT
                    lt.*,
                    u.username as created_by_username
                FROM label_templates lt
                LEFT JOIN users u ON lt.user_id = u.id
                WHERE lt.id = $1 AND (lt.user_id IS NULL OR lt.user_id = $2)
            `;

            const result = await db.query(query, [id, userId]);

            if (result.rows.length === 0) {
                return null;
            }

            const template = result.rows[0];

            /* Vorerst auskommentiert
            // Ergebnis im Cache speichern (z.B. für 1 Stunde)
            if (redisClient.isReady) {
                const cacheKey = `label_template:${id}:${userId || 'global'}`;
                await redisClient.set(cacheKey, JSON.stringify(template), { EX: 3600 });
                 console.log(`Label-Template ${id} im Cache gespeichert.`);
            }
            */

            return template;
        } catch (error) {
            console.error('Fehler beim Abrufen des Label-Templates:', error);
            throw error;
        }
    }

    // Neues Label-Template erstellen
    async createLabelTemplate(templateData, userId = null) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // Prüfen, ob ein Template mit diesem Namen bereits existiert (global oder für diesen Benutzer)
            const checkQuery = `
                SELECT id FROM label_templates
                WHERE name = $1 AND (user_id IS NULL OR user_id = $2)
            `;
            const existingTemplate = await client.query(checkQuery, [templateData.name, userId]);

            if (existingTemplate.rows.length > 0) {
                throw new Error('Eine Vorlage mit diesem Namen existiert bereits (global oder für Sie).');
            }

            let isDefault = templateData.is_default;

            // Wenn is_default gesetzt ist und true ist, müssen alle anderen Vorlagen dieses Benutzers
            // (oder globale, wenn userId null ist) auf is_default = false gesetzt werden.
            if (isDefault === true) {
                const resetDefaultQuery = `
                    UPDATE label_templates
                    SET is_default = false
                    WHERE ${userId ? 'user_id = $1' : 'user_id IS NULL'}
                `;
                await client.query(resetDefaultQuery, userId ? [userId] : []);
            } else if (isDefault === undefined) {
                // Wenn is_default nicht angegeben ist, prüfe, ob es die erste Vorlage ist.
                const countQuery = `
                    SELECT COUNT(*) as count FROM label_templates
                    WHERE ${userId ? 'user_id = $1' : 'user_id IS NULL'}
                `;
                const countResult = await client.query(countQuery, userId ? [userId] : []);
                isDefault = parseInt(countResult.rows[0].count, 10) === 0;
            }

            const insertQuery = `
                INSERT INTO label_templates (
                    user_id,
                    name,
                    description,
                    settings,
                    is_default,
                    version
                )
                VALUES ($1, $2, $3, $4, $5, 1) -- Starte mit Version 1
                RETURNING *
            `;

            const values = [
                userId,
                templateData.name,
                templateData.description || null,
                JSON.stringify(templateData.settings || {}),
                isDefault,
            ];

            const result = await client.query(insertQuery, values);
            const newTemplate = result.rows[0];

            // Erste Version in die Historie schreiben
            await this._saveVersion(client, newTemplate, userId);

            await client.query('COMMIT');

            /* Vorerst auskommentiert
            // Cache leeren nach Erstellung
            await this._clearCache(newTemplate.id, userId);
            */

            return newTemplate;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Fehler beim Erstellen des Label-Templates:', error);
            if (error.message.includes('existiert bereits')) {
                 throw error; // Fehler weitergeben
            }
            throw new Error('Label-Template konnte nicht erstellt werden.');
        } finally {
            client.release();
        }
    }

    // Label-Template aktualisieren
    async updateLabelTemplate(id, templateData, userId = null) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // Aktuelles Template abrufen, um Berechtigung und Version zu prüfen
            const currentTemplateResult = await client.query(
                 `SELECT * FROM label_templates WHERE id = $1 AND (user_id IS NULL OR user_id = $2)`,
                 [id, userId]
            );

            if (currentTemplateResult.rows.length === 0) {
                 throw new Error('Vorlage nicht gefunden oder keine Berechtigung.');
            }
            const currentTemplate = currentTemplateResult.rows[0];

            // Prüfen auf Namenskonflikt (außer mit sich selbst)
            if (templateData.name && templateData.name !== currentTemplate.name) {
                const checkQuery = `
                    SELECT id FROM label_templates
                    WHERE name = $1 AND (user_id IS NULL OR user_id = $2) AND id != $3
                `;
                const existingTemplate = await client.query(checkQuery, [templateData.name, userId, id]);
                if (existingTemplate.rows.length > 0) {
                    throw new Error('Eine andere Vorlage mit diesem Namen existiert bereits.');
                }
            }

            // Wenn is_default geändert wird
            if (templateData.is_default === true && currentTemplate.is_default === false) {
                const resetDefaultQuery = `
                    UPDATE label_templates
                    SET is_default = false
                    WHERE id != $1 AND (${userId ? 'user_id = $2' : 'user_id IS NULL'})
                `;
                await client.query(resetDefaultQuery, userId ? [id, userId] : [id]);
            } else if (templateData.is_default === false && currentTemplate.is_default === true) {
                 // Verhindern, dass die letzte Standardvorlage deaktiviert wird?
                 // Oder eine andere zur Standard machen? - Aktuell: Erlaubt
            }

            const newVersion = currentTemplate.version + 1;

            const updateQuery = `
                UPDATE label_templates
                SET
                    name = COALESCE($1, name),
                    description = COALESCE($2, description),
                    settings = COALESCE($3, settings),
                    is_default = COALESCE($4, is_default),
                    version = $5, -- Version erhöhen
                    updated_at = NOW()
                WHERE id = $6
                RETURNING *
            `;

            const values = [
                templateData.name,
                templateData.description,
                templateData.settings ? JSON.stringify(templateData.settings) : undefined, // Nur aktualisieren, wenn vorhanden
                templateData.is_default,
                newVersion,
                id
            ];

            // Filtere undefined Werte heraus, damit COALESCE korrekt funktioniert
            const filteredValues = values.filter(v => v !== undefined);
            const placeholders = values.map((v, i) => v !== undefined ? `$${filteredValues.indexOf(v) + 1}` : null).filter(p => p !== null);

            // Baue die SET-Klausel dynamisch auf Basis der übergebenen Werte
            const setClauses = [];
            const updateValues = [];
            let valueIndex = 1;
            if (templateData.name !== undefined) { setClauses.push(`name = $${valueIndex++}`); updateValues.push(templateData.name); }
            if (templateData.description !== undefined) { setClauses.push(`description = $${valueIndex++}`); updateValues.push(templateData.description); }
            if (templateData.settings !== undefined) { setClauses.push(`settings = $${valueIndex++}`); updateValues.push(JSON.stringify(templateData.settings)); }
            if (templateData.is_default !== undefined) { setClauses.push(`is_default = $${valueIndex++}`); updateValues.push(templateData.is_default); }

            if (setClauses.length === 0) {
                 // Nichts zu aktualisieren, außer Zeitstempel und Version?
                 // Oder Fehler werfen? Aktuell: Nur Zeitstempel/Version updaten
                 setClauses.push('updated_at = NOW()');
                 setClauses.push(`version = $${valueIndex++}`);
                 updateValues.push(newVersion);
            } else {
                 setClauses.push(`version = $${valueIndex++}`); updateValues.push(newVersion);
                 setClauses.push('updated_at = NOW()');
            }

            const finalUpdateQuery = `UPDATE label_templates SET ${setClauses.join(', ')} WHERE id = $${valueIndex++} RETURNING *`;
            updateValues.push(id);

            const result = await client.query(finalUpdateQuery, updateValues);
            const updatedTemplate = result.rows[0];

            // Neue Version in die Historie schreiben
            await this._saveVersion(client, updatedTemplate, userId);

            await client.query('COMMIT');

            /* Vorerst auskommentiert
            // Cache leeren nach Update
            await this._clearCache(id, userId);
            */

            return updatedTemplate;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Fehler beim Aktualisieren des Label-Templates:', error);
             if (error.message.includes('existiert bereits') || error.message.includes('nicht gefunden')) {
                 throw error; // Fehler weitergeben
            }
            throw new Error('Label-Template konnte nicht aktualisiert werden.');
        } finally {
            client.release();
        }
    }

    // Label-Template löschen
    async deleteLabelTemplate(id, userId = null) {
         const client = await db.getClient();
        try {
             await client.query('BEGIN');

            // Prüfen, ob das Template existiert und dem Benutzer gehört (oder global ist)
            const checkQuery = `SELECT id, is_default, user_id FROM label_templates WHERE id = $1 AND (user_id IS NULL OR user_id = $2)`;
            const checkResult = await client.query(checkQuery, [id, userId]);

            if (checkResult.rows.length === 0) {
                throw new Error('Vorlage nicht gefunden oder keine Berechtigung.');
            }

            const templateToDelete = checkResult.rows[0];

             // Wenn es die Standardvorlage ist, muss eine andere zur Standard gemacht werden (falls möglich)
            if (templateToDelete.is_default) {
                const findNextDefaultQuery = `
                    SELECT id FROM label_templates
                    WHERE id != $1 AND (${templateToDelete.user_id ? 'user_id = $2' : 'user_id IS NULL'})
                    ORDER BY created_at ASC
                    LIMIT 1
                `;
                const nextDefaultResult = await client.query(findNextDefaultQuery, templateToDelete.user_id ? [id, templateToDelete.user_id] : [id]);

                if (nextDefaultResult.rows.length > 0) {
                    const nextDefaultId = nextDefaultResult.rows[0].id;
                    await client.query('UPDATE label_templates SET is_default = true WHERE id = $1', [nextDefaultId]);
                } else {
                    // Keine andere Vorlage vorhanden, die Standard werden kann. Was tun?
                    // Option 1: Löschen verhindern -> Fehler werfen
                    // Option 2: Löschen erlauben, aber es gibt dann keine Standardvorlage mehr
                    // Aktuelle Implementierung: Option 2 (Löschen erlauben)
                     console.warn(`Letzte Standardvorlage (ID: ${id}) für ${templateToDelete.user_id ? 'Benutzer ' + templateToDelete.user_id : 'global'} wird gelöscht.`);
                }
            }

            // Zuerst die Versionen löschen
            await client.query('DELETE FROM label_template_versions WHERE template_id = $1', [id]);

            // Dann das Template löschen
            const deleteQuery = `DELETE FROM label_templates WHERE id = $1`;
            const result = await client.query(deleteQuery, [id]);

             await client.query('COMMIT');

            /* Vorerst auskommentiert
            // Cache leeren nach Löschen
            await this._clearCache(id, userId);
            */

            return result.rowCount > 0;
        } catch (error) {
             await client.query('ROLLBACK');
            console.error('Fehler beim Löschen des Label-Templates:', error);
             if (error.message.includes('nicht gefunden')) {
                 throw error; // Fehler weitergeben
            }
            throw new Error('Label-Template konnte nicht gelöscht werden.');
        } finally {
             client.release();
        }
    }

    // Versionen eines Label-Templates abrufen
    async getLabelTemplateVersions(templateId, userId = null) {
        try {
            // Sicherstellen, dass der Benutzer Zugriff auf das Haupttemplate hat
            const accessCheck = await this.getLabelTemplateById(templateId, userId);
            if (!accessCheck) {
                 throw new Error('Vorlage nicht gefunden oder keine Berechtigung.');
            }

            const query = `
                SELECT v.*, u.username as saved_by_username
                FROM label_template_versions v
                LEFT JOIN users u ON v.saved_by_user_id = u.id
                WHERE v.template_id = $1
                ORDER BY v.version DESC
            `;
            const result = await db.query(query, [templateId]);
            return result.rows;
        } catch (error) {
            console.error('Fehler beim Abrufen der Label-Template-Versionen:', error);
            throw error;
        }
    }

    // Auf eine bestimmte Version eines Label-Templates zurücksetzen
    async revertToLabelTemplateVersion(templateId, versionId, userId = null) {
         const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // Sicherstellen, dass der Benutzer Zugriff auf das Haupttemplate hat
            const accessCheck = await client.query(
                `SELECT id, user_id FROM label_templates WHERE id = $1 AND (user_id IS NULL OR user_id = $2)`,
                [templateId, userId]
            );
            if (accessCheck.rows.length === 0) {
                 throw new Error('Vorlage nicht gefunden oder keine Berechtigung.');
            }

            // Die spezifische Version aus der Historie holen
            const versionQuery = `SELECT * FROM label_template_versions WHERE id = $1 AND template_id = $2`;
            const versionResult = await client.query(versionQuery, [versionId, templateId]);

            if (versionResult.rows.length === 0) {
                throw new Error('Angegebene Version nicht gefunden.');
            }
            const versionData = versionResult.rows[0];

            // Das Haupt-Template mit den Daten der Version aktualisieren
            // Die Version des Haupt-Templates wird *nicht* erhöht, da wir zurücksetzen.
            const updateQuery = `
                UPDATE label_templates
                SET
                    name = $1,
                    description = $2,
                    settings = $3,
                    is_default = $4, -- Behalte is_default vom Haupttemplate? Oder von der Version?
                    updated_at = NOW()
                    -- version bleibt gleich
                WHERE id = $5
            `;
            await client.query(updateQuery, [
                versionData.name,
                versionData.description,
                versionData.settings,
                accessCheck.rows[0].is_default, // Behalte den aktuellen Standard-Status
                templateId
            ]);

             await client.query('COMMIT');

            /* Vorerst auskommentiert
             // Cache leeren nach Wiederherstellung
            await this._clearCache(templateId, userId);
            */

            return true;
        } catch (error) {
             await client.query('ROLLBACK');
            console.error('Fehler beim Zurücksetzen auf eine Label-Template-Version:', error);
             if (error.message.includes('nicht gefunden')) {
                 throw error; // Fehler weitergeben
            }
            throw new Error('Zurücksetzen auf Version fehlgeschlagen.');
        } finally {
             client.release();
        }
    }

    // Interne Hilfsfunktion zum Speichern einer Version
    async _saveVersion(client, template, savedByUserId) {
        const query = `
            INSERT INTO label_template_versions (
                template_id,
                version,
                name,
                description,
                settings,
                is_default,
                saved_by_user_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        await client.query(query, [
            template.id,
            template.version,
            template.name,
            template.description,
            template.settings,
            template.is_default,
            savedByUserId
        ]);
    }

     /* Vorerst auskommentiert
     // Interne Hilfsfunktion zum Leeren des Caches
     async _clearCache(templateId, userId) {
         if (redisClient.isReady) {
             const cacheKey = `label_template:${templateId}:${userId || 'global'}`;
             await redisClient.del(cacheKey);
             console.log(`Cache für Label-Template ${templateId} geleert.`);
         }
     }

     // Label-Template aus Cache holen
     async getCachedLabelTemplate(id, userId = null) {
         if (!redisClient.isReady) return null;
         try {
             const cacheKey = `label_template:${id}:${userId || 'global'}`;
             const cachedData = await redisClient.get(cacheKey);
             return cachedData ? JSON.parse(cachedData) : null;
         } catch (error) {
             console.error('Redis Fehler beim Holen des Label-Templates:', error);
             return null;
         }
     }
     */

     // Importiert ein Label-Template (kann z.B. für globale Vorlagen oder Teilen genutzt werden)
     async importLabelTemplate(templateData, userId = null, makeGlobal = false) {
         const importUserId = makeGlobal ? null : userId;
         // Überschreibe is_default, wenn es global wird (optional)
         const importData = { ...templateData, is_default: makeGlobal ? templateData.is_default || false : templateData.is_default };
         return this.createLabelTemplate(importData, importUserId);
     }

    // Funktion zum Migrieren alter Label-Einstellungen zu einem Template
    // Wird einmalig benötigt, wenn Benutzer von alten Einstellungen auf Templates umsteigen
    async migrateLabelSettings(userId = null) {
        const client = await db.getClient();
        try {
             await client.query('BEGIN');

            // Hole die letzten Label-Einstellungen (entweder Benutzer oder global)
            const settingsQuery = `
                SELECT settings FROM label_settings
                WHERE ${userId ? 'user_id = $1' : 'user_id IS NULL'}
                ORDER BY updated_at DESC
                LIMIT 1
            `;
            const settingsResult = await client.query(settingsQuery, userId ? [userId] : []);

            if (settingsResult.rows.length === 0) {
                 console.log(`Keine Label-Einstellungen zum Migrieren für ${userId ? 'Benutzer ' + userId : 'global'} gefunden.`);
                 await client.query('COMMIT'); // Wichtig, auch wenn nichts zu tun ist
                 return null;
            }
            const settingsData = settingsResult.rows[0].settings;

            // Prüfen, ob bereits ein migriertes Template existiert
            const migratedTemplateName = `Migrierte Einstellungen ${userId ? 'für Benutzer ' + userId : '(Global)'}`;
             const checkQuery = `
                SELECT id FROM label_templates
                WHERE name = $1 AND (${userId ? 'user_id = $2' : 'user_id IS NULL'})
            `;
            const existingTemplate = await client.query(checkQuery, [migratedTemplateName, userId]);

            if (existingTemplate.rows.length > 0) {
                console.log(`Einstellungen für ${userId ? 'Benutzer ' + userId : 'global'} wurden bereits migriert (Template ID: ${existingTemplate.rows[0].id}).`);
                await client.query('COMMIT');
                return existingTemplate.rows[0];
            }

            // Erstelle ein neues Template mit den alten Einstellungen
            const templateData = {
                name: migratedTemplateName,
                description: 'Automatisch migrierte Label-Einstellungen',
                settings: settingsData,
                is_default: true // Mache das migrierte Template zum Standard
            };

            // Rufe createLabelTemplate innerhalb der Transaktion auf
            // Dafür müssen wir die Logik von createLabelTemplate hier anpassen oder eine interne Variante nutzen
            // Vereinfachte Erstellung hier für die Migration:

            // Setze alle anderen Vorlagen auf is_default = false
            const resetDefaultQuery = `
                UPDATE label_templates
                SET is_default = false
                WHERE ${userId ? 'user_id = $1' : 'user_id IS NULL'}
            `;
            await client.query(resetDefaultQuery, userId ? [userId] : []);

            const insertQuery = `
                INSERT INTO label_templates (user_id, name, description, settings, is_default, version)
                VALUES ($1, $2, $3, $4, $5, 1)
                RETURNING *
            `;
            const values = [
                userId,
                templateData.name,
                templateData.description,
                JSON.stringify(templateData.settings),
                templateData.is_default,
            ];
            const result = await client.query(insertQuery, values);
            const newTemplate = result.rows[0];

            // Speichere die Version
            await this._saveVersion(client, newTemplate, userId);

             await client.query('COMMIT');
             console.log(`Label-Einstellungen für ${userId ? 'Benutzer ' + userId : 'global'} erfolgreich migriert zu Template ID: ${newTemplate.id}`);

            /* Vorerst auskommentiert
             // Cache leeren
             await this._clearCache(newTemplate.id, userId);
            */

            return newTemplate;
        } catch (error) {
             await client.query('ROLLBACK');
            console.error(`Fehler beim Migrieren der Label-Einstellungen für ${userId ? 'Benutzer ' + userId : 'global'}:`, error);
            throw error;
        } finally {
             client.release();
        }
    }
}

module.exports = new LabelTemplateModel();
