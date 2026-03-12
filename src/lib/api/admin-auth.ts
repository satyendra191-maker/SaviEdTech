import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';

const DEFAULT_ADMIN_ROLES = ['admin'] as const;
const FINANCE_ADMIN_ROLES = ['admin', 'finance_manager'] as const;

export interface AdminRequestContext {
    userId: string;
    role: string;
}

function createRequestSupabaseClient(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase environment variables are not configured.');
    }

    return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
        cookies: {
            get(name: string) {
                return request.cookies.get(name)?.value;
            },
            set() {
                // No-op in route handlers that do not mutate auth cookies.
            },
            remove() {
                // No-op in route handlers that do not mutate auth cookies.
            },
        },
    });
}

export async function requireAdminRequest(
    request: NextRequest,
    allowedRoles: readonly string[] = DEFAULT_ADMIN_ROLES
): Promise<AdminRequestContext | null> {
    const supabase = createRequestSupabaseClient(request);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return null;
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single() as { data: { role: string } | null; error: Error | null };

    if (profileError || !profile || !allowedRoles.includes(profile.role)) {
        return null;
    }

    return {
        userId: user.id,
        role: profile.role,
    };
}

export async function requireFinanceRequest(request: NextRequest): Promise<AdminRequestContext | null> {
    return requireAdminRequest(request, FINANCE_ADMIN_ROLES);
}
