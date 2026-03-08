import { NextRequest, NextResponse } from 'next/server';
import { runPlatformAudit } from '@/lib/platform-manager/auditor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const url = new URL(request.url);
        const scope = url.searchParams.get('scope') || 'auto';
        const includeCodebaseInspection = scope === 'full'
            ? true
            : scope === 'health'
                ? false
                : new Date().getUTCHours() % 6 === 0;

        const snapshot = await runPlatformAudit({
            includeCodebaseInspection,
            eagerChecks: true,
            autoRecover: true,
            sendNotifications: true,
            persist: true,
            initiatedBy: 'cron:platform-auditor',
        });

        return NextResponse.json({
            success: true,
            data: snapshot,
            meta: {
                scope,
                includeCodebaseInspection,
            },
        });
    } catch (error) {
        console.error('[Platform Auditor Cron] Failed:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown platform auditor failure',
            },
            { status: 500 }
        );
    }
}
