-- Skript zum Abrufen der Tabellendefinitionen

-- Tabellendefinition für 'roles'
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_name = 'roles'
ORDER BY
    ordinal_position;

-- Tabellendefinition für 'permissions'
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_name = 'permissions'
ORDER BY
    ordinal_position;

-- Tabellendefinition für 'role_permissions'
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_name = 'role_permissions'
ORDER BY
    ordinal_position;

-- Tabellendefinition für 'role_hierarchy'
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_name = 'role_hierarchy'
ORDER BY
    ordinal_position;

-- Constraints für 'roles'
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints tc
JOIN
    information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN
    information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE
    tc.table_name = 'roles';

-- Constraints für 'permissions'
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints tc
JOIN
    information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN
    information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE
    tc.table_name = 'permissions';

-- Constraints für 'role_permissions'
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints tc
JOIN
    information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN
    information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE
    tc.table_name = 'role_permissions';

-- Constraints für 'role_hierarchy'
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints tc
JOIN
    information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN
    information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE
    tc.table_name = 'role_hierarchy';
