import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

/**
 * OAuth callback endpoint (fallback path).
 * Keeps compatibility with existing provider redirect URLs that point to /api/auth/callback.
 */
export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') ?? '/dashboard';

    if (!code) {
        return NextResponse.redirect(`${requestUrl.origin}/auth/auth-code-error`);
    }

    try {
        const cookieStore = await cookies();
        const supabase = createServerClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        cookieStore.set({ name, value, ...options });
                    },
                    remove(name: string, options: CookieOptions) {
                        cookieStore.delete({ name, ...options });
                    },
                },
            }
        );

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            return NextResponse.redirect(`${requestUrl.origin}/auth/auth-code-error`);
        }

        return NextResponse.redirect(`${requestUrl.origin}${next}`);
    } catch {
        return NextResponse.redirect(`${requestUrl.origin}/auth/auth-code-error`);
    }
}
