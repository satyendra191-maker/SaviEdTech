import { createAdminSupabaseClient } from '@/lib/supabase';

export interface StudentStudySnapshot {
    userId: string;
    examTarget: string | null;
    classLevel: string | null;
    weakTopics: string[];
    strongTopics: string[];
    preferredSubjects: string[];
    recentAccuracy: number | null;
    predictedRank: number | null;
    dailyMinutes: number;
    horizonDays: number;
    focusSubject?: string | null;
}

export interface GeneratedStudyTask {
    title: string;
    description: string;
    subject: string;
    topic: string;
    scheduledDate: string;
    durationMinutes: number;
    type: 'lecture' | 'practice' | 'dpp' | 'mock_test' | 'revision';
    priority: 'high' | 'medium' | 'low';
}

export interface GeneratedStudyPlan {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    tasks: GeneratedStudyTask[];
    focusTopics: string[];
}

const DEFAULT_TOPIC_BANK: Record<string, string[]> = {
    Physics: ['Kinematics', 'Laws of Motion', 'Electrostatics', 'Current Electricity', 'Optics'],
    Chemistry: ['Atomic Structure', 'Chemical Bonding', 'Thermodynamics', 'Equilibrium', 'Organic Basics'],
    Mathematics: ['Quadratic Equations', 'Limits and Derivatives', 'Matrices', 'Coordinate Geometry', 'Probability'],
    Biology: ['Cell Structure', 'Genetics', 'Human Physiology', 'Ecology', 'Biomolecules'],
};

function addDays(date: Date, offset: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + offset);
    return next;
}

function formatDate(date: Date): string {
    return date.toISOString().split('T')[0] || '';
}

function titleCase(value: string): string {
    return value
        .split(/[\s_]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

function resolveFocusTopics(snapshot: StudentStudySnapshot): string[] {
    const prioritizedWeakTopics = snapshot.weakTopics
        .map(titleCase)
        .filter(Boolean)
        .slice(0, 8);

    if (prioritizedWeakTopics.length > 0) {
        return prioritizedWeakTopics;
    }

    const subject = titleCase(snapshot.focusSubject || snapshot.preferredSubjects[0] || snapshot.examTarget || 'Physics');
    return DEFAULT_TOPIC_BANK[subject] || DEFAULT_TOPIC_BANK.Physics;
}

function getTaskPriority(index: number): 'high' | 'medium' | 'low' {
    if (index < 3) return 'high';
    if (index < 8) return 'medium';
    return 'low';
}

export function generatePersonalizedStudyPlan(snapshot: StudentStudySnapshot): GeneratedStudyPlan {
    const today = new Date();
    const focusTopics = resolveFocusTopics(snapshot);
    const horizonDays = Math.min(Math.max(snapshot.horizonDays, 7), 365);
    const tasks: GeneratedStudyTask[] = [];
    const subjects = snapshot.preferredSubjects.length > 0
        ? snapshot.preferredSubjects.map(titleCase)
        : [titleCase(snapshot.focusSubject || snapshot.examTarget || 'Physics')];

    for (let dayIndex = 0; dayIndex < horizonDays; dayIndex += 1) {
        const date = addDays(today, dayIndex);
        const scheduledDate = formatDate(date);
        const focusTopic = focusTopics[dayIndex % focusTopics.length] || 'Revision';
        const subject = subjects[dayIndex % subjects.length] || 'General';

        tasks.push({
            title: `Lecture Sprint: ${focusTopic}`,
            description: `Watch one focused lecture and revise notes for ${focusTopic}.`,
            subject,
            topic: focusTopic,
            scheduledDate,
            durationMinutes: Math.round(snapshot.dailyMinutes * 0.35),
            type: 'lecture',
            priority: getTaskPriority(dayIndex),
        });

        tasks.push({
            title: `Practice Drill: ${focusTopic}`,
            description: `Solve targeted practice questions with full solution review.`,
            subject,
            topic: focusTopic,
            scheduledDate,
            durationMinutes: Math.round(snapshot.dailyMinutes * 0.3),
            type: 'practice',
            priority: getTaskPriority(dayIndex),
        });

        tasks.push({
            title: `DPP Set: ${focusTopic}`,
            description: 'Complete a 15-question DPP with easy, medium, and advanced coverage.',
            subject,
            topic: focusTopic,
            scheduledDate,
            durationMinutes: Math.max(30, Math.round(snapshot.dailyMinutes * 0.2)),
            type: 'dpp',
            priority: dayIndex < 14 ? 'high' : 'medium',
        });

        if ((dayIndex + 1) % 7 === 0) {
            tasks.push({
                title: `Weekly Mock Test ${Math.floor((dayIndex + 1) / 7)}`,
                description: 'Attempt a full mock test and review rank prediction inputs.',
                subject: 'All Subjects',
                topic: `Weekly evaluation up to ${focusTopic}`,
                scheduledDate,
                durationMinutes: Math.max(90, Math.round(snapshot.dailyMinutes * 1.15)),
                type: 'mock_test',
                priority: 'high',
            });
        }

        if ((dayIndex + 1) % 30 === 0) {
            tasks.push({
                title: `Monthly Revision Test ${Math.floor((dayIndex + 1) / 30)}`,
                description: 'Run a cumulative revision test and note weak areas for the next cycle.',
                subject: 'All Subjects',
                topic: 'Full revision',
                scheduledDate,
                durationMinutes: Math.max(120, Math.round(snapshot.dailyMinutes * 1.4)),
                type: 'revision',
                priority: 'high',
            });
        }
    }

    const endDate = formatDate(addDays(today, horizonDays - 1));
    const accuracyNote = snapshot.recentAccuracy
        ? `Current recent accuracy is ${Math.round(snapshot.recentAccuracy)}%.`
        : 'Recent accuracy data is limited, so the plan emphasizes balanced revision.';
    const rankNote = snapshot.predictedRank
        ? ` Predicted rank trend: ${Math.round(snapshot.predictedRank)}.`
        : '';

    return {
        title: `${titleCase(snapshot.examTarget || 'Exam')} AI Study Plan`,
        description: `${accuracyNote}${rankNote} Daily plan built around weak topics, DPP cadence, weekly mocks, and monthly revision tests.`,
        startDate: formatDate(today),
        endDate,
        tasks,
        focusTopics,
    };
}

export async function savePersonalizedStudyPlan(
    userId: string,
    plan: GeneratedStudyPlan
): Promise<{ planId: string }> {
    const supabase = createAdminSupabaseClient();

    await (supabase.from('study_plans') as any)
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);

    const { data: planRow, error: planError } = await (supabase.from('study_plans') as any)
        .insert({
            user_id: userId,
            title: plan.title,
            description: plan.description,
            start_date: plan.startDate,
            end_date: plan.endDate,
            is_active: true,
        })
        .select('id')
        .single();

    if (planError || !planRow?.id) {
        throw new Error('Failed to save study plan.');
    }

    const items = plan.tasks.map((task) => ({
        plan_id: planRow.id,
        title: task.title,
        description: task.description,
        subject: task.subject,
        topic: task.topic,
        scheduled_date: task.scheduledDate,
        duration_minutes: task.durationMinutes,
        status: 'pending',
    }));

    const { error: itemsError } = await (supabase.from('study_plan_items') as any).insert(items);
    if (itemsError) {
        throw new Error('Failed to save study plan items.');
    }

    return { planId: planRow.id as string };
}
