// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { monitoredRoute } from '@/lib/api/route-utils';
import {
    getOnlineExamDetail,
    getOnlineExamResult,
    getOnlineExamsDashboardData,
    logProctoringEvent,
    saveOnlineExamProgress,
    startOnlineExamAttempt,
    submitOnlineExamAttempt,
} from '@/lib/online-exams/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function createRequestSupabaseClient(request: NextRequest) {
    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set() { },
                remove() { },
            },
        }
    );
}

async function requireUser(request: NextRequest) {
    const supabase = createRequestSupabaseClient(request);
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        return null;
    }

    return user;
}

function unauthorizedResponse() {
    return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
    );
}

export async function GET(request: NextRequest): Promise<Response> {
    const user = await requireUser(request);
    if (!user) {
        return unauthorizedResponse();
    }

    return monitoredRoute(
        request,
        async () => {
            const { searchParams } = new URL(request.url);
            const examId = searchParams.get('examId');
            const attemptId = searchParams.get('attemptId');
            const resultAttemptId = searchParams.get('resultAttemptId');

            const data = resultAttemptId
                ? await getOnlineExamResult(user.id, resultAttemptId)
                : examId
                    ? await getOnlineExamDetail(user.id, examId, attemptId)
                    : await getOnlineExamsDashboardData(user.id);

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
            routeLabel: '/api/online-exams',
            userId: user.id,
            metadata: {
                action: 'read',
            },
        }
    );
}

export async function POST(request: NextRequest): Promise<Response> {
    const user = await requireUser(request);
    if (!user) {
        return unauthorizedResponse();
    }

    return monitoredRoute(
        request,
        async () => {
            const body = await request.json().catch(() => ({}));

            switch (body.action) {
                case 'start_attempt': {
                    const data = await startOnlineExamAttempt(user.id, body.examId, body.deviceMetadata || {});
                    return NextResponse.json({ success: true, data });
                }

                case 'save_progress': {
                    const data = await saveOnlineExamProgress(user.id, body.attemptId, {
                        answers: body.answers || {},
                        questionTimeMap: body.questionTimeMap || {},
                        markedForReview: body.markedForReview || [],
                        currentQuestionId: body.currentQuestionId || null,
                        currentSectionId: body.currentSectionId || null,
                        timeRemainingSeconds: body.timeRemainingSeconds,
                    });
                    return NextResponse.json({ success: true, data });
                }

                case 'submit_attempt': {
                    const data = await submitOnlineExamAttempt(user.id, body.attemptId, {
                        answers: body.answers || {},
                        questionTimeMap: body.questionTimeMap || {},
                        markedForReview: body.markedForReview || [],
                        timeTakenSeconds: body.timeTakenSeconds,
                        timeRemainingSeconds: body.timeRemainingSeconds,
                        autoSubmitted: body.autoSubmitted || false,
                    });
                    return NextResponse.json({ success: true, data });
                }

                case 'log_event': {
                    const data = await logProctoringEvent(user.id, {
                        examId: body.examId,
                        attemptId: body.attemptId,
                        eventType: body.eventType,
                        severity: body.severity || 'warning',
                        warningMessage: body.warningMessage || null,
                        screenshotUrl: body.screenshotUrl || null,
                        metadata: body.metadata || {},
                    });
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
            routeLabel: '/api/online-exams',
            userId: user.id,
            metadata: {
                action: 'write',
            },
        }
    );
}
