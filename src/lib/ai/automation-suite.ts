import { generateQuestions, type QuestionRequest } from '@/lib/ai/content-generator';
import { validateGeneratedContent } from '@/lib/ai/content-quality-validator';

export interface AutomationSuiteRequest {
    teacherId: string;
    topic: string;
    subject: string;
    targetExam: 'jee-main' | 'jee-advanced' | 'neet' | 'boards';
    syllabusContext?: string;
    duration?: number;
    questionCount?: number;
    generationDays?: number;
}

export async function generateDppPack(request: AutomationSuiteRequest) {
    const baseRequest: QuestionRequest = {
        teacherId: request.teacherId,
        topic: request.topic,
        count: 15,
        difficulty: 'mixed',
        questionType: 'mixed',
        targetExam: request.targetExam,
        includeSolution: true,
    };

    const set = await generateQuestions(baseRequest);
    const forcedDifficulties: Array<'easy' | 'medium' | 'hard'> = [
        'easy', 'easy', 'easy', 'easy', 'easy',
        'medium', 'medium', 'medium', 'medium', 'medium', 'medium',
        'hard', 'hard', 'hard', 'hard',
    ];

    const questions = set.questions.slice(0, 15).map((question, index) => ({
        ...question,
        difficulty: forcedDifficulties[index] || question.difficulty,
    }));

    const validation = validateGeneratedContent('dpp', { ...set, questions }, {
        topic: request.topic,
        subject: request.subject,
        targetExam: request.targetExam,
    });

    return {
        title: `${request.topic} DPP`,
        blueprint: { easy: 5, medium: 6, hard: 4 },
        questions,
        validation,
    };
}

export async function generateMockTestPack(request: AutomationSuiteRequest) {
    const totalQuestions = Math.min(Math.max(request.questionCount || 30, 20), 90);
    const questionSet = await generateQuestions({
        teacherId: request.teacherId,
        topic: request.topic,
        count: totalQuestions,
        difficulty: 'mixed',
        questionType: 'mixed',
        targetExam: request.targetExam,
        includeSolution: true,
    });

    const sectionName = request.subject === 'biology' ? 'Biology' : request.subject.charAt(0).toUpperCase() + request.subject.slice(1);
    const validation = validateGeneratedContent('mock-test', questionSet, {
        topic: request.topic,
        subject: request.subject,
        targetExam: request.targetExam,
    });

    return {
        title: `${sectionName} Mock Test - ${request.topic}`,
        durationMinutes: request.duration || (request.targetExam === 'neet' ? 180 : 120),
        totalMarks: questionSet.totalMarks,
        questionCount: questionSet.questions.length,
        sections: [
            {
                name: sectionName,
                questions: questionSet.questions,
            },
        ],
        validation,
    };
}

export function generateAcademicCalendar(request: AutomationSuiteRequest) {
    const days = Math.min(Math.max(request.generationDays || 365, 30), 365);
    const startDate = new Date();
    const schedule = Array.from({ length: days }).map((_, index) => {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + index);
        const isoDate = currentDate.toISOString().split('T')[0] || '';

        return {
            date: isoDate,
            lecture: `${request.topic} lecture block`,
            dpp: `${request.topic} DPP`,
            mockTest: (index + 1) % 7 === 0 ? `Weekly mock test ${Math.floor((index + 1) / 7)}` : null,
            revisionTest: (index + 1) % 30 === 0 ? `Monthly revision test ${Math.floor((index + 1) / 30)}` : null,
        };
    });

    return {
        title: `${days}-Day Academic Calendar`,
        summary: `Daily lectures and DPP tasks with weekly mock tests and monthly revision checkpoints for ${request.targetExam.toUpperCase()}.`,
        schedule,
    };
}

export function generateGrowthAssets(request: AutomationSuiteRequest) {
    const examLabel = request.targetExam.toUpperCase();
    const slug = `${request.topic}-${request.targetExam}-study-guide`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    return {
        seoPage: {
            slug,
            title: `${request.topic} for ${examLabel} | SaviEduTech`,
            metaDescription: `Master ${request.topic} for ${examLabel} with lectures, DPP, mock tests, and AI guidance from SaviEduTech.`,
        },
        youtube: {
            title: `${request.topic} in 15 Minutes | ${examLabel} Revision`,
            hook: `Most students lose marks in ${request.topic}. Here's the shortcut revision flow.`,
            cta: 'Join SaviEduTech for full lectures, DPP, and mock tests.',
        },
        telegram: `Daily ${examLabel} sprint: revise ${request.topic}, solve one DPP, and attempt the challenge question before 9 PM.`,
        instagram: `Revision reel idea: 3 mistakes students make in ${request.topic} and the one method that fixes them. #${request.targetExam.replace(/[^a-z]/gi, '')} #SaviEduTech`,
        facebook: `Parent + student study alert: ${request.topic} is now live with guided lectures, DPP, and exam-focused practice.`,
        linkedin: `SaviEduTech growth pack: converting ${request.topic} into an exam-ready learning funnel with AI lectures, practice, and analytics.`,
        twitter: [
            `1/ ${request.topic} is a scoring lever for ${examLabel} if studied through lecture -> DPP -> mock feedback.`,
            `2/ Most losses come from skipping concept revision before practice.`,
            `3/ Build a 45-minute loop today and track accuracy daily with SaviEduTech.`,
        ],
    };
}

