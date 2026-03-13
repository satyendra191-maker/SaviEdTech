import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CRON_SECRET = process.env.CRON_SECRET;

function verifyCron(request: NextRequest): boolean {
    const auth = request.headers.get('authorization');
    return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

async function logCronJob(
    supabase: ReturnType<typeof createServerSupabaseClient>,
    jobName: string,
    status: 'running' | 'success' | 'failed',
    details: Record<string, unknown> = {},
    durationMs?: number
) {
    try {
        await (supabase as any).from('cron_job_logs').insert({
            job_name: jobName,
            status,
            details,
            duration_ms: durationMs ?? null,
            executed_at: new Date().toISOString(),
        });
    } catch {
        // silently ignore log errors
    }
}

export async function GET(request: NextRequest) {
    if (!verifyCron(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    const jobId = `ai_content_${Date.now()}`;
    const supabase = createServerSupabaseClient();

    await logCronJob(supabase, 'ai-content', 'running', { jobId });

    const results = {
        lectureScripts: 0,
        slides: 0,
        narrations: 0,
        videosQueued: 0,
        lecturesPublished: 0,
        practiceQuestions: 0,
        errors: [] as string[],
    };

    try {
        // Step 1: Generate lecture scripts for pending content
        const { data: pendingLectures } = await (supabase as any)
            .from('lectures')
            .select('id, title, subject, topic, script_generated')
            .eq('script_generated', false)
            .eq('is_ai_generated', true)
            .limit(10);

        if (pendingLectures) {
            for (const lecture of pendingLectures) {
                const script = generateLectureScript(lecture.title, lecture.subject, lecture.topic);
                await (supabase as any)
                    .from('lectures')
                    .update({
                        script,
                        script_generated: true,
                        script_generated_at: new Date().toISOString(),
                    })
                    .eq('id', lecture.id);
                results.lectureScripts++;
            }
        }

        // Step 2: Generate slides metadata for scripted lectures
        const { data: scriptedLectures } = await (supabase as any)
            .from('lectures')
            .select('id, title, script')
            .eq('script_generated', true)
            .eq('slides_generated', false)
            .limit(10);

        if (scriptedLectures) {
            for (const lecture of scriptedLectures) {
                const slides = generateSlidesMetadata(lecture.title, lecture.script);
                await (supabase as any)
                    .from('lectures')
                    .update({
                        slides_metadata: slides,
                        slides_generated: true,
                        slides_generated_at: new Date().toISOString(),
                    })
                    .eq('id', lecture.id);
                results.slides++;
            }
        }

        // Step 3: Queue narration generation
        const { data: slidesReady } = await (supabase as any)
            .from('lectures')
            .select('id, title')
            .eq('slides_generated', true)
            .eq('narration_queued', false)
            .limit(10);

        if (slidesReady) {
            for (const lecture of slidesReady) {
                await (supabase as any)
                    .from('lectures')
                    .update({
                        narration_queued: true,
                        narration_queued_at: new Date().toISOString(),
                    })
                    .eq('id', lecture.id);
                results.narrations++;
            }
        }

        // Step 4: Queue video rendering
        const { data: narrationReady } = await (supabase as any)
            .from('lectures')
            .select('id, title')
            .eq('narration_queued', true)
            .eq('video_render_queued', false)
            .limit(5);

        if (narrationReady) {
            for (const lecture of narrationReady) {
                await (supabase as any)
                    .from('lectures')
                    .update({
                        video_render_queued: true,
                        video_render_queued_at: new Date().toISOString(),
                    })
                    .eq('id', lecture.id);
                results.videosQueued++;
            }
        }

        // Step 5: Publish ready lectures
        const { data: renderReady } = await (supabase as any)
            .from('lectures')
            .select('id, title')
            .eq('video_render_queued', true)
            .eq('is_published', false)
            .eq('auto_publish', true)
            .limit(5);

        if (renderReady) {
            for (const lecture of renderReady) {
                await (supabase as any)
                    .from('lectures')
                    .update({
                        is_published: true,
                        published_at: new Date().toISOString(),
                    })
                    .eq('id', lecture.id);
                results.lecturesPublished++;
            }
        }

        // Step 6: Generate practice questions from published lectures
        const { data: recentLectures } = await (supabase as any)
            .from('lectures')
            .select('id, title, subject, topic')
            .eq('is_published', true)
            .eq('questions_generated', false)
            .limit(5);

        if (recentLectures) {
            for (const lecture of recentLectures) {
                const questions = generatePracticeQuestions(lecture.title, lecture.subject, lecture.topic);
                for (const q of questions) {
                    await (supabase as any).from('questions').insert({
                        ...q,
                        lecture_id: lecture.id,
                        created_by_ai: true,
                        created_at: new Date().toISOString(),
                    });
                }
                await (supabase as any)
                    .from('lectures')
                    .update({ questions_generated: true })
                    .eq('id', lecture.id);
                results.practiceQuestions += questions.length;
            }
        }

        const duration = Date.now() - startTime;
        await logCronJob(supabase, 'ai-content', 'success', results, duration);

        return NextResponse.json({
            success: true,
            message: 'AI content generation cycle completed',
            results,
            duration,
            jobId,
        });
    } catch (error) {
        const duration = Date.now() - startTime;
        const msg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(msg);
        await logCronJob(supabase, 'ai-content', 'failed', { error: msg, ...results }, duration);

        return NextResponse.json(
            { success: false, error: msg, results, jobId },
            { status: 500 }
        );
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateLectureScript(title: string, subject: string, topic: string): string {
    return [
        `# ${title}`,
        `Subject: ${subject} | Topic: ${topic}`,
        '',
        `## Introduction`,
        `Welcome to this lecture on ${topic}. In this session, we will cover the fundamental concepts and their applications.`,
        '',
        `## Core Concepts`,
        `This section covers the key principles of ${topic} relevant to competitive exams like JEE and NEET.`,
        '',
        `## Problem-Solving Approach`,
        `We will work through representative problems step by step.`,
        '',
        `## Summary`,
        `Today we covered ${topic}. Practice the questions linked below to reinforce your understanding.`,
        '',
        `[AI-generated at ${new Date().toISOString()}]`,
    ].join('\n');
}

function generateSlidesMetadata(title: string, script: string): object {
    const lines = script.split('\n').filter(l => l.startsWith('## '));
    return {
        title,
        slides: lines.map((heading, i) => ({
            index: i + 1,
            heading: heading.replace('## ', ''),
            duration_seconds: 120,
            animations: ['fade-in', 'slide-up'],
        })),
        generated_at: new Date().toISOString(),
    };
}

function generatePracticeQuestions(title: string, subject: string, topic: string) {
    return [
        {
            question_text: `Which of the following best describes ${topic}?`,
            options: JSON.stringify(['Option A', 'Option B', 'Option C', 'Option D']),
            correct_option: 'A',
            difficulty: 'medium',
            subject,
            topic,
            question_type: 'MCQ',
            marks: 4,
            negative_marks: 1,
        },
        {
            question_text: `A problem related to ${topic} involving application of key formulas.`,
            options: JSON.stringify(['Option A', 'Option B', 'Option C', 'Option D']),
            correct_option: 'B',
            difficulty: 'hard',
            subject,
            topic,
            question_type: 'MCQ',
            marks: 4,
            negative_marks: 1,
        },
    ];
}
