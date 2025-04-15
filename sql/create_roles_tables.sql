-- Rollen-Tabellen für das ATLAS-System

-- Tabelle für Rollen
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabelle für Berechtigungen
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(module, action)
);

-- Tabelle für Rollen-Berechtigungen
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

-- Tabelle für Rollenhierarchie
CREATE TABLE IF NOT EXISTS role_hierarchy (
    id SERIAL PRIMARY KEY,
    parent_role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    child_role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_role_id, child_role_id)
);

-- Standardrollen einfügen
DO $$
BEGIN
    -- Admin-Rolle
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin') THEN
        INSERT INTO roles (name, description)
        VALUES ('admin', 'Administrator mit vollen Rechten');
    END IF;

    -- User-Rolle
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'user') THEN
        INSERT INTO roles (name, description)
        VALUES ('user', 'Standardbenutzer');
    END IF;

    -- Manager-Rolle
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'manager') THEN
        INSERT INTO roles (name, description)
        VALUES ('manager', 'Manager mit erweiterten Rechten');
    END IF;

    -- Support-Rolle
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'support') THEN
        INSERT INTO roles (name, description)
        VALUES ('support', 'Support-Mitarbeiter');
    END IF;
END $$;

-- Standardberechtigungen einfügen
DO $$
BEGIN
    -- Benutzerverwaltung
    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'users' AND action = 'create') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Benutzer erstellen', 'Benutzer erstellen', 'users', 'create');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'users' AND action = 'read') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Benutzer anzeigen', 'Benutzer anzeigen', 'users', 'read');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'users' AND action = 'update') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Benutzer bearbeiten', 'Benutzer bearbeiten', 'users', 'update');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'users' AND action = 'delete') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Benutzer löschen', 'Benutzer löschen', 'users', 'delete');
    END IF;

    -- Rollenverwaltung
    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'roles' AND action = 'create') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Rollen erstellen', 'Rollen erstellen', 'roles', 'create');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'roles' AND action = 'read') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Rollen anzeigen', 'Rollen anzeigen', 'roles', 'read');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'roles' AND action = 'update') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Rollen bearbeiten', 'Rollen bearbeiten', 'roles', 'update');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'roles' AND action = 'delete') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Rollen löschen', 'Rollen löschen', 'roles', 'delete');
    END IF;

    -- Geräteverwaltung
    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'devices' AND action = 'create') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Geräte erstellen', 'Geräte erstellen', 'devices', 'create');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'devices' AND action = 'read') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Geräte anzeigen', 'Geräte anzeigen', 'devices', 'read');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'devices' AND action = 'update') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Geräte bearbeiten', 'Geräte bearbeiten', 'devices', 'update');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'devices' AND action = 'delete') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Geräte löschen', 'Geräte löschen', 'devices', 'delete');
    END IF;

    -- Lizenzverwaltung
    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'licenses' AND action = 'create') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Lizenzen erstellen', 'Lizenzen erstellen', 'licenses', 'create');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'licenses' AND action = 'read') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Lizenzen anzeigen', 'Lizenzen anzeigen', 'licenses', 'read');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'licenses' AND action = 'update') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Lizenzen bearbeiten', 'Lizenzen bearbeiten', 'licenses', 'update');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'licenses' AND action = 'delete') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Lizenzen löschen', 'Lizenzen löschen', 'licenses', 'delete');
    END IF;

    -- Zertifikatsverwaltung
    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'certificates' AND action = 'create') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Zertifikate erstellen', 'Zertifikate erstellen', 'certificates', 'create');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'certificates' AND action = 'read') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Zertifikate anzeigen', 'Zertifikate anzeigen', 'certificates', 'read');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'certificates' AND action = 'update') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Zertifikate bearbeiten', 'Zertifikate bearbeiten', 'certificates', 'update');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'certificates' AND action = 'delete') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Zertifikate löschen', 'Zertifikate löschen', 'certificates', 'delete');
    END IF;

    -- Zubehörverwaltung
    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'accessories' AND action = 'create') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Zubehör erstellen', 'Zubehör erstellen', 'accessories', 'create');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'accessories' AND action = 'read') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Zubehör anzeigen', 'Zubehör anzeigen', 'accessories', 'read');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'accessories' AND action = 'update') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Zubehör bearbeiten', 'Zubehör bearbeiten', 'accessories', 'update');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'accessories' AND action = 'delete') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Zubehör löschen', 'Zubehör löschen', 'accessories', 'delete');
    END IF;

    -- Inventarverwaltung
    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'inventory' AND action = 'create') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Inventar erstellen', 'Inventar erstellen', 'inventory', 'create');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'inventory' AND action = 'read') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Inventar anzeigen', 'Inventar anzeigen', 'inventory', 'read');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'inventory' AND action = 'update') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Inventar bearbeiten', 'Inventar bearbeiten', 'inventory', 'update');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'inventory' AND action = 'delete') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Inventar löschen', 'Inventar löschen', 'inventory', 'delete');
    END IF;

    -- Systemeinstellungen
    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'settings' AND action = 'read') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Einstellungen anzeigen', 'Einstellungen anzeigen', 'settings', 'read');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'settings' AND action = 'update') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Einstellungen bearbeiten', 'Einstellungen bearbeiten', 'settings', 'update');
    END IF;

    -- Audit-Logs
    IF NOT EXISTS (SELECT 1 FROM permissions WHERE module = 'audit' AND action = 'read') THEN
        INSERT INTO permissions (name, description, module, action)
        VALUES ('Audit-Logs anzeigen', 'Audit-Logs anzeigen', 'audit', 'read');
    END IF;
END $$;

-- Berechtigungen für Admin-Rolle zuweisen
DO $$
DECLARE
    admin_id INTEGER;
    permission_id INTEGER;
BEGIN
    -- Admin-Rolle ID abrufen
    SELECT id INTO admin_id FROM roles WHERE name = 'admin';

    -- Für jede Berechtigung
    FOR permission_id IN SELECT id FROM permissions
    LOOP
        -- Berechtigung zur Admin-Rolle hinzufügen, falls noch nicht vorhanden
        IF NOT EXISTS (
            SELECT 1 FROM role_permissions
            WHERE role_id = admin_id AND permission_id = permission_id
        ) THEN
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES (admin_id, permission_id);
        END IF;
    END LOOP;
END $$;

-- Berechtigungen für Manager-Rolle zuweisen
DO $$
DECLARE
    manager_id INTEGER;
    permission_id INTEGER;
BEGIN
    -- Manager-Rolle ID abrufen
    SELECT id INTO manager_id FROM roles WHERE name = 'manager';

    -- Für jede Berechtigung in den angegebenen Modulen
    FOR permission_id IN
        SELECT id FROM permissions
        WHERE module IN ('users', 'devices', 'licenses', 'certificates', 'accessories', 'inventory')
        AND action IN ('read', 'create', 'update')
    LOOP
        -- Berechtigung zur Manager-Rolle hinzufügen, falls noch nicht vorhanden
        IF NOT EXISTS (
            SELECT 1 FROM role_permissions
            WHERE role_id = manager_id AND permission_id = permission_id
        ) THEN
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES (manager_id, permission_id);
        END IF;
    END LOOP;
END $$;

-- Berechtigungen für Support-Rolle zuweisen
DO $$
DECLARE
    support_id INTEGER;
    permission_id INTEGER;
BEGIN
    -- Support-Rolle ID abrufen
    SELECT id INTO support_id FROM roles WHERE name = 'support';

    -- Für jede Berechtigung in den angegebenen Modulen
    FOR permission_id IN
        SELECT id FROM permissions
        WHERE module IN ('devices', 'licenses', 'certificates', 'accessories')
        AND action IN ('read', 'update')
    LOOP
        -- Berechtigung zur Support-Rolle hinzufügen, falls noch nicht vorhanden
        IF NOT EXISTS (
            SELECT 1 FROM role_permissions
            WHERE role_id = support_id AND permission_id = permission_id
        ) THEN
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES (support_id, permission_id);
        END IF;
    END LOOP;
END $$;

-- Berechtigungen für User-Rolle zuweisen
DO $$
DECLARE
    user_id INTEGER;
    permission_id INTEGER;
BEGIN
    -- User-Rolle ID abrufen
    SELECT id INTO user_id FROM roles WHERE name = 'user';

    -- Für jede Berechtigung in den angegebenen Modulen
    FOR permission_id IN
        SELECT id FROM permissions
        WHERE module IN ('devices', 'licenses', 'certificates', 'accessories')
        AND action = 'read'
    LOOP
        -- Berechtigung zur User-Rolle hinzufügen, falls noch nicht vorhanden
        IF NOT EXISTS (
            SELECT 1 FROM role_permissions
            WHERE role_id = user_id AND permission_id = permission_id
        ) THEN
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES (user_id, permission_id);
        END IF;
    END LOOP;
END $$;

-- Rollenhierarchie erstellen
DO $$
DECLARE
    admin_id INTEGER;
    manager_id INTEGER;
    support_id INTEGER;
    user_id INTEGER;
BEGIN
    -- Rollen-IDs abrufen
    SELECT id INTO admin_id FROM roles WHERE name = 'admin';
    SELECT id INTO manager_id FROM roles WHERE name = 'manager';
    SELECT id INTO support_id FROM roles WHERE name = 'support';
    SELECT id INTO user_id FROM roles WHERE name = 'user';

    -- Admin > Manager
    IF NOT EXISTS (
        SELECT 1 FROM role_hierarchy
        WHERE parent_role_id = admin_id AND child_role_id = manager_id
    ) THEN
        INSERT INTO role_hierarchy (parent_role_id, child_role_id)
        VALUES (admin_id, manager_id);
    END IF;

    -- Admin > Support
    IF NOT EXISTS (
        SELECT 1 FROM role_hierarchy
        WHERE parent_role_id = admin_id AND child_role_id = support_id
    ) THEN
        INSERT INTO role_hierarchy (parent_role_id, child_role_id)
        VALUES (admin_id, support_id);
    END IF;

    -- Admin > User
    IF NOT EXISTS (
        SELECT 1 FROM role_hierarchy
        WHERE parent_role_id = admin_id AND child_role_id = user_id
    ) THEN
        INSERT INTO role_hierarchy (parent_role_id, child_role_id)
        VALUES (admin_id, user_id);
    END IF;

    -- Manager > Support
    IF NOT EXISTS (
        SELECT 1 FROM role_hierarchy
        WHERE parent_role_id = manager_id AND child_role_id = support_id
    ) THEN
        INSERT INTO role_hierarchy (parent_role_id, child_role_id)
        VALUES (manager_id, support_id);
    END IF;

    -- Manager > User
    IF NOT EXISTS (
        SELECT 1 FROM role_hierarchy
        WHERE parent_role_id = manager_id AND child_role_id = user_id
    ) THEN
        INSERT INTO role_hierarchy (parent_role_id, child_role_id)
        VALUES (manager_id, user_id);
    END IF;
END $$;

-- Funktion zum Abrufen aller Berechtigungen eines Benutzers
CREATE OR REPLACE FUNCTION get_user_permissions(user_id INTEGER)
RETURNS TABLE (
    module VARCHAR(50),
    action VARCHAR(50),
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.module, p.action, p.description
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN users u ON u.role = (
        SELECT name FROM roles WHERE id = rp.role_id
    )
    WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql;
