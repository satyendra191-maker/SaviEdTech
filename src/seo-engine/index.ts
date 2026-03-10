import { createEngine } from '@/modules/engine';

export const engine = createEngine({
  id: 'seo-engine',
  name: 'SEO Engine',
  description: 'SEO content generation and performance monitoring.',
  capabilities: ['seo content', 'keyword tracking', 'metadata automation'],
  dependencies: ['cms'],
});
