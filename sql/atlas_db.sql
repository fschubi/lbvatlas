--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-04-22 17:51:59

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
-- TOC entry 399 (class 1255 OID 25858)
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
-- TOC entry 411 (class 1255 OID 25859)
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
-- TOC entry 418 (class 1255 OID 25856)
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
-- TOC entry 398 (class 1255 OID 25857)
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
-- TOC entry 430 (class 1255 OID 26399)
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
-- TOC entry 417 (class 1255 OID 25855)
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
-- TOC entry 416 (class 1255 OID 25854)
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
-- TOC entry 420 (class 1255 OID 25861)
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
-- TOC entry 419 (class 1255 OID 25860)
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
-- TOC entry 421 (class 1255 OID 25862)
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
-- TOC entry 422 (class 1255 OID 25863)
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
-- TOC entry 415 (class 1255 OID 25853)
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
-- TOC entry 397 (class 1255 OID 25849)
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
-- TOC entry 412 (class 1255 OID 25850)
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
-- TOC entry 445 (class 1255 OID 28959)
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
-- TOC entry 449 (class 1255 OID 28885)
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
-- TOC entry 434 (class 1255 OID 26936)
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
-- TOC entry 426 (class 1255 OID 26029)
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
-- TOC entry 442 (class 1255 OID 26943)
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
-- TOC entry 440 (class 1255 OID 26941)
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
-- TOC entry 432 (class 1255 OID 26934)
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
-- TOC entry 424 (class 1255 OID 26027)
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
-- TOC entry 431 (class 1255 OID 26933)
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
-- TOC entry 447 (class 1255 OID 31256)
-- Name: get_group_users(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_group_users(p_group_id integer) RETURNS TABLE(id integer, username character varying, first_name character varying, last_name character varying, email character varying, added_at timestamp with time zone, added_by integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.email,
        ugm.added_at,
        ugm.added_by
    FROM
        users u
    JOIN
        user_group_members ugm ON u.id = ugm.user_id
    WHERE
        ugm.group_id = p_group_id
    ORDER BY
        u.last_name, u.first_name;
END;
$$;


ALTER FUNCTION public.get_group_users(p_group_id integer) OWNER TO postgres;

--
-- TOC entry 427 (class 1255 OID 26030)
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
-- TOC entry 436 (class 1255 OID 26938)
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
-- TOC entry 433 (class 1255 OID 26935)
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
-- TOC entry 425 (class 1255 OID 26028)
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
-- TOC entry 439 (class 1255 OID 26940)
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
-- TOC entry 438 (class 1255 OID 26942)
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
-- TOC entry 441 (class 1255 OID 28883)
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
-- TOC entry 429 (class 1255 OID 26032)
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
-- TOC entry 435 (class 1255 OID 26937)
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
-- TOC entry 428 (class 1255 OID 26031)
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
-- TOC entry 437 (class 1255 OID 26939)
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
-- TOC entry 446 (class 1255 OID 31255)
-- Name: get_user_groups(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_groups(p_user_id integer) RETURNS TABLE(id integer, name character varying, description text, created_at timestamp with time zone, created_by integer, updated_at timestamp with time zone, added_at timestamp with time zone, added_by integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        ug.id,
        ug.name,
        ug.description,
        ug.created_at,
        ug.created_by,
        ug.updated_at,
        ugm.added_at,
        ugm.added_by
    FROM
        user_groups ug
    JOIN
        user_group_members ugm ON ug.id = ugm.group_id
    WHERE
        ugm.user_id = p_user_id
    ORDER BY
        ug.name;
END;
$$;


ALTER FUNCTION public.get_user_groups(p_user_id integer) OWNER TO postgres;

--
-- TOC entry 423 (class 1255 OID 26021)
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
-- TOC entry 396 (class 1255 OID 31253)
-- Name: log_user_activity(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_user_activity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    old_values_json JSONB := '{}'::JSONB;
    new_values_json JSONB := '{}'::JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Bei INSERT nur die neuen Werte protokollieren
        new_values_json := to_jsonb(NEW);
        new_values_json := new_values_json - 'password_hash'; -- Sensible Daten entfernen
        
        INSERT INTO audit_log (
            user_id, username, action, entity_type, entity_id, 
            old_values, new_values, ip_address
        ) VALUES (
            current_setting('app.current_user_id', true)::INTEGER,
            current_setting('app.current_username', true),
            'CREATE',
            TG_TABLE_NAME,
            NEW.id,
            NULL,
            new_values_json,
            current_setting('app.client_ip', true)
        );
        
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Bei UPDATE alte und neue Werte protokollieren
        old_values_json := to_jsonb(OLD);
        new_values_json := to_jsonb(NEW);
        
        -- Sensible Daten entfernen
        old_values_json := old_values_json - 'password_hash';
        new_values_json := new_values_json - 'password_hash';
        
        INSERT INTO audit_log (
            user_id, username, action, entity_type, entity_id, 
            old_values, new_values, ip_address
        ) VALUES (
            current_setting('app.current_user_id', true)::INTEGER,
            current_setting('app.current_username', true),
            'UPDATE',
            TG_TABLE_NAME,
            NEW.id,
            old_values_json,
            new_values_json,
            current_setting('app.client_ip', true)
        );
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Bei DELETE nur die alten Werte protokollieren
        old_values_json := to_jsonb(OLD);
        old_values_json := old_values_json - 'password_hash'; -- Sensible Daten entfernen
        
        INSERT INTO audit_log (
            user_id, username, action, entity_type, entity_id, 
            old_values, new_values, ip_address
        ) VALUES (
            current_setting('app.current_user_id', true)::INTEGER,
            current_setting('app.current_username', true),
            'DELETE',
            TG_TABLE_NAME,
            OLD.id,
            old_values_json,
            NULL,
            current_setting('app.client_ip', true)
        );
        
        RETURN OLD;
    END IF;
END;
$$;


ALTER FUNCTION public.log_user_activity() OWNER TO postgres;

--
-- TOC entry 413 (class 1255 OID 25851)
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
-- TOC entry 444 (class 1255 OID 28958)
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
-- TOC entry 443 (class 1255 OID 28884)
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
-- TOC entry 394 (class 1255 OID 26398)
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
-- TOC entry 395 (class 1255 OID 31301)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   IF TG_OP = 'UPDATE' THEN
      NEW.updated_at = now();
   END IF;
   RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- TOC entry 448 (class 1255 OID 31257)
-- Name: update_user_group_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_user_group_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_user_group_timestamp() OWNER TO postgres;

--
-- TOC entry 414 (class 1255 OID 25852)
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
-- TOC entry 6470 (class 0 OID 0)
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
-- TOC entry 6473 (class 0 OID 0)
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
-- TOC entry 6476 (class 0 OID 0)
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
-- TOC entry 6479 (class 0 OID 0)
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
-- TOC entry 6482 (class 0 OID 0)
-- Dependencies: 377
-- Name: asset_tag_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.asset_tag_settings_id_seq OWNED BY public.asset_tag_settings.id;


--
-- TOC entry 382 (class 1259 OID 31154)
-- Name: assets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assets (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    asset_tag character varying(50),
    assigned_user_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.assets OWNER TO postgres;

--
-- TOC entry 381 (class 1259 OID 31153)
-- Name: assets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assets_id_seq OWNER TO postgres;

--
-- TOC entry 6485 (class 0 OID 0)
-- Dependencies: 381
-- Name: assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assets_id_seq OWNED BY public.assets.id;


--
-- TOC entry 386 (class 1259 OID 31196)
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    user_id integer,
    username character varying(100),
    action character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer,
    old_values jsonb,
    new_values jsonb,
    ip_address character varying(45),
    user_agent text,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- TOC entry 385 (class 1259 OID 31195)
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_log_id_seq OWNER TO postgres;

--
-- TOC entry 6488 (class 0 OID 0)
-- Dependencies: 385
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


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
-- TOC entry 6491 (class 0 OID 0)
-- Dependencies: 238
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- TOC entry 388 (class 1259 OID 31215)
-- Name: auth_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth_log (
    id integer NOT NULL,
    user_id integer,
    username character varying(100),
    action character varying(20) NOT NULL,
    ip_address character varying(45),
    user_agent text,
    success boolean,
    failure_reason text,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.auth_log OWNER TO postgres;

--
-- TOC entry 387 (class 1259 OID 31214)
-- Name: auth_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.auth_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.auth_log_id_seq OWNER TO postgres;

--
-- TOC entry 6494 (class 0 OID 0)
-- Dependencies: 387
-- Name: auth_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.auth_log_id_seq OWNED BY public.auth_log.id;


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
-- TOC entry 6497 (class 0 OID 0)
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
-- TOC entry 6500 (class 0 OID 0)
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
-- TOC entry 6504 (class 0 OID 0)
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
-- TOC entry 6508 (class 0 OID 0)
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
-- TOC entry 6512 (class 0 OID 0)
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
-- TOC entry 6515 (class 0 OID 0)
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
-- TOC entry 6519 (class 0 OID 0)
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
-- TOC entry 6524 (class 0 OID 0)
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
-- TOC entry 6527 (class 0 OID 0)
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
-- TOC entry 6530 (class 0 OID 0)
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
-- TOC entry 6533 (class 0 OID 0)
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
-- TOC entry 6537 (class 0 OID 0)
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
-- TOC entry 6542 (class 0 OID 0)
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
-- TOC entry 6545 (class 0 OID 0)
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
-- TOC entry 6548 (class 0 OID 0)
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
-- TOC entry 6551 (class 0 OID 0)
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
-- TOC entry 6555 (class 0 OID 0)
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
    room_id integer,
    department_id integer,
    password_expires_at timestamp with time zone,
    password_changed_at timestamp with time zone,
    password_reset_token character varying(100),
    password_reset_expires_at timestamp with time zone,
    failed_login_attempts integer DEFAULT 0,
    account_locked_until timestamp with time zone,
    password_history text[] DEFAULT '{}'::text[],
    phone character varying(50),
    login_allowed boolean DEFAULT true NOT NULL,
    email_notifications_enabled boolean DEFAULT true NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 6557 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN users.phone; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.phone IS 'Telefonnummer des Benutzers';


--
-- TOC entry 6558 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN users.login_allowed; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.login_allowed IS 'Steuert, ob sich der Benutzer am System anmelden darf (unabhängig von active).';


--
-- TOC entry 6559 (class 0 OID 0)
-- Dependencies: 241
-- Name: COLUMN users.email_notifications_enabled; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.email_notifications_enabled IS 'Steuert, ob der Benutzer E-Mail-Benachrichtigungen vom System erhalten soll.';


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
-- TOC entry 6562 (class 0 OID 0)
-- Dependencies: 380
-- Name: TABLE label_settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.label_settings IS 'Tabelle zur Speicherung der benutzerdefinierten Etiketten-Einstellungen im ATLAS-System';


--
-- TOC entry 6563 (class 0 OID 0)
-- Dependencies: 380
-- Name: COLUMN label_settings.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.label_settings.user_id IS 'Nutzer-ID (null für globale Standardeinstellungen)';


--
-- TOC entry 6564 (class 0 OID 0)
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
-- TOC entry 6566 (class 0 OID 0)
-- Dependencies: 379
-- Name: label_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.label_settings_id_seq OWNED BY public.label_settings.id;


--
-- TOC entry 393 (class 1259 OID 31303)
-- Name: license_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.license_types (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.license_types OWNER TO postgres;

--
-- TOC entry 6568 (class 0 OID 0)
-- Dependencies: 393
-- Name: TABLE license_types; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.license_types IS 'Verwaltet die verschiedenen Typen von Softwarelizenzen im System.';


--
-- TOC entry 6569 (class 0 OID 0)
-- Dependencies: 393
-- Name: COLUMN license_types.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.license_types.name IS 'Eindeutiger Name des Lizenztyps (z.B. Einzelplatz, Volumenvertrag).';


--
-- TOC entry 6570 (class 0 OID 0)
-- Dependencies: 393
-- Name: COLUMN license_types.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.license_types.description IS 'Optionale Beschreibung des Lizenztyps.';


--
-- TOC entry 392 (class 1259 OID 31302)
-- Name: license_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.license_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.license_types_id_seq OWNER TO postgres;

--
-- TOC entry 6572 (class 0 OID 0)
-- Dependencies: 392
-- Name: license_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.license_types_id_seq OWNED BY public.license_types.id;


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
-- TOC entry 6575 (class 0 OID 0)
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
-- TOC entry 6579 (class 0 OID 0)
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
-- TOC entry 6583 (class 0 OID 0)
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
-- TOC entry 6586 (class 0 OID 0)
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
-- TOC entry 6589 (class 0 OID 0)
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
-- TOC entry 6592 (class 0 OID 0)
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
-- TOC entry 6595 (class 0 OID 0)
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
-- TOC entry 6599 (class 0 OID 0)
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
-- TOC entry 6601 (class 0 OID 0)
-- Dependencies: 311
-- Name: COLUMN network_sockets.outlet_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.network_sockets.outlet_number IS 'Dosennummer (z.B. 26815.01.02.22)';


--
-- TOC entry 6602 (class 0 OID 0)
-- Dependencies: 311
-- Name: COLUMN network_sockets.location_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.network_sockets.location_id IS 'Verknüpfung mit Standort';


--
-- TOC entry 6603 (class 0 OID 0)
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
-- TOC entry 6605 (class 0 OID 0)
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
    location_id integer,
    room_id integer,
    rack_position integer,
    port_count integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    notes text,
    cabinet_label character varying(100)
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
-- TOC entry 6608 (class 0 OID 0)
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
-- TOC entry 6611 (class 0 OID 0)
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
-- TOC entry 6615 (class 0 OID 0)
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
-- TOC entry 6618 (class 0 OID 0)
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
-- TOC entry 6621 (class 0 OID 0)
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
-- TOC entry 6624 (class 0 OID 0)
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
-- TOC entry 6627 (class 0 OID 0)
-- Dependencies: 344
-- Name: onboarding_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.onboarding_templates_id_seq OWNED BY public.onboarding_templates.id;


--
-- TOC entry 390 (class 1259 OID 31233)
-- Name: password_change_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_change_log (
    id integer NOT NULL,
    user_id integer,
    username character varying(100),
    action character varying(50) NOT NULL,
    changed_by_user_id integer,
    changed_by_username character varying(100),
    ip_address character varying(45),
    user_agent text,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.password_change_log OWNER TO postgres;

--
-- TOC entry 389 (class 1259 OID 31232)
-- Name: password_change_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_change_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_change_log_id_seq OWNER TO postgres;

--
-- TOC entry 6630 (class 0 OID 0)
-- Dependencies: 389
-- Name: password_change_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_change_log_id_seq OWNED BY public.password_change_log.id;


--
-- TOC entry 384 (class 1259 OID 31174)
-- Name: password_policies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_policies (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    min_length integer DEFAULT 8 NOT NULL,
    require_uppercase boolean DEFAULT true,
    require_lowercase boolean DEFAULT true,
    require_numbers boolean DEFAULT true,
    require_special_chars boolean DEFAULT true,
    password_expiry_days integer DEFAULT 90,
    prevent_reuse_count integer DEFAULT 3,
    max_failed_attempts integer DEFAULT 5,
    lockout_duration_minutes integer DEFAULT 15,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.password_policies OWNER TO postgres;

--
-- TOC entry 383 (class 1259 OID 31173)
-- Name: password_policies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_policies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_policies_id_seq OWNER TO postgres;

--
-- TOC entry 6633 (class 0 OID 0)
-- Dependencies: 383
-- Name: password_policies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_policies_id_seq OWNED BY public.password_policies.id;


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
-- TOC entry 6636 (class 0 OID 0)
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
-- TOC entry 6639 (class 0 OID 0)
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
-- TOC entry 6642 (class 0 OID 0)
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
-- TOC entry 6645 (class 0 OID 0)
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
-- TOC entry 6648 (class 0 OID 0)
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
-- TOC entry 6651 (class 0 OID 0)
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
-- TOC entry 6654 (class 0 OID 0)
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
-- TOC entry 6657 (class 0 OID 0)
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
-- TOC entry 6660 (class 0 OID 0)
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
-- TOC entry 6663 (class 0 OID 0)
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
-- TOC entry 6666 (class 0 OID 0)
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
-- TOC entry 6669 (class 0 OID 0)
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
-- TOC entry 6672 (class 0 OID 0)
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
-- TOC entry 6675 (class 0 OID 0)
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
-- TOC entry 6678 (class 0 OID 0)
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
-- TOC entry 6681 (class 0 OID 0)
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
-- TOC entry 6684 (class 0 OID 0)
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
    location_name character varying(100),
    floor character varying(20),
    room_number character varying(20)
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
-- TOC entry 6688 (class 0 OID 0)
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
-- TOC entry 6693 (class 0 OID 0)
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
-- TOC entry 6697 (class 0 OID 0)
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
-- TOC entry 6700 (class 0 OID 0)
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
-- TOC entry 6703 (class 0 OID 0)
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
-- TOC entry 6708 (class 0 OID 0)
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
-- TOC entry 6712 (class 0 OID 0)
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
-- TOC entry 6714 (class 0 OID 0)
-- Dependencies: 257
-- Name: TABLE user_group_members; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_group_members IS 'Zuordnung von Benutzern zu Gruppen';


--
-- TOC entry 6715 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN user_group_members.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_group_members.id IS 'Eindeutige ID der Gruppenmitgliedschaft';


--
-- TOC entry 6716 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN user_group_members.group_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_group_members.group_id IS 'ID der Benutzergruppe';


--
-- TOC entry 6717 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN user_group_members.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_group_members.user_id IS 'ID des Benutzers';


--
-- TOC entry 6718 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN user_group_members.added_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_group_members.added_by IS 'Benutzer-ID, die diese Zuordnung erstellt hat';


--
-- TOC entry 6719 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN user_group_members.added_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_group_members.added_at IS 'Datum der Zuordnung';


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
-- TOC entry 6721 (class 0 OID 0)
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
-- TOC entry 6723 (class 0 OID 0)
-- Dependencies: 255
-- Name: TABLE user_groups; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_groups IS 'Benutzergruppen für die Organisation von Benutzern';


--
-- TOC entry 6724 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN user_groups.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_groups.id IS 'Eindeutige ID der Benutzergruppe';


--
-- TOC entry 6725 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN user_groups.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_groups.name IS 'Name der Benutzergruppe';


--
-- TOC entry 6726 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN user_groups.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_groups.description IS 'Beschreibung der Benutzergruppe';


--
-- TOC entry 6727 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN user_groups.created_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_groups.created_by IS 'Benutzer-ID, die diese Gruppe erstellt hat';


--
-- TOC entry 6728 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN user_groups.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_groups.created_at IS 'Erstellungsdatum der Gruppe';


--
-- TOC entry 6729 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN user_groups.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_groups.updated_at IS 'Datum der letzten Aktualisierung';


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
-- TOC entry 6731 (class 0 OID 0)
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
-- TOC entry 6734 (class 0 OID 0)
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
-- TOC entry 6737 (class 0 OID 0)
-- Dependencies: 242
-- Name: user_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_profiles_id_seq OWNED BY public.user_profiles.id;


--
-- TOC entry 391 (class 1259 OID 31259)
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    user_id integer NOT NULL,
    role_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- TOC entry 6739 (class 0 OID 0)
-- Dependencies: 391
-- Name: TABLE user_roles; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_roles IS 'Verknüpfungstabelle zur Zuweisung von Rollen zu Benutzern (Many-to-Many)';


--
-- TOC entry 6740 (class 0 OID 0)
-- Dependencies: 391
-- Name: COLUMN user_roles.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_roles.user_id IS 'Fremdschlüssel zur users Tabelle';


--
-- TOC entry 6741 (class 0 OID 0)
-- Dependencies: 391
-- Name: COLUMN user_roles.role_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_roles.role_id IS 'Fremdschlüssel zur roles Tabelle';


--
-- TOC entry 6742 (class 0 OID 0)
-- Dependencies: 391
-- Name: COLUMN user_roles.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_roles.created_at IS 'Zeitstempel der Zuweisung';


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
-- TOC entry 6745 (class 0 OID 0)
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
-- TOC entry 6748 (class 0 OID 0)
-- Dependencies: 288
-- Name: vendors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vendors_id_seq OWNED BY public.vendors.id;


--
-- TOC entry 5253 (class 2604 OID 29282)
-- Name: accessories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessories ALTER COLUMN id SET DEFAULT nextval('public.accessories_id_seq1'::regclass);


--
-- TOC entry 5259 (class 2604 OID 29336)
-- Name: accessory_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessory_history ALTER COLUMN id SET DEFAULT nextval('public.accessory_history_id_seq'::regclass);


--
-- TOC entry 5314 (class 2604 OID 29819)
-- Name: asset_custom_field_values id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_custom_field_values ALTER COLUMN id SET DEFAULT nextval('public.asset_custom_field_values_id_seq'::regclass);


--
-- TOC entry 5310 (class 2604 OID 29805)
-- Name: asset_custom_fields id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_custom_fields ALTER COLUMN id SET DEFAULT nextval('public.asset_custom_fields_id_seq'::regclass);


--
-- TOC entry 5459 (class 2604 OID 31107)
-- Name: asset_tag_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_tag_settings ALTER COLUMN id SET DEFAULT nextval('public.asset_tag_settings_id_seq'::regclass);


--
-- TOC entry 5469 (class 2604 OID 31157)
-- Name: assets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets ALTER COLUMN id SET DEFAULT nextval('public.assets_id_seq'::regclass);


--
-- TOC entry 5485 (class 2604 OID 31199)
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- TOC entry 5201 (class 2604 OID 28966)
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- TOC entry 5487 (class 2604 OID 31218)
-- Name: auth_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_log ALTER COLUMN id SET DEFAULT nextval('public.auth_log_id_seq'::regclass);


--
-- TOC entry 5350 (class 2604 OID 30338)
-- Name: calendar_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_categories ALTER COLUMN id SET DEFAULT nextval('public.calendar_categories_id_seq'::regclass);


--
-- TOC entry 5353 (class 2604 OID 30351)
-- Name: calendar_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_events ALTER COLUMN id SET DEFAULT nextval('public.calendar_events_id_seq'::regclass);


--
-- TOC entry 5284 (class 2604 OID 29678)
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq1'::regclass);


--
-- TOC entry 5249 (class 2604 OID 29265)
-- Name: certificates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates ALTER COLUMN id SET DEFAULT nextval('public.certificates_id_seq1'::regclass);


--
-- TOC entry 5302 (class 2604 OID 29748)
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq1'::regclass);


--
-- TOC entry 5257 (class 2604 OID 29311)
-- Name: device_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_history ALTER COLUMN id SET DEFAULT nextval('public.device_history_id_seq'::regclass);


--
-- TOC entry 5455 (class 2604 OID 31055)
-- Name: device_models id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_models ALTER COLUMN id SET DEFAULT nextval('public.device_models_id_seq1'::regclass);


--
-- TOC entry 5240 (class 2604 OID 29216)
-- Name: devices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices ALTER COLUMN id SET DEFAULT nextval('public.devices_id_seq1'::regclass);


--
-- TOC entry 5345 (class 2604 OID 30283)
-- Name: document_attachments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_attachments ALTER COLUMN id SET DEFAULT nextval('public.document_attachments_id_seq'::regclass);


--
-- TOC entry 5338 (class 2604 OID 30248)
-- Name: document_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_categories ALTER COLUMN id SET DEFAULT nextval('public.document_categories_id_seq'::regclass);


--
-- TOC entry 5348 (class 2604 OID 30304)
-- Name: document_versions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_versions ALTER COLUMN id SET DEFAULT nextval('public.document_versions_id_seq'::regclass);


--
-- TOC entry 5341 (class 2604 OID 30261)
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq1'::regclass);


--
-- TOC entry 5442 (class 2604 OID 30935)
-- Name: integration_configs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_configs ALTER COLUMN id SET DEFAULT nextval('public.integration_configs_id_seq'::regclass);


--
-- TOC entry 5446 (class 2604 OID 30954)
-- Name: integration_mappings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_mappings ALTER COLUMN id SET DEFAULT nextval('public.integration_mappings_id_seq'::regclass);


--
-- TOC entry 5450 (class 2604 OID 30973)
-- Name: integration_sync_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_sync_logs ALTER COLUMN id SET DEFAULT nextval('public.integration_sync_logs_id_seq'::regclass);


--
-- TOC entry 5265 (class 2604 OID 29428)
-- Name: inventory_checks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_checks ALTER COLUMN id SET DEFAULT nextval('public.inventory_checks_id_seq'::regclass);


--
-- TOC entry 5261 (class 2604 OID 29411)
-- Name: inventory_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_sessions ALTER COLUMN id SET DEFAULT nextval('public.inventory_sessions_id_seq1'::regclass);


--
-- TOC entry 5465 (class 2604 OID 31121)
-- Name: label_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.label_settings ALTER COLUMN id SET DEFAULT nextval('public.label_settings_id_seq'::regclass);


--
-- TOC entry 5492 (class 2604 OID 31306)
-- Name: license_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.license_types ALTER COLUMN id SET DEFAULT nextval('public.license_types_id_seq'::regclass);


--
-- TOC entry 5244 (class 2604 OID 29245)
-- Name: licenses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.licenses ALTER COLUMN id SET DEFAULT nextval('public.licenses_id_seq'::regclass);


--
-- TOC entry 5299 (class 2604 OID 29735)
-- Name: locations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations ALTER COLUMN id SET DEFAULT nextval('public.locations_id_seq1'::regclass);


--
-- TOC entry 5288 (class 2604 OID 29696)
-- Name: manufacturers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manufacturers ALTER COLUMN id SET DEFAULT nextval('public.manufacturers_id_seq1'::regclass);


--
-- TOC entry 5429 (class 2604 OID 30863)
-- Name: mobile_devices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_devices ALTER COLUMN id SET DEFAULT nextval('public.mobile_devices_id_seq'::regclass);


--
-- TOC entry 5433 (class 2604 OID 30882)
-- Name: mobile_offline_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_offline_data ALTER COLUMN id SET DEFAULT nextval('public.mobile_offline_data_id_seq'::regclass);


--
-- TOC entry 5437 (class 2604 OID 30901)
-- Name: mobile_sync_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_sync_logs ALTER COLUMN id SET DEFAULT nextval('public.mobile_sync_logs_id_seq'::regclass);


--
-- TOC entry 5321 (class 2604 OID 29883)
-- Name: network_cabinets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_cabinets ALTER COLUMN id SET DEFAULT nextval('public.network_cabinets_id_seq'::regclass);


--
-- TOC entry 5335 (class 2604 OID 30175)
-- Name: network_ports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_ports ALTER COLUMN id SET DEFAULT nextval('public.network_ports_id_seq1'::regclass);


--
-- TOC entry 5331 (class 2604 OID 30156)
-- Name: network_sockets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_sockets ALTER COLUMN id SET DEFAULT nextval('public.network_sockets_id_seq'::regclass);


--
-- TOC entry 5327 (class 2604 OID 30118)
-- Name: network_switches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_switches ALTER COLUMN id SET DEFAULT nextval('public.network_switches_id_seq'::regclass);


--
-- TOC entry 5324 (class 2604 OID 29922)
-- Name: network_vlans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_vlans ALTER COLUMN id SET DEFAULT nextval('public.network_vlans_id_seq'::regclass);


--
-- TOC entry 5409 (class 2604 OID 30722)
-- Name: onboarding_checklist_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_checklist_items ALTER COLUMN id SET DEFAULT nextval('public.onboarding_checklist_items_id_seq'::regclass);


--
-- TOC entry 5405 (class 2604 OID 30698)
-- Name: onboarding_checklists id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_checklists ALTER COLUMN id SET DEFAULT nextval('public.onboarding_checklists_id_seq'::regclass);


--
-- TOC entry 5401 (class 2604 OID 30676)
-- Name: onboarding_protocol_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_protocol_items ALTER COLUMN id SET DEFAULT nextval('public.onboarding_protocol_items_id_seq'::regclass);


--
-- TOC entry 5397 (class 2604 OID 30649)
-- Name: onboarding_protocols id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_protocols ALTER COLUMN id SET DEFAULT nextval('public.onboarding_protocols_id_seq'::regclass);


--
-- TOC entry 5393 (class 2604 OID 30630)
-- Name: onboarding_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_templates ALTER COLUMN id SET DEFAULT nextval('public.onboarding_templates_id_seq'::regclass);


--
-- TOC entry 5489 (class 2604 OID 31236)
-- Name: password_change_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_change_log ALTER COLUMN id SET DEFAULT nextval('public.password_change_log_id_seq'::regclass);


--
-- TOC entry 5472 (class 2604 OID 31177)
-- Name: password_policies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_policies ALTER COLUMN id SET DEFAULT nextval('public.password_policies_id_seq'::regclass);


--
-- TOC entry 5230 (class 2604 OID 29064)
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- TOC entry 5368 (class 2604 OID 30462)
-- Name: portal_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_categories ALTER COLUMN id SET DEFAULT nextval('public.portal_categories_id_seq'::regclass);


--
-- TOC entry 5377 (class 2604 OID 30509)
-- Name: portal_request_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_request_items ALTER COLUMN id SET DEFAULT nextval('public.portal_request_items_id_seq'::regclass);


--
-- TOC entry 5372 (class 2604 OID 30481)
-- Name: portal_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_requests ALTER COLUMN id SET DEFAULT nextval('public.portal_requests_id_seq'::regclass);


--
-- TOC entry 5386 (class 2604 OID 30559)
-- Name: portal_ticket_attachments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_ticket_attachments ALTER COLUMN id SET DEFAULT nextval('public.portal_ticket_attachments_id_seq'::regclass);


--
-- TOC entry 5389 (class 2604 OID 30580)
-- Name: portal_ticket_comments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_ticket_comments ALTER COLUMN id SET DEFAULT nextval('public.portal_ticket_comments_id_seq'::regclass);


--
-- TOC entry 5381 (class 2604 OID 30526)
-- Name: portal_tickets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_tickets ALTER COLUMN id SET DEFAULT nextval('public.portal_tickets_id_seq'::regclass);


--
-- TOC entry 5365 (class 2604 OID 30417)
-- Name: reminder_notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_notifications ALTER COLUMN id SET DEFAULT nextval('public.reminder_notifications_id_seq'::regclass);


--
-- TOC entry 5362 (class 2604 OID 30396)
-- Name: reminder_recipients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_recipients ALTER COLUMN id SET DEFAULT nextval('public.reminder_recipients_id_seq'::regclass);


--
-- TOC entry 5358 (class 2604 OID 30374)
-- Name: reminders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminders ALTER COLUMN id SET DEFAULT nextval('public.reminders_id_seq'::regclass);


--
-- TOC entry 5417 (class 2604 OID 30780)
-- Name: report_exports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_exports ALTER COLUMN id SET DEFAULT nextval('public.report_exports_id_seq'::regclass);


--
-- TOC entry 5421 (class 2604 OID 30802)
-- Name: report_recipients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_recipients ALTER COLUMN id SET DEFAULT nextval('public.report_recipients_id_seq'::regclass);


--
-- TOC entry 5425 (class 2604 OID 30824)
-- Name: report_schedules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_schedules ALTER COLUMN id SET DEFAULT nextval('public.report_schedules_id_seq'::regclass);


--
-- TOC entry 5413 (class 2604 OID 30761)
-- Name: report_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_templates ALTER COLUMN id SET DEFAULT nextval('public.report_templates_id_seq'::regclass);


--
-- TOC entry 5228 (class 2604 OID 29044)
-- Name: role_hierarchy id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_hierarchy ALTER COLUMN id SET DEFAULT nextval('public.role_hierarchy_id_seq'::regclass);


--
-- TOC entry 5233 (class 2604 OID 29077)
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- TOC entry 5224 (class 2604 OID 29030)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 5306 (class 2604 OID 29771)
-- Name: rooms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms ALTER COLUMN id SET DEFAULT nextval('public.rooms_id_seq1'::regclass);


--
-- TOC entry 5295 (class 2604 OID 29722)
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq1'::regclass);


--
-- TOC entry 5317 (class 2604 OID 29837)
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- TOC entry 5282 (class 2604 OID 29568)
-- Name: ticket_attachments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_attachments ALTER COLUMN id SET DEFAULT nextval('public.ticket_attachments_id_seq'::regclass);


--
-- TOC entry 5279 (class 2604 OID 29547)
-- Name: ticket_comments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_comments ALTER COLUMN id SET DEFAULT nextval('public.ticket_comments_id_seq'::regclass);


--
-- TOC entry 5274 (class 2604 OID 29504)
-- Name: tickets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets ALTER COLUMN id SET DEFAULT nextval('public.tickets_id_seq1'::regclass);


--
-- TOC entry 5269 (class 2604 OID 29461)
-- Name: todos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.todos ALTER COLUMN id SET DEFAULT nextval('public.todos_id_seq1'::regclass);


--
-- TOC entry 5238 (class 2604 OID 29113)
-- Name: user_group_members id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group_members ALTER COLUMN id SET DEFAULT nextval('public.user_group_members_id_seq'::regclass);


--
-- TOC entry 5235 (class 2604 OID 29097)
-- Name: user_groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_groups ALTER COLUMN id SET DEFAULT nextval('public.user_groups_id_seq'::regclass);


--
-- TOC entry 5217 (class 2604 OID 29010)
-- Name: user_preferences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_preferences_id_seq'::regclass);


--
-- TOC entry 5212 (class 2604 OID 28992)
-- Name: user_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles ALTER COLUMN id SET DEFAULT nextval('public.user_profiles_id_seq'::regclass);


--
-- TOC entry 5203 (class 2604 OID 28976)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq1'::regclass);


--
-- TOC entry 5292 (class 2604 OID 29709)
-- Name: vendors id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors ALTER COLUMN id SET DEFAULT nextval('public.vendors_id_seq'::regclass);


--
-- TOC entry 5575 (class 2606 OID 29289)
-- Name: accessories accessories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessories
    ADD CONSTRAINT accessories_pkey PRIMARY KEY (id);


--
-- TOC entry 5577 (class 2606 OID 29291)
-- Name: accessories accessories_serial_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessories
    ADD CONSTRAINT accessories_serial_number_key UNIQUE (serial_number);


--
-- TOC entry 5589 (class 2606 OID 29341)
-- Name: accessory_history accessory_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessory_history
    ADD CONSTRAINT accessory_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5671 (class 2606 OID 29827)
-- Name: asset_custom_field_values asset_custom_field_values_asset_id_asset_type_field_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_custom_field_values
    ADD CONSTRAINT asset_custom_field_values_asset_id_asset_type_field_id_key UNIQUE (asset_id, asset_type, field_id);


--
-- TOC entry 5673 (class 2606 OID 29825)
-- Name: asset_custom_field_values asset_custom_field_values_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_custom_field_values
    ADD CONSTRAINT asset_custom_field_values_pkey PRIMARY KEY (id);


--
-- TOC entry 5666 (class 2606 OID 29814)
-- Name: asset_custom_fields asset_custom_fields_name_asset_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_custom_fields
    ADD CONSTRAINT asset_custom_fields_name_asset_type_key UNIQUE (name, asset_type);


--
-- TOC entry 5668 (class 2606 OID 29812)
-- Name: asset_custom_fields asset_custom_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_custom_fields
    ADD CONSTRAINT asset_custom_fields_pkey PRIMARY KEY (id);


--
-- TOC entry 5873 (class 2606 OID 31114)
-- Name: asset_tag_settings asset_tag_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_tag_settings
    ADD CONSTRAINT asset_tag_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 5878 (class 2606 OID 31161)
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- TOC entry 5886 (class 2606 OID 31204)
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- TOC entry 5497 (class 2606 OID 28971)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5891 (class 2606 OID 31223)
-- Name: auth_log auth_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_log
    ADD CONSTRAINT auth_log_pkey PRIMARY KEY (id);


--
-- TOC entry 5727 (class 2606 OID 30346)
-- Name: calendar_categories calendar_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_categories
    ADD CONSTRAINT calendar_categories_name_key UNIQUE (name);


--
-- TOC entry 5729 (class 2606 OID 30344)
-- Name: calendar_categories calendar_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_categories
    ADD CONSTRAINT calendar_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 5731 (class 2606 OID 30359)
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- TOC entry 5636 (class 2606 OID 29686)
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- TOC entry 5638 (class 2606 OID 29684)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- TOC entry 5567 (class 2606 OID 29272)
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);


--
-- TOC entry 5659 (class 2606 OID 29756)
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- TOC entry 5661 (class 2606 OID 29754)
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- TOC entry 5587 (class 2606 OID 29316)
-- Name: device_history device_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_history
    ADD CONSTRAINT device_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5871 (class 2606 OID 31062)
-- Name: device_models device_models_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_models
    ADD CONSTRAINT device_models_pkey PRIMARY KEY (id);


--
-- TOC entry 5542 (class 2606 OID 31116)
-- Name: devices devices_asset_tag_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_asset_tag_key UNIQUE (asset_tag);


--
-- TOC entry 5544 (class 2606 OID 29223)
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- TOC entry 5546 (class 2606 OID 29225)
-- Name: devices devices_serial_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_serial_number_key UNIQUE (serial_number);


--
-- TOC entry 5716 (class 2606 OID 30289)
-- Name: document_attachments document_attachments_document_id_asset_type_asset_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_attachments
    ADD CONSTRAINT document_attachments_document_id_asset_type_asset_id_key UNIQUE (document_id, asset_type, asset_id);


--
-- TOC entry 5718 (class 2606 OID 30287)
-- Name: document_attachments document_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_attachments
    ADD CONSTRAINT document_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 5708 (class 2606 OID 30256)
-- Name: document_categories document_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_categories
    ADD CONSTRAINT document_categories_name_key UNIQUE (name);


--
-- TOC entry 5710 (class 2606 OID 30254)
-- Name: document_categories document_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_categories
    ADD CONSTRAINT document_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 5722 (class 2606 OID 30311)
-- Name: document_versions document_versions_document_id_version_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_document_id_version_number_key UNIQUE (document_id, version_number);


--
-- TOC entry 5724 (class 2606 OID 30309)
-- Name: document_versions document_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_pkey PRIMARY KEY (id);


--
-- TOC entry 5712 (class 2606 OID 30268)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5854 (class 2606 OID 30944)
-- Name: integration_configs integration_configs_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_configs
    ADD CONSTRAINT integration_configs_name_key UNIQUE (name);


--
-- TOC entry 5856 (class 2606 OID 30942)
-- Name: integration_configs integration_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_configs
    ADD CONSTRAINT integration_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 5861 (class 2606 OID 30963)
-- Name: integration_mappings integration_mappings_config_id_source_type_source_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_mappings
    ADD CONSTRAINT integration_mappings_config_id_source_type_source_id_key UNIQUE (config_id, source_type, source_id);


--
-- TOC entry 5863 (class 2606 OID 30961)
-- Name: integration_mappings integration_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_mappings
    ADD CONSTRAINT integration_mappings_pkey PRIMARY KEY (id);


--
-- TOC entry 5869 (class 2606 OID 30981)
-- Name: integration_sync_logs integration_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_sync_logs
    ADD CONSTRAINT integration_sync_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5603 (class 2606 OID 29436)
-- Name: inventory_checks inventory_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_checks
    ADD CONSTRAINT inventory_checks_pkey PRIMARY KEY (id);


--
-- TOC entry 5594 (class 2606 OID 29418)
-- Name: inventory_sessions inventory_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_sessions
    ADD CONSTRAINT inventory_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 5876 (class 2606 OID 31128)
-- Name: label_settings label_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.label_settings
    ADD CONSTRAINT label_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 5903 (class 2606 OID 31314)
-- Name: license_types license_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.license_types
    ADD CONSTRAINT license_types_name_key UNIQUE (name);


--
-- TOC entry 5905 (class 2606 OID 31312)
-- Name: license_types license_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.license_types
    ADD CONSTRAINT license_types_pkey PRIMARY KEY (id);


--
-- TOC entry 5563 (class 2606 OID 29255)
-- Name: licenses licenses_key_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_key_code_key UNIQUE (key_code);


--
-- TOC entry 5565 (class 2606 OID 29253)
-- Name: licenses licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_pkey PRIMARY KEY (id);


--
-- TOC entry 5655 (class 2606 OID 29743)
-- Name: locations locations_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_name_key UNIQUE (name);


--
-- TOC entry 5657 (class 2606 OID 29741)
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- TOC entry 5642 (class 2606 OID 29704)
-- Name: manufacturers manufacturers_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manufacturers
    ADD CONSTRAINT manufacturers_name_key UNIQUE (name);


--
-- TOC entry 5644 (class 2606 OID 29702)
-- Name: manufacturers manufacturers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manufacturers
    ADD CONSTRAINT manufacturers_pkey PRIMARY KEY (id);


--
-- TOC entry 5834 (class 2606 OID 30872)
-- Name: mobile_devices mobile_devices_device_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_devices
    ADD CONSTRAINT mobile_devices_device_id_key UNIQUE (device_id);


--
-- TOC entry 5836 (class 2606 OID 30870)
-- Name: mobile_devices mobile_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_devices
    ADD CONSTRAINT mobile_devices_pkey PRIMARY KEY (id);


--
-- TOC entry 5841 (class 2606 OID 30891)
-- Name: mobile_offline_data mobile_offline_data_device_id_data_type_data_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_offline_data
    ADD CONSTRAINT mobile_offline_data_device_id_data_type_data_id_key UNIQUE (device_id, data_type, data_id);


--
-- TOC entry 5843 (class 2606 OID 30889)
-- Name: mobile_offline_data mobile_offline_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_offline_data
    ADD CONSTRAINT mobile_offline_data_pkey PRIMARY KEY (id);


--
-- TOC entry 5849 (class 2606 OID 30909)
-- Name: mobile_sync_logs mobile_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_sync_logs
    ADD CONSTRAINT mobile_sync_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5684 (class 2606 OID 29891)
-- Name: network_cabinets network_cabinets_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_cabinets
    ADD CONSTRAINT network_cabinets_name_key UNIQUE (name);


--
-- TOC entry 5686 (class 2606 OID 29889)
-- Name: network_cabinets network_cabinets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_cabinets
    ADD CONSTRAINT network_cabinets_pkey PRIMARY KEY (id);


--
-- TOC entry 5706 (class 2606 OID 30179)
-- Name: network_ports network_ports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_ports
    ADD CONSTRAINT network_ports_pkey PRIMARY KEY (id);


--
-- TOC entry 5702 (class 2606 OID 30163)
-- Name: network_sockets network_sockets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_sockets
    ADD CONSTRAINT network_sockets_pkey PRIMARY KEY (id);


--
-- TOC entry 5694 (class 2606 OID 30126)
-- Name: network_switches network_switches_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_switches
    ADD CONSTRAINT network_switches_name_key UNIQUE (name);


--
-- TOC entry 5696 (class 2606 OID 30124)
-- Name: network_switches network_switches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_switches
    ADD CONSTRAINT network_switches_pkey PRIMARY KEY (id);


--
-- TOC entry 5688 (class 2606 OID 29928)
-- Name: network_vlans network_vlans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_vlans
    ADD CONSTRAINT network_vlans_pkey PRIMARY KEY (id);


--
-- TOC entry 5690 (class 2606 OID 29930)
-- Name: network_vlans network_vlans_vlan_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_vlans
    ADD CONSTRAINT network_vlans_vlan_id_key UNIQUE (vlan_id);


--
-- TOC entry 5808 (class 2606 OID 30729)
-- Name: onboarding_checklist_items onboarding_checklist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_checklist_items
    ADD CONSTRAINT onboarding_checklist_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5802 (class 2606 OID 30707)
-- Name: onboarding_checklists onboarding_checklists_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_checklists
    ADD CONSTRAINT onboarding_checklists_name_key UNIQUE (name);


--
-- TOC entry 5804 (class 2606 OID 30705)
-- Name: onboarding_checklists onboarding_checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_checklists
    ADD CONSTRAINT onboarding_checklists_pkey PRIMARY KEY (id);


--
-- TOC entry 5798 (class 2606 OID 30683)
-- Name: onboarding_protocol_items onboarding_protocol_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_protocol_items
    ADD CONSTRAINT onboarding_protocol_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5794 (class 2606 OID 30656)
-- Name: onboarding_protocols onboarding_protocols_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_protocols
    ADD CONSTRAINT onboarding_protocols_pkey PRIMARY KEY (id);


--
-- TOC entry 5785 (class 2606 OID 30639)
-- Name: onboarding_templates onboarding_templates_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_templates
    ADD CONSTRAINT onboarding_templates_name_key UNIQUE (name);


--
-- TOC entry 5787 (class 2606 OID 30637)
-- Name: onboarding_templates onboarding_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_templates
    ADD CONSTRAINT onboarding_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5895 (class 2606 OID 31241)
-- Name: password_change_log password_change_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_change_log
    ADD CONSTRAINT password_change_log_pkey PRIMARY KEY (id);


--
-- TOC entry 5880 (class 2606 OID 31193)
-- Name: password_policies password_policies_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_policies
    ADD CONSTRAINT password_policies_name_key UNIQUE (name);


--
-- TOC entry 5882 (class 2606 OID 31191)
-- Name: password_policies password_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_policies
    ADD CONSTRAINT password_policies_pkey PRIMARY KEY (id);


--
-- TOC entry 5524 (class 2606 OID 29072)
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- TOC entry 5526 (class 2606 OID 29070)
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 5757 (class 2606 OID 30471)
-- Name: portal_categories portal_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_categories
    ADD CONSTRAINT portal_categories_name_key UNIQUE (name);


--
-- TOC entry 5759 (class 2606 OID 30469)
-- Name: portal_categories portal_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_categories
    ADD CONSTRAINT portal_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 5769 (class 2606 OID 30516)
-- Name: portal_request_items portal_request_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_request_items
    ADD CONSTRAINT portal_request_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5765 (class 2606 OID 30489)
-- Name: portal_requests portal_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_requests
    ADD CONSTRAINT portal_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 5778 (class 2606 OID 30565)
-- Name: portal_ticket_attachments portal_ticket_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_ticket_attachments
    ADD CONSTRAINT portal_ticket_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 5782 (class 2606 OID 30587)
-- Name: portal_ticket_comments portal_ticket_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_ticket_comments
    ADD CONSTRAINT portal_ticket_comments_pkey PRIMARY KEY (id);


--
-- TOC entry 5775 (class 2606 OID 30534)
-- Name: portal_tickets portal_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_tickets
    ADD CONSTRAINT portal_tickets_pkey PRIMARY KEY (id);


--
-- TOC entry 5754 (class 2606 OID 30423)
-- Name: reminder_notifications reminder_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_notifications
    ADD CONSTRAINT reminder_notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 5747 (class 2606 OID 30400)
-- Name: reminder_recipients reminder_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_recipients
    ADD CONSTRAINT reminder_recipients_pkey PRIMARY KEY (id);


--
-- TOC entry 5749 (class 2606 OID 30402)
-- Name: reminder_recipients reminder_recipients_reminder_id_user_id_notification_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_recipients
    ADD CONSTRAINT reminder_recipients_reminder_id_user_id_notification_type_key UNIQUE (reminder_id, user_id, notification_type);


--
-- TOC entry 5743 (class 2606 OID 30381)
-- Name: reminders reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_pkey PRIMARY KEY (id);


--
-- TOC entry 5818 (class 2606 OID 30787)
-- Name: report_exports report_exports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_exports
    ADD CONSTRAINT report_exports_pkey PRIMARY KEY (id);


--
-- TOC entry 5822 (class 2606 OID 30807)
-- Name: report_recipients report_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_recipients
    ADD CONSTRAINT report_recipients_pkey PRIMARY KEY (id);


--
-- TOC entry 5824 (class 2606 OID 30809)
-- Name: report_recipients report_recipients_report_id_user_id_notification_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_recipients
    ADD CONSTRAINT report_recipients_report_id_user_id_notification_type_key UNIQUE (report_id, user_id, notification_type);


--
-- TOC entry 5829 (class 2606 OID 30831)
-- Name: report_schedules report_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_schedules
    ADD CONSTRAINT report_schedules_pkey PRIMARY KEY (id);


--
-- TOC entry 5811 (class 2606 OID 30770)
-- Name: report_templates report_templates_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_name_key UNIQUE (name);


--
-- TOC entry 5813 (class 2606 OID 30768)
-- Name: report_templates report_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5520 (class 2606 OID 29049)
-- Name: role_hierarchy role_hierarchy_parent_role_id_child_role_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_parent_role_id_child_role_id_key UNIQUE (parent_role_id, child_role_id);


--
-- TOC entry 5522 (class 2606 OID 29047)
-- Name: role_hierarchy role_hierarchy_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_pkey PRIMARY KEY (id);


--
-- TOC entry 5530 (class 2606 OID 29080)
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 5532 (class 2606 OID 29082)
-- Name: role_permissions role_permissions_role_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- TOC entry 5516 (class 2606 OID 29039)
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- TOC entry 5518 (class 2606 OID 29037)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5664 (class 2606 OID 29775)
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- TOC entry 5650 (class 2606 OID 29730)
-- Name: suppliers suppliers_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_name_key UNIQUE (name);


--
-- TOC entry 5652 (class 2606 OID 29728)
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- TOC entry 5678 (class 2606 OID 29844)
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 5680 (class 2606 OID 29846)
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- TOC entry 5634 (class 2606 OID 29573)
-- Name: ticket_attachments ticket_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_attachments
    ADD CONSTRAINT ticket_attachments_pkey PRIMARY KEY (id);


--
-- TOC entry 5630 (class 2606 OID 29553)
-- Name: ticket_comments ticket_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_comments
    ADD CONSTRAINT ticket_comments_pkey PRIMARY KEY (id);


--
-- TOC entry 5626 (class 2606 OID 29512)
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- TOC entry 5614 (class 2606 OID 29469)
-- Name: todos todos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_pkey PRIMARY KEY (id);


--
-- TOC entry 5704 (class 2606 OID 31038)
-- Name: network_sockets unique_outlet_number; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_sockets
    ADD CONSTRAINT unique_outlet_number UNIQUE (outlet_number);


--
-- TOC entry 5538 (class 2606 OID 29118)
-- Name: user_group_members user_group_members_group_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group_members
    ADD CONSTRAINT user_group_members_group_id_user_id_key UNIQUE (group_id, user_id);


--
-- TOC entry 5540 (class 2606 OID 29116)
-- Name: user_group_members user_group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group_members
    ADD CONSTRAINT user_group_members_pkey PRIMARY KEY (id);


--
-- TOC entry 5534 (class 2606 OID 29103)
-- Name: user_groups user_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_pkey PRIMARY KEY (id);


--
-- TOC entry 5514 (class 2606 OID 29020)
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 5511 (class 2606 OID 29000)
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 5900 (class 2606 OID 31264)
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- TOC entry 5504 (class 2606 OID 28987)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5506 (class 2606 OID 28983)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5508 (class 2606 OID 28985)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 5646 (class 2606 OID 29717)
-- Name: vendors vendors_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_name_key UNIQUE (name);


--
-- TOC entry 5648 (class 2606 OID 29715)
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- TOC entry 5883 (class 1259 OID 31211)
-- Name: audit_log_action_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_log_action_idx ON public.audit_log USING btree (action);


--
-- TOC entry 5884 (class 1259 OID 31212)
-- Name: audit_log_entity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_log_entity_idx ON public.audit_log USING btree (entity_type, entity_id);


--
-- TOC entry 5887 (class 1259 OID 31213)
-- Name: audit_log_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_log_timestamp_idx ON public.audit_log USING btree ("timestamp");


--
-- TOC entry 5888 (class 1259 OID 31210)
-- Name: audit_log_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_log_user_id_idx ON public.audit_log USING btree (user_id);


--
-- TOC entry 5889 (class 1259 OID 31230)
-- Name: auth_log_action_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX auth_log_action_idx ON public.auth_log USING btree (action);


--
-- TOC entry 5892 (class 1259 OID 31231)
-- Name: auth_log_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX auth_log_timestamp_idx ON public.auth_log USING btree ("timestamp");


--
-- TOC entry 5893 (class 1259 OID 31229)
-- Name: auth_log_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX auth_log_user_id_idx ON public.auth_log USING btree (user_id);


--
-- TOC entry 5578 (class 1259 OID 29404)
-- Name: idx_accessories_assigned_to_device_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_accessories_assigned_to_device_id ON public.accessories USING btree (assigned_to_device_id);


--
-- TOC entry 5579 (class 1259 OID 29405)
-- Name: idx_accessories_assigned_to_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_accessories_assigned_to_user_id ON public.accessories USING btree (assigned_to_user_id);


--
-- TOC entry 5580 (class 1259 OID 29406)
-- Name: idx_accessories_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_accessories_category_id ON public.accessories USING btree (category_id);


--
-- TOC entry 5581 (class 1259 OID 29403)
-- Name: idx_accessories_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_accessories_location ON public.accessories USING btree (location);


--
-- TOC entry 5582 (class 1259 OID 29399)
-- Name: idx_accessories_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_accessories_name ON public.accessories USING btree (name);


--
-- TOC entry 5583 (class 1259 OID 29401)
-- Name: idx_accessories_serial_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_accessories_serial_number ON public.accessories USING btree (serial_number);


--
-- TOC entry 5584 (class 1259 OID 29402)
-- Name: idx_accessories_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_accessories_status ON public.accessories USING btree (status);


--
-- TOC entry 5585 (class 1259 OID 29400)
-- Name: idx_accessories_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_accessories_type ON public.accessories USING btree (type);


--
-- TOC entry 5674 (class 1259 OID 29876)
-- Name: idx_asset_custom_field_values_asset_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_custom_field_values_asset_id ON public.asset_custom_field_values USING btree (asset_id, asset_type);


--
-- TOC entry 5675 (class 1259 OID 29877)
-- Name: idx_asset_custom_field_values_field_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_custom_field_values_field_id ON public.asset_custom_field_values USING btree (field_id);


--
-- TOC entry 5669 (class 1259 OID 29875)
-- Name: idx_asset_custom_fields_asset_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_asset_custom_fields_asset_type ON public.asset_custom_fields USING btree (asset_type);


--
-- TOC entry 5732 (class 1259 OID 30443)
-- Name: idx_calendar_events_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_calendar_events_category_id ON public.calendar_events USING btree (category_id);


--
-- TOC entry 5733 (class 1259 OID 30444)
-- Name: idx_calendar_events_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_calendar_events_created_by ON public.calendar_events USING btree (created_by);


--
-- TOC entry 5734 (class 1259 OID 30446)
-- Name: idx_calendar_events_end_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_calendar_events_end_date ON public.calendar_events USING btree (end_date);


--
-- TOC entry 5735 (class 1259 OID 30445)
-- Name: idx_calendar_events_start_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_calendar_events_start_date ON public.calendar_events USING btree (start_date);


--
-- TOC entry 5639 (class 1259 OID 29870)
-- Name: idx_categories_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id);


--
-- TOC entry 5640 (class 1259 OID 29869)
-- Name: idx_categories_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_type ON public.categories USING btree (type);


--
-- TOC entry 5568 (class 1259 OID 29398)
-- Name: idx_certificates_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_certificates_category_id ON public.certificates USING btree (category_id);


--
-- TOC entry 5569 (class 1259 OID 29395)
-- Name: idx_certificates_issuer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_certificates_issuer ON public.certificates USING btree (issuer);


--
-- TOC entry 5570 (class 1259 OID 29393)
-- Name: idx_certificates_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_certificates_name ON public.certificates USING btree (name);


--
-- TOC entry 5571 (class 1259 OID 29396)
-- Name: idx_certificates_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_certificates_status ON public.certificates USING btree (status);


--
-- TOC entry 5572 (class 1259 OID 29394)
-- Name: idx_certificates_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_certificates_type ON public.certificates USING btree (type);


--
-- TOC entry 5573 (class 1259 OID 29397)
-- Name: idx_certificates_valid_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_certificates_valid_to ON public.certificates USING btree (valid_to);


--
-- TOC entry 5547 (class 1259 OID 29383)
-- Name: idx_devices_assigned_to_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_devices_assigned_to_user_id ON public.devices USING btree (assigned_to_user_id);


--
-- TOC entry 5548 (class 1259 OID 29384)
-- Name: idx_devices_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_devices_category_id ON public.devices USING btree (category_id);


--
-- TOC entry 5549 (class 1259 OID 29382)
-- Name: idx_devices_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_devices_location ON public.devices USING btree (location);


--
-- TOC entry 5550 (class 1259 OID 29378)
-- Name: idx_devices_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_devices_name ON public.devices USING btree (name);


--
-- TOC entry 5551 (class 1259 OID 29385)
-- Name: idx_devices_room_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_devices_room_id ON public.devices USING btree (room_id);


--
-- TOC entry 5552 (class 1259 OID 29380)
-- Name: idx_devices_serial_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_devices_serial_number ON public.devices USING btree (serial_number);


--
-- TOC entry 5553 (class 1259 OID 29381)
-- Name: idx_devices_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_devices_status ON public.devices USING btree (status);


--
-- TOC entry 5554 (class 1259 OID 29379)
-- Name: idx_devices_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_devices_type ON public.devices USING btree (type);


--
-- TOC entry 5719 (class 1259 OID 30332)
-- Name: idx_document_attachments_asset_type_asset_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_attachments_asset_type_asset_id ON public.document_attachments USING btree (asset_type, asset_id);


--
-- TOC entry 5720 (class 1259 OID 30331)
-- Name: idx_document_attachments_document_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_attachments_document_id ON public.document_attachments USING btree (document_id);


--
-- TOC entry 5725 (class 1259 OID 30333)
-- Name: idx_document_versions_document_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_versions_document_id ON public.document_versions USING btree (document_id);


--
-- TOC entry 5713 (class 1259 OID 30329)
-- Name: idx_documents_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_category_id ON public.documents USING btree (category_id);


--
-- TOC entry 5714 (class 1259 OID 30330)
-- Name: idx_documents_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_created_by ON public.documents USING btree (created_by);


--
-- TOC entry 5850 (class 1259 OID 30994)
-- Name: idx_integration_configs_last_sync_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_integration_configs_last_sync_at ON public.integration_configs USING btree (last_sync_at);


--
-- TOC entry 5851 (class 1259 OID 30995)
-- Name: idx_integration_configs_next_sync_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_integration_configs_next_sync_at ON public.integration_configs USING btree (next_sync_at);


--
-- TOC entry 5852 (class 1259 OID 30993)
-- Name: idx_integration_configs_system_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_integration_configs_system_type ON public.integration_configs USING btree (system_type);


--
-- TOC entry 5857 (class 1259 OID 30996)
-- Name: idx_integration_mappings_config_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_integration_mappings_config_id ON public.integration_mappings USING btree (config_id);


--
-- TOC entry 5858 (class 1259 OID 30997)
-- Name: idx_integration_mappings_source_type_source_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_integration_mappings_source_type_source_id ON public.integration_mappings USING btree (source_type, source_id);


--
-- TOC entry 5859 (class 1259 OID 30998)
-- Name: idx_integration_mappings_target_type_target_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_integration_mappings_target_type_target_id ON public.integration_mappings USING btree (target_type, target_id);


--
-- TOC entry 5864 (class 1259 OID 30999)
-- Name: idx_integration_sync_logs_config_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_integration_sync_logs_config_id ON public.integration_sync_logs USING btree (config_id);


--
-- TOC entry 5865 (class 1259 OID 31002)
-- Name: idx_integration_sync_logs_started_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_integration_sync_logs_started_at ON public.integration_sync_logs USING btree (started_at);


--
-- TOC entry 5866 (class 1259 OID 31001)
-- Name: idx_integration_sync_logs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_integration_sync_logs_status ON public.integration_sync_logs USING btree (status);


--
-- TOC entry 5867 (class 1259 OID 31000)
-- Name: idx_integration_sync_logs_sync_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_integration_sync_logs_sync_type ON public.integration_sync_logs USING btree (sync_type);


--
-- TOC entry 5595 (class 1259 OID 29598)
-- Name: idx_inventory_checks_accessory; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_checks_accessory ON public.inventory_checks USING btree (accessory_id);


--
-- TOC entry 5596 (class 1259 OID 29601)
-- Name: idx_inventory_checks_checked_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_checks_checked_by ON public.inventory_checks USING btree (checked_by_user_id);


--
-- TOC entry 5597 (class 1259 OID 29602)
-- Name: idx_inventory_checks_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_checks_date ON public.inventory_checks USING btree (check_date);


--
-- TOC entry 5598 (class 1259 OID 29597)
-- Name: idx_inventory_checks_device; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_checks_device ON public.inventory_checks USING btree (device_id);


--
-- TOC entry 5599 (class 1259 OID 29600)
-- Name: idx_inventory_checks_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_checks_location ON public.inventory_checks USING btree (location);


--
-- TOC entry 5600 (class 1259 OID 29596)
-- Name: idx_inventory_checks_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_checks_session ON public.inventory_checks USING btree (session_id);


--
-- TOC entry 5601 (class 1259 OID 29599)
-- Name: idx_inventory_checks_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_checks_status ON public.inventory_checks USING btree (status);


--
-- TOC entry 5590 (class 1259 OID 29595)
-- Name: idx_inventory_sessions_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_sessions_created_by ON public.inventory_sessions USING btree (created_by_user_id);


--
-- TOC entry 5591 (class 1259 OID 29594)
-- Name: idx_inventory_sessions_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_sessions_dates ON public.inventory_sessions USING btree (start_date, end_date);


--
-- TOC entry 5592 (class 1259 OID 29593)
-- Name: idx_inventory_sessions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_sessions_status ON public.inventory_sessions USING btree (status);


--
-- TOC entry 5874 (class 1259 OID 31136)
-- Name: idx_label_settings_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_label_settings_user_id ON public.label_settings USING btree (user_id);


--
-- TOC entry 5901 (class 1259 OID 31316)
-- Name: idx_license_types_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_license_types_name ON public.license_types USING btree (name);


--
-- TOC entry 5555 (class 1259 OID 29392)
-- Name: idx_licenses_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_licenses_category_id ON public.licenses USING btree (category_id);


--
-- TOC entry 5556 (class 1259 OID 29391)
-- Name: idx_licenses_expiry_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_licenses_expiry_date ON public.licenses USING btree (expiry_date);


--
-- TOC entry 5557 (class 1259 OID 29388)
-- Name: idx_licenses_key_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_licenses_key_code ON public.licenses USING btree (key_code);


--
-- TOC entry 5558 (class 1259 OID 29386)
-- Name: idx_licenses_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_licenses_name ON public.licenses USING btree (name);


--
-- TOC entry 5559 (class 1259 OID 29390)
-- Name: idx_licenses_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_licenses_status ON public.licenses USING btree (status);


--
-- TOC entry 5560 (class 1259 OID 29387)
-- Name: idx_licenses_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_licenses_type ON public.licenses USING btree (type);


--
-- TOC entry 5561 (class 1259 OID 29389)
-- Name: idx_licenses_vendor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_licenses_vendor ON public.licenses USING btree (vendor);


--
-- TOC entry 5653 (class 1259 OID 29871)
-- Name: idx_locations_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_locations_city ON public.locations USING btree (city);


--
-- TOC entry 5830 (class 1259 OID 30922)
-- Name: idx_mobile_devices_device_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mobile_devices_device_type ON public.mobile_devices USING btree (device_type);


--
-- TOC entry 5831 (class 1259 OID 30923)
-- Name: idx_mobile_devices_last_sync_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mobile_devices_last_sync_at ON public.mobile_devices USING btree (last_sync_at);


--
-- TOC entry 5832 (class 1259 OID 30921)
-- Name: idx_mobile_devices_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mobile_devices_user_id ON public.mobile_devices USING btree (user_id);


--
-- TOC entry 5837 (class 1259 OID 30925)
-- Name: idx_mobile_offline_data_data_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mobile_offline_data_data_type ON public.mobile_offline_data USING btree (data_type);


--
-- TOC entry 5838 (class 1259 OID 30924)
-- Name: idx_mobile_offline_data_device_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mobile_offline_data_device_id ON public.mobile_offline_data USING btree (device_id);


--
-- TOC entry 5839 (class 1259 OID 30926)
-- Name: idx_mobile_offline_data_sync_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mobile_offline_data_sync_status ON public.mobile_offline_data USING btree (sync_status);


--
-- TOC entry 5844 (class 1259 OID 30927)
-- Name: idx_mobile_sync_logs_device_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mobile_sync_logs_device_id ON public.mobile_sync_logs USING btree (device_id);


--
-- TOC entry 5845 (class 1259 OID 30930)
-- Name: idx_mobile_sync_logs_started_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mobile_sync_logs_started_at ON public.mobile_sync_logs USING btree (started_at);


--
-- TOC entry 5846 (class 1259 OID 30929)
-- Name: idx_mobile_sync_logs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mobile_sync_logs_status ON public.mobile_sync_logs USING btree (status);


--
-- TOC entry 5847 (class 1259 OID 30928)
-- Name: idx_mobile_sync_logs_sync_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mobile_sync_logs_sync_type ON public.mobile_sync_logs USING btree (sync_type);


--
-- TOC entry 5681 (class 1259 OID 30218)
-- Name: idx_network_cabinets_location_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_network_cabinets_location_id ON public.network_cabinets USING btree (location_id);


--
-- TOC entry 5682 (class 1259 OID 30219)
-- Name: idx_network_cabinets_room_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_network_cabinets_room_id ON public.network_cabinets USING btree (room_id);


--
-- TOC entry 5697 (class 1259 OID 31034)
-- Name: idx_network_sockets_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_network_sockets_location ON public.network_sockets USING btree (location_id);


--
-- TOC entry 5698 (class 1259 OID 31036)
-- Name: idx_network_sockets_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_network_sockets_number ON public.network_sockets USING btree (outlet_number);


--
-- TOC entry 5699 (class 1259 OID 31035)
-- Name: idx_network_sockets_room; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_network_sockets_room ON public.network_sockets USING btree (room_id);


--
-- TOC entry 5700 (class 1259 OID 30241)
-- Name: idx_network_sockets_room_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_network_sockets_room_id ON public.network_sockets USING btree (room_id);


--
-- TOC entry 5691 (class 1259 OID 30237)
-- Name: idx_network_switches_location_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_network_switches_location_id ON public.network_switches USING btree (location_id);


--
-- TOC entry 5692 (class 1259 OID 30238)
-- Name: idx_network_switches_room_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_network_switches_room_id ON public.network_switches USING btree (room_id);


--
-- TOC entry 5805 (class 1259 OID 30755)
-- Name: idx_onboarding_checklist_items_checklist_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_onboarding_checklist_items_checklist_id ON public.onboarding_checklist_items USING btree (checklist_id);


--
-- TOC entry 5806 (class 1259 OID 30756)
-- Name: idx_onboarding_checklist_items_order_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_onboarding_checklist_items_order_index ON public.onboarding_checklist_items USING btree (order_index);


--
-- TOC entry 5799 (class 1259 OID 30753)
-- Name: idx_onboarding_checklists_template_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_onboarding_checklists_template_id ON public.onboarding_checklists USING btree (template_id);


--
-- TOC entry 5800 (class 1259 OID 30754)
-- Name: idx_onboarding_checklists_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_onboarding_checklists_type ON public.onboarding_checklists USING btree (type);


--
-- TOC entry 5795 (class 1259 OID 30752)
-- Name: idx_onboarding_protocol_items_item_type_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_onboarding_protocol_items_item_type_item_id ON public.onboarding_protocol_items USING btree (item_type, item_id);


--
-- TOC entry 5796 (class 1259 OID 30751)
-- Name: idx_onboarding_protocol_items_protocol_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_onboarding_protocol_items_protocol_id ON public.onboarding_protocol_items USING btree (protocol_id);


--
-- TOC entry 5788 (class 1259 OID 30749)
-- Name: idx_onboarding_protocols_initiator_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_onboarding_protocols_initiator_id ON public.onboarding_protocols USING btree (initiator_id);


--
-- TOC entry 5789 (class 1259 OID 30750)
-- Name: idx_onboarding_protocols_recipient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_onboarding_protocols_recipient_id ON public.onboarding_protocols USING btree (recipient_id);


--
-- TOC entry 5790 (class 1259 OID 30748)
-- Name: idx_onboarding_protocols_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_onboarding_protocols_status ON public.onboarding_protocols USING btree (status);


--
-- TOC entry 5791 (class 1259 OID 30746)
-- Name: idx_onboarding_protocols_template_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_onboarding_protocols_template_id ON public.onboarding_protocols USING btree (template_id);


--
-- TOC entry 5792 (class 1259 OID 30747)
-- Name: idx_onboarding_protocols_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_onboarding_protocols_type ON public.onboarding_protocols USING btree (type);


--
-- TOC entry 5783 (class 1259 OID 30745)
-- Name: idx_onboarding_templates_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_onboarding_templates_type ON public.onboarding_templates USING btree (type);


--
-- TOC entry 5755 (class 1259 OID 30610)
-- Name: idx_portal_categories_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_portal_categories_parent_id ON public.portal_categories USING btree (parent_id);


--
-- TOC entry 5766 (class 1259 OID 30616)
-- Name: idx_portal_request_items_item_type_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_portal_request_items_item_type_item_id ON public.portal_request_items USING btree (item_type, item_id);


--
-- TOC entry 5767 (class 1259 OID 30615)
-- Name: idx_portal_request_items_request_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_portal_request_items_request_id ON public.portal_request_items USING btree (request_id);


--
-- TOC entry 5760 (class 1259 OID 30614)
-- Name: idx_portal_requests_approved_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_portal_requests_approved_by ON public.portal_requests USING btree (approved_by);


--
-- TOC entry 5761 (class 1259 OID 30611)
-- Name: idx_portal_requests_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_portal_requests_category_id ON public.portal_requests USING btree (category_id);


--
-- TOC entry 5762 (class 1259 OID 30613)
-- Name: idx_portal_requests_requested_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_portal_requests_requested_by ON public.portal_requests USING btree (requested_by);


--
-- TOC entry 5763 (class 1259 OID 30612)
-- Name: idx_portal_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_portal_requests_status ON public.portal_requests USING btree (status);


--
-- TOC entry 5776 (class 1259 OID 30621)
-- Name: idx_portal_ticket_attachments_ticket_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_portal_ticket_attachments_ticket_id ON public.portal_ticket_attachments USING btree (ticket_id);


--
-- TOC entry 5779 (class 1259 OID 30623)
-- Name: idx_portal_ticket_comments_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_portal_ticket_comments_created_by ON public.portal_ticket_comments USING btree (created_by);


--
-- TOC entry 5780 (class 1259 OID 30622)
-- Name: idx_portal_ticket_comments_ticket_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_portal_ticket_comments_ticket_id ON public.portal_ticket_comments USING btree (ticket_id);


--
-- TOC entry 5770 (class 1259 OID 30620)
-- Name: idx_portal_tickets_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_portal_tickets_assigned_to ON public.portal_tickets USING btree (assigned_to);


--
-- TOC entry 5771 (class 1259 OID 30617)
-- Name: idx_portal_tickets_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_portal_tickets_category_id ON public.portal_tickets USING btree (category_id);


--
-- TOC entry 5772 (class 1259 OID 30619)
-- Name: idx_portal_tickets_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_portal_tickets_created_by ON public.portal_tickets USING btree (created_by);


--
-- TOC entry 5773 (class 1259 OID 30618)
-- Name: idx_portal_tickets_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_portal_tickets_status ON public.portal_tickets USING btree (status);


--
-- TOC entry 5750 (class 1259 OID 30456)
-- Name: idx_reminder_notifications_recipient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reminder_notifications_recipient_id ON public.reminder_notifications USING btree (recipient_id);


--
-- TOC entry 5751 (class 1259 OID 30455)
-- Name: idx_reminder_notifications_reminder_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reminder_notifications_reminder_id ON public.reminder_notifications USING btree (reminder_id);


--
-- TOC entry 5752 (class 1259 OID 30457)
-- Name: idx_reminder_notifications_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reminder_notifications_status ON public.reminder_notifications USING btree (status);


--
-- TOC entry 5744 (class 1259 OID 30453)
-- Name: idx_reminder_recipients_reminder_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reminder_recipients_reminder_id ON public.reminder_recipients USING btree (reminder_id);


--
-- TOC entry 5745 (class 1259 OID 30454)
-- Name: idx_reminder_recipients_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reminder_recipients_user_id ON public.reminder_recipients USING btree (user_id);


--
-- TOC entry 5736 (class 1259 OID 30452)
-- Name: idx_reminders_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reminders_assigned_to ON public.reminders USING btree (assigned_to);


--
-- TOC entry 5737 (class 1259 OID 30451)
-- Name: idx_reminders_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reminders_created_by ON public.reminders USING btree (created_by);


--
-- TOC entry 5738 (class 1259 OID 30447)
-- Name: idx_reminders_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reminders_due_date ON public.reminders USING btree (due_date);


--
-- TOC entry 5739 (class 1259 OID 30450)
-- Name: idx_reminders_reference_type_reference_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reminders_reference_type_reference_id ON public.reminders USING btree (reference_type, reference_id);


--
-- TOC entry 5740 (class 1259 OID 30449)
-- Name: idx_reminders_reminder_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reminders_reminder_type ON public.reminders USING btree (reminder_type);


--
-- TOC entry 5741 (class 1259 OID 30448)
-- Name: idx_reminders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reminders_status ON public.reminders USING btree (status);


--
-- TOC entry 5814 (class 1259 OID 30853)
-- Name: idx_report_exports_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_exports_created_by ON public.report_exports USING btree (created_by);


--
-- TOC entry 5815 (class 1259 OID 30852)
-- Name: idx_report_exports_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_exports_status ON public.report_exports USING btree (status);


--
-- TOC entry 5816 (class 1259 OID 30851)
-- Name: idx_report_exports_template_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_exports_template_id ON public.report_exports USING btree (template_id);


--
-- TOC entry 5819 (class 1259 OID 30854)
-- Name: idx_report_recipients_report_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_recipients_report_id ON public.report_recipients USING btree (report_id);


--
-- TOC entry 5820 (class 1259 OID 30855)
-- Name: idx_report_recipients_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_recipients_user_id ON public.report_recipients USING btree (user_id);


--
-- TOC entry 5825 (class 1259 OID 30858)
-- Name: idx_report_schedules_next_run_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_schedules_next_run_at ON public.report_schedules USING btree (next_run_at);


--
-- TOC entry 5826 (class 1259 OID 30856)
-- Name: idx_report_schedules_report_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_schedules_report_id ON public.report_schedules USING btree (report_id);


--
-- TOC entry 5827 (class 1259 OID 30857)
-- Name: idx_report_schedules_schedule_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_schedules_schedule_type ON public.report_schedules USING btree (schedule_type);


--
-- TOC entry 5809 (class 1259 OID 30850)
-- Name: idx_report_templates_format; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_templates_format ON public.report_templates USING btree (format);


--
-- TOC entry 5527 (class 1259 OID 29149)
-- Name: idx_role_permissions_permission_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions USING btree (permission_id);


--
-- TOC entry 5528 (class 1259 OID 29148)
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_role_permissions_role_id ON public.role_permissions USING btree (role_id);


--
-- TOC entry 5662 (class 1259 OID 31047)
-- Name: idx_rooms_location_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rooms_location_id ON public.rooms USING btree (location_id);


--
-- TOC entry 5676 (class 1259 OID 29878)
-- Name: idx_system_settings_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_settings_key ON public.system_settings USING btree (setting_key);


--
-- TOC entry 5631 (class 1259 OID 29624)
-- Name: idx_ticket_attachments_ticket; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ticket_attachments_ticket ON public.ticket_attachments USING btree (ticket_id);


--
-- TOC entry 5632 (class 1259 OID 29625)
-- Name: idx_ticket_attachments_uploaded_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ticket_attachments_uploaded_by ON public.ticket_attachments USING btree (uploaded_by_user_id);


--
-- TOC entry 5627 (class 1259 OID 29622)
-- Name: idx_ticket_comments_ticket; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ticket_comments_ticket ON public.ticket_comments USING btree (ticket_id);


--
-- TOC entry 5628 (class 1259 OID 29623)
-- Name: idx_ticket_comments_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ticket_comments_user ON public.ticket_comments USING btree (user_id);


--
-- TOC entry 5615 (class 1259 OID 29616)
-- Name: idx_tickets_accessory; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_accessory ON public.tickets USING btree (accessory_id);


--
-- TOC entry 5616 (class 1259 OID 29619)
-- Name: idx_tickets_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_assigned_to ON public.tickets USING btree (assigned_to_user_id);


--
-- TOC entry 5617 (class 1259 OID 29618)
-- Name: idx_tickets_certificate; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_certificate ON public.tickets USING btree (certificate_id);


--
-- TOC entry 5618 (class 1259 OID 29620)
-- Name: idx_tickets_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_created_by ON public.tickets USING btree (created_by_user_id);


--
-- TOC entry 5619 (class 1259 OID 29615)
-- Name: idx_tickets_device; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_device ON public.tickets USING btree (device_id);


--
-- TOC entry 5620 (class 1259 OID 29621)
-- Name: idx_tickets_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_due_date ON public.tickets USING btree (due_date);


--
-- TOC entry 5621 (class 1259 OID 29617)
-- Name: idx_tickets_license; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_license ON public.tickets USING btree (license_id);


--
-- TOC entry 5622 (class 1259 OID 29613)
-- Name: idx_tickets_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_priority ON public.tickets USING btree (priority);


--
-- TOC entry 5623 (class 1259 OID 29612)
-- Name: idx_tickets_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_status ON public.tickets USING btree (status);


--
-- TOC entry 5624 (class 1259 OID 29614)
-- Name: idx_tickets_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tickets_type ON public.tickets USING btree (type);


--
-- TOC entry 5604 (class 1259 OID 29608)
-- Name: idx_todos_accessory; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_todos_accessory ON public.todos USING btree (accessory_id);


--
-- TOC entry 5605 (class 1259 OID 29606)
-- Name: idx_todos_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_todos_assigned_to ON public.todos USING btree (assigned_to_user_id);


--
-- TOC entry 5606 (class 1259 OID 29610)
-- Name: idx_todos_certificate; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_todos_certificate ON public.todos USING btree (certificate_id);


--
-- TOC entry 5607 (class 1259 OID 29611)
-- Name: idx_todos_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_todos_created_by ON public.todos USING btree (created_by_user_id);


--
-- TOC entry 5608 (class 1259 OID 29607)
-- Name: idx_todos_device; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_todos_device ON public.todos USING btree (device_id);


--
-- TOC entry 5609 (class 1259 OID 29605)
-- Name: idx_todos_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_todos_due_date ON public.todos USING btree (due_date);


--
-- TOC entry 5610 (class 1259 OID 29609)
-- Name: idx_todos_license; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_todos_license ON public.todos USING btree (license_id);


--
-- TOC entry 5611 (class 1259 OID 29604)
-- Name: idx_todos_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_todos_priority ON public.todos USING btree (priority);


--
-- TOC entry 5612 (class 1259 OID 29603)
-- Name: idx_todos_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_todos_status ON public.todos USING btree (status);


--
-- TOC entry 5535 (class 1259 OID 29150)
-- Name: idx_user_group_members_group_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_group_members_group_id ON public.user_group_members USING btree (group_id);


--
-- TOC entry 5536 (class 1259 OID 29151)
-- Name: idx_user_group_members_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_group_members_user_id ON public.user_group_members USING btree (user_id);


--
-- TOC entry 5512 (class 1259 OID 29147)
-- Name: idx_user_preferences_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_preferences_user_id ON public.user_preferences USING btree (user_id);


--
-- TOC entry 5509 (class 1259 OID 29146)
-- Name: idx_user_profiles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_profiles_user_id ON public.user_profiles USING btree (user_id);


--
-- TOC entry 5897 (class 1259 OID 31276)
-- Name: idx_user_roles_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_role_id ON public.user_roles USING btree (role_id);


--
-- TOC entry 5898 (class 1259 OID 31275)
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- TOC entry 5498 (class 1259 OID 29144)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 5499 (class 1259 OID 31017)
-- Name: idx_users_location_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_location_id ON public.users USING btree (location_id);


--
-- TOC entry 5500 (class 1259 OID 29145)
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- TOC entry 5501 (class 1259 OID 31018)
-- Name: idx_users_room_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_room_id ON public.users USING btree (room_id);


--
-- TOC entry 5502 (class 1259 OID 29143)
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- TOC entry 5896 (class 1259 OID 31252)
-- Name: password_change_log_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX password_change_log_user_id_idx ON public.password_change_log USING btree (user_id);


--
-- TOC entry 6287 (class 2618 OID 31101)
-- Name: device_models_with_count _RETURN; Type: RULE; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW public.device_models_with_count AS
 SELECT dm.id,
    dm.name,
    dm.description,
    dm.manufacturer_id,
    m.name AS manufacturer_name,
    dm.category_id,
    c.name AS category_name,
    dm.specifications,
    dm.cpu,
    dm.ram,
    dm.hdd,
    dm.warranty_months,
    dm.is_active,
    dm.created_at,
    dm.updated_at,
    count(d.id) AS device_count
   FROM (((public.device_models dm
     LEFT JOIN public.manufacturers m ON ((dm.manufacturer_id = m.id)))
     LEFT JOIN public.categories c ON ((dm.category_id = c.id)))
     LEFT JOIN public.devices d ON ((dm.id = d.model)))
  GROUP BY dm.id, m.name, c.name;


--
-- TOC entry 6036 (class 2620 OID 29373)
-- Name: accessories accessories_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER accessories_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.accessories FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6063 (class 2620 OID 29867)
-- Name: asset_custom_field_values asset_custom_field_values_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER asset_custom_field_values_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.asset_custom_field_values FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6061 (class 2620 OID 29866)
-- Name: asset_custom_fields asset_custom_fields_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER asset_custom_fields_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.asset_custom_fields FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6084 (class 2620 OID 30438)
-- Name: calendar_categories calendar_categories_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER calendar_categories_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.calendar_categories FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6086 (class 2620 OID 30439)
-- Name: calendar_events calendar_events_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER calendar_events_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6047 (class 2620 OID 29858)
-- Name: categories categories_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER categories_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6034 (class 2620 OID 29372)
-- Name: certificates certificates_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER certificates_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.certificates FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6057 (class 2620 OID 29863)
-- Name: departments departments_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER departments_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6030 (class 2620 OID 29370)
-- Name: devices devices_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER devices_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6081 (class 2620 OID 30327)
-- Name: document_attachments document_attachments_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER document_attachments_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.document_attachments FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6077 (class 2620 OID 30325)
-- Name: document_categories document_categories_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER document_categories_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.document_categories FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6083 (class 2620 OID 30328)
-- Name: document_versions document_versions_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER document_versions_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.document_versions FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6079 (class 2620 OID 30326)
-- Name: documents documents_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER documents_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6129 (class 2620 OID 30990)
-- Name: integration_configs integration_configs_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER integration_configs_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.integration_configs FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6131 (class 2620 OID 30991)
-- Name: integration_mappings integration_mappings_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER integration_mappings_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.integration_mappings FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6133 (class 2620 OID 30992)
-- Name: integration_sync_logs integration_sync_logs_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER integration_sync_logs_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.integration_sync_logs FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6040 (class 2620 OID 29590)
-- Name: inventory_checks inventory_checks_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER inventory_checks_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.inventory_checks FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6038 (class 2620 OID 29589)
-- Name: inventory_sessions inventory_sessions_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER inventory_sessions_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.inventory_sessions FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6135 (class 2620 OID 31135)
-- Name: label_settings label_settings_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER label_settings_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.label_settings FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6032 (class 2620 OID 29371)
-- Name: licenses licenses_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER licenses_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.licenses FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6055 (class 2620 OID 29862)
-- Name: locations locations_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER locations_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6049 (class 2620 OID 29859)
-- Name: manufacturers manufacturers_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER manufacturers_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.manufacturers FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6123 (class 2620 OID 30918)
-- Name: mobile_devices mobile_devices_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER mobile_devices_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.mobile_devices FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6125 (class 2620 OID 30919)
-- Name: mobile_offline_data mobile_offline_data_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER mobile_offline_data_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.mobile_offline_data FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6127 (class 2620 OID 30920)
-- Name: mobile_sync_logs mobile_sync_logs_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER mobile_sync_logs_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.mobile_sync_logs FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6067 (class 2620 OID 30205)
-- Name: network_cabinets network_cabinets_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER network_cabinets_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.network_cabinets FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6075 (class 2620 OID 30217)
-- Name: network_ports network_ports_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER network_ports_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.network_ports FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6073 (class 2620 OID 30216)
-- Name: network_sockets network_sockets_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER network_sockets_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.network_sockets FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6071 (class 2620 OID 30215)
-- Name: network_switches network_switches_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER network_switches_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.network_switches FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6069 (class 2620 OID 30214)
-- Name: network_vlans network_vlans_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER network_vlans_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.network_vlans FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6113 (class 2620 OID 30744)
-- Name: onboarding_checklist_items onboarding_checklist_items_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER onboarding_checklist_items_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.onboarding_checklist_items FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6111 (class 2620 OID 30743)
-- Name: onboarding_checklists onboarding_checklists_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER onboarding_checklists_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.onboarding_checklists FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6109 (class 2620 OID 30742)
-- Name: onboarding_protocol_items onboarding_protocol_items_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER onboarding_protocol_items_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.onboarding_protocol_items FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6107 (class 2620 OID 30741)
-- Name: onboarding_protocols onboarding_protocols_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER onboarding_protocols_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.onboarding_protocols FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6105 (class 2620 OID 30740)
-- Name: onboarding_templates onboarding_templates_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER onboarding_templates_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.onboarding_templates FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6026 (class 2620 OID 29142)
-- Name: permissions permissions_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER permissions_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6093 (class 2620 OID 30604)
-- Name: portal_categories portal_categories_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER portal_categories_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.portal_categories FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6097 (class 2620 OID 30606)
-- Name: portal_request_items portal_request_items_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER portal_request_items_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.portal_request_items FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6095 (class 2620 OID 30605)
-- Name: portal_requests portal_requests_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER portal_requests_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.portal_requests FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6101 (class 2620 OID 30608)
-- Name: portal_ticket_attachments portal_ticket_attachments_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER portal_ticket_attachments_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.portal_ticket_attachments FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6103 (class 2620 OID 30609)
-- Name: portal_ticket_comments portal_ticket_comments_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER portal_ticket_comments_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.portal_ticket_comments FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6099 (class 2620 OID 30607)
-- Name: portal_tickets portal_tickets_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER portal_tickets_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.portal_tickets FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6091 (class 2620 OID 30442)
-- Name: reminder_notifications reminder_notifications_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER reminder_notifications_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.reminder_notifications FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6090 (class 2620 OID 30441)
-- Name: reminder_recipients reminder_recipients_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER reminder_recipients_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.reminder_recipients FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6088 (class 2620 OID 30440)
-- Name: reminders reminders_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER reminders_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6117 (class 2620 OID 30847)
-- Name: report_exports report_exports_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER report_exports_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.report_exports FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6119 (class 2620 OID 30848)
-- Name: report_recipients report_recipients_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER report_recipients_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.report_recipients FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6121 (class 2620 OID 30849)
-- Name: report_schedules report_schedules_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER report_schedules_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.report_schedules FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6115 (class 2620 OID 30846)
-- Name: report_templates report_templates_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER report_templates_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.report_templates FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6024 (class 2620 OID 29141)
-- Name: roles roles_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER roles_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6059 (class 2620 OID 29864)
-- Name: rooms rooms_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER rooms_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6053 (class 2620 OID 29861)
-- Name: suppliers suppliers_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER suppliers_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6065 (class 2620 OID 29868)
-- Name: system_settings system_settings_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER system_settings_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6044 (class 2620 OID 29592)
-- Name: tickets tickets_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tickets_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6042 (class 2620 OID 29591)
-- Name: todos todos_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER todos_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.todos FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 6037 (class 2620 OID 29369)
-- Name: accessories update_accessories_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_accessories_timestamp BEFORE UPDATE ON public.accessories FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6064 (class 2620 OID 29856)
-- Name: asset_custom_field_values update_asset_custom_field_values_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_asset_custom_field_values_timestamp BEFORE UPDATE ON public.asset_custom_field_values FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6062 (class 2620 OID 29855)
-- Name: asset_custom_fields update_asset_custom_fields_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_asset_custom_fields_timestamp BEFORE UPDATE ON public.asset_custom_fields FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6137 (class 2620 OID 31170)
-- Name: assets update_assets_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_assets_timestamp BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6085 (class 2620 OID 30434)
-- Name: calendar_categories update_calendar_categories_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_calendar_categories_timestamp BEFORE UPDATE ON public.calendar_categories FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6087 (class 2620 OID 30435)
-- Name: calendar_events update_calendar_events_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_calendar_events_timestamp BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6048 (class 2620 OID 29847)
-- Name: categories update_categories_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_categories_timestamp BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6035 (class 2620 OID 29368)
-- Name: certificates update_certificates_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_certificates_timestamp BEFORE UPDATE ON public.certificates FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6058 (class 2620 OID 31167)
-- Name: departments update_departments_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_departments_timestamp BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6031 (class 2620 OID 29366)
-- Name: devices update_devices_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_devices_timestamp BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6082 (class 2620 OID 30324)
-- Name: document_attachments update_document_attachments_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_document_attachments_timestamp BEFORE UPDATE ON public.document_attachments FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6078 (class 2620 OID 30322)
-- Name: document_categories update_document_categories_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_document_categories_timestamp BEFORE UPDATE ON public.document_categories FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6080 (class 2620 OID 30323)
-- Name: documents update_documents_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_documents_timestamp BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6130 (class 2620 OID 30987)
-- Name: integration_configs update_integration_configs_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_integration_configs_timestamp BEFORE UPDATE ON public.integration_configs FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6132 (class 2620 OID 30988)
-- Name: integration_mappings update_integration_mappings_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_integration_mappings_timestamp BEFORE UPDATE ON public.integration_mappings FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6134 (class 2620 OID 30989)
-- Name: integration_sync_logs update_integration_sync_logs_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_integration_sync_logs_timestamp BEFORE UPDATE ON public.integration_sync_logs FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6041 (class 2620 OID 29585)
-- Name: inventory_checks update_inventory_checks_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_inventory_checks_timestamp BEFORE UPDATE ON public.inventory_checks FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6039 (class 2620 OID 29584)
-- Name: inventory_sessions update_inventory_sessions_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_inventory_sessions_timestamp BEFORE UPDATE ON public.inventory_sessions FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6136 (class 2620 OID 31134)
-- Name: label_settings update_label_settings_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_label_settings_timestamp BEFORE UPDATE ON public.label_settings FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6139 (class 2620 OID 31315)
-- Name: license_types update_license_types_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_license_types_updated_at BEFORE UPDATE ON public.license_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 6033 (class 2620 OID 29367)
-- Name: licenses update_licenses_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_licenses_timestamp BEFORE UPDATE ON public.licenses FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6056 (class 2620 OID 31168)
-- Name: locations update_locations_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_locations_timestamp BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6050 (class 2620 OID 29848)
-- Name: manufacturers update_manufacturers_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_manufacturers_timestamp BEFORE UPDATE ON public.manufacturers FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6124 (class 2620 OID 30915)
-- Name: mobile_devices update_mobile_devices_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_mobile_devices_timestamp BEFORE UPDATE ON public.mobile_devices FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6126 (class 2620 OID 30916)
-- Name: mobile_offline_data update_mobile_offline_data_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_mobile_offline_data_timestamp BEFORE UPDATE ON public.mobile_offline_data FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6128 (class 2620 OID 30917)
-- Name: mobile_sync_logs update_mobile_sync_logs_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_mobile_sync_logs_timestamp BEFORE UPDATE ON public.mobile_sync_logs FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6068 (class 2620 OID 30192)
-- Name: network_cabinets update_network_cabinets_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_network_cabinets_timestamp BEFORE UPDATE ON public.network_cabinets FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6076 (class 2620 OID 30204)
-- Name: network_ports update_network_ports_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_network_ports_timestamp BEFORE UPDATE ON public.network_ports FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6074 (class 2620 OID 30203)
-- Name: network_sockets update_network_sockets_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_network_sockets_timestamp BEFORE UPDATE ON public.network_sockets FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6072 (class 2620 OID 30202)
-- Name: network_switches update_network_switches_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_network_switches_timestamp BEFORE UPDATE ON public.network_switches FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6070 (class 2620 OID 30201)
-- Name: network_vlans update_network_vlans_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_network_vlans_timestamp BEFORE UPDATE ON public.network_vlans FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6114 (class 2620 OID 30739)
-- Name: onboarding_checklist_items update_onboarding_checklist_items_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_onboarding_checklist_items_timestamp BEFORE UPDATE ON public.onboarding_checklist_items FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6112 (class 2620 OID 30738)
-- Name: onboarding_checklists update_onboarding_checklists_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_onboarding_checklists_timestamp BEFORE UPDATE ON public.onboarding_checklists FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6110 (class 2620 OID 30737)
-- Name: onboarding_protocol_items update_onboarding_protocol_items_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_onboarding_protocol_items_timestamp BEFORE UPDATE ON public.onboarding_protocol_items FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6108 (class 2620 OID 30736)
-- Name: onboarding_protocols update_onboarding_protocols_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_onboarding_protocols_timestamp BEFORE UPDATE ON public.onboarding_protocols FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6106 (class 2620 OID 30735)
-- Name: onboarding_templates update_onboarding_templates_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_onboarding_templates_timestamp BEFORE UPDATE ON public.onboarding_templates FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6138 (class 2620 OID 31194)
-- Name: password_policies update_password_policies_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_password_policies_timestamp BEFORE UPDATE ON public.password_policies FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6027 (class 2620 OID 29138)
-- Name: permissions update_permissions_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_permissions_timestamp BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6094 (class 2620 OID 30598)
-- Name: portal_categories update_portal_categories_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_portal_categories_timestamp BEFORE UPDATE ON public.portal_categories FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6098 (class 2620 OID 30600)
-- Name: portal_request_items update_portal_request_items_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_portal_request_items_timestamp BEFORE UPDATE ON public.portal_request_items FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6096 (class 2620 OID 30599)
-- Name: portal_requests update_portal_requests_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_portal_requests_timestamp BEFORE UPDATE ON public.portal_requests FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6102 (class 2620 OID 30602)
-- Name: portal_ticket_attachments update_portal_ticket_attachments_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_portal_ticket_attachments_timestamp BEFORE UPDATE ON public.portal_ticket_attachments FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6104 (class 2620 OID 30603)
-- Name: portal_ticket_comments update_portal_ticket_comments_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_portal_ticket_comments_timestamp BEFORE UPDATE ON public.portal_ticket_comments FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6100 (class 2620 OID 30601)
-- Name: portal_tickets update_portal_tickets_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_portal_tickets_timestamp BEFORE UPDATE ON public.portal_tickets FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6092 (class 2620 OID 30437)
-- Name: reminder_notifications update_reminder_notifications_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_reminder_notifications_timestamp BEFORE UPDATE ON public.reminder_notifications FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6089 (class 2620 OID 30436)
-- Name: reminders update_reminders_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_reminders_timestamp BEFORE UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6118 (class 2620 OID 30843)
-- Name: report_exports update_report_exports_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_report_exports_timestamp BEFORE UPDATE ON public.report_exports FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6120 (class 2620 OID 30844)
-- Name: report_recipients update_report_recipients_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_report_recipients_timestamp BEFORE UPDATE ON public.report_recipients FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6122 (class 2620 OID 30845)
-- Name: report_schedules update_report_schedules_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_report_schedules_timestamp BEFORE UPDATE ON public.report_schedules FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6116 (class 2620 OID 30842)
-- Name: report_templates update_report_templates_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_report_templates_timestamp BEFORE UPDATE ON public.report_templates FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6025 (class 2620 OID 29137)
-- Name: roles update_roles_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_roles_timestamp BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6060 (class 2620 OID 31169)
-- Name: rooms update_rooms_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_rooms_timestamp BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6054 (class 2620 OID 29850)
-- Name: suppliers update_suppliers_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_suppliers_timestamp BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6066 (class 2620 OID 29857)
-- Name: system_settings update_system_settings_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_system_settings_timestamp BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6046 (class 2620 OID 29588)
-- Name: ticket_comments update_ticket_comments_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_ticket_comments_timestamp BEFORE UPDATE ON public.ticket_comments FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6045 (class 2620 OID 29587)
-- Name: tickets update_tickets_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_tickets_timestamp BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6043 (class 2620 OID 29586)
-- Name: todos update_todos_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_todos_timestamp BEFORE UPDATE ON public.todos FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6028 (class 2620 OID 31258)
-- Name: user_groups update_user_group_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_group_timestamp BEFORE UPDATE ON public.user_groups FOR EACH ROW EXECUTE FUNCTION public.update_user_group_timestamp();


--
-- TOC entry 6029 (class 2620 OID 29139)
-- Name: user_groups update_user_groups_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_groups_timestamp BEFORE UPDATE ON public.user_groups FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6023 (class 2620 OID 29136)
-- Name: user_preferences update_user_preferences_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_preferences_timestamp BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6022 (class 2620 OID 29135)
-- Name: user_profiles update_user_profiles_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_profiles_timestamp BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6020 (class 2620 OID 29134)
-- Name: users update_users_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6051 (class 2620 OID 29849)
-- Name: vendors update_vendors_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_vendors_timestamp BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- TOC entry 6021 (class 2620 OID 31254)
-- Name: users users_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER users_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.log_user_activity();


--
-- TOC entry 6052 (class 2620 OID 29860)
-- Name: vendors vendors_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER vendors_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


--
-- TOC entry 5921 (class 2606 OID 29292)
-- Name: accessories accessories_assigned_to_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessories
    ADD CONSTRAINT accessories_assigned_to_device_id_fkey FOREIGN KEY (assigned_to_device_id) REFERENCES public.devices(id) ON DELETE SET NULL;


--
-- TOC entry 5922 (class 2606 OID 29297)
-- Name: accessories accessories_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessories
    ADD CONSTRAINT accessories_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5926 (class 2606 OID 29342)
-- Name: accessory_history accessory_history_accessory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessory_history
    ADD CONSTRAINT accessory_history_accessory_id_fkey FOREIGN KEY (accessory_id) REFERENCES public.accessories(id) ON DELETE CASCADE;


--
-- TOC entry 5927 (class 2606 OID 29352)
-- Name: accessory_history accessory_history_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessory_history
    ADD CONSTRAINT accessory_history_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE SET NULL;


--
-- TOC entry 5928 (class 2606 OID 29357)
-- Name: accessory_history accessory_history_performed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessory_history
    ADD CONSTRAINT accessory_history_performed_by_user_id_fkey FOREIGN KEY (performed_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5929 (class 2606 OID 29347)
-- Name: accessory_history accessory_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accessory_history
    ADD CONSTRAINT accessory_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5953 (class 2606 OID 29828)
-- Name: asset_custom_field_values asset_custom_field_values_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_custom_field_values
    ADD CONSTRAINT asset_custom_field_values_field_id_fkey FOREIGN KEY (field_id) REFERENCES public.asset_custom_fields(id) ON DELETE CASCADE;


--
-- TOC entry 6013 (class 2606 OID 31162)
-- Name: assets assets_assigned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 6014 (class 2606 OID 31205)
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 6015 (class 2606 OID 31224)
-- Name: auth_log auth_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_log
    ADD CONSTRAINT auth_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5967 (class 2606 OID 30360)
-- Name: calendar_events calendar_events_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.calendar_categories(id) ON DELETE SET NULL;


--
-- TOC entry 5968 (class 2606 OID 30365)
-- Name: calendar_events calendar_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5951 (class 2606 OID 29687)
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- TOC entry 5923 (class 2606 OID 29317)
-- Name: device_history device_history_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_history
    ADD CONSTRAINT device_history_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- TOC entry 5924 (class 2606 OID 29327)
-- Name: device_history device_history_performed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_history
    ADD CONSTRAINT device_history_performed_by_user_id_fkey FOREIGN KEY (performed_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5925 (class 2606 OID 29322)
-- Name: device_history device_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_history
    ADD CONSTRAINT device_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 6010 (class 2606 OID 31068)
-- Name: device_models device_models_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_models
    ADD CONSTRAINT device_models_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- TOC entry 6011 (class 2606 OID 31063)
-- Name: device_models device_models_manufacturer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_models
    ADD CONSTRAINT device_models_manufacturer_id_fkey FOREIGN KEY (manufacturer_id) REFERENCES public.manufacturers(id);


--
-- TOC entry 5919 (class 2606 OID 29226)
-- Name: devices devices_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5963 (class 2606 OID 30295)
-- Name: document_attachments document_attachments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_attachments
    ADD CONSTRAINT document_attachments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5964 (class 2606 OID 30290)
-- Name: document_attachments document_attachments_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_attachments
    ADD CONSTRAINT document_attachments_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- TOC entry 5965 (class 2606 OID 30317)
-- Name: document_versions document_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5966 (class 2606 OID 30312)
-- Name: document_versions document_versions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- TOC entry 5961 (class 2606 OID 30269)
-- Name: documents documents_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.document_categories(id) ON DELETE SET NULL;


--
-- TOC entry 5962 (class 2606 OID 30274)
-- Name: documents documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5920 (class 2606 OID 31093)
-- Name: devices fk_device_model; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT fk_device_model FOREIGN KEY (model) REFERENCES public.device_models(id);


--
-- TOC entry 6018 (class 2606 OID 31270)
-- Name: user_roles fk_role; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT fk_role FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 5952 (class 2606 OID 31042)
-- Name: rooms fk_rooms_location; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT fk_rooms_location FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;


--
-- TOC entry 6019 (class 2606 OID 31265)
-- Name: user_roles fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5906 (class 2606 OID 31148)
-- Name: users fk_users_department; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- TOC entry 6007 (class 2606 OID 30945)
-- Name: integration_configs integration_configs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_configs
    ADD CONSTRAINT integration_configs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 6008 (class 2606 OID 30964)
-- Name: integration_mappings integration_mappings_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_mappings
    ADD CONSTRAINT integration_mappings_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.integration_configs(id) ON DELETE CASCADE;


--
-- TOC entry 6009 (class 2606 OID 30982)
-- Name: integration_sync_logs integration_sync_logs_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_sync_logs
    ADD CONSTRAINT integration_sync_logs_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.integration_configs(id) ON DELETE CASCADE;


--
-- TOC entry 5931 (class 2606 OID 29447)
-- Name: inventory_checks inventory_checks_accessory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_checks
    ADD CONSTRAINT inventory_checks_accessory_id_fkey FOREIGN KEY (accessory_id) REFERENCES public.accessories(id) ON DELETE CASCADE;


--
-- TOC entry 5932 (class 2606 OID 29452)
-- Name: inventory_checks inventory_checks_checked_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_checks
    ADD CONSTRAINT inventory_checks_checked_by_user_id_fkey FOREIGN KEY (checked_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5933 (class 2606 OID 29442)
-- Name: inventory_checks inventory_checks_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_checks
    ADD CONSTRAINT inventory_checks_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- TOC entry 5934 (class 2606 OID 29437)
-- Name: inventory_checks inventory_checks_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_checks
    ADD CONSTRAINT inventory_checks_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.inventory_sessions(id) ON DELETE CASCADE;


--
-- TOC entry 5930 (class 2606 OID 29419)
-- Name: inventory_sessions inventory_sessions_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_sessions
    ADD CONSTRAINT inventory_sessions_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 6012 (class 2606 OID 31129)
-- Name: label_settings label_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.label_settings
    ADD CONSTRAINT label_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 6004 (class 2606 OID 30873)
-- Name: mobile_devices mobile_devices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_devices
    ADD CONSTRAINT mobile_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 6005 (class 2606 OID 30892)
-- Name: mobile_offline_data mobile_offline_data_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_offline_data
    ADD CONSTRAINT mobile_offline_data_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.mobile_devices(id) ON DELETE CASCADE;


--
-- TOC entry 6006 (class 2606 OID 30910)
-- Name: mobile_sync_logs mobile_sync_logs_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_sync_logs
    ADD CONSTRAINT mobile_sync_logs_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.mobile_devices(id) ON DELETE CASCADE;


--
-- TOC entry 5954 (class 2606 OID 29892)
-- Name: network_cabinets network_cabinets_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_cabinets
    ADD CONSTRAINT network_cabinets_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;


--
-- TOC entry 5955 (class 2606 OID 29897)
-- Name: network_cabinets network_cabinets_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_cabinets
    ADD CONSTRAINT network_cabinets_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;


--
-- TOC entry 5959 (class 2606 OID 31029)
-- Name: network_sockets network_sockets_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_sockets
    ADD CONSTRAINT network_sockets_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- TOC entry 5960 (class 2606 OID 30166)
-- Name: network_sockets network_sockets_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_sockets
    ADD CONSTRAINT network_sockets_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;


--
-- TOC entry 5956 (class 2606 OID 30132)
-- Name: network_switches network_switches_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_switches
    ADD CONSTRAINT network_switches_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;


--
-- TOC entry 5957 (class 2606 OID 30127)
-- Name: network_switches network_switches_manufacturer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_switches
    ADD CONSTRAINT network_switches_manufacturer_id_fkey FOREIGN KEY (manufacturer_id) REFERENCES public.manufacturers(id) ON DELETE SET NULL;


--
-- TOC entry 5958 (class 2606 OID 30137)
-- Name: network_switches network_switches_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.network_switches
    ADD CONSTRAINT network_switches_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;


--
-- TOC entry 5996 (class 2606 OID 30730)
-- Name: onboarding_checklist_items onboarding_checklist_items_checklist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_checklist_items
    ADD CONSTRAINT onboarding_checklist_items_checklist_id_fkey FOREIGN KEY (checklist_id) REFERENCES public.onboarding_checklists(id) ON DELETE CASCADE;


--
-- TOC entry 5994 (class 2606 OID 30713)
-- Name: onboarding_checklists onboarding_checklists_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_checklists
    ADD CONSTRAINT onboarding_checklists_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5995 (class 2606 OID 30708)
-- Name: onboarding_checklists onboarding_checklists_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_checklists
    ADD CONSTRAINT onboarding_checklists_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.onboarding_templates(id) ON DELETE SET NULL;


--
-- TOC entry 5992 (class 2606 OID 30689)
-- Name: onboarding_protocol_items onboarding_protocol_items_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_protocol_items
    ADD CONSTRAINT onboarding_protocol_items_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5993 (class 2606 OID 30684)
-- Name: onboarding_protocol_items onboarding_protocol_items_protocol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_protocol_items
    ADD CONSTRAINT onboarding_protocol_items_protocol_id_fkey FOREIGN KEY (protocol_id) REFERENCES public.onboarding_protocols(id) ON DELETE CASCADE;


--
-- TOC entry 5989 (class 2606 OID 30662)
-- Name: onboarding_protocols onboarding_protocols_initiator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_protocols
    ADD CONSTRAINT onboarding_protocols_initiator_id_fkey FOREIGN KEY (initiator_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5990 (class 2606 OID 30667)
-- Name: onboarding_protocols onboarding_protocols_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_protocols
    ADD CONSTRAINT onboarding_protocols_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5991 (class 2606 OID 30657)
-- Name: onboarding_protocols onboarding_protocols_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_protocols
    ADD CONSTRAINT onboarding_protocols_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.onboarding_templates(id) ON DELETE SET NULL;


--
-- TOC entry 5988 (class 2606 OID 30640)
-- Name: onboarding_templates onboarding_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_templates
    ADD CONSTRAINT onboarding_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 6016 (class 2606 OID 31247)
-- Name: password_change_log password_change_log_changed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_change_log
    ADD CONSTRAINT password_change_log_changed_by_user_id_fkey FOREIGN KEY (changed_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 6017 (class 2606 OID 31242)
-- Name: password_change_log password_change_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_change_log
    ADD CONSTRAINT password_change_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5975 (class 2606 OID 30472)
-- Name: portal_categories portal_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_categories
    ADD CONSTRAINT portal_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.portal_categories(id) ON DELETE SET NULL;


--
-- TOC entry 5979 (class 2606 OID 30517)
-- Name: portal_request_items portal_request_items_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_request_items
    ADD CONSTRAINT portal_request_items_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.portal_requests(id) ON DELETE CASCADE;


--
-- TOC entry 5976 (class 2606 OID 30500)
-- Name: portal_requests portal_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_requests
    ADD CONSTRAINT portal_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5977 (class 2606 OID 30490)
-- Name: portal_requests portal_requests_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_requests
    ADD CONSTRAINT portal_requests_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.portal_categories(id) ON DELETE SET NULL;


--
-- TOC entry 5978 (class 2606 OID 30495)
-- Name: portal_requests portal_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_requests
    ADD CONSTRAINT portal_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5984 (class 2606 OID 30566)
-- Name: portal_ticket_attachments portal_ticket_attachments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_ticket_attachments
    ADD CONSTRAINT portal_ticket_attachments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.portal_tickets(id) ON DELETE CASCADE;


--
-- TOC entry 5985 (class 2606 OID 30571)
-- Name: portal_ticket_attachments portal_ticket_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_ticket_attachments
    ADD CONSTRAINT portal_ticket_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5986 (class 2606 OID 30593)
-- Name: portal_ticket_comments portal_ticket_comments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_ticket_comments
    ADD CONSTRAINT portal_ticket_comments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5987 (class 2606 OID 30588)
-- Name: portal_ticket_comments portal_ticket_comments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_ticket_comments
    ADD CONSTRAINT portal_ticket_comments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.portal_tickets(id) ON DELETE CASCADE;


--
-- TOC entry 5980 (class 2606 OID 30545)
-- Name: portal_tickets portal_tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_tickets
    ADD CONSTRAINT portal_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5981 (class 2606 OID 30535)
-- Name: portal_tickets portal_tickets_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_tickets
    ADD CONSTRAINT portal_tickets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.portal_categories(id) ON DELETE SET NULL;


--
-- TOC entry 5982 (class 2606 OID 30540)
-- Name: portal_tickets portal_tickets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_tickets
    ADD CONSTRAINT portal_tickets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5983 (class 2606 OID 30550)
-- Name: portal_tickets portal_tickets_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portal_tickets
    ADD CONSTRAINT portal_tickets_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5973 (class 2606 OID 30429)
-- Name: reminder_notifications reminder_notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_notifications
    ADD CONSTRAINT reminder_notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.reminder_recipients(id) ON DELETE CASCADE;


--
-- TOC entry 5974 (class 2606 OID 30424)
-- Name: reminder_notifications reminder_notifications_reminder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_notifications
    ADD CONSTRAINT reminder_notifications_reminder_id_fkey FOREIGN KEY (reminder_id) REFERENCES public.reminders(id) ON DELETE CASCADE;


--
-- TOC entry 5971 (class 2606 OID 30403)
-- Name: reminder_recipients reminder_recipients_reminder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_recipients
    ADD CONSTRAINT reminder_recipients_reminder_id_fkey FOREIGN KEY (reminder_id) REFERENCES public.reminders(id) ON DELETE CASCADE;


--
-- TOC entry 5972 (class 2606 OID 30408)
-- Name: reminder_recipients reminder_recipients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_recipients
    ADD CONSTRAINT reminder_recipients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5969 (class 2606 OID 30387)
-- Name: reminders reminders_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5970 (class 2606 OID 30382)
-- Name: reminders reminders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5998 (class 2606 OID 30793)
-- Name: report_exports report_exports_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_exports
    ADD CONSTRAINT report_exports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5999 (class 2606 OID 30788)
-- Name: report_exports report_exports_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_exports
    ADD CONSTRAINT report_exports_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.report_templates(id) ON DELETE SET NULL;


--
-- TOC entry 6000 (class 2606 OID 30810)
-- Name: report_recipients report_recipients_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_recipients
    ADD CONSTRAINT report_recipients_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.report_templates(id) ON DELETE CASCADE;


--
-- TOC entry 6001 (class 2606 OID 30815)
-- Name: report_recipients report_recipients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_recipients
    ADD CONSTRAINT report_recipients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 6002 (class 2606 OID 30837)
-- Name: report_schedules report_schedules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_schedules
    ADD CONSTRAINT report_schedules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 6003 (class 2606 OID 30832)
-- Name: report_schedules report_schedules_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_schedules
    ADD CONSTRAINT report_schedules_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.report_templates(id) ON DELETE CASCADE;


--
-- TOC entry 5997 (class 2606 OID 30771)
-- Name: report_templates report_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5911 (class 2606 OID 29055)
-- Name: role_hierarchy role_hierarchy_child_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_child_role_id_fkey FOREIGN KEY (child_role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 5912 (class 2606 OID 29050)
-- Name: role_hierarchy role_hierarchy_parent_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_hierarchy
    ADD CONSTRAINT role_hierarchy_parent_role_id_fkey FOREIGN KEY (parent_role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 5913 (class 2606 OID 29088)
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- TOC entry 5914 (class 2606 OID 29083)
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 5949 (class 2606 OID 29574)
-- Name: ticket_attachments ticket_attachments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_attachments
    ADD CONSTRAINT ticket_attachments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- TOC entry 5950 (class 2606 OID 29579)
-- Name: ticket_attachments ticket_attachments_uploaded_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_attachments
    ADD CONSTRAINT ticket_attachments_uploaded_by_user_id_fkey FOREIGN KEY (uploaded_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5947 (class 2606 OID 29554)
-- Name: ticket_comments ticket_comments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_comments
    ADD CONSTRAINT ticket_comments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- TOC entry 5948 (class 2606 OID 29559)
-- Name: ticket_comments ticket_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_comments
    ADD CONSTRAINT ticket_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5941 (class 2606 OID 29518)
-- Name: tickets tickets_accessory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_accessory_id_fkey FOREIGN KEY (accessory_id) REFERENCES public.accessories(id) ON DELETE SET NULL;


--
-- TOC entry 5942 (class 2606 OID 29533)
-- Name: tickets tickets_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5943 (class 2606 OID 29528)
-- Name: tickets tickets_certificate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_certificate_id_fkey FOREIGN KEY (certificate_id) REFERENCES public.certificates(id) ON DELETE SET NULL;


--
-- TOC entry 5944 (class 2606 OID 29538)
-- Name: tickets tickets_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5945 (class 2606 OID 29513)
-- Name: tickets tickets_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE SET NULL;


--
-- TOC entry 5946 (class 2606 OID 29523)
-- Name: tickets tickets_license_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_license_id_fkey FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE SET NULL;


--
-- TOC entry 5935 (class 2606 OID 29480)
-- Name: todos todos_accessory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_accessory_id_fkey FOREIGN KEY (accessory_id) REFERENCES public.accessories(id) ON DELETE SET NULL;


--
-- TOC entry 5936 (class 2606 OID 29470)
-- Name: todos todos_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5937 (class 2606 OID 29490)
-- Name: todos todos_certificate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_certificate_id_fkey FOREIGN KEY (certificate_id) REFERENCES public.certificates(id) ON DELETE SET NULL;


--
-- TOC entry 5938 (class 2606 OID 29495)
-- Name: todos todos_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5939 (class 2606 OID 29475)
-- Name: todos todos_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE SET NULL;


--
-- TOC entry 5940 (class 2606 OID 29485)
-- Name: todos todos_license_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_license_id_fkey FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE SET NULL;


--
-- TOC entry 5916 (class 2606 OID 29129)
-- Name: user_group_members user_group_members_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group_members
    ADD CONSTRAINT user_group_members_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5917 (class 2606 OID 29119)
-- Name: user_group_members user_group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group_members
    ADD CONSTRAINT user_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.user_groups(id) ON DELETE CASCADE;


--
-- TOC entry 5918 (class 2606 OID 29124)
-- Name: user_group_members user_group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group_members
    ADD CONSTRAINT user_group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5915 (class 2606 OID 29104)
-- Name: user_groups user_groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5910 (class 2606 OID 29021)
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5909 (class 2606 OID 29001)
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5907 (class 2606 OID 31007)
-- Name: users users_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- TOC entry 5908 (class 2606 OID 31012)
-- Name: users users_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id);


--
-- TOC entry 6467 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO atlas_user;


--
-- TOC entry 6468 (class 0 OID 0)
-- Dependencies: 265
-- Name: TABLE accessories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.accessories TO atlas_user;


--
-- TOC entry 6469 (class 0 OID 0)
-- Dependencies: 217
-- Name: SEQUENCE accessories_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.accessories_id_seq TO atlas_user;


--
-- TOC entry 6471 (class 0 OID 0)
-- Dependencies: 264
-- Name: SEQUENCE accessories_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.accessories_id_seq1 TO atlas_user;


--
-- TOC entry 6472 (class 0 OID 0)
-- Dependencies: 269
-- Name: TABLE accessory_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.accessory_history TO atlas_user;


--
-- TOC entry 6474 (class 0 OID 0)
-- Dependencies: 268
-- Name: SEQUENCE accessory_history_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.accessory_history_id_seq TO atlas_user;


--
-- TOC entry 6475 (class 0 OID 0)
-- Dependencies: 301
-- Name: TABLE asset_custom_field_values; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.asset_custom_field_values TO atlas_user;


--
-- TOC entry 6477 (class 0 OID 0)
-- Dependencies: 300
-- Name: SEQUENCE asset_custom_field_values_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.asset_custom_field_values_id_seq TO atlas_user;


--
-- TOC entry 6478 (class 0 OID 0)
-- Dependencies: 299
-- Name: TABLE asset_custom_fields; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.asset_custom_fields TO atlas_user;


--
-- TOC entry 6480 (class 0 OID 0)
-- Dependencies: 298
-- Name: SEQUENCE asset_custom_fields_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.asset_custom_fields_id_seq TO atlas_user;


--
-- TOC entry 6481 (class 0 OID 0)
-- Dependencies: 378
-- Name: TABLE asset_tag_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.asset_tag_settings TO atlas_user;


--
-- TOC entry 6483 (class 0 OID 0)
-- Dependencies: 377
-- Name: SEQUENCE asset_tag_settings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.asset_tag_settings_id_seq TO atlas_user;


--
-- TOC entry 6484 (class 0 OID 0)
-- Dependencies: 382
-- Name: TABLE assets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.assets TO atlas_user;


--
-- TOC entry 6486 (class 0 OID 0)
-- Dependencies: 381
-- Name: SEQUENCE assets_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.assets_id_seq TO atlas_user;


--
-- TOC entry 6487 (class 0 OID 0)
-- Dependencies: 386
-- Name: TABLE audit_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_log TO atlas_user;


--
-- TOC entry 6489 (class 0 OID 0)
-- Dependencies: 385
-- Name: SEQUENCE audit_log_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.audit_log_id_seq TO atlas_user;


--
-- TOC entry 6490 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_logs TO atlas_user;


--
-- TOC entry 6492 (class 0 OID 0)
-- Dependencies: 238
-- Name: SEQUENCE audit_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.audit_logs_id_seq TO atlas_user;


--
-- TOC entry 6493 (class 0 OID 0)
-- Dependencies: 388
-- Name: TABLE auth_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.auth_log TO atlas_user;


--
-- TOC entry 6495 (class 0 OID 0)
-- Dependencies: 387
-- Name: SEQUENCE auth_log_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.auth_log_id_seq TO atlas_user;


--
-- TOC entry 6496 (class 0 OID 0)
-- Dependencies: 323
-- Name: TABLE calendar_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.calendar_categories TO atlas_user;


--
-- TOC entry 6498 (class 0 OID 0)
-- Dependencies: 322
-- Name: SEQUENCE calendar_categories_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.calendar_categories_id_seq TO atlas_user;


--
-- TOC entry 6499 (class 0 OID 0)
-- Dependencies: 325
-- Name: TABLE calendar_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.calendar_events TO atlas_user;


--
-- TOC entry 6501 (class 0 OID 0)
-- Dependencies: 324
-- Name: SEQUENCE calendar_events_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.calendar_events_id_seq TO atlas_user;


--
-- TOC entry 6502 (class 0 OID 0)
-- Dependencies: 285
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.categories TO atlas_user;


--
-- TOC entry 6503 (class 0 OID 0)
-- Dependencies: 218
-- Name: SEQUENCE categories_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.categories_id_seq TO atlas_user;


--
-- TOC entry 6505 (class 0 OID 0)
-- Dependencies: 284
-- Name: SEQUENCE categories_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.categories_id_seq1 TO atlas_user;


--
-- TOC entry 6506 (class 0 OID 0)
-- Dependencies: 263
-- Name: TABLE certificates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.certificates TO atlas_user;


--
-- TOC entry 6507 (class 0 OID 0)
-- Dependencies: 219
-- Name: SEQUENCE certificates_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.certificates_id_seq TO atlas_user;


--
-- TOC entry 6509 (class 0 OID 0)
-- Dependencies: 262
-- Name: SEQUENCE certificates_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.certificates_id_seq1 TO atlas_user;


--
-- TOC entry 6510 (class 0 OID 0)
-- Dependencies: 295
-- Name: TABLE departments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.departments TO atlas_user;


--
-- TOC entry 6511 (class 0 OID 0)
-- Dependencies: 220
-- Name: SEQUENCE departments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.departments_id_seq TO atlas_user;


--
-- TOC entry 6513 (class 0 OID 0)
-- Dependencies: 294
-- Name: SEQUENCE departments_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.departments_id_seq1 TO atlas_user;


--
-- TOC entry 6514 (class 0 OID 0)
-- Dependencies: 267
-- Name: TABLE device_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.device_history TO atlas_user;


--
-- TOC entry 6516 (class 0 OID 0)
-- Dependencies: 266
-- Name: SEQUENCE device_history_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.device_history_id_seq TO atlas_user;


--
-- TOC entry 6517 (class 0 OID 0)
-- Dependencies: 375
-- Name: TABLE device_models; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.device_models TO atlas_user;


--
-- TOC entry 6518 (class 0 OID 0)
-- Dependencies: 221
-- Name: SEQUENCE device_models_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.device_models_id_seq TO atlas_user;


--
-- TOC entry 6520 (class 0 OID 0)
-- Dependencies: 374
-- Name: SEQUENCE device_models_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.device_models_id_seq1 TO atlas_user;


--
-- TOC entry 6521 (class 0 OID 0)
-- Dependencies: 376
-- Name: TABLE device_models_with_count; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.device_models_with_count TO atlas_user;


--
-- TOC entry 6522 (class 0 OID 0)
-- Dependencies: 259
-- Name: TABLE devices; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.devices TO atlas_user;


--
-- TOC entry 6523 (class 0 OID 0)
-- Dependencies: 222
-- Name: SEQUENCE devices_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.devices_id_seq TO atlas_user;


--
-- TOC entry 6525 (class 0 OID 0)
-- Dependencies: 258
-- Name: SEQUENCE devices_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.devices_id_seq1 TO atlas_user;


--
-- TOC entry 6526 (class 0 OID 0)
-- Dependencies: 319
-- Name: TABLE document_attachments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.document_attachments TO atlas_user;


--
-- TOC entry 6528 (class 0 OID 0)
-- Dependencies: 318
-- Name: SEQUENCE document_attachments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.document_attachments_id_seq TO atlas_user;


--
-- TOC entry 6529 (class 0 OID 0)
-- Dependencies: 315
-- Name: TABLE document_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.document_categories TO atlas_user;


--
-- TOC entry 6531 (class 0 OID 0)
-- Dependencies: 314
-- Name: SEQUENCE document_categories_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.document_categories_id_seq TO atlas_user;


--
-- TOC entry 6532 (class 0 OID 0)
-- Dependencies: 321
-- Name: TABLE document_versions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.document_versions TO atlas_user;


--
-- TOC entry 6534 (class 0 OID 0)
-- Dependencies: 320
-- Name: SEQUENCE document_versions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.document_versions_id_seq TO atlas_user;


--
-- TOC entry 6535 (class 0 OID 0)
-- Dependencies: 317
-- Name: TABLE documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.documents TO atlas_user;


--
-- TOC entry 6536 (class 0 OID 0)
-- Dependencies: 223
-- Name: SEQUENCE documents_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.documents_id_seq TO atlas_user;


--
-- TOC entry 6538 (class 0 OID 0)
-- Dependencies: 316
-- Name: SEQUENCE documents_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.documents_id_seq1 TO atlas_user;


--
-- TOC entry 6539 (class 0 OID 0)
-- Dependencies: 224
-- Name: SEQUENCE handover_protocols_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.handover_protocols_id_seq TO atlas_user;


--
-- TOC entry 6540 (class 0 OID 0)
-- Dependencies: 225
-- Name: SEQUENCE history_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.history_id_seq TO atlas_user;


--
-- TOC entry 6541 (class 0 OID 0)
-- Dependencies: 369
-- Name: TABLE integration_configs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.integration_configs TO atlas_user;


--
-- TOC entry 6543 (class 0 OID 0)
-- Dependencies: 368
-- Name: SEQUENCE integration_configs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.integration_configs_id_seq TO atlas_user;


--
-- TOC entry 6544 (class 0 OID 0)
-- Dependencies: 371
-- Name: TABLE integration_mappings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.integration_mappings TO atlas_user;


--
-- TOC entry 6546 (class 0 OID 0)
-- Dependencies: 370
-- Name: SEQUENCE integration_mappings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.integration_mappings_id_seq TO atlas_user;


--
-- TOC entry 6547 (class 0 OID 0)
-- Dependencies: 373
-- Name: TABLE integration_sync_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.integration_sync_logs TO atlas_user;


--
-- TOC entry 6549 (class 0 OID 0)
-- Dependencies: 372
-- Name: SEQUENCE integration_sync_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.integration_sync_logs_id_seq TO atlas_user;


--
-- TOC entry 6550 (class 0 OID 0)
-- Dependencies: 273
-- Name: TABLE inventory_checks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.inventory_checks TO atlas_user;


--
-- TOC entry 6552 (class 0 OID 0)
-- Dependencies: 272
-- Name: SEQUENCE inventory_checks_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.inventory_checks_id_seq TO atlas_user;


--
-- TOC entry 6553 (class 0 OID 0)
-- Dependencies: 271
-- Name: TABLE inventory_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.inventory_sessions TO atlas_user;


--
-- TOC entry 6554 (class 0 OID 0)
-- Dependencies: 226
-- Name: SEQUENCE inventory_sessions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.inventory_sessions_id_seq TO atlas_user;


--
-- TOC entry 6556 (class 0 OID 0)
-- Dependencies: 270
-- Name: SEQUENCE inventory_sessions_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.inventory_sessions_id_seq1 TO atlas_user;


--
-- TOC entry 6560 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO atlas_user;


--
-- TOC entry 6561 (class 0 OID 0)
-- Dependencies: 283
-- Name: TABLE inventory_status_view; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.inventory_status_view TO atlas_user;


--
-- TOC entry 6565 (class 0 OID 0)
-- Dependencies: 380
-- Name: TABLE label_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.label_settings TO atlas_user;


--
-- TOC entry 6567 (class 0 OID 0)
-- Dependencies: 379
-- Name: SEQUENCE label_settings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.label_settings_id_seq TO atlas_user;


--
-- TOC entry 6571 (class 0 OID 0)
-- Dependencies: 393
-- Name: TABLE license_types; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.license_types TO atlas_user;


--
-- TOC entry 6573 (class 0 OID 0)
-- Dependencies: 392
-- Name: SEQUENCE license_types_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.license_types_id_seq TO atlas_user;


--
-- TOC entry 6574 (class 0 OID 0)
-- Dependencies: 261
-- Name: TABLE licenses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.licenses TO atlas_user;


--
-- TOC entry 6576 (class 0 OID 0)
-- Dependencies: 260
-- Name: SEQUENCE licenses_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.licenses_id_seq TO atlas_user;


--
-- TOC entry 6577 (class 0 OID 0)
-- Dependencies: 293
-- Name: TABLE locations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.locations TO atlas_user;


--
-- TOC entry 6578 (class 0 OID 0)
-- Dependencies: 227
-- Name: SEQUENCE locations_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.locations_id_seq TO atlas_user;


--
-- TOC entry 6580 (class 0 OID 0)
-- Dependencies: 292
-- Name: SEQUENCE locations_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.locations_id_seq1 TO atlas_user;


--
-- TOC entry 6581 (class 0 OID 0)
-- Dependencies: 287
-- Name: TABLE manufacturers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.manufacturers TO atlas_user;


--
-- TOC entry 6582 (class 0 OID 0)
-- Dependencies: 228
-- Name: SEQUENCE manufacturers_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.manufacturers_id_seq TO atlas_user;


--
-- TOC entry 6584 (class 0 OID 0)
-- Dependencies: 286
-- Name: SEQUENCE manufacturers_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.manufacturers_id_seq1 TO atlas_user;


--
-- TOC entry 6585 (class 0 OID 0)
-- Dependencies: 363
-- Name: TABLE mobile_devices; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mobile_devices TO atlas_user;


--
-- TOC entry 6587 (class 0 OID 0)
-- Dependencies: 362
-- Name: SEQUENCE mobile_devices_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.mobile_devices_id_seq TO atlas_user;


--
-- TOC entry 6588 (class 0 OID 0)
-- Dependencies: 365
-- Name: TABLE mobile_offline_data; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mobile_offline_data TO atlas_user;


--
-- TOC entry 6590 (class 0 OID 0)
-- Dependencies: 364
-- Name: SEQUENCE mobile_offline_data_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.mobile_offline_data_id_seq TO atlas_user;


--
-- TOC entry 6591 (class 0 OID 0)
-- Dependencies: 367
-- Name: TABLE mobile_sync_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mobile_sync_logs TO atlas_user;


--
-- TOC entry 6593 (class 0 OID 0)
-- Dependencies: 366
-- Name: SEQUENCE mobile_sync_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.mobile_sync_logs_id_seq TO atlas_user;


--
-- TOC entry 6594 (class 0 OID 0)
-- Dependencies: 305
-- Name: TABLE network_cabinets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.network_cabinets TO atlas_user;


--
-- TOC entry 6596 (class 0 OID 0)
-- Dependencies: 304
-- Name: SEQUENCE network_cabinets_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.network_cabinets_id_seq TO atlas_user;


--
-- TOC entry 6597 (class 0 OID 0)
-- Dependencies: 313
-- Name: TABLE network_ports; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.network_ports TO atlas_user;


--
-- TOC entry 6598 (class 0 OID 0)
-- Dependencies: 229
-- Name: SEQUENCE network_ports_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.network_ports_id_seq TO atlas_user;


--
-- TOC entry 6600 (class 0 OID 0)
-- Dependencies: 312
-- Name: SEQUENCE network_ports_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.network_ports_id_seq1 TO atlas_user;


--
-- TOC entry 6604 (class 0 OID 0)
-- Dependencies: 311
-- Name: TABLE network_sockets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.network_sockets TO atlas_user;


--
-- TOC entry 6606 (class 0 OID 0)
-- Dependencies: 310
-- Name: SEQUENCE network_sockets_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.network_sockets_id_seq TO atlas_user;


--
-- TOC entry 6607 (class 0 OID 0)
-- Dependencies: 309
-- Name: TABLE network_switches; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.network_switches TO atlas_user;


--
-- TOC entry 6609 (class 0 OID 0)
-- Dependencies: 308
-- Name: SEQUENCE network_switches_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.network_switches_id_seq TO atlas_user;


--
-- TOC entry 6610 (class 0 OID 0)
-- Dependencies: 307
-- Name: TABLE network_vlans; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.network_vlans TO atlas_user;


--
-- TOC entry 6612 (class 0 OID 0)
-- Dependencies: 306
-- Name: SEQUENCE network_vlans_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.network_vlans_id_seq TO atlas_user;


--
-- TOC entry 6613 (class 0 OID 0)
-- Dependencies: 230
-- Name: SEQUENCE notifications_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.notifications_id_seq TO atlas_user;


--
-- TOC entry 6614 (class 0 OID 0)
-- Dependencies: 353
-- Name: TABLE onboarding_checklist_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.onboarding_checklist_items TO atlas_user;


--
-- TOC entry 6616 (class 0 OID 0)
-- Dependencies: 352
-- Name: SEQUENCE onboarding_checklist_items_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.onboarding_checklist_items_id_seq TO atlas_user;


--
-- TOC entry 6617 (class 0 OID 0)
-- Dependencies: 351
-- Name: TABLE onboarding_checklists; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.onboarding_checklists TO atlas_user;


--
-- TOC entry 6619 (class 0 OID 0)
-- Dependencies: 350
-- Name: SEQUENCE onboarding_checklists_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.onboarding_checklists_id_seq TO atlas_user;


--
-- TOC entry 6620 (class 0 OID 0)
-- Dependencies: 349
-- Name: TABLE onboarding_protocol_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.onboarding_protocol_items TO atlas_user;


--
-- TOC entry 6622 (class 0 OID 0)
-- Dependencies: 348
-- Name: SEQUENCE onboarding_protocol_items_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.onboarding_protocol_items_id_seq TO atlas_user;


--
-- TOC entry 6623 (class 0 OID 0)
-- Dependencies: 347
-- Name: TABLE onboarding_protocols; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.onboarding_protocols TO atlas_user;


--
-- TOC entry 6625 (class 0 OID 0)
-- Dependencies: 346
-- Name: SEQUENCE onboarding_protocols_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.onboarding_protocols_id_seq TO atlas_user;


--
-- TOC entry 6626 (class 0 OID 0)
-- Dependencies: 345
-- Name: TABLE onboarding_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.onboarding_templates TO atlas_user;


--
-- TOC entry 6628 (class 0 OID 0)
-- Dependencies: 344
-- Name: SEQUENCE onboarding_templates_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.onboarding_templates_id_seq TO atlas_user;


--
-- TOC entry 6629 (class 0 OID 0)
-- Dependencies: 390
-- Name: TABLE password_change_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.password_change_log TO atlas_user;


--
-- TOC entry 6631 (class 0 OID 0)
-- Dependencies: 389
-- Name: SEQUENCE password_change_log_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.password_change_log_id_seq TO atlas_user;


--
-- TOC entry 6632 (class 0 OID 0)
-- Dependencies: 384
-- Name: TABLE password_policies; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.password_policies TO atlas_user;


--
-- TOC entry 6634 (class 0 OID 0)
-- Dependencies: 383
-- Name: SEQUENCE password_policies_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.password_policies_id_seq TO atlas_user;


--
-- TOC entry 6635 (class 0 OID 0)
-- Dependencies: 251
-- Name: TABLE permissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.permissions TO atlas_user;


--
-- TOC entry 6637 (class 0 OID 0)
-- Dependencies: 250
-- Name: SEQUENCE permissions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.permissions_id_seq TO atlas_user;


--
-- TOC entry 6638 (class 0 OID 0)
-- Dependencies: 333
-- Name: TABLE portal_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.portal_categories TO atlas_user;


--
-- TOC entry 6640 (class 0 OID 0)
-- Dependencies: 332
-- Name: SEQUENCE portal_categories_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.portal_categories_id_seq TO atlas_user;


--
-- TOC entry 6641 (class 0 OID 0)
-- Dependencies: 337
-- Name: TABLE portal_request_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.portal_request_items TO atlas_user;


--
-- TOC entry 6643 (class 0 OID 0)
-- Dependencies: 336
-- Name: SEQUENCE portal_request_items_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.portal_request_items_id_seq TO atlas_user;


--
-- TOC entry 6644 (class 0 OID 0)
-- Dependencies: 335
-- Name: TABLE portal_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.portal_requests TO atlas_user;


--
-- TOC entry 6646 (class 0 OID 0)
-- Dependencies: 334
-- Name: SEQUENCE portal_requests_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.portal_requests_id_seq TO atlas_user;


--
-- TOC entry 6647 (class 0 OID 0)
-- Dependencies: 341
-- Name: TABLE portal_ticket_attachments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.portal_ticket_attachments TO atlas_user;


--
-- TOC entry 6649 (class 0 OID 0)
-- Dependencies: 340
-- Name: SEQUENCE portal_ticket_attachments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.portal_ticket_attachments_id_seq TO atlas_user;


--
-- TOC entry 6650 (class 0 OID 0)
-- Dependencies: 343
-- Name: TABLE portal_ticket_comments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.portal_ticket_comments TO atlas_user;


--
-- TOC entry 6652 (class 0 OID 0)
-- Dependencies: 342
-- Name: SEQUENCE portal_ticket_comments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.portal_ticket_comments_id_seq TO atlas_user;


--
-- TOC entry 6653 (class 0 OID 0)
-- Dependencies: 339
-- Name: TABLE portal_tickets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.portal_tickets TO atlas_user;


--
-- TOC entry 6655 (class 0 OID 0)
-- Dependencies: 338
-- Name: SEQUENCE portal_tickets_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.portal_tickets_id_seq TO atlas_user;


--
-- TOC entry 6656 (class 0 OID 0)
-- Dependencies: 331
-- Name: TABLE reminder_notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.reminder_notifications TO atlas_user;


--
-- TOC entry 6658 (class 0 OID 0)
-- Dependencies: 330
-- Name: SEQUENCE reminder_notifications_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.reminder_notifications_id_seq TO atlas_user;


--
-- TOC entry 6659 (class 0 OID 0)
-- Dependencies: 329
-- Name: TABLE reminder_recipients; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.reminder_recipients TO atlas_user;


--
-- TOC entry 6661 (class 0 OID 0)
-- Dependencies: 328
-- Name: SEQUENCE reminder_recipients_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.reminder_recipients_id_seq TO atlas_user;


--
-- TOC entry 6662 (class 0 OID 0)
-- Dependencies: 327
-- Name: TABLE reminders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.reminders TO atlas_user;


--
-- TOC entry 6664 (class 0 OID 0)
-- Dependencies: 326
-- Name: SEQUENCE reminders_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.reminders_id_seq TO atlas_user;


--
-- TOC entry 6665 (class 0 OID 0)
-- Dependencies: 357
-- Name: TABLE report_exports; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.report_exports TO atlas_user;


--
-- TOC entry 6667 (class 0 OID 0)
-- Dependencies: 356
-- Name: SEQUENCE report_exports_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.report_exports_id_seq TO atlas_user;


--
-- TOC entry 6668 (class 0 OID 0)
-- Dependencies: 359
-- Name: TABLE report_recipients; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.report_recipients TO atlas_user;


--
-- TOC entry 6670 (class 0 OID 0)
-- Dependencies: 358
-- Name: SEQUENCE report_recipients_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.report_recipients_id_seq TO atlas_user;


--
-- TOC entry 6671 (class 0 OID 0)
-- Dependencies: 361
-- Name: TABLE report_schedules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.report_schedules TO atlas_user;


--
-- TOC entry 6673 (class 0 OID 0)
-- Dependencies: 360
-- Name: SEQUENCE report_schedules_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.report_schedules_id_seq TO atlas_user;


--
-- TOC entry 6674 (class 0 OID 0)
-- Dependencies: 355
-- Name: TABLE report_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.report_templates TO atlas_user;


--
-- TOC entry 6676 (class 0 OID 0)
-- Dependencies: 354
-- Name: SEQUENCE report_templates_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.report_templates_id_seq TO atlas_user;


--
-- TOC entry 6677 (class 0 OID 0)
-- Dependencies: 249
-- Name: TABLE role_hierarchy; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.role_hierarchy TO atlas_user;


--
-- TOC entry 6679 (class 0 OID 0)
-- Dependencies: 248
-- Name: SEQUENCE role_hierarchy_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.role_hierarchy_id_seq TO atlas_user;


--
-- TOC entry 6680 (class 0 OID 0)
-- Dependencies: 253
-- Name: TABLE role_permissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.role_permissions TO atlas_user;


--
-- TOC entry 6682 (class 0 OID 0)
-- Dependencies: 252
-- Name: SEQUENCE role_permissions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.role_permissions_id_seq TO atlas_user;


--
-- TOC entry 6683 (class 0 OID 0)
-- Dependencies: 247
-- Name: TABLE roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.roles TO atlas_user;


--
-- TOC entry 6685 (class 0 OID 0)
-- Dependencies: 246
-- Name: SEQUENCE roles_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.roles_id_seq TO atlas_user;


--
-- TOC entry 6686 (class 0 OID 0)
-- Dependencies: 297
-- Name: TABLE rooms; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rooms TO atlas_user;


--
-- TOC entry 6687 (class 0 OID 0)
-- Dependencies: 231
-- Name: SEQUENCE rooms_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.rooms_id_seq TO atlas_user;


--
-- TOC entry 6689 (class 0 OID 0)
-- Dependencies: 296
-- Name: SEQUENCE rooms_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.rooms_id_seq1 TO atlas_user;


--
-- TOC entry 6690 (class 0 OID 0)
-- Dependencies: 232
-- Name: SEQUENCE software_licenses_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.software_licenses_id_seq TO atlas_user;


--
-- TOC entry 6691 (class 0 OID 0)
-- Dependencies: 291
-- Name: TABLE suppliers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.suppliers TO atlas_user;


--
-- TOC entry 6692 (class 0 OID 0)
-- Dependencies: 233
-- Name: SEQUENCE suppliers_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.suppliers_id_seq TO atlas_user;


--
-- TOC entry 6694 (class 0 OID 0)
-- Dependencies: 290
-- Name: SEQUENCE suppliers_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.suppliers_id_seq1 TO atlas_user;


--
-- TOC entry 6695 (class 0 OID 0)
-- Dependencies: 234
-- Name: SEQUENCE switches_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.switches_id_seq TO atlas_user;


--
-- TOC entry 6696 (class 0 OID 0)
-- Dependencies: 303
-- Name: TABLE system_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.system_settings TO atlas_user;


--
-- TOC entry 6698 (class 0 OID 0)
-- Dependencies: 302
-- Name: SEQUENCE system_settings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.system_settings_id_seq TO atlas_user;


--
-- TOC entry 6699 (class 0 OID 0)
-- Dependencies: 281
-- Name: TABLE ticket_attachments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ticket_attachments TO atlas_user;


--
-- TOC entry 6701 (class 0 OID 0)
-- Dependencies: 280
-- Name: SEQUENCE ticket_attachments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.ticket_attachments_id_seq TO atlas_user;


--
-- TOC entry 6702 (class 0 OID 0)
-- Dependencies: 279
-- Name: TABLE ticket_comments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ticket_comments TO atlas_user;


--
-- TOC entry 6704 (class 0 OID 0)
-- Dependencies: 278
-- Name: SEQUENCE ticket_comments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.ticket_comments_id_seq TO atlas_user;


--
-- TOC entry 6705 (class 0 OID 0)
-- Dependencies: 277
-- Name: TABLE tickets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tickets TO atlas_user;


--
-- TOC entry 6706 (class 0 OID 0)
-- Dependencies: 282
-- Name: TABLE ticket_overview; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ticket_overview TO atlas_user;


--
-- TOC entry 6707 (class 0 OID 0)
-- Dependencies: 235
-- Name: SEQUENCE tickets_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.tickets_id_seq TO atlas_user;


--
-- TOC entry 6709 (class 0 OID 0)
-- Dependencies: 276
-- Name: SEQUENCE tickets_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.tickets_id_seq1 TO atlas_user;


--
-- TOC entry 6710 (class 0 OID 0)
-- Dependencies: 275
-- Name: TABLE todos; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.todos TO atlas_user;


--
-- TOC entry 6711 (class 0 OID 0)
-- Dependencies: 236
-- Name: SEQUENCE todos_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.todos_id_seq TO atlas_user;


--
-- TOC entry 6713 (class 0 OID 0)
-- Dependencies: 274
-- Name: SEQUENCE todos_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.todos_id_seq1 TO atlas_user;


--
-- TOC entry 6720 (class 0 OID 0)
-- Dependencies: 257
-- Name: TABLE user_group_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_group_members TO atlas_user;


--
-- TOC entry 6722 (class 0 OID 0)
-- Dependencies: 256
-- Name: SEQUENCE user_group_members_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.user_group_members_id_seq TO atlas_user;


--
-- TOC entry 6730 (class 0 OID 0)
-- Dependencies: 255
-- Name: TABLE user_groups; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_groups TO atlas_user;


--
-- TOC entry 6732 (class 0 OID 0)
-- Dependencies: 254
-- Name: SEQUENCE user_groups_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.user_groups_id_seq TO atlas_user;


--
-- TOC entry 6733 (class 0 OID 0)
-- Dependencies: 245
-- Name: TABLE user_preferences; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_preferences TO atlas_user;


--
-- TOC entry 6735 (class 0 OID 0)
-- Dependencies: 244
-- Name: SEQUENCE user_preferences_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.user_preferences_id_seq TO atlas_user;


--
-- TOC entry 6736 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE user_profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_profiles TO atlas_user;


--
-- TOC entry 6738 (class 0 OID 0)
-- Dependencies: 242
-- Name: SEQUENCE user_profiles_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.user_profiles_id_seq TO atlas_user;


--
-- TOC entry 6743 (class 0 OID 0)
-- Dependencies: 391
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_roles TO atlas_user;


--
-- TOC entry 6744 (class 0 OID 0)
-- Dependencies: 237
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.users_id_seq TO atlas_user;


--
-- TOC entry 6746 (class 0 OID 0)
-- Dependencies: 240
-- Name: SEQUENCE users_id_seq1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.users_id_seq1 TO atlas_user;


--
-- TOC entry 6747 (class 0 OID 0)
-- Dependencies: 289
-- Name: TABLE vendors; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.vendors TO atlas_user;


--
-- TOC entry 6749 (class 0 OID 0)
-- Dependencies: 288
-- Name: SEQUENCE vendors_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.vendors_id_seq TO atlas_user;


--
-- TOC entry 2502 (class 826 OID 31005)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO atlas_user;


--
-- TOC entry 2501 (class 826 OID 31004)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO atlas_user;


-- Completed on 2025-04-22 17:51:59

--
-- PostgreSQL database dump complete
--

