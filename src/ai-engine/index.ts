import { createEngine, createHealth } from '@/modules/engine';

const hasProvider = () => Boolean(process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.LLM_API_KEY);

async function healthCheck() {
  const configured = hasProvider();
  return createHealth(
    configured ? 'healthy' : 'degraded',
    configured ? 'AI provider configured' : 'AI provider not configured',
    { configured }
  );
}

export const engine = createEngine({
  id: 'ai-engine',
  name: 'AI Education Engine',
  description: 'AI course creation, tutoring, and doubt solving.',
  capabilities: [
    'ai course creator',
    'ai tutor',
    'ai doubt solver',
    'question generation',
    'adaptive learning paths',
  ],
  dependencies: ['supabase', 'llm'],
  healthCheck,
});
