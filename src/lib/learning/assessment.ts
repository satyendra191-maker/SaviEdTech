import type { Question, QuestionOption } from '@/types';

export interface AssessmentQuestion extends Pick<
    Question,
    | 'id'
    | 'question_type'
    | 'question_text'
    | 'question_image_url'
    | 'solution_text'
    | 'solution_image_url'
    | 'correct_answer'
    | 'marks'
    | 'negative_marks'
    | 'difficulty_level'
    | 'hint'
> {
    options?: QuestionOption[];
    subject_name?: string | null;
    topic_name?: string | null;
    section_name?: string | null;
}

export interface QuestionOutcome {
    questionId: string;
    userAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    isAttempted: boolean;
    marksObtained: number;
}

function normalizeAnswer(answer: string | null | undefined): string {
    return (answer ?? '').trim().toLowerCase();
}

function compareNumericalAnswer(correctAnswer: string, userAnswer: string): boolean {
    const correctValue = Number.parseFloat(correctAnswer);
    const userValue = Number.parseFloat(userAnswer);

    if (Number.isNaN(correctValue) || Number.isNaN(userValue)) {
        return normalizeAnswer(correctAnswer) === normalizeAnswer(userAnswer);
    }

    return Math.abs(correctValue - userValue) <= 0.001;
}

export function isAnswerCorrect(question: Pick<AssessmentQuestion, 'question_type' | 'correct_answer'>, answer: string | null | undefined): boolean {
    const normalizedUserAnswer = normalizeAnswer(answer);
    if (!normalizedUserAnswer) {
        return false;
    }

    if (question.question_type === 'NUMERICAL') {
        return compareNumericalAnswer(question.correct_answer, normalizedUserAnswer);
    }

    return normalizedUserAnswer === normalizeAnswer(question.correct_answer);
}

export function evaluateQuestion(
    question: Pick<AssessmentQuestion, 'id' | 'question_type' | 'correct_answer' | 'marks' | 'negative_marks'>,
    answer: string | null | undefined,
    overrides?: { marks?: number | null; negativeMarks?: number | null }
): QuestionOutcome {
    const isAttempted = Boolean(normalizeAnswer(answer));
    const isCorrect = isAttempted ? isAnswerCorrect(question, answer) : false;
    const positiveMarks = overrides?.marks ?? question.marks;
    const negativeMarks = overrides?.negativeMarks ?? question.negative_marks;

    let marksObtained = 0;
    if (isAttempted) {
        marksObtained = isCorrect ? positiveMarks : -Math.max(negativeMarks, 0);
    }

    return {
        questionId: question.id,
        userAnswer: answer?.trim() || null,
        correctAnswer: question.correct_answer,
        isCorrect,
        isAttempted,
        marksObtained,
    };
}

export function sumMarks(outcomes: QuestionOutcome[]): number {
    return outcomes.reduce((total, outcome) => total + outcome.marksObtained, 0);
}

export function calculateAccuracy(correctCount: number, attemptedCount: number): number {
    if (attemptedCount <= 0) {
        return 0;
    }

    return Number(((correctCount / attemptedCount) * 100).toFixed(2));
}

export function formatTestLabel(testType: string, examName?: string | null): string {
    if (examName) {
        return examName;
    }

    switch (testType) {
        case 'full_mock':
            return 'Mock Test';
        case 'subject_test':
            return 'Subject Test';
        case 'chapter_test':
            return 'Chapter Test';
        default:
            return 'Custom Test';
    }
}
