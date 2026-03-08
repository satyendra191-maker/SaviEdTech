// @ts-nocheck
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export interface AttemptProgressRecord {
    questionId: string;
    isCorrect: boolean;
    timeTakenSeconds?: number | null;
}

const MINUTES_FLOOR = 1;

export async function upsertLearningProgress(
    supabase: SupabaseClient<Database>,
    userId: string,
    records: AttemptProgressRecord[]
): Promise<void> {
    if (records.length === 0) {
        return;
    }

    const questionIds = Array.from(new Set(records.map((record) => record.questionId)));
    const { data: questionRows, error: questionError } = await supabase
        .from('questions')
        .select(`
            id,
            topic:topic_id (
                chapter:chapter_id (
                    subject_id
                )
            )
        `)
        .in('id', questionIds);

    if (questionError) {
        throw questionError;
    }

    const subjectByQuestionId = new Map<string, string>();
    for (const row of (questionRows ?? []) as Array<{
        id: string;
        topic: { chapter: { subject_id: string | null } | null } | null;
    }>) {
        const subjectId = row.topic?.chapter?.subject_id;
        if (subjectId) {
            subjectByQuestionId.set(row.id, subjectId);
        }
    }

    const grouped = new Map<string, { attempted: number; correct: number; incorrect: number; timeTakenSeconds: number }>();

    for (const record of records) {
        const subjectId = subjectByQuestionId.get(record.questionId);
        if (!subjectId) {
            continue;
        }

        const existing = grouped.get(subjectId) ?? {
            attempted: 0,
            correct: 0,
            incorrect: 0,
            timeTakenSeconds: 0,
        };

        existing.attempted += 1;
        existing.correct += record.isCorrect ? 1 : 0;
        existing.incorrect += record.isCorrect ? 0 : 1;
        existing.timeTakenSeconds += Math.max(record.timeTakenSeconds ?? 0, 0);
        grouped.set(subjectId, existing);
    }

    if (grouped.size === 0) {
        return;
    }

    const subjectIds = Array.from(grouped.keys());
    const { data: existingRows, error: existingError } = await supabase
        .from('student_progress')
        .select('*')
        .eq('user_id', userId)
        .in('subject_id', subjectIds);

    if (existingError) {
        throw existingError;
    }

    const existingBySubjectId = new Map(
        (existingRows ?? []).map((row) => [row.subject_id ?? '', row])
    );

    const now = new Date().toISOString();
    const upserts = subjectIds.map((subjectId) => {
        const delta = grouped.get(subjectId)!;
        const existing = existingBySubjectId.get(subjectId);
        const previousAttempted = existing?.total_questions_attempted ?? 0;
        const previousCorrect = existing?.correct_answers ?? 0;
        const previousIncorrect = existing?.incorrect_answers ?? 0;
        const previousTimePerQuestion = existing?.average_time_per_question ?? 0;
        const previousTotalStudyMinutes = existing?.total_study_minutes ?? 0;
        const cumulativeTimeSeconds = (previousTimePerQuestion * previousAttempted) + delta.timeTakenSeconds;
        const totalAttempted = previousAttempted + delta.attempted;
        const totalCorrect = previousCorrect + delta.correct;
        const totalIncorrect = previousIncorrect + delta.incorrect;
        const totalStudyMinutes = previousTotalStudyMinutes + Math.max(MINUTES_FLOOR, Math.round(delta.timeTakenSeconds / 60));

        return {
            id: existing?.id,
            user_id: userId,
            subject_id: subjectId,
            total_questions_attempted: totalAttempted,
            correct_answers: totalCorrect,
            incorrect_answers: totalIncorrect,
            accuracy_percent: totalAttempted > 0 ? Number(((totalCorrect / totalAttempted) * 100).toFixed(2)) : 0,
            average_time_per_question: totalAttempted > 0 ? Number((cumulativeTimeSeconds / totalAttempted).toFixed(2)) : null,
            total_study_minutes: totalStudyMinutes,
            tests_taken: existing?.tests_taken ?? 0,
            average_test_score: existing?.average_test_score ?? null,
            best_rank: existing?.best_rank ?? null,
            last_activity_at: now,
            updated_at: now,
        };
    });

    const { error: upsertError } = await supabase
        .from('student_progress')
        .upsert(upserts, { onConflict: 'user_id,subject_id' });

    if (upsertError) {
        throw upsertError;
    }

    const { data: studentProfile, error: studentProfileError } = await supabase
        .from('student_profiles')
        .select('total_study_minutes')
        .eq('id', userId)
        .maybeSingle();

    if (studentProfileError) {
        throw studentProfileError;
    }

    const sessionStudyMinutes = Math.max(
        MINUTES_FLOOR,
        Math.round(records.reduce((total, record) => total + Math.max(record.timeTakenSeconds ?? 0, 0), 0) / 60)
    );

    const { error: profileUpdateError } = await supabase
        .from('student_profiles')
        .upsert({
            id: userId,
            total_study_minutes: (studentProfile?.total_study_minutes ?? 0) + sessionStudyMinutes,
            last_activity_at: now,
            updated_at: now,
        });

    if (profileUpdateError) {
        throw profileUpdateError;
    }
}
