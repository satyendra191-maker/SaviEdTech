import { NextRequest, NextResponse } from 'next/server';
import { monitoredRoute } from '@/lib/api/route-utils';
import { createAdminSupabaseClient } from '@/lib/supabase';
import {
    getCachedValue,
    sanitizeCacheKey,
    setCachedValue,
    withCircuitBreaker,
    withRetry,
} from '@/lib/resilience';

const AI_CACHE_TTL_MS = 5 * 60 * 1000;
const AI_REQUEST_TIMEOUT_MS = 15 * 1000;
const MAX_QUERY_LENGTH = 800;

interface AssistantRequestBody {
    query?: unknown;
    subject?: unknown;
}

interface KnowledgeSnapshot {
    promptContext: string;
    fallbackMessage: string;
    sources: string[];
}

interface LectureRow {
    title: string;
    description: string | null;
    tags: string[] | null;
}

interface QuestionRow {
    question_text: string;
    solution_text: string;
    hint: string | null;
    difficulty_level: string | null;
    tags: string[] | null;
}

interface TestRow {
    title: string;
    description: string | null;
    test_type: string;
    scheduled_at: string | null;
    question_count: number;
}

interface ChallengeRow {
    title: string | null;
    description: string | null;
    challenge_date: string;
    closes_at: string | null;
}

const STOP_WORDS = new Set([
    'about', 'after', 'again', 'also', 'and', 'any', 'are', 'can', 'could', 'does',
    'for', 'from', 'have', 'help', 'how', 'into', 'just', 'like', 'more', 'need',
    'please', 'show', 'tell', 'that', 'than', 'the', 'their', 'there', 'these',
    'this', 'what', 'when', 'where', 'which', 'with', 'would', 'your',
]);

const PLATFORM_GUIDE = [
    {
        keywords: ['dashboard', 'progress', 'analytics', 'rank'],
        answer: 'Use `/dashboard` for the overview, `/dashboard/analytics` for performance trends, and `/dashboard/settings` for account preferences.',
    },
    {
        keywords: ['lecture', 'video', 'class', 'notes'],
        answer: 'Use `/dashboard/lectures` to continue lessons, track watch progress, and open lecture notes.',
    },
    {
        keywords: ['practice', 'question', 'dpp'],
        answer: 'Use `/dashboard/practice` for topic practice and `/dashboard/dpp` for the daily practice problem sets.',
    },
    {
        keywords: ['mock', 'test', 'exam'],
        answer: 'Use `/dashboard/tests` to view mock tests, upcoming schedules, and detailed results after submission.',
    },
    {
        keywords: ['payment', 'course', 'enroll', 'refund'],
        answer: 'Browse `/courses` for enrollments, review policies on `/refund`, and contact support via `/contact` if a payment needs attention.',
    },
];

const FAQ_ENTRIES = [
    {
        question: 'What is SaviEduTech?',
        answer: 'SaviEduTech is a digital coaching platform for JEE and NEET preparation with lectures, mock tests, practice questions, and analytics.',
    },
    {
        question: 'How do I access study materials?',
        answer: 'Enrolled students can open the dashboard to reach lectures, notes, and practice resources tied to their account.',
    },
    {
        question: 'How do I track progress?',
        answer: 'The dashboard analytics section summarizes test scores, study time, rank prediction, and activity trends.',
    },
    {
        question: 'Can I interact with faculty?',
        answer: 'Students can use the dashboard doubt and lecture areas to continue learning and follow faculty-led content.',
    },
];

function truncate(value: string | null | undefined, maxLength: number): string {
    if (!value) {
        return '';
    }

    if (value.length <= maxLength) {
        return value;
    }

    return `${value.slice(0, maxLength - 3)}...`;
}

function getSystemPrompt(subject: string): string {
    const prompts: Record<string, string> = {
        physics: 'You are Dharmendra Sir, an elite Physics mentor for JEE/NEET. Explain with intuition, examples, and concise steps.',
        chemistry: 'You are Harendra Sir, a Chemistry mentor. Focus on concepts, memory anchors, mechanisms, and error prevention.',
        mathematics: 'You are Ravindra Sir, a Mathematics mentor. Break the problem into clear steps and highlight shortcuts when valid.',
        biology: 'You are Arvind Sir, a Biology mentor for NEET. Prioritize NCERT-aligned clarity and exam-relevant recall cues.',
        general: 'You are SaviEduTech AI, helping students and parents with study guidance and platform navigation.',
    };

    return prompts[subject] || prompts.general;
}

function normalizeSubject(value: unknown): string {
    const normalized = String(value || 'general').trim().toLowerCase();

    if (normalized === 'maths') {
        return 'mathematics';
    }

    if (['physics', 'chemistry', 'mathematics', 'biology', 'general'].includes(normalized)) {
        return normalized;
    }

    return 'general';
}

function extractKeywords(query: string, subject: string): string[] {
    const baseTokens = query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

    const subjectTokens = subject === 'general'
        ? []
        : [subject, subject === 'mathematics' ? 'math' : subject];

    return Array.from(new Set([...subjectTokens, ...baseTokens])).slice(0, 10);
}

function scoreTextMatch(text: string, keywords: string[]): number {
    return keywords.reduce((score, keyword) => (
        text.includes(keyword) ? score + 1 : score
    ), 0);
}

function pickMostRelevant<T>(items: T[], keywords: string[], toText: (item: T) => string, limit: number): T[] {
    const ranked = items
        .map((item) => ({
            item,
            score: scoreTextMatch(toText(item), keywords),
        }))
        .sort((left, right) => right.score - left.score);

    const matches = ranked.filter((entry) => entry.score > 0).map((entry) => entry.item);
    const selected = matches.length > 0 ? matches : ranked.map((entry) => entry.item);

    return selected.slice(0, limit);
}

function buildPlatformGuidance(query: string): string[] {
    const normalized = query.toLowerCase();
    const matches = PLATFORM_GUIDE
        .filter((entry) => entry.keywords.some((keyword) => normalized.includes(keyword)))
        .map((entry) => entry.answer);

    if (matches.length > 0) {
        return matches;
    }

    return [
        'For learning content, start in `/dashboard/lectures`; for practice use `/dashboard/practice`; for mock tests use `/dashboard/tests`.',
        'Use `/faq` and `/contact` when you need platform help that is not covered in the dashboard.',
    ];
}

async function buildKnowledgeSnapshot(query: string, subject: string): Promise<KnowledgeSnapshot> {
    const keywords = extractKeywords(query, subject);
    const sources: string[] = [];
    const promptSections: string[] = [];
    const fallbackSections: string[] = [];

    const faqMatches = pickMostRelevant(
        FAQ_ENTRIES,
        keywords,
        (entry) => `${entry.question} ${entry.answer}`.toLowerCase(),
        2
    );

    if (faqMatches.length > 0) {
        promptSections.push(
            `Platform FAQ:\n${faqMatches.map((entry) => `- ${entry.question}: ${entry.answer}`).join('\n')}`
        );
        faqMatches.forEach((entry) => sources.push(`FAQ: ${entry.question}`));
    }

    const platformGuidance = buildPlatformGuidance(query);
    promptSections.push(
        `Platform routes:\n${platformGuidance.map((entry) => `- ${entry}`).join('\n')}`
    );

    try {
        const supabase = createAdminSupabaseClient();
        const today = new Date().toISOString().slice(0, 10);

        const [
            lecturesResult,
            questionsResult,
            testsResult,
            challengeResult,
        ] = await Promise.all([
            supabase
                .from('lectures')
                .select('title, description, tags')
                .eq('is_published', true)
                .order('published_at', { ascending: false })
                .limit(18),
            supabase
                .from('questions')
                .select('question_text, solution_text, hint, difficulty_level, tags')
                .eq('is_published', true)
                .order('updated_at', { ascending: false })
                .limit(18),
            supabase
                .from('tests')
                .select('title, description, test_type, scheduled_at, question_count')
                .eq('is_published', true)
                .order('scheduled_at', { ascending: true })
                .limit(12),
            supabase
                .from('daily_challenges')
                .select('title, description, challenge_date, closes_at')
                .gte('challenge_date', today)
                .order('challenge_date', { ascending: true })
                .limit(2),
        ]);

        const lectures = pickMostRelevant(
            ((lecturesResult.data || []) as LectureRow[]),
            keywords,
            (lecture) => `${lecture.title} ${lecture.description || ''} ${(lecture.tags || []).join(' ')}`.toLowerCase(),
            3
        );

        if (lectures.length > 0) {
            promptSections.push(
                `Lecture system:\n${lectures.map((lecture) => (
                    `- ${lecture.title}: ${truncate(lecture.description, 120) || 'Published lecture available for this area.'}`
                )).join('\n')}`
            );
            lectures.forEach((lecture) => sources.push(`Lecture: ${lecture.title}`));
            fallbackSections.push(
                `Relevant lectures:\n${lectures.map((lecture) => `- ${lecture.title}`).join('\n')}`
            );
        }

        const questions = pickMostRelevant(
            ((questionsResult.data || []) as QuestionRow[]),
            keywords,
            (question) => `${question.question_text} ${question.solution_text} ${question.hint || ''} ${(question.tags || []).join(' ')}`.toLowerCase(),
            3
        );

        if (questions.length > 0) {
            promptSections.push(
                `Practice question system:\n${questions.map((question, index) => (
                    `- Question ${index + 1}: ${truncate(question.question_text, 110)} | Hint: ${truncate(question.hint || question.solution_text, 90)} | Difficulty: ${question.difficulty_level || 'mixed'}`
                )).join('\n')}`
            );
            sources.push('Practice question bank');
            fallbackSections.push(
                `Practice support:\n${questions.map((question, index) => `- Question ${index + 1}: ${truncate(question.question_text, 90)}`).join('\n')}`
            );
        }

        const tests = pickMostRelevant(
            ((testsResult.data || []) as TestRow[]),
            keywords,
            (test) => `${test.title} ${test.description || ''} ${test.test_type}`.toLowerCase(),
            2
        );

        if (tests.length > 0) {
            promptSections.push(
                `Mock test system:\n${tests.map((test) => (
                    `- ${test.title}: ${test.question_count} questions, type=${test.test_type}, scheduled=${test.scheduled_at || 'available on dashboard'}`
                )).join('\n')}`
            );
            tests.forEach((test) => sources.push(`Test: ${test.title}`));
            fallbackSections.push(
                `Mock tests:\n${tests.map((test) => `- ${test.title}`).join('\n')}`
            );
        }

        const challenges = ((challengeResult.data || []) as ChallengeRow[]).slice(0, 1);
        if (challenges.length > 0) {
            const challenge = challenges[0];
            promptSections.push(
                `Daily challenge:\n- ${challenge.title || 'Daily Challenge'} on ${challenge.challenge_date}. ${truncate(challenge.description, 110)}`
            );
            sources.push(`Challenge: ${challenge.title || 'Daily Challenge'}`);
        }
    } catch (error) {
        console.warn('Failed to build AI knowledge snapshot from Supabase:', error);
    }

    const fallbackLines = [
        'SaviEdu AI is using fallback guidance right now.',
        '',
        ...fallbackSections,
        '',
        'Recommended next steps:',
        ...buildPlatformGuidance(query).map((line) => `- ${line}`),
    ].filter(Boolean);

    return {
        promptContext: promptSections.join('\n\n'),
        fallbackMessage: fallbackLines.join('\n'),
        sources: Array.from(new Set(sources)).slice(0, 6),
    };
}

function buildFallbackResponse(errorMessage: string, snapshot: KnowledgeSnapshot, retryAfterSeconds?: number) {
    return NextResponse.json(
        {
            response: snapshot.fallbackMessage,
            fallback: true,
            retryable: true,
            retryAfterSeconds,
            error: retryAfterSeconds
                ? `${errorMessage} Retry in about ${retryAfterSeconds} seconds.`
                : errorMessage,
            sources: snapshot.sources,
            cached: false,
        },
        {
            headers: {
                'x-savi-cache': 'bypass',
                'x-savi-fallback': 'true',
            },
        }
    );
}

export async function POST(request: NextRequest) {
    return monitoredRoute(request, async () => {
        let snapshot: KnowledgeSnapshot = {
            promptContext: '',
            fallbackMessage: 'SaviEdu AI is temporarily unavailable. Please retry in a moment.',
            sources: [],
        };

        try {
            const body = (await request.json()) as AssistantRequestBody;
            const query = typeof body.query === 'string' ? body.query.trim() : '';
            const subject = normalizeSubject(body.subject);

            if (query.length < 4) {
                return NextResponse.json(
                    { error: 'Please enter a longer question so SaviEdu AI can help properly.' },
                    {
                        status: 400,
                        headers: {
                            'x-savi-cache': 'bypass',
                        },
                    }
                );
            }

            if (query.length > MAX_QUERY_LENGTH) {
                return NextResponse.json(
                    { error: `Questions must be ${MAX_QUERY_LENGTH} characters or fewer.` },
                    {
                        status: 400,
                        headers: {
                            'x-savi-cache': 'bypass',
                        },
                    }
                );
            }

            snapshot = await buildKnowledgeSnapshot(query, subject);

            const normalizedQuery = sanitizeCacheKey(query);
            const cacheKey = `ai:query:${normalizeSubject(subject)}:${normalizedQuery}`;
            const cachedResponse = getCachedValue<{ response: string; sources: string[] }>(cacheKey);
            if (cachedResponse) {
                return NextResponse.json(
                    {
                        response: cachedResponse.response,
                        sources: cachedResponse.sources,
                        fallback: false,
                        retryable: false,
                        cached: true,
                    },
                    {
                        headers: {
                            'x-savi-cache': 'hit',
                        },
                    }
                );
            }

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                return buildFallbackResponse(
                    'AI service configuration is missing. Showing platform guidance instead.',
                    snapshot
                );
            }

            const systemPrompt = getSystemPrompt(subject);
            const combinedPrompt = [
                systemPrompt,
                'You are answering inside the SaviEduTech platform.',
                'Use the supplied platform knowledge when relevant.',
                'If the knowledge snapshot lacks an exact fact, say that directly and give the best safe guidance you can without inventing platform details.',
                'Keep the answer practical, concise, and easy for students or parents to follow.',
                '',
                'Knowledge snapshot:',
                snapshot.promptContext || 'No structured platform context was available.',
                '',
                `User question: ${query}`,
            ].join('\n');

            const circuitResult = await withCircuitBreaker(
                'gemini-ai-query',
                async () => withRetry(async () => {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

                    try {
                        const response = await fetch(
                            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    contents: [
                                        {
                                            role: 'user',
                                            parts: [{ text: combinedPrompt }],
                                        },
                                    ],
                                    generationConfig: {
                                        temperature: 0.6,
                                        topK: 32,
                                        topP: 0.92,
                                        maxOutputTokens: 768,
                                    },
                                }),
                                signal: controller.signal,
                            }
                        );

                        const data = await response.json();
                        if (!response.ok) {
                            console.error('Gemini API error:', data);
                            throw new Error('AI generation failed');
                        }

                        return data;
                    } finally {
                        clearTimeout(timeout);
                    }
                }, {
                    maxAttempts: 3,
                    baseDelayMs: 400,
                    maxDelayMs: 3000,
                }),
                {
                    failureThreshold: 5,
                    resetTimeoutMs: 30 * 1000,
                    halfOpenSuccessThreshold: 2,
                }
            );

            if (circuitResult.retryAfterSeconds) {
                return buildFallbackResponse(
                    'AI service is temporarily unavailable.',
                    snapshot,
                    circuitResult.retryAfterSeconds
                );
            }

            const aiResponse = circuitResult.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (!aiResponse) {
                return buildFallbackResponse(
                    'AI service returned an empty answer.',
                    snapshot
                );
            }

            setCachedValue(cacheKey, {
                response: aiResponse,
                sources: snapshot.sources,
            }, AI_CACHE_TTL_MS);

            return NextResponse.json(
                {
                    response: aiResponse,
                    sources: snapshot.sources,
                    fallback: false,
                    retryable: false,
                    cached: false,
                },
                {
                    headers: {
                        'x-savi-cache': 'miss',
                    },
                }
            );
        } catch (error) {
            console.error('AI query processing failed:', error);
            return buildFallbackResponse(
                'SaviEdu AI could not respond right now.',
                snapshot
            );
        }
    }, {
        routeLabel: '/api/ai/query',
        defaultCacheControl: 'no-store',
        metadata: { feature: 'ai-query-assistant' },
    });
}
