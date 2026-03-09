import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import { AdminLayoutShell } from '@/components/admin/admin-layout-shell';

interface SuperAdminLayoutProps {
    children: ReactNode;
}

export default async function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
    const cookieStore = await cookies();

    // Create Supabase server client
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: Record<string, unknown>) {
                    // Server components cannot set cookies directly
                    // Cookies will be set by middleware
                },
                remove(name: string, options: Record<string, unknown>) {
                    // Server components cannot remove cookies directly
                    // Cookies will be removed by middleware
                },
            },
        }
    );

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login?redirect=/super-admin');
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name, avatar_url')
        .eq('id', user.id)
        .single() as { data: { role: string; full_name: string | null; avatar_url: string | null } | null; error: Error | null };

    if (profileError || !profile) {
        console.error('Error fetching profile:', profileError);
        redirect('/dashboard?error=profile_not_found');
    }

    // Only allow admin or super_admin roles
    if (profile.role !== 'admin' && profile.role !== 'super_admin') {
        console.error('Access denied: User is not an admin or super_admin');
        redirect('/dashboard?error=insufficient_permissions');
    }

    return (
        <AdminLayoutShell role={profile.role}>
            <div className="mb-6 flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Super Admin Mode
                </div>
                <div className="text-sm text-slate-500">
                    Welcome back, <span className="font-medium text-slate-700">{profile.full_name || user.email}</span>
                </div>
            </div>
            {children}
        </AdminLayoutShell>
    );
}
