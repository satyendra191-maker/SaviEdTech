import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase';

/**
 * CRON Job: Daily Challenge Publisher
 * Runs at 6:00 AM daily
 * Publishes the daily national challenge question
 */
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminSupabaseClient();
    const results = {
        published: 0,
        errors: [] as string[],
        timestamp: new Date().toISOString(),
    };

    try {
        const today = new Date().toISOString().split('T')[0];

        // Get active exams
        const { data: exams, error: examsError } = await supabase
            .from('exams')
            .select('id, name')
            .eq('is_active', true) as any;

        if (examsError) throw examsError;

        for (const exam of (exams as any[]) ?? []) {
            // Check if challenge already exists for today
            const { data: existingChallenge } = await supabase
                .from('daily_challenges')
                .select('id')
                .eq('exam_id', exam.id)
                .eq('challenge_date', today)
                .maybeSingle() as any;

            if (existingChallenge) continue;

            // Get a random medium-difficulty question
            const { data: questionData, error: questionError } = await supabase
                .from('questions')
                .select('id, difficulty_level, topic_id')
                .eq('is_published', true)
                .eq('difficulty_level', 'medium')
                .order('attempt_count', { ascending: true })
                .limit(1)
                .maybeSingle() as any;

            if (questionError || !questionData) {
                results.errors.push(`No suitable question found for ${exam.name}`);
                continue;
            }

            const question = questionData as any;

            // Create daily challenge
            const insertData: Record<string, unknown> = {
                exam_id: exam.id,
                question_id: question.id,
                challenge_date: today,
                title: `Daily Challenge - ${exam.name}`,
                description: `Test your ${exam.name} skills with today's challenge!`,
                difficulty_level: question.difficulty_level,
                published_at: new Date().toISOString(),
                closes_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            };
            // @ts-expect-error - Supabase type inference issue
            await supabase.from('daily_challenges').insert(insertData);

            results.published++;
        }

        // Reset leaderboard for new day
        await supabase.from('system_health').insert({
            check_name: 'daily_challenge',
            status: results.errors.length > 0 ? 'degraded' : 'healthy',
            details: results,
        } as any);

        return NextResponse.json({
            success: true,
            message: `Published ${results.published} daily challenges`,
            results,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        await supabase.from('error_logs').insert({
            error_type: 'cron_job_failed',
            error_message: `Daily Challenge failed: ${errorMessage}`,
            metadata: { results },
        } as any);

        return NextResponse.json(
            { success: false, error: errorMessage, results },
            { status: 500 }
        );
    }
}
