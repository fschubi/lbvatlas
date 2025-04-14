-- Überprüfe und korrigiere die users-Tabelle für authMiddleware.js

-- Stellt sicher, dass die Spalte 'role' existiert (falls 'role_id' verwendet wird)
DO $$
BEGIN
    -- Überprüfe, ob 'role_id' existiert aber 'role' nicht
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        -- Füge 'role' hinzu und kopiere Werte aus 'role_id' (falls möglich)
        ALTER TABLE users ADD COLUMN role VARCHAR(50);

        -- Versuche, Rollennamen aus der roles-Tabelle zu übernehmen
        UPDATE users u
        SET role = r.name
        FROM roles r
        WHERE u.role_id = r.id;

        -- Setze Standardwert für 'role' falls kein Mapping gefunden
        UPDATE users
        SET role = 'user'
        WHERE role IS NULL;
    END IF;

    -- Wenn 'role_id' existiert, aber 'role' bereits auch, stelle sicher, dass Werte übereinstimmen
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        -- Versuche, 'role' zu aktualisieren
        UPDATE users u
        SET role = r.name
        FROM roles r
        WHERE u.role_id = r.id AND u.role IS NULL;
    END IF;

    -- Stellt sicher, dass die Spalte 'active' existiert (falls 'is_active' verwendet wird)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'is_active'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'active'
    ) THEN
        -- Füge 'active' hinzu und kopiere Werte aus 'is_active'
        ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT TRUE;
        UPDATE users SET active = is_active;
    END IF;

    -- Falls beide nicht existieren, füge 'role' und 'active' mit Standardwerten hinzu
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'active'
    ) THEN
        ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT TRUE;
    END IF;
END
$$;

-- Setze Admin-Benutzer
UPDATE users SET role = 'admin' WHERE username = 'admin';

-- Stelle sicher, dass die Spalte 'last_login' existiert
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'last_login'
    ) THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
    END IF;
END
$$;
