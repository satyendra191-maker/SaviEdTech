import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { AdminLayoutShell } from '@/components/admin/admin-layout-shell';
import type { Database } from '@/types/supabase';

interface AdminLayoutProps {
    children: ReactNode;
}

const ADMIN_APP_ROLES: readonly string[] = ['admin', 'super_admin', 'content_manager', 'hr', 'finance_manager'];

function createSupabaseServerClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set() {},
                remove() {},
            },
        }
    );
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(cookieStore);
    const loginRedirect = '/login?redirect=/admin';

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(loginRedirect);
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    const typedProfile = profile as { role?: string } | null;
    const role = typedProfile?.role || null;

    if (profileError || !role || !ADMIN_APP_ROLES.includes(role)) {
        redirect(loginRedirect);
    }

    return <AdminLayoutShell role={role}>{children}</AdminLayoutShell>;
}
