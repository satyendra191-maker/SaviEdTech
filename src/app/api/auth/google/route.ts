import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const redirectTo = body.redirectTo || '/dashboard';

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

        const { searchParams } = new URL(request.url);
        // Function to get the base URL dynamically
        function getBaseUrl(): string {
            const host = request.headers.get('host');
            const protocol = host?.includes('localhost') ? 'http' : 'https';
            return `${protocol}://${host}`;
        }

        const baseUrl = getBaseUrl();
        const redirectUrl = `${baseUrl}/auth/callback`;
        
        cookieStore.set('oauth_redirect', redirectTo, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 600,
        });

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                queryParams: { 
                    prompt: 'consent',
                    access_type: 'offline',
                    response_type: 'code'
                },
            },
        });

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json({ 
            url: data.url 
        });

    } catch (error) {
        console.error('Google OAuth initiation error:', error);
        return NextResponse.json(
            { error: 'Failed to initiate Google sign in' },
            { status: 500 }
        );
    }
}
