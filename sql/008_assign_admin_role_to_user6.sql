-- SQL-Skript zum Zuweisen der Rolle 'admin' (ID 1) zum Benutzer mit ID 6

DO $$
DECLARE
    admin_role_id INT;
    target_user_id INT := 6;
BEGIN
    -- Finde die ID der 'admin'-Rolle
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin' LIMIT 1;

    -- Überprüfe, ob die Rolle gefunden wurde
    IF admin_role_id IS NULL THEN
        RAISE WARNING 'Rolle "admin" nicht gefunden.';
        RETURN;
    END IF;

    -- Überprüfe, ob der Benutzer existiert
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = target_user_id) THEN
        RAISE WARNING 'Benutzer mit ID % nicht gefunden.', target_user_id;
        RETURN;
    END IF;

    -- Weise dem Benutzer die Rolle zu (verhindert Duplikate, falls ein Unique Constraint existiert)
    INSERT INTO user_roles (user_id, role_id)
    VALUES (target_user_id, admin_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    RAISE NOTICE 'Rolle "admin" (ID: %) erfolgreich dem Benutzer mit ID % zugewiesen (oder war bereits zugewiesen).', admin_role_id, target_user_id;

END $$;
