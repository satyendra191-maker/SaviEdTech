import { createEngine, createHealth } from '@/modules/engine';

const hasStream = () => Boolean(process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_TOKEN);

async function healthCheck() {
  const configured = hasStream();
  return createHealth(
    configured ? 'healthy' : 'degraded',
    configured ? 'Video delivery configured' : 'Video delivery not configured',
    { configured }
  );
}

export const engine = createEngine({
  id: 'video-engine',
  name: 'Video Engine',
  description: 'Lecture streaming, generation, and delivery.',
  capabilities: ['video lectures', 'streaming orchestration', 'playback analytics'],
  dependencies: ['cloudflare'],
  healthCheck,
});
