import { createEngine, createHealth } from '@/modules/engine';

const isConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

async function healthCheck() {
  const configured = isConfigured();
  return createHealth(
    configured ? 'healthy' : 'degraded',
    configured ? 'Backup service configured' : 'Backup service not configured',
    { configured }
  );
}

export const engine = createEngine({
  id: 'backups',
  name: 'Backup Engine',
  description: 'Database backup creation and retention workflows.',
  capabilities: ['automated backups', 'backup retention', 'restore readiness'],
  dependencies: ['supabase'],
  healthCheck,
});

export * from '@/lib/backup/manager';
