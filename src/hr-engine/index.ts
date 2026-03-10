import { createEngine } from '@/modules/engine';

export const engine = createEngine({
  id: 'hr-engine',
  name: 'HR Engine',
  description: 'Hiring, onboarding, and staff management workflows.',
  capabilities: ['career applications', 'employee onboarding', 'hr analytics'],
  dependencies: ['supabase'],
});
