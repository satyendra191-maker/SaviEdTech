import { createAdminSupabaseClient, getSupabaseBrowserClient, isBrowser } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export type PlatformAuditStatus = 'healthy' | 'warning' | 'critical';

export interface PlatformAuditLogRecord {
    id: string;
    audit_type: string;
    audit_subtype: string | null;
    time_range: string | null;
    status: PlatformAuditStatus;
    title: string | null;
    summary: string | null;
    affected_module: string | null;
    recovery_action: string | null;
    recovery_status: string | null;
    metadata: Record<string, unknown>;
    notified_admin: boolean;
    notified_email: boolean;
    created_at: string;
}

export interface WritePlatformAuditLogInput {
    auditType: string;
    auditSubtype?: string | null;
    timeRange?: string | null;
    status?: PlatformAuditStatus;
    title?: string | null;
    summary?: string | null;
    affectedModule?: string | null;
    recoveryAction?: string | null;
    recoveryStatus?: string | null;
    metadata?: Record<string, unknown>;
    notifiedAdmin?: boolean;
    notifiedEmail?: boolean;
    client?: SupabaseClient<Database>;
}

type PlatformAuditLogQueryClient = SupabaseClient<Database> & {
    from: (table: 'platform_audit_logs') => {
        insert: (payload: Record<string, unknown>) => Promise<{ error: Error | null }>;
        select: (columns: string) => {
            order: (column: string, options: { ascending: boolean }) => {
                limit: (value: number) => Promise<{ data: PlatformAuditLogRow[] | null; error: Error | null }>;
            };
        };
    };
};

interface PlatformAuditLogRow {
    id: string;
    audit_type: string;
    audit_subtype: string | null;
    time_range: string | null;
    status: PlatformAuditStatus | null;
    title: string | null;
    summary: string | null;
    affected_module: string | null;
    recovery_action: string | null;
    recovery_status: string | null;
    metadata: Record<string, unknown> | null;
    notified_admin: boolean | null;
    notified_email: boolean | null;
    created_at: string;
}

function getClient(client?: SupabaseClient<Database>): PlatformAuditLogQueryClient {
    const resolvedClient = client || (isBrowser() ? getSupabaseBrowserClient() : createAdminSupabaseClient());
    return resolvedClient as PlatformAuditLogQueryClient;
}

function toRecord(row: PlatformAuditLogRow): PlatformAuditLogRecord {
    return {
        id: row.id,
        audit_type: row.audit_type,
        audit_subtype: row.audit_subtype,
        time_range: row.time_range,
        status: row.status || 'healthy',
        title: row.title,
        summary: row.summary,
        affected_module: row.affected_module,
        recovery_action: row.recovery_action,
        recovery_status: row.recovery_status,
        metadata: row.metadata || {},
        notified_admin: row.notified_admin ?? false,
        notified_email: row.notified_email ?? false,
        created_at: row.created_at,
    };
}

export async function writePlatformAuditLog(input: WritePlatformAuditLogInput): Promise<void> {
    const client = getClient(input.client);
    const payload = {
        audit_type: input.auditType,
        audit_subtype: input.auditSubtype ?? null,
        time_range: input.timeRange ?? null,
        status: input.status ?? 'healthy',
        title: input.title ?? null,
        summary: input.summary ?? null,
        affected_module: input.affectedModule ?? null,
        recovery_action: input.recoveryAction ?? null,
        recovery_status: input.recoveryStatus ?? null,
        metadata: input.metadata || {},
        notified_admin: input.notifiedAdmin ?? false,
        notified_email: input.notifiedEmail ?? false,
    };

    const { error } = await client.from('platform_audit_logs').insert(payload);

    if (!error) {
        return;
    }

    const message = error.message || '';
    if (message.toLowerCase().includes('column')) {
        const fallbackResult = await client.from('platform_audit_logs').insert({
            audit_type: input.auditType,
            audit_subtype: input.auditSubtype ?? null,
            time_range: input.timeRange ?? null,
        });

        if (!fallbackResult.error) {
            return;
        }
    }

    if (error) {
        console.error('Failed to write platform audit log:', error);
        throw new Error(`Failed to write platform audit log: ${error.message}`);
    }
}

export async function getRecentPlatformAuditLogs(
    limit: number = 20,
    config: { client?: SupabaseClient<Database> } = {}
): Promise<PlatformAuditLogRecord[]> {
    const client = getClient(config.client);
    const { data, error } = await client
        .from('platform_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Failed to fetch platform audit logs:', error);
        throw new Error(`Failed to fetch platform audit logs: ${error.message}`);
    }

    return (data || []).map(toRecord);
}
