/**
 * Enterprise Admin Dashboard API
 * Enhanced with session monitoring and analytics
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
    try {
        const supabase = getSupabaseClient(request);
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'summary';

        if (type === 'summary') {
            const [studentsRes, activeRes, revenueRes, leadsRes] = await Promise.all([
                supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
                supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
                supabase.from('payments').select('amount, status').eq('status', 'completed'),
                supabase.from('lead_forms').select('id', { count: 'exact', head: true }),
            ]);

            const revenue = (revenueRes.data || []).reduce((sum: number, p: { amount?: number }) => sum + Number(p.amount || 0), 0);

            return NextResponse.json({
                totalStudents: studentsRes.count || 0,
                activeUsers: activeRes.count || 0,
                totalRevenue: revenue,
                totalLeads: leadsRes.count || 0,
            });
        }

        if (type === 'sessions') {
            const { data: sessions } = await supabase
                .from('auth_audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            return NextResponse.json({ sessions: sessions || [] });
        }

        if (type === 'activity') {
            const { data: activities } = await supabase
                .from('activity_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            return NextResponse.json({ activities: activities || [] });
        }

        if (type === 'performance') {
            const { data: stats } = await supabase
                .from('platform_stats')
                .select('*')
                .order('recorded_at', { ascending: false })
                .limit(24);

            return NextResponse.json({ performance: stats || [] });
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    } catch (error) {
        console.error('[Admin Stats] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
