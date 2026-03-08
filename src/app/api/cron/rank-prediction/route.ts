// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase';
import { calculateRankPredictionForUser, storeRankPrediction } from '@/lib/analytics/rank-prediction';

/**
 * CRON Job: Rank Prediction Updater
 * Runs at 4:30 AM daily
 */
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminSupabaseClient();
    const results = {
        updated: 0,
        skipped: 0,
        errors: [] as string[],
        timestamp: new Date().toISOString(),
    };

    try {
        const { data: students, error: studentsError } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'student');

        if (studentsError) {
            throw studentsError;
        }

        for (const student of students ?? []) {
            try {
                const prediction = await calculateRankPredictionForUser(supabase, student.id);
                if (!prediction) {
                    results.skipped++;
                    continue;
                }

                await storeRankPrediction(supabase, student.id, prediction);
                results.updated++;
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                results.errors.push(`Failed for student ${student.id}: ${message}`);
            }
        }

        await supabase.from('system_health').insert({
            check_name: 'rank_prediction',
            status: results.errors.length > 0 ? 'degraded' : 'healthy',
            details: results,
        } as never);

        return NextResponse.json({
            success: true,
            message: `Updated ${results.updated} rank predictions`,
            results,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await supabase.from('error_logs').insert({
            error_type: 'cron_job_failed',
            error_message: `Rank prediction failed: ${errorMessage}`,
            metadata: { results },
        } as never);

        return NextResponse.json(
            { success: false, error: errorMessage, results },
            { status: 500 }
        );
    }
}
