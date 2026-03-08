import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { monitoredRoute } from '@/lib/api/route-utils';
import { createApiError, ErrorType } from '@/lib/error-handler';
import {
    generatePersonalizedStudyPlan,
    savePersonalizedStudyPlan,
    type StudentStudySnapshot,
} from '@/lib/ai/study-plan-engine';

interface StudyPlanRequestBody {
    days?: number;
    focusSubject?: string;
    dailyMinutes?: number;
    saveToDashboard?: boolean;
}

function createRequestSupabaseClient(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw createApiError(ErrorType.SERVER, 'Supabase is not configured.');
    }

    return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
        cookies: {
            get(name: string) {
                return request.cookies.get(name)?.value;
            },
            set() {},
            remove() {},
        },
    });
}

export async function POST(request: NextRequest): Promise<Response> {
    return monitoredRoute(
        request,
        async () => {
            const supabase = createRequestSupabaseClient(request);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw createApiError(ErrorType.AUTHENTICATION, 'Please sign in to generate a study plan.');
            }

            const body = await request.json().catch(() => ({})) as StudyPlanRequestBody;
            const horizonDays = Math.min(Math.max(body.days || 30, 7), 365);
            const dailyMinutes = Math.min(Math.max(body.dailyMinutes || 180, 60), 600);

            const [{ data: profile }, { data: studentProfile }, { data: rankPrediction }, { data: progressRows }] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('exam_target, class_level')
                    .eq('id', user.id)
                    .single(),
                supabase
                    .from('student_profiles')
                    .select('weak_topics, strong_topics, preferred_subjects, total_study_minutes')
                    .eq('id', user.id)
                    .maybeSingle(),
                supabase
                    .from('rank_predictions')
                    .select('predicted_rank')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
                supabase
                    .from('student_progress')
                    .select('accuracy_percent')
                    .eq('user_id', user.id)
                    .limit(12),
            ]);

            const averageAccuracy = (progressRows || []).length > 0
                ? (progressRows || []).reduce((sum, row) => sum + ((row as { accuracy_percent?: number | null }).accuracy_percent || 0), 0) / (progressRows || []).length
                : null;

            const typedProfile = profile as { exam_target?: string | null; class_level?: string | null } | null;
            const typedStudentProfile = studentProfile as {
                weak_topics?: string[] | null;
                strong_topics?: string[] | null;
                preferred_subjects?: string[] | null;
                total_study_minutes?: number | null;
            } | null;
            const typedRankPrediction = rankPrediction as { predicted_rank?: number | null } | null;

            const snapshot: StudentStudySnapshot = {
                userId: user.id,
                examTarget: typedProfile?.exam_target || null,
                classLevel: typedProfile?.class_level || null,
                weakTopics: typedStudentProfile?.weak_topics || [],
                strongTopics: typedStudentProfile?.strong_topics || [],
                preferredSubjects: typedStudentProfile?.preferred_subjects || [],
                recentAccuracy: averageAccuracy,
                predictedRank: typedRankPrediction?.predicted_rank || null,
                dailyMinutes: typedStudentProfile?.total_study_minutes
                    ? Math.max(dailyMinutes, Math.round(typedStudentProfile.total_study_minutes / 7))
                    : dailyMinutes,
                horizonDays,
                focusSubject: body.focusSubject || null,
            };

            const plan = generatePersonalizedStudyPlan(snapshot);
            let savedPlanId: string | undefined;

            if (body.saveToDashboard !== false) {
                const saved = await savePersonalizedStudyPlan(user.id, plan);
                savedPlanId = saved.planId;
            }

            return NextResponse.json({
                success: true,
                plan,
                savedPlanId,
            });
        },
        {
            routeLabel: '/api/ai/study-plan',
            defaultCacheControl: 'no-store',
        }
    );
}
