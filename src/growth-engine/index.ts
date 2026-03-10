import { createEngine } from '@/modules/engine';

export const engine = createEngine({
  id: 'growth-engine',
  name: 'Growth Engine',
  description: 'Marketing automation, campaigns, and funnels.',
  capabilities: ['campaign automation', 'lead scoring', 'funnel optimization'],
  dependencies: ['analytics'],
});
