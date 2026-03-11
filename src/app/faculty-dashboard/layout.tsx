import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import { AdminLayoutShell } from '@/components/admin/admin-layout-shell';

interface FacultyDashboardLayoutProps {
    children: ReactNode;
}

export default async function FacultyDashboardLayout({ children }: FacultyDashboardLayoutProps) {
    const cookieStore = await cookies();

    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: Record<string, unknown>) {},
                remove(name: string, options: Record<string, unknown>) {},
            },
        }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login?redirect=/faculty-dashboard');
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name, avatar_url')
        .eq('id', user.id)
        .single() as { data: { role: string; full_name: string | null; avatar_url: string | null } | null; error: Error | null };

    if (profileError || !profile) {
        redirect('/dashboard?error=profile_not_found');
    }

    // Allow faculty, content_manager, admin, super_admin
    const allowedRoles = ['faculty', 'content_manager', 'admin', 'super_admin'];
    if (!allowedRoles.includes(profile.role)) {
        redirect('/dashboard?error=insufficient_permissions');
    }

    return (
        <AdminLayoutShell role={profile.role}>
            <div className="mb-6 flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Faculty Dashboard
                </div>
                <div className="text-sm text-slate-500">
                    Welcome back, <span className="font-medium text-slate-700">{profile.full_name || user.email}</span>
                </div>
            </div>
            {children}
        </AdminLayoutShell>
    );
}
