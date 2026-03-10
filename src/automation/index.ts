import { createEngine, createHealth, createTaskResult, type EngineTask } from '@/modules/engine';
import { getSystemStatus, selfHeal } from '@/lib/platform-manager/selfhealing';

async function healthCheck() {
  try {
    const status = await getSystemStatus();
    const overall = status.overall_status;
    const mapped = overall === 'healthy' ? 'healthy' : overall === 'degraded' ? 'degraded' : 'critical';

    return createHealth(mapped, 'Automation and self-healing status', {
      overall_status: overall,
      cron_status: status.cron_jobs.status,
      database_status: status.database.status,
    });
  } catch (error) {
    return createHealth('degraded', 'Automation status unavailable', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function taskHandler(task: EngineTask) {
  if (task.type === 'self_heal') {
    const result = await selfHeal();
    return createTaskResult(true, 'Self-healing cycle executed', result);
  }

  return createTaskResult(false, `Unsupported automation task: ${task.type}`);
}

export const engine = createEngine({
  id: 'automation',
  name: 'Automation Engine',
  description: 'Orchestrates scheduled tasks and self-healing routines.',
  capabilities: [
    'cron scheduling',
    'self-healing recovery',
    'automated testing',
    'deployment validation',
  ],
  dependencies: ['supabase', 'cron'],
  healthCheck,
  taskHandler,
});

export { healthCheck as getAutomationHealth };
