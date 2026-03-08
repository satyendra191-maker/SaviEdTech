BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.roles (name, slug, description, is_system)
VALUES
    ('Student', 'student', 'Default learner role for enrolled students.', TRUE),
    ('Admin', 'admin', 'Administrative role for platform operators.', TRUE),
    ('Super Admin', 'super_admin', 'Highest privilege role for platform governance.', TRUE),
    ('Content Manager', 'content_manager', 'Content publishing and academic operations role.', TRUE),
    ('Parent', 'parent', 'Parent access role linked to student accounts.', TRUE),
    ('HR', 'hr', 'Careers and hiring operations role.', TRUE)
ON CONFLICT (slug) DO UPDATE
SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_system = EXCLUDED.is_system,
    updated_at = NOW();

ALTER TABLE IF EXISTS public.question_options
    ADD COLUMN IF NOT EXISTS is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE OR REPLACE VIEW public.users AS
SELECT
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.exam_target,
    p.class_level,
    p.city,
    p.state,
    COALESCE(p.is_active, TRUE) AS is_active,
    p.created_at,
    p.updated_at,
    p.last_active_at
FROM public.profiles AS p;

CREATE OR REPLACE VIEW public.options AS
SELECT
    qo.id,
    qo.question_id,
    qo.option_text,
    qo.option_image_url,
    qo.option_label,
    qo.display_order,
    qo.is_correct,
    qo.created_at
FROM public.question_options AS qo;

CREATE TABLE IF NOT EXISTS public.api_request_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
    error_type TEXT,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    cache_status TEXT NOT NULL DEFAULT 'bypass' CHECK (cache_status IN ('hit', 'miss', 'bypass', 'stale')),
    request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count > 0),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_slug
    ON public.roles(slug);

CREATE INDEX IF NOT EXISTS idx_roles_name
    ON public.roles(name);

CREATE INDEX IF NOT EXISTS idx_api_request_metrics_requested_at
    ON public.api_request_metrics(requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_request_metrics_endpoint_method
    ON public.api_request_metrics(endpoint, method, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_request_metrics_status
    ON public.api_request_metrics(status_code, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_request_metrics_duration
    ON public.api_request_metrics(duration_ms DESC);

CREATE INDEX IF NOT EXISTS idx_api_request_metrics_user_id
    ON public.api_request_metrics(user_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_lectures_topic_id
    ON public.lectures(topic_id);

CREATE INDEX IF NOT EXISTS idx_lectures_faculty_id
    ON public.lectures(faculty_id);

CREATE INDEX IF NOT EXISTS idx_lecture_progress_user_lecture
    ON public.lecture_progress(user_id, lecture_id);

CREATE INDEX IF NOT EXISTS idx_questions_topic_published
    ON public.questions(topic_id, is_published, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_dpp_questions_set_id
    ON public.dpp_questions(dpp_set_id);

CREATE INDEX IF NOT EXISTS idx_dpp_questions_question_id
    ON public.dpp_questions(question_id);

CREATE INDEX IF NOT EXISTS idx_tests_exam_published_schedule
    ON public.tests(exam_id, is_published, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_test_questions_test_id
    ON public.test_questions(test_id);

CREATE INDEX IF NOT EXISTS idx_test_questions_question_id
    ON public.test_questions(question_id);

CREATE INDEX IF NOT EXISTS idx_test_attempts_user_test_status
    ON public.test_attempts(user_id, test_id, status);

CREATE INDEX IF NOT EXISTS idx_student_progress_user_subject
    ON public.student_progress(user_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_rank_predictions_user_prediction_date
    ON public.rank_predictions(user_id, prediction_date DESC);

CREATE INDEX IF NOT EXISTS idx_payments_user_status_timestamp
    ON public.payments(user_id, status, "timestamp" DESC);

ALTER TABLE IF EXISTS public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.api_request_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roles_authenticated_read ON public.roles;
CREATE POLICY roles_authenticated_read ON public.roles
    FOR SELECT
    TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS roles_admin_manage ON public.roles;
CREATE POLICY roles_admin_manage ON public.roles
    FOR ALL
    USING (auth.role() = 'service_role' OR public.is_admin_user(auth.uid()))
    WITH CHECK (auth.role() = 'service_role' OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS api_request_metrics_admin_manage ON public.api_request_metrics;
CREATE POLICY api_request_metrics_admin_manage ON public.api_request_metrics
    FOR ALL
    USING (auth.role() = 'service_role' OR public.is_admin_user(auth.uid()))
    WITH CHECK (auth.role() = 'service_role' OR public.is_admin_user(auth.uid()));

CREATE OR REPLACE FUNCTION public.check_extension(extension_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.role() <> 'service_role' AND NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM pg_extension
        WHERE extname = extension_name
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_slow_queries(min_time NUMERIC DEFAULT 100)
RETURNS TABLE (
    queryid TEXT,
    query TEXT,
    calls BIGINT,
    total_time NUMERIC,
    mean_time NUMERIC,
    stddev_time NUMERIC,
    rows BIGINT,
    shared_blks_hit BIGINT,
    shared_blks_read BIGINT,
    temp_blks_written BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.role() <> 'service_role' AND NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
    ) THEN
        RETURN QUERY
        SELECT
            pgss.queryid::TEXT,
            pgss.query,
            pgss.calls,
            pgss.total_exec_time,
            pgss.mean_exec_time,
            pgss.stddev_exec_time,
            pgss.rows,
            pgss.shared_blks_hit,
            pgss.shared_blks_read,
            pgss.temp_blks_written
        FROM pg_stat_statements AS pgss
        WHERE pgss.mean_exec_time >= min_time
        ORDER BY pgss.mean_exec_time DESC
        LIMIT 100;
    ELSE
        RETURN QUERY
        SELECT
            md5(arm.method || ':' || arm.endpoint)::TEXT AS queryid,
            (arm.method || ' ' || arm.endpoint)::TEXT AS query,
            SUM(arm.request_count)::BIGINT AS calls,
            SUM(arm.duration_ms)::NUMERIC AS total_time,
            AVG(arm.duration_ms)::NUMERIC AS mean_time,
            COALESCE(stddev_pop(arm.duration_ms), 0)::NUMERIC AS stddev_time,
            SUM(arm.request_count)::BIGINT AS rows,
            0::BIGINT AS shared_blks_hit,
            0::BIGINT AS shared_blks_read,
            0::BIGINT AS temp_blks_written
        FROM public.api_request_metrics AS arm
        WHERE arm.requested_at >= NOW() - INTERVAL '24 hours'
          AND arm.duration_ms >= min_time
        GROUP BY arm.endpoint, arm.method
        ORDER BY AVG(arm.duration_ms) DESC
        LIMIT 100;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_table_scan_stats()
RETURNS TABLE (
    table_name TEXT,
    seq_scan BIGINT,
    idx_scan BIGINT,
    n_live_tup BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.role() <> 'service_role' AND NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    RETURN QUERY
    SELECT
        st.relname::TEXT AS table_name,
        COALESCE(st.seq_scan, 0)::BIGINT AS seq_scan,
        COALESCE(st.idx_scan, 0)::BIGINT AS idx_scan,
        COALESCE(st.n_live_tup, 0)::BIGINT AS n_live_tup
    FROM pg_stat_user_tables AS st
    WHERE st.schemaname = 'public'
    ORDER BY st.seq_scan DESC, st.relname ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_foreign_keys_without_indexes()
RETURNS TABLE (
    table_name TEXT,
    column_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.role() <> 'service_role' AND NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    RETURN QUERY
    SELECT
        rel.relname::TEXT AS table_name,
        attr.attname::TEXT AS column_name
    FROM pg_constraint AS con
    JOIN pg_class AS rel
        ON rel.oid = con.conrelid
    JOIN pg_namespace AS ns
        ON ns.oid = rel.relnamespace
    JOIN LATERAL unnest(con.conkey) AS conkey(attnum)
        ON TRUE
    JOIN pg_attribute AS attr
        ON attr.attrelid = rel.oid
       AND attr.attnum = conkey.attnum
    WHERE con.contype = 'f'
      AND ns.nspname = 'public'
      AND NOT EXISTS (
          SELECT 1
          FROM pg_index AS idx
          WHERE idx.indrelid = con.conrelid
            AND idx.indisvalid
            AND attr.attnum = ANY(string_to_array(idx.indkey::TEXT, ' ')::SMALLINT[])
      )
    ORDER BY rel.relname ASC, attr.attname ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_table_performance_stats()
RETURNS TABLE (
    table_name TEXT,
    n_live_tup BIGINT,
    total_bytes BIGINT,
    seq_scan BIGINT,
    idx_scan BIGINT,
    n_dead_tup BIGINT,
    bloat_ratio NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.role() <> 'service_role' AND NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    RETURN QUERY
    SELECT
        st.relname::TEXT AS table_name,
        COALESCE(st.n_live_tup, 0)::BIGINT AS n_live_tup,
        pg_total_relation_size(format('public.%I', st.relname)::REGCLASS) AS total_bytes,
        COALESCE(st.seq_scan, 0)::BIGINT AS seq_scan,
        COALESCE(st.idx_scan, 0)::BIGINT AS idx_scan,
        COALESCE(st.n_dead_tup, 0)::BIGINT AS n_dead_tup,
        CASE
            WHEN COALESCE(st.n_live_tup, 0) + COALESCE(st.n_dead_tup, 0) = 0 THEN 0
            ELSE ROUND(
                COALESCE(st.n_dead_tup, 0)::NUMERIC
                / NULLIF(COALESCE(st.n_live_tup, 0) + COALESCE(st.n_dead_tup, 0), 0),
                4
            )
        END AS bloat_ratio
    FROM pg_stat_user_tables AS st
    WHERE st.schemaname = 'public'
    ORDER BY total_bytes DESC, table_name ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cache_stats()
RETURNS TABLE (
    cache_hits BIGINT,
    cache_misses BIGINT,
    avg_cache_time NUMERIC,
    avg_db_time NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.role() <> 'service_role' AND NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    RETURN QUERY
    SELECT
        COALESCE(SUM(st.heap_blks_hit), 0)::BIGINT AS cache_hits,
        COALESCE(SUM(st.heap_blks_read), 0)::BIGINT AS cache_misses,
        COALESCE((
            SELECT ROUND(AVG(arm.duration_ms)::NUMERIC, 2)
            FROM public.api_request_metrics AS arm
            WHERE arm.requested_at >= NOW() - INTERVAL '24 hours'
              AND arm.cache_status = 'hit'
        ), 0)::NUMERIC AS avg_cache_time,
        COALESCE((
            SELECT ROUND(AVG(arm.duration_ms)::NUMERIC, 2)
            FROM public.api_request_metrics AS arm
            WHERE arm.requested_at >= NOW() - INTERVAL '24 hours'
              AND arm.cache_status IN ('miss', 'bypass', 'stale')
        ), 0)::NUMERIC AS avg_db_time
    FROM pg_statio_user_tables AS st
    WHERE st.schemaname = 'public';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_frequent_queries()
RETURNS TABLE (
    query_pattern TEXT,
    frequency BIGINT,
    avg_time NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.role() <> 'service_role' AND NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    RETURN QUERY
    SELECT
        (arm.method || ' ' || arm.endpoint)::TEXT AS query_pattern,
        SUM(arm.request_count)::BIGINT AS frequency,
        ROUND(AVG(arm.duration_ms)::NUMERIC, 2) AS avg_time
    FROM public.api_request_metrics AS arm
    WHERE arm.requested_at >= NOW() - INTERVAL '24 hours'
    GROUP BY arm.endpoint, arm.method
    HAVING SUM(arm.request_count) >= 10
    ORDER BY frequency DESC, avg_time DESC
    LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_api_performance_stats(p_hours INTEGER DEFAULT 24)
RETURNS TABLE (
    endpoint TEXT,
    method TEXT,
    total_requests BIGINT,
    avg_response_time NUMERIC,
    p50_response_time NUMERIC,
    p95_response_time NUMERIC,
    p99_response_time NUMERIC,
    error_count BIGINT,
    requests_per_minute NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.role() <> 'service_role' AND NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    RETURN QUERY
    SELECT
        arm.endpoint,
        arm.method,
        SUM(arm.request_count)::BIGINT AS total_requests,
        ROUND(AVG(arm.duration_ms)::NUMERIC, 2) AS avg_response_time,
        ROUND(percentile_cont(0.50) WITHIN GROUP (ORDER BY arm.duration_ms)::NUMERIC, 2) AS p50_response_time,
        ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY arm.duration_ms)::NUMERIC, 2) AS p95_response_time,
        ROUND(percentile_cont(0.99) WITHIN GROUP (ORDER BY arm.duration_ms)::NUMERIC, 2) AS p99_response_time,
        COUNT(*) FILTER (WHERE arm.status_code >= 400 OR arm.error_type IS NOT NULL)::BIGINT AS error_count,
        ROUND(
            (SUM(arm.request_count)::NUMERIC / GREATEST(COALESCE(p_hours, 24), 1)) / 60,
            2
        ) AS requests_per_minute
    FROM public.api_request_metrics AS arm
    WHERE arm.requested_at >= NOW() - make_interval(hours => GREATEST(COALESCE(p_hours, 24), 1))
    GROUP BY arm.endpoint, arm.method
    ORDER BY p95_response_time DESC NULLS LAST, total_requests DESC
    LIMIT 100;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_platform_performance_snapshot(p_hours INTEGER DEFAULT 24)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_connections JSONB;
    v_queries JSONB;
    v_api JSONB;
    v_error_summary JSONB;
    v_health_summary JSONB;
    v_table_summary JSONB;
BEGIN
    IF auth.role() <> 'service_role' AND NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    SELECT COALESCE(to_jsonb(connection_stats), '{}'::JSONB)
    INTO v_connections
    FROM (
        SELECT *
        FROM public.get_connection_stats()
    ) AS connection_stats;

    SELECT COALESCE(to_jsonb(query_stats), '{}'::JSONB)
    INTO v_queries
    FROM (
        SELECT *
        FROM public.get_query_stats()
    ) AS query_stats;

    SELECT COALESCE(jsonb_agg(to_jsonb(api_stats)), '[]'::JSONB)
    INTO v_api
    FROM (
        SELECT *
        FROM public.get_api_performance_stats(GREATEST(COALESCE(p_hours, 24), 1))
        LIMIT 20
    ) AS api_stats;

    SELECT jsonb_build_object(
        'total', COALESCE(COUNT(*), 0),
        'top_types', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'error_type', error_group.error_type,
                        'count', error_group.error_count
                    )
                )
                FROM (
                    SELECT
                        el.error_type,
                        COUNT(*) AS error_count
                    FROM public.error_logs AS el
                    WHERE el.occurred_at >= NOW() - make_interval(hours => GREATEST(COALESCE(p_hours, 24), 1))
                    GROUP BY el.error_type
                    ORDER BY error_count DESC, el.error_type ASC
                    LIMIT 10
                ) AS error_group
            ),
            '[]'::JSONB
        )
    )
    INTO v_error_summary
    FROM public.error_logs AS error_window
    WHERE error_window.occurred_at >= NOW() - make_interval(hours => GREATEST(COALESCE(p_hours, 24), 1));

    SELECT jsonb_build_object(
        'recent_checks', COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'check_name', recent_health.check_name,
                    'status', recent_health.status,
                    'response_time_ms', recent_health.response_time_ms,
                    'error_count', recent_health.error_count,
                    'checked_at', recent_health.checked_at
                )
                ORDER BY recent_health.checked_at DESC
            ),
            '[]'::JSONB
        )
    )
    INTO v_health_summary
    FROM (
        SELECT
            sh.check_name,
            sh.status,
            sh.response_time_ms,
            sh.error_count,
            sh.checked_at
        FROM public.system_health AS sh
        WHERE sh.checked_at >= NOW() - make_interval(hours => GREATEST(COALESCE(p_hours, 24), 1))
        ORDER BY sh.checked_at DESC
        LIMIT 20
    ) AS recent_health;

    SELECT jsonb_build_object(
        'largest', COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'table_name', sized_tables.table_name,
                    'row_count', sized_tables.row_count,
                    'size_bytes', sized_tables.size_bytes
                )
                ORDER BY sized_tables.size_bytes DESC
            ),
            '[]'::JSONB
        )
    )
    INTO v_table_summary
    FROM (
        SELECT *
        FROM public.get_table_stats()
        LIMIT 15
    ) AS sized_tables;

    RETURN jsonb_build_object(
        'generated_at', NOW(),
        'window_hours', GREATEST(COALESCE(p_hours, 24), 1),
        'connections', COALESCE(v_connections, '{}'::JSONB),
        'queries', COALESCE(v_queries, '{}'::JSONB),
        'api', COALESCE(v_api, '[]'::JSONB),
        'errors', COALESCE(v_error_summary, '{}'::JSONB),
        'health', COALESCE(v_health_summary, '{}'::JSONB),
        'tables', COALESCE(v_table_summary, '{}'::JSONB)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_platform_schema()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.role() <> 'service_role' AND NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    RETURN (
        WITH expected_entities AS (
            SELECT *
            FROM jsonb_to_recordset($json$
            [
              {"name":"users","kind":"view","columns":{"id":"uuid","email":"text","role":"text"}},
              {"name":"roles","kind":"table","columns":{"id":"uuid","name":"text","slug":"text"}},
              {"name":"lectures","kind":"table","columns":{"id":"uuid","topic_id":"uuid","faculty_id":"uuid","title":"text","is_published":"boolean"}},
              {"name":"lecture_progress","kind":"table","columns":{"id":"uuid","user_id":"uuid","lecture_id":"uuid","progress_percent":"numeric"}},
              {"name":"questions","kind":"table","columns":{"id":"uuid","topic_id":"uuid","question_text":"text","correct_answer":"text"}},
              {"name":"question_options","kind":"table","columns":{"id":"uuid","question_id":"uuid","option_text":"text","display_order":"integer"}},
              {"name":"dpp_sets","kind":"table","columns":{"id":"uuid","title":"text","total_questions":"integer","is_published":"boolean"}},
              {"name":"dpp_questions","kind":"table","columns":{"id":"uuid","dpp_set_id":"uuid","question_id":"uuid"}},
              {"name":"tests","kind":"table","columns":{"id":"uuid","title":"text","exam_id":"uuid","question_count":"integer","is_published":"boolean"}},
              {"name":"test_questions","kind":"table","columns":{"id":"uuid","test_id":"uuid","question_id":"uuid"}},
              {"name":"test_attempts","kind":"table","columns":{"id":"uuid","user_id":"uuid","test_id":"uuid","status":"text"}},
              {"name":"student_progress","kind":"table","columns":{"id":"uuid","user_id":"uuid","subject_id":"uuid","accuracy_percent":"numeric"}},
              {"name":"rank_predictions","kind":"table","columns":{"id":"uuid","user_id":"uuid","exam_id":"uuid","prediction_date":"date"}},
              {"name":"payments","kind":"table","columns":{"id":"uuid","user_id":"uuid","amount":"numeric","status":"text","payment_type":"text"}},
              {"name":"donations","kind":"table","columns":{"id":"uuid","amount":"numeric","status":"text","created_at":"timestamp with time zone"}},
              {"name":"career_applications","kind":"table","columns":{"id":"uuid","email":"text","position":"text","status":"text","submitted_at":"timestamp with time zone"}},
              {"name":"popup_ads","kind":"table","columns":{"id":"uuid","ad_title":"text","ad_message":"text","start_date":"timestamp with time zone","end_date":"timestamp with time zone","is_active":"boolean"}},
              {"name":"notifications","kind":"table","columns":{"id":"uuid","title":"text","message":"text","type":"text","created_at":"timestamp with time zone","is_active":"boolean"}}
            ]
            $json$::JSONB) AS entity(name TEXT, kind TEXT, columns JSONB)
        ),
        expected_columns AS (
            SELECT
                e.name,
                e.kind,
                col.key AS column_name,
                col.value::TEXT AS expected_type
            FROM expected_entities AS e
            CROSS JOIN LATERAL jsonb_each_text(e.columns) AS col
        ),
        actual_relations AS (
            SELECT
                cls.relname AS name,
                CASE
                    WHEN cls.relkind IN ('r', 'p') THEN 'table'
                    WHEN cls.relkind = 'v' THEN 'view'
                    WHEN cls.relkind = 'm' THEN 'materialized_view'
                    ELSE cls.relkind::TEXT
                END AS actual_kind,
                cls.relrowsecurity AS rls_enabled
            FROM pg_class AS cls
            JOIN pg_namespace AS ns
                ON ns.oid = cls.relnamespace
            WHERE ns.nspname = 'public'
        ),
        actual_columns AS (
            SELECT
                cols.table_name AS name,
                cols.column_name,
                CASE
                    WHEN cols.data_type = 'ARRAY' THEN regexp_replace(cols.udt_name, '^_', '') || '[]'
                    WHEN cols.data_type = 'USER-DEFINED' THEN cols.udt_name
                    ELSE cols.data_type
                END AS actual_type
            FROM information_schema.columns AS cols
            WHERE cols.table_schema = 'public'
        ),
        entity_rows AS (
            SELECT
                e.name,
                e.kind AS expected_kind,
                (ar.name IS NOT NULL) AS exists,
                ar.actual_kind,
                CASE
                    WHEN e.kind = 'table' THEN COALESCE(ar.rls_enabled, FALSE)
                    ELSE NULL
                END AS rls_enabled,
                COALESCE(
                    (
                        SELECT jsonb_agg(ec.column_name ORDER BY ec.column_name)
                        FROM expected_columns AS ec
                        LEFT JOIN actual_columns AS ac
                            ON ac.name = ec.name
                           AND ac.column_name = ec.column_name
                        WHERE ec.name = e.name
                          AND ac.column_name IS NULL
                    ),
                    '[]'::JSONB
                ) AS missing_columns,
                COALESCE(
                    (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'column', ec.column_name,
                                'expected', ec.expected_type,
                                'actual', ac.actual_type
                            )
                            ORDER BY ec.column_name
                        )
                        FROM expected_columns AS ec
                        JOIN actual_columns AS ac
                            ON ac.name = ec.name
                           AND ac.column_name = ec.column_name
                        WHERE ec.name = e.name
                          AND lower(ac.actual_type) <> lower(ec.expected_type)
                    ),
                    '[]'::JSONB
                ) AS type_mismatches
            FROM expected_entities AS e
            LEFT JOIN actual_relations AS ar
                ON ar.name = e.name
        ),
        expected_foreign_keys AS (
            SELECT *
            FROM (
                VALUES
                    ('lecture_progress', 'user_id', 'profiles', 'id'),
                    ('lecture_progress', 'lecture_id', 'lectures', 'id'),
                    ('lectures', 'topic_id', 'topics', 'id'),
                    ('lectures', 'faculty_id', 'faculties', 'id'),
                    ('questions', 'topic_id', 'topics', 'id'),
                    ('question_options', 'question_id', 'questions', 'id'),
                    ('dpp_questions', 'dpp_set_id', 'dpp_sets', 'id'),
                    ('dpp_questions', 'question_id', 'questions', 'id'),
                    ('tests', 'exam_id', 'exams', 'id'),
                    ('test_questions', 'test_id', 'tests', 'id'),
                    ('test_questions', 'question_id', 'questions', 'id'),
                    ('test_attempts', 'user_id', 'profiles', 'id'),
                    ('test_attempts', 'test_id', 'tests', 'id'),
                    ('student_progress', 'user_id', 'profiles', 'id'),
                    ('student_progress', 'subject_id', 'subjects', 'id'),
                    ('rank_predictions', 'user_id', 'profiles', 'id'),
                    ('rank_predictions', 'exam_id', 'exams', 'id'),
                    ('payments', 'user_id', 'profiles', 'id'),
                    ('notifications', 'user_id', 'profiles', 'id'),
                    ('popup_ads', 'created_by', 'profiles', 'id')
            ) AS fk(table_name, column_name, referenced_table, referenced_column)
        ),
        actual_foreign_keys AS (
            SELECT
                child_rel.relname::TEXT AS table_name,
                child_attr.attname::TEXT AS column_name,
                parent_rel.relname::TEXT AS referenced_table,
                parent_attr.attname::TEXT AS referenced_column
            FROM pg_constraint AS con
            JOIN pg_class AS child_rel
                ON child_rel.oid = con.conrelid
            JOIN pg_namespace AS child_ns
                ON child_ns.oid = child_rel.relnamespace
            JOIN pg_class AS parent_rel
                ON parent_rel.oid = con.confrelid
            JOIN LATERAL unnest(con.conkey, con.confkey) AS keymap(child_attnum, parent_attnum)
                ON TRUE
            JOIN pg_attribute AS child_attr
                ON child_attr.attrelid = child_rel.oid
               AND child_attr.attnum = keymap.child_attnum
            JOIN pg_attribute AS parent_attr
                ON parent_attr.attrelid = parent_rel.oid
               AND parent_attr.attnum = keymap.parent_attnum
            WHERE con.contype = 'f'
              AND child_ns.nspname = 'public'
        ),
        foreign_key_rows AS (
            SELECT
                efk.table_name,
                efk.column_name,
                efk.referenced_table,
                efk.referenced_column,
                EXISTS (
                    SELECT 1
                    FROM actual_foreign_keys AS afk
                    WHERE afk.table_name = efk.table_name
                      AND afk.column_name = efk.column_name
                      AND afk.referenced_table = efk.referenced_table
                      AND afk.referenced_column = efk.referenced_column
                ) AS exists
            FROM expected_foreign_keys AS efk
        ),
        expected_indexes AS (
            SELECT *
            FROM (
                VALUES
                    ('idx_roles_slug', 'roles', ARRAY['slug']::TEXT[]),
                    ('idx_lectures_topic_id', 'lectures', ARRAY['topic_id']::TEXT[]),
                    ('idx_lectures_faculty_id', 'lectures', ARRAY['faculty_id']::TEXT[]),
                    ('idx_lecture_progress_user_lecture', 'lecture_progress', ARRAY['user_id', 'lecture_id']::TEXT[]),
                    ('idx_questions_topic_published', 'questions', ARRAY['topic_id', 'is_published', 'updated_at']::TEXT[]),
                    ('idx_question_options_question_display', 'question_options', ARRAY['question_id', 'display_order']::TEXT[]),
                    ('idx_dpp_questions_set_id', 'dpp_questions', ARRAY['dpp_set_id']::TEXT[]),
                    ('idx_dpp_questions_question_id', 'dpp_questions', ARRAY['question_id']::TEXT[]),
                    ('idx_tests_exam_published_schedule', 'tests', ARRAY['exam_id', 'is_published', 'scheduled_at']::TEXT[]),
                    ('idx_test_questions_test_id', 'test_questions', ARRAY['test_id']::TEXT[]),
                    ('idx_test_questions_question_id', 'test_questions', ARRAY['question_id']::TEXT[]),
                    ('idx_test_attempts_user_test_status', 'test_attempts', ARRAY['user_id', 'test_id', 'status']::TEXT[]),
                    ('idx_student_progress_user_subject', 'student_progress', ARRAY['user_id', 'subject_id']::TEXT[]),
                    ('idx_rank_predictions_user_prediction_date', 'rank_predictions', ARRAY['user_id', 'prediction_date']::TEXT[]),
                    ('idx_payments_user_status_timestamp', 'payments', ARRAY['user_id', 'status', 'timestamp']::TEXT[]),
                    ('idx_notifications_active_created', 'notifications', ARRAY['is_active', 'created_at']::TEXT[]),
                    ('idx_popup_ads_active_window', 'popup_ads', ARRAY['is_active', 'start_date', 'end_date']::TEXT[]),
                    ('idx_api_request_metrics_endpoint_method', 'api_request_metrics', ARRAY['endpoint', 'method', 'requested_at']::TEXT[])
            ) AS idx(index_name, table_name, columns)
        ),
        actual_indexes AS (
            SELECT
                idx.indexname::TEXT AS index_name,
                idx.tablename::TEXT AS table_name
            FROM pg_indexes AS idx
            WHERE idx.schemaname = 'public'
        ),
        index_rows AS (
            SELECT
                ei.index_name,
                ei.table_name,
                ei.columns,
                EXISTS (
                    SELECT 1
                    FROM actual_indexes AS ai
                    WHERE ai.index_name = ei.index_name
                      AND ai.table_name = ei.table_name
                ) AS exists
            FROM expected_indexes AS ei
        ),
        summary AS (
            SELECT
                COUNT(*)::INTEGER AS total_entities,
                COUNT(*) FILTER (WHERE exists)::INTEGER AS existing_entities,
                COUNT(*) FILTER (WHERE NOT exists)::INTEGER AS missing_entities,
                COUNT(*) FILTER (
                    WHERE exists
                      AND actual_kind = expected_kind
                      AND jsonb_array_length(missing_columns) = 0
                      AND jsonb_array_length(type_mismatches) = 0
                      AND (
                          expected_kind <> 'table'
                          OR COALESCE(rls_enabled, FALSE) = TRUE
                      )
                )::INTEGER AS valid_entities,
                COALESCE(SUM(jsonb_array_length(missing_columns)), 0)::INTEGER AS missing_columns,
                COALESCE(SUM(jsonb_array_length(type_mismatches)), 0)::INTEGER AS type_mismatches,
                COUNT(*) FILTER (WHERE exists = FALSE)::INTEGER AS missing_tables,
                COUNT(*) FILTER (WHERE expected_kind = 'table' AND COALESCE(rls_enabled, FALSE) = FALSE)::INTEGER AS rls_disabled,
                (SELECT COUNT(*) FILTER (WHERE exists = FALSE)::INTEGER FROM foreign_key_rows) AS missing_foreign_keys,
                (SELECT COUNT(*) FILTER (WHERE exists = FALSE)::INTEGER FROM index_rows) AS missing_indexes
            FROM entity_rows
        )
        SELECT jsonb_build_object(
            'generated_at', NOW(),
            'valid',
                (
                    summary.missing_tables = 0
                    AND summary.missing_columns = 0
                    AND summary.type_mismatches = 0
                    AND summary.missing_foreign_keys = 0
                    AND summary.missing_indexes = 0
                    AND summary.rls_disabled = 0
                ),
            'summary', jsonb_build_object(
                'total_entities', summary.total_entities,
                'existing_entities', summary.existing_entities,
                'valid_entities', summary.valid_entities,
                'missing_tables', summary.missing_tables,
                'missing_columns', summary.missing_columns,
                'type_mismatches', summary.type_mismatches,
                'missing_foreign_keys', summary.missing_foreign_keys,
                'missing_indexes', summary.missing_indexes,
                'rls_disabled', summary.rls_disabled
            ),
            'tables',
                COALESCE(
                    (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'name', er.name,
                                'expected_kind', er.expected_kind,
                                'actual_kind', er.actual_kind,
                                'exists', er.exists,
                                'kind_matches', (er.actual_kind = er.expected_kind),
                                'rls_enabled', er.rls_enabled,
                                'missing_columns', er.missing_columns,
                                'type_mismatches', er.type_mismatches
                            )
                            ORDER BY er.name
                        )
                        FROM entity_rows AS er
                    ),
                    '[]'::JSONB
                ),
            'foreign_keys',
                COALESCE(
                    (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'table', fkr.table_name,
                                'column', fkr.column_name,
                                'references', fkr.referenced_table || '.' || fkr.referenced_column,
                                'exists', fkr.exists
                            )
                            ORDER BY fkr.table_name, fkr.column_name
                        )
                        FROM foreign_key_rows AS fkr
                    ),
                    '[]'::JSONB
                ),
            'indexes',
                COALESCE(
                    (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'name', ir.index_name,
                                'table', ir.table_name,
                                'columns', ir.columns,
                                'exists', ir.exists
                            )
                            ORDER BY ir.table_name, ir.index_name
                        )
                        FROM index_rows AS ir
                    ),
                    '[]'::JSONB
                )
        )
        FROM summary
    );
END;
$$;

COMMIT;
