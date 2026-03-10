import { createEngine, createHealth } from '@/modules/engine';
import { runFullHealthCheck } from '@/lib/platform-manager/health';

export async function getMonitoringSnapshot() {
  return runFullHealthCheck();
}

async function healthCheck() {
  try {
    const report = await runFullHealthCheck();
    const mapped = report.overall_status === 'healthy'
      ? 'healthy'
      : report.overall_status === 'degraded'
        ? 'degraded'
        : 'critical';

    return createHealth(mapped, 'Monitoring report generated', {
      summary: report.summary,
    });
  } catch (error) {
    return createHealth('critical', 'Monitoring check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export const engine = createEngine({
  id: 'monitoring',
  name: 'Monitoring Engine',
  description: 'Tracks platform uptime, latency, and service health.',
  capabilities: ['uptime monitoring', 'latency tracking', 'health reporting'],
  dependencies: ['supabase', 'api'],
  healthCheck,
});

export { healthCheck as getMonitoringHealth };
