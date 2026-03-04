import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/admin'];

// Routes that require admin role
const adminRoutes = ['/admin'];

// Public routes that authenticated users shouldn't access
const authRoutes = ['/login', '/register'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Create Supabase client
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: Record<string, unknown>) {
                    request.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: Record<string, unknown>) {
                    request.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();

    // Check if route requires protection
    const isProtectedRoute = protectedRoutes.some(route =>
        pathname.startsWith(route)
    );

    const isAdminRoute = adminRoutes.some(route =>
        pathname.startsWith(route)
    );

    const isAuthRoute = authRoutes.some(route =>
        pathname === route || pathname.startsWith(route)
    );

    // Redirect unauthenticated users to login
    if (isProtectedRoute && !user) {
        const redirectUrl = new URL('/login', request.url);
        redirectUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(redirectUrl);
    }

    // Redirect authenticated users away from auth pages
    if (isAuthRoute && user) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Check admin role for admin routes
    if (isAdminRoute && user) {
        try {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single() as { data: { role: string } | null; error: Error | null };

            // Handle database errors or non-admin users
            if (profileError || !profile || profile.role !== 'admin') {
                console.error('Admin check failed:', profileError?.message || 'User is not admin');
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
        } catch (error) {
            console.error('Unexpected error during admin check:', error);
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/admin/:path*',
        '/login',
        '/register',
    ],
};
