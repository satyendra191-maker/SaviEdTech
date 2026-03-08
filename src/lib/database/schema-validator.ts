/**
 * Database Schema Validation System
 * Part of Feature 21: Database Validation System
 */

export const REQUIRED_TABLES = [
    'users',
    'roles',
    'lectures',
    'lecture_progress',
    'questions',
    'question_options',
    'dpp_sets',
    'dpp_questions',
    'tests',
    'test_questions',
    'test_attempts',
    'student_progress',
    'rank_predictions',
    'payments',
    'donations',
    'career_applications',
    'popup_ads',
    'notifications',
] as const;

export const RECOMMENDED_INDEXES = [
    { table: 'roles', columns: ['slug'], name: 'idx_roles_slug' },
    { table: 'lectures', columns: ['topic_id'], name: 'idx_lectures_topic_id' },
    { table: 'lectures', columns: ['faculty_id'], name: 'idx_lectures_faculty_id' },
    { table: 'lecture_progress', columns: ['user_id', 'lecture_id'], name: 'idx_lecture_progress_user_lecture' },
    { table: 'questions', columns: ['topic_id', 'is_published', 'updated_at'], name: 'idx_questions_topic_published' },
    { table: 'question_options', columns: ['question_id', 'display_order'], name: 'idx_question_options_question_display' },
    { table: 'dpp_questions', columns: ['dpp_set_id'], name: 'idx_dpp_questions_set_id' },
    { table: 'dpp_questions', columns: ['question_id'], name: 'idx_dpp_questions_question_id' },
    { table: 'tests', columns: ['exam_id', 'is_published', 'scheduled_at'], name: 'idx_tests_exam_published_schedule' },
    { table: 'test_questions', columns: ['test_id'], name: 'idx_test_questions_test_id' },
    { table: 'test_questions', columns: ['question_id'], name: 'idx_test_questions_question_id' },
    { table: 'test_attempts', columns: ['user_id', 'test_id', 'status'], name: 'idx_test_attempts_user_test_status' },
    { table: 'student_progress', columns: ['user_id', 'subject_id'], name: 'idx_student_progress_user_subject' },
    { table: 'rank_predictions', columns: ['user_id', 'prediction_date'], name: 'idx_rank_predictions_user_prediction_date' },
    { table: 'payments', columns: ['user_id', 'status', 'timestamp'], name: 'idx_payments_user_status_timestamp' },
    { table: 'notifications', columns: ['is_active', 'created_at'], name: 'idx_notifications_active_created' },
    { table: 'popup_ads', columns: ['is_active', 'start_date', 'end_date'], name: 'idx_popup_ads_active_window' },
    { table: 'api_request_metrics', columns: ['endpoint', 'method', 'requested_at'], name: 'idx_api_request_metrics_endpoint_method' },
] as const;

export interface SchemaValidationTable {
    name: string;
    expectedKind: string;
    actualKind: string | null;
    exists: boolean;
    kindMatches: boolean;
    rlsEnabled: boolean | null;
    missingColumns: string[];
    typeMismatches: Array<{
        column: string;
        expected: string;
        actual: string;
    }>;
}

export interface SchemaValidationForeignKey {
    table: string;
    column: string;
    references: string;
    exists: boolean;
}

export interface SchemaValidationIndex {
    name: string;
    table: string;
    columns: string[];
    exists: boolean;
}

export interface SchemaValidationResult {
    valid: boolean;
    tables: SchemaValidationTable[];
    foreignKeys: SchemaValidationForeignKey[];
    indexes: SchemaValidationIndex[];
    summary: {
        totalEntities: number;
        existingEntities: number;
        validEntities: number;
        missingTables: number;
        missingColumns: number;
        typeMismatches: number;
        missingForeignKeys: number;
        missingIndexes: number;
        rlsDisabled: number;
    };
    timestamp: string;
}

let cachedValidationResult: SchemaValidationResult | null = null;
let cachedValidationAt = 0;
const VALIDATION_CACHE_TTL_MS = 2 * 60 * 1000;

function createEmptyResult(): SchemaValidationResult {
    return {
        valid: false,
        tables: [],
        foreignKeys: [],
        indexes: [],
        summary: {
            totalEntities: REQUIRED_TABLES.length,
            existingEntities: 0,
            validEntities: 0,
            missingTables: REQUIRED_TABLES.length,
            missingColumns: 0,
            typeMismatches: 0,
            missingForeignKeys: 0,
            missingIndexes: RECOMMENDED_INDEXES.length,
            rlsDisabled: 0,
        },
        timestamp: new Date().toISOString(),
    };
}

function normalizeValidationPayload(payload: unknown): SchemaValidationResult {
    const data = (payload || {}) as Record<string, unknown>;
    const summary = (data.summary || {}) as Record<string, unknown>;

    return {
        valid: Boolean(data.valid),
        timestamp: typeof data.generated_at === 'string'
            ? data.generated_at
            : new Date().toISOString(),
        tables: Array.isArray(data.tables)
            ? data.tables.map((table) => {
                const entry = table as Record<string, unknown>;

                return {
                    name: String(entry.name || ''),
                    expectedKind: String(entry.expected_kind || 'table'),
                    actualKind: entry.actual_kind ? String(entry.actual_kind) : null,
                    exists: Boolean(entry.exists),
                    kindMatches: Boolean(entry.kind_matches),
                    rlsEnabled: typeof entry.rls_enabled === 'boolean' ? entry.rls_enabled : null,
                    missingColumns: Array.isArray(entry.missing_columns)
                        ? entry.missing_columns.map((column) => String(column))
                        : [],
                    typeMismatches: Array.isArray(entry.type_mismatches)
                        ? entry.type_mismatches.map((mismatch) => {
                            const item = mismatch as Record<string, unknown>;

                            return {
                                column: String(item.column || ''),
                                expected: String(item.expected || ''),
                                actual: String(item.actual || ''),
                            };
                        })
                        : [],
                };
            })
            : [],
        foreignKeys: Array.isArray(data.foreign_keys)
            ? data.foreign_keys.map((foreignKey) => {
                const entry = foreignKey as Record<string, unknown>;

                return {
                    table: String(entry.table || ''),
                    column: String(entry.column || ''),
                    references: String(entry.references || ''),
                    exists: Boolean(entry.exists),
                };
            })
            : [],
        indexes: Array.isArray(data.indexes)
            ? data.indexes.map((index) => {
                const entry = index as Record<string, unknown>;

                return {
                    name: String(entry.name || ''),
                    table: String(entry.table || ''),
                    columns: Array.isArray(entry.columns)
                        ? entry.columns.map((column) => String(column))
                        : [],
                    exists: Boolean(entry.exists),
                };
            })
            : [],
        summary: {
            totalEntities: Number(summary.total_entities || REQUIRED_TABLES.length),
            existingEntities: Number(summary.existing_entities || 0),
            validEntities: Number(summary.valid_entities || 0),
            missingTables: Number(summary.missing_tables || 0),
            missingColumns: Number(summary.missing_columns || 0),
            typeMismatches: Number(summary.type_mismatches || 0),
            missingForeignKeys: Number(summary.missing_foreign_keys || 0),
            missingIndexes: Number(summary.missing_indexes || 0),
            rlsDisabled: Number(summary.rls_disabled || 0),
        },
    };
}

async function fallbackValidateDatabaseSchema(): Promise<SchemaValidationResult> {
    const { createAdminSupabaseClient } = await import('@/lib/supabase');
    const result = createEmptyResult();
    const supabase = createAdminSupabaseClient();

    for (const tableName of REQUIRED_TABLES) {
        try {
            const query = supabase.from(tableName as never) as unknown as {
                select: (
                    columns: string,
                    options?: { head?: boolean; count?: 'exact' }
                ) => Promise<{ error: { message?: string } | null }>;
            };
            const { error } = await query.select('*', { head: true, count: 'exact' });
            const exists = !error;

            result.tables.push({
                name: tableName,
                expectedKind: tableName === 'users' ? 'view' : 'table',
                actualKind: exists ? (tableName === 'users' ? 'view' : 'table') : null,
                exists,
                kindMatches: exists,
                rlsEnabled: tableName === 'users' ? null : exists,
                missingColumns: [],
                typeMismatches: [],
            });
        } catch (error) {
            result.tables.push({
                name: tableName,
                expectedKind: tableName === 'users' ? 'view' : 'table',
                actualKind: null,
                exists: false,
                kindMatches: false,
                rlsEnabled: tableName === 'users' ? null : false,
                missingColumns: [],
                typeMismatches: [{
                    column: '',
                    expected: '',
                    actual: error instanceof Error ? error.message : 'Unknown error',
                }],
            });
        }
    }

    result.summary.existingEntities = result.tables.filter((table) => table.exists).length;
    result.summary.validEntities = result.tables.filter((table) => table.exists).length;
    result.summary.missingTables = result.tables.filter((table) => !table.exists).length;
    result.summary.missingIndexes = RECOMMENDED_INDEXES.length;
    result.valid = result.summary.missingTables === 0;

    return result;
}

export async function validateDatabaseSchema(options?: {
    forceRefresh?: boolean;
}): Promise<SchemaValidationResult> {
    const shouldUseCache = !options?.forceRefresh
        && cachedValidationResult
        && (Date.now() - cachedValidationAt) < VALIDATION_CACHE_TTL_MS;

    if (shouldUseCache && cachedValidationResult) {
        return cachedValidationResult;
    }

    const { createAdminSupabaseClient } = await import('@/lib/supabase');

    try {
        const supabase = createAdminSupabaseClient();
        const { data, error } = await supabase.rpc('validate_platform_schema' as never);

        if (error) {
            throw error;
        }

        const result = normalizeValidationPayload(data);
        cachedValidationResult = result;
        cachedValidationAt = Date.now();

        return result;
    } catch (error) {
        console.error('[SchemaValidation] Falling back to basic validation:', error);
        const fallbackResult = await fallbackValidateDatabaseSchema();
        cachedValidationResult = fallbackResult;
        cachedValidationAt = Date.now();

        return fallbackResult;
    }
}

export function getQueryHints(tableName: string, operation: 'select' | 'insert' | 'update' | 'delete'): string[] {
    const hints: Record<string, Record<string, string[]>> = {
        lectures: {
            select: [
                'Use topic and faculty indexes when filtering lecture feeds.',
                'Filter published content to avoid full-table dashboard scans.',
            ],
            insert: ['Batch lecture writes when importing content.'],
            update: ['Prefer targeted updates by primary key.'],
            delete: ['Soft-unpublish lectures instead of deleting historical content.'],
        },
        questions: {
            select: [
                'Filter by topic_id or publication state to use the composite question index.',
                'Avoid SELECT * for large practice bank queries.',
            ],
            insert: ['Insert practice questions in batches when syncing content.'],
            update: ['Update answer metadata atomically with the question row.'],
            delete: ['Archive or unpublish questions instead of deleting them.'],
        },
        tests: {
            select: [
                'Filter by exam_id and publish state to use the scheduling index.',
                'Sort scheduled tests by scheduled_at to reuse indexed order.',
            ],
            insert: ['Set scheduling fields during creation to avoid follow-up writes.'],
            update: ['Use targeted updates on published test windows.'],
            delete: ['Retain completed tests for analytics and history.'],
        },
        test_attempts: {
            select: [
                'Use the composite (user_id, test_id, status) index for attempt lookups.',
                'Paginate student history instead of loading all attempts.',
            ],
            insert: ['Insert attempts once and update status progressively.'],
            update: ['Update completion metadata in a single write when possible.'],
            delete: ['Keep attempts for audit and rank prediction workflows.'],
        },
        payments: {
            select: [
                'Filter by user_id and status to use the payment timeline index.',
                'Prefer timestamp ordering for payment dashboards.',
            ],
            insert: ['Write gateway identifiers with the initial payment row.'],
            update: ['Use id or razorpay_order_id for targeted payment reconciliation.'],
            delete: ['Never delete payment records; mark them refunded or cancelled.'],
        },
    };

    return hints[tableName]?.[operation] || ['No specific hints available.'];
}

export interface QueryAnalysis {
    table: string;
    operation: string;
    filters: string[];
    suggestedIndexes: string[];
    warnings: string[];
}

export function analyzeQuery(table: string, filters: string[]): QueryAnalysis {
    const analysis: QueryAnalysis = {
        table,
        operation: 'SELECT',
        filters,
        suggestedIndexes: [],
        warnings: [],
    };

    if (filters.length === 0) {
        analysis.warnings.push('No filters detected. Large table scans are likely.');
    }

    const indexSuggestions: Record<string, string[]> = {
        user_id: ['idx_{table}_user_id'],
        topic_id: ['idx_{table}_topic_id'],
        test_id: ['idx_{table}_test_id'],
        lecture_id: ['idx_{table}_lecture_id'],
        exam_id: ['idx_{table}_exam_id'],
        subject_id: ['idx_{table}_subject_id'],
        is_published: ['idx_{table}_published'],
        status: ['idx_{table}_status'],
        role: ['idx_{table}_role'],
        created_at: ['idx_{table}_created_at'],
    };

    for (const filter of filters) {
        const column = filter.split('=')[0]?.trim();
        if (column && indexSuggestions[column]) {
            analysis.suggestedIndexes.push(
                indexSuggestions[column][0].replace('{table}', table)
            );
        }
    }

    return analysis;
}
