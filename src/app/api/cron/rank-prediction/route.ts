import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase';

/**
 * CRON Job: Rank Prediction Updater
 * Runs at 4:30 AM daily
 * Re-calculates predicted ranks based on latest student performance
 */
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminSupabaseClient();
    const results = {
        updated: 0,
        errors: [] as string[],
        timestamp: new Date().toISOString(),
    };

    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Get all active students with performance data
        const { data: students, error: studentsError } = await supabase
            .from('student_progress')
            .select('user_id, accuracy_percent, average_test_score') as any;

        if (studentsError) throw studentsError;

        for (const student of (students ?? []) as any[]) {
            if (!student.user_id) continue;

            try {
                // Simplified rank prediction logic
                const accuracy = (student.accuracy_percent ?? 0) / 100;
                const score = (student.average_test_score ?? 0) / 100;
                const predictionFactor = accuracy * 0.7 + score * 0.3;

                const predictedRank = Math.max(1, Math.floor(100000 * (1 - predictionFactor)));
                const percentile = Math.min(100, predictionFactor * 100);

                // Update predictions table
                const insertData: any = {
                    user_id: student.user_id,
                    prediction_date: today,
                    predicted_rank: predictedRank,
                    predicted_percentile: percentile,
                    calculation_metadata: {
                        accuracy: student.accuracy_percent,
                        avg_score: student.average_test_score,
                        factor: predictionFactor
                    },
                    calculated_at: new Date().toISOString()
                };
                
                await (supabase as any).from('rank_predictions').insert(insertData);

                // Update student profile with latest prediction
                const updateData: any = {
                    rank_prediction: predictedRank,
                    percentile_prediction: percentile
                };
                
                await (supabase as any).from('student_profiles').update(updateData).eq('id', student.user_id);

                results.updated++;
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unknown error';
                results.errors.push(`Failed for student ${student.user_id}: ${msg}`);
            }
        }

        // Log success
        await (supabase as any).from('system_health').insert({
            check_name: 'rank_prediction',
            status: results.errors.length > 0 ? 'degraded' : 'healthy',
            details: results,
        });

        return NextResponse.json({
            success: true,
            message: `Updated ${results.updated} rank predictions`,
            results,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await (supabase as any).from('error_logs').insert({
            error_type: 'cron_job_failed',
            error_message: `Rank Prediction failed: ${errorMessage}`,
            metadata: { results },
        });

        return NextResponse.json(
            { success: false, error: errorMessage, results },
            { status: 500 }
        );
    }
}
