--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-04-13 20:10:35

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 384 (class 1255 OID 25858)
-- Name: analyze_indexes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.analyze_indexes() RETURNS TABLE(table_name text, index_name text, index_size text, index_scans bigint, index_usage real, index_efficiency real)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.table_name::TEXT,
        i.index_name::TEXT,
        pg_size_pretty(pg_relation_size(i.indexrelid)) as index_size,
        i.idx_scan::BIGINT as index_scans,
        CASE
            WHEN t.seq_scan + i.idx_scan = 0 THEN 0
            ELSE i.idx_scan::REAL / (t.seq_scan + i.idx_scan)
        END as index_usage,
        CASE
            WHEN i.idx_scan = 0 THEN 0
            ELSE i.idx_tup_fetch::REAL / i.idx_scan
        END as index_efficiency
    FROM pg_stat_user_indexes i
    JOIN pg_stat_user_tables t ON i.relid = t.relid
    ORDER BY i.idx_scan DESC;
END;
$$;


ALTER FUNCTION public.analyze_indexes() OWNER TO postgres;

--
-- TOC entry 396 (class 1255 OID 25859)
-- Name: analyze_table_statistics(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.analyze_table_statistics() RETURNS TABLE(table_name text, total_size text, table_size text, index_size text, toast_size text, row_count bigint, avg_row_size integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.table_name::TEXT,
        pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
        pg_size_pretty(pg_relation_size(c.oid)) as table_size,
        pg_size_pretty(pg_indexes_size(c.oid)) as index_size,
        pg_size_pretty(pg_relation_size(c.reltoastrelid)) as toast_size,
        c.reltuples::BIGINT as row_count,
        CASE
            WHEN c.reltuples = 0 THEN 0
            ELSE pg_relation_size(c.oid) / NULLIF(c.reltuples, 0)::INTEGER
        END as avg_row_size
    FROM pg_stat_user_tables t
    JOIN pg_class c ON t.relname = c.relname
    ORDER BY pg_total_relation_size(c.oid) DESC;
END;
$$;


ALTER FUNCTION public.analyze_table_statistics() OWNER TO postgres;

--
-- TOC entry 403 (class 1255 OID 25856)
-- Name: analyze_tables(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.analyze_tables() RETURNS TABLE(table_name text, row_count bigint, table_size text, index_size text, last_vacuum timestamp with time zone, last_analyze timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.table_name::TEXT,
        c.reltuples::BIGINT as row_count,
        pg_size_pretty(pg_total_relation_size(c.oid)) as table_size,
        pg_size_pretty(pg_indexes_size(c.oid)) as index_size,
        c.relvacuumtime as last_vacuum,
        c.relanalyze as last_analyze
    FROM pg_stat_user_tables t
    JOIN pg_class c ON t.relname = c.relname
    ORDER BY pg_total_relation_size(c.oid) DESC;
END;
$$;


ALTER FUNCTION public.analyze_tables() OWNER TO postgres;

--
-- TOC entry 383 (class 1255 OID 25857)
-- Name: analyze_vacuum_needs(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.analyze_vacuum_needs() RETURNS TABLE(table_name text, dead_tuples bigint, live_tuples bigint, last_vacuum timestamp with time zone, last_autovacuum timestamp with time zone, vacuum_needed boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.table_name::TEXT,
        t.n_dead_tup::BIGINT as dead_tuples,
        t.n_live_tup::BIGINT as live_tuples,
        t.last_vacuum,
        t.last_autovacuum,
        CASE
            WHEN t.n_dead_tup > 1000 AND t.n_dead_tup > t.n_live_tup * 0.1 THEN true
            ELSE false
        END as vacuum_needed
    FROM pg_stat_user_tables t
    ORDER BY t.n_dead_tup DESC;
END;
$$;


ALTER FUNCTION public.analyze_vacuum_needs() OWNER TO postgres;

--
-- TOC entry 417 (class 1255 OID 26399)
-- Name: audit_log_trigger(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.audit_log_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    old_values JSONB;
    new_values JSONB;
    current_user_id INTEGER;
BEGIN
    -- Versuche, den aktuellen Benutzer aus der Sitzung zu holen
    BEGIN
        current_user_id := current_setting('app.current_user_id')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
        -- Wenn der Parameter nicht existiert, verwende NULL
        current_user_id := NULL;
    END;

    IF TG_OP = 'DELETE' THEN
        old_values = row_to_json(OLD)::JSONB;
        new_values = NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        old_values = row_to_json(OLD)::JSONB;
        new_values = row_to_json(NEW)::JSONB;
    ELSIF TG_OP = 'INSERT' THEN
        old_values = NULL;
        new_values = row_to_json(NEW)::JSONB;
    END IF;

    INSERT INTO audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    ) VALUES (
        current_user_id,
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        old_values,
        new_values
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.audit_log_trigger() OWNER TO postgres;

--
-- TOC entry 402 (class 1255 OID 25855)
-- Name: check_backup_configuration(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_backup_configuration() RETURNS TABLE(setting_name text, setting_value text, is_valid boolean, error_message text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.name::TEXT,
        s.value::TEXT,
        CASE
            WHEN s.name = 'backup_path' AND NOT EXISTS (
                SELECT 1 FROM pg_ls_dir(s.value)
            ) THEN false
            WHEN s.name = 'backup_retention_days' AND s.value::INTEGER < 1 THEN false
            WHEN s.name = 'backup_compression_level' AND s.value::INTEGER NOT BETWEEN 0 AND 9 THEN false
            ELSE true
        END as is_valid,
        CASE
            WHEN s.name = 'backup_path' AND NOT EXISTS (
                SELECT 1 FROM pg_ls_dir(s.value)
            ) THEN 'Backup-Verzeichnis existiert nicht'
            WHEN s.name = 'backup_retention_days' AND s.value::INTEGER < 1 THEN 'Aufbewahrungszeit muss größer als 0 sein'
            WHEN s.name = 'backup_compression_level' AND s.value::INTEGER NOT BETWEEN 0 AND 9 THEN 'Kompressionsstufe muss zwischen 0 und 9 liegen'
            ELSE NULL
        END as error_message
    FROM settings s
    WHERE s.name LIKE 'backup_%';
END;
$$;


ALTER FUNCTION public.check_backup_configuration() OWNER TO postgres;

--
-- TOC entry 401 (class 1255 OID 25854)
-- Name: check_backup_storage(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_backup_storage(p_backup_path text) RETURNS TABLE(total_space bigint, used_space bigint, free_space bigint, backup_count integer, oldest_backup timestamp with time zone, newest_backup timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH backup_stats AS (
        SELECT
            COUNT(*) as count,
            MIN(created_at) as oldest,
            MAX(created_at) as newest,
            SUM(backup_size) as used
        FROM backup_logs
        WHERE backup_file LIKE p_backup_path || '/%'
    )
    SELECT
        pg_size_file(p_backup_path) as total,
        COALESCE(used, 0) as used,
        pg_size_file(p_backup_path) - COALESCE(used, 0) as free,
        COALESCE(count, 0) as count,
        oldest,
        newest
    FROM backup_stats;
END;
$$;


ALTER FUNCTION public.check_backup_storage(p_backup_path text) OWNER TO postgres;

--
-- TOC entry 405 (class 1255 OID 25861)
-- Name: check_index_bloat(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_index_bloat() RETURNS TABLE(table_name text, index_name text, bloat_size text, bloat_percentage real, wasted_bytes bigint, wasted_pages integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH constants AS (
        SELECT current_setting('block_size')::numeric AS bs
    ),
    index_stats AS (
        SELECT
            schemaname,
            tablename,
            indexname,
            idx_scan,
            idx_tup_read,
            idx_tup_fetch,
            pg_relation_size(indexrelid) as index_size
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
    )
    SELECT
        tablename::TEXT as table_name,
        indexname::TEXT as index_name,
        pg_size_pretty(dead_bytes) as bloat_size,
        (dead_bytes::float / total_bytes * 100)::REAL as bloat_percentage,
        dead_bytes as wasted_bytes,
        (dead_bytes / bs)::INTEGER as wasted_pages
    FROM (
        SELECT
            tablename,
            indexname,
            CASE
                WHEN idx_scan = 0 THEN index_size
                ELSE 0
            END as dead_bytes,
            index_size as total_bytes,
            (SELECT bs FROM constants) as bs
        FROM index_stats
    ) t
    WHERE dead_bytes > 0
    ORDER BY dead_bytes DESC;
END;
$$;


ALTER FUNCTION public.check_index_bloat() OWNER TO postgres;

--
-- TOC entry 404 (class 1255 OID 25860)
-- Name: check_table_bloat(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_table_bloat() RETURNS TABLE(table_name text, bloat_size text, bloat_percentage real, wasted_bytes bigint, wasted_pages integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH constants AS (
        SELECT current_setting('block_size')::numeric AS bs
    ),
    no_stats AS (
        SELECT table_schema, table_name,
            n_live_tup, n_dead_tup
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
    ),
    null_stats AS (
        SELECT
            table_schema, table_name,
            n_live_tup, n_dead_tup,
            CASE WHEN n_live_tup = 0 THEN 0
                ELSE n_dead_tup::float / n_live_tup
            END AS dead_ratio
        FROM no_stats
    ),
    table_stats AS (
        SELECT
            table_schema, table_name,
            n_live_tup, n_dead_tup,
            dead_ratio,
            CASE WHEN dead_ratio > 0.1 THEN true
                ELSE false
            END AS needs_vacuum
        FROM null_stats
    )
    SELECT
        table_name::TEXT,
        pg_size_pretty(dead_bytes) as bloat_size,
        (dead_bytes::float / total_bytes * 100)::REAL as bloat_percentage,
        dead_bytes as wasted_bytes,
        (dead_bytes / bs)::INTEGER as wasted_pages
    FROM (
        SELECT
            table_name,
            n_dead_tup * avg_row_size as dead_bytes,
            pg_relation_size(table_name::regclass) as total_bytes,
            (SELECT bs FROM constants) as bs
        FROM table_stats
    ) t
    WHERE dead_bytes > 0
    ORDER BY dead_bytes DESC;
END;
$$;


ALTER FUNCTION public.check_table_bloat() OWNER TO postgres;

--
-- TOC entry 406 (class 1255 OID 25862)
-- Name: check_table_fragmentation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_table_fragmentation() RETURNS TABLE(table_name text, total_pages integer, used_pages integer, free_pages integer, fragmentation_percentage real)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.table_name::TEXT,
        t.total_pages::INTEGER,
        t.used_pages::INTEGER,
        t.free_pages::INTEGER,
        CASE
            WHEN t.total_pages = 0 THEN 0
            ELSE (t.free_pages::float / t.total_pages * 100)::REAL
        END as fragmentation_percentage
    FROM (
        SELECT
            relname as table_name,
            CASE
                WHEN relpages = 0 THEN 0
                ELSE relpages
            END as total_pages,
            CASE
                WHEN relpages = 0 THEN 0
                ELSE relpages - relallvisible
            END as used_pages,
            CASE
                WHEN relpages = 0 THEN 0
                ELSE relallvisible
            END as free_pages
        FROM pg_class c
        JOIN pg_stat_user_tables t ON c.relname = t.relname
        WHERE c.relkind = 'r'
    ) t
    WHERE t.total_pages > 0
    ORDER BY fragmentation_percentage DESC;
END;
$$;


ALTER FUNCTION public.check_table_fragmentation() OWNER TO postgres;

--
-- TOC entry 407 (class 1255 OID 25863)
-- Name: check_table_growth(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_table_growth() RETURNS TABLE(table_name text, current_size text, growth_rate real, estimated_growth text, last_analyze timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.table_name::TEXT,
        pg_size_pretty(current_size) as current_size,
        growth_rate::REAL,
        pg_size_pretty(estimated_growth) as estimated_growth,
        t.last_analyze
    FROM (
        SELECT
            relname as table_name,
            pg_total_relation_size(relid) as current_size,
            CASE
                WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_analyze)) = 0 THEN 0
                ELSE (pg_total_relation_size(relid)::float /
                      EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_analyze)) * 86400)::REAL
            END as growth_rate,
            CASE
                WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_analyze)) = 0 THEN 0
                ELSE pg_total_relation_size(relid) *
                     (1 + (pg_total_relation_size(relid)::float /
                           EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_analyze)) * 86400))
            END as estimated_growth,
            last_analyze
        FROM pg_stat_user_tables
    ) t
    WHERE t.current_size > 0
    ORDER BY t.growth_rate DESC;
END;
$$;


ALTER FUNCTION public.check_table_growth() OWNER TO postgres;

--
-- TOC entry 400 (class 1255 OID 25853)
-- Name: cleanup_old_backups(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_backups(p_backup_path text, p_days_old integer DEFAULT 30) RETURNS TABLE(deleted_file text, file_size bigint, deleted_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH deleted_files AS (
        DELETE FROM backup_logs
        WHERE created_at < CURRENT_TIMESTAMP - (p_days_old || ' days')::INTERVAL
        RETURNING backup_file, pg_size_file(backup_file) as size, created_at
    )
    SELECT
        backup_file,
        size,
        created_at
    FROM deleted_files;
END;
$$;


ALTER FUNCTION public.cleanup_old_backups(p_backup_path text, p_days_old integer) OWNER TO postgres;

--
-- TOC entry 382 (class 1255 OID 25849)
-- Name: create_full_backup(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_full_backup(p_backup_path text, p_compression_level integer DEFAULT 9) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_backup_file TEXT;
    v_timestamp TEXT;
BEGIN
    -- Generiere einen Zeitstempel für den Backup-Dateinamen
    v_timestamp := to_char(CURRENT_TIMESTAMP, 'YYYYMMDD_HH24MISS');
    v_backup_file := p_backup_path || '/atlas_full_backup_' || v_timestamp || '.sql';

    -- Führe pg_dump aus
    PERFORM pg_execute(
        'pg_dump -Fc -Z ' || p_compression_level || ' -f ' || quote_literal(v_backup_file) || ' atlas'
    );

    -- Protokolliere das Backup
    INSERT INTO backup_logs (
        backup_type,
        backup_file,
        backup_size,
        created_at
    ) VALUES (
        'full',
        v_backup_file,
        pg_size_file(v_backup_file),
        CURRENT_TIMESTAMP
    );

    RETURN v_backup_file;
END;
$$;


ALTER FUNCTION public.create_full_backup(p_backup_path text, p_compression_level integer) OWNER TO postgres;

--
-- TOC entry 397 (class 1255 OID 25850)
-- Name: create_incremental_backup(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_incremental_backup(p_backup_path text, p_compression_level integer DEFAULT 9) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_backup_file TEXT;
    v_timestamp TEXT;
    v_last_backup TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Hole den Zeitpunkt des letzten Backups
    SELECT MAX(created_at) INTO v_last_backup
    FROM backup_logs
    WHERE backup_type = 'incremental';

    -- Generiere einen Zeitstempel für den Backup-Dateinamen
    v_timestamp := to_char(CURRENT_TIMESTAMP, 'YYYYMMDD_HH24MISS');
    v_backup_file := p_backup_path || '/atlas_incremental_backup_' || v_timestamp || '.sql';

    -- Führe pg_dump aus
    PERFORM pg_execute(
        'pg_dump -Fc -Z ' || p_compression_level ||
        ' -f ' || quote_literal(v_backup_file) ||
        ' --since=' || quote_literal(v_last_backup) ||
        ' atlas'
    );

    -- Protokolliere das Backup
    INSERT INTO backup_logs (
        backup_type,
        backup_file,
        backup_size,
        created_at
    ) VALUES (
        'incremental',
        v_backup_file,
        pg_size_file(v_backup_file),
        CURRENT_TIMESTAMP
    );

    RETURN v_backup_file;
END;
$$;


ALTER FUNCTION public.create_incremental_backup(p_backup_path text, p_compression_level integer) OWNER TO postgres;

--
-- TOC entry 432 (class 1255 OID 28959)
-- Name: create_integration_sync_log(integer, character varying, character varying, integer, integer, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_integration_sync_log(p_config_id integer, p_sync_type character varying, p_status character varying, p_items_processed integer DEFAULT 0, p_items_failed integer DEFAULT 0, p_error_message text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_log_id INTEGER;
BEGIN
    INSERT INTO integration_sync_logs (
        config_id,
        sync_type,
        status,
        items_processed,
        items_failed,
        error_message,
        started_at,
        completed_at
    ) VALUES (
        p_config_id,
        p_sync_type,
        p_status,
        p_items_processed,
        p_items_failed,
        p_error_message,
        CASE WHEN p_status = 'started' THEN CURRENT_TIMESTAMP ELSE NULL END,
        CASE WHEN p_status IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE NULL END
    )
    RETURNING id INTO v_log_id;

    -- Aktualisiere last_sync_at in integration_configs
    UPDATE integration_configs
    SET last_sync_at = CURRENT_TIMESTAMP
    WHERE id = p_config_id;

    RETURN v_log_id;
END;
$$;


ALTER FUNCTION public.create_integration_sync_log(p_config_id integer, p_sync_type character varying, p_status character varying, p_items_processed integer, p_items_failed integer, p_error_message text) OWNER TO postgres;

--
-- TOC entry 433 (class 1255 OID 28885)
-- Name: create_sync_log(integer, character varying, character varying, integer, integer, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_sync_log(p_device_id integer, p_sync_type character varying, p_status character varying, p_items_processed integer DEFAULT 0, p_items_failed integer DEFAULT 0, p_error_message text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_log_id INTEGER;
BEGIN
    INSERT INTO mobile_sync_logs (
        device_id,
        sync_type,
        status,
        items_processed,
        items_failed,
        error_message,
        started_at,
        completed_at
    ) VALUES (
        p_device_id,
        p_sync_type,
        p_status,
        p_items_processed,
        p_items_failed,
        p_error_message,
        CASE WHEN p_status = 'started' THEN CURRENT_TIMESTAMP ELSE NULL END,
        CASE WHEN p_status IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE NULL END
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;


ALTER FUNCTION public.create_sync_log(p_device_id integer, p_sync_type character varying, p_status character varying, p_items_processed integer, p_items_failed integer, p_error_message text) OWNER TO postgres;

--
-- TOC entry 421 (class 1255 OID 26936)
-- Name: get_certificate_expiry_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_certificate_expiry_stats() RETURNS TABLE(expiry_status character varying, count bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN valid_to < CURRENT_DATE THEN 'expired'
            WHEN valid_to < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
            ELSE 'active'
        END as expiry_status,
        COUNT(*) as count
    FROM certificates
    GROUP BY expiry_status
    ORDER BY count DESC;
END;
$$;


ALTER FUNCTION public.get_certificate_expiry_stats() OWNER TO postgres;

--
-- TOC entry 413 (class 1255 OID 26029)
-- Name: get_certificate_statistics(date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_certificate_statistics(start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date) RETURNS TABLE(total_certificates integer, valid_certificates integer, expired_certificates integer, certificates_by_type jsonb, certificates_by_issuer jsonb, certificates_expiring_soon integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH certificate_counts AS (
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'valid') as valid,
            COUNT(*) FILTER (WHERE status = 'expired') as expired,
            jsonb_object_agg(
                type,
                COUNT(*)
            ) as by_type,
            jsonb_object_agg(
                issuer,
                COUNT(*)
            ) as by_issuer,
            COUNT(*) FILTER (WHERE valid_to BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as expiring_soon
        FROM certificates
        WHERE
            (start_date IS NULL OR valid_from >= start_date)
            AND (end_date IS NULL OR valid_from <= end_date)
    )
    SELECT
        total,
        valid,
        expired,
        by_type,
        by_issuer,
        expiring_soon
    FROM certificate_counts;
END;
$$;


ALTER FUNCTION public.get_certificate_statistics(start_date date, end_date date) OWNER TO postgres;

--
-- TOC entry 429 (class 1255 OID 26943)
-- Name: get_dashboard_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_dashboard_stats() RETURNS TABLE(metric_name character varying, metric_value bigint, metric_change numeric, last_updated timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY

    -- Gesamtzahl aktiver Geräte
    SELECT
        'active_devices'::VARCHAR(50) as metric_name,
        COUNT(*)::BIGINT as metric_value,
        0::NUMERIC as metric_change,
        NOW() as last_updated
    FROM devices
    WHERE status = 'active'

    UNION ALL

    -- Gesamtzahl aktiver Lizenzen
    SELECT
        'active_licenses'::VARCHAR(50),
        COUNT(*)::BIGINT,
        0::NUMERIC,
        NOW()
    FROM licenses
    WHERE status = 'active'

    UNION ALL

    -- Gesamtzahl aktiver Zertifikate
    SELECT
        'active_certificates'::VARCHAR(50),
        COUNT(*)::BIGINT,
        0::NUMERIC,
        NOW()
    FROM certificates
    WHERE status = 'active'

    UNION ALL

    -- Offene Tickets
    SELECT
        'open_tickets'::VARCHAR(50),
        COUNT(*)::BIGINT,
        0::NUMERIC,
        NOW()
    FROM tickets
    WHERE status = 'open'

    UNION ALL

    -- Ablaufende Lizenzen (nächste 30 Tage)
    SELECT
        'expiring_licenses'::VARCHAR(50),
        COUNT(*)::BIGINT,
        0::NUMERIC,
        NOW()
    FROM licenses
    WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'

    UNION ALL

    -- Ablaufende Zertifikate (nächste 30 Tage)
    SELECT
        'expiring_certificates'::VARCHAR(50),
        COUNT(*)::BIGINT,
        0::NUMERIC,
        NOW()
    FROM certificates
    WHERE valid_to BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'

    ORDER BY metric_name;
END;
$$;


ALTER FUNCTION public.get_dashboard_stats() OWNER TO postgres;

--
-- TOC entry 427 (class 1255 OID 26941)
-- Name: get_department_asset_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_department_asset_stats() RETURNS TABLE(department_name character varying, user_count bigint, device_count bigint, accessory_count bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.name as department_name,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT dev.id) as device_count,
        COUNT(DISTINCT a.id) as accessory_count
    FROM departments d
    LEFT JOIN user_profiles up ON d.name = up.department
    LEFT JOIN users u ON up.user_id = u.id
    LEFT JOIN devices dev ON u.id = dev.assigned_to_user_id
    LEFT JOIN accessories a ON u.id = a.assigned_to_user_id
    GROUP BY d.name
    ORDER BY user_count DESC;
END;
$$;


ALTER FUNCTION public.get_department_asset_stats() OWNER TO postgres;

--
-- TOC entry 419 (class 1255 OID 26934)
-- Name: get_device_category_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_device_category_stats() RETURNS TABLE(category_name character varying, count bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT c.name, COUNT(*) as count
    FROM devices d
    LEFT JOIN categories c ON d.category_id = c.id
    GROUP BY c.name
    ORDER BY count DESC;
END;
$$;


ALTER FUNCTION public.get_device_category_stats() OWNER TO postgres;

--
-- TOC entry 411 (class 1255 OID 26027)
-- Name: get_device_statistics(date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_device_statistics(start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date) RETURNS TABLE(total_devices integer, active_devices integer, inactive_devices integer, devices_by_type jsonb, devices_by_status jsonb, devices_by_location jsonb, average_age_days integer, devices_expiring_warranty integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH device_counts AS (
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'active') as active,
            COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
            jsonb_object_agg(
                type,
                COUNT(*)
            ) as by_type,
            jsonb_object_agg(
                status,
                COUNT(*)
            ) as by_status,
            jsonb_object_agg(
                location,
                COUNT(*)
            ) as by_location,
            AVG(EXTRACT(DAY FROM (CURRENT_DATE - purchase_date)))::INTEGER as avg_age,
            COUNT(*) FILTER (WHERE warranty_end BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as expiring_warranty
        FROM devices
        WHERE
            (start_date IS NULL OR purchase_date >= start_date)
            AND (end_date IS NULL OR purchase_date <= end_date)
    )
    SELECT
        total,
        active,
        inactive,
        by_type,
        by_status,
        by_location,
        avg_age,
        expiring_warranty
    FROM device_counts;
END;
$$;


ALTER FUNCTION public.get_device_statistics(start_date date, end_date date) OWNER TO postgres;

--
-- TOC entry 418 (class 1255 OID 26933)
-- Name: get_device_status_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_device_status_stats() RETURNS TABLE(status character varying, count bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT d.status, COUNT(*) as count
    FROM devices d
    GROUP BY d.status
    ORDER BY count DESC;
END;
$$;


ALTER FUNCTION public.get_device_status_stats() OWNER TO postgres;

--
-- TOC entry 410 (class 1255 OID 26023)
-- Name: get_group_users(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_group_users(group_id integer) RETURNS TABLE(user_id integer, username character varying, name character varying, email character varying, role character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.username, u.name, u.email, u.role
    FROM users u
    JOIN user_group_members gm ON u.id = gm.user_id
    WHERE gm.group_id = group_id;
END;
$$;


ALTER FUNCTION public.get_group_users(group_id integer) OWNER TO postgres;

--
-- TOC entry 414 (class 1255 OID 26030)
-- Name: get_inventory_statistics(date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_inventory_statistics(start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date) RETURNS TABLE(total_items integer, found_items integer, missing_items integer, items_by_status jsonb, items_by_location jsonb, last_inventory_date timestamp with time zone, next_inventory_date timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH inventory_counts AS (
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'found') as found,
            COUNT(*) FILTER (WHERE status = 'missing') as missing,
            jsonb_object_agg(
                status,
                COUNT(*)
            ) as by_status,
            jsonb_object_agg(
                location,
                COUNT(*)
            ) as by_location,
            MAX(checked_at) as last_inventory,
            MAX(checked_at) + INTERVAL '30 days' as next_inventory
        FROM inventory
        WHERE
            (start_date IS NULL OR checked_at >= start_date)
            AND (end_date IS NULL OR checked_at <= end_date)
    )
    SELECT
        total,
        found,
        missing,
        by_status,
        by_location,
        last_inventory,
        next_inventory
    FROM inventory_counts;
END;
$$;


ALTER FUNCTION public.get_inventory_statistics(start_date date, end_date date) OWNER TO postgres;

--
-- TOC entry 423 (class 1255 OID 26938)
-- Name: get_last_inventory_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_last_inventory_stats() RETURNS TABLE(status character varying, device_count bigint, accessory_count bigint)
    LANGUAGE plpgsql
    AS $$
DECLARE
    last_session_id INTEGER;
BEGIN
    -- Letzte aktive oder abgeschlossene Session finden
    SELECT id INTO last_session_id
    FROM inventory_sessions
    WHERE status IN ('active', 'completed')
    ORDER BY start_date DESC
    LIMIT 1;

    RETURN QUERY
    SELECT
        ic.status,
        COUNT(DISTINCT ic.device_id) as device_count,
        COUNT(DISTINCT ic.accessory_id) as accessory_count
    FROM inventory_checks ic
    WHERE ic.session_id = last_session_id
    GROUP BY ic.status
    ORDER BY ic.status;
END;
$$;


ALTER FUNCTION public.get_last_inventory_stats() OWNER TO postgres;

--
-- TOC entry 420 (class 1255 OID 26935)
-- Name: get_license_expiry_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_license_expiry_stats() RETURNS TABLE(expiry_status character varying, count bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN expiry_date IS NULL THEN 'permanent'
            WHEN expiry_date < CURRENT_DATE THEN 'expired'
            WHEN expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
            ELSE 'active'
        END as expiry_status,
        COUNT(*) as count
    FROM licenses
    GROUP BY expiry_status
    ORDER BY count DESC;
END;
$$;


ALTER FUNCTION public.get_license_expiry_stats() OWNER TO postgres;

--
-- TOC entry 412 (class 1255 OID 26028)
-- Name: get_license_statistics(date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_license_statistics(start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date) RETURNS TABLE(total_licenses integer, active_licenses integer, expired_licenses integer, licenses_by_type jsonb, licenses_by_vendor jsonb, total_seats integer, used_seats integer, licenses_expiring_soon integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH license_counts AS (
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'active') as active,
            COUNT(*) FILTER (WHERE status = 'expired') as expired,
            jsonb_object_agg(
                type,
                COUNT(*)
            ) as by_type,
            jsonb_object_agg(
                vendor,
                COUNT(*)
            ) as by_vendor,
            SUM(seats) as total_seats,
            SUM(used_seats) as used_seats,
            COUNT(*) FILTER (WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as expiring_soon
        FROM licenses
        WHERE
            (start_date IS NULL OR purchase_date >= start_date)
            AND (end_date IS NULL OR purchase_date <= end_date)
    )
    SELECT
        total,
        active,
        expired,
        by_type,
        by_vendor,
        total_seats,
        used_seats,
        expiring_soon
    FROM license_counts;
END;
$$;


ALTER FUNCTION public.get_license_statistics(start_date date, end_date date) OWNER TO postgres;

--
-- TOC entry 426 (class 1255 OID 26940)
-- Name: get_location_asset_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_location_asset_stats() RETURNS TABLE(location_name character varying, device_count bigint, accessory_count bigint, total_assets bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.name as location_name,
        COUNT(DISTINCT d.id) as device_count,
        COUNT(DISTINCT a.id) as accessory_count,
        COUNT(DISTINCT d.id) + COUNT(DISTINCT a.id) as total_assets
    FROM locations l
    LEFT JOIN rooms r ON l.id = r.location_id
    LEFT JOIN devices d ON r.id = d.room_id
    LEFT JOIN accessories a ON a.location = l.name
    GROUP BY l.name
    ORDER BY total_assets DESC;
END;
$$;


ALTER FUNCTION public.get_location_asset_stats() OWNER TO postgres;

--
-- TOC entry 425 (class 1255 OID 26942)
-- Name: get_maintenance_stats(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_maintenance_stats(days_back integer DEFAULT 30) RETURNS TABLE(device_type character varying, total_tickets bigint, open_tickets bigint, resolved_tickets bigint, avg_resolution_time interval)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH maintenance_tickets AS (
        SELECT
            d.type as device_type,
            t.status,
            t.created_at,
            t.updated_at,
            CASE
                WHEN t.status = 'closed' THEN
                    t.updated_at - t.created_at
                ELSE NULL
            END as resolution_time
        FROM tickets t
        JOIN devices d ON t.device_id = d.id
        WHERE t.type = 'maintenance'
        AND t.created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL
    )
    SELECT
        mt.device_type,
        COUNT(*) as total_tickets,
        COUNT(*) FILTER (WHERE status = 'open') as open_tickets,
        COUNT(*) FILTER (WHERE status = 'closed') as resolved_tickets,
        AVG(resolution_time) as avg_resolution_time
    FROM maintenance_tickets mt
    GROUP BY mt.device_type
    ORDER BY total_tickets DESC;
END;
$$;


ALTER FUNCTION public.get_maintenance_stats(days_back integer) OWNER TO postgres;

--
-- TOC entry 428 (class 1255 OID 28883)
-- Name: get_mobile_minimal_data(integer, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_mobile_minimal_data(p_device_id integer, p_data_type character varying) RETURNS TABLE(id integer, data jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        md.data_id,
        md.data
    FROM mobile_offline_data md
    WHERE md.device_id = p_device_id
    AND md.data_type = p_data_type
    AND md.sync_status = 'pending';
END;
$$;


ALTER FUNCTION public.get_mobile_minimal_data(p_device_id integer, p_data_type character varying) OWNER TO postgres;

--
-- TOC entry 416 (class 1255 OID 26032)
-- Name: get_ticket_statistics(date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_ticket_statistics(start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date) RETURNS TABLE(total_tickets integer, open_tickets integer, closed_tickets integer, tickets_by_status jsonb, tickets_by_priority jsonb, tickets_by_assignee jsonb, average_resolution_time interval)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH ticket_counts AS (
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'open') as open,
            COUNT(*) FILTER (WHERE status = 'closed') as closed,
            jsonb_object_agg(
                status,
                COUNT(*)
            ) as by_status,
            jsonb_object_agg(
                priority,
                COUNT(*)
            ) as by_priority,
            jsonb_object_agg(
                COALESCE(assigned_to::TEXT, 'unassigned'),
                COUNT(*)
            ) as by_assignee,
            AVG(closed_at - created_at) as avg_resolution_time
        FROM tickets
        WHERE
            (start_date IS NULL OR created_at >= start_date)
            AND (end_date IS NULL OR created_at <= end_date)
    )
    SELECT
        total,
        open,
        closed,
        by_status,
        by_priority,
        by_assignee,
        avg_resolution_time
    FROM ticket_counts;
END;
$$;


ALTER FUNCTION public.get_ticket_statistics(start_date date, end_date date) OWNER TO postgres;

--
-- TOC entry 422 (class 1255 OID 26937)
-- Name: get_ticket_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_ticket_stats() RETURNS TABLE(ticket_status character varying, priority character varying, count bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT t.status, t.priority, COUNT(*) as count
    FROM tickets t
    GROUP BY t.status, t.priority
    ORDER BY t.status, t.priority;
END;
$$;


ALTER FUNCTION public.get_ticket_stats() OWNER TO postgres;

--
-- TOC entry 415 (class 1255 OID 26031)
-- Name: get_todo_statistics(date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_todo_statistics(start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date) RETURNS TABLE(total_todos integer, pending_todos integer, completed_todos integer, todos_by_status jsonb, todos_by_priority jsonb, todos_by_assignee jsonb, overdue_todos integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH todo_counts AS (
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            jsonb_object_agg(
                status,
                COUNT(*)
            ) as by_status,
            jsonb_object_agg(
                priority,
                COUNT(*)
            ) as by_priority,
            jsonb_object_agg(
                COALESCE(assigned_to::TEXT, 'unassigned'),
                COUNT(*)
            ) as by_assignee,
            COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed') as overdue
        FROM todos
        WHERE
            (start_date IS NULL OR created_at >= start_date)
            AND (end_date IS NULL OR created_at <= end_date)
    )
    SELECT
        total,
        pending,
        completed,
        by_status,
        by_priority,
        by_assignee,
        overdue
    FROM todo_counts;
END;
$$;


ALTER FUNCTION public.get_todo_statistics(start_date date, end_date date) OWNER TO postgres;

--
-- TOC entry 424 (class 1255 OID 26939)
-- Name: get_user_asset_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_asset_stats() RETURNS TABLE(username character varying, device_count bigint, accessory_count bigint, total_assets bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.username,
        COUNT(DISTINCT d.id) as device_count,
        COUNT(DISTINCT a.id) as accessory_count,
        COUNT(DISTINCT d.id) + COUNT(DISTINCT a.id) as total_assets
    FROM users u
    LEFT JOIN devices d ON u.id = d.assigned_to_user_id
    LEFT JOIN accessories a ON u.id = a.assigned_to_user_id
    GROUP BY u.username
    ORDER BY total_assets DESC;
END;
$$;


ALTER FUNCTION public.get_user_asset_stats() OWNER TO postgres;

--
-- TOC entry 409 (class 1255 OID 26022)
-- Name: get_user_groups(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_groups(user_id integer) RETURNS TABLE(group_id integer, group_name character varying, description text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT g.id, g.name, g.description
    FROM user_groups g
    JOIN user_group_members gm ON g.id = gm.group_id
    WHERE gm.user_id = user_id;
END;
$$;


ALTER FUNCTION public.get_user_groups(user_id integer) OWNER TO postgres;

--
-- TOC entry 408 (class 1255 OID 26021)
-- Name: get_user_permissions(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_permissions(user_id integer) RETURNS TABLE(permission_name character varying, module character varying, action character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.name, p.module, p.action
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN roles r ON rp.role_id = r.id
    JOIN users u ON u.role = r.name
    WHERE u.id = user_id;
END;
$$;


ALTER FUNCTION public.get_user_permissions(user_id integer) OWNER TO postgres;

--
-- TOC entry 398 (class 1255 OID 25851)
-- Name: restore_backup(text, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.restore_backup(p_backup_file text, p_clean_restore boolean DEFAULT false) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_success BOOLEAN;
BEGIN
    -- Prüfe, ob die Backup-Datei existiert
    IF NOT EXISTS (SELECT 1 FROM pg_ls_dir(p_backup_file)) THEN
        RAISE EXCEPTION 'Backup-Datei % existiert nicht', p_backup_file;
    END IF;

    -- Führe pg_restore aus
    IF p_clean_restore THEN
        PERFORM pg_execute(
            'pg_restore -c -d atlas ' || quote_literal(p_backup_file)
        );
    ELSE
        PERFORM pg_execute(
            'pg_restore -d atlas ' || quote_literal(p_backup_file)
        );
    END IF;

    -- Protokolliere die Wiederherstellung
    INSERT INTO restore_logs (
        backup_file,
        clean_restore,
        restored_at
    ) VALUES (
        p_backup_file,
        p_clean_restore,
        CURRENT_TIMESTAMP
    );

    RETURN true;
END;
$$;


ALTER FUNCTION public.restore_backup(p_backup_file text, p_clean_restore boolean) OWNER TO postgres;

--
-- TOC entry 431 (class 1255 OID 28958)
-- Name: update_next_sync_time(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_next_sync_time(p_config_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE integration_configs
    SET
        next_sync_at = CURRENT_TIMESTAMP + (sync_interval || ' minutes')::INTERVAL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_config_id
    AND sync_interval IS NOT NULL;
END;
$$;


ALTER FUNCTION public.update_next_sync_time(p_config_id integer) OWNER TO postgres;

--
-- TOC entry 430 (class 1255 OID 28884)
-- Name: update_sync_status(integer, character varying, integer, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_sync_status(p_device_id integer, p_data_type character varying, p_data_id integer, p_status character varying) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE mobile_offline_data
    SET
        sync_status = p_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE device_id = p_device_id
    AND data_type = p_data_type
    AND data_id = p_data_id;
END;
$$;


ALTER FUNCTION public.update_sync_status(p_device_id integer, p_data_type character varying, p_data_id integer, p_status character varying) OWNER TO postgres;

--
-- TOC entry 381 (class 1255 OID 26398)
-- Name: update_timestamp_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_timestamp_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_timestamp_column() OWNER TO postgres;

--
-- TOC entry 399 (class 1255 OID 25852)
-- Name: verify_backup(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.verify_backup(p_backup_file text) RETURNS TABLE(is_valid boolean, error_message text, backup_size bigint, backup_date timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN pg_is_ready() THEN true
            ELSE false
        END as is_valid,
        CASE
            WHEN NOT EXISTS (SELECT 1 FROM pg_ls_dir(p_backup_file)) THEN
                'Backup-Datei existiert nicht'
            WHEN pg_size_file(p_backup_file) = 0 THEN
                'Backup-Datei ist leer'
            ELSE
                NULL
        END as error_message,
        pg_size_file(p_backup_file) as backup_size,
        (SELECT created_at FROM backup_logs WHERE backup_file = p_backup_file) as backup_date;
END;
$$;


ALTER FUNCTION public.verify_backup(p_backup_file text) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 265 (class 1259 OID 29279)
-- Name: accessories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accessories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    model character varying(100),
    serial_number character varying(100),
    status character varying(20) DEFAULT 'available'::character varying NOT NULL,
    location character varying(100),
    purchase_date date,
    notes text,
    assigned_to_device_id integer,
    assigned_to_user_id integer,
    category_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.accessories OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 25481)
-- Name: accessories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.accessories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accessories_id_seq OWNER TO postgres;

--
-- TOC entry 264 (class 1259 OID 29278)
-- Name: accessories_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.accessories_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accessories_id_seq1 OWNER TO postgres;

--
-- TOC entry 6352 (class 0 OID 0)
-- Dependencies: 264
-- Name: accessories_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.accessories_id_seq1 OWNED BY public.accessories.id;


--
-- TOC entry 269 (class 1259 OID 29333)
-- Name: accessory_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accessory_history (
    id integer NOT NULL,
    accessory_id integer NOT NULL,
    user_id integer,
    device_id integer,
    action character varying(20) NOT NULL,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    notes text,
    performed_by_user_id integer
);


ALTER TABLE public.accessory_history OWNER TO postgres;

--
-- TOC entry 268 (class 1259 OID 29332)
-- Name: accessory_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.accessory_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accessory_history_id_seq OWNER TO postgres;

--
-- TOC entry 6355 (class 0 OID 0)
-- Dependencies: 268
-- Name: accessory_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.accessory_history_id_seq OWNED BY public.accessory_history.id;


--
-- TOC entry 301 (class 1259 OID 29816)
-- Name: asset_custom_field_values; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_custom_field_values (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    asset_type character varying(50) NOT NULL,
    field_id integer NOT NULL,
    value text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.asset_custom_field_values OWNER TO postgres;

--
-- TOC entry 300 (class 1259 OID 29815)
-- Name: asset_custom_field_values_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.asset_custom_field_values_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.asset_custom_field_values_id_seq OWNER TO postgres;

--
-- TOC entry 6358 (class 0 OID 0)
-- Dependencies: 300
-- Name: asset_custom_field_values_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.asset_custom_field_values_id_seq OWNED BY public.asset_custom_field_values.id;


--
-- TOC entry 299 (class 1259 OID 29802)
-- Name: asset_custom_fields; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_custom_fields (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    field_type character varying(50) NOT NULL,
    options jsonb,
    is_required boolean DEFAULT false,
    asset_type character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.asset_custom_fields OWNER TO postgres;

--
-- TOC entry 298 (class 1259 OID 29801)
-- Name: asset_custom_fields_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.asset_custom_fields_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.asset_custom_fields_id_seq OWNER TO postgres;

--
-- TOC entry 6361 (class 0 OID 0)
-- Dependencies: 298
-- Name: asset_custom_fields_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.asset_custom_fields_id_seq OWNED BY public.asset_custom_fields.id;


--
-- TOC entry 378 (class 1259 OID 31104)
-- Name: asset_tag_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_tag_settings (
    id integer NOT NULL,
    prefix character varying(10) NOT NULL,
    current_number integer DEFAULT 1 NOT NULL,
    digit_count integer DEFAULT 6 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.asset_tag_settings OWNER TO postgres;

--
-- TOC entry 377 (class 1259 OID 31103)
-- Name: asset_tag_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.asset_tag_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.asset_tag_settings_id_seq OWNER TO postgres;

--
-- TOC entry 6364 (class 0 OID 0)
-- Dependencies: 377
-- Name: asset_tag_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.asset_tag_settings_id_seq OWNED BY public.asset_tag_settings.id;


--
-- TOC entry 239 (class 1259 OID 28963)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(50) NOT NULL,
    table_name character varying(50) NOT NULL,
    record_id integer,
    old_values jsonb,
    new_values jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 28962)
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- TOC entry 6367 (class 0 OID 0)
-- Dependencies: 238
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- TOC entry 323 (class 1259 OID 30335)
-- Name: calendar_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.calendar_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    color character varying(20),
    icon character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.calendar_categories OWNER TO postgres;

--
-- TOC entry 322 (class 1259 OID 30334)
-- Name: calendar_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.calendar_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.calendar_categories_id_seq OWNER TO postgres;

--
-- TOC entry 6370 (class 0 OID 0)
-- Dependencies: 322
-- Name: calendar_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.calendar_categories_id_seq OWNED BY public.calendar_categories.id;


--
-- TOC entry 325 (class 1259 OID 30348)
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.calendar_events (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    category_id integer,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    all_day boolean DEFAULT false,
    location character varying(255),
    url character varying(255),
    is_recurring boolean DEFAULT false,
    recurrence_rule character varying(255),
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.calendar_events OWNER TO postgres;

--
-- TOC entry 324 (class 1259 OID 30347)
-- Name: calendar_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.calendar_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.calendar_events_id_seq OWNER TO postgres;

--
-- TOC entry 6373 (class 0 OID 0)
-- Dependencies: 324
-- Name: calendar_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.calendar_events_id_seq OWNED BY public.calendar_events.id;


--
-- TOC entry 285 (class 1259 OID 29675)
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    parent_id integer,
    type character varying(50) NOT NULL,
    icon character varying(50),
    color character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 25482)
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- TOC entry 284 (class 1259 OID 29674)
-- Name: categories_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq1 OWNER TO postgres;

--
-- TOC entry 6377 (class 0 OID 0)
-- Dependencies: 284
-- Name: categories_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq1 OWNED BY public.categories.id;


--
-- TOC entry 263 (class 1259 OID 29262)
-- Name: certificates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.certificates (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    issuer character varying(100),
    valid_from date NOT NULL,
    valid_to date NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    notes text,
    category_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.certificates OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 25483)
-- Name: certificates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.certificates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.certificates_id_seq OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 29261)
-- Name: certificates_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.certificates_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.certificates_id_seq1 OWNER TO postgres;

--
-- TOC entry 6381 (class 0 OID 0)
-- Dependencies: 262
-- Name: certificates_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.certificates_id_seq1 OWNED BY public.certificates.id;


--
-- TOC entry 295 (class 1259 OID 29745)
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 25484)
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.departments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.departments_id_seq OWNER TO postgres;

--
-- TOC entry 294 (class 1259 OID 29744)
-- Name: departments_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.departments_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.departments_id_seq1 OWNER TO postgres;

--
-- TOC entry 6385 (class 0 OID 0)
-- Dependencies: 294
-- Name: departments_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.departments_id_seq1 OWNED BY public.departments.id;


--
-- TOC entry 267 (class 1259 OID 29308)
-- Name: device_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.device_history (
    id integer NOT NULL,
    device_id integer NOT NULL,
    user_id integer,
    action character varying(20) NOT NULL,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    notes text,
    performed_by_user_id integer
);


ALTER TABLE public.device_history OWNER TO postgres;

--
-- TOC entry 266 (class 1259 OID 29307)
-- Name: device_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.device_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.device_history_id_seq OWNER TO postgres;

--
-- TOC entry 6388 (class 0 OID 0)
-- Dependencies: 266
-- Name: device_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.device_history_id_seq OWNED BY public.device_history.id;


--
-- TOC entry 375 (class 1259 OID 31052)
-- Name: device_models; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.device_models (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    manufacturer_id integer,
    category_id integer,
    specifications text,
    cpu character varying(100),
    ram character varying(100),
    hdd character varying(100),
    warranty_months integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.device_models OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 25485)
-- Name: device_models_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.device_models_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.device_models_id_seq OWNER TO postgres;

--
-- TOC entry 374 (class 1259 OID 31051)
-- Name: device_models_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.device_models_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.device_models_id_seq1 OWNER TO postgres;

--
-- TOC entry 6392 (class 0 OID 0)
-- Dependencies: 374
-- Name: device_models_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.device_models_id_seq1 OWNED BY public.device_models.id;


--
-- TOC entry 376 (class 1259 OID 31098)
-- Name: device_models_with_count; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.device_models_with_count AS
SELECT
    NULL::integer AS id,
    NULL::character varying(100) AS name,
    NULL::text AS description,
    NULL::integer AS manufacturer_id,
    NULL::character varying(100) AS manufacturer_name,
    NULL::integer AS category_id,
    NULL::character varying(100) AS category_name,
    NULL::text AS specifications,
    NULL::character varying(100) AS cpu,
    NULL::character varying(100) AS ram,
    NULL::character varying(100) AS hdd,
    NULL::integer AS warranty_months,
    NULL::boolean AS is_active,
    NULL::timestamp without time zone AS created_at,
    NULL::timestamp without time zone AS updated_at,
    NULL::bigint AS device_count;


ALTER VIEW public.device_models_with_count OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 29213)
-- Name: devices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.devices (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    model integer,
    serial_number character varying(100),
    status character varying(20) DEFAULT 'available'::character varying NOT NULL,
    location character varying(100),
    purchase_date date,
    warranty_end date,
    notes text,
    assigned_to_user_id integer,
    last_checked_date timestamp with time zone,
    category_id integer,
    room_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    asset_tag character varying(20)
);


ALTER TABLE public.devices OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 25486)
-- Name: devices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.devices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.devices_id_seq OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 29212)
-- Name: devices_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.devices_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.devices_id_seq1 OWNER TO postgres;

--
-- TOC entry 6397 (class 0 OID 0)
-- Dependencies: 258
-- Name: devices_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.devices_id_seq1 OWNED BY public.devices.id;


--
-- TOC entry 319 (class 1259 OID 30280)
-- Name: document_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_attachments (
    id integer NOT NULL,
    document_id integer,
    asset_type character varying(50) NOT NULL,
    asset_id integer NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.document_attachments OWNER TO postgres;

--
-- TOC entry 318 (class 1259 OID 30279)
-- Name: document_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_attachments_id_seq OWNER TO postgres;

--
-- TOC entry 6400 (class 0 OID 0)
-- Dependencies: 318
-- Name: document_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_attachments_id_seq OWNED BY public.document_attachments.id;


--
-- TOC entry 315 (class 1259 OID 30245)
-- Name: document_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    icon character varying(50),
    color character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.document_categories OWNER TO postgres;

--
-- TOC entry 314 (class 1259 OID 30244)
-- Name: document_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_categories_id_seq OWNER TO postgres;

--
-- TOC entry 6403 (class 0 OID 0)
-- Dependencies: 314
-- Name: document_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_categories_id_seq OWNED BY public.document_categories.id;


--
-- TOC entry 321 (class 1259 OID 30301)
-- Name: document_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_versions (
    id integer NOT NULL,
    document_id integer,
    version_number integer NOT NULL,
    file_path character varying(255) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_size integer NOT NULL,
    hash character varying(64),
    change_description text,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.document_versions OWNER TO postgres;

--
-- TOC entry 320 (class 1259 OID 30300)
-- Name: document_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_versions_id_seq OWNER TO postgres;

--
-- TOC entry 6406 (class 0 OID 0)
-- Dependencies: 320
-- Name: document_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_versions_id_seq OWNED BY public.document_versions.id;


--
-- TOC entry 317 (class 1259 OID 30258)
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    category_id integer,
    file_path character varying(255) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_type character varying(50) NOT NULL,
    file_size integer NOT NULL,
    mime_type character varying(100) NOT NULL,
    hash character varying(64),
    is_public boolean DEFAULT false,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 25487)
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO postgres;

--
-- TOC entry 316 (class 1259 OID 30257)
-- Name: documents_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq1 OWNER TO postgres;

--
-- TOC entry 6410 (class 0 OID 0)
-- Dependencies: 316
-- Name: documents_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_id_seq1 OWNED BY public.documents.id;


--
-- TOC entry 224 (class 1259 OID 25488)
-- Name: handover_protocols_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.handover_protocols_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.handover_protocols_id_seq OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 25489)
-- Name: history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.history_id_seq OWNER TO postgres;

--
-- TOC entry 369 (class 1259 OID 30932)
-- Name: integration_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.integration_configs (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    system_type character varying(50) NOT NULL,
    config_data jsonb NOT NULL,
    is_active boolean DEFAULT true,
    sync_interval integer,
    last_sync_at timestamp with time zone,
    next_sync_at timestamp with time zone,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.integration_configs OWNER TO postgres;

--
-- TOC entry 368 (class 1259 OID 30931)
-- Name: integration_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.integration_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.integration_configs_id_seq OWNER TO postgres;

--
-- TOC entry 6415 (class 0 OID 0)
-- Dependencies: 368
-- Name: integration_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.integration_configs_id_seq OWNED BY public.integration_configs.id;


--
-- TOC entry 371 (class 1259 OID 30951)
-- Name: integration_mappings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.integration_mappings (
    id integer NOT NULL,
    config_id integer,
    source_type character varying(50) NOT NULL,
    source_id character varying(255) NOT NULL,
    target_type character varying(50) NOT NULL,
    target_id integer NOT NULL,
    mapping_data jsonb,
    is_active boolean DEFAULT true,
    last_sync_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.integration_mappings OWNER TO postgres;

--
-- TOC entry 370 (class 1259 OID 30950)
-- Name: integration_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.integration_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.integration_mappings_id_seq OWNER TO postgres;

--
-- TOC entry 6418 (class 0 OID 0)
-- Dependencies: 370
-- Name: integration_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.integration_mappings_id_seq OWNED BY public.integration_mappings.id;


--
-- TOC entry 373 (class 1259 OID 30970)
-- Name: integration_sync_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.integration_sync_logs (
    id integer NOT NULL,
    config_id integer,
    sync_type character varying(50) NOT NULL,
    status character varying(20) NOT NULL,
    items_processed integer DEFAULT 0,
    items_failed integer DEFAULT 0,
    error_message text,
    started_at timestamp with time zone NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.integration_sync_logs OWNER TO postgres;

--
-- TOC entry 372 (class 1259 OID 30969)
-- Name: integration_sync_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.integration_sync_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.integration_sync_logs_id_seq OWNER TO postgres;

--
-- TOC entry 6421 (class 0 OID 0)
-- Dependencies: 372
-- Name: integration_sync_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.integration_sync_logs_id_seq OWNED BY public.integration_sync_logs.id;


--
-- TOC entry 273 (class 1259 OID 29425)
-- Name: inventory_checks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_checks (
    id integer NOT NULL,
    session_id integer NOT NULL,
    device_id integer,
    accessory_id integer,
    status character varying(20) NOT NULL,
    location character varying(100),
    checked_by_user_id integer,
    check_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_device_or_accessory CHECK ((((device_id IS NOT NULL) AND (accessory_id IS NULL)) OR ((device_id IS NULL) AND (accessory_id IS NOT NULL))))
);


ALTER TABLE public.inventory_checks OWNER TO postgres;

--
-- TOC entry 272 (class 1259 OID 29424)
-- Name: inventory_checks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_checks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_checks_id_seq OWNER TO postgres;

--
-- TOC entry 6424 (class 0 OID 0)
-- Dependencies: 272
-- Name: inventory_checks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_checks_id_seq OWNED BY public.inventory_checks.id;


--
-- TOC entry 271 (class 1259 OID 29408)
-- Name: inventory_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_sessions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    notes text,
    created_by_user_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.inventory_sessions OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 25490)
-- Name: inventory_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_sessions_id_seq OWNER TO postgres;

--
-- TOC entry 270 (class 1259 OID 29407)
-- Name: inventory_sessions_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_sessions_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_sessions_id_seq1 OWNER TO postgres;

--
-- TOC entry 6428 (class 0 OID 0)
-- Dependencies: 270
-- Name: inventory_sessions_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_sessions_id_seq1 OWNED BY public.inventory_sessions.id;


--
-- TOC entry 241 (class 1259 OID 28973)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    display_name character varying(100),
    email character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'user'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    first_name character varying(255),
    last_name character varying(255),
    last_login timestamp with time zone,
    location_id integer,
    room_id integer
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 283 (class 1259 OID 29656)
-- Name: inventory_status_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.inventory_status_view AS
 SELECT inv_session.id AS session_id,
    inv_session.name AS session_name,
    inv_session.start_date,
    inv_session.end_date,
    inv_session.status AS session_status,
    count(DISTINCT ic.id) AS total_checks,
    count(DISTINCT ic.device_id) AS checked_devices,
    count(DISTINCT ic.accessory_id) AS checked_accessories,
    count(DISTINCT
        CASE
            WHEN ((ic.status)::text = 'verified'::text) THEN ic.id
            ELSE NULL::integer
        END) AS verified_items,
    count(DISTINCT
        CASE
            WHEN ((ic.status)::text = 'missing'::text) THEN ic.id
            ELSE NULL::integer
        END) AS missing_items,
    count(DISTINCT
        CASE
            WHEN ((ic.status)::text = 'damaged'::text) THEN ic.id
            ELSE NULL::integer
        END) AS damaged_items,
    creator.username AS created_by,
    inv_session.created_at
   FROM ((public.inventory_sessions inv_session
     LEFT JOIN public.inventory_checks ic ON ((ic.session_id = inv_session.id)))
     LEFT JOIN public.users creator ON ((inv_session.created_by_user_id = creator.id)))
  GROUP BY inv_session.id, inv_session.name, inv_session.start_date, inv_session.end_date, inv_session.status, creator.username, inv_session.created_at;


ALTER VIEW public.inventory_status_view OWNER TO postgres;

--
-- TOC entry 380 (class 1259 OID 31118)
-- Name: label_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.label_settings (
    id integer NOT NULL,
    user_id integer,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.label_settings OWNER TO postgres;

--
-- TOC entry 6432 (class 0 OID 0)
-- Dependencies: 380
-- Name: TABLE label_settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.label_settings IS 'Tabelle zur Speicherung der benutzerdefinierten Etiketten-Einstellungen im ATLAS-System';


--
-- TOC entry 6433 (class 0 OID 0)
-- Dependencies: 380
-- Name: COLUMN label_settings.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.label_settings.user_id IS 'Nutzer-ID (null für globale Standardeinstellungen)';


--
-- TOC entry 6434 (class 0 OID 0)
-- Dependencies: 380
-- Name: COLUMN label_settings.settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.label_settings.settings IS 'JSON-Objekt mit allen Etiketten-Einstellungen (Format, Größe, Inhalt, etc.)';


--
-- TOC entry 379 (class 1259 OID 31117)
-- Name: label_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.label_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.label_settings_id_seq OWNER TO postgres;

--
-- TOC entry 6436 (class 0 OID 0)
-- Dependencies: 379
-- Name: label_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.label_settings_id_seq OWNED BY public.label_settings.id;


--
-- TOC entry 261 (class 1259 OID 29242)
-- Name: licenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.licenses (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    key_code character varying(255),
    vendor character varying(100),
    purchase_date date,
    expiry_date date,
    seats integer DEFAULT 1 NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    notes text,
    category_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.licenses OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 29241)
-- Name: licenses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.licenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.licenses_id_seq OWNER TO postgres;

--
-- TOC entry 6439 (class 0 OID 0)
-- Dependencies: 260
-- Name: licenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.licenses_id_seq OWNED BY public.licenses.id;


--
-- TOC entry 293 (class 1259 OID 29732)
-- Name: locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.locations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    address text,
    city character varying(100),
    postal_code character varying(20),
    country character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.locations OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 25491)
-- Name: locations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.locations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.locations_id_seq OWNER TO postgres;

--
-- TOC entry 292 (class 1259 OID 29731)
-- Name: locations_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.locations_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.locations_id_seq1 OWNER TO postgres;

--
-- TOC entry 6443 (class 0 OID 0)
-- Dependencies: 292
-- Name: locations_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.locations_id_seq1 OWNED BY public.locations.id;


--
-- TOC entry 287 (class 1259 OID 29693)
-- Name: manufacturers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.manufacturers (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    website character varying(255),
    contact_email character varying(255),
    contact_phone character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true
);


ALTER TABLE public.manufacturers OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 25492)
-- Name: manufacturers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.manufacturers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.manufacturers_id_seq OWNER TO postgres;

--
-- TOC entry 286 (class 1259 OID 29692)
-- Name: manufacturers_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.manufacturers_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.manufacturers_id_seq1 OWNER TO postgres;

--
-- TOC entry 6447 (class 0 OID 0)
-- Dependencies: 286
-- Name: manufacturers_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.manufacturers_id_seq1 OWNED BY public.manufacturers.id;


--
-- TOC entry 363 (class 1259 OID 30860)
-- Name: mobile_devices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mobile_devices (
    id integer NOT NULL,
    device_id character varying(255) NOT NULL,
    user_id integer,
    device_name character varying(255),
    device_type character varying(50) NOT NULL,
    device_model character varying(255),
    os_version character varying(50),
    app_version character varying(50),
    last_sync_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.mobile_devices OWNER TO postgres;

--
-- TOC entry 362 (class 1259 OID 30859)
-- Name: mobile_devices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mobile_devices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mobile_devices_id_seq OWNER TO postgres;

--
-- TOC entry 6450 (class 0 OID 0)
-- Dependencies: 362
-- Name: mobile_devices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mobile_devices_id_seq OWNED BY public.mobile_devices.id;


--
-- TOC entry 365 (class 1259 OID 30879)
-- Name: mobile_offline_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mobile_offline_data (
    id integer NOT NULL,
    device_id integer,
    data_type character varying(50) NOT NULL,
    data_id integer NOT NULL,
    data jsonb NOT NULL,
    sync_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.mobile_offline_data OWNER TO postgres;

--
-- TOC entry 364 (class 1259 OID 30878)
-- Name: mobile_offline_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mobile_offline_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mobile_offline_data_id_seq OWNER TO postgres;

--
-- TOC entry 6453 (class 0 OID 0)
-- Dependencies: 364
-- Name: mobile_offline_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mobile_offline_data_id_seq OWNED BY public.mobile_offline_data.id;


--
-- TOC entry 367 (class 1259 OID 30898)
-- Name: mobile_sync_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mobile_sync_logs (
    id integer NOT NULL,
    device_id integer,
    sync_type character varying(50) NOT NULL,
    status character varying(20) NOT NULL,
    items_processed integer DEFAULT 0,
    items_failed integer DEFAULT 0,
    error_message text,
    started_at timestamp with time zone NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.mobile_sync_logs OWNER TO postgres;

--
-- TOC entry 366 (class 1259 OID 30897)
-- Name: mobile_sync_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mobile_sync_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mobile_sync_logs_id_seq OWNER TO postgres;

--
-- TOC entry 6456 (class 0 OID 0)
-- Dependencies: 366
-- Name: mobile_sync_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mobile_sync_logs_id_seq OWNED BY public.mobile_sync_logs.id;


--
-- TOC entry 305 (class 1259 OID 29880)
-- Name: network_cabinets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.network_cabinets (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    location_id integer,
    room_id integer,
    cabinet_number character varying(50),
    height_units integer,
    width_cm integer,
    depth_cm integer,
    power_supply character varying(100),
    cooling character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.network_cabinets OWNER TO postgres;

--
-- TOC entry 304 (class 1259 OID 29879)
-- Name: network_cabinets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.network_cabinets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.network_cabinets_id_seq OWNER TO postgres;

--
-- TOC entry 6459 (class 0 OID 0)
-- Dependencies: 304
-- Name: network_cabinets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.network_cabinets_id_seq OWNED BY public.network_cabinets.id;


--
-- TOC entry 313 (class 1259 OID 30172)
-- Name: network_ports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.network_ports (
    id integer NOT NULL,
    port_number integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.network_ports OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 25493)
-- Name: network_ports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.network_ports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.network_ports_id_seq OWNER TO postgres;

--
-- TOC entry 312 (class 1259 OID 30171)
-- Name: network_ports_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.network_ports_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.network_ports_id_seq1 OWNER TO postgres;

--
-- TOC entry 6463 (class 0 OID 0)
-- Dependencies: 312
-- Name: network_ports_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.network_ports_id_seq1 OWNED BY public.network_ports.id;


--
-- TOC entry 311 (class 1259 OID 30153)
-- Name: network_sockets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.network_sockets (
    id integer NOT NULL,
    description text,
    room_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    outlet_number character varying(50) NOT NULL,
    location_id integer,
    is_active boolean DEFAULT true
);


ALTER TABLE public.network_sockets OWNER TO postgres;

--
-- TOC entry 6465 (class 0 OID 0)
-- Dependencies: 311
-- Name: COLUMN network_sockets.outlet_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.network_sockets.outlet_number IS 'Dosennummer (z.B. 26815.01.02.22)';


--
-- TOC entry 6466 (class 0 OID 0)
-- Dependencies: 311
-- Name: COLUMN network_sockets.location_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.network_sockets.location_id IS 'Verknüpfung mit Standort';


--
-- TOC entry 6467 (class 0 OID 0)
-- Dependencies: 311
-- Name: COLUMN network_sockets.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.network_sockets.is_active IS 'Status, ob die Dose aktiv/inaktiv ist';


--
-- TOC entry 310 (class 1259 OID 30152)
-- Name: network_sockets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.network_sockets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.network_sockets_id_seq OWNER TO postgres;

--
-- TOC entry 6469 (class 0 OID 0)
-- Dependencies: 310
-- Name: network_sockets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.network_sockets_id_seq OWNED BY public.network_sockets.id;


--
-- TOC entry 309 (class 1259 OID 30115)
-- Name: network_switches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.network_switches (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    manufacturer_id integer,
    model character varying(100),
    ip_address character varying(45),
    mac_address character varying(17),
    location_id integer,
    room_id integer,
    cabinet_id integer,
    rack_position integer,
    port_count integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    management_url character varying(255),
    notes text,
    uplink_port character varying(20),
    CONSTRAINT network_switches_mac_address_check CHECK (((mac_address IS NULL) OR ((mac_address)::text ~ '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$'::text)))
);


ALTER TABLE public.network_switches OWNER TO postgres;

--
-- TOC entry 308 (class 1259 OID 30114)
-- Name: network_switches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.network_switches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.network_switches_id_seq OWNER TO postgres;

--
-- TOC entry 6472 (class 0 OID 0)
-- Dependencies: 308
-- Name: network_switches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.network_switches_id_seq OWNED BY public.network_switches.id;


--
-- TOC entry 307 (class 1259 OID 29919)
-- Name: network_vlans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.network_vlans (
    id integer NOT NULL,
    vlan_id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    color character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.network_vlans OWNER TO postgres;

--
-- TOC entry 306 (class 1259 OID 29918)
-- Name: network_vlans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.network_vlans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.network_vlans_id_seq OWNER TO postgres;

--
-- TOC entry 6475 (class 0 OID 0)
-- Dependencies: 306
-- Name: network_vlans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.network_vlans_id_seq OWNED BY public.network_vlans.id;


--
-- TOC entry 230 (class 1259 OID 25494)
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- TOC entry 353 (class 1259 OID 30719)
-- Name: onboarding_checklist_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.onboarding_checklist_items (
    id integer NOT NULL,
    checklist_id integer,
    title character varying(255) NOT NULL,
    description text,
    item_type character varying(50) NOT NULL,
    is_required boolean DEFAULT true,
    order_index integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.onboarding_checklist_items OWNER TO postgres;

--
-- TOC entry 352 (class 1259 OID 30718)
-- Name: onboarding_checklist_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.onboarding_checklist_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.onboarding_checklist_items_id_seq OWNER TO postgres;

--
-- TOC entry 6479 (class 0 OID 0)
-- Dependencies: 352
-- Name: onboarding_checklist_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.onboarding_checklist_items_id_seq OWNED BY public.onboarding_checklist_items.id;


--
-- TOC entry 351 (class 1259 OID 30695)
-- Name: onboarding_checklists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.onboarding_checklists (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    template_id integer,
    type character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.onboarding_checklists OWNER TO postgres;

--
-- TOC entry 350 (class 1259 OID 30694)
-- Name: onboarding_checklists_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.onboarding_checklists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.onboarding_checklists_id_seq OWNER TO postgres;

--
-- TOC entry 6482 (class 0 OID 0)
-- Dependencies: 350
-- Name: onboarding_checklists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.onboarding_checklists_id_seq OWNED BY public.onboarding_checklists.id;


--
-- TOC entry 349 (class 1259 OID 30673)
-- Name: onboarding_protocol_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.onboarding_protocol_items (
    id integer NOT NULL,
    protocol_id integer,
    title character varying(255) NOT NULL,
    description text,
    item_type character varying(50) NOT NULL,
    item_id integer,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    completed_by integer,
    completed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.onboarding_protocol_items OWNER TO postgres;

--
-- TOC entry 348 (class 1259 OID 30672)
-- Name: onboarding_protocol_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.onboarding_protocol_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.onboarding_protocol_items_id_seq OWNER TO postgres;

--
-- TOC entry 6485 (class 0 OID 0)
-- Dependencies: 348
-- Name: onboarding_protocol_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.onboarding_protocol_items_id_seq OWNED BY public.onboarding_protocol_items.id;


--
-- TOC entry 347 (class 1259 OID 30646)
-- Name: onboarding_protocols; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.onboarding_protocols (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    template_id integer,
    type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    initiator_id integer,
    recipient_id integer,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.onboarding_protocols OWNER TO postgres;

--
-- TOC entry 346 (class 1259 OID 30645)
-- Name: onboarding_protocols_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.onboarding_protocols_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.onboarding_protocols_id_seq OWNER TO postgres;

--
-- TOC entry 6488 (class 0 OID 0)
-- Dependencies: 346
-- Name: onboarding_protocols_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.onboarding_protocols_id_seq OWNED BY public.onboarding_protocols.id;


--
-- TOC entry 345 (class 1259 OID 30627)
-- Name: onboarding_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.onboarding_templates (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    type character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.onboarding_templates OWNER TO postgres;

--
-- TOC entry 344 (class 1259 OID 30626)
-- Name: onboarding_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.onboarding_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.onboarding_templates_id_seq OWNER TO postgres;

--
-- TOC entry 6491 (class 0 OID 0)
-- Dependencies: 344
-- Name: onboarding_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.onboarding_templates_id_seq OWNED BY public.onboarding_templates.id;


--
-- TOC entry 251 (class 1259 OID 29061)
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    module character varying(50) NOT NULL,
    action character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 29060)
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO postgres;

--
-- TOC entry 6494 (class 0 OID 0)
-- Dependencies: 250
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- TOC entry 333 (class 1259 OID 30459)
-- Name: portal_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.portal_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    icon character varying(50),
    parent_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.portal_categories OWNER TO postgres;

--
-- TOC entry 332 (class 1259 OID 30458)
-- Name: portal_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.portal_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.portal_categories_id_seq OWNER TO postgres;

--
-- TOC entry 6497 (class 0 OID 0)
-- Dependencies: 332
-- Name: portal_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.portal_categories_id_seq OWNED BY public.portal_categories.id;


--
-- TOC entry 337 (class 1259 OID 30506)
-- Name: portal_request_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.portal_request_items (
    id integer NOT NULL,
    request_id integer,
    item_type character varying(50) NOT NULL,
    item_id integer NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.portal_request_items OWNER TO postgres;

--
-- TOC entry 336 (class 1259 OID 30505)
-- Name: portal_request_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.portal_request_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.portal_request_items_id_seq OWNER TO postgres;

--
-- TOC entry 6500 (class 0 OID 0)
-- Dependencies: 336
-- Name: portal_request_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.portal_request_items_id_seq OWNED BY public.portal_request_items.id;


--
-- TOC entry 335 (class 1259 OID 30478)
-- Name: portal_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.portal_requests (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    category_id integer,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    requested_by integer,
    approved_by integer,
    approved_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.portal_requests OWNER TO postgres;

--
-- TOC entry 334 (class 1259 OID 30477)
-- Name: portal_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.portal_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.portal_requests_id_seq OWNER TO postgres;

--
-- TOC entry 6503 (class 0 OID 0)
-- Dependencies: 334
-- Name: portal_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.portal_requests_id_seq OWNED BY public.portal_requests.id;


--
-- TOC entry 341 (class 1259 OID 30556)
-- Name: portal_ticket_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.portal_ticket_attachments (
    id integer NOT NULL,
    ticket_id integer,
    file_name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    file_type character varying(100),
    file_size integer,
    uploaded_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.portal_ticket_attachments OWNER TO postgres;

--
-- TOC entry 340 (class 1259 OID 30555)
-- Name: portal_ticket_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.portal_ticket_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.portal_ticket_attachments_id_seq OWNER TO postgres;

--
-- TOC entry 6506 (class 0 OID 0)
-- Dependencies: 340
-- Name: portal_ticket_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.portal_ticket_attachments_id_seq OWNED BY public.portal_ticket_attachments.id;


--
-- TOC entry 343 (class 1259 OID 30577)
-- Name: portal_ticket_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.portal_ticket_comments (
    id integer NOT NULL,
    ticket_id integer,
    comment text NOT NULL,
    created_by integer,
    is_internal boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.portal_ticket_comments OWNER TO postgres;

--
-- TOC entry 342 (class 1259 OID 30576)
-- Name: portal_ticket_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.portal_ticket_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.portal_ticket_comments_id_seq OWNER TO postgres;

--
-- TOC entry 6509 (class 0 OID 0)
-- Dependencies: 342
-- Name: portal_ticket_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.portal_ticket_comments_id_seq OWNED BY public.portal_ticket_comments.id;


--
-- TOC entry 339 (class 1259 OID 30523)
-- Name: portal_tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.portal_tickets (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    category_id integer,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    created_by integer,
    assigned_to integer,
    resolved_by integer,
    resolved_at timestamp with time zone,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.portal_tickets OWNER TO postgres;

--
-- TOC entry 338 (class 1259 OID 30522)
-- Name: portal_tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.portal_tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.portal_tickets_id_seq OWNER TO postgres;

--
-- TOC entry 6512 (class 0 OID 0)
-- Dependencies: 338
-- Name: portal_tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.portal_tickets_id_seq OWNED BY public.portal_tickets.id;


--
-- TOC entry 331 (class 1259 OID 30414)
-- Name: reminder_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reminder_notifications (
    id integer NOT NULL,
    reminder_id integer,
    recipient_id integer,
    notification_type character varying(50) NOT NULL,
    status character varying(20) NOT NULL,
    sent_at timestamp with time zone,
    read_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.reminder_notifications OWNER TO postgres;

--
-- TOC entry 330 (class 1259 OID 30413)
-- Name: reminder_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reminder_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reminder_notifications_id_seq OWNER TO postgres;

--
-- TOC entry 6515 (class 0 OID 0)
-- Dependencies: 330
-- Name: reminder_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reminder_notifications_id_seq OWNED BY public.reminder_notifications.id;


--
-- TOC entry 329 (class 1259 OID 30393)
-- Name: reminder_recipients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reminder_recipients (
    id integer NOT NULL,
    reminder_id integer,
    user_id integer,
    notification_type character varying(50) NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.reminder_recipients OWNER TO postgres;

--
-- TOC entry 328 (class 1259 OID 30392)
-- Name: reminder_recipients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reminder_recipients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reminder_recipients_id_seq OWNER TO postgres;

--
-- TOC entry 6518 (class 0 OID 0)
-- Dependencies: 328
-- Name: reminder_recipients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reminder_recipients_id_seq OWNED BY public.reminder_recipients.id;


--
-- TOC entry 327 (class 1259 OID 30371)
-- Name: reminders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reminders (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    due_date timestamp with time zone NOT NULL,
    priority character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    reminder_type character varying(50) NOT NULL,
    reference_type character varying(50),
    reference_id integer,
    created_by integer,
    assigned_to integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.reminders OWNER TO postgres;

--
-- TOC entry 326 (class 1259 OID 30370)
-- Name: reminders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reminders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reminders_id_seq OWNER TO postgres;

--
-- TOC entry 6521 (class 0 OID 0)
-- Dependencies: 326
-- Name: reminders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reminders_id_seq OWNED BY public.reminders.id;


--
-- TOC entry 357 (class 1259 OID 30777)
-- Name: report_exports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_exports (
    id integer NOT NULL,
    template_id integer,
    name character varying(255) NOT NULL,
    parameters jsonb,
    format character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    file_path character varying(255),
    file_size integer,
    error_message text,
    created_by integer,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.report_exports OWNER TO postgres;

--
-- TOC entry 356 (class 1259 OID 30776)
-- Name: report_exports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.report_exports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_exports_id_seq OWNER TO postgres;

--
-- TOC entry 6524 (class 0 OID 0)
-- Dependencies: 356
-- Name: report_exports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.report_exports_id_seq OWNED BY public.report_exports.id;


--
-- TOC entry 359 (class 1259 OID 30799)
-- Name: report_recipients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_recipients (
    id integer NOT NULL,
    report_id integer,
    user_id integer,
    email character varying(255),
    notification_type character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.report_recipients OWNER TO postgres;

--
-- TOC entry 358 (class 1259 OID 30798)
-- Name: report_recipients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.report_recipients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_recipients_id_seq OWNER TO postgres;

--
-- TOC entry 6527 (class 0 OID 0)
-- Dependencies: 358
-- Name: report_recipients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.report_recipients_id_seq OWNED BY public.report_recipients.id;


--
-- TOC entry 361 (class 1259 OID 30821)
-- Name: report_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_schedules (
    id integer NOT NULL,
    report_id integer,
    name character varying(100) NOT NULL,
    description text,
    schedule_type character varying(50) NOT NULL,
    schedule_rule character varying(255) NOT NULL,
    parameters jsonb,
    is_active boolean DEFAULT true,
    last_run_at timestamp with time zone,
    next_run_at timestamp with time zone,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.report_schedules OWNER TO postgres;

--
-- TOC entry 360 (class 1259 OID 30820)
-- Name: report_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.report_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_schedules_id_seq OWNER TO postgres;

--
-- TOC entry 6530 (class 0 OID 0)
-- Dependencies: 360
-- Name: report_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.report_schedules_id_seq OWNED BY public.report_schedules.id;


--
-- TOC entry 355 (class 1259 OID 30758)
-- Name: report_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_templates (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    query text NOT NULL,
    parameters jsonb,
    format character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.report_templates OWNER TO postgres;

--
-- TOC entry 354 (class 1259 OID 30757)
-- Name: report_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.report_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_templates_id_seq OWNER TO postgres;

--
-- TOC entry 6533 (class 0 OID 0)
-- Dependencies: 354
-- Name: report_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.report_templates_id_seq OWNED BY public.report_templates.id;


--
-- TOC entry 249 (class 1259 OID 29041)
-- Name: role_hierarchy; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_hierarchy (
    id integer NOT NULL,
    parent_role_id integer,
    child_role_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.role_hierarchy OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 29040)
-- Name: role_hierarchy_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.role_hierarchy_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_hierarchy_id_seq OWNER TO postgres;

--
-- TOC entry 6536 (class 0 OID 0)
-- Dependencies: 248
-- Name: role_hierarchy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.role_hierarchy_id_seq OWNED BY public.role_hierarchy.id;


--
-- TOC entry 253 (class 1259 OID 29074)
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role_id integer NOT NULL,
    permission_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 29073)
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_permissions_id_seq OWNER TO postgres;

--
-- TOC entry 6539 (class 0 OID 0)
-- Dependencies: 252
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- TOC entry 247 (class 1259 OID 29027)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 29026)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- TOC entry 6542 (class 0 OID 0)
-- Dependencies: 246
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 297 (class 1259 OID 29768)
-- Name: rooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rooms (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    building character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    description text,
    location_id integer,
    active boolean DEFAULT true,
    location_name character varying(100)
);


ALTER TABLE public.rooms OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 25495)
-- Name: rooms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rooms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rooms_id_seq OWNER TO postgres;

--
-- TOC entry 296 (class 1259 OID 29767)
-- Name: rooms_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rooms_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rooms_id_seq1 OWNER TO postgres;

--
-- TOC entry 6546 (class 0 OID 0)
-- Dependencies: 296
-- Name: rooms_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rooms_id_seq1 OWNED BY public.rooms.id;


--
-- TOC entry 232 (class 1259 OID 25496)
-- Name: software_licenses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.software_licenses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.software_licenses_id_seq OWNER TO postgres;

--
-- TOC entry 291 (class 1259 OID 29719)
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    website character varying(255),
    contact_email character varying(255),
    contact_phone character varying(50),
    address text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    city character varying(100),
    postal_code character varying(20),
    contact_person character varying(100),
    contract_number character varying(100),
    notes text
);


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 25497)
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suppliers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq OWNER TO postgres;

--
-- TOC entry 290 (class 1259 OID 29718)
-- Name: suppliers_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suppliers_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq1 OWNER TO postgres;

--
-- TOC entry 6551 (class 0 OID 0)
-- Dependencies: 290
-- Name: suppliers_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.suppliers_id_seq1 OWNED BY public.suppliers.id;


--
-- TOC entry 234 (class 1259 OID 25498)
-- Name: switches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.switches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.switches_id_seq OWNER TO postgres;

--
-- TOC entry 303 (class 1259 OID 29834)
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    id integer NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value text,
    setting_type character varying(50) NOT NULL,
    description text,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- TOC entry 302 (class 1259 OID 29833)
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_settings_id_seq OWNER TO postgres;

--
-- TOC entry 6555 (class 0 OID 0)
-- Dependencies: 302
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- TOC entry 281 (class 1259 OID 29565)
-- Name: ticket_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_attachments (
    id integer NOT NULL,
    ticket_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(1000) NOT NULL,
    file_size integer NOT NULL,
    mime_type character varying(100),
    uploaded_by_user_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ticket_attachments OWNER TO postgres;

--
-- TOC entry 280 (class 1259 OID 29564)
-- Name: ticket_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ticket_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ticket_attachments_id_seq OWNER TO postgres;

--
-- TOC entry 6558 (class 0 OID 0)
-- Dependencies: 280
-- Name: ticket_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ticket_attachments_id_seq OWNED BY public.ticket_attachments.id;


--
-- TOC entry 279 (class 1259 OID 29544)
-- Name: ticket_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_comments (
    id integer NOT NULL,
    ticket_id integer NOT NULL,
    comment_text text NOT NULL,
    user_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ticket_comments OWNER TO postgres;

--
-- TOC entry 278 (class 1259 OID 29543)
-- Name: ticket_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ticket_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ticket_comments_id_seq OWNER TO postgres;

--
-- TOC entry 6561 (class 0 OID 0)
-- Dependencies: 278
-- Name: ticket_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ticket_comments_id_seq OWNED BY public.ticket_comments.id;


--
-- TOC entry 277 (class 1259 OID 29501)
-- Name: tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tickets (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    type character varying(50) NOT NULL,
    device_id integer,
    accessory_id integer,
    license_id integer,
    certificate_id integer,
    assigned_to_user_id integer,
    created_by_user_id integer,
    due_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tickets OWNER TO postgres;

--
-- TOC entry 282 (class 1259 OID 29641)
-- Name: ticket_overview; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.ticket_overview AS
 SELECT t.id AS ticket_id,
    t.title,
    t.status,
    t.priority,
    t.type,
    t.created_at,
    t.due_date,
    creator.username AS created_by,
    assignee.username AS assigned_to,
    COALESCE(d.name, a.name, l.name, c.name) AS asset_name,
        CASE
            WHEN (d.id IS NOT NULL) THEN 'device'::text
            WHEN (a.id IS NOT NULL) THEN 'accessory'::text
            WHEN (l.id IS NOT NULL) THEN 'license'::text
            WHEN (c.id IS NOT NULL) THEN 'certificate'::text
            ELSE NULL::text
        END AS asset_type,
    ( SELECT count(*) AS count
           FROM public.ticket_comments tc
          WHERE (tc.ticket_id = t.id)) AS comment_count,
    ( SELECT count(*) AS count
           FROM public.ticket_attachments ta
          WHERE (ta.ticket_id = t.id)) AS attachment_count
   FROM ((((((public.tickets t
     LEFT JOIN public.users creator ON ((t.created_by_user_id = creator.id)))
     LEFT JOIN public.users assignee ON ((t.assigned_to_user_id = assignee.id)))
     LEFT JOIN public.devices d ON ((t.device_id = d.id)))
     LEFT JOIN public.accessories a ON ((t.accessory_id = a.id)))
     LEFT JOIN public.licenses l ON ((t.license_id = l.id)))
     LEFT JOIN public.certificates c ON ((t.certificate_id = c.id)));


ALTER VIEW public.ticket_overview OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 25499)
-- Name: tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tickets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tickets_id_seq OWNER TO postgres;

--
-- TOC entry 276 (class 1259 OID 29500)
-- Name: tickets_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tickets_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tickets_id_seq1 OWNER TO postgres;

--
-- TOC entry 6566 (class 0 OID 0)
-- Dependencies: 276
-- Name: tickets_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tickets_id_seq1 OWNED BY public.tickets.id;


--
-- TOC entry 275 (class 1259 OID 29458)
-- Name: todos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.todos (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    due_date date,
    assigned_to_user_id integer,
    device_id integer,
    accessory_id integer,
    license_id integer,
    certificate_id integer,
    created_by_user_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.todos OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 25500)
-- Name: todos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.todos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.todos_id_seq OWNER TO postgres;

--
-- TOC entry 274 (class 1259 OID 29457)
-- Name: todos_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.todos_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.todos_id_seq1 OWNER TO postgres;

--
-- TOC entry 6570 (class 0 OID 0)
-- Dependencies: 274
-- Name: todos_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.todos_id_seq1 OWNED BY public.todos.id;


--
-- TOC entry 257 (class 1259 OID 29110)
-- Name: user_group_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_group_members (
    id integer NOT NULL,
    group_id integer NOT NULL,
    user_id integer NOT NULL,
    added_by integer,
    added_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_group_members OWNER TO postgres;

--
-- TOC entry 256 (class 1259 OID 29109)
-- Name: user_group_members_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_group_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_group_members_id_seq OWNER TO postgres;

--
-- TOC entry 6573 (class 0 OID 0)
-- Dependencies: 256
-- Name: user_group_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_group_members_id_seq OWNED BY public.user_group_members.id;


--
-- TOC entry 255 (class 1259 OID 29094)
-- Name: user_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_groups (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_groups OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 29093)
-- Name: user_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_groups_id_seq OWNER TO postgres;

--
-- TOC entry 6576 (class 0 OID 0)
-- Dependencies: 254
-- Name: user_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_groups_id_seq OWNED BY public.user_groups.id;


--
-- TOC entry 245 (class 1259 OID 29007)
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_preferences (
    id integer NOT NULL,
    user_id integer NOT NULL,
    theme character varying(20) DEFAULT 'dark'::character varying,
    language character varying(10) DEFAULT 'de'::character varying,
    notifications_enabled boolean DEFAULT true,
    email_notifications boolean DEFAULT true,
    dashboard_layout jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_preferences OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 29006)
-- Name: user_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_preferences_id_seq OWNER TO postgres;

--
-- TOC entry 6579 (class 0 OID 0)
-- Dependencies: 244
-- Name: user_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_preferences_id_seq OWNED BY public.user_preferences.id;


--
-- TOC entry 243 (class 1259 OID 28989)
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_profiles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    profile_picture character varying(255),
    phone character varying(50),
    department character varying(100),
    "position" character varying(100),
    bio text,
    last_password_change timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    password_expires_at timestamp with time zone,
    two_factor_enabled boolean DEFAULT false,
    two_factor_secret character varying(255),
    backup_codes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_profiles OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 28988)
-- Name: user_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_profiles_id_seq OWNER TO postgres;

--
-- TOC entry 6582 (class 0 OID 0)
-- Dependencies: 242
-- Name: user_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_profiles_id_seq OWNED BY public.user_profiles.id;


--
-- TOC entry 237 (class 1259 OID 25501)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 28972)
-- Name: users_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq1 OWNER TO postgres;

--
-- TOC entry 6585 (class 0 OID 0)
-- Dependencies: 240
-- Name: users_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq1 OWNED BY public.users.id;


--
-- TOC entry 289 (class 1259 OID 29706)
-- Name: vendors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendors (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    website character varying(255),
    contact_email character varying(255),
    contact_phone character varying(50),
    logo_path character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.vendors OWNER TO postgres;

--
-- TOC entry 288 (class 1259 OID 29705)
-- Name: vendors_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vendors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vendors_id_seq OWNER TO postgres;

--
-- TOC entry 6588 (class 0 OID 0)
-- Dependencies: 288
-- Name: vendors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vendors_id_seq OWNED BY public.vendors.id;


--
-- TOC entry 5212 (class 2604 OID 29282)
-- Name: accessories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessories ALTER COLUMN id SET DEFAULT nextval('public.accessories_id_seq1'::regclass);


--
-- TOC entry 5218 (class 2604 OID 29336)
-- Name: accessory_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessory_history ALTER COLUMN id SET DEFAULT nextval('public.accessory_history_id_seq'::regclass);


--
-- TOC entry 5273 (class 2604 OID 29819)
-- Name: asset_custom_field_values id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_custom_field_values ALTER COLUMN id SET DEFAULT nextval('public.asset_custom_field_values_id_seq'::regclass);


--
-- TOC entry 5269 (class 2604 OID 29805)
-- Name: asset_custom_fields id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_custom_fields ALTER COLUMN id SET DEFAULT nextval('public.asset_custom_fields_id_seq'::regclass);


--
-- TOC entry 5418 (class 2604 OID 31107)
-- Name: asset_tag_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_tag_settings ALTER COLUMN id SET DEFAULT nextval('public.asset_tag_settings_id_seq'::regclass);


--
-- TOC entry 5164 (class 2604 OID 28966)
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- TOC entry 5309 (class 2604 OID 30338)
-- Name: calendar_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_categories ALTER COLUMN id SET DEFAULT nextval('public.calendar_categories_id_seq'::regclass);


--
-- TOC entry 5312 (class 2604 OID 30351)
-- Name: calendar_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_events ALTER COLUMN id SET DEFAULT nextval('public.calendar_events_id_seq'::regclass);


--
-- TOC entry 5243 (class 2604 OID 29678)
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq1'::regclass);


--
-- TOC entry 5208 (class 2604 OID 29265)
-- Name: certificates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates ALTER COLUMN id SET DEFAULT nextval('public.certificates_id_seq1'::regclass);


--
-- TOC entry 5261 (class 2604 OID 29748)
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq1'::regclass);


--
-- TOC entry 5216 (class 2604 OID 29311)
-- Name: device_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_history ALTER COLUMN id SET DEFAULT nextval('public.device_history_id_seq'::regclass);


--
-- TOC entry 5414 (class 2604 OID 31055)
-- Name: device_models id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_models ALTER COLUMN id SET DEFAULT nextval('public.device_models_id_seq1'::regclass);


--
-- TOC entry 5199 (class 2604 OID 29216)
-- Name: devices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices ALTER COLUMN id SET DEFAULT nextval('public.devices_id_seq1'::regclass);


--
-- TOC entry 5304 (class 2604 OID 30283)
-- Name: document_attachments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_attachments ALTER COLUMN id SET DEFAULT nextval('public.document_attachments_id_seq'::regclass);


--
-- TOC entry 5297 (class 2604 OID 30248)
-- Name: document_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_categories ALTER COLUMN id SET DEFAULT nextval('public.document_categories_id_seq'::regclass);


--
-- TOC entry 5307 (class 2604 OID 30304)
-- Name: document_versions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_versions ALTER COLUMN id SET DEFAULT nextval('public.document_versions_id_seq'::regclass);


--
-- TOC entry 5300 (class 2604 OID 30261)
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq1'::regclass);


--
-- TOC entry 5401 (class 2604 OID 30935)
-- Name: integration_configs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_configs ALTER COLUMN id SET DEFAULT nextval('public.integration_configs_id_seq'::regclass);


--
-- TOC entry 5405 (class 2604 OID 30954)
-- Name: integration_mappings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_mappings ALTER COLUMN id SET DEFAULT nextval('public.integration_mappings_id_seq'::regclass);


--
-- TOC entry 5409 (class 2604 OID 30973)
-- Name: integration_sync_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_sync_logs ALTER COLUMN id SET DEFAULT nextval('public.integration_sync_logs_id_seq'::regclass);


--
-- TOC entry 5224 (class 2604 OID 29428)
-- Name: inventory_checks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_checks ALTER COLUMN id SET DEFAULT nextval('public.inventory_checks_id_seq'::regclass);


--
-- TOC entry 5220 (class 2604 OID 29411)
-- Name: inventory_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_sessions ALTER COLUMN id SET DEFAULT nextval('public.inventory_sessions_id_seq1'::regclass);


--
-- TOC entry 5424 (class 2604 OID 31121)
-- Name: label_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.label_settings ALTER COLUMN id SET DEFAULT nextval('public.label_settings_id_seq'::regclass);


--
-- TOC entry 5203 (class 2604 OID 29245)
-- Name: licenses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.licenses ALTER COLUMN id SET DEFAULT nextval('public.licenses_id_seq'::regclass);


--
-- TOC entry 5258 (class 2604 OID 29735)
-- Name: locations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations ALTER COLUMN id SET DEFAULT nextval('public.locations_id_seq1'::regclass);


--
-- TOC entry 5247 (class 2604 OID 29696)
-- Name: manufacturers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manufacturers ALTER COLUMN id SET DEFAULT nextval('public.manufacturers_id_seq1'::regclass);


--
-- TOC entry 5388 (class 2604 OID 30863)
-- Name: mobile_devices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_devices ALTER COLUMN id SET DEFAULT nextval('public.mobile_devices_id_seq'::regclass);


--
-- TOC entry 5392 (class 2604 OID 30882)
-- Name: mobile_offline_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_offline_data ALTER COLUMN id SET DEFAULT nextval('public.mobile_offline_data_id_seq'::regclass);


--
-- TOC entry 5396 (class 2604 OID 30901)
-- Name: mobile_sync_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_sync_logs ALTER COLUMN id SET DEFAULT nextval('public.mobile_sync_logs_id_seq'::regclass);


--
-- TOC entry 5280 (class 2604 OID 29883)
-- Name: network_cabinets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_cabinets ALTER COLUMN id SET DEFAULT nextval('public.network_cabinets_id_seq'::regclass);


--
-- TOC entry 5294 (class 2604 OID 30175)
-- Name: network_ports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_ports ALTER COLUMN id SET DEFAULT nextval('public.network_ports_id_seq1'::regclass);


--
-- TOC entry 5290 (class 2604 OID 30156)
-- Name: network_sockets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_sockets ALTER COLUMN id SET DEFAULT nextval('public.network_sockets_id_seq'::regclass);


--
-- TOC entry 5286 (class 2604 OID 30118)
-- Name: network_switches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_switches ALTER COLUMN id SET DEFAULT nextval('public.network_switches_id_seq'::regclass);


--
-- TOC entry 5283 (class 2604 OID 29922)
-- Name: network_vlans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_vlans ALTER COLUMN id SET DEFAULT nextval('public.network_vlans_id_seq'::regclass);


--
-- TOC entry 5368 (class 2604 OID 30722)
-- Name: onboarding_checklist_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_checklist_items ALTER COLUMN id SET DEFAULT nextval('public.onboarding_checklist_items_id_seq'::regclass);


--
-- TOC entry 5364 (class 2604 OID 30698)
-- Name: onboarding_checklists id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_checklists ALTER COLUMN id SET DEFAULT nextval('public.onboarding_checklists_id_seq'::regclass);


--
-- TOC entry 5360 (class 2604 OID 30676)
-- Name: onboarding_protocol_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_protocol_items ALTER COLUMN id SET DEFAULT nextval('public.onboarding_protocol_items_id_seq'::regclass);


--
-- TOC entry 5356 (class 2604 OID 30649)
-- Name: onboarding_protocols id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_protocols ALTER COLUMN id SET DEFAULT nextval('public.onboarding_protocols_id_seq'::regclass);


--
-- TOC entry 5352 (class 2604 OID 30630)
-- Name: onboarding_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_templates ALTER COLUMN id SET DEFAULT nextval('public.onboarding_templates_id_seq'::regclass);


--
-- TOC entry 5189 (class 2604 OID 29064)
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- TOC entry 5327 (class 2604 OID 30462)
-- Name: portal_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_categories ALTER COLUMN id SET DEFAULT nextval('public.portal_categories_id_seq'::regclass);


--
-- TOC entry 5336 (class 2604 OID 30509)
-- Name: portal_request_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_request_items ALTER COLUMN id SET DEFAULT nextval('public.portal_request_items_id_seq'::regclass);


--
-- TOC entry 5331 (class 2604 OID 30481)
-- Name: portal_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_requests ALTER COLUMN id SET DEFAULT nextval('public.portal_requests_id_seq'::regclass);


--
-- TOC entry 5345 (class 2604 OID 30559)
-- Name: portal_ticket_attachments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_ticket_attachments ALTER COLUMN id SET DEFAULT nextval('public.portal_ticket_attachments_id_seq'::regclass);


--
-- TOC entry 5348 (class 2604 OID 30580)
-- Name: portal_ticket_comments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_ticket_comments ALTER COLUMN id SET DEFAULT nextval('public.portal_ticket_comments_id_seq'::regclass);


--
-- TOC entry 5340 (class 2604 OID 30526)
-- Name: portal_tickets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_tickets ALTER COLUMN id SET DEFAULT nextval('public.portal_tickets_id_seq'::regclass);


--
-- TOC entry 5324 (class 2604 OID 30417)
-- Name: reminder_notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_notifications ALTER COLUMN id SET DEFAULT nextval('public.reminder_notifications_id_seq'::regclass);


--
-- TOC entry 5321 (class 2604 OID 30396)
-- Name: reminder_recipients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_recipients ALTER COLUMN id SET DEFAULT nextval('public.reminder_recipients_id_seq'::regclass);


--
-- TOC entry 5317 (class 2604 OID 30374)
-- Name: reminders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminders ALTER COLUMN id SET DEFAULT nextval('public.reminders_id_seq'::regclass);


--
-- TOC entry 5376 (class 2604 OID 30780)
-- Name: report_exports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_exports ALTER COLUMN id SET DEFAULT nextval('public.report_exports_id_seq'::regclass);


--
-- TOC entry 5380 (class 2604 OID 30802)
-- Name: report_recipients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_recipients ALTER COLUMN id SET DEFAULT nextval('public.report_recipients_id_seq'::regclass);


--
-- TOC entry 5384 (class 2604 OID 30824)
-- Name: report_schedules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_schedules ALTER COLUMN id SET DEFAULT nextval('public.report_schedules_id_seq'::regclass);


--
-- TOC entry 5372 (class 2604 OID 30761)
-- Name: report_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_templates ALTER COLUMN id SET DEFAULT nextval('public.report_templates_id_seq'::regclass);


--
-- TOC entry 5187 (class 2604 OID 29044)
-- Name: role_hierarchy id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_hierarchy ALTER COLUMN id SET DEFAULT nextval('public.role_hierarchy_id_seq'::regclass);


--
-- TOC entry 5192 (class 2604 OID 29077)
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- TOC entry 5183 (class 2604 OID 29030)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 5265 (class 2604 OID 29771)
-- Name: rooms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms ALTER COLUMN id SET DEFAULT nextval('public.rooms_id_seq1'::regclass);


--
-- TOC entry 5254 (class 2604 OID 29722)
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq1'::regclass);


--
-- TOC entry 5276 (class 2604 OID 29837)
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- TOC entry 5241 (class 2604 OID 29568)
-- Name: ticket_attachments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_attachments ALTER COLUMN id SET DEFAULT nextval('public.ticket_attachments_id_seq'::regclass);


--
-- TOC entry 5238 (class 2604 OID 29547)
-- Name: ticket_comments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_comments ALTER COLUMN id SET DEFAULT nextval('public.ticket_comments_id_seq'::regclass);


--
-- TOC entry 5233 (class 2604 OID 29504)
-- Name: tickets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets ALTER COLUMN id SET DEFAULT nextval('public.tickets_id_seq1'::regclass);


--
-- TOC entry 5228 (class 2604 OID 29461)
-- Name: todos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.todos ALTER COLUMN id SET DEFAULT nextval('public.todos_id_seq1'::regclass);


--
-- TOC entry 5197 (class 2604 OID 29113)
-- Name: user_group_members id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group_members ALTER COLUMN id SET DEFAULT nextval('public.user_group_members_id_seq'::regclass);


--
-- TOC entry 5194 (class 2604 OID 29097)
-- Name: user_groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_groups ALTER COLUMN id SET DEFAULT nextval('public.user_groups_id_seq'::regclass);


--
-- TOC entry 5176 (class 2604 OID 29010)
-- Name: user_preferences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_preferences_id_seq'::regclass);


--
-- TOC entry 5171 (class 2604 OID 28992)
-- Name: user_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles ALTER COLUMN id SET DEFAULT nextval('public.user_profiles_id_seq'::regclass);


--
-- TOC entry 5166 (class 2604 OID 28976)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq1'::regclass);


--
-- TOC entry 5251 (class 2604 OID 29709)
-- Name: vendors id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors ALTER COLUMN id SET DEFAULT nextval('public.vendors_id_seq'::regclass);


--
-- TOC entry 6349 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO atlas_user;


--
-- TOC entry 6350 (class 0 OID 0)
-- Dependencies: 265
-- Name: TABLE accessories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.accessories TO atlas_user;


--
-- TOC entry 6351 (class 0 OID 0)
-- Dependencies: 217
-- Name: SEQUENCE accessories_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.accessories_id_seq TO atlas_user;


--
-- TOC entry 6353 (class 0 OID 0)
-- Dependencies: 264
-- Name: SEQUENCE accessories_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.accessories_id_seq1 TO atlas_user;


--
-- TOC entry 6354 (class 0 OID 0)
-- Dependencies: 269
-- Name: TABLE accessory_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.accessory_history TO atlas_user;


--
-- TOC entry 6356 (class 0 OID 0)
-- Dependencies: 268
-- Name: SEQUENCE accessory_history_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.accessory_history_id_seq TO atlas_user;


--
-- TOC entry 6357 (class 0 OID 0)
-- Dependencies: 301
-- Name: TABLE asset_custom_field_values; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.asset_custom_field_values TO atlas_user;


--
-- TOC entry 6359 (class 0 OID 0)
-- Dependencies: 300
-- Name: SEQUENCE asset_custom_field_values_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.asset_custom_field_values_id_seq TO atlas_user;


--
-- TOC entry 6360 (class 0 OID 0)
-- Dependencies: 299
-- Name: TABLE asset_custom_fields; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.asset_custom_fields TO atlas_user;


--
-- TOC entry 6362 (class 0 OID 0)
-- Dependencies: 298
-- Name: SEQUENCE asset_custom_fields_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.asset_custom_fields_id_seq TO atlas_user;


--
-- TOC entry 6363 (class 0 OID 0)
-- Dependencies: 378
-- Name: TABLE asset_tag_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.asset_tag_settings TO atlas_user;


--
-- TOC entry 6365 (class 0 OID 0)
-- Dependencies: 377
-- Name: SEQUENCE asset_tag_settings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.asset_tag_settings_id_seq TO atlas_user;


--
-- TOC entry 6366 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_logs TO atlas_user;


--
-- TOC entry 6368 (class 0 OID 0)
-- Dependencies: 238
-- Name: SEQUENCE audit_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.audit_logs_id_seq TO atlas_user;


--
-- TOC entry 6369 (class 0 OID 0)
-- Dependencies: 323
-- Name: TABLE calendar_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.calendar_categories TO atlas_user;


--
-- TOC entry 6371 (class 0 OID 0)
-- Dependencies: 322
-- Name: SEQUENCE calendar_categories_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.calendar_categories_id_seq TO atlas_user;


--
-- TOC entry 6372 (class 0 OID 0)
-- Dependencies: 325
-- Name: TABLE calendar_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.calendar_events TO atlas_user;


--
-- TOC entry 6374 (class 0 OID 0)
-- Dependencies: 324
-- Name: SEQUENCE calendar_events_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.calendar_events_id_seq TO atlas_user;


--
-- TOC entry 6375 (class 0 OID 0)
-- Dependencies: 285
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.categories TO atlas_user;


--
-- TOC entry 6376 (class 0 OID 0)
-- Dependencies: 218
-- Name: SEQUENCE categories_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.categories_id_seq TO atlas_user;


--
-- TOC entry 6378 (class 0 OID 0)
-- Dependencies: 284
-- Name: SEQUENCE categories_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.categories_id_seq1 TO atlas_user;


--
-- TOC entry 6379 (class 0 OID 0)
-- Dependencies: 263
-- Name: TABLE certificates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.certificates TO atlas_user;


--
-- TOC entry 6380 (class 0 OID 0)
-- Dependencies: 219
-- Name: SEQUENCE certificates_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.certificates_id_seq TO atlas_user;


--
-- TOC entry 6382 (class 0 OID 0)
-- Dependencies: 262
-- Name: SEQUENCE certificates_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.certificates_id_seq1 TO atlas_user;


--
-- TOC entry 6383 (class 0 OID 0)
-- Dependencies: 295
-- Name: TABLE departments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.departments TO atlas_user;


--
-- TOC entry 6384 (class 0 OID 0)
-- Dependencies: 220
-- Name: SEQUENCE departments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.departments_id_seq TO atlas_user;


--
-- TOC entry 6386 (class 0 OID 0)
-- Dependencies: 294
-- Name: SEQUENCE departments_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.departments_id_seq1 TO atlas_user;


--
-- TOC entry 6387 (class 0 OID 0)
-- Dependencies: 267
-- Name: TABLE device_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.device_history TO atlas_user;


--
-- TOC entry 6389 (class 0 OID 0)
-- Dependencies: 266
-- Name: SEQUENCE device_history_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.device_history_id_seq TO atlas_user;


--
-- TOC entry 6390 (class 0 OID 0)
-- Dependencies: 375
-- Name: TABLE device_models; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.device_models TO atlas_user;


--
-- TOC entry 6391 (class 0 OID 0)
-- Dependencies: 221
-- Name: SEQUENCE device_models_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.device_models_id_seq TO atlas_user;


--
-- TOC entry 6393 (class 0 OID 0)
-- Dependencies: 374
-- Name: SEQUENCE device_models_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.device_models_id_seq1 TO atlas_user;


--
-- TOC entry 6394 (class 0 OID 0)
-- Dependencies: 376
-- Name: TABLE device_models_with_count; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.device_models_with_count TO atlas_user;


--
-- TOC entry 6395 (class 0 OID 0)
-- Dependencies: 259
-- Name: TABLE devices; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.devices TO atlas_user;


--
-- TOC entry 6396 (class 0 OID 0)
-- Dependencies: 222
-- Name: SEQUENCE devices_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.devices_id_seq TO atlas_user;


--
-- TOC entry 6398 (class 0 OID 0)
-- Dependencies: 258
-- Name: SEQUENCE devices_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.devices_id_seq1 TO atlas_user;


--
-- TOC entry 6399 (class 0 OID 0)
-- Dependencies: 319
-- Name: TABLE document_attachments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.document_attachments TO atlas_user;


--
-- TOC entry 6401 (class 0 OID 0)
-- Dependencies: 318
-- Name: SEQUENCE document_attachments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.document_attachments_id_seq TO atlas_user;


--
-- TOC entry 6402 (class 0 OID 0)
-- Dependencies: 315
-- Name: TABLE document_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.document_categories TO atlas_user;


--
-- TOC entry 6404 (class 0 OID 0)
-- Dependencies: 314
-- Name: SEQUENCE document_categories_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.document_categories_id_seq TO atlas_user;


--
-- TOC entry 6405 (class 0 OID 0)
-- Dependencies: 321
-- Name: TABLE document_versions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.document_versions TO atlas_user;


--
-- TOC entry 6407 (class 0 OID 0)
-- Dependencies: 320
-- Name: SEQUENCE document_versions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.document_versions_id_seq TO atlas_user;


--
-- TOC entry 6408 (class 0 OID 0)
-- Dependencies: 317
-- Name: TABLE documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.documents TO atlas_user;


--
-- TOC entry 6409 (class 0 OID 0)
-- Dependencies: 223
-- Name: SEQUENCE documents_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.documents_id_seq TO atlas_user;


--
-- TOC entry 6411 (class 0 OID 0)
-- Dependencies: 316
-- Name: SEQUENCE documents_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.documents_id_seq1 TO atlas_user;


--
-- TOC entry 6412 (class 0 OID 0)
-- Dependencies: 224
-- Name: SEQUENCE handover_protocols_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.handover_protocols_id_seq TO atlas_user;


--
-- TOC entry 6413 (class 0 OID 0)
-- Dependencies: 225
-- Name: SEQUENCE history_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.history_id_seq TO atlas_user;


--
-- TOC entry 6414 (class 0 OID 0)
-- Dependencies: 369
-- Name: TABLE integration_configs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.integration_configs TO atlas_user;


--
-- TOC entry 6416 (class 0 OID 0)
-- Dependencies: 368
-- Name: SEQUENCE integration_configs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.integration_configs_id_seq TO atlas_user;


--
-- TOC entry 6417 (class 0 OID 0)
-- Dependencies: 371
-- Name: TABLE integration_mappings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.integration_mappings TO atlas_user;


--
-- TOC entry 6419 (class 0 OID 0)
-- Dependencies: 370
-- Name: SEQUENCE integration_mappings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.integration_mappings_id_seq TO atlas_user;


--
-- TOC entry 6420 (class 0 OID 0)
-- Dependencies: 373
-- Name: TABLE integration_sync_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.integration_sync_logs TO atlas_user;


--
-- TOC entry 6422 (class 0 OID 0)
-- Dependencies: 372
-- Name: SEQUENCE integration_sync_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.integration_sync_logs_id_seq TO atlas_user;


--
-- TOC entry 6423 (class 0 OID 0)
-- Dependencies: 273
-- Name: TABLE inventory_checks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.inventory_checks TO atlas_user;


--
-- TOC entry 6425 (class 0 OID 0)
-- Dependencies: 272
-- Name: SEQUENCE inventory_checks_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.inventory_checks_id_seq TO atlas_user;


--
-- TOC entry 6426 (class 0 OID 0)
-- Dependencies: 271
-- Name: TABLE inventory_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.inventory_sessions TO atlas_user;


--
-- TOC entry 6427 (class 0 OID 0)
-- Dependencies: 226
-- Name: SEQUENCE inventory_sessions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.inventory_sessions_id_seq TO atlas_user;


--
-- TOC entry 6429 (class 0 OID 0)
-- Dependencies: 270
-- Name: SEQUENCE inventory_sessions_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.inventory_sessions_id_seq1 TO atlas_user;


--
-- TOC entry 6430 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO atlas_user;


--
-- TOC entry 6431 (class 0 OID 0)
-- Dependencies: 283
-- Name: TABLE inventory_status_view; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.inventory_status_view TO atlas_user;


--
-- TOC entry 6435 (class 0 OID 0)
-- Dependencies: 380
-- Name: TABLE label_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.label_settings TO atlas_user;


--
-- TOC entry 6437 (class 0 OID 0)
-- Dependencies: 379
-- Name: SEQUENCE label_settings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.label_settings_id_seq TO atlas_user;


--
-- TOC entry 6438 (class 0 OID 0)
-- Dependencies: 261
-- Name: TABLE licenses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.licenses TO atlas_user;


--
-- TOC entry 6440 (class 0 OID 0)
-- Dependencies: 260
-- Name: SEQUENCE licenses_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.licenses_id_seq TO atlas_user;


--
-- TOC entry 6441 (class 0 OID 0)
-- Dependencies: 293
-- Name: TABLE locations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.locations TO atlas_user;


--
-- TOC entry 6442 (class 0 OID 0)
-- Dependencies: 227
-- Name: SEQUENCE locations_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.locations_id_seq TO atlas_user;


--
-- TOC entry 6444 (class 0 OID 0)
-- Dependencies: 292
-- Name: SEQUENCE locations_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.locations_id_seq1 TO atlas_user;


--
-- TOC entry 6445 (class 0 OID 0)
-- Dependencies: 287
-- Name: TABLE manufacturers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.manufacturers TO atlas_user;


--
-- TOC entry 6446 (class 0 OID 0)
-- Dependencies: 228
-- Name: SEQUENCE manufacturers_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.manufacturers_id_seq TO atlas_user;


--
-- TOC entry 6448 (class 0 OID 0)
-- Dependencies: 286
-- Name: SEQUENCE manufacturers_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.manufacturers_id_seq1 TO atlas_user;


--
-- TOC entry 6449 (class 0 OID 0)
-- Dependencies: 363
-- Name: TABLE mobile_devices; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mobile_devices TO atlas_user;


--
-- TOC entry 6451 (class 0 OID 0)
-- Dependencies: 362
-- Name: SEQUENCE mobile_devices_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.mobile_devices_id_seq TO atlas_user;


--
-- TOC entry 6452 (class 0 OID 0)
-- Dependencies: 365
-- Name: TABLE mobile_offline_data; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mobile_offline_data TO atlas_user;


--
-- TOC entry 6454 (class 0 OID 0)
-- Dependencies: 364
-- Name: SEQUENCE mobile_offline_data_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.mobile_offline_data_id_seq TO atlas_user;


--
-- TOC entry 6455 (class 0 OID 0)
-- Dependencies: 367
-- Name: TABLE mobile_sync_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mobile_sync_logs TO atlas_user;


--
-- TOC entry 6457 (class 0 OID 0)
-- Dependencies: 366
-- Name: SEQUENCE mobile_sync_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.mobile_sync_logs_id_seq TO atlas_user;


--
-- TOC entry 6458 (class 0 OID 0)
-- Dependencies: 305
-- Name: TABLE network_cabinets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.network_cabinets TO atlas_user;


--
-- TOC entry 6460 (class 0 OID 0)
-- Dependencies: 304
-- Name: SEQUENCE network_cabinets_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.network_cabinets_id_seq TO atlas_user;


--
-- TOC entry 6461 (class 0 OID 0)
-- Dependencies: 313
-- Name: TABLE network_ports; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.network_ports TO atlas_user;


--
-- TOC entry 6462 (class 0 OID 0)
-- Dependencies: 229
-- Name: SEQUENCE network_ports_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.network_ports_id_seq TO atlas_user;


--
-- TOC entry 6464 (class 0 OID 0)
-- Dependencies: 312
-- Name: SEQUENCE network_ports_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.network_ports_id_seq1 TO atlas_user;


--
-- TOC entry 6468 (class 0 OID 0)
-- Dependencies: 311
-- Name: TABLE network_sockets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.network_sockets TO atlas_user;


--
-- TOC entry 6470 (class 0 OID 0)
-- Dependencies: 310
-- Name: SEQUENCE network_sockets_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.network_sockets_id_seq TO atlas_user;


--
-- TOC entry 6471 (class 0 OID 0)
-- Dependencies: 309
-- Name: TABLE network_switches; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.network_switches TO atlas_user;


--
-- TOC entry 6473 (class 0 OID 0)
-- Dependencies: 308
-- Name: SEQUENCE network_switches_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.network_switches_id_seq TO atlas_user;


--
-- TOC entry 6474 (class 0 OID 0)
-- Dependencies: 307
-- Name: TABLE network_vlans; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.network_vlans TO atlas_user;


--
-- TOC entry 6476 (class 0 OID 0)
-- Dependencies: 306
-- Name: SEQUENCE network_vlans_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.network_vlans_id_seq TO atlas_user;


--
-- TOC entry 6477 (class 0 OID 0)
-- Dependencies: 230
-- Name: SEQUENCE notifications_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.notifications_id_seq TO atlas_user;


--
-- TOC entry 6478 (class 0 OID 0)
-- Dependencies: 353
-- Name: TABLE onboarding_checklist_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.onboarding_checklist_items TO atlas_user;


--
-- TOC entry 6480 (class 0 OID 0)
-- Dependencies: 352
-- Name: SEQUENCE onboarding_checklist_items_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.onboarding_checklist_items_id_seq TO atlas_user;


--
-- TOC entry 6481 (class 0 OID 0)
-- Dependencies: 351
-- Name: TABLE onboarding_checklists; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.onboarding_checklists TO atlas_user;


--
-- TOC entry 6483 (class 0 OID 0)
-- Dependencies: 350
-- Name: SEQUENCE onboarding_checklists_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.onboarding_checklists_id_seq TO atlas_user;


--
-- TOC entry 6484 (class 0 OID 0)
-- Dependencies: 349
-- Name: TABLE onboarding_protocol_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.onboarding_protocol_items TO atlas_user;


--
-- TOC entry 6486 (class 0 OID 0)
-- Dependencies: 348
-- Name: SEQUENCE onboarding_protocol_items_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.onboarding_protocol_items_id_seq TO atlas_user;


--
-- TOC entry 6487 (class 0 OID 0)
-- Dependencies: 347
-- Name: TABLE onboarding_protocols; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.onboarding_protocols TO atlas_user;


--
-- TOC entry 6489 (class 0 OID 0)
-- Dependencies: 346
-- Name: SEQUENCE onboarding_protocols_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.onboarding_protocols_id_seq TO atlas_user;


--
-- TOC entry 6490 (class 0 OID 0)
-- Dependencies: 345
-- Name: TABLE onboarding_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.onboarding_templates TO atlas_user;


--
-- TOC entry 6492 (class 0 OID 0)
-- Dependencies: 344
-- Name: SEQUENCE onboarding_templates_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.onboarding_templates_id_seq TO atlas_user;


--
-- TOC entry 6493 (class 0 OID 0)
-- Dependencies: 251
-- Name: TABLE permissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.permissions TO atlas_user;


--
-- TOC entry 6495 (class 0 OID 0)
-- Dependencies: 250
-- Name: SEQUENCE permissions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.permissions_id_seq TO atlas_user;


--
-- TOC entry 6496 (class 0 OID 0)
-- Dependencies: 333
-- Name: TABLE portal_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.portal_categories TO atlas_user;


--
-- TOC entry 6498 (class 0 OID 0)
-- Dependencies: 332
-- Name: SEQUENCE portal_categories_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.portal_categories_id_seq TO atlas_user;


--
-- TOC entry 6499 (class 0 OID 0)
-- Dependencies: 337
-- Name: TABLE portal_request_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.portal_request_items TO atlas_user;


--
-- TOC entry 6501 (class 0 OID 0)
-- Dependencies: 336
-- Name: SEQUENCE portal_request_items_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.portal_request_items_id_seq TO atlas_user;


--
-- TOC entry 6502 (class 0 OID 0)
-- Dependencies: 335
-- Name: TABLE portal_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.portal_requests TO atlas_user;


--
-- TOC entry 6504 (class 0 OID 0)
-- Dependencies: 334
-- Name: SEQUENCE portal_requests_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.portal_requests_id_seq TO atlas_user;


--
-- TOC entry 6505 (class 0 OID 0)
-- Dependencies: 341
-- Name: TABLE portal_ticket_attachments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.portal_ticket_attachments TO atlas_user;


--
-- TOC entry 6507 (class 0 OID 0)
-- Dependencies: 340
-- Name: SEQUENCE portal_ticket_attachments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.portal_ticket_attachments_id_seq TO atlas_user;


--
-- TOC entry 6508 (class 0 OID 0)
-- Dependencies: 343
-- Name: TABLE portal_ticket_comments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.portal_ticket_comments TO atlas_user;


--
-- TOC entry 6510 (class 0 OID 0)
-- Dependencies: 342
-- Name: SEQUENCE portal_ticket_comments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.portal_ticket_comments_id_seq TO atlas_user;


--
-- TOC entry 6511 (class 0 OID 0)
-- Dependencies: 339
-- Name: TABLE portal_tickets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.portal_tickets TO atlas_user;


--
-- TOC entry 6513 (class 0 OID 0)
-- Dependencies: 338
-- Name: SEQUENCE portal_tickets_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.portal_tickets_id_seq TO atlas_user;


--
-- TOC entry 6514 (class 0 OID 0)
-- Dependencies: 331
-- Name: TABLE reminder_notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.reminder_notifications TO atlas_user;


--
-- TOC entry 6516 (class 0 OID 0)
-- Dependencies: 330
-- Name: SEQUENCE reminder_notifications_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.reminder_notifications_id_seq TO atlas_user;


--
-- TOC entry 6517 (class 0 OID 0)
-- Dependencies: 329
-- Name: TABLE reminder_recipients; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.reminder_recipients TO atlas_user;


--
-- TOC entry 6519 (class 0 OID 0)
-- Dependencies: 328
-- Name: SEQUENCE reminder_recipients_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.reminder_recipients_id_seq TO atlas_user;


--
-- TOC entry 6520 (class 0 OID 0)
-- Dependencies: 327
-- Name: TABLE reminders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.reminders TO atlas_user;


--
-- TOC entry 6522 (class 0 OID 0)
-- Dependencies: 326
-- Name: SEQUENCE reminders_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.reminders_id_seq TO atlas_user;


--
-- TOC entry 6523 (class 0 OID 0)
-- Dependencies: 357
-- Name: TABLE report_exports; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.report_exports TO atlas_user;


--
-- TOC entry 6525 (class 0 OID 0)
-- Dependencies: 356
-- Name: SEQUENCE report_exports_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.report_exports_id_seq TO atlas_user;


--
-- TOC entry 6526 (class 0 OID 0)
-- Dependencies: 359
-- Name: TABLE report_recipients; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.report_recipients TO atlas_user;


--
-- TOC entry 6528 (class 0 OID 0)
-- Dependencies: 358
-- Name: SEQUENCE report_recipients_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.report_recipients_id_seq TO atlas_user;


--
-- TOC entry 6529 (class 0 OID 0)
-- Dependencies: 361
-- Name: TABLE report_schedules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.report_schedules TO atlas_user;


--
-- TOC entry 6531 (class 0 OID 0)
-- Dependencies: 360
-- Name: SEQUENCE report_schedules_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.report_schedules_id_seq TO atlas_user;


--
-- TOC entry 6532 (class 0 OID 0)
-- Dependencies: 355
-- Name: TABLE report_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.report_templates TO atlas_user;


--
-- TOC entry 6534 (class 0 OID 0)
-- Dependencies: 354
-- Name: SEQUENCE report_templates_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.report_templates_id_seq TO atlas_user;


--
-- TOC entry 6535 (class 0 OID 0)
-- Dependencies: 249
-- Name: TABLE role_hierarchy; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.role_hierarchy TO atlas_user;


--
-- TOC entry 6537 (class 0 OID 0)
-- Dependencies: 248
-- Name: SEQUENCE role_hierarchy_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.role_hierarchy_id_seq TO atlas_user;


--
-- TOC entry 6538 (class 0 OID 0)
-- Dependencies: 253
-- Name: TABLE role_permissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.role_permissions TO atlas_user;


--
-- TOC entry 6540 (class 0 OID 0)
-- Dependencies: 252
-- Name: SEQUENCE role_permissions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.role_permissions_id_seq TO atlas_user;


--
-- TOC entry 6541 (class 0 OID 0)
-- Dependencies: 247
-- Name: TABLE roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.roles TO atlas_user;


--
-- TOC entry 6543 (class 0 OID 0)
-- Dependencies: 246
-- Name: SEQUENCE roles_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.roles_id_seq TO atlas_user;


--
-- TOC entry 6544 (class 0 OID 0)
-- Dependencies: 297
-- Name: TABLE rooms; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rooms TO atlas_user;


--
-- TOC entry 6545 (class 0 OID 0)
-- Dependencies: 231
-- Name: SEQUENCE rooms_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.rooms_id_seq TO atlas_user;


--
-- TOC entry 6547 (class 0 OID 0)
-- Dependencies: 296
-- Name: SEQUENCE rooms_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.rooms_id_seq1 TO atlas_user;


--
-- TOC entry 6548 (class 0 OID 0)
-- Dependencies: 232
-- Name: SEQUENCE software_licenses_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.software_licenses_id_seq TO atlas_user;


--
-- TOC entry 6549 (class 0 OID 0)
-- Dependencies: 291
-- Name: TABLE suppliers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.suppliers TO atlas_user;


--
-- TOC entry 6550 (class 0 OID 0)
-- Dependencies: 233
-- Name: SEQUENCE suppliers_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.suppliers_id_seq TO atlas_user;


--
-- TOC entry 6552 (class 0 OID 0)
-- Dependencies: 290
-- Name: SEQUENCE suppliers_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.suppliers_id_seq1 TO atlas_user;


--
-- TOC entry 6553 (class 0 OID 0)
-- Dependencies: 234
-- Name: SEQUENCE switches_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.switches_id_seq TO atlas_user;


--
-- TOC entry 6554 (class 0 OID 0)
-- Dependencies: 303
-- Name: TABLE system_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.system_settings TO atlas_user;


--
-- TOC entry 6556 (class 0 OID 0)
-- Dependencies: 302
-- Name: SEQUENCE system_settings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.system_settings_id_seq TO atlas_user;


--
-- TOC entry 6557 (class 0 OID 0)
-- Dependencies: 281
-- Name: TABLE ticket_attachments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ticket_attachments TO atlas_user;


--
-- TOC entry 6559 (class 0 OID 0)
-- Dependencies: 280
-- Name: SEQUENCE ticket_attachments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.ticket_attachments_id_seq TO atlas_user;


--
-- TOC entry 6560 (class 0 OID 0)
-- Dependencies: 279
-- Name: TABLE ticket_comments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ticket_comments TO atlas_user;


--
-- TOC entry 6562 (class 0 OID 0)
-- Dependencies: 278
-- Name: SEQUENCE ticket_comments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.ticket_comments_id_seq TO atlas_user;


--
-- TOC entry 6563 (class 0 OID 0)
-- Dependencies: 277
-- Name: TABLE tickets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tickets TO atlas_user;


--
-- TOC entry 6564 (class 0 OID 0)
-- Dependencies: 282
-- Name: TABLE ticket_overview; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ticket_overview TO atlas_user;


--
-- TOC entry 6565 (class 0 OID 0)
-- Dependencies: 235
-- Name: SEQUENCE tickets_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.tickets_id_seq TO atlas_user;


--
-- TOC entry 6567 (class 0 OID 0)
-- Dependencies: 276
-- Name: SEQUENCE tickets_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.tickets_id_seq1 TO atlas_user;


--
-- TOC entry 6568 (class 0 OID 0)
-- Dependencies: 275
-- Name: TABLE todos; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.todos TO atlas_user;


--
-- TOC entry 6569 (class 0 OID 0)
-- Dependencies: 236
-- Name: SEQUENCE todos_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.todos_id_seq TO atlas_user;


--
-- TOC entry 6571 (class 0 OID 0)
-- Dependencies: 274
-- Name: SEQUENCE todos_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.todos_id_seq1 TO atlas_user;


--
-- TOC entry 6572 (class 0 OID 0)
-- Dependencies: 257
-- Name: TABLE user_group_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_group_members TO atlas_user;


--
-- TOC entry 6574 (class 0 OID 0)
-- Dependencies: 256
-- Name: SEQUENCE user_group_members_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.user_group_members_id_seq TO atlas_user;


--
-- TOC entry 6575 (class 0 OID 0)
-- Dependencies: 255
-- Name: TABLE user_groups; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_groups TO atlas_user;


--
-- TOC entry 6577 (class 0 OID 0)
-- Dependencies: 254
-- Name: SEQUENCE user_groups_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.user_groups_id_seq TO atlas_user;


--
-- TOC entry 6578 (class 0 OID 0)
-- Dependencies: 245
-- Name: TABLE user_preferences; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_preferences TO atlas_user;


--
-- TOC entry 6580 (class 0 OID 0)
-- Dependencies: 244
-- Name: SEQUENCE user_preferences_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.user_preferences_id_seq TO atlas_user;


--
-- TOC entry 6581 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE user_profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_profiles TO atlas_user;


--
-- TOC entry 6583 (class 0 OID 0)
-- Dependencies: 242
-- Name: SEQUENCE user_profiles_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.user_profiles_id_seq TO atlas_user;


--
-- TOC entry 6584 (class 0 OID 0)
-- Dependencies: 237
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.users_id_seq TO atlas_user;


--
-- TOC entry 6586 (class 0 OID 0)
-- Dependencies: 240
-- Name: SEQUENCE users_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.users_id_seq1 TO atlas_user;


--
-- TOC entry 6587 (class 0 OID 0)
-- Dependencies: 289
-- Name: TABLE vendors; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.vendors TO atlas_user;


--
-- TOC entry 6589 (class 0 OID 0)
-- Dependencies: 288
-- Name: SEQUENCE vendors_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.vendors_id_seq TO atlas_user;


-- Completed on 2025-04-13 20:10:35

--
-- PostgreSQL database dump complete
--

