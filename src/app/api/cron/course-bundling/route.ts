// @ts-nocheck
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
        bundles: { created: 0 },
        recommendations: { generated: 0 },
        upsells: { triggered: 0 },
        errors: [] as string[]
    };

    try {
        const { data: popularCourses } = await supabase
            .from('courses')
            .select('id, title, price, category')
            .eq('is_active', true)
            .order('enrollments_count', { ascending: false })
            .limit(20);

        if (popularCourses && popularCourses.length >= 3) {
            const categories = [...new Set(popularCourses.map(c => c.category))];
            
            for (const category of categories.slice(0, 5)) {
                const categoryCourses = popularCourses.filter(c => c.category === category).slice(0, 4);
                
                if (categoryCourses.length >= 2) {
                    const bundlePrice = categoryCourses.reduce((sum, c) => sum + (c.price || 0), 0) * 0.8;
                    
                    const existingBundle = await supabase
                        .from('course_bundles')
                        .select('id')
                        .eq('name', `${category} Master Bundle`)
                        .single();

                    if (!existingBundle.data) {
                        await supabase.from('course_bundles').insert({
                            name: `${category} Master Bundle`,
                            description: `Complete ${category} learning package`,
                            bundle_price: bundlePrice,
                            course_ids: categoryCourses.map(c => c.id),
                            discount_percentage: 20,
                            is_active: true,
                            created_at: new Date().toISOString()
                        });
                        results.bundles.created++;
                    }
                }
            }
        }

        const { data: students } = await supabase
            .from('profiles')
            .select('id, name')
            .eq('role', 'student');

        if (students) {
            for (const student of students.slice(0, 50)) {
                const { data: enrolledCourses } = await supabase
                    .from('enrollments')
                    .select('course_id, courses(category)')
                    .eq('user_id', student.id);

                if (enrolledCourses && enrolledCourses.length > 0) {
                    const enrolledCategories = enrolledCourses.map(e => e.courses?.category).filter(Boolean);
                    const enrolledIds = enrolledCourses.map(e => e.course_id);
                    
                    const { data: recommendations } = await supabase
                        .from('courses')
                        .select('id, title, price, category')
                        .eq('is_active', true)
                        .in('category', enrolledCategories)
                        .not('id', 'in', `(${enrolledIds.join(',')})`)
                        .order('enrollments_count', { ascending: false })
                        .limit(3);

                    if (recommendations && recommendations.length > 0) {
                        await supabase.from('course_recommendations').insert({
                            user_id: student.id,
                            recommended_courses: recommendations.map(r => r.id),
                            recommendation_type: 'category_based',
                            generated_at: new Date().toISOString()
                        });
                        results.recommendations.generated++;
                    }
                }
            }
        }

        const { data: cartAbandonments } = await supabase
            .from('abandoned_carts')
            .select('*, profiles(*)')
            .gte('abandoned_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if (cartAbandonments) {
            for (const cart of cartAbandonments) {
                const discountCode = `SAVE${Math.floor(Math.random() * 20) + 10}`;
                
                await supabase.from('notifications').insert({
                    user_id: cart.user_id,
                    type: 'cart_recovery',
                    title: 'Complete Your Purchase!',
                    message: `Use code ${discountCode} to get 10% off your cart!`,
                    is_read: false,
                    created_at: new Date().toISOString()
                });
                results.upsells.triggered++;
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Course bundling automation completed',
            results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Course bundling error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            results
        }, { status: 500 });
    }
}
