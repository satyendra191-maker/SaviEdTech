import { NextRequest, NextResponse } from 'next/server';
import { monitoredRoute } from '@/lib/api/route-utils';
import { requireAdminRequest } from '@/lib/api/admin-auth';
import { getPlatformAuditorSnapshot, runPlatformAudit } from '@/lib/platform-manager/auditor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function unauthorizedResponse(): NextResponse {
    return NextResponse.json(
        { success: false, error: 'Unauthorized - admin access required' },
        { status: 403 }
    );
}

export async function GET(request: NextRequest): Promise<Response> {
    const adminContext = await requireAdminRequest(request);
    if (!adminContext) {
        return unauthorizedResponse();
    }

    return monitoredRoute(
        request,
        async () => {
            const snapshot = await getPlatformAuditorSnapshot();
            return NextResponse.json(
                {
                    success: true,
                    data: snapshot,
                },
                {
                    headers: {
                        'Cache-Control': 'no-store, max-age=0',
                    },
                }
            );
        },
        {
            routeLabel: '/api/admin/platform-auditor',
            userId: adminContext.userId,
            metadata: {
                action: 'snapshot',
                role: adminContext.role,
            },
        }
    );
}

export async function POST(request: NextRequest): Promise<Response> {
    const adminContext = await requireAdminRequest(request);
    if (!adminContext) {
        return unauthorizedResponse();
    }

    return monitoredRoute(
        request,
        async () => {
            const body = await request.json().catch(() => ({})) as {
                includeCodebaseInspection?: boolean;
                autoRecover?: boolean;
            };

            const snapshot = await runPlatformAudit({
                includeCodebaseInspection: body.includeCodebaseInspection ?? true,
                autoRecover: body.autoRecover ?? true,
                eagerChecks: true,
                sendNotifications: true,
                persist: true,
                initiatedBy: adminContext.userId,
            });

            return NextResponse.json(
                {
                    success: true,
                    data: snapshot,
                },
                {
                    headers: {
                        'Cache-Control': 'no-store, max-age=0',
                    },
                }
            );
        },
        {
            routeLabel: '/api/admin/platform-auditor',
            userId: adminContext.userId,
            metadata: {
                action: 'run_audit',
                role: adminContext.role,
            },
        }
    );
}
