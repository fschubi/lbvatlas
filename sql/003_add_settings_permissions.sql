-- Berechtigungen für ausgelagerte Settings-Bereiche (angepasst für module/action Spalten)

BEGIN;

-- Helper function (optional, depends on DB version/flavor) to split string
-- If this doesn't work, the values need to be split manually in the INSERT statements.
-- For PostgreSQL:
-- CREATE OR REPLACE FUNCTION split_part_safe(text, text, int) RETURNS text AS $$
-- DECLARE
--     parts text[];
-- BEGIN
--     parts := string_to_array($1, $2);
--     IF array_length(parts, 1) >= $3 THEN
--         RETURN parts[$3];
--     ELSE
--         RETURN NULL;
--     END IF;
-- END;
-- $$ LANGUAGE plpgsql IMMUTABLE;

-- Berechtigungen für Locations
INSERT INTO permissions (name, description, module, action) VALUES
('locations.read', 'Standorte anzeigen', 'locations', 'read'),
('locations.create', 'Standorte erstellen', 'locations', 'create'),
('locations.update', 'Standorte bearbeiten', 'locations', 'update'),
('locations.delete', 'Standorte löschen', 'locations', 'delete');

-- Berechtigungen für Rooms
INSERT INTO permissions (name, description, module, action) VALUES
('rooms.read', 'Räume anzeigen', 'rooms', 'read'),
('rooms.create', 'Räume erstellen', 'rooms', 'create'),
('rooms.update', 'Räume bearbeiten', 'rooms', 'update'),
('rooms.delete', 'Räume löschen', 'rooms', 'delete');

-- Berechtigungen für Categories
INSERT INTO permissions (name, description, module, action) VALUES
('categories.read', 'Kategorien anzeigen', 'categories', 'read'),
('categories.create', 'Kategorien erstellen', 'categories', 'create'),
('categories.update', 'Kategorien bearbeiten', 'categories', 'update'),
('categories.delete', 'Kategorien löschen', 'categories', 'delete');

-- Berechtigungen für Manufacturers
INSERT INTO permissions (name, description, module, action) VALUES
('manufacturers.read', 'Hersteller anzeigen', 'manufacturers', 'read'),
('manufacturers.create', 'Hersteller erstellen', 'manufacturers', 'create'),
('manufacturers.update', 'Hersteller bearbeiten', 'manufacturers', 'update'),
('manufacturers.delete', 'Hersteller löschen', 'manufacturers', 'delete');

-- Berechtigungen für Departments
INSERT INTO permissions (name, description, module, action) VALUES
('departments.read', 'Abteilungen anzeigen', 'departments', 'read'),
('departments.create', 'Abteilungen erstellen', 'departments', 'create'),
('departments.update', 'Abteilungen bearbeiten', 'departments', 'update'),
('departments.delete', 'Abteilungen löschen', 'departments', 'delete');

-- Berechtigungen für Suppliers
INSERT INTO permissions (name, description, module, action) VALUES
('suppliers.read', 'Lieferanten anzeigen', 'suppliers', 'read'),
('suppliers.create', 'Lieferanten erstellen', 'suppliers', 'create'),
('suppliers.update', 'Lieferanten bearbeiten', 'suppliers', 'update'),
('suppliers.delete', 'Lieferanten löschen', 'suppliers', 'delete');

-- Berechtigungen für Switches
INSERT INTO permissions (name, description, module, action) VALUES
('switches.read', 'Switches anzeigen', 'switches', 'read'),
('switches.create', 'Switches erstellen', 'switches', 'create'),
('switches.update', 'Switches bearbeiten', 'switches', 'update'),
('switches.delete', 'Switches löschen', 'switches', 'delete');

-- Berechtigungen für Network Sockets
INSERT INTO permissions (name, description, module, action) VALUES
('network_sockets.read', 'Netzwerkdosen anzeigen', 'network_sockets', 'read'),
('network_sockets.create', 'Netzwerkdosen erstellen', 'network_sockets', 'create'),
('network_sockets.update', 'Netzwerkdosen bearbeiten', 'network_sockets', 'update'),
('network_sockets.delete', 'Netzwerkdosen löschen', 'network_sockets', 'delete');

-- Berechtigungen für Network Ports
INSERT INTO permissions (name, description, module, action) VALUES
('network_ports.read', 'Netzwerk-Ports anzeigen', 'network_ports', 'read'),
('network_ports.create', 'Netzwerk-Ports erstellen', 'network_ports', 'create'),
('network_ports.update', 'Netzwerk-Ports bearbeiten', 'network_ports', 'update'),
('network_ports.delete', 'Netzwerk-Ports löschen', 'network_ports', 'delete');

-- Berechtigungen für Device Models
INSERT INTO permissions (name, description, module, action) VALUES
('device_models.read', 'Gerätemodelle anzeigen', 'device_models', 'read'),
('device_models.create', 'Gerätemodelle erstellen', 'device_models', 'create'),
('device_models.update', 'Gerätemodelle bearbeiten', 'device_models', 'update'),
('device_models.delete', 'Gerätemodelle löschen', 'device_models', 'delete'),
('device_models.read_count', 'Geräteanzahl pro Modell anzeigen', 'device_models', 'read_count');

COMMIT;
