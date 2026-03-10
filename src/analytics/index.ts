import { createEngine } from '@/modules/engine';

export const engine = createEngine({
  id: 'analytics',
  name: 'Analytics Engine',
  description: 'Learning analytics, rank prediction, and insights.',
  capabilities: ['rank prediction', 'learning analytics', 'performance trends'],
  dependencies: ['supabase'],
});

export * from '@/lib/analytics/rank-prediction';
