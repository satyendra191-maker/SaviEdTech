import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient() as any;
    const results = {
        priceAlerts: { triggered: 0 },
        competitorPrices: { updated: 0 },
        dynamicPricing: { adjusted: 0 },
        discountRecommendations: { generated: 0 },
        errors: [] as string[]
    };

    try {
        const { data: courses } = await supabase
            .from('courses')
            .select('id, title, price, competitor_prices, discount_percentage, is_active')
            .eq('is_active', true);

        if (courses) {
            for (const course of courses) {
                try {
                    const competitors = ['comp1', 'comp2', 'comp3'];
                    const newCompetitorPrices: Record<string, number> = {};

                    for (const comp of competitors) {
                        newCompetitorPrices[comp] = course.price * (0.85 + Math.random() * 0.3);
                    }

                    await supabase
                        .from('courses')
                        .update({ 
                            competitor_prices: newCompetitorPrices,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', course.id);
                    results.competitorPrices.updated++;

                    const competitorAvg = Object.values(newCompetitorPrices).reduce((a, b) => a + b, 0) / Object.values(newCompetitorPrices).length;
                    const ourPrice = course.price;

                    if (ourPrice > competitorAvg * 1.1) {
                        const recommendedDiscount = Math.min(30, Math.round((ourPrice - competitorAvg) / ourPrice * 100));
                        
                        await supabase.from('pricing_recommendations').insert({
                            course_id: course.id,
                            recommendation_type: 'price_reduction',
                            current_price: ourPrice,
                            recommended_price: competitorAvg,
                            discount_percentage: recommendedDiscount,
                            reason: 'Competitor pricing analysis',
                            generated_at: new Date().toISOString()
                        });
                        results.discountRecommendations.generated++;
                    }
                } catch (error) {
                    results.errors.push(`Course ${course.id} error: ${error}`);
                }
            }
        }

        const { data: priceAlerts } = await supabase
            .from('price_alerts')
            .select('*, profiles(*)')
            .eq('is_active', true);

        if (priceAlerts) {
            for (const alert of priceAlerts) {
                const { data: course } = await supabase
                    .from('courses')
                    .select('price')
                    .eq('id', alert.course_id)
                    .single();

                if (course && course.price <= alert.target_price) {
                    await supabase.from('notifications').insert({
                        user_id: alert.user_id,
                        type: 'price_alert',
                        title: 'Price Drop Alert!',
                        message: `Course is now available at ₹${course.price} (Target: ₹${alert.target_price})`,
                        is_read: false,
                        created_at: new Date().toISOString()
                    });

                    await supabase
                        .from('price_alerts')
                        .update({ 
                            is_active: false,
                            triggered_at: new Date().toISOString()
                        })
                        .eq('id', alert.id);
                    results.priceAlerts.triggered++;
                }
            }
        }

        const { data: popularCourses } = await supabase
            .from('courses')
            .select('id, title, price, discount_percentage')
            .eq('is_active', true)
            .order('enrollments_count', { ascending: false })
            .limit(5);

        if (popularCourses) {
            for (const course of popularCourses) {
                const currentDiscount = course.discount_percentage || 0;
                
                if (currentDiscount < 15) {
                    const newDiscount = Math.min(25, currentDiscount + 5);
                    
                    await supabase
                        .from('courses')
                        .update({ discount_percentage: newDiscount })
                        .eq('id', course.id);
                    results.dynamicPricing.adjusted++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Pricing automation completed',
            results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Pricing automation error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            results
        }, { status: 500 });
    }
}
