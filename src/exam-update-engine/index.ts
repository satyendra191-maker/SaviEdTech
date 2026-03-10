import { createEngine, createHealth } from '@/modules/engine';

const hasCron = () => Boolean(process.env.CRON_SECRET);

async function healthCheck() {
  const configured = hasCron();
  return createHealth(
    configured ? 'healthy' : 'degraded',
    configured ? 'Exam update scheduling configured' : 'Exam update scheduling not configured',
    { configured }
  );
}

export const engine = createEngine({
  id: 'exam-update-engine',
  name: 'Exam Update Engine',
  description: 'Exam schedule updates, alerts, and notifications.',
  capabilities: ['exam updates', 'result announcements', 'schedule alerts'],
  dependencies: ['notification-engine', 'supabase'],
  healthCheck,
});
