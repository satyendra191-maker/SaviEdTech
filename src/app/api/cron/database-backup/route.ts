/**
 * Database Backup API
 * 
 * Scheduled endpoint for creating and managing database backups.
 * Can be triggered via cron job or manually.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBackup, getBackups, getBackupById, deleteBackup, getBackupStats, cleanupOldBackups } from '@/lib/backup/manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function verifyAuth(request: NextRequest): Promise<{ authorized: boolean; error?: string }> {
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.CRON_SECRET || process.env.SELF_HEALING_API_KEY;

    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        if (apiKey && token === apiKey) {
            return { authorized: true };
        }
    }

    return { authorized: false, error: 'Unauthorized - Valid API key required' };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') || 'list';

        switch (action) {
            case 'list': {
                const limit = parseInt(searchParams.get('limit') || '20', 10);
                const backups = await getBackups(limit);

                return NextResponse.json({
                    success: true,
                    data: backups,
                    count: backups.length,
                });
            }

            case 'stats': {
                const stats = await getBackupStats();

                return NextResponse.json({
                    success: true,
                    data: stats,
                });
            }

            case 'get': {
                const id = searchParams.get('id');
                if (!id) {
                    return NextResponse.json(
                        { success: false, error: 'Backup ID is required' },
                        { status: 400 }
                    );
                }

                const backup = await getBackupById(id);
                if (!backup) {
                    return NextResponse.json(
                        { success: false, error: 'Backup not found' },
                        { status: 404 }
                    );
                }

                return NextResponse.json({
                    success: true,
                    data: backup,
                });
            }

            default:
                return NextResponse.json(
                    { success: false, error: `Unknown action: ${action}` },
                    { status: 400 }
                );
        }
    } catch (error: any) {
        console.error('Error in backup GET:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Unknown error',
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const auth = await verifyAuth(request);
        if (!auth.authorized) {
            return NextResponse.json(
                { success: false, error: auth.error },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { action, backupType, keepCount } = body;

        switch (action) {
            case 'create': {
                const backup = await createBackup({
                    backupType: backupType || 'full',
                });

                return NextResponse.json({
                    success: true,
                    data: backup,
                    message: 'Backup created successfully',
                });
            }

            case 'delete': {
                const { id } = body;
                if (!id) {
                    return NextResponse.json(
                        { success: false, error: 'Backup ID is required' },
                        { status: 400 }
                    );
                }

                await deleteBackup(id);

                return NextResponse.json({
                    success: true,
                    message: 'Backup deleted successfully',
                });
            }

            case 'cleanup': {
                const count = await cleanupOldBackups(keepCount || 10);

                return NextResponse.json({
                    success: true,
                    message: `Cleaned up ${count} old backups`,
                    deleted: count,
                });
            }

            default:
                return NextResponse.json(
                    { success: false, error: `Unknown action: ${action}` },
                    { status: 400 }
                );
        }
    } catch (error: any) {
        console.error('Error in backup POST:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Unknown error',
            },
            { status: 500 }
        );
    }
}
