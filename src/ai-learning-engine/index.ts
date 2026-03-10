import { createEngine, createHealth } from '@/modules/engine';

const hasSupabase = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

async function healthCheck() {
  const configured = hasSupabase();
  return createHealth(
    configured ? 'healthy' : 'degraded',
    configured ? 'Learning data configured' : 'Learning data source missing',
    { configured }
  );
}

export const engine = createEngine({
  id: 'ai-learning-engine',
  name: 'AI Learning Engine',
  description: 'Adaptive learning paths and mastery analytics.',
  capabilities: ['topic mastery tracking', 'study plan generation', 'gap detection'],
  dependencies: ['supabase', 'ai-engine'],
  healthCheck,
});
