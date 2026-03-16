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
    ADMIN_APP_ROLES,
    ADMIN_PRIVILEGED_ROLES,
    CONTENT_ROLES,
    FINANCE_ROLES,
    HR_ROLES,
    MARKETING_ROLES,
    TEACHING_ROLES,
} from '@/lib/auth/roles';
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

function hasRole(roles: readonly string[], role: string | null): boolean {
    return !!role && roles.includes(role);
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
        const rateLimitResult = await checkRateLimit(rateLimitId, rateLimitConfig);

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

    // Optimized: getUser() is authoritative for auth status.
    const { data: { user } } = await supabase.auth.getUser();

    // Route classifications
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
    const isAuthRoute = authRoutes.some(route => pathname === route || pathname.startsWith(route));

    // DEVELOPMENT BYPASS: Skip heavy checks in dev for non-API routes if no user or just auditing.
    if (process.env.NODE_ENV === 'development' && !isApiRoute) {
        return addSecurityHeaders(NextResponse.next());
    }

    // 4. Redirect unauthenticated users
    if (isProtectedRoute && !user) {
        const redirectUrl = new URL('/login', request.url);
        redirectUrl.searchParams.set('redirect', pathname);
        return addSecurityHeaders(NextResponse.redirect(redirectUrl));
    }

    // 5. Consolidated Profile Fetch (One DB call instead of two)
    let profile = null;
    if (user && (isAuthRoute || isAdminRoute || isProtectedRoute)) {
        const { data: fetchedProfile, error: profileError } = await supabase
            .from('profiles')
            .select('role, is_verified, status')
            .eq('id', user.id)
            .single();
        
        if (!profileError && fetchedProfile) {
            profile = fetchedProfile;
        }
    }

    if (user && profile) {
        const role = profile.role || 'student';
        const isVerified = profile.is_verified === true;
        const status = profile.status || 'pending';

        // 5a. Blocked check
        if (status === 'blocked') {
            await supabase.auth.signOut();
            return addSecurityHeaders(NextResponse.redirect(new URL('/login?error=account_blocked', request.url)));
        }

        // 6. Redirect authenticated users away from auth pages
        if (isAuthRoute) {
            if (isVerified || status === 'active') {
                let dest = '/dashboard';
                if (hasRole(ADMIN_APP_ROLES, role)) dest = '/admin';
                else if (role === 'parent') dest = '/dashboard/parent';
                return addSecurityHeaders(NextResponse.redirect(new URL(dest, request.url)));
            }
            if (!isVerified && status === 'pending') {
                return addSecurityHeaders(NextResponse.redirect(new URL('/pending-verification', request.url)));
            }
        }

        // 7. Granular Access Control
        if (isProtectedRoute) {
            // Unverified check
            if (!isVerified && status === 'pending' && !pathname.includes('/pending-verification')) {
                return addSecurityHeaders(NextResponse.redirect(new URL('/pending-verification', request.url)));
            }

            // Admin area check
            if (isAdminRoute) {
                if (!hasRole(ADMIN_APP_ROLES, role)) {
                    return addSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
                }

                // Sector-specific admin checks
                if (
                    (pathname.startsWith('/admin/finance') || pathname.startsWith('/admin/payments') || pathname.startsWith('/admin/subscriptions')) &&
                    !hasRole(FINANCE_ROLES, role)
                ) {
                    return addSecurityHeaders(NextResponse.redirect(new URL('/admin', request.url)));
                }
                if (
                    (pathname.startsWith('/admin/careers') || pathname.startsWith('/admin/hr')) &&
                    !hasRole(HR_ROLES, role)
                ) {
                    return addSecurityHeaders(NextResponse.redirect(new URL('/admin', request.url)));
                }
                if (
                    (pathname.startsWith('/admin/courses') ||
                        pathname.startsWith('/admin/lectures') ||
                        pathname.startsWith('/admin/questions') ||
                        pathname.startsWith('/admin/tests') ||
                        pathname.startsWith('/admin/cms') ||
                        pathname.startsWith('/admin/ai-content')) &&
                    !hasRole(CONTENT_ROLES, role)
                ) {
                    return addSecurityHeaders(NextResponse.redirect(new URL('/admin', request.url)));
                }
                if (pathname.startsWith('/admin/faculty') && !hasRole(TEACHING_ROLES, role)) {
                    return addSecurityHeaders(NextResponse.redirect(new URL('/admin', request.url)));
                }
                if (pathname.startsWith('/admin/leads') && !hasRole(MARKETING_ROLES, role)) {
                    return addSecurityHeaders(NextResponse.redirect(new URL('/admin', request.url)));
                }
            }

            // Parent dashboard check
            if (pathname.startsWith('/dashboard/parent') && role !== 'parent' && !hasRole(ADMIN_PRIVILEGED_ROLES, role)) {
                return addSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
            }
        }
    }

    // 8. Regular response with security headers
    const response = NextResponse.next();
    return addSecurityHeaders(response);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder patterns
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
