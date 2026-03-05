/**
 * Admin Cron Trigger API
 * 
 * SECURITY NOTICE: This API route handles sensitive cron operations.
 * - Only accessible to authenticated admin users
 * - CRON_SECRET is validated server-side only, never exposed to client
 * - Rate limited to prevent abuse
 * - All requests are logged for audit purposes
 * 
 * This replaces the insecure client-side cron triggering that exposed
 * NEXT_PUBLIC_CRON_SECRET in the browser.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import {
    checkRateLimit,
    generateRateLimitIdentifier,
    RATE_LIMITS,
    sanitizeInput,
} from '@/lib/security';
import { z } from 'zod';

// Allowed cron jobs that can be triggered
const ALLOWED_CRON_JOBS = [
    { id: 'cron_daily_challenge', name: 'Daily Challenge', path: '/api/cron/daily-challenge' },
    { id: 'cron_dpp_generator', name: 'DPP Generator', path: '/api/cron/dpp-generator' },
    { id: 'cron_lecture_publisher', name: 'Lecture Publisher', path: '/api/cron/lecture-publisher' },
    { id: 'cron_rank_prediction', name: 'Rank Prediction', path: '/api/cron/rank-prediction' },
    { id: 'cron_revision_updater', name: 'Revision Updater', path: '/api/cron/revision-updater' },
    { id: 'cron_health_monitor', name: 'Health Monitor', path: '/api/cron/health-monitor' },
    { id: 'cron_test_runner', name: 'Test Runner', path: '/api/cron/test-runner' },
] as const;

type CronJobId = typeof ALLOWED_CRON_JOBS[number]['id'];

// Validation schema for cron trigger requests
const cronTriggerSchema = z.object({
    jobId: z.enum([
        'cron_daily_challenge',
        'cron_dpp_generator',
        'cron_lecture_publisher',
        'cron_rank_prediction',
        'cron_revision_updater',
        'cron_health_monitor',
        'cron_test_runner',
    ]),
});

/**
 * Helper to get client IP from request
 */
function getClientIp(request: NextRequest): string {
    // Try x-forwarded-for header first (for proxied requests)
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0]?.trim() || 'unknown';
    }
    // Fall back to other headers
    const realIp = request.headers.get('x-real-ip');
    if (realIp) return realIp;

    return 'unknown';
}

/**
 * POST handler for triggering cron jobs
 * 
 * Security flow:
 * 1. Check rate limiting (strict: 3 attempts per hour)
 * 2. Validate user authentication
 * 3. Verify user has admin role
 * 4. Validate request body with Zod
 * 5. Trigger cron job server-side with CRON_SECRET
 * 6. Log action for audit
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const requestId = `cron_trigger_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Get client IP for rate limiting
    const ip = getClientIp(request);

    try {
        // ============================================================================
        // STEP 1: Rate Limiting Check
        // Use strict rate limiting for this sensitive operation
        // ============================================================================
        const rateLimitId = generateRateLimitIdentifier(ip, '/api/admin/cron-trigger', 'strict');
        const rateLimitResult = checkRateLimit(rateLimitId, RATE_LIMITS.STRICT);

        if (!rateLimitResult.allowed) {
            console.warn(`[Security] Rate limit exceeded for cron trigger from IP: ${ip}, requestId: ${requestId}`);

            return NextResponse.json(
                {
                    error: 'Too many requests',
                    message: 'Please wait before triggering another cron job',
                    retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
                },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Limit': String(RATE_LIMITS.STRICT.maxRequests),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
                    }
                }
            );
        }

        // ============================================================================
        // STEP 2: Authentication Check
        // Verify user is logged in
        // ============================================================================
        const supabase = createServerSupabaseClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.warn(`[Security] Unauthorized cron trigger attempt from IP: ${ip}, requestId: ${requestId}`);

            return NextResponse.json(
                { error: 'Unauthorized', message: 'Authentication required' },
                { status: 401 }
            );
        }

        // ============================================================================
        // STEP 3: Authorization Check
        // Verify user has admin role
        // ============================================================================
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single() as { data: { role: string } | null; error: Error | null };

        if (profileError || !profile || profile.role !== 'admin') {
            console.error(`[Security] Non-admin user attempted cron trigger: ${user.id}, requestId: ${requestId}`);

            return NextResponse.json(
                { error: 'Forbidden', message: 'Admin privileges required' },
                { status: 403 }
            );
        }

        // ============================================================================
        // STEP 4: Input Validation with Zod
        // Validate and sanitize the request body
        // ============================================================================
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: 'Bad Request', message: 'Invalid JSON body' },
                { status: 400 }
            );
        }

        const validationResult = cronTriggerSchema.safeParse(body);

        if (!validationResult.success) {
            const errorMessage = validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            console.warn(`[Security] Invalid cron trigger request from user: ${user.id}, error: ${errorMessage}`);

            return NextResponse.json(
                { error: 'Bad Request', message: errorMessage },
                { status: 400 }
            );
        }

        const { jobId } = validationResult.data;
        const sanitizedJobId = sanitizeInput(jobId) as CronJobId;

        // Find the requested cron job
        const job = ALLOWED_CRON_JOBS.find(j => j.id === sanitizedJobId);

        if (!job) {
            return NextResponse.json(
                { error: 'Bad Request', message: 'Invalid cron job ID' },
                { status: 400 }
            );
        }

        // ============================================================================
        // STEP 5: Server-Side Cron Trigger
        // CRON_SECRET is accessed server-side only - NEVER exposed to client
        // ============================================================================
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            console.error(`[Security] CRON_SECRET not configured, requestId: ${requestId}`);

            return NextResponse.json(
                { error: 'Internal Server Error', message: 'Cron service not configured' },
                { status: 500 }
            );
        }

        // Trigger the cron job server-side
        const cronUrl = new URL(job.path, request.url);
        const cronResponse = await fetch(cronUrl.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${cronSecret}`,
                'X-Request-Id': requestId,
            },
        });

        const duration = Date.now() - startTime;

        if (!cronResponse.ok) {
            const errorText = await cronResponse.text();
            console.error(`[Security] Cron job failed: ${job.id}, status: ${cronResponse.status}, requestId: ${requestId}`);

            return NextResponse.json(
                {
                    error: 'Cron job failed',
                    message: `Failed to trigger ${job.name}`,
                    details: errorText,
                },
                { status: 502 }
            );
        }

        const cronResult = await cronResponse.json();

        // ============================================================================
        // STEP 6: Audit Logging
        // Log the action for security auditing
        // ============================================================================
        console.log(`[Audit] Admin ${user.id} triggered cron job: ${job.name} (${job.id}), duration: ${duration}ms, requestId: ${requestId}`);

        // Store audit log in database (optional but recommended)
        // Note: admin_audit_logs table should be created in Supabase
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('admin_audit_logs') as any).insert({
                admin_id: user.id,
                action: 'CRON_TRIGGER',
                resource: job.id,
                ip_address: ip,
                user_agent: request.headers.get('user-agent')?.substring(0, 255) || null,
                success: true,
                metadata: {
                    job_name: job.name,
                    duration_ms: duration,
                    request_id: requestId,
                },
            });
        } catch (auditError) {
            // Don't fail the request if audit logging fails
            console.error(`[Audit] Failed to log audit entry: ${auditError}`);
        }

        return NextResponse.json(
            {
                success: true,
                message: `${job.name} triggered successfully`,
                jobId: job.id,
                jobName: job.name,
                result: cronResult,
                duration: duration,
                requestId: requestId,
            },
            {
                status: 200,
                headers: {
                    'X-RateLimit-Limit': String(RATE_LIMITS.STRICT.maxRequests),
                    'X-RateLimit-Remaining': String(rateLimitResult.remaining),
                    'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
                }
            }
        );

    } catch (error) {
        console.error(`[Security] Error in cron trigger API: ${error}, requestId: ${requestId}`);

        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: 'An error occurred while processing the request',
                requestId: requestId,
            },
            { status: 500 }
        );
    }
}

/**
 * GET handler for listing available cron jobs
 * 
 * Security:
 * - Requires authentication
 * - Requires admin role
 * - Rate limited
 */
export async function GET(request: NextRequest) {
    const ip = getClientIp(request);

    try {
        // Rate limiting check (API limit for this read-only endpoint)
        const rateLimitId = generateRateLimitIdentifier(ip, '/api/admin/cron-trigger', 'api');
        const rateLimitResult = checkRateLimit(rateLimitId, RATE_LIMITS.API);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests' },
                { status: 429 }
            );
        }

        // Authentication check
        const supabase = createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Authorization check
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single() as { data: { role: string } | null };

        if (!profile || profile.role !== 'admin') {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            );
        }

        // Return list of available cron jobs (without sensitive paths)
        const safeCronJobs = ALLOWED_CRON_JOBS.map(({ id, name }) => ({ id, name }));

        return NextResponse.json(
            {
                jobs: safeCronJobs,
                count: safeCronJobs.length,
            },
            {
                headers: {
                    'X-RateLimit-Limit': String(RATE_LIMITS.API.maxRequests),
                    'X-RateLimit-Remaining': String(rateLimitResult.remaining),
                }
            }
        );

    } catch (error) {
        console.error(`[Security] Error listing cron jobs: ${error}`);

        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
