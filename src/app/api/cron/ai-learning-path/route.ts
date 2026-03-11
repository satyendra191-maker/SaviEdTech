import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function verifyCronSecret(request: NextRequest): Promise<boolean> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return false;
    const token = authHeader.replace('Bearer ', '');
    return token === process.env.CRON_SECRET;
}

export async function GET(request: NextRequest) {
    const requestId = `learning_path_${Date.now()}`;
    const startTime = Date.now();

    try {
        const isValid = await verifyCronSecret(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerSupabaseClient();
        
        const results = {
            pathsGenerated: 0,
            recommendationsUpdated: 0,
            weakAreasIdentified: 0,
            studyPlansCreated: 0,
            errors: [] as string[],
        };

        const { data: students } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'student')
            .limit(50);

        if (students) {
            for (const student of students) {
                const { data: testAttempts } = await supabase
                    .from('test_attempts')
                    .select('id, subject, total_marks, percentile')
                    .eq('student_id', student.id)
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (testAttempts && testAttempts.length > 0) {
                    const weakSubjects: string[] = [];
                    const subjectScores: Record<string, number[]> = {};

                    for (const attempt of testAttempts) {
                        if (!subjectScores[attempt.subject]) {
                            subjectScores[attempt.subject] = [];
                        }
                        subjectScores[attempt.subject].push(attempt.percentile || 0);
                    }

                    for (const [subject, scores] of Object.entries(subjectScores)) {
                        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
                        if (avgScore < 60) {
                            weakSubjects.push(subject);
                        }
                    }

                    if (weakSubjects.length > 0) {
                        await supabase
                            .from('learning_recommendations')
                            .upsert({
                                student_id: student.id,
                                weak_subjects: weakSubjects,
                                recommended_topics: weakSubjects.map(s => `${s} - Basic Concepts`),
                                last_updated: new Date().toISOString(),
                            });

                        results.weakAreasIdentified++;
                    }

                    const learningPath = {
                        student_id: student.id,
                        current_level: 'intermediate',
                        target_exam: 'jee-main',
                        path: [
                            { week: 1, focus: 'Foundation Building', topics: weakSubjects.slice(0, 2) },
                            { week: 2, focus: 'Practice & Revision', topics: weakSubjects.slice(0, 2) },
                            { week: 3, focus: 'Advanced Topics', topics: weakSubjects.slice(0, 2) },
                            { week: 4, focus: 'Mock Tests', topics: weakSubjects },
                        ],
                        generated_at: new Date().toISOString(),
                    };

                    await supabase
                        .from('ai_learning_paths')
                        .upsert(learningPath);

                    results.pathsGenerated++;
                    results.studyPlansCreated++;
                }
            }
        }

        const duration = Date.now() - startTime;

        console.log(`[AI Learning Path Automation] Completed in ${duration}ms - Generated: ${results.pathsGenerated}`);

        return NextResponse.json({
            success: true,
            message: 'AI learning path automation completed',
            results,
            duration,
            requestId,
        });

    } catch (error) {
        console.error(`[AI Learning Path Automation] Error: ${error}`);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
        }, { status: 500 });
    }
}
