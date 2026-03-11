/**
 * Backup Manager
 * 
 * Handles database backup creation, storage, and management.
 * Uses Supabase for storage and database operations.
 */

import { createClient } from '@supabase/supabase-js';

let supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
    if (!supabase) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase environment variables are not configured');
        }
        
        supabase = createClient(supabaseUrl, supabaseServiceKey);
    }
    return supabase;
}

export interface BackupRecord {
    id?: string;
    backup_type: 'full' | 'incremental' | 'schema';
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    file_path?: string;
    file_name?: string;
    file_size_bytes?: number;
    row_count?: number;
    storage_bucket?: string;
    download_url?: string;
    started_at?: string;
    completed_at?: string;
    error_message?: string;
    created_by?: string;
    created_at?: string;
}

export interface BackupOptions {
    backupType?: 'full' | 'incremental' | 'schema';
    description?: string;
    userId?: string;
}

export async function createBackup(options: BackupOptions = {}): Promise<BackupRecord> {
    const { backupType = 'full', userId } = options;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_${backupType}_${timestamp}.json`;
    
    // Create backup record
    const { data: backup, error: createError } = await (getSupabaseClient() as any)
        .from('backups')
        .insert({
            backup_type: backupType,
            status: 'in_progress',
            file_name: fileName,
            storage_bucket: 'backups',
            created_by: userId || null,
        })
        .select()
        .single();

    if (createError) {
        throw new Error(`Failed to create backup record: ${createError.message}`);
    }

    try {
        // Export database data
        const exportData = await exportDatabase(backupType);
        const jsonData = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        
        // Upload to storage
        const { error: uploadError } = await getSupabaseClient().storage
            .from('backups')
            .upload(fileName, blob, {
                contentType: 'application/json',
                upsert: true,
            });

        if (uploadError) {
            throw new Error(`Failed to upload backup: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = getSupabaseClient().storage
            .from('backups')
            .getPublicUrl(fileName);

        // Update backup record as completed
        const { data: updatedBackup, error: updateError } = await (getSupabaseClient() as any)
            .from('backups')
            .update({
                status: 'completed',
                file_path: `backups/${fileName}`,
                download_url: urlData.publicUrl,
                file_size_bytes: blob.size,
                row_count: exportData.totalRows || 0,
                completed_at: new Date().toISOString(),
            })
            .eq('id', backup?.id)
            .select()
            .single();

        if (updateError) {
            throw new Error(`Failed to update backup record: ${updateError.message}`);
        }

        return updatedBackup;
    } catch (error: any) {
        // Update backup record as failed
        await (getSupabaseClient() as any)
            .from('backups')
            .update({
                status: 'failed',
                error_message: error.message,
                completed_at: new Date().toISOString(),
            })
            .eq('id', backup?.id);

        throw error;
    }
}

async function exportDatabase(backupType: string): Promise<any> {
    const tables = [
        'profiles',
        'student_profiles',
        'courses',
        'subjects',
        'chapters',
        'topics',
        'lectures',
        'questions',
        'tests',
        'test_attempts',
        'dpp_attempts',
        'daily_challenges',
        'student_progress',
        'topic_mastery',
        'parent_links',
        'lead_forms',
        'careers',
        'job_applications',
        'donations',
        'payments',
    ];

    const exportData: any = {
        metadata: {
            backupType,
            createdAt: new Date().toISOString(),
            version: '1.0.0',
        },
        tables: {},
        totalRows: 0,
    };

    for (const table of tables) {
        try {
            const { data, count, error } = await getSupabaseClient()
                .from(table)
                .select('*', { count: 'exact' });

            if (!error && data) {
                exportData.tables[table] = data;
                exportData.totalRows += count || 0;
            }
        } catch (err) {
            console.warn(`Failed to export table ${table}:`, err);
            exportData.tables[table] = [];
        }
    }

    return exportData;
}

export async function getBackups(limit = 20): Promise<BackupRecord[]> {
    const { data, error } = await getSupabaseClient()
        .from('backups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        throw new Error(`Failed to fetch backups: ${error.message}`);
    }

    return data || [];
}

export async function getBackupById(id: string): Promise<BackupRecord | null> {
    const { data, error } = await getSupabaseClient()
        .from('backups')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(`Failed to fetch backup: ${error.message}`);
    }

    return data;
}

export async function deleteBackup(id: string): Promise<void> {
    const backup = await getBackupById(id);
    if (!backup) {
        throw new Error('Backup not found');
    }

    // Delete from storage
    if (backup.file_path) {
        const { error: storageError } = await getSupabaseClient().storage
            .from('backups')
            .remove([backup.file_path]);

        if (storageError) {
            console.warn('Failed to delete backup file from storage:', storageError);
        }
    }

    // Delete record
    const { error } = await getSupabaseClient()
        .from('backups')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(`Failed to delete backup record: ${error.message}`);
    }
}

export async function getBackupStats(): Promise<{
    total: number;
    completed: number;
    failed: number;
    totalSize: number;
    lastBackup: string | null;
}> {
    const { data, error } = await (getSupabaseClient() as any)
        .from('backups')
        .select('status, file_size_bytes, created_at');

    if (error) {
        throw new Error(`Failed to fetch backup stats: ${error.message}`);
    }

    const stats = {
        total: data?.length || 0,
        completed: data?.filter(b => b.status === 'completed').length || 0,
        failed: data?.filter(b => b.status === 'failed').length || 0,
        totalSize: data?.reduce((sum, b) => sum + (b.file_size_bytes || 0), 0) || 0,
        lastBackup: data?.[0]?.created_at || null,
    };

    return stats;
}

export async function cleanupOldBackups(keepCount = 10): Promise<number> {
    const backups = await getBackups(100);
    const completedBackups = backups.filter(b => b.status === 'completed');
    const toDelete = completedBackups.slice(keepCount);

    let deleted = 0;
    for (const backup of toDelete) {
        try {
            await deleteBackup(backup.id!);
            deleted++;
        } catch (err) {
            console.warn(`Failed to delete backup ${backup.id}:`, err);
        }
    }

    return deleted;
}
