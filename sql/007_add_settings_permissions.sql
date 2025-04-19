-- SQL Skript zum Hinzufügen neuer Berechtigungen für Einstellungsbereiche (Version 7 - mit Action)

BEGIN;

-- Berechtigungen für System Settings
INSERT INTO permissions (name, description, module, action)
VALUES
    ('MANAGE_SYSTEM_SETTINGS', 'Globale Systemeinstellungen verwalten', 'settings', 'manage')
ON CONFLICT (name) DO NOTHING;

-- Berechtigungen für Label Settings (Global)
INSERT INTO permissions (name, description, module, action)
VALUES
    ('MANAGE_GLOBAL_LABEL_SETTINGS', 'Globale Label-Einstellungen verwalten', 'settings', 'manage')
ON CONFLICT (name) DO NOTHING;

-- Berechtigungen für Label Templates
INSERT INTO permissions (name, description, module, action)
VALUES
    ('VIEW_LABEL_TEMPLATES', 'Label-Vorlagen (eigene und globale) anzeigen', 'settings', 'read'),
    ('MANAGE_OWN_LABEL_TEMPLATES', 'Eigene Label-Vorlagen erstellen, bearbeiten, löschen', 'settings', 'manage'),
    ('MANAGE_GLOBAL_LABEL_TEMPLATES', 'Globale Label-Vorlagen erstellen, bearbeiten, löschen', 'settings', 'manage'),
    ('IMPORT_GLOBAL_LABEL_TEMPLATES', 'Label-Vorlagen als globale Vorlagen importieren', 'settings', 'import'),
    ('MIGRATE_LABEL_SETTINGS', 'Eigene alte Label-Einstellungen zu einer Vorlage migrieren', 'settings', 'migrate'),
    ('MIGRATE_GLOBAL_LABEL_SETTINGS', 'Globale alte Label-Einstellungen zu einer Vorlage migrieren', 'settings', 'migrate')
ON CONFLICT (name) DO NOTHING;

-- Berechtigungen für andere, potenziell noch nicht abgedeckte Settings (Beispiele)
INSERT INTO permissions (name, description, module, action)
VALUES
    ('MANAGE_SWITCH_TYPES', 'Switch-Typen verwalten', 'settings', 'manage'),
    ('MANAGE_NETWORK_SOCKET_TYPES', 'Netzwerkdosen-Typen verwalten', 'settings', 'manage'),
    ('MANAGE_STATUS_TYPES', 'Status-Typen verwalten', 'settings', 'manage'),
    ('MANAGE_ASSET_TAG_SETTINGS', 'Asset-Tag-Einstellungen verwalten', 'settings', 'manage')
ON CONFLICT (name) DO NOTHING;

-- Zuweisung der neuen Berechtigungen zur 'admin'-Rolle (Beispiel) - WIEDER EINGEFÜGT
DO $$
DECLARE
    admin_role_id_var INT;
    perm_count INT;
BEGIN
    -- Hole die ID der 'admin'-Rolle
    SELECT id INTO admin_role_id_var FROM roles WHERE name = 'admin';

    -- Prüfe, ob die Rolle gefunden wurde
    IF admin_role_id_var IS NULL THEN
        RAISE WARNING 'Admin role (name=''admin'') not found. Skipping permission assignment to admin role.';
    ELSE
        RAISE NOTICE 'Admin role found (ID: %). Assigning permissions...', admin_role_id_var;

        -- Definiere die neuen Berechtigungsnamen in einem temporären Array
        WITH permission_list (name) AS (
            SELECT unnest(ARRAY[
                'MANAGE_SYSTEM_SETTINGS',
                'MANAGE_GLOBAL_LABEL_SETTINGS',
                'VIEW_LABEL_TEMPLATES',
                'MANAGE_OWN_LABEL_TEMPLATES',
                'MANAGE_GLOBAL_LABEL_TEMPLATES',
                'IMPORT_GLOBAL_LABEL_TEMPLATES',
                'MIGRATE_LABEL_SETTINGS',
                'MIGRATE_GLOBAL_LABEL_SETTINGS',
                'MANAGE_SWITCH_TYPES',
                'MANAGE_NETWORK_SOCKET_TYPES',
                'MANAGE_STATUS_TYPES',
                'MANAGE_ASSET_TAG_SETTINGS'
            ])
        ),
        -- Hole die IDs der tatsächlich existierenden Berechtigungen
        permission_ids AS (
            SELECT p.id
            FROM permissions p
            JOIN permission_list pl ON p.name = pl.name
        )
        -- Füge die Berechtigungen zur 'admin'-Rolle hinzu, falls sie noch nicht existieren
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT admin_role_id_var, pi.id
        FROM permission_ids pi
        ON CONFLICT (role_id, permission_id) DO NOTHING;

        -- Zähle, wie viele Berechtigungen tatsächlich eingefügt wurden (optional)
        GET DIAGNOSTICS perm_count = ROW_COUNT;
        RAISE NOTICE 'Assigned/Skipped % permissions to admin role (ID: %).', perm_count, admin_role_id_var;
    END IF;
END $$;

COMMIT;
