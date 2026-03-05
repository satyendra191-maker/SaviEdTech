/**
 * AI Lecture Generation API
 * 
 * POST /api/ai/generate-lecture
 * 
 * Generates educational lectures using AI faculty personas.
 * Supports both English lecture scripts and Hinglish video narration.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    generateLecture,
    LectureRequest,
    LectureContent,
    formatLectureForDisplay
} from '@/lib/ai/content-generator';
import { getTeacherById, getAllTeachers, Subject } from '@/lib/ai/teachers';
import { createAdminSupabaseClient } from '@/lib/supabase';

// Validation schema for lecture request
interface LectureRequestBody {
    teacherId: string;
    topic: string;
    subtopic?: string;
    duration?: number;
    difficulty?: 'basic' | 'intermediate' | 'advanced';
    targetExam?: 'jee-main' | 'jee-advanced' | 'neet' | 'boards';
    language?: 'english' | 'hinglish';
    includeExamples?: boolean;
    includePractice?: boolean;
    saveToDatabase?: boolean;
    chapterId?: string;
    courseId?: string;
}

const DEFAULT_DURATION = 45;
const DEFAULT_DIFFICULTY = 'intermediate';
const DEFAULT_TARGET_EXAM = 'jee-main';
const DEFAULT_LANGUAGE = 'english';

export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body: LectureRequestBody = await request.json();

        // Validate required fields
        const validationError = validateRequest(body);
        if (validationError) {
            return NextResponse.json(
                { success: false, error: validationError },
                { status: 400 }
            );
        }

        // Set defaults
        const lectureRequest: LectureRequest = {
            teacherId: body.teacherId,
            topic: body.topic,
            subtopic: body.subtopic,
            duration: body.duration || DEFAULT_DURATION,
            difficulty: body.difficulty || DEFAULT_DIFFICULTY,
            targetExam: body.targetExam || DEFAULT_TARGET_EXAM,
            language: body.language || DEFAULT_LANGUAGE,
            includeExamples: body.includeExamples !== false,
            includePractice: body.includePractice !== false,
        };

        // Generate lecture content
        const startTime = Date.now();
        const lectureContent = await generateLecture(lectureRequest);
        const generationTime = Date.now() - startTime;

        // Save to database if requested
        let savedLectureId: string | undefined;
        if (body.saveToDatabase) {
            savedLectureId = await saveLectureToDatabase(lectureContent, body);
        }

        // Log generation metrics
        console.log(`[AI Lecture] Generated lecture in ${generationTime}ms:`, {
            teacherId: lectureRequest.teacherId,
            topic: lectureRequest.topic,
            duration: lectureRequest.duration,
            language: lectureRequest.language,
        });

        // Return successful response
        return NextResponse.json({
            success: true,
            data: {
                lecture: lectureContent,
                savedId: savedLectureId,
                generationTime,
            },
            meta: {
                teacher: getTeacherById(lectureRequest.teacherId)?.displayName,
                subject: lectureContent.metadata.subject,
                contentStats: {
                    sections: lectureContent.sections.length,
                    practiceProblems: lectureContent.practiceProblems?.length || 0,
                    totalDuration: lectureContent.duration,
                },
            },
        });

    } catch (error) {
        console.error('[AI Lecture] Generation failed:', error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate lecture',
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}

// GET endpoint for retrieving available teachers and lecture templates
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    try {
        switch (action) {
            case 'teachers':
                return getTeachersList();

            case 'templates':
                const subject = searchParams.get('subject') as Subject | null;
                return getLectureTemplates(subject);

            case 'preview':
                return getLecturePreview();

            default:
                return getGenerationInfo();
        }
    } catch (error) {
        console.error('[AI Lecture] GET request failed:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process request' },
            { status: 500 }
        );
    }
}

function validateRequest(body: LectureRequestBody): string | null {
    if (!body.teacherId) {
        return 'Teacher ID is required';
    }

    if (!body.topic) {
        return 'Topic is required';
    }

    if (body.topic.length < 3) {
        return 'Topic must be at least 3 characters long';
    }

    if (body.duration && (body.duration < 15 || body.duration > 180)) {
        return 'Duration must be between 15 and 180 minutes';
    }

    const validTeachers = ['dharmendra', 'harendra', 'ravindra', 'arvind'];
    if (!validTeachers.includes(body.teacherId.toLowerCase())) {
        return `Invalid teacher ID. Valid options: ${validTeachers.join(', ')}`;
    }

    return null;
}

async function saveLectureToDatabase(
    content: LectureContent,
    request: LectureRequestBody
): Promise<string> {
    const supabase = createAdminSupabaseClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('ai_lectures')
        .insert({
            title: content.title,
            description: content.description,
            teacher_id: request.teacherId,
            subject: content.metadata.subject,
            topic: content.metadata.topic,
            duration: content.duration,
            difficulty: content.metadata.difficulty,
            target_exam: request.targetExam || DEFAULT_TARGET_EXAM,
            language: request.language || DEFAULT_LANGUAGE,
            content: content,
            chapter_id: request.chapterId,
            course_id: request.courseId,
            status: 'draft',
            created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

    if (error) {
        console.error('[AI Lecture] Database save failed:', error);
        throw new Error('Failed to save lecture to database');
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
        teachingStyle: teacher.teachingStyle,
        personality: teacher.personality,
        catchphrases: teacher.catchphrases,
    }));

    return NextResponse.json({
        success: true,
        data: { teachers },
    });
}

function getLectureTemplates(subject?: Subject | null) {
    const templates = [
        {
            id: 'concept-intro',
            name: 'Concept Introduction',
            description: 'Introduces a new concept with real-world connections',
            structure: ['Hook', 'Definition', 'Examples', 'Summary'],
            bestFor: 'New topics',
            estimatedDuration: 30,
        },
        {
            id: 'deep-dive',
            name: 'Deep Dive',
            description: 'Comprehensive coverage with derivations and applications',
            structure: ['Recap', 'Detailed Explanation', 'Derivation', 'Advanced Examples', 'Practice'],
            bestFor: 'Complex topics',
            estimatedDuration: 60,
        },
        {
            id: 'problem-solving',
            name: 'Problem Solving Session',
            description: 'Focus on solving various types of problems',
            structure: ['Formula Recap', 'Problem Types', 'Solved Examples', 'Practice Problems'],
            bestFor: 'Revision and practice',
            estimatedDuration: 45,
        },
        {
            id: 'revision',
            name: 'Quick Revision',
            description: 'Fast-paced revision of previously covered topics',
            structure: ['Key Points', 'Important Formulas', 'Quick Examples', 'Summary'],
            bestFor: 'Exam preparation',
            estimatedDuration: 30,
        },
        {
            id: 'exam-focus',
            name: 'Exam-Focused',
            description: 'Targeted preparation for specific exam patterns',
            structure: ['Exam Pattern', 'Important Topics', 'Previous Year Questions', 'Tips & Tricks'],
            bestFor: 'JEE/NEET preparation',
            estimatedDuration: 45,
        },
    ];

    return NextResponse.json({
        success: true,
        data: {
            templates,
            subject: subject || 'all',
        },
    });
}

function getLecturePreview() {
    const previewData = {
        sampleLecture: {
            title: 'Sample: Newton\'s Laws of Motion',
            teacher: 'Dharmendra Sir',
            subject: 'Physics',
            duration: 45,
            sections: [
                { title: 'Introduction', type: 'introduction', duration: 5 },
                { title: 'Newton\'s First Law', type: 'concept', duration: 10 },
                { title: 'Newton\'s Second Law', type: 'concept', duration: 12 },
                { title: 'Newton\'s Third Law', type: 'concept', duration: 10 },
                { title: 'Practice Problems', type: 'application', duration: 8 },
            ],
            narrationPreview: {
                english: "Welcome students! Today we will explore Newton's Laws of Motion.",
                hinglish: "Namaste students! Aaj hum Newton's Laws of Motion samajhenge. Dekho, physics mein yeh bahut important hai...",
            },
        },
        features: [
            'AI-generated content with teacher personality',
            'English lecture scripts',
            'Hinglish video narration',
            'Practice problems with solutions',
            'Key points and formulas',
            'Customizable duration and difficulty',
        ],
    };

    return NextResponse.json({
        success: true,
        data: previewData,
    });
}

function getGenerationInfo() {
    return NextResponse.json({
        success: true,
        data: {
            description: 'AI Lecture Generation API',
            version: '1.0.0',
            endpoints: {
                POST: {
                    description: 'Generate a new lecture',
                    body: {
                        teacherId: 'string (required) - dharmendra, harendra, ravindra, or arvind',
                        topic: 'string (required) - Lecture topic',
                        subtopic: 'string (optional) - Specific subtopic',
                        duration: 'number (optional) - Duration in minutes (15-180, default: 45)',
                        difficulty: 'string (optional) - basic, intermediate, or advanced',
                        targetExam: 'string (optional) - jee-main, jee-advanced, neet, or boards',
                        language: 'string (optional) - english or hinglish',
                        includeExamples: 'boolean (optional) - Include solved examples',
                        includePractice: 'boolean (optional) - Include practice problems',
                        saveToDatabase: 'boolean (optional) - Save to database',
                    },
                },
                GET: {
                    description: 'Get available resources',
                    queryParams: {
                        action: 'teachers | templates | preview',
                        subject: 'Filter templates by subject (optional)',
                    },
                },
            },
            teachers: [
                { id: 'dharmendra', name: 'Dharmendra Sir', subject: 'Physics' },
                { id: 'harendra', name: 'Harendra Sir', subject: 'Chemistry' },
                { id: 'ravindra', name: 'Ravindra Sir', subject: 'Mathematics' },
                { id: 'arvind', name: 'Arvind Sir', subject: 'Biology' },
            ],
        },
    });
}
