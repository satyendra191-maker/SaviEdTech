// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { monitoredRoute } from '@/lib/api/route-utils';
import { requireAdminRequest } from '@/lib/api/admin-auth';
import {
    deleteOnlineExam,
    getAdminOnlineExamDetail,
    getAdminOnlineExamOverview,
    saveOnlineExamAdmin,
} from '@/lib/online-exams/service';

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
            const { searchParams } = new URL(request.url);
            const examId = searchParams.get('examId');
            const data = examId
                ? await getAdminOnlineExamDetail(examId)
                : await getAdminOnlineExamOverview();

            return NextResponse.json(
                { success: true, data },
                {
                    headers: {
                        'Cache-Control': 'no-store, max-age=0',
                    },
                }
            );
        },
        {
            routeLabel: '/api/admin/online-exams',
            userId: adminContext.userId,
            metadata: {
                action: 'read',
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
            const body = await request.json().catch(() => ({}));

            switch (body.action) {
                case 'upsert_exam': {
                    const data = await saveOnlineExamAdmin(adminContext.userId, body.payload);
                    return NextResponse.json({ success: true, data });
                }
                case 'delete_exam': {
                    const data = await deleteOnlineExam(body.examId);
                    return NextResponse.json({ success: true, data });
                }
                default:
                    return NextResponse.json(
                        { success: false, error: 'Invalid action' },
                        { status: 400 }
                    );
            }
        },
        {
            routeLabel: '/api/admin/online-exams',
            userId: adminContext.userId,
            metadata: {
                action: 'write',
                role: adminContext.role,
            },
        }
    );
}
