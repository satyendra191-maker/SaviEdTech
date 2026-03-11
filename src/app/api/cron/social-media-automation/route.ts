import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function verifyCronSecret(request: NextRequest): Promise<boolean> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return false;
    
    const token = authHeader.replace('Bearer ', '');
    return token === process.env.CRON_SECRET;
}

interface Course {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    created_at: string;
}

interface DppSet {
    id: string;
    title: string;
    subject: string;
    topic: string;
    published_at: string;
}

export async function GET(request: NextRequest) {
    const requestId = `social_automation_${Date.now()}`;
    const startTime = Date.now();

    try {
        const isValid = await verifyCronSecret(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerSupabaseClient();
        
        const results = {
            postsCreated: 0,
            storiesCreated: 0,
            engagementTracked: 0,
            trendingTopics: [] as string[],
            errors: [] as string[],
        };

        const { data: recentCourses } = await supabase
            .from('courses')
            .select('id, title, description, thumbnail_url, created_at')
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(10) as { data: Course[] | null };

        if (recentCourses && recentCourses.length > 0) {
            for (const course of recentCourses) {
                const daysSinceCreation = Math.floor(
                    (Date.now() - new Date(course.created_at).getTime()) / (1000 * 60 * 60 * 24)
                );
                
                if (daysSinceCreation <= 7) {
                    const { error: postError } = await (supabase
                        .from('social_posts' as any)
                        .insert({
                            platform: 'instagram',
                            post_type: 'course_promotion',
                            content: `New Course Alert! 🎓\n\n${course.title}\n\n${course.description?.substring(0, 150)}...`,
                            media_url: course.thumbnail_url,
                            reference_id: course.id,
                            reference_type: 'course',
                            scheduled_at: new Date().toISOString(),
                            status: 'published',
                        }) as any);

                    if (!postError) {
                        results.postsCreated++;
                    } else {
                        results.errors.push(`Failed to create post for course ${course.id}: ${postError.message}`);
                    }
                }
            }
        }

        const { data: DPPs } = await supabase
            .from('dpp_sets')
            .select('id, title, subject, topic, published_at')
            .eq('is_published', true)
            .order('published_at', { ascending: false })
            .limit(5) as { data: DppSet[] | null };

        if (DPPs && DPPs.length > 0) {
            for (const dpp of DPPs) {
                const daysSincePub = Math.floor(
                    (Date.now() - new Date(dpp.published_at).getTime()) / (1000 * 60 * 60 * 24)
                );
                
                if (daysSincePub <= 3) {
                    const { error: postError } = await (supabase
                        .from('social_posts' as any)
                        .insert({
                            platform: 'facebook',
                            post_type: 'dpp_release',
                            content: `📚 Daily Practice Problem Released!\n\n${dpp.topic} - ${dpp.subject}\n\nAce your preparation with today's DPP!`,
                            reference_id: dpp.id,
                            reference_type: 'dpp',
                            scheduled_at: new Date().toISOString(),
                            status: 'published',
                        }) as any);

                    if (!postError) {
                        results.postsCreated++;
                    }
                }
            }
        }

        const { data: testResults } = await supabase
            .from('test_attempts')
            .select('id, student_id, test_id, total_marks, percentile')
            .order('created_at', { ascending: false })
            .limit(10);

        if (testResults && testResults.length > 3) {
            const topScorers = testResults
                .filter((t: any) => t.percentile && t.percentile >= 95)
                .slice(0, 3);

            if (topScorers.length > 0) {
                const { error: postError } = await (supabase
                    .from('social_posts' as any)
                    .insert({
                        platform: 'instagram',
                        post_type: 'achievement',
                        content: `🏆 Top Performers Alert!\n\nCongratulations to our students achieving 95+ percentile! Keep up the great work!`,
                        scheduled_at: new Date().toISOString(),
                        status: 'published',
                    }) as any);

                if (!postError) {
                    results.postsCreated++;
                }
            }
        }

        const trendingTopics = ['JEE 2026', 'NEET Preparation', 'Board Exams', 'Smart Study', 'Online Learning'];
        results.trendingTopics = trendingTopics.slice(0, 3);

        const { data: stories } = await (supabase
            .from('social_posts' as any)
            .insert([
                {
                    platform: 'instagram',
                    post_type: 'story',
                    content: '📖 Daily Learning Tip: Consistent practice is key to success!',
                    scheduled_at: new Date().toISOString(),
                    status: 'published',
                },
            ]) as any);

        if (stories) {
            results.storiesCreated = stories.length || 1;
        }

        const duration = Date.now() - startTime;

        console.log(`[Social Automation] Completed in ${duration}ms - Posts: ${results.postsCreated}, Stories: ${results.storiesCreated}`);

        return NextResponse.json({
            success: true,
            message: 'Social media automation completed',
            results,
            duration,
            requestId,
        });

    } catch (error) {
        console.error(`[Social Automation] Error: ${error}`);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
        }, { status: 500 });
    }
}
