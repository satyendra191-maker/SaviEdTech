import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function verifyCron(request: NextRequest): boolean {
    const auth = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;
    return !!secret && auth === `Bearer ${secret}`;
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
            job_name: jobName, status, details, duration_ms: durationMs ?? null,
            executed_at: new Date().toISOString(),
        });
    } catch { /* silently ignore */ }
}

export async function GET(request: NextRequest) {
    if (!verifyCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const startTime = Date.now();
    const jobId = `marketing_${Date.now()}`;
    const supabase = createServerSupabaseClient();
    await logCronJob(supabase, 'marketing-automation', 'running', { jobId });

    const results = {
        seoArticlesGenerated: 0,
        youtubeScripts: 0,
        promotionalVideosQueued: 0,
        analyticsUpdated: 0,
        errors: [] as string[],
    };

    try {
        // Step 1: Generate SEO content articles
        const seoTopics = [
            { title: 'Best JEE Preparation Strategy 2025', keyword: 'JEE preparation 2025', subject: 'JEE' },
            { title: 'NEET Biology Important Topics', keyword: 'NEET biology topics', subject: 'NEET' },
            { title: 'How to Score 99 Percentile in JEE Mains', keyword: 'JEE Mains 99 percentile', subject: 'JEE' },
        ];

        for (const topic of seoTopics) {
            const { data: existing } = await (supabase as any)
                .from('blog_posts')
                .select('id')
                .eq('seo_keyword', topic.keyword)
                .maybeSingle();

            if (!existing) {
                await (supabase as any).from('blog_posts').insert({
                    title: topic.title,
                    slug: topic.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                    content: generateSeoContent(topic.title, topic.subject),
                    seo_keyword: topic.keyword,
                    is_published: false,
                    is_ai_generated: true,
                    created_at: new Date().toISOString(),
                });
                results.seoArticlesGenerated++;
            }
        }

        // Step 2: Generate YouTube video scripts
        const youtubeTopics = [
            'Physics Numerical Tricks for JEE 2025',
            'NEET Chemistry Quick Revision',
            'Top 5 Mistakes in JEE Preparation',
        ];

        for (const ytTopic of youtubeTopics) {
            await (supabase as any).from('youtube_scripts').upsert({
                title: ytTopic,
                script: generateYoutubeScript(ytTopic),
                status: 'draft',
                is_ai_generated: true,
                generated_at: new Date().toISOString(),
            }, { onConflict: 'title' });
            results.youtubeScripts++;
        }

        // Step 3: Queue promotional AI videos
        await (supabase as any).from('promotional_videos').insert({
            title: `SaviEduTech Platform Highlight — ${new Date().toLocaleDateString('en-IN')}`,
            status: 'queued',
            type: 'promotional',
            created_at: new Date().toISOString(),
        });
        results.promotionalVideosQueued++;

        // Step 4: Update marketing analytics
        const { count: totalLeads } = await (supabase as any)
            .from('lead_forms')
            .select('id', { count: 'exact', head: true });

        const { count: convertedLeads } = await (supabase as any)
            .from('lead_forms')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'converted');

        const { count: blogViews } = await (supabase as any)
            .from('blog_analytics')
            .select('id', { count: 'exact', head: true })
            .gte('viewed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        await (supabase as any).from('marketing_analytics').upsert({
            date: new Date().toISOString().split('T')[0],
            total_leads: totalLeads ?? 0,
            converted_leads: convertedLeads ?? 0,
            blog_views_7d: blogViews ?? 0,
            conversion_rate: totalLeads ? Math.round(((convertedLeads ?? 0) / totalLeads) * 100) : 0,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'date' });
        results.analyticsUpdated++;

        const duration = Date.now() - startTime;
        await logCronJob(supabase, 'marketing-automation', 'success', results, duration);
        return NextResponse.json({ success: true, results, duration, jobId });
    } catch (error) {
        const duration = Date.now() - startTime;
        const msg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(msg);
        await logCronJob(supabase, 'marketing-automation', 'failed', { error: msg }, duration);
        return NextResponse.json({ success: false, error: msg, results, jobId }, { status: 500 });
    }
}

function generateSeoContent(title: string, subject: string): string {
    return `# ${title}\n\nSaviEduTech provides the best resources for ${subject} preparation. Our AI-powered platform helps students achieve top ranks in competitive exams.\n\n## Key Highlights\n- Personalized AI learning paths\n- 10,000+ practice questions\n- Expert video lectures\n- Mock tests with detailed analysis\n\n[AI-generated at ${new Date().toISOString()}]`;
}

function generateYoutubeScript(topic: string): string {
    return `[INTRO]\nHey everyone! Welcome to SaviEduTech. Today we're covering: ${topic}.\n\n[MAIN CONTENT]\nLet's dive right in with the most important points you need to know...\n\n[OUTRO]\nDon't forget to subscribe and check out our full course at saviedutech.vercel.app!\n\n[AI-generated at ${new Date().toISOString()}]`;
}
