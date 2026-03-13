import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSuperbrainHealth, runSuperbrainTask, type SuperbrainTask, ENGINE_REGISTRY } from '@/superbrain';
import { createServerSupabaseClient } from '@/lib/supabase';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;

const CRON_JOBS = [
    { id: 'ai-content', path: '/api/cron/ai-content', name: 'AI Content Generation' },
    { id: 'exam-engine', path: '/api/cron/exam-engine', name: 'Exam Engine' },
    { id: 'student-analytics', path: '/api/cron/student-analytics', name: 'Student Analytics' },
    { id: 'engagement', path: '/api/cron/engagement', name: 'Student Engagement' },
    { id: 'marketing-automation', path: '/api/cron/marketing-automation', name: 'Marketing Automation' },
    { id: 'financial-automation', path: '/api/cron/financial-automation', name: 'Financial Automation' },
    { id: 'database-maintenance', path: '/api/cron/database-maintenance', name: 'Database Maintenance' },
    { id: 'security-monitoring', path: '/api/cron/security-monitoring', name: 'Security Monitoring' },
    { id: 'performance-optimization', path: '/api/cron/performance-optimization', name: 'Performance Optimization' },
    { id: 'automated-testing', path: '/api/cron/automated-testing', name: 'Automated Testing' },
    { id: 'live-class-automation', path: '/api/cron/live-class-automation', name: 'Live Class Automation' },
    { id: 'lead-management', path: '/api/cron/lead-management', name: 'Lead Management' },
    { id: 'supabase-health', path: '/api/cron/supabase-health', name: 'Supabase Health Check' },
    { id: 'auth-check', path: '/api/cron/auth-check', name: 'Authentication Check' },
    { id: 'health-monitor', path: '/api/cron/health-monitor', name: 'Health Monitor' },
    { id: 'rank-prediction', path: '/api/cron/rank-prediction', name: 'Rank Prediction' },
    { id: 'gamification', path: '/api/cron/gamification', name: 'Gamification' },
    { id: 'database-backup', path: '/api/cron/database-backup', name: 'Database Backup' },
    { id: 'seo-automation', path: '/api/cron/seo-automation', name: 'SEO Automation' },
    { id: 'email-notifications', path: '/api/cron/email-notifications', name: 'Email Notifications' },
    { id: 'platform-auditor', path: '/api/cron/platform-auditor', name: 'Platform Auditor' },
];

async function verifyAuth(request: NextRequest): Promise<{ authorized: boolean; isSuperAdmin: boolean; error?: string }> {
  const authHeader = request.headers.get('authorization');
  const apiKey = process.env.SUPERBRAIN_API_KEY || process.env.ADMIN_API_KEY || process.env.CRON_SECRET;
  const superAdminKey = process.env.SUPER_ADMIN_KEY || process.env.ADMIN_API_KEY;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    if (superAdminKey && token === superAdminKey) {
      return { authorized: true, isSuperAdmin: true };
    }
    
    if (apiKey && token === apiKey) {
      return { authorized: true, isSuperAdmin: false };
    }
  }

  return { authorized: false, isSuperAdmin: false, error: 'Unauthorized - Valid API key required' };
}

async function verifySuperAdmin(request: NextRequest): Promise<{ authorized: boolean; error?: string }> {
  const auth = await verifyAuth(request);
  if (!auth.authorized) {
    return { authorized: false, error: auth.error };
  }
  if (!auth.isSuperAdmin) {
    return { authorized: false, error: 'Super Admin access required for this operation' };
  }
  return { authorized: true };
}

async function logCronJob(
    supabase: ReturnType<typeof createServerSupabaseClient>,
    jobName: string,
    status: 'running' | 'success' | 'failed',
    details: Record<string, unknown> = {},
    durationMs?: number
) {
    try {
        await (supabase as any).from('cron_job_logs').insert({
            job_name: jobName,
            status,
            details,
            duration_ms: durationMs ?? null,
            executed_at: new Date().toISOString(),
        });
    } catch {
        // silently ignore log errors
    }
}

async function getJobStatus(supabase: ReturnType<typeof createServerSupabaseClient>, jobId: string) {
    const { data } = await (supabase as any)
        .from('cron_job_logs')
        .select('status, executed_at, duration_ms')
        .eq('job_name', jobId)
        .order('executed_at', { ascending: false })
        .limit(1);
    return data?.[0] || null;
}

async function getJobConfig(supabase: ReturnType<typeof createServerSupabaseClient>, jobId: string) {
    const { data } = await (supabase as any)
        .from('cron_job_configs')
        .select('*')
        .eq('job_name', jobId)
        .single();
    return data;
}

const taskSchema = z.object({
  engineId: z.string().min(1),
  type: z.string().min(1),
  id: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  requestId: z.string().optional(),
  triggeredBy: z.string().optional(),
  dryRun: z.boolean().optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  const auth = await verifyAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
  }

  const isSuperAdmin = auth.isSuperAdmin;

  const supabase = createServerSupabaseClient();

  // Get full platform status with cron jobs
  if (action === 'status') {
    try {
      const jobs = await Promise.all(
        CRON_JOBS.map(async (job) => {
          const status = await getJobStatus(supabase, job.id);
          const config = await getJobConfig(supabase, job.id);
          return {
            ...job,
            isEnabled: config?.is_enabled ?? true,
            schedule: config?.schedule ?? 'Not configured',
            lastStatus: status?.status || 'idle',
            lastRun: status?.executed_at || null,
            lastDuration: status?.duration_ms || null,
          };
        })
      );

      const { data: recentLogs } = await (supabase as any)
        .from('cron_job_logs')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(20);

      const { data: alerts } = await (supabase as any)
        .from('system_alerts')
        .select('*')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(10);

      return NextResponse.json({
        success: true,
        jobs,
        recentLogs,
        alerts,
        engines: ENGINE_REGISTRY.map(e => ({ id: e.id, name: e.name })),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, { status: 500 });
    }
  }

  // Get specific job info
  if (action === 'job' && searchParams.has('jobId')) {
    const jobId = searchParams.get('jobId');
    const job = CRON_JOBS.find(j => j.id === jobId);
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const status = await getJobStatus(supabase, jobId!);
    const config = await getJobConfig(supabase, jobId!);
    const logs = await (supabase as any)
      .from('cron_job_logs')
      .select('*')
      .eq('job_name', jobId)
      .order('executed_at', { ascending: false })
      .limit(50);

    return NextResponse.json({
      success: true,
      job: {
        ...job,
        isEnabled: config?.is_enabled ?? true,
        schedule: config?.schedule ?? 'Not configured',
        description: config?.description ?? '',
        lastStatus: status?.status || 'idle',
        lastRun: status?.executed_at || null,
        lastDuration: status?.duration_ms || null,
      },
      logs: logs.data || [],
    });
  }

  try {
    const report = await getSuperbrainHealth();
    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const taskData = parsed.data;
    const task: SuperbrainTask = {
      engineId: taskData.engineId,
      id: taskData.id ?? randomUUID(),
      type: taskData.type,
      payload: taskData.payload,
    };

    const result = await runSuperbrainTask(task, {
      requestId: taskData.requestId,
      triggeredBy: taskData.triggeredBy,
      dryRun: taskData.dryRun,
    });

    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: result.data ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Handle cron job management actions
const cronActionSchema = z.object({
  action: z.enum(['trigger', 'toggle', 'runAll', 'heal']).optional(),
  jobId: z.string().optional(),
  enabled: z.boolean().optional(),
});

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const supabase = createServerSupabaseClient();
  const startTime = Date.now();

  // Trigger a cron job manually
  if (action === 'trigger') {
    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }
    
    const parsed = z.object({ jobId: z.string() }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'jobId is required' }, { status: 400 });
    }

    const { jobId } = parsed.data;
    const job = CRON_JOBS.find(j => j.id === jobId);
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found', validJobs: CRON_JOBS.map(j => j.id) }, { status: 404 });
    }

    const config = await getJobConfig(supabase, jobId);
    if (config && !config.is_enabled) {
      return NextResponse.json({ error: 'Job is disabled' }, { status: 403 });
    }

    await logCronJob(supabase, jobId, 'running', { triggeredBy: 'manual' });

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://saviedutech.vercel.app'}${job.path}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${CRON_SECRET}` },
      });

      const durationMs = Date.now() - startTime;
      const result = await response.json();

      if (response.ok) {
        await logCronJob(supabase, jobId, 'success', { triggeredBy: 'manual', result }, durationMs);
        return NextResponse.json({
          success: true,
          job: job.name,
          durationMs,
          result,
        });
      } else {
        await logCronJob(supabase, jobId, 'failed', { triggeredBy: 'manual', error: result }, durationMs);
        return NextResponse.json({
          success: false,
          job: job.name,
          error: result,
        }, { status: 500 });
      }
    } catch (error) {
      const durationMs = Date.now() - startTime;
      await logCronJob(supabase, jobId, 'failed', { 
        triggeredBy: 'manual', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, durationMs);
      
      return NextResponse.json({
        success: false,
        job: job.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, { status: 500 });
    }
  }

  // Toggle job enable/disable
  if (action === 'toggle') {
    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    const parsed = z.object({ jobId: z.string(), enabled: z.boolean() }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'jobId and enabled are required' }, { status: 400 });
    }

    const { jobId, enabled } = parsed.data;
    const job = CRON_JOBS.find(j => j.id === jobId);
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found', validJobs: CRON_JOBS.map(j => j.id) }, { status: 404 });
    }

    try {
      await (supabase as any).from('cron_job_configs').upsert({
        job_name: jobId,
        is_enabled: enabled,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'job_name' });

      return NextResponse.json({
        success: true,
        job: job.name,
        isEnabled: enabled,
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, { status: 500 });
    }
  }

  // Run all enabled cron jobs
  if (action === 'runAll') {
    const results = [];

    for (const job of CRON_JOBS) {
      const config = await getJobConfig(supabase, job.id);
      if (config && !config.is_enabled) {
        results.push({ job: job.name, status: 'skipped', reason: 'disabled' });
        continue;
      }

      await logCronJob(supabase, job.id, 'running', { triggeredBy: 'runAll' });
      const jobStartTime = Date.now();

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://saviedutech.vercel.app'}${job.path}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${CRON_SECRET}` },
        });

        const durationMs = Date.now() - jobStartTime;

        if (response.ok) {
          await logCronJob(supabase, job.id, 'success', { triggeredBy: 'runAll' }, durationMs);
          results.push({ job: job.name, status: 'success', durationMs });
        } else {
          await logCronJob(supabase, job.id, 'failed', { triggeredBy: 'runAll' }, durationMs);
          results.push({ job: job.name, status: 'failed', durationMs });
        }
      } catch (error) {
        const durationMs = Date.now() - jobStartTime;
        await logCronJob(supabase, job.id, 'failed', { 
          triggeredBy: 'runAll', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }, durationMs);
        results.push({ job: job.name, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error', durationMs });
      }
    }

    return NextResponse.json({
      success: true,
      totalJobs: results.length,
      results,
      totalDurationMs: Date.now() - startTime,
    });
  }

  // Trigger self-healing
  if (action === 'heal') {
    await logCronJob(supabase, 'self-healing', 'running', { triggeredBy: 'manual' });

    try {
      const { selfHeal } = await import('@/lib/platform-manager/selfhealing');
      const result = await selfHeal();
      
      await logCronJob(supabase, 'self-healing', 'success', { triggeredBy: 'manual', result }, Date.now() - startTime);

      return NextResponse.json({
        success: true,
        result,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      await logCronJob(supabase, 'self-healing', 'failed', { 
        triggeredBy: 'manual', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, Date.now() - startTime);

      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Invalid action. Use action=trigger, toggle, runAll, or heal' }, { status: 400 });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await verifySuperAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const supabase = createServerSupabaseClient();

  if (action === 'deleteLog') {
    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }
    
    const parsed = z.object({ logId: z.string() }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'logId is required' }, { status: 400 });
    }

    const { logId } = parsed.data;
    
    try {
      await (supabase as any)
        .from('cron_job_logs')
        .delete()
        .eq('id', logId);

      return NextResponse.json({ success: true, message: 'Log deleted successfully' });
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete log' 
      }, { status: 500 });
    }
  }

  if (action === 'clearOldLogs') {
    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }
    
    const parsed = z.object({ daysOld: z.number().min(1).default(30) }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
    }

    const { daysOld } = parsed.data;
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();

    try {
      const { count } = await (supabase as any)
        .from('cron_job_logs')
        .delete()
        .lt('executed_at', cutoffDate);

      return NextResponse.json({ 
        success: true, 
        message: `Deleted ${count || 0} logs older than ${daysOld} days` 
      });
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to clear logs' 
      }, { status: 500 });
    }
  }

  if (action === 'deleteAlert') {
    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }
    
    const parsed = z.object({ alertId: z.string() }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'alertId is required' }, { status: 400 });
    }

    const { alertId } = parsed.data;
    
    try {
      await (supabase as any)
        .from('system_alerts')
        .delete()
        .eq('id', alertId);

      return NextResponse.json({ success: true, message: 'Alert deleted successfully' });
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete alert' 
      }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Invalid action for DELETE' }, { status: 400 });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await verifySuperAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const supabase = createServerSupabaseClient();

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  if (action === 'createCronJob') {
    const parsed = z.object({
      jobName: z.string().min(1),
      schedule: z.string().min(1),
      description: z.string().optional(),
      isEnabled: z.boolean().default(true),
    }).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid job configuration' }, { status: 400 });
    }

    const { jobName, schedule, description, isEnabled } = parsed.data;

    try {
      await (supabase as any)
        .from('cron_job_configs')
        .upsert({
          job_name: jobName,
          schedule,
          description: description || '',
          is_enabled: isEnabled,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'job_name' });

      return NextResponse.json({ 
        success: true, 
        message: `Cron job ${jobName} created/updated successfully` 
      });
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create cron job' 
      }, { status: 500 });
    }
  }

  if (action === 'updateCronJob') {
    const parsed = z.object({
      jobName: z.string().min(1),
      schedule: z.string().optional(),
      description: z.string().optional(),
      isEnabled: z.boolean().optional(),
    }).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid job configuration' }, { status: 400 });
    }

    const { jobName, schedule, description, isEnabled } = parsed.data;
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    
    if (schedule) updateData.schedule = schedule;
    if (description !== undefined) updateData.description = description;
    if (isEnabled !== undefined) updateData.is_enabled = isEnabled;

    try {
      await (supabase as any)
        .from('cron_job_configs')
        .update(updateData)
        .eq('job_name', jobName);

      return NextResponse.json({ 
        success: true, 
        message: `Cron job ${jobName} updated successfully` 
      });
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update cron job' 
      }, { status: 500 });
    }
  }

  if (action === 'resolveAlert') {
    const parsed = z.object({
      alertId: z.string().min(1),
      resolution: z.string().optional(),
    }).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'alertId is required' }, { status: 400 });
    }

    const { alertId, resolution } = parsed.data;

    try {
      await (supabase as any)
        .from('system_alerts')
        .update({ 
          is_resolved: true, 
          resolved_at: new Date().toISOString(),
          metadata: { resolution: resolution || 'Resolved via Superbrain Admin' },
        })
        .eq('id', alertId);

      return NextResponse.json({ 
        success: true, 
        message: `Alert ${alertId} resolved successfully` 
      });
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to resolve alert' 
      }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Invalid action for PATCH' }, { status: 400 });
}
