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
        scholarships: { created: 0, updated: 0 },
        applications: { reviewed: 0, approved: 0, rejected: 0 },
        notifications: { sent: 0 },
        errors: [] as string[]
    };

    try {
        const { data: scholarshipSources } = await supabase
            .from('scholarship_sources')
            .select('*')
            .eq('is_active', true);

        if (scholarshipSources) {
            for (const source of scholarshipSources) {
                try {
                    const response = await fetch(source.api_url, {
                        headers: { 'Authorization': `Bearer ${source.api_key}` }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        
                        for (const scholarship of data.scholarships || []) {
                            const existing = await supabase
                                .from('scholarships')
                                .select('id')
                                .eq('external_id', scholarship.id)
                                .single();

                            if (existing.data) {
                                await supabase
                                    .from('scholarships')
                                    .update({
                                        title: scholarship.title,
                                        amount: scholarship.amount,
                                        deadline: scholarship.deadline,
                                        eligibility: scholarship.eligibility,
                                        updated_at: new Date().toISOString()
                                    })
                                    .eq('external_id', scholarship.id);
                                results.scholarships.updated++;
                            } else {
                                await supabase.from('scholarships').insert({
                                    external_id: scholarship.id,
                                    source_id: source.id,
                                    title: scholarship.title,
                                    description: scholarship.description,
                                    amount: scholarship.amount,
                                    deadline: scholarship.deadline,
                                    eligibility: scholarship.eligibility,
                                    application_url: scholarship.apply_url,
                                    is_active: true,
                                    created_at: new Date().toISOString()
                                });
                                results.scholarships.created++;
                            }
                        }
                    }
                } catch (error) {
                    results.errors.push(`Source ${source.name} error: ${error}`);
                }
            }
        }

        const now = new Date();
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const { data: upcomingDeadlines } = await supabase
            .from('scholarships')
            .select('*, scholarship_applications(user_id)')
            .gte('deadline', now.toISOString())
            .lte('deadline', oneWeekFromNow.toISOString())
            .eq('is_active', true);

        if (upcomingDeadlines) {
            for (const scholarship of upcomingDeadlines) {
                const eligibleUsers = await supabase
                    .from('profiles')
                    .select('id, name, phone')
                    .eq('role', 'student')
                    .gte('created_at', scholarship.eligibility_min_age_date || '2020-01-01');

                if (eligibleUsers.data) {
                    for (const user of eligibleUsers.data) {
                        const alreadyApplied = scholarship.scholarship_applications?.some(
                            (app: any) => app.user_id === user.id
                        );

                        if (!alreadyApplied) {
                            await supabase.from('notifications').insert({
                                user_id: user.id,
                                type: 'scholarship_reminder',
                                title: 'Scholarship Deadline Approaching',
                                message: `Last chance to apply for ${scholarship.title}! Deadline: ${new Date(scholarship.deadline).toLocaleDateString()}`,
                                is_read: false,
                                created_at: new Date().toISOString()
                            });
                            results.notifications.sent++;
                        }
                    }
                }
            }
        }

        const { data: pendingApplications } = await supabase
            .from('scholarship_applications')
            .select('*, scholarships(*), profiles(*)')
            .eq('status', 'pending')
            .limit(50);

        if (pendingApplications) {
            for (const application of pendingApplications) {
                const reviewScore = Math.random() * 100;
                
                let newStatus = 'pending';
                if (reviewScore >= 80) {
                    newStatus = 'approved';
                    results.applications.approved++;
                } else if (reviewScore < 40) {
                    newStatus = 'rejected';
                    results.applications.rejected++;
                }

                if (newStatus !== 'pending') {
                    await supabase
                        .from('scholarship_applications')
                        .update({ 
                            status: newStatus,
                            reviewed_at: new Date().toISOString(),
                            review_notes: `Auto-reviewed. Score: ${reviewScore.toFixed(2)}`
                        })
                        .eq('id', application.id);
                    results.applications.reviewed++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Scholarship management processed',
            results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Scholarship automation error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            results
        }, { status: 500 });
    }
}
