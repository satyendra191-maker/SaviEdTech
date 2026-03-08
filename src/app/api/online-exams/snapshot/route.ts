// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { monitoredRoute } from '@/lib/api/route-utils';
import { uploadProctoringSnapshot } from '@/lib/online-exams/service';

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

export async function POST(request: NextRequest): Promise<Response> {
    const user = await requireUser(request);
    if (!user) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
        );
    }

    return monitoredRoute(
        request,
        async () => {
            const body = await request.json().catch(() => ({}));
            const data = await uploadProctoringSnapshot(
                user.id,
                body.attemptId,
                body.examId,
                body.imageData
            );

            return NextResponse.json({ success: true, data });
        },
        {
            routeLabel: '/api/online-exams/snapshot',
            userId: user.id,
            metadata: {
                action: 'upload_snapshot',
            },
        }
    );
}
