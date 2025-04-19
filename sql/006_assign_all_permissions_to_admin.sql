-- SQL Skript zum Zuweisen ALLER existierenden Berechtigungen zur Rolle 'admin'

DO $$
DECLARE
    admin_role_id INT;
BEGIN
    -- Finde die ID der Rolle 'admin'
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';

    -- Überprüfe, ob die Rolle gefunden wurde
    IF admin_role_id IS NULL THEN
        RAISE EXCEPTION 'Rolle "admin" nicht gefunden. Skript kann nicht ausgeführt werden.';
    END IF;

    -- Füge alle Berechtigungen für die gefundene Admin-Rollen-ID hinzu
    -- ON CONFLICT stellt sicher, dass keine Fehler auftreten, wenn die Zuweisung bereits existiert.
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT admin_role_id, p.id
    FROM permissions p
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    RAISE NOTICE 'Alle Berechtigungen erfolgreich der Rolle "admin" (ID: %) zugewiesen.', admin_role_id;

END $$;
