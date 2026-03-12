/**
 * Unified Trigger API - Master Cron Orchestrator
 * 
 * SECURITY NOTICE: This API route handles sensitive automation operations.
 * - Only accessible to authenticated admin users
 * - CRON_SECRET is validated server-side only, never exposed to client
 * - Rate limited to prevent abuse
 * - All requests are logged for audit purposes
 * 
 * This endpoint triggers ALL cron jobs and/or ALL engines through one request.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import {
    checkRateLimit,
    generateRateLimitIdentifier,
    RATE_LIMITS,
} from '@/lib/security';
import { z } from 'zod';
import { ENGINE_REGISTRY } from '@/superbrain/registry';

const ALLOWED_CRON_JOBS = [
    { id: 'cron_daily_challenge', name: 'Daily Challenge', path: '/api/cron/daily-challenge' },
    { id: 'cron_dpp_generator', name: 'DPP Generator', path: '/api/cron/dpp-generator' },
    { id: 'cron_lecture_publisher', name: 'Lecture Publisher', path: '/api/cron/lecture-publisher' },
    { id: 'cron_rank_prediction', name: 'Rank Prediction', path: '/api/cron/rank-prediction' },
    { id: 'cron_revision_updater', name: 'Revision Updater', path: '/api/cron/revision-updater' },
    { id: 'cron_health_monitor', name: 'Health Monitor', path: '/api/cron/health-monitor' },
    { id: 'cron_test_runner', name: 'Test Runner', path: '/api/cron/test-runner' },
    { id: 'cron_platform_auditor', name: 'Platform Auditor', path: '/api/cron/platform-auditor' },
    { id: 'cron_email_notifications', name: 'Email Notifications', path: '/api/cron/email-notifications' },
    { id: 'cron_database_backup', name: 'Database Backup', path: '/api/cron/database-backup' },
    { id: 'cron_biweekly_test_scheduler', name: 'Biweekly Test Scheduler', path: '/api/cron/biweekly-test-scheduler' },
    { id: 'cron_social_media_automation', name: 'Social Media Automation', path: '/api/cron/social-media-automation' },
    { id: 'cron_video_generation', name: 'Video Generation', path: '/api/cron/video-generation' },
    { id: 'cron_notes_generator', name: 'Notes Generator', path: '/api/cron/notes-generator' },
    { id: 'cron_gst_accounts', name: 'GST & Accounts', path: '/api/cron/gst-accounts' },
    { id: 'cron_pyq_updater', name: 'PYQ Updater (JEE/NEET/Board)', path: '/api/cron/pyq-updater' },
    { id: 'cron_gov_notifications', name: 'Gov Notifications (GOs)', path: '/api/cron/gov-notifications' },
    { id: 'cron_certificate_generator', name: 'Certificate Generator', path: '/api/cron/certificate-generator' },
    { id: 'cron_lead_management', name: 'Lead Management', path: '/api/cron/lead-management' },
    { id: 'cron_push_notifications', name: 'Push Notifications', path: '/api/cron/push-notifications' },
    { id: 'cron_referral_processing', name: 'Referral Processing', path: '/api/cron/referral-processing' },
    { id: 'cron_system_maintenance', name: 'System Maintenance', path: '/api/cron/system-maintenance' },
    { id: 'cron_student_analytics', name: 'Student Analytics', path: '/api/cron/student-analytics' },
    { id: 'cron_gamification', name: 'Gamification (Streaks/Leaderboard)', path: '/api/cron/gamification' },
    { id: 'cron_webinar_scheduler', name: 'Webinar Scheduler', path: '/api/cron/webinar-scheduler' },
    { id: 'cron_refund_processing', name: 'Refund Processing', path: '/api/cron/refund-processing' },
    { id: 'cron_assignment_automation', name: 'Assignment Automation', path: '/api/cron/assignment-automation' },
    { id: 'cron_doubt_clearing', name: 'Doubt Clearing (AI)', path: '/api/cron/doubt-clearing' },
    { id: 'cron_inactive_users', name: 'Inactive Users Re-engagement', path: '/api/cron/inactive-users' },
    { id: 'cron_seo_automation', name: 'SEO & Sitemap', path: '/api/cron/seo-automation' },
    { id: 'cron_course_expiry', name: 'Course Expiry', path: '/api/cron/course-expiry' },
    { id: 'cron_ai_learning_path', name: 'AI Learning Path', path: '/api/cron/ai-learning-path' },
    { id: 'cron_performance_alerts', name: 'Performance Alerts', path: '/api/cron/performance-alerts' },
    { id: 'cron_whatsapp_sms_automation', name: 'WhatsApp/SMS Automation', path: '/api/cron/whatsapp-sms-automation' },
    { id: 'cron_content_translation', name: 'Content Translation', path: '/api/cron/content-translation' },
    { id: 'cron_scholarship_management', name: 'Scholarship Management', path: '/api/cron/scholarship-management' },
    { id: 'cron_attendance_tracking', name: 'Attendance Tracking', path: '/api/cron/attendance-tracking' },
    { id: 'cron_quiz_analytics', name: 'Quiz Analytics', path: '/api/cron/quiz-analytics' },
    { id: 'cron_content_moderation', name: 'Content Moderation', path: '/api/cron/content-moderation' },
    { id: 'cron_pricing_automation', name: 'Pricing Automation', path: '/api/cron/pricing-automation' },
    { id: 'cron_course_bundling', name: 'Course Bundling', path: '/api/cron/course-bundling' },
    { id: 'cron_review_automation', name: 'Review Automation', path: '/api/cron/review-automation' },
    { id: 'cron_system_health', name: 'System Health', path: '/api/cron/system-health' },
    { id: 'cron_database_optimization', name: 'Database Optimization', path: '/api/cron/database-optimization' },
    { id: 'cron_webinar_automation', name: 'Webinar Automation', path: '/api/cron/webinar-automation' },
] as const;

const unifiedTriggerSchema = z.object({
    triggerCrons: z.boolean().optional().default(true),
    triggerEngines: z.boolean().optional().default(true),
    engineTaskType: z.string().optional(),
    engineTaskPayload: z.record(z.unknown()).optional(),
    runParallel: z.boolean().optional().default(true),
});

type UnifiedTriggerParams = z.infer<typeof unifiedTriggerSchema>;

function getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0]?.trim() || 'unknown';
    }
    const realIp = request.headers.get('x-real-ip');
    if (realIp) return realIp;
    return 'unknown';
}

async function triggerCronJob(cronSecretEnv: string, job: typeof ALLOWED_CRON_JOBS[number], baseUrl: string, requestId: string) {
    const startTime = Date.now();
    try {
        const cronUrl = new URL(job.path, baseUrl);
        const response = await fetch(cronUrl.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${cronSecretEnv}`,
                'X-Request-Id': requestId,
            },
        });

        const duration = Date.now() - startTime;
        let result;
        try {
            result = await response.json();
        } catch {
            result = null;
        }

        return {
            id: job.id,
            name: job.name,
            success: response.ok,
            duration,
            result: response.ok ? result : { error: result?.error || 'Request failed' },
        };
    } catch (error) {
        return {
            id: job.id,
            name: job.name,
            success: false,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

async function triggerEngine(
    engine: typeof ENGINE_REGISTRY[number],
    taskType: string | undefined,
    payload: Record<string, unknown> | undefined,
    requestId: string
) {
    const startTime = Date.now();
    try {
        if (!engine.runTask) {
            return {
                id: engine.id,
                name: engine.name,
                success: false,
                duration: Date.now() - startTime,
                error: 'Engine does not support task execution',
            };
        }

        const task = {
            id: `unified_trigger_${requestId}`,
            type: taskType || 'health_check',
            payload: payload || {},
        };

        const result = await engine.runTask(task, { triggeredBy: 'unified_trigger', requestId });

        return {
            id: engine.id,
            name: engine.name,
            success: result.success,
            duration: Date.now() - startTime,
            result: {
                message: result.message,
                data: result.data,
            },
        };
    } catch (error) {
        return {
            id: engine.id,
            name: engine.name,
            success: false,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

interface CronResult {
    id: string;
    name: string;
    success: boolean;
    duration: number;
    result?: unknown;
    error?: string;
}

interface EngineResult {
    id: string;
    name: string;
    success: boolean;
    duration: number;
    result?: unknown;
    error?: string;
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const requestId = `unified_trigger_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const ip = getClientIp(request);

    try {
        const rateLimitId = generateRateLimitIdentifier(ip, '/api/admin/unified-trigger', 'strict');
        const rateLimitResult = checkRateLimit(rateLimitId, RATE_LIMITS.STRICT);

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                {
                    error: 'Too many requests',
                    message: 'Please wait before triggering again',
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

        const supabase = createServerSupabaseClient() as any;
        
        const authHeader = request.headers.get('authorization');
        const cronSecretEnv = process.env.CRON_SECRET;
        
        let userId: string | null = null;
        
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.slice(7);
            if (token === cronSecretEnv) {
                userId = 'cron_system';
            } else {
                const { data: { user }, error: authError } = await supabase.auth.getUser(token);
                if (!authError && user) {
                    userId = user.id;
                }
            }
        }
        
        if (!userId) {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (!authError && user) {
                userId = user.id;
            }
        }

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Authentication required' },
                { status: 401 }
            );
        }

        const isCronSystem = userId === 'cron_system';
        
        if (!isCronSystem) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single() as { data: { role: string } | null };

            if (!profile || profile.role !== 'admin') {
                return NextResponse.json(
                    { error: 'Forbidden', message: 'Admin privileges required' },
                    { status: 403 }
                );
            }
        }

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: 'Bad Request', message: 'Invalid JSON body' },
                { status: 400 }
            );
        }

        const validationResult = unifiedTriggerSchema.safeParse(body);

        if (!validationResult.success) {
            const errorMessage = validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            return NextResponse.json(
                { error: 'Bad Request', message: errorMessage },
                { status: 400 }
            );
        }

        const params: UnifiedTriggerParams = validationResult.data;

        if (!cronSecretEnv) {
            return NextResponse.json(
                { error: 'Internal Server Error', message: 'Cron service not configured' },
                { status: 500 }
            );
        }

        const baseUrl = request.url.replace(new URL(request.url).pathname, '');
        const results: {
            crons?: CronResult[];
            engines?: EngineResult[];
            summary: {
                total: number;
                successful: number;
                failed: number;
                duration: number;
            };
        } = {
            summary: {
                total: 0,
                successful: 0,
                failed: 0,
                duration: 0,
            }
        };

        if (params.triggerCrons) {
            results.crons = [];
            
            if (params.runParallel) {
                const cronPromises = ALLOWED_CRON_JOBS.map(job => 
                    triggerCronJob(cronSecretEnv, job, baseUrl, requestId)
                );
                const cronResults = await Promise.all(cronPromises);
                results.crons = cronResults;
                results.summary.successful += cronResults.filter(r => r.success).length;
                results.summary.failed += cronResults.filter(r => !r.success).length;
            } else {
                for (const job of ALLOWED_CRON_JOBS) {
                    const result = await triggerCronJob(cronSecretEnv, job, baseUrl, requestId);
                    results.crons.push(result);
                    if (result.success) results.summary.successful++;
                    else results.summary.failed++;
                }
            }
            results.summary.total += ALLOWED_CRON_JOBS.length;
        }

        if (params.triggerEngines) {
            results.engines = [];

            if (params.runParallel) {
                const enginePromises = ENGINE_REGISTRY.map(engine =>
                    triggerEngine(engine, params.engineTaskType, params.engineTaskPayload, requestId)
                );
                const engineResults = await Promise.all(enginePromises);
                results.engines = engineResults;
                results.summary.successful += engineResults.filter(r => r.success).length;
                results.summary.failed += engineResults.filter(r => !r.success).length;
            } else {
                for (const engine of ENGINE_REGISTRY) {
                    const result = await triggerEngine(engine, params.engineTaskType, params.engineTaskPayload, requestId);
                    results.engines.push(result);
                    if (result.success) results.summary.successful++;
                    else results.summary.failed++;
                }
            }
            results.summary.total += ENGINE_REGISTRY.length;
        }

        results.summary.duration = Date.now() - startTime;

        console.log(`[Audit] Admin ${userId} triggered unified automation: ${results.summary.total} jobs, ${results.summary.successful} succeeded, ${results.summary.failed} failed, duration: ${results.summary.duration}ms`);

        try {
            await (supabase.from('admin_audit_logs') as any).insert({
                admin_id: userId,
                action: 'UNIFIED_TRIGGER',
                resource: 'all_automation',
                ip_address: ip,
                user_agent: request.headers.get('user-agent')?.substring(0, 255) || null,
                success: results.summary.failed === 0,
                metadata: {
                    trigger_crons: params.triggerCrons,
                    trigger_engines: params.triggerEngines,
                    total_jobs: results.summary.total,
                    successful: results.summary.successful,
                    failed: results.summary.failed,
                    duration_ms: results.summary.duration,
                    request_id: requestId,
                },
            });
        } catch (auditError) {
            console.error(`[Audit] Failed to log audit entry: ${auditError}`);
        }

        return NextResponse.json(
            {
                success: results.summary.failed === 0,
                message: `Triggered ${results.summary.total} automation jobs (${results.summary.successful} successful, ${results.summary.failed} failed)`,
                requestId,
                results,
            },
            {
                status: results.summary.failed > 0 ? 207 : 200,
                headers: {
                    'X-RateLimit-Limit': String(RATE_LIMITS.STRICT.maxRequests),
                    'X-RateLimit-Remaining': String(rateLimitResult.remaining),
                    'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
                }
            }
        );

    } catch (error) {
        console.error(`[Error] Unified trigger API: ${error}, requestId: ${requestId}`);

        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'An error occurred',
                requestId,
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    const ip = getClientIp(request);

    try {
        const rateLimitId = generateRateLimitIdentifier(ip, '/api/admin/unified-trigger', 'api');
        const rateLimitResult = checkRateLimit(rateLimitId, RATE_LIMITS.API);

        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const supabase = createServerSupabaseClient() as any;
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single() as { data: { role: string } | null };

        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json({
            availableCrons: ALLOWED_CRON_JOBS.map(({ id, name }) => ({ id, name })),
            availableEngines: ENGINE_REGISTRY.map(({ id, name, capabilities }) => ({ id, name, capabilities })),
            defaultParams: {
                triggerCrons: true,
                triggerEngines: true,
                runParallel: true,
            },
            totalCronJobs: ALLOWED_CRON_JOBS.length,
            totalEngines: ENGINE_REGISTRY.length,
        });

    } catch (error) {
        console.error(`[Error] Listing unified trigger info: ${error}`);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
