import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSuperbrainHealth, runSuperbrainTask, type SuperbrainTask } from '@/superbrain';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function verifyAuth(request: NextRequest): Promise<{ authorized: boolean; error?: string }> {
  const authHeader = request.headers.get('authorization');
  const apiKey = process.env.SUPERBRAIN_API_KEY || process.env.ADMIN_API_KEY || process.env.CRON_SECRET;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (apiKey && token === apiKey) {
      return { authorized: true };
    }
  }

  return { authorized: false, error: 'Unauthorized - Valid API key required' };
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
  const auth = await verifyAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
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
