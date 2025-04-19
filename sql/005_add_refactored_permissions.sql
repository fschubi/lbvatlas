-- SQL Skript zum Hinzufügen der Berechtigungen für refaktorisierte Bereiche
-- Fügt nur Berechtigungen hinzu, die noch nicht existieren und setzt Modul und Aktion.

-- Helper Function to add permission if not exists
-- CREATE OR REPLACE FUNCTION add_permission_if_not_exists(p_name TEXT, p_description TEXT) RETURNS VOID AS $$
-- BEGIN
--     IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = p_name) THEN
--         INSERT INTO permissions (name, description)
--         VALUES (p_name, p_description);
--     END IF;
-- END;
-- $$ LANGUAGE plpgsql;
-- Statt Funktion, einfache INSERT ... ON CONFLICT DO NOTHING

BEGIN;

-- Locations
INSERT INTO permissions (name, description, module, action)
VALUES
    ('locations.read', 'Berechtigung zum Lesen von Standorten', 'Standorte', 'read'),
    ('locations.create', 'Berechtigung zum Erstellen von Standorten', 'Standorte', 'create'),
    ('locations.update', 'Berechtigung zum Aktualisieren von Standorten', 'Standorte', 'update'),
    ('locations.delete', 'Berechtigung zum Löschen von Standorten', 'Standorte', 'delete')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module, action = EXCLUDED.action;

-- Rooms
INSERT INTO permissions (name, description, module, action)
VALUES
    ('rooms.read', 'Berechtigung zum Lesen von Räumen', 'Räume', 'read'),
    ('rooms.create', 'Berechtigung zum Erstellen von Räumen', 'Räume', 'create'),
    ('rooms.update', 'Berechtigung zum Aktualisieren von Räumen', 'Räume', 'update'),
    ('rooms.delete', 'Berechtigung zum Löschen von Räumen', 'Räume', 'delete')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module, action = EXCLUDED.action;

-- Categories
INSERT INTO permissions (name, description, module, action)
VALUES
    ('categories.read', 'Berechtigung zum Lesen von Kategorien', 'Kategorien', 'read'),
    ('categories.create', 'Berechtigung zum Erstellen von Kategorien', 'Kategorien', 'create'),
    ('categories.update', 'Berechtigung zum Aktualisieren von Kategorien', 'Kategorien', 'update'),
    ('categories.delete', 'Berechtigung zum Löschen von Kategorien', 'Kategorien', 'delete')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module, action = EXCLUDED.action;

-- Manufacturers
INSERT INTO permissions (name, description, module, action)
VALUES
    ('manufacturers.read', 'Berechtigung zum Lesen von Herstellern', 'Hersteller', 'read'),
    ('manufacturers.create', 'Berechtigung zum Erstellen von Herstellern', 'Hersteller', 'create'),
    ('manufacturers.update', 'Berechtigung zum Aktualisieren von Herstellern', 'Hersteller', 'update'),
    ('manufacturers.delete', 'Berechtigung zum Löschen von Herstellern', 'Hersteller', 'delete')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module, action = EXCLUDED.action;

-- Departments
INSERT INTO permissions (name, description, module, action)
VALUES
    ('departments.read', 'Berechtigung zum Lesen von Abteilungen', 'Abteilungen', 'read'),
    ('departments.create', 'Berechtigung zum Erstellen von Abteilungen', 'Abteilungen', 'create'),
    ('departments.update', 'Berechtigung zum Aktualisieren von Abteilungen', 'Abteilungen', 'update'),
    ('departments.delete', 'Berechtigung zum Löschen von Abteilungen', 'Abteilungen', 'delete')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module, action = EXCLUDED.action;

-- Suppliers
INSERT INTO permissions (name, description, module, action)
VALUES
    ('suppliers.read', 'Berechtigung zum Lesen von Lieferanten', 'Lieferanten', 'read'),
    ('suppliers.create', 'Berechtigung zum Erstellen von Lieferanten', 'Lieferanten', 'create'),
    ('suppliers.update', 'Berechtigung zum Aktualisieren von Lieferanten', 'Lieferanten', 'update'),
    ('suppliers.delete', 'Berechtigung zum Löschen von Lieferanten', 'Lieferanten', 'delete')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module, action = EXCLUDED.action;

-- Device Models
INSERT INTO permissions (name, description, module, action)
VALUES
    ('devicemodels.read', 'Berechtigung zum Lesen von Gerätemodellen', 'Gerätemodelle', 'read'),
    ('devicemodels.create', 'Berechtigung zum Erstellen von Gerätemodellen', 'Gerätemodelle', 'create'),
    ('devicemodels.update', 'Berechtigung zum Aktualisieren von Gerätemodellen', 'Gerätemodelle', 'update'),
    ('devicemodels.delete', 'Berechtigung zum Löschen von Gerätemodellen', 'Gerätemodelle', 'delete')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module, action = EXCLUDED.action;

-- Switches
INSERT INTO permissions (name, description, module, action)
VALUES
    ('switches.read', 'Berechtigung zum Lesen von Switches', 'Netzwerk Switches', 'read'),
    ('switches.create', 'Berechtigung zum Erstellen von Switches', 'Netzwerk Switches', 'create'),
    ('switches.update', 'Berechtigung zum Aktualisieren von Switches', 'Netzwerk Switches', 'update'),
    ('switches.delete', 'Berechtigung zum Löschen von Switches', 'Netzwerk Switches', 'delete')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module, action = EXCLUDED.action;

-- Network Sockets
INSERT INTO permissions (name, description, module, action)
VALUES
    ('networksockets.read', 'Berechtigung zum Lesen von Netzwerkdosen', 'Netzwerkdosen', 'read'),
    ('networksockets.create', 'Berechtigung zum Erstellen von Netzwerkdosen', 'Netzwerkdosen', 'create'),
    ('networksockets.update', 'Berechtigung zum Aktualisieren von Netzwerkdosen', 'Netzwerkdosen', 'update'),
    ('networksockets.delete', 'Berechtigung zum Löschen von Netzwerkdosen', 'Netzwerkdosen', 'delete')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module, action = EXCLUDED.action;

-- Network Ports
INSERT INTO permissions (name, description, module, action)
VALUES
    ('networkports.read', 'Berechtigung zum Lesen von Netzwerk-Ports', 'Netzwerk Ports', 'read'),
    ('networkports.create', 'Berechtigung zum Erstellen von Netzwerk-Ports', 'Netzwerk Ports', 'create'),
    ('networkports.update', 'Berechtigung zum Aktualisieren von Netzwerk-Ports', 'Netzwerk Ports', 'update'),
    ('networkports.delete', 'Berechtigung zum Löschen von Netzwerk-Ports', 'Netzwerk Ports', 'delete')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module, action = EXCLUDED.action;

-- Label Settings & Templates
INSERT INTO permissions (name, description, module, action)
VALUES
    ('labels.settings.read', 'Berechtigung zum Lesen von Label-Einstellungen (eigene/global)', 'Labels', 'settings.read'),
    ('labels.settings.update', 'Berechtigung zum Speichern eigener Label-Einstellungen', 'Labels', 'settings.update'),
    ('labels.templates.read', 'Berechtigung zum Lesen von Label-Vorlagen (eigene/global)', 'Labels', 'templates.read'),
    ('labels.templates.create', 'Berechtigung zum Erstellen von Label-Vorlagen', 'Labels', 'templates.create'),
    ('labels.templates.update', 'Berechtigung zum Aktualisieren von Label-Vorlagen (eigene/global)', 'Labels', 'templates.update'),
    ('labels.templates.delete', 'Berechtigung zum Löschen von Label-Vorlagen (eigene/global)', 'Labels', 'templates.delete'),
    ('labels.templates.import', 'Berechtigung zum Importieren von Label-Vorlagen', 'Labels', 'templates.import'),
    ('labels.templates.versions', 'Berechtigung zum Verwalten von Label-Vorlagen-Versionen', 'Labels', 'templates.versions'),
    ('labels.settings.migrate', 'Berechtigung zur Migration alter Label-Einstellungen', 'Labels', 'settings.migrate')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module, action = EXCLUDED.action;

-- System Settings
INSERT INTO permissions (name, description, module, action)
VALUES
    ('systemsettings.read', 'Berechtigung zum Lesen der Systemeinstellungen', 'Systemeinstellungen', 'read'),
    ('systemsettings.update', 'Berechtigung zum Aktualisieren der Systemeinstellungen', 'Systemeinstellungen', 'update')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, module = EXCLUDED.module, action = EXCLUDED.action;

COMMIT;

-- Optional: Löschen der Helper Function
-- DROP FUNCTION IF EXISTS add_permission_if_not_exists(TEXT, TEXT);
