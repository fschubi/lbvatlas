-- Weist allen Rollen alle existierenden Berechtigungen zu.
-- Nützlich für die initiale Einrichtung oder zum Zurücksetzen.

BEGIN;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING; -- Verhindert Fehler, wenn die Zuordnung bereits existiert

COMMIT;
