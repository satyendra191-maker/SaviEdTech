/**
 * AI Questions Generation API
 * 
 * POST /api/ai/generate-questions
 * 
 * Generates practice questions and assessments using AI faculty personas.
 * Supports MCQs, numerical problems, and theoretical questions.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    generateQuestions,
    QuestionRequest,
    QuestionSet,
    formatQuestionsForDisplay
} from '@/lib/ai/content-generator';
import { getTeacherById, getAllTeachers, Subject } from '@/lib/ai/teachers';
import { createAdminSupabaseClient } from '@/lib/supabase';

// Validation schema for question request
interface QuestionRequestBody {
    teacherId: string;
    topic: string;
    count?: number;
    difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
    questionType?: 'mcq' | 'numerical' | 'theoretical' | 'assertion_reason' | 'mixed';
    targetExam?: 'jee-main' | 'jee-advanced' | 'neet' | 'boards';
    includeSolution?: boolean;
    saveToDatabase?: boolean;
    batchId?: string;
    tags?: string[];
}

const DEFAULT_COUNT = 10;
const DEFAULT_DIFFICULTY = 'mixed';
const DEFAULT_QUESTION_TYPE = 'mixed';
const DEFAULT_TARGET_EXAM = 'jee-main';
const MAX_COUNT = 50;
const MIN_COUNT = 1;

export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body: QuestionRequestBody = await request.json();

        // Validate required fields
        const validationError = validateRequest(body);
        if (validationError) {
            return NextResponse.json(
                { success: false, error: validationError },
                { status: 400 }
            );
        }

        // Set defaults
        const questionRequest: QuestionRequest = {
            teacherId: body.teacherId,
            topic: body.topic,
            count: Math.min(Math.max(body.count || DEFAULT_COUNT, MIN_COUNT), MAX_COUNT),
            difficulty: body.difficulty || DEFAULT_DIFFICULTY,
            questionType: body.questionType || DEFAULT_QUESTION_TYPE,
            targetExam: body.targetExam || DEFAULT_TARGET_EXAM,
            includeSolution: body.includeSolution !== false,
        };

        // Generate questions
        const startTime = Date.now();
        const questionSet = await generateQuestions(questionRequest);
        const generationTime = Date.now() - startTime;

        // Save to database if requested
        let savedSetId: string | undefined;
        if (body.saveToDatabase) {
            savedSetId = await saveQuestionsToDatabase(questionSet, body);
        }

        // Log generation metrics
        console.log(`[AI Questions] Generated questions in ${generationTime}ms:`, {
            teacherId: questionRequest.teacherId,
            topic: questionRequest.topic,
            count: questionRequest.count,
            difficulty: questionRequest.difficulty,
        });

        // Return successful response
        return NextResponse.json({
            success: true,
            data: {
                questionSet,
                savedId: savedSetId,
                generationTime,
            },
            meta: {
                teacher: getTeacherById(questionRequest.teacherId)?.displayName,
                subject: questionSet.metadata.subject,
                questionStats: {
                    total: questionSet.questions.length,
                    byDifficulty: countByDifficulty(questionSet.questions),
                    byType: countByType(questionSet.questions),
                    totalMarks: questionSet.totalMarks,
                    estimatedTime: questionSet.estimatedTime,
                },
            },
        });

    } catch (error) {
        console.error('[AI Questions] Generation failed:', error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate questions',
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}

// GET endpoint for retrieving available options and templates
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    try {
        switch (action) {
            case 'teachers':
                return getTeachersList();

            case 'difficulty-levels':
                return getDifficultyLevels();

            case 'question-types':
                return getQuestionTypes();

            case 'exam-patterns':
                return getExamPatterns();

            case 'sample':
                return getSampleQuestions();

            default:
                return getGenerationInfo();
        }
    } catch (error) {
        console.error('[AI Questions] GET request failed:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process request' },
            { status: 500 }
        );
    }
}

function validateRequest(body: QuestionRequestBody): string | null {
    if (!body.teacherId) {
        return 'Teacher ID is required';
    }

    if (!body.topic) {
        return 'Topic is required';
    }

    if (body.topic.length < 3) {
        return 'Topic must be at least 3 characters long';
    }

    if (body.count !== undefined) {
        if (body.count < MIN_COUNT || body.count > MAX_COUNT) {
            return `Count must be between ${MIN_COUNT} and ${MAX_COUNT}`;
        }
    }

    const validTeachers = ['dharmendra', 'harendra', 'ravindra', 'arvind'];
    if (!validTeachers.includes(body.teacherId.toLowerCase())) {
        return `Invalid teacher ID. Valid options: ${validTeachers.join(', ')}`;
    }

    const validDifficulties = ['easy', 'medium', 'hard', 'mixed'];
    if (body.difficulty && !validDifficulties.includes(body.difficulty)) {
        return `Invalid difficulty. Valid options: ${validDifficulties.join(', ')}`;
    }

    const validQuestionTypes = ['mcq', 'numerical', 'theoretical', 'assertion_reason', 'mixed'];
    if (body.questionType && !validQuestionTypes.includes(body.questionType)) {
        return `Invalid question type. Valid options: ${validQuestionTypes.join(', ')}`;
    }

    return null;
}

function countByDifficulty(questions: { difficulty: string }[]): Record<string, number> {
    return questions.reduce((acc, q) => {
        acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
}

function countByType(questions: { questionType: string }[]): Record<string, number> {
    return questions.reduce((acc, q) => {
        acc[q.questionType] = (acc[q.questionType] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
}

async function saveQuestionsToDatabase(
    questionSet: QuestionSet,
    request: QuestionRequestBody
): Promise<string> {
    const supabase = createAdminSupabaseClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('ai_question_sets')
        .insert({
            title: questionSet.title,
            description: questionSet.description,
            teacher_id: request.teacherId,
            subject: questionSet.metadata.subject,
            topic: questionSet.metadata.topic,
            difficulty: questionSet.metadata.difficulty,
            target_exam: request.targetExam || DEFAULT_TARGET_EXAM,
            question_count: questionSet.questions.length,
            total_marks: questionSet.totalMarks,
            estimated_time: questionSet.estimatedTime,
            questions: questionSet.questions,
            batch_id: request.batchId,
            tags: request.tags || [],
            status: 'active',
            created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

    if (error) {
        console.error('[AI Questions] Database save failed:', error);
        throw new Error('Failed to save questions to database');
    }

    return data?.id || 'unknown';
}

function getTeachersList() {
    const teachers = getAllTeachers().map(teacher => ({
        id: teacher.id,
        name: teacher.displayName,
        subject: teacher.subjectDisplay,
        avatar: teacher.avatar,
        color: teacher.color,
        expertise: teacher.teachingStyle,
    }));

    return NextResponse.json({
        success: true,
        data: { teachers },
    });
}

function getDifficultyLevels() {
    const levels = [
        {
            id: 'easy',
            name: 'Easy',
            description: 'Fundamental concepts and direct formula application',
            timePerQuestion: 2,
            marksPerQuestion: 4,
            recommendedFor: 'Beginners and revision',
        },
        {
            id: 'medium',
            name: 'Medium',
            description: 'Concept application with slight complexity',
            timePerQuestion: 4,
            marksPerQuestion: 4,
            recommendedFor: 'Regular practice',
        },
        {
            id: 'hard',
            name: 'Hard',
            description: 'Multi-concept problems requiring deep understanding',
            timePerQuestion: 6,
            marksPerQuestion: 4,
            recommendedFor: 'Advanced preparation',
        },
        {
            id: 'mixed',
            name: 'Mixed',
            description: 'Balanced mix of all difficulty levels',
            timePerQuestion: 4,
            marksPerQuestion: 4,
            recommendedFor: 'Comprehensive practice',
        },
    ];

    return NextResponse.json({
        success: true,
        data: { levels },
    });
}

function getQuestionTypes() {
    const types = [
        {
            id: 'mcq',
            name: 'Multiple Choice Questions',
            description: 'Standard MCQs with 4 options',
            bestFor: ['JEE Main', 'NEET', 'Quick assessment'],
            format: 'Single correct answer',
        },
        {
            id: 'numerical',
            name: 'Numerical Problems',
            description: 'Problems requiring numerical answers',
            bestFor: ['JEE Advanced', 'Physics', 'Chemistry', 'Mathematics'],
            format: 'Integer or decimal answer',
        },
        {
            id: 'theoretical',
            name: 'Theoretical Questions',
            description: 'Descriptive and explanatory questions',
            bestFor: ['Board exams', 'Biology', 'Concept explanation'],
            format: 'Detailed written answer',
        },
        {
            id: 'assertion_reason',
            name: 'Assertion-Reason',
            description: 'Statement-based reasoning questions with linked explanations',
            bestFor: ['Concept checks', 'Board exams', 'Deep understanding'],
            format: 'Assertion and reason analysis',
        },
        {
            id: 'mixed',
            name: 'Mixed Types',
            description: 'Combination of all question types',
            bestFor: ['Comprehensive tests', 'All exams'],
            format: 'Varied',
        },
    ];

    return NextResponse.json({
        success: true,
        data: { types },
    });
}

function getExamPatterns() {
    const patterns = [
        {
            exam: 'jee-main',
            name: 'JEE Main',
            subjects: ['Physics', 'Chemistry', 'Mathematics'],
            questionDistribution: {
                mcq: 20,
                numerical: 10,
                total: 90,
            },
            marking: {
                correct: 4,
                incorrect: -1,
                unattempted: 0,
            },
            duration: 180,
        },
        {
            exam: 'jee-advanced',
            name: 'JEE Advanced',
            subjects: ['Physics', 'Chemistry', 'Mathematics'],
            questionDistribution: {
                'single-correct': 'Varies',
                'multiple-correct': 'Varies',
                'numerical': 'Varies',
                'match-type': 'Varies',
            },
            marking: {
                correct: 'Varies by question',
                incorrect: 'Partial negative',
                unattempted: 0,
            },
            duration: 180,
        },
        {
            exam: 'neet',
            name: 'NEET',
            subjects: ['Physics', 'Chemistry', 'Biology'],
            questionDistribution: {
                physics: 50,
                chemistry: 50,
                biology: 100,
                total: 200,
            },
            marking: {
                correct: 4,
                incorrect: -1,
                unattempted: 0,
            },
            duration: 200,
        },
        {
            exam: 'boards',
            name: 'Board Exams',
            subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
            questionDistribution: {
                mcq: '20%',
                short: '40%',
                long: '40%',
            },
            marking: {
                correct: 'As per marks',
                incorrect: 0,
                unattempted: 0,
            },
            duration: 180,
        },
    ];

    return NextResponse.json({
        success: true,
        data: { patterns },
    });
}

function getSampleQuestions() {
    const samples = {
        physics: {
            topic: 'Newton\'s Laws of Motion',
            questions: [
                {
                    id: 'sample-1',
                    question: 'A block of mass 5 kg is placed on a frictionless surface. A force of 10 N is applied to it. What is the acceleration of the block?',
                    type: 'mcq',
                    difficulty: 'easy',
                    options: ['1 m/s²', '2 m/s²', '5 m/s²', '10 m/s²'],
                    correctAnswer: '2 m/s²',
                    solution: 'Using F = ma, a = F/m = 10/5 = 2 m/s²',
                    teacherExplanation: 'Dharmendra Sir: Dekho, simple hai. F = ma formula lagao, values substitute karo, answer mil gaya!',
                },
            ],
        },
        chemistry: {
            topic: 'Chemical Bonding',
            questions: [
                {
                    id: 'sample-2',
                    question: 'Which type of bond is formed between two atoms with electronegativity difference of 1.8?',
                    type: 'mcq',
                    difficulty: 'medium',
                    options: ['Ionic', 'Covalent', 'Metallic', 'Hydrogen'],
                    correctAnswer: 'Covalent',
                    solution: 'Electronegativity difference between 0.4 and 1.7 indicates polar covalent bond. Above 1.7 is ionic.',
                    teacherExplanation: 'Harendra Sir: Electronegativity difference dekho! 1.8 ka matlab polar covalent bond!',
                },
            ],
        },
        mathematics: {
            topic: 'Quadratic Equations',
            questions: [
                {
                    id: 'sample-3',
                    question: 'Find the roots of x² - 5x + 6 = 0',
                    type: 'numerical',
                    difficulty: 'easy',
                    correctAnswer: '2, 3',
                    solution: 'x² - 5x + 6 = (x-2)(x-3) = 0, so x = 2 or x = 3',
                    teacherExplanation: 'Ravindra Sir: Factorization method use karo. 6 ke factors 2 and 3 hain jo 5 banate hain. Bilkul simple!',
                },
            ],
        },
        biology: {
            topic: 'Cell Structure',
            questions: [
                {
                    id: 'sample-4',
                    question: 'Which organelle is known as the powerhouse of the cell?',
                    type: 'mcq',
                    difficulty: 'easy',
                    options: ['Nucleus', 'Mitochondria', 'Chloroplast', 'Ribosome'],
                    correctAnswer: 'Mitochondria',
                    solution: 'Mitochondria produces ATP through cellular respiration, hence called powerhouse of the cell.',
                    teacherExplanation: 'Arvind Sir: Mitochondria! ATP produce karta hai, energy deta hai cell ko. Yaad rakho!',
                },
            ],
        },
    };

    return NextResponse.json({
        success: true,
        data: { samples },
    });
}

function getGenerationInfo() {
    return NextResponse.json({
        success: true,
        data: {
            description: 'AI Questions Generation API',
            version: '1.0.0',
            endpoints: {
                POST: {
                    description: 'Generate practice questions',
                    body: {
                        teacherId: 'string (required) - dharmendra, harendra, ravindra, or arvind',
                        topic: 'string (required) - Question topic',
                        count: 'number (optional) - Number of questions (1-50, default: 10)',
                        difficulty: 'string (optional) - easy, medium, hard, or mixed',
                        questionType: 'string (optional) - mcq, numerical, theoretical, assertion_reason, or mixed',
                        targetExam: 'string (optional) - jee-main, jee-advanced, neet, or boards',
                        includeSolution: 'boolean (optional) - Include detailed solutions',
                        saveToDatabase: 'boolean (optional) - Save to database',
                        tags: 'string[] (optional) - Tags for organization',
                    },
                },
                GET: {
                    description: 'Get available resources',
                    queryParams: {
                        action: 'teachers | difficulty-levels | question-types | exam-patterns | sample',
                    },
                },
            },
            teachers: [
                { id: 'dharmendra', name: 'Dharmendra Sir', subject: 'Physics', specialty: 'Concept + Problems' },
                { id: 'harendra', name: 'Harendra Sir', subject: 'Chemistry', specialty: 'Mechanisms + Memory tricks' },
                { id: 'ravindra', name: 'Ravindra Sir', subject: 'Mathematics', specialty: 'Step-by-step solutions' },
                { id: 'arvind', name: 'Arvind Sir', subject: 'Biology', specialty: 'Diagrams + NCERT focus' },
            ],
            features: [
                'AI-generated questions with teacher personality',
                'Multiple question types (MCQ, Numerical, Theoretical)',
                'Difficulty-based generation',
                'Exam-specific patterns (JEE, NEET, Boards)',
                'Detailed solutions with teacher explanations',
                'Common mistakes and tips',
            ],
        },
    });
}
