import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const results = {
        reviews: { generated: 0, sent: 0 },
        ratings: { aggregated: 0 },
        incentives: { created: 0 },
        errors: [] as string[]
    };

    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const { data: completedEnrollments } = await supabase
            .from('enrollments')
            .select('*, courses(*), profiles(*)')
            .gte('enrolled_at', sevenDaysAgo)
            .limit(100);

        if (completedEnrollments) {
            for (const enrollment of completedEnrollments) {
                const hasExistingReview = await supabase
                    .from('course_reviews')
                    .select('id')
                    .eq('user_id', enrollment.user_id)
                    .eq('course_id', enrollment.course_id)
                    .single();

                if (!hasExistingReview.data) {
                    await supabase.from('review_requests').insert({
                        user_id: enrollment.user_id,
                        course_id: enrollment.course_id,
                        status: 'pending',
                        scheduled_at: new Date().toISOString()
                    });
                    results.reviews.sent++;

                    await supabase.from('notifications').insert({
                        user_id: enrollment.user_id,
                        type: 'review_request',
                        title: 'Share Your Experience!',
                        message: `How was your learning experience with ${enrollment.courses?.title}? Your review helps other students!`,
                        is_read: false,
                        created_at: new Date().toISOString()
                    });
                }
            }
        }

        const { data: pendingReviews } = await supabase
            .from('course_reviews')
            .select('*, profiles(*), courses(*)')
            .eq('status', 'pending')
            .limit(50);

        if (pendingReviews) {
            for (const review of pendingReviews) {
                const sentimentScore = Math.random();
                
                let category = 'neutral';
                if (sentimentScore >= 0.7) category = 'positive';
                else if (sentimentScore <= 0.3) category = 'negative';

                await supabase
                    .from('course_reviews')
                    .update({ 
                        status: 'published',
                        sentiment_category: category,
                        verified: true,
                        published_at: new Date().toISOString()
                    })
                    .eq('id', review.id);
                results.reviews.generated++;
            }
        }

        const { data: courses } = await supabase
            .from('courses')
            .select('id, title')
            .eq('is_active', true);

        if (courses) {
            for (const course of courses) {
                const { data: ratingsData } = await supabase
                    .from('course_reviews')
                    .select('rating')
                    .eq('course_id', course.id)
                    .eq('status', 'published');

                if (ratingsData && ratingsData.length > 0) {
                    const avgRating = ratingsData.reduce((sum, r) => sum + (r.rating || 0), 0) / ratingsData.length;
                    const totalReviews = ratingsData.length;

                    await supabase
                        .from('courses')
                        .update({ 
                            average_rating: avgRating,
                            total_reviews: totalReviews,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', course.id);
                    results.ratings.aggregated++;
                }
            }
        }

        const topReviewers = await supabase
            .from('course_reviews')
            .select('user_id')
            .eq('status', 'published')
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        const reviewerCounts: Record<string, number> = {};
        topReviewers.data?.forEach(r => {
            reviewerCounts[r.user_id] = (reviewerCounts[r.user_id] || 0) + 1;
        });

        for (const [userId, count] of Object.entries(reviewerCounts)) {
            if (count >= 5) {
                const existingIncentive = await supabase
                    .from('review_incentives')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('month', new Date().toISOString().slice(0, 7))
                    .single();

                if (!existingIncentive.data) {
                    await supabase.from('review_incentives').insert({
                        user_id: userId,
                        review_count: count,
                        reward_type: 'coupon',
                        reward_value: Math.min(count * 50, 500),
                        month: new Date().toISOString().slice(0, 7),
                        created_at: new Date().toISOString()
                    });
                    results.incentives.created++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Review automation completed',
            results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Review automation error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            results
        }, { status: 500 });
    }
}
