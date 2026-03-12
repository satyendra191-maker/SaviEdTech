/**
 * Next.js Middleware
 * 
 * SECURITY FEATURES:
 * - Route protection based on authentication status
 * - Admin role verification for admin routes
 * - Rate limiting for API routes to prevent abuse
 * - Suspicious request blocking
 * - Security headers injection
 * - Request logging for audit purposes
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import {
    checkRateLimit,
    generateRateLimitIdentifier,
    RATE_LIMITS,
    containsSuspiciousPatterns,
} from '@/lib/security';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/admin', '/parent'];

// Routes that require specific admin-level roles
const adminRoutes = ['/admin'];

// Public routes that authenticated users shouldn't access
const authRoutes = ['/login', '/register', '/signup', '/reset-password'];

// API routes that need rate limiting
const rateLimitedApiRoutes = ['/api/'];

// Auth-related API routes (stricter rate limiting)
const authApiRoutes = ['/api/auth/'];

function getAdminRolesForPath(pathname: string): string[] {
    if (pathname === '/admin/finance' || pathname.startsWith('/admin/finance/')) {
        return ['admin', 'finance_manager'];
    }

    if (pathname === '/admin/payments' || pathname.startsWith('/admin/payments/')) {
        return ['admin', 'finance_manager'];
    }

    if (pathname.startsWith('/admin/careers')) {
        return ['admin', 'hr'];
    }

    if (
        pathname.startsWith('/admin/courses') ||
        pathname.startsWith('/admin/lectures') ||
        pathname.startsWith('/admin/questions') ||
        pathname.startsWith('/admin/tests')
    ) {
        return ['admin', 'content_manager'];
    }

    return ['admin'];
}

/**
 * Get client IP from request headers
 */
function getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0]?.trim() || 'unknown';
    }
    const realIp = request.headers.get('x-real-ip');
    if (realIp) return realIp;
    return 'unknown';
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-DNS-Prefetch-Control', 'on');
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    response.headers.set(
        'Permissions-Policy',
        'camera=(self), microphone=(self), display-capture=(self), geolocation=(), interest-cohort=()'
    );

    const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://checkout.razorpay.com https://cdn.razorpay.com https://js.razorpay.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "font-src 'self'",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://cdn.razorpay.com https://lumberjack.razorpay.com",
        "media-src 'self' https:",
        "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self' https://api.razorpay.com https://checkout.razorpay.com",
    ].join('; ');
    response.headers.set('Content-Security-Policy', csp);

    return response;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const ip = getClientIp(request);
    const requestId = `req_${Date.now()}`;
    const isApiRoute = rateLimitedApiRoutes.some(route => pathname.startsWith(route));

    // 1. Block Suspicious Requests
    // Only inspect query strings for API routes to avoid false positives on auth page form URLs.
    const suspiciousInput = isApiRoute ? `${pathname}${request.nextUrl.search}` : pathname;
    if (containsSuspiciousPatterns(suspiciousInput)) {
        return new NextResponse(
            JSON.stringify({ error: 'Forbidden', message: 'Suspicious pattern detected', requestId }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // 2. Rate Limiting for API Routes
    if (isApiRoute) {
        const isAuthRoute = authApiRoutes.some(route => pathname.startsWith(route));
        const rateLimitType = isAuthRoute ? 'auth' : 'api';
        const rateLimitConfig = isAuthRoute ? RATE_LIMITS.AUTH : RATE_LIMITS.API;

        const rateLimitId = generateRateLimitIdentifier(ip, pathname, rateLimitType as 'auth' | 'api');
        const rateLimitResult = checkRateLimit(rateLimitId, rateLimitConfig);

        if (!rateLimitResult.allowed) {
            return new NextResponse(
                JSON.stringify({
                    error: 'Too many requests',
                    retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
                    requestId
                }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
                    }
                }
            );
        }
        request.headers.set('x-ratelimit-remaining', String(rateLimitResult.remaining));
    }

    // 3. Supabase Client Initialization
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return request.cookies.get(name)?.value; },
                set(name: string, value: string, options: any) { request.cookies.set({ name, value, ...options }); },
                remove(name: string, options: any) { request.cookies.set({ name, value: '', ...options }); },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Route classifications
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
    const isAuthRoute = authRoutes.some(route => pathname === route || pathname.startsWith(route));

    // 4. Redirect unauthenticated users
    if (isProtectedRoute && !user) {
        const redirectUrl = new URL('/login', request.url);
        redirectUrl.searchParams.set('redirect', pathname);
        return addSecurityHeaders(NextResponse.redirect(redirectUrl));
    }

    // 5. Redirect authenticated users away from auth pages
    if (isAuthRoute && user) {
        // Fetch role to determine optimal landing page
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        // If profile is missing/corrupt, allow access to auth pages so bootstrap can recover.
        if (profileError || !profile) {
            return addSecurityHeaders(NextResponse.next());
        }

        const role = (profile as { role?: string } | null)?.role || 'student';
        let dest = '/dashboard';
        if (role === 'admin' || role === 'finance_manager' || role === 'content_manager' || role === 'faculty' || role === 'hr') {
            dest = '/admin';
        } else if (role === 'parent') dest = '/dashboard/parent';

        return addSecurityHeaders(NextResponse.redirect(new URL(dest, request.url)));
    }

    // 6. Granular Role-Based Access Control
    if (user) {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            const role = (profile as { role?: string } | null)?.role || 'student';

    // Admin Routes Check
    if (isAdminRoute) {
        const allowedRoles = ['admin', 'finance_manager', 'content_manager', 'faculty', 'hr'];
        if (!allowedRoles.includes(role)) {
            const redirectUrl = new URL('/login', request.url);
            redirectUrl.searchParams.set('redirect', pathname);
            return addSecurityHeaders(NextResponse.redirect(redirectUrl));
        }
    }

            // Parent Routes Check
            if ((pathname.startsWith('/dashboard/parent') || pathname.startsWith('/parent')) &&
                role !== 'parent' && role !== 'admin') {
                return addSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
            }

            // Content Manager / Faculty Routes Check
            if (
                (
                    pathname.startsWith('/admin/courses') ||
                    pathname.startsWith('/admin/lectures') ||
                    pathname.startsWith('/admin/questions') ||
                    pathname.startsWith('/admin/tests')
                ) &&
                role !== 'content_manager' && role !== 'admin'
            ) {
                const redirectUrl = new URL('/login', request.url);
                redirectUrl.searchParams.set('redirect', pathname);
                return addSecurityHeaders(NextResponse.redirect(redirectUrl));
            }

            if (
                pathname.startsWith('/admin/careers') &&
                role !== 'hr' && role !== 'admin'
            ) {
                const redirectUrl = new URL('/login', request.url);
                redirectUrl.searchParams.set('redirect', pathname);
                return addSecurityHeaders(NextResponse.redirect(redirectUrl));
            }
        } catch (error) {
            console.error('Middleware role check error:', error);
        }
    }

    // 7. Regular response with security headers
    const response = NextResponse.next();
    if (isApiRoute) {
        const remaining = request.headers.get('x-ratelimit-remaining');
        if (remaining) response.headers.set('X-RateLimit-Remaining', remaining);
    }
    return addSecurityHeaders(response);
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/admin/:path*',
        '/parent/:path*',
        '/login',
        '/register',
        '/signup',
        '/reset-password',
        '/api/:path*',
    ],
};
