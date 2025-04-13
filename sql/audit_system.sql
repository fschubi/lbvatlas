-- SQL-Script zur Implementierung eines umfassenden Audit-Systems
-- Dieses Script erstellt Tabellen und Funktionen für die detaillierte Benutzeraktivitätsverfolgung

-- Tabelle zur Verfolgung von Benutzeraktivitäten
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100), -- Redundant, aber wichtig falls user_id NULL wird
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'user', 'device', 'license', etc.
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index für schnelle Suche nach Benutzer-ID
CREATE INDEX IF NOT EXISTS audit_log_user_id_idx ON audit_log(user_id);

-- Index für schnelle Suche nach Aktion
CREATE INDEX IF NOT EXISTS audit_log_action_idx ON audit_log(action);

-- Index für schnelle Suche nach Entitätstyp und ID
CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log(entity_type, entity_id);

-- Index für schnellere Zeitstempelsuche
CREATE INDEX IF NOT EXISTS audit_log_timestamp_idx ON audit_log(timestamp);

-- Tabelle für Login/Logout-Events
CREATE TABLE IF NOT EXISTS auth_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100), -- Redundant, aber wichtig falls user_id NULL wird
    action VARCHAR(20) NOT NULL, -- 'login', 'logout', 'failed_login'
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN,
    failure_reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index für schnellere Benutzersuche
CREATE INDEX IF NOT EXISTS auth_log_user_id_idx ON auth_log(user_id);

-- Index für schnellere Aktionssuche
CREATE INDEX IF NOT EXISTS auth_log_action_idx ON auth_log(action);

-- Index für schnellere Zeitstempelsuche
CREATE INDEX IF NOT EXISTS auth_log_timestamp_idx ON auth_log(timestamp);

-- Tabelle für Passwort-Änderungen
CREATE TABLE IF NOT EXISTS password_change_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100), -- Redundant, aber wichtig falls user_id NULL wird
    action VARCHAR(50) NOT NULL, -- 'change', 'reset', 'force_reset'
    changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_by_username VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index für schnellere Benutzersuche
CREATE INDEX IF NOT EXISTS password_change_log_user_id_idx ON password_change_log(user_id);

-- Funktion zum automatischen Protokollieren von Benutzeraktivitäten
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
DECLARE
    old_values_json JSONB := '{}'::JSONB;
    new_values_json JSONB := '{}'::JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Bei INSERT nur die neuen Werte protokollieren
        new_values_json := to_jsonb(NEW);
        new_values_json := new_values_json - 'password_hash'; -- Sensible Daten entfernen

        INSERT INTO audit_log (
            user_id, username, action, entity_type, entity_id,
            old_values, new_values, ip_address
        ) VALUES (
            current_setting('app.current_user_id', true)::INTEGER,
            current_setting('app.current_username', true),
            'CREATE',
            TG_TABLE_NAME,
            NEW.id,
            NULL,
            new_values_json,
            current_setting('app.client_ip', true)
        );

        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Bei UPDATE alte und neue Werte protokollieren
        old_values_json := to_jsonb(OLD);
        new_values_json := to_jsonb(NEW);

        -- Sensible Daten entfernen
        old_values_json := old_values_json - 'password_hash';
        new_values_json := new_values_json - 'password_hash';

        INSERT INTO audit_log (
            user_id, username, action, entity_type, entity_id,
            old_values, new_values, ip_address
        ) VALUES (
            current_setting('app.current_user_id', true)::INTEGER,
            current_setting('app.current_username', true),
            'UPDATE',
            TG_TABLE_NAME,
            NEW.id,
            old_values_json,
            new_values_json,
            current_setting('app.client_ip', true)
        );

        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Bei DELETE nur die alten Werte protokollieren
        old_values_json := to_jsonb(OLD);
        old_values_json := old_values_json - 'password_hash'; -- Sensible Daten entfernen

        INSERT INTO audit_log (
            user_id, username, action, entity_type, entity_id,
            old_values, new_values, ip_address
        ) VALUES (
            current_setting('app.current_user_id', true)::INTEGER,
            current_setting('app.current_username', true),
            'DELETE',
            TG_TABLE_NAME,
            OLD.id,
            old_values_json,
            NULL,
            current_setting('app.client_ip', true)
        );

        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger für Audit-Log bei Benutzeränderungen
DROP TRIGGER IF EXISTS users_audit_trigger ON users;
CREATE TRIGGER users_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION log_user_activity();

-- Erfolgreiche Ausführung bestätigen
SELECT 'Audit-System wurde erfolgreich in der Datenbank implementiert.' AS message;
