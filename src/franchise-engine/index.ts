import { createEngine } from '@/modules/engine';

export const engine = createEngine({
  id: 'franchise-engine',
  name: 'Franchise Engine',
  description: 'Franchise onboarding, compliance, and reporting.',
  capabilities: ['franchise applications', 'compliance tracking', 'regional reporting'],
  dependencies: ['supabase'],
});
