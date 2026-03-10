import { createEngine } from '@/modules/engine';

export const engine = createEngine({
  id: 'sales-engine',
  name: 'Sales Engine',
  description: 'Lead handling, conversions, and revenue tracking.',
  capabilities: ['lead management', 'conversion tracking', 'sales reporting'],
  dependencies: ['payments', 'analytics'],
});
