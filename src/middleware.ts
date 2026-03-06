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
    SECURITY_CONSTANTS,
} from '@/lib/security';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/admin', '/parent'];

// Routes that require admin role
const adminRoutes = ['/admin', '/super-admin'];

// Public routes that authenticated users shouldn't access
const authRoutes = ['/login', '/register', '/reset-password'];

// API routes that need rate limiting
const rateLimitedApiRoutes = ['/api/'];

// Auth-related API routes (stricter rate limiting)
const authApiRoutes = ['/api/auth/'];

/**
 * Get client IP from request headers
 * Handles various proxy configurations
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
 * These headers protect against various web attacks
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
    // Prevent clickjacking attacks - DENY is more secure than SAMEORIGIN
    response.headers.set('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // Enable XSS protection in browsers (legacy but still useful)
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // DNS prefetch control
    response.headers.set('X-DNS-Prefetch-Control', 'on');

    // HSTS (HTTPS Strict Transport Security) - forces HTTPS
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

    // Permissions policy (formerly Feature Policy)
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');

    // Content Security Policy
    const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "font-src 'self'",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
        "media-src 'self' https:",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
    ].join('; ');
    response.headers.set('Content-Security-Policy', csp);

    return response;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const ip = getClientIp(request);
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // ============================================================================
    // SECURITY CHECK 1: Block Suspicious Requests
    // Check for common attack patterns in URL and query params
    // ============================================================================
    const urlToCheck = pathname + request.nextUrl.search;
    if (containsSuspiciousPatterns(urlToCheck)) {
        console.warn(`[Security] Suspicious request blocked from IP: ${ip}, path: ${pathname}, requestId: ${requestId}`);

        return new NextResponse(
            JSON.stringify({
                error: 'Forbidden',
                message: 'Request contains suspicious patterns',
                requestId: requestId,
            }),
            {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }

    // ============================================================================
    // SECURITY CHECK 2: Rate Limiting for API Routes
    // Protect against brute force and DoS attacks
    // ============================================================================
    const isApiRoute = rateLimitedApiRoutes.some(route => pathname.startsWith(route));

    if (isApiRoute) {
        // Determine rate limit type based on route
        const isAuthRoute = authApiRoutes.some(route => pathname.startsWith(route));
        const rateLimitType = isAuthRoute ? 'auth' : 'api';
        const rateLimitConfig = isAuthRoute ? RATE_LIMITS.AUTH : RATE_LIMITS.API;

        const rateLimitId = generateRateLimitIdentifier(ip, pathname, rateLimitType as 'auth' | 'api');
        const rateLimitResult = checkRateLimit(rateLimitId, rateLimitConfig);

        if (!rateLimitResult.allowed) {
            console.warn(`[Security] Rate limit exceeded for IP: ${ip}, path: ${pathname}, requestId: ${requestId}`);

            return new NextResponse(
                JSON.stringify({
                    error: 'Too many requests',
                    message: isAuthRoute
                        ? 'Too many authentication attempts. Please try again later.'
                        : 'Rate limit exceeded. Please slow down.',
                    retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
                    requestId: requestId,
                }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-RateLimit-Limit': String(rateLimitConfig.maxRequests),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
                        'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
                    }
                }
            );
        }

        // Store rate limit info for response headers
        request.headers.set('x-ratelimit-remaining', String(rateLimitResult.remaining));
    }

    // ============================================================================
    // Create Supabase client for authentication checks
    // ============================================================================
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

    // ============================================================================
    // SECURITY CHECK 3: Redirect unauthenticated users to login
    // ============================================================================
    if (isProtectedRoute && !user) {
        const redirectUrl = new URL('/login', request.url);
        redirectUrl.searchParams.set('redirect', pathname);

        console.log(`[Auth] Redirecting unauthenticated user to login, original path: ${pathname}`);

        const response = NextResponse.redirect(redirectUrl);
        return addSecurityHeaders(response);
    }

    // ============================================================================
    // SECURITY CHECK 4: Redirect authenticated users away from auth pages
    // ============================================================================
    if (isAuthRoute && user) {
        const response = NextResponse.redirect(new URL('/dashboard', request.url));
        return addSecurityHeaders(response);
    }

    // ============================================================================
    // SECURITY CHECK 5: Check admin role for admin routes
    // ============================================================================
    if (isAdminRoute && user) {
        try {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single() as { data: { role: string } | null; error: Error | null };

            // Handle database errors or non-admin users (allow admin and super_admin roles)
            if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
                console.error(`[Security] Admin check failed for user: ${user.id}, error: ${profileError?.message || 'User is not admin'}`);

                const response = NextResponse.redirect(new URL('/dashboard', request.url));
                return addSecurityHeaders(response);
            }

            console.log(`[Auth] Admin access granted for user: ${user.id}, path: ${pathname}`);
        } catch (error) {
            console.error(`[Security] Unexpected error during admin check: ${error}`);

            const response = NextResponse.redirect(new URL('/dashboard', request.url));
            return addSecurityHeaders(response);
        }
    }

    // Continue with the request
    let response = NextResponse.next();

    // Add rate limit headers if applicable
    if (isApiRoute) {
        const remaining = request.headers.get('x-ratelimit-remaining');
        if (remaining) {
            response.headers.set('X-RateLimit-Remaining', remaining);
        }
    }

    // Add security headers to all responses
    response = addSecurityHeaders(response);

    return response;
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/admin/:path*',
        '/super-admin/:path*',
        '/login',
        '/register',
        '/reset-password',
        '/api/:path*',
    ],
};
