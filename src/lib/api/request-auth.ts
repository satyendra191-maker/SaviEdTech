import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';

export interface AuthenticatedRequestContext {
    userId: string;
    role: string;
    email: string | null;
}

export function createRequestSupabaseClient(request: NextRequest) {
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
            set() {},
            remove() {},
        },
    });
}

export async function getAuthenticatedRequestContext(
    request: NextRequest
): Promise<AuthenticatedRequestContext | null> {
    const supabase = createRequestSupabaseClient(request);
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return null;
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', user.id)
        .single() as { data: { role: string; email: string | null } | null; error: Error | null };

    if (profileError || !profile) {
        return null;
    }

    return {
        userId: user.id,
        role: profile.role,
        email: profile.email,
    };
}
