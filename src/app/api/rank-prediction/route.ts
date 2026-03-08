import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import {
    calculateRankPredictionForUser,
    storeRankPrediction,
    type SupportedExamType,
} from '@/lib/analytics/rank-prediction';

const predictionRequestSchema = z.object({
    examType: z.enum(['jee_main', 'jee_advanced', 'neet']).optional(),
});

function createSupabaseClient(request: NextRequest) {
    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set() {
                    // no-op in route handlers
                },
                remove() {
                    // no-op in route handlers
                },
            },
        }
    );
}

async function requireUser(request: NextRequest) {
    const supabase = createSupabaseClient(request);
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        return { user: null };
    }

    return { user };
}

function formatPredictionResponse(prediction: {
    predicted_rank?: number | null;
    predictedRank?: number | null;
    predicted_percentile?: number | null;
    percentile?: number | null;
    exam_readiness?: string | null;
    examReadiness?: string | null;
    exam_readiness_percent?: number | null;
    readinessLevel?: number | null;
    prediction_date?: string | null;
    lastUpdated?: string | null;
    factors?: unknown;
    confidence_score?: number | null;
}) {
    const percentile = prediction.percentile ?? prediction.predicted_percentile ?? null;
    const readinessLabel = prediction.examReadiness ?? prediction.exam_readiness ?? 'Early Stage';
    const readinessLevel = prediction.readinessLevel ?? Math.max(1, Math.round((prediction.exam_readiness_percent ?? 20) / 20));

    return {
        success: true,
        predictedRank: prediction.predictedRank ?? prediction.predicted_rank ?? null,
        percentile,
        examReadiness: readinessLabel,
        readinessLevel,
        lastUpdated: prediction.lastUpdated ?? prediction.prediction_date ?? null,
        factors: prediction.factors ?? null,
        confidenceScore: prediction.confidence_score ?? null,
    };
}

async function calculateAndStorePrediction(userId: string, examType?: SupportedExamType) {
    const supabase = createAdminSupabaseClient();
    const result = await calculateRankPredictionForUser(supabase, userId, examType);

    if (!result) {
        return {
            success: false,
            error: 'No performance data available. Start practicing to get your rank prediction!',
        };
    }

    await storeRankPrediction(supabase, userId, result);

    return formatPredictionResponse({
        predictedRank: result.predictedRank,
        percentile: result.percentile,
        examReadiness: result.examReadiness,
        readinessLevel: result.readinessLevel,
        lastUpdated: result.predictionDate,
        factors: result.factors,
        confidence_score: result.confidenceScore,
    });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const { user } = await requireUser(request);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createAdminSupabaseClient();
        const { data: latestPrediction, error } = await supabase
            .from('rank_predictions')
            .select(`
                predicted_rank,
                predicted_percentile,
                percentile,
                exam_readiness,
                exam_readiness_percent,
                prediction_date,
                factors,
                confidence_score
            `)
            .or(`user_id.eq.${user.id},student_id.eq.${user.id}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!latestPrediction) {
            const result = await calculateAndStorePrediction(user.id);
            return NextResponse.json(result, { status: result.success ? 200 : 400 });
        }

        return NextResponse.json(formatPredictionResponse(latestPrediction));
    } catch (error) {
        console.error('Rank prediction GET error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const { user } = await requireUser(request);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const validationResult = predictionRequestSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { success: false, error: validationResult.error.message },
                { status: 400 }
            );
        }

        const result = await calculateAndStorePrediction(user.id, validationResult.data.examType as SupportedExamType | undefined);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
    } catch (error) {
        console.error('Rank prediction POST error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
