export type ValidationSeverity = 'info' | 'warning' | 'critical';

export interface ContentValidationIssue {
    severity: ValidationSeverity;
    message: string;
}

export interface ContentValidationSummary {
    overallScore: number;
    answerAccuracy: number;
    formulaCorrectness: number;
    duplicateRisk: number;
    syllabusAlignment: number;
    issues: ContentValidationIssue[];
    recommendations: string[];
    meta: Record<string, unknown>;
}

interface ValidationContext {
    topic?: string;
    subject?: string;
    targetExam?: string;
}

interface QuestionLike {
    question?: string;
    question_text?: string;
    solution?: string;
    solution_text?: string;
    correctAnswer?: string;
    correct_answer?: string;
    topic?: string;
    difficulty?: string;
    difficulty_level?: string | null;
}

function clampScore(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeText(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function extractQuestions(content: unknown): QuestionLike[] {
    if (!content || typeof content !== 'object') {
        return [];
    }

    if (Array.isArray(content)) {
        return content as QuestionLike[];
    }

    const maybeQuestions = (content as { questions?: unknown }).questions;
    return Array.isArray(maybeQuestions) ? maybeQuestions as QuestionLike[] : [];
}

function getQuestionText(question: QuestionLike): string {
    return question.question || question.question_text || '';
}

function getSolutionText(question: QuestionLike): string {
    return question.solution || question.solution_text || '';
}

function getCorrectAnswer(question: QuestionLike): string {
    return question.correctAnswer || question.correct_answer || '';
}

function scoreSyllabusAlignment(questions: QuestionLike[], context: ValidationContext): number {
    if (!questions.length || !context.topic) {
        return questions.length ? 78 : 60;
    }

    const target = normalizeText(context.topic);
    const matches = questions.filter((question) => {
        const haystack = normalizeText(
            `${getQuestionText(question)} ${question.topic || ''} ${context.subject || ''}`
        );
        return haystack.includes(target);
    }).length;

    return clampScore((matches / questions.length) * 100);
}

function scoreFormulaCorrectness(content: unknown, context: ValidationContext): number {
    if (!content || typeof content !== 'object') {
        return 55;
    }

    const formulas = Array.isArray((content as { formulas?: unknown[] }).formulas)
        ? (content as { formulas: string[] }).formulas
        : [];

    if (!['physics', 'chemistry', 'mathematics'].includes((context.subject || '').toLowerCase())) {
        return 90;
    }

    if (!formulas.length) {
        return 65;
    }

    const likelyFormulaCount = formulas.filter((formula) => /[=+\-*/^]/.test(formula)).length;
    return clampScore(60 + (likelyFormulaCount / formulas.length) * 40);
}

function detectDuplicateRatio(questions: QuestionLike[]): number {
    if (!questions.length) {
        return 0;
    }

    const seen = new Map<string, number>();
    questions.forEach((question) => {
        const normalized = normalizeText(getQuestionText(question));
        if (!normalized) {
            return;
        }
        seen.set(normalized, (seen.get(normalized) || 0) + 1);
    });

    const duplicateCount = [...seen.values()].reduce((total, count) => total + Math.max(0, count - 1), 0);
    return duplicateCount / questions.length;
}

export function validateGeneratedContent(
    kind: 'lecture' | 'question-set' | 'dpp' | 'mock-test',
    content: unknown,
    context: ValidationContext = {}
): ContentValidationSummary {
    const issues: ContentValidationIssue[] = [];
    const recommendations: string[] = [];
    const questions = extractQuestions(content);
    const duplicateRisk = detectDuplicateRatio(questions);

    let answerAccuracy = 75;
    let formulaCorrectness = scoreFormulaCorrectness(content, context);
    const syllabusAlignment = scoreSyllabusAlignment(questions, context);

    if (kind === 'lecture') {
        const sections = Array.isArray((content as { sections?: unknown[] })?.sections)
            ? (content as { sections: unknown[] }).sections
            : [];
        const keyPoints = Array.isArray((content as { keyPoints?: unknown[] })?.keyPoints)
            ? (content as { keyPoints: unknown[] }).keyPoints
            : [];

        answerAccuracy = clampScore(
            50 +
            Math.min(sections.length, 6) * 6 +
            Math.min(keyPoints.length, 6) * 4
        );

        if (sections.length < 3) {
            issues.push({ severity: 'warning', message: 'Lecture structure is shallow. Add more concept coverage sections.' });
            recommendations.push('Include introduction, derivation/application, and revision sections.');
        }
    } else {
        const withSolutions = questions.filter((question) => Boolean(getSolutionText(question).trim())).length;
        const withAnswers = questions.filter((question) => Boolean(getCorrectAnswer(question).trim())).length;
        answerAccuracy = clampScore(
            questions.length
                ? ((withSolutions + withAnswers) / (questions.length * 2)) * 100
                : 55
        );

        if (kind === 'dpp') {
            const distribution = questions.reduce<Record<string, number>>((accumulator, question) => {
                const level = question.difficulty || question.difficulty_level || 'medium';
                accumulator[level] = (accumulator[level] || 0) + 1;
                return accumulator;
            }, {});

            if (
                questions.length !== 15 ||
                (distribution.easy || 0) !== 5 ||
                (distribution.medium || 0) !== 6 ||
                (distribution.hard || 0) !== 4
            ) {
                issues.push({
                    severity: 'critical',
                    message: 'DPP distribution must be exactly 5 easy, 6 medium, and 4 hard questions.',
                });
                recommendations.push('Regenerate the DPP using the enforced 15-question blueprint.');
            }
        }
    }

    if (duplicateRisk > 0.12) {
        issues.push({ severity: 'critical', message: 'Duplicate content risk is too high.' });
        recommendations.push('Replace repeated prompts and vary the question framing.');
    } else if (duplicateRisk > 0.05) {
        issues.push({ severity: 'warning', message: 'Some overlap was detected in generated questions.' });
    }

    if (answerAccuracy < 80) {
        issues.push({ severity: 'warning', message: 'Some generated items are missing answers or worked solutions.' });
        recommendations.push('Ensure every assessment item includes a final answer and a complete solution.');
    }

    if (syllabusAlignment < 75) {
        issues.push({ severity: 'warning', message: 'Generated content drifts away from the requested topic or syllabus.' });
        recommendations.push('Tighten topic constraints and provide clearer syllabus context.');
    }

    if (formulaCorrectness < 70) {
        issues.push({ severity: 'warning', message: 'Formula coverage is weak for a quantitative topic.' });
        recommendations.push('Add checked formulas, derivations, and unit-aware worked examples.');
    }

    const overallScore = clampScore(
        answerAccuracy * 0.35 +
        formulaCorrectness * 0.2 +
        (100 - duplicateRisk * 100) * 0.2 +
        syllabusAlignment * 0.25
    );

    if (overallScore >= 90 && issues.length === 0) {
        recommendations.push('Content is ready for admin approval and publishing.');
    }

    return {
        overallScore,
        answerAccuracy,
        formulaCorrectness,
        duplicateRisk: clampScore(duplicateRisk * 100),
        syllabusAlignment,
        issues,
        recommendations,
        meta: {
            kind,
            questionCount: questions.length,
            topic: context.topic || null,
            subject: context.subject || null,
            targetExam: context.targetExam || null,
        },
    };
}

