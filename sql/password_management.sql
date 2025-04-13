-- SQL-Script zur Erweiterung der Benutzer-Tabelle um Passwort-Management-Funktionen
-- Dieses Script fügt Spalten und Funktionen für Passwortrichtlinien, Ablaufdatum und Passwort-Reset hinzu

-- Hinzufügen der notwendigen Spalten zur users-Tabelle für erweitertes Passwort-Management
DO $$
BEGIN
    -- password_expires_at: Datum, an dem das Passwort abläuft
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'password_expires_at'
    ) THEN
        ALTER TABLE users ADD COLUMN password_expires_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'password_expires_at-Spalte zur users-Tabelle hinzugefügt';
    END IF;

    -- password_changed_at: Datum der letzten Passwortänderung
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'password_changed_at'
    ) THEN
        ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'password_changed_at-Spalte zur users-Tabelle hinzugefügt';
    END IF;

    -- password_reset_token: Token für Self-Service-Passwort-Reset
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'password_reset_token'
    ) THEN
        ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(100);
        RAISE NOTICE 'password_reset_token-Spalte zur users-Tabelle hinzugefügt';
    END IF;

    -- password_reset_expires_at: Ablaufdatum des Passwort-Reset-Tokens
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'password_reset_expires_at'
    ) THEN
        ALTER TABLE users ADD COLUMN password_reset_expires_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'password_reset_expires_at-Spalte zur users-Tabelle hinzugefügt';
    END IF;

    -- failed_login_attempts: Anzahl fehlgeschlagener Login-Versuche
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'failed_login_attempts'
    ) THEN
        ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
        RAISE NOTICE 'failed_login_attempts-Spalte zur users-Tabelle hinzugefügt';
    END IF;

    -- account_locked_until: Zeitpunkt, bis zu dem das Konto gesperrt ist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'account_locked_until'
    ) THEN
        ALTER TABLE users ADD COLUMN account_locked_until TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'account_locked_until-Spalte zur users-Tabelle hinzugefügt';
    END IF;

    -- password_history: Array der letzten Passwörter (Hashes) zur Vermeidung von Wiederverwendung
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'password_history'
    ) THEN
        ALTER TABLE users ADD COLUMN password_history TEXT[] DEFAULT '{}';
        RAISE NOTICE 'password_history-Spalte zur users-Tabelle hinzugefügt';
    END IF;
END $$;

-- Tabelle für Passwort-Richtlinien erstellen
CREATE TABLE IF NOT EXISTS password_policies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    min_length INTEGER NOT NULL DEFAULT 8,
    require_uppercase BOOLEAN DEFAULT TRUE,
    require_lowercase BOOLEAN DEFAULT TRUE,
    require_numbers BOOLEAN DEFAULT TRUE,
    require_special_chars BOOLEAN DEFAULT TRUE,
    password_expiry_days INTEGER DEFAULT 90,
    prevent_reuse_count INTEGER DEFAULT 3,
    max_failed_attempts INTEGER DEFAULT 5,
    lockout_duration_minutes INTEGER DEFAULT 15,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Standardrichtlinie hinzufügen, wenn noch keine vorhanden ist
INSERT INTO password_policies (
    name,
    min_length,
    require_uppercase,
    require_lowercase,
    require_numbers,
    require_special_chars,
    password_expiry_days,
    prevent_reuse_count,
    max_failed_attempts,
    lockout_duration_minutes
)
SELECT
    'Standard',
    8,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    90,
    3,
    5,
    15
WHERE NOT EXISTS (SELECT 1 FROM password_policies WHERE name = 'Standard');

-- Trigger für password_policies hinzufügen
DROP TRIGGER IF EXISTS update_password_policies_timestamp ON password_policies;
CREATE TRIGGER update_password_policies_timestamp
BEFORE UPDATE ON password_policies
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

-- Erfolgreiche Ausführung bestätigen
SELECT 'Passwort-Management-Funktionen wurden erfolgreich zur Datenbank hinzugefügt.' AS message;
