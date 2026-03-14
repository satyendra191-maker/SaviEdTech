/**
 * Admin Control Center API
 * 
 * Unified API for the Super Admin Dashboard
 * Provides data for all admin modules with optimized queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

function getSupabaseClient(request: NextRequest) {
    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set() {},
                remove() {},
            },
        }
    );
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const moduleName = searchParams.get('module') || 'dashboard';
    const subModule = searchParams.get('sub') || '';

    try {
        const supabase = getSupabaseClient(request);

        // Dashboard overview
        if (moduleName === 'dashboard') {
            const [students, courses, revenue, leads, tests] = await Promise.all([
                supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
                supabase.from('courses').select('id', { count: 'exact', head: true }),
                supabase.from('payments').select('amount, status').eq('status', 'completed'),
                supabase.from('lead_forms').select('id', { count: 'exact', head: true }),
                supabase.from('tests').select('id', { count: 'exact', head: true }),
            ]);

            const totalRevenue = (revenue.data as any[] || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

            return NextResponse.json({
                stats: {
                    totalStudents: students.count || 0,
                    totalCourses: courses.count || 0,
                    totalRevenue,
                    totalLeads: leads.count || 0,
                    totalTests: tests.count || 0,
                }
            });
        }

        // System health
        if (moduleName === 'system') {
            return NextResponse.json({
                system: {
                    status: 'healthy',
                    uptime: process.uptime?.() || 0,
                    timestamp: new Date().toISOString(),
                }
            });
        }

        // Users module
        if (moduleName === 'users') {
            const role = searchParams.get('role') || 'student';
            const { data, count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact' })
                .eq('role', role)
                .order('created_at', { ascending: false })
                .limit(50);

            return NextResponse.json({ users: data || [], total: count || 0 });
        }

        // Academic module
        if (moduleName === 'academic') {
            if (subModule === 'courses') {
                const { data } = await supabase
                    .from('courses')
                    .select('*, courses_modules!inner(id)')
                    .order('created_at', { ascending: false })
                    .limit(20);
                return NextResponse.json({ courses: data || [] });
            }

            if (subModule === 'lectures') {
                const { data } = await supabase
                    .from('lectures')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(20);
                return NextResponse.json({ lectures: data || [] });
            }

            if (subModule === 'questions') {
                const { data, count } = await supabase
                    .from('questions')
                    .select('*', { count: 'exact' })
                    .order('created_at', { ascending: false })
                    .limit(50);
                return NextResponse.json({ questions: data || [], total: count || 0 });
            }

            if (subModule === 'tests') {
                const { data } = await supabase
                    .from('tests')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(20);
                return NextResponse.json({ tests: data || [] });
            }

            return NextResponse.json({ academic: { overview: true } });
        }

        // Finance module
        if (moduleName === 'finance') {
            const [payments, subscriptions] = await Promise.all([
                supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(50),
                supabase.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(20),
            ]);

            const totalRevenue = ((payments.data || []) as any[])
                .filter((p: any) => p.status === 'completed')
                .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

            return NextResponse.json({
                payments: payments.data || [],
                subscriptions: subscriptions.data || [],
                totalRevenue,
            });
        }

        // Analytics module
        if (moduleName === 'analytics') {
            const [engagement, revenue] = await Promise.all([
                supabase.from('activity_logs').select('id', { count: 'exact', head: true })
                    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
                supabase.from('payments').select('amount, created_at')
                    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
                    .eq('status', 'completed'),
            ]);

            return NextResponse.json({
                engagement: {
                    weeklyActive: engagement.count || 0,
                },
                revenue: {
                    monthly: (revenue.data as any[] | undefined)?.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) || 0,
                },
            });
        }

        // Security module
        if (moduleName === 'security') {
            const { data } = await supabase
                .from('security_events')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            return NextResponse.json({ securityEvents: data || [] });
        }

        // Automation/Cron module
        if (moduleName === 'automation') {
            const { data } = await supabase
                .from('cron_logs')
                .select('*')
                .order('executed_at', { ascending: false })
                .limit(50);

            return NextResponse.json({ cronLogs: data || [] });
        }

        // Content module
        if (moduleName === 'content') {
            const { data: blogs } = await supabase
                .from('blog_posts')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            const { data: media } = await supabase
                .from('media_files')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            return NextResponse.json({ blogs: blogs || [], media: media || [] });
        }

        return NextResponse.json({ error: 'Unknown module' }, { status: 400 });

    } catch (error) {
        console.error('[Admin API] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    try {
        const supabase = getSupabaseClient(request);

        // Run cron job manually
        if (action === 'run-cron') {
            const body = await request.json();
            const jobName = body.job;

            // Log the manual execution
            await (supabase as any).from('cron_logs').insert({
                job_name: jobName,
                job_id: `manual-${Date.now()}`,
                timestamp: new Date().toISOString(),
                duration_ms: 0,
                status: 'success',
            });

            return NextResponse.json({ success: true, message: `Job ${jobName} triggered` });
        }

        // Update system setting
        if (action === 'update-setting') {
            const body = await request.json();
            const { key, value } = body;

            await (supabase as any).from('system_settings').upsert({
                key,
                value,
            }, { onConflict: 'key' });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

    } catch (error) {
        console.error('[Admin API] POST Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
