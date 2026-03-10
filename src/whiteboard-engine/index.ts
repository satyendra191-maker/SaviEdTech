import { createEngine } from '@/modules/engine';

export const engine = createEngine({
  id: 'whiteboard-engine',
  name: 'Whiteboard Engine',
  description: 'Whiteboard animation and interactive teaching.',
  capabilities: ['whiteboard animation', 'diagram generation', 'live annotations'],
  dependencies: ['ai-engine'],
});
