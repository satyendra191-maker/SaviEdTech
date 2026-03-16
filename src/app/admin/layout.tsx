import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { AdminLayoutShell } from '@/components/admin/admin-layout-shell';
import type { Database } from '@/types/supabase';
import { ADMIN_APP_ROLES } from '@/lib/auth/roles';

interface AdminLayoutProps {
    children: ReactNode;
}

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
        if (process.env.NODE_ENV === 'development') {
            return <AdminLayoutShell role="admin">{children}</AdminLayoutShell>;
        }
        redirect(loginRedirect);
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    const typedProfile = profile as { role?: string } | null;
    const role = typedProfile?.role || null;

    if (profileError || !role || !ADMIN_APP_ROLES.includes(role as (typeof ADMIN_APP_ROLES)[number])) {
        if (process.env.NODE_ENV === 'development') {
            return <AdminLayoutShell role="admin">{children}</AdminLayoutShell>;
        }
        redirect(loginRedirect);
    }

    return <AdminLayoutShell role={role}>{children}</AdminLayoutShell>;
}
