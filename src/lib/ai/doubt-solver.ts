import { Buffer } from 'node:buffer';
import { createAdminSupabaseClient } from '@/lib/supabase';

export interface DoubtSolveInput {
    userId?: string | null;
    question: string;
    description?: string;
    subject?: string;
    topic?: string;
    extractedText?: string | null;
    imageFile?: File | null;
}

export interface VideoSolution {
    videoId: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    videoUrl: string | null;
    thumbnailUrl: string | null;
    durationSeconds: number | null;
    estimatedCompletionTime: string | null;
}

export interface SolvedDoubt {
    answer: string;
    conceptExplanation: string;
    steps: string[];
    extractedText: string | null;
    relatedPractice: Array<{
        id: string;
        question: string;
        difficulty: string | null;
        solution: string;
    }>;
    recommendedTopics: string[];
    savedDoubtId?: string;
    imageUrl?: string | null;
    videoSolution?: VideoSolution;
}

function titleCase(value: string): string {
    return value
        .split(/[\s_]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

function createHeuristicSteps(input: DoubtSolveInput): string[] {
    const topicLabel = titleCase(input.topic || input.subject || 'the concept');
    return [
        `Identify what the question is really asking about ${topicLabel}.`,
        'Write down the core formula, rule, or biological principle before solving.',
        'Substitute the known data carefully and keep units or conditions consistent.',
        'Check whether the final result matches the concept and the expected answer type.',
    ];
}

function createAnswer(input: DoubtSolveInput): string {
    const subject = titleCase(input.subject || 'General');
    const topic = titleCase(input.topic || input.subject || 'this concept');
    const statement = input.question.trim() || input.description?.trim() || 'the uploaded academic problem';
    const extractionNote = input.extractedText
        ? ` OCR hints: ${input.extractedText}.`
        : '';

    return `${subject} doubt analysis for "${statement}": focus on ${topic}. Start from the governing idea, solve the expression step by step, and then verify the conclusion against the question conditions.${extractionNote}`;
}

async function uploadDoubtImage(userId: string | null | undefined, imageFile: File): Promise<string | null> {
    const supabase = createAdminSupabaseClient();
    const extension = imageFile.name.split('.').pop()?.toLowerCase() || 'png';
    const ownerFolder = userId || 'guest';
    const path = `${ownerFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabase.storage
        .from('doubt-images')
        .upload(path, buffer, {
            contentType: imageFile.type || 'image/png',
            upsert: false,
        });

    if (error) {
        console.warn('[AI Doubt Solver] Failed to upload doubt image:', error);
        return null;
    }

    const { data } = supabase.storage.from('doubt-images').getPublicUrl(path);
    return data.publicUrl;
}

async function findRelatedPractice(subject?: string, topic?: string): Promise<SolvedDoubt['relatedPractice']> {
    const supabase = createAdminSupabaseClient();
    const searchTerms = [topic, subject].filter(Boolean).map((value) => value!.toLowerCase());

    const { data } = await (supabase.from('questions') as any)
        .select('id, question_text, difficulty_level, solution_text, tags')
        .eq('is_published', true)
        .limit(24);

    const filtered = ((data as Array<Record<string, unknown>> | null) || [])
        .filter((question) => {
            if (searchTerms.length === 0) {
                return true;
            }

            const haystack = `${question.question_text || ''} ${(question.tags as string[] | undefined)?.join(' ') || ''}`.toLowerCase();
            return searchTerms.some((term) => haystack.includes(term));
        })
        .slice(0, 3)
        .map((question) => ({
            id: String(question.id),
            question: String(question.question_text || 'Practice question'),
            difficulty: typeof question.difficulty_level === 'string' ? question.difficulty_level : null,
            solution: String(question.solution_text || 'Review the relevant concept and retry this question.'),
        }));

    return filtered;
}

async function saveDoubtAndResponse(
    input: DoubtSolveInput,
    responseText: string,
    imageUrl: string | null
): Promise<string | undefined> {
    if (!input.userId) {
        return undefined;
    }

    const supabase = createAdminSupabaseClient();

    const { data: doubtRow, error: doubtError } = await (supabase.from('doubts') as any)
        .insert({
            user_id: input.userId,
            question: input.question || 'Uploaded doubt',
            description: input.description || null,
            subject: input.subject || null,
            topic: input.topic || null,
            image_url: imageUrl,
            status: 'answered',
            priority: 'medium',
            assigned_faculty_id: 'ai-doubt-solver',
            answered_at: new Date().toISOString(),
        })
        .select('id')
        .single();

    if (doubtError || !doubtRow?.id) {
        throw new Error('Failed to save doubt.');
    }

    const { error: responseError } = await (supabase.from('doubt_responses') as any)
        .insert({
            doubt_id: doubtRow.id,
            faculty_id: 'ai-doubt-solver',
            response: responseText,
        });

    if (responseError) {
        throw new Error('Failed to save doubt response.');
    }

    return String(doubtRow.id);
}

async function generateVideoSolution(
    input: DoubtSolveInput,
    steps: string[],
    conceptExplanation: string
): Promise<VideoSolution | undefined> {
    const supabase = createAdminSupabaseClient();
    
    const videoId = `doubt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const topicName = titleCase(input.topic || input.subject || 'Academic Concept');
    
    const script = [
        `[INTRO]`,
        `Welcome! Let's solve this ${topicName} problem together.`,
        ``,
        `[CONCEPT]`,
        conceptExplanation,
        ``,
        `[STEPS]`,
        ...steps.map((step, idx) => `Step ${idx + 1}: ${step}`),
        ``,
        `[OUTRO]`,
        `Great job working through this problem! Keep practicing for better results.`,
    ].join('\n');

    try {
        const { data: videoQueueEntry, error: queueError } = await (supabase.from('video_generation_queue') as any)
            .insert({
                topic_id: videoId,
                topic_name: `Doubt Solution: ${topicName}`,
                content_type: 'doubt_solution',
                script: script,
                status: 'pending',
                request_source: 'ai-doubt-solver',
                request_metadata: {
                    original_question: input.question,
                    subject: input.subject,
                    topic: input.topic,
                    steps_count: steps.length,
                },
            })
            .select('id')
            .single();

        if (queueError) {
            console.warn('[AI Doubt Solver] Failed to queue video generation:', queueError);
            return undefined;
        }

        return {
            videoId: videoQueueEntry?.id || videoId,
            status: 'queued',
            videoUrl: null,
            thumbnailUrl: null,
            durationSeconds: null,
            estimatedCompletionTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        };
    } catch (error) {
        console.warn('[AI Doubt Solver] Video queue error:', error);
        return undefined;
    }
}

export async function solveAcademicDoubt(input: DoubtSolveInput): Promise<SolvedDoubt> {
    const extractedText = input.imageFile
        ? `Uploaded image: ${input.imageFile.name}. OCR fallback mode used; typed question text was prioritized.`
        : input.extractedText || null;
    const steps = createHeuristicSteps(input);
    const answer = createAnswer({ ...input, extractedText });
    const relatedPractice = await findRelatedPractice(input.subject, input.topic);
    const recommendedTopics = [
        titleCase(input.topic || input.subject || 'Core Concepts'),
        `Application of ${titleCase(input.subject || 'Concepts')}`,
        `${titleCase(input.subject || 'Exam')} practice review`,
    ];
    const conceptExplanation = `This solution path focuses on ${titleCase(input.topic || input.subject || 'the relevant idea')}, checks the governing rule first, and then confirms the final outcome using exam-style reasoning.`;
    const imageUrl = input.imageFile ? await uploadDoubtImage(input.userId, input.imageFile) : null;
    const responseText = [
        answer,
        '',
        'Step-by-step approach:',
        ...steps.map((step, index) => `${index + 1}. ${step}`),
        '',
        `Concept help: ${conceptExplanation}`,
    ].join('\n');

    const savedDoubtId = await saveDoubtAndResponse(input, responseText, imageUrl);

    const videoSolution = await generateVideoSolution(input, steps, conceptExplanation);

    return {
        answer,
        conceptExplanation,
        steps,
        extractedText,
        relatedPractice,
        recommendedTopics,
        savedDoubtId,
        imageUrl,
        videoSolution,
    };
}
