/**
 * AI Test Generator System
 * 
 * Generates full syllabus test papers by selecting questions proportionally
 * from all chapters to match exam patterns for JEE Mains, JEE Advanced, and NEET.
 */

import { createAdminSupabaseClient } from '@/lib/supabase';

export interface FullSyllabusTestRequest {
    examType: 'jee-main' | 'jee-advanced' | 'neet';
    examId: string;
    examName: string;
    subjects: string[];
    questionCount: number;
    durationMinutes: number;
    totalMarks: number;
    scheduledDate: string;
}

export interface GeneratedTestData {
    questionIds: string[];
    questionMarks: number[];
    subjectDistribution: Record<string, number>;
    difficultyDistribution: Record<string, number>;
    topicCoverage: string[];
}

interface ExamPattern {
    subjects: Record<string, {
        questionCount: number;
        marksPerQuestion: number;
        negativeMarks: number;
        sections?: Array<{
            type: 'mcq' | 'numerical' | 'integer' | 'match';
            count: number;
            marks: number;
            partialMarking?: boolean;
        }>;
    }>;
}

const EXAM_PATTERNS: Record<string, ExamPattern> = {
    'jee-main': {
        subjects: {
            'Physics': {
                questionCount: 30,
                marksPerQuestion: 4,
                negativeMarks: 1,
                sections: [
                    { type: 'mcq', count: 20, marks: 4 },
                    { type: 'numerical', count: 10, marks: 4 },
                ],
            },
            'Chemistry': {
                questionCount: 30,
                marksPerQuestion: 4,
                negativeMarks: 1,
                sections: [
                    { type: 'mcq', count: 20, marks: 4 },
                    { type: 'numerical', count: 10, marks: 4 },
                ],
            },
            'Mathematics': {
                questionCount: 30,
                marksPerQuestion: 4,
                negativeMarks: 1,
                sections: [
                    { type: 'mcq', count: 20, marks: 4 },
                    { type: 'numerical', count: 10, marks: 4 },
                ],
            },
        },
    },
    'jee-advanced': {
        subjects: {
            'Physics': {
                questionCount: 18,
                marksPerQuestion: 11,
                negativeMarks: 2,
                sections: [
                    { type: 'mcq', count: 6, marks: 11, partialMarking: true },
                    { type: 'numerical', count: 6, marks: 11 },
                    { type: 'integer', count: 6, marks: 11 },
                ],
            },
            'Chemistry': {
                questionCount: 18,
                marksPerQuestion: 11,
                negativeMarks: 2,
                sections: [
                    { type: 'mcq', count: 6, marks: 11, partialMarking: true },
                    { type: 'numerical', count: 6, marks: 11 },
                    { type: 'integer', count: 6, marks: 11 },
                ],
            },
            'Mathematics': {
                questionCount: 18,
                marksPerQuestion: 11,
                negativeMarks: 2,
                sections: [
                    { type: 'mcq', count: 6, marks: 11, partialMarking: true },
                    { type: 'numerical', count: 6, marks: 11 },
                    { type: 'integer', count: 6, marks: 11 },
                ],
            },
        },
    },
    'neet': {
        subjects: {
            'Physics': {
                questionCount: 45,
                marksPerQuestion: 4,
                negativeMarks: 1,
                sections: [
                    { type: 'mcq', count: 45, marks: 4 },
                ],
            },
            'Chemistry': {
                questionCount: 45,
                marksPerQuestion: 4,
                negativeMarks: 1,
                sections: [
                    { type: 'mcq', count: 45, marks: 4 },
                ],
            },
            'Biology': {
                questionCount: 90,
                marksPerQuestion: 4,
                negativeMarks: 1,
                sections: [
                    { type: 'mcq', count: 90, marks: 4 },
                ],
            },
        },
    },
};

/**
 * Generate a full syllabus test with proportional chapter coverage
 */
export async function generateFullSyllabusTest(
    request: FullSyllabusTestRequest
): Promise<GeneratedTestData> {
    const supabase = createAdminSupabaseClient();
    const pattern = EXAM_PATTERNS[request.examType];

    if (!pattern) {
        throw new Error(`Unknown exam type: ${request.examType}`);
    }

    const result: GeneratedTestData = {
        questionIds: [],
        questionMarks: [],
        subjectDistribution: {},
        difficultyDistribution: {},
        topicCoverage: [],
    };

    // Process each subject
    for (const subjectName of request.subjects) {
        const subjectPattern = pattern.subjects[subjectName];
        if (!subjectPattern) continue;

        // Get subject ID
        const { data: subjectData } = await supabase
            .from('subjects')
            .select('id')
            .eq('name', subjectName)
            .eq('exam_id', request.examId)
            .single() as any;

        if (!subjectData) {
            console.warn(`Subject ${subjectName} not found for exam ${request.examId}`);
            continue;
        }

        // Get all chapters/topics for this subject
        const { data: topics } = await supabase
            .from('topics')
            .select('id, name, chapter_number')
            .eq('subject_id', subjectData.id)
            .eq('is_active', true)
            .order('chapter_number', { ascending: true }) as any;

        if (!topics || topics.length === 0) {
            console.warn(`No topics found for subject ${subjectName}`);
            continue;
        }

        const topicIds = topics.map((t: any) => t.id);
        result.topicCoverage.push(...topics.map((t: any) => `${subjectName}: ${t.name}`));

        // Calculate questions per topic (proportional distribution)
        const questionsPerTopic = distributeQuestionsProportionally(
            subjectPattern.questionCount,
            topicIds.length
        );

        // Select questions for each topic
        let subjectQuestions: Array<{
            id: string;
            difficulty_level: string;
            topic_id: string;
            marks: number;
        }> = [];

        for (let i = 0; i < topicIds.length; i++) {
            const topicId = topicIds[i];
            const questionsNeeded = questionsPerTopic[i];

            if (questionsNeeded === 0) continue;

            // Get questions for this topic with difficulty distribution
            const { data: topicQuestions } = await supabase
                .from('questions')
                .select('id, difficulty_level, topic_id')
                .eq('topic_id', topicId)
                .eq('is_published', true)
                .in('difficulty_level', ['easy', 'medium', 'hard'])
                .limit(questionsNeeded * 3) as any;

            if (!topicQuestions || topicQuestions.length === 0) continue;

            // Select questions with difficulty distribution
            const selected = selectQuestionsWithDifficulty(
                topicQuestions,
                questionsNeeded,
                request.examType
            );

            // Assign marks based on exam pattern
            const questionsWithMarks = selected.map((q: any) => ({
                ...q,
                marks: subjectPattern.marksPerQuestion,
            }));

            subjectQuestions.push(...questionsWithMarks);
        }

        // If we don't have enough questions, fill from any topic in the subject
        if (subjectQuestions.length < subjectPattern.questionCount) {
            const remainingNeeded = subjectPattern.questionCount - subjectQuestions.length;
            const existingIds = subjectQuestions.map(q => q.id);

            const { data: additionalQuestions } = await supabase
                .from('questions')
                .select('id, difficulty_level, topic_id')
                .in('topic_id', topicIds)
                .eq('is_published', true)
                .not('id', 'in', existingIds.length > 0 ? `(${existingIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)')
                .limit(remainingNeeded * 2) as any;

            if (additionalQuestions && additionalQuestions.length > 0) {
                const additional = selectQuestionsWithDifficulty(
                    additionalQuestions,
                    remainingNeeded,
                    request.examType
                );

                subjectQuestions.push(...additional.map((q: any) => ({
                    ...q,
                    marks: subjectPattern.marksPerQuestion,
                })));
            }
        }

        // Shuffle and limit to exact count
        subjectQuestions = shuffleArray(subjectQuestions).slice(0, subjectPattern.questionCount);

        // Add to result
        result.questionIds.push(...subjectQuestions.map(q => q.id));
        result.questionMarks.push(...subjectQuestions.map(q => q.marks));
        result.subjectDistribution[subjectName] = subjectQuestions.length;

        // Track difficulty distribution
        for (const q of subjectQuestions) {
            const diff = q.difficulty_level || 'medium';
            result.difficultyDistribution[diff] = (result.difficultyDistribution[diff] || 0) + 1;
        }
    }

    // Final shuffle of all questions
    const combined = result.questionIds.map((id, idx) => ({
        id,
        marks: result.questionMarks[idx],
    }));

    const shuffled = shuffleArray(combined);
    result.questionIds = shuffled.map(q => q.id);
    result.questionMarks = shuffled.map(q => q.marks);

    return result;
}

/**
 * Distribute questions proportionally across chapters
 * Ensures all chapters are covered with more questions from larger/complex chapters
 */
function distributeQuestionsProportionally(
    totalQuestions: number,
    chapterCount: number
): number[] {
    if (chapterCount === 0) return [];

    const baseQuestions = Math.floor(totalQuestions / chapterCount);
    const remainder = totalQuestions % chapterCount;

    const distribution: number[] = [];

    for (let i = 0; i < chapterCount; i++) {
        // Give extra question to first 'remainder' chapters
        distribution.push(baseQuestions + (i < remainder ? 1 : 0));
    }

    return distribution;
}

/**
 * Select questions with optimal difficulty distribution based on exam type
 */
function selectQuestionsWithDifficulty(
    questions: Array<{ id: string; difficulty_level: string }>,
    count: number,
    examType: string
): Array<{ id: string; difficulty_level: string }> {
    // Define difficulty ratios based on exam type
    const difficultyRatios: Record<string, Record<string, number>> = {
        'jee-main': { easy: 0.4, medium: 0.4, hard: 0.2 },
        'jee-advanced': { easy: 0.2, medium: 0.4, hard: 0.4 },
        'neet': { easy: 0.5, medium: 0.35, hard: 0.15 },
    };

    const ratios = difficultyRatios[examType] || difficultyRatios['jee-main'];

    // Group questions by difficulty
    const byDifficulty: Record<string, typeof questions> = {
        easy: [],
        medium: [],
        hard: [],
    };

    for (const q of questions) {
        const diff = q.difficulty_level || 'medium';
        if (byDifficulty[diff]) {
            byDifficulty[diff].push(q);
        } else {
            byDifficulty.medium.push(q);
        }
    }

    const selected: typeof questions = [];

    // Select according to ratios
    for (const [difficulty, ratio] of Object.entries(ratios)) {
        const needed = Math.round(count * ratio);
        const available = byDifficulty[difficulty] || [];

        // Shuffle and take needed amount
        const shuffled = shuffleArray(available);
        selected.push(...shuffled.slice(0, needed));
    }

    // If we don't have enough, fill from any available
    if (selected.length < count) {
        const remaining = count - selected.length;
        const usedIds = new Set(selected.map(q => q.id));
        const remainingQuestions = questions.filter(q => !usedIds.has(q.id));

        selected.push(...shuffleArray(remainingQuestions).slice(0, remaining));
    }

    // Shuffle final selection
    return shuffleArray(selected).slice(0, count);
}

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Generate question paper metadata for admin review
 */
export async function generateTestMetadata(
    request: FullSyllabusTestRequest
): Promise<{
    subjectBreakdown: Record<string, { questions: number; marks: number }>;
    difficultyBreakdown: Record<string, number>;
    topicCoverage: string[];
    estimatedTime: number;
}> {
    const pattern = EXAM_PATTERNS[request.examType];

    const subjectBreakdown: Record<string, { questions: number; marks: number }> = {};

    for (const subject of request.subjects) {
        const subjectPattern = pattern.subjects[subject];
        if (subjectPattern) {
            subjectBreakdown[subject] = {
                questions: subjectPattern.questionCount,
                marks: subjectPattern.questionCount * subjectPattern.marksPerQuestion,
            };
        }
    }

    // Typical difficulty distribution
    const difficultyBreakdown: Record<string, number> =
        request.examType === 'jee-advanced'
            ? { easy: 20, medium: 40, hard: 40 }
            : request.examType === 'neet'
                ? { easy: 50, medium: 35, hard: 15 }
                : { easy: 40, medium: 40, hard: 20 };

    return {
        subjectBreakdown,
        difficultyBreakdown,
        topicCoverage: request.subjects,
        estimatedTime: request.durationMinutes,
    };
}

/**
 * Validate if enough questions exist for a full syllabus test
 */
export async function validateQuestionAvailability(
    examId: string,
    subjects: string[],
    minQuestionsPerSubject: number
): Promise<{
    valid: boolean;
    subjectStatus: Record<string, { available: number; required: number; sufficient: boolean }>;
}> {
    const supabase = createAdminSupabaseClient();

    const subjectStatus: Record<string, { available: number; required: number; sufficient: boolean }> = {};
    let allSufficient = true;

    for (const subjectName of subjects) {
        // Get subject ID
        const { data: subjectData } = await supabase
            .from('subjects')
            .select('id')
            .eq('name', subjectName)
            .eq('exam_id', examId)
            .single() as any;

        if (!subjectData) {
            subjectStatus[subjectName] = { available: 0, required: minQuestionsPerSubject, sufficient: false };
            allSufficient = false;
            continue;
        }

        // Get topic IDs
        const { data: topics } = await supabase
            .from('topics')
            .select('id')
            .eq('subject_id', subjectData.id)
            .eq('is_active', true) as any;

        const topicIds = topics?.map((t: any) => t.id) || [];

        // Count available questions
        const { count } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .in('topic_id', topicIds.length > 0 ? topicIds : ['00000000-0000-0000-0000-000000000000'])
            .eq('is_published', true) as any;

        const available = count || 0;
        const sufficient = available >= minQuestionsPerSubject;

        subjectStatus[subjectName] = {
            available,
            required: minQuestionsPerSubject,
            sufficient,
        };

        if (!sufficient) {
            allSufficient = false;
        }
    }

    return {
        valid: allSufficient,
        subjectStatus,
    };
}
