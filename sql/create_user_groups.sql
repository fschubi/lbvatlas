-- =============================================
-- ATLAS Benutzergruppen - Datenbankschema
-- =============================================

-- DROP TABLE IF EXISTS user_group_members CASCADE;
-- DROP TABLE IF EXISTS user_groups CASCADE;

-- -----------------------------
-- Tabelle für Benutzergruppen
-- -----------------------------
CREATE TABLE IF NOT EXISTS user_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE user_groups IS 'Benutzergruppen für die Organisation von Benutzern';
COMMENT ON COLUMN user_groups.id IS 'Eindeutige ID der Benutzergruppe';
COMMENT ON COLUMN user_groups.name IS 'Name der Benutzergruppe';
COMMENT ON COLUMN user_groups.description IS 'Beschreibung der Benutzergruppe';
COMMENT ON COLUMN user_groups.created_by IS 'Benutzer-ID, die diese Gruppe erstellt hat';
COMMENT ON COLUMN user_groups.created_at IS 'Erstellungsdatum der Gruppe';
COMMENT ON COLUMN user_groups.updated_at IS 'Datum der letzten Aktualisierung';

-- -----------------------------
-- Tabelle für Gruppenmitgliedschaften
-- -----------------------------
CREATE TABLE IF NOT EXISTS user_group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_by INTEGER REFERENCES users(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, user_id)
);

COMMENT ON TABLE user_group_members IS 'Zuordnung von Benutzern zu Gruppen';
COMMENT ON COLUMN user_group_members.id IS 'Eindeutige ID der Gruppenmitgliedschaft';
COMMENT ON COLUMN user_group_members.group_id IS 'ID der Benutzergruppe';
COMMENT ON COLUMN user_group_members.user_id IS 'ID des Benutzers';
COMMENT ON COLUMN user_group_members.added_by IS 'Benutzer-ID, die diese Zuordnung erstellt hat';
COMMENT ON COLUMN user_group_members.added_at IS 'Datum der Zuordnung';

-- --------------------------------
-- Funktionen für Benutzergruppen
-- --------------------------------

-- Bestehende Funktionen löschen, bevor neue erstellt werden
DROP FUNCTION IF EXISTS get_user_groups(INTEGER);
DROP FUNCTION IF EXISTS get_group_users(INTEGER);

-- Funktion: Benutzergruppen eines Benutzers abrufen
CREATE OR REPLACE FUNCTION get_user_groups(p_user_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    name VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    created_by INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE,
    added_at TIMESTAMP WITH TIME ZONE,
    added_by INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ug.id,
        ug.name,
        ug.description,
        ug.created_at,
        ug.created_by,
        ug.updated_at,
        ugm.added_at,
        ugm.added_by
    FROM
        user_groups ug
    JOIN
        user_group_members ugm ON ug.id = ugm.group_id
    WHERE
        ugm.user_id = p_user_id
    ORDER BY
        ug.name;
END;
$$ LANGUAGE plpgsql;

-- Funktion: Benutzer einer Gruppe abrufen
CREATE OR REPLACE FUNCTION get_group_users(p_group_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    username VARCHAR(100),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    added_at TIMESTAMP WITH TIME ZONE,
    added_by INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.email,
        ugm.added_at,
        ugm.added_by
    FROM
        users u
    JOIN
        user_group_members ugm ON u.id = ugm.user_id
    WHERE
        ugm.group_id = p_group_id
    ORDER BY
        u.last_name, u.first_name;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------
-- Trigger für Benutzergruppen
-- --------------------------------

-- Bestehenden Trigger-Funktion löschen
DROP FUNCTION IF EXISTS update_user_group_timestamp() CASCADE;

-- Trigger-Funktion: Aktualisiert das updated_at-Feld bei Änderungen
CREATE OR REPLACE FUNCTION update_user_group_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Nur erstellen, wenn Trigger noch nicht existiert
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_group_timestamp') THEN
        CREATE TRIGGER update_user_group_timestamp
        BEFORE UPDATE ON user_groups
        FOR EACH ROW
        EXECUTE FUNCTION update_user_group_timestamp();
    END IF;
END
$$;

-- --------------------------------
-- Beispiel-Daten für Tests
-- --------------------------------
/*
-- Basis-Gruppen erstellen
INSERT INTO user_groups (name, description, created_by) VALUES
('IT-Abteilung', 'Mitglieder der IT-Abteilung', 1),
('Buchhaltung', 'Mitglieder der Buchhaltung', 1),
('Geschäftsleitung', 'Geschäftsführung und Management', 1),
('Vertrieb', 'Vertriebsmitarbeiter', 1),
('Marketing', 'Marketingabteilung', 1);

-- Beispiel-Mitgliedschaften
INSERT INTO user_group_members (group_id, user_id, added_by) VALUES
(1, 1, 1),  -- Admin in IT-Abteilung
(1, 3, 1),  -- Benutzer 3 in IT-Abteilung
(2, 4, 1),  -- Benutzer 4 in Buchhaltung
(3, 2, 1),  -- Benutzer 2 in Geschäftsleitung
(3, 1, 1);  -- Admin in Geschäftsleitung
*/
