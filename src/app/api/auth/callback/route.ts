import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const errorCode = requestUrl.searchParams.get('error');
    const errorDescription = requestUrl.searchParams.get('error_description');

    if (errorCode) {
        console.error('OAuth error:', errorCode, errorDescription);
        return NextResponse.redirect(`${requestUrl.origin}/auth/auth-code-error?message=${encodeURIComponent(errorDescription || errorCode)}`);
    }

    if (!code) {
        console.error('No code in callback');
        return NextResponse.redirect(`${requestUrl.origin}/auth/auth-code-error?message=No+authorization+code`);
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

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
            console.error('Session error:', error.message);
            return NextResponse.redirect(`${requestUrl.origin}/auth/auth-code-error?message=${encodeURIComponent(error.message)}`);
        }

        if (!data.user) {
            return NextResponse.redirect(`${requestUrl.origin}/auth/auth-code-error?message=User+not+found`);
        }

        const storedRedirect = cookieStore.get('oauth_redirect')?.value;
        cookieStore.delete('oauth_redirect');

        let redirectPath = storedRedirect || '/dashboard';
        
        if (!storedRedirect) {
            const profileResponse: { data: { role?: string } | null } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();

            const profile = profileResponse.data as { role?: string } | null;
            const role = profile?.role || 'student';
            
            if (role === 'admin' || role === 'content_manager') {
                redirectPath = '/admin';
            } else if (role === 'finance_manager') {
                redirectPath = '/admin/finance';
            } else if (role === 'parent') {
                redirectPath = '/dashboard/parent';
            }
        }

        return NextResponse.redirect(`${requestUrl.origin}${redirectPath}`);
    } catch (err) {
        console.error('Callback error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.redirect(`${requestUrl.origin}/auth/auth-code-error?message=${encodeURIComponent(errorMessage)}`);
    }
}
