-- SQL-Script zur Aktualisierung der Datenbankstruktur für die Benutzerverwaltung
-- Führe dieses Script aus, um fehlende Tabellen und Spalten zu ergänzen

-- Überprüfen, ob die department_id-Spalte in der users-Tabelle existiert, falls nicht: hinzufügen
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'department_id'
    ) THEN
        ALTER TABLE users ADD COLUMN department_id INTEGER;
        ALTER TABLE users ADD CONSTRAINT fk_users_department
            FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
        RAISE NOTICE 'department_id-Spalte zur users-Tabelle hinzugefügt';
    ELSE
        RAISE NOTICE 'department_id-Spalte existiert bereits';
    END IF;
END $$;

-- Erstellen der departments-Tabelle, falls sie nicht existiert
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE
);

-- Hinzufügen einiger Standard-Abteilungen, wenn noch keine vorhanden sind
INSERT INTO departments (name, description)
SELECT 'IT', 'IT-Abteilung und Systemadministration'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'IT');

INSERT INTO departments (name, description)
SELECT 'Verwaltung', 'Verwaltung und Management'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Verwaltung');

INSERT INTO departments (name, description)
SELECT 'Finanzen', 'Finanzen und Buchhaltung'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Finanzen');

INSERT INTO departments (name, description)
SELECT 'Vertrieb', 'Vertrieb und Marketing'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Vertrieb');

INSERT INTO departments (name, description)
SELECT 'Entwicklung', 'Produktentwicklung'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Entwicklung');

-- Erstellen der locations-Tabelle, falls sie nicht existiert
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Hinzufügen eines Standard-Standorts, wenn noch keiner vorhanden ist
INSERT INTO locations (name, description, address, city, country)
SELECT 'Hauptsitz', 'Hauptsitz des Unternehmens', 'Hauptstraße 1', 'Berlin', 'Deutschland'
WHERE NOT EXISTS (SELECT 1 FROM locations);

-- Erstellen der rooms-Tabelle, falls sie nicht existiert
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    building VARCHAR(100),
    floor VARCHAR(20),
    room_number VARCHAR(20),
    location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE
);

-- Prüfen und hinzufügen der floor-Spalte zur rooms-Tabelle
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'rooms'
        AND column_name = 'floor'
    ) THEN
        ALTER TABLE rooms ADD COLUMN floor VARCHAR(20);
        RAISE NOTICE 'floor-Spalte zur rooms-Tabelle hinzugefügt';
    END IF;

    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'rooms'
        AND column_name = 'room_number'
    ) THEN
        ALTER TABLE rooms ADD COLUMN room_number VARCHAR(20);
        RAISE NOTICE 'room_number-Spalte zur rooms-Tabelle hinzugefügt';
    END IF;
END $$;

-- Hinzufügen einiger Standard-Räume, wenn noch keine vorhanden sind
-- Hier nutzen wir eine andere Syntax, die kompatibel mit der vorhandenen Tabellenstruktur ist
INSERT INTO rooms (name, building, location_id, description)
SELECT 'Büro 101', 'Hauptgebäude', (SELECT id FROM locations ORDER BY id LIMIT 1), 'Büroraum im Erdgeschoss'
WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE name = 'Büro 101');

-- Aktualisiere die hinzugefügten Räume mit floor und room_number, wenn diese Spalten existieren
UPDATE rooms SET floor = 'EG', room_number = '101' WHERE name = 'Büro 101' AND EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'rooms' AND column_name = 'floor'
);

INSERT INTO rooms (name, building, location_id, description)
SELECT 'Büro 201', 'Hauptgebäude', (SELECT id FROM locations ORDER BY id LIMIT 1), 'Büroraum im ersten Stock'
WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE name = 'Büro 201');

-- Aktualisiere Büro 201
UPDATE rooms SET floor = '1. OG', room_number = '201' WHERE name = 'Büro 201' AND EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'rooms' AND column_name = 'floor'
);

INSERT INTO rooms (name, building, location_id, description)
SELECT 'Serverraum', 'Hauptgebäude', (SELECT id FROM locations ORDER BY id LIMIT 1), 'Serverraum im Untergeschoss'
WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE name = 'Serverraum');

-- Aktualisiere Serverraum
UPDATE rooms SET floor = 'UG', room_number = 'SR01' WHERE name = 'Serverraum' AND EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'rooms' AND column_name = 'floor'
);

-- Prüfen, ob die assets-Tabelle existiert, falls nicht: erstellen
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    asset_tag VARCHAR(50),
    assigned_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger für das Aktualisieren des updated_at-Timestamps
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger für departments hinzufügen
DROP TRIGGER IF EXISTS update_departments_timestamp ON departments;
CREATE TRIGGER update_departments_timestamp
BEFORE UPDATE ON departments
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

-- Trigger für locations hinzufügen
DROP TRIGGER IF EXISTS update_locations_timestamp ON locations;
CREATE TRIGGER update_locations_timestamp
BEFORE UPDATE ON locations
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

-- Trigger für rooms hinzufügen
DROP TRIGGER IF EXISTS update_rooms_timestamp ON rooms;
CREATE TRIGGER update_rooms_timestamp
BEFORE UPDATE ON rooms
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

-- Trigger für assets hinzufügen
DROP TRIGGER IF EXISTS update_assets_timestamp ON assets;
CREATE TRIGGER update_assets_timestamp
BEFORE UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

-- Überprüfen, ob die User-Tabelle die richtigen Spalten hat und aktualisieren
DO $$
BEGIN
    -- display_name-Spalte hinzufügen, falls nicht vorhanden
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'display_name'
    ) THEN
        ALTER TABLE users ADD COLUMN display_name VARCHAR(100);
        RAISE NOTICE 'display_name-Spalte zur users-Tabelle hinzugefügt';
    END IF;

    -- Überprüfen, ob die location_id-Spalte fehlt
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'location_id'
    ) THEN
        ALTER TABLE users ADD COLUMN location_id INTEGER;
        ALTER TABLE users ADD CONSTRAINT fk_users_location
            FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;
        RAISE NOTICE 'location_id-Spalte zur users-Tabelle hinzugefügt';
    END IF;

    -- Überprüfen, ob die room_id-Spalte fehlt
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'room_id'
    ) THEN
        ALTER TABLE users ADD COLUMN room_id INTEGER;
        ALTER TABLE users ADD CONSTRAINT fk_users_room
            FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL;
        RAISE NOTICE 'room_id-Spalte zur users-Tabelle hinzugefügt';
    END IF;
END $$;

-- Aktualisiere Administrator-Daten
UPDATE users
SET
    department_id = (SELECT id FROM departments WHERE name = 'IT' LIMIT 1),
    location_id = (SELECT id FROM locations ORDER BY id LIMIT 1),
    room_id = (SELECT id FROM rooms WHERE name = 'Serverraum' LIMIT 1),
    display_name = 'Administrator'
WHERE username = 'admin';

-- Erfolgreiche Ausführung bestätigen
SELECT 'Datenbankstruktur für die Benutzerverwaltung wurde erfolgreich aktualisiert.' AS message;
