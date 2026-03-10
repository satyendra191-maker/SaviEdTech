import { createEngine } from '@/modules/engine';

export const engine = createEngine({
  id: 'mobile-app',
  name: 'Mobile App Engine',
  description: 'Mobile experiences and cross-platform delivery.',
  capabilities: ['mobile layout', 'push notifications', 'offline support'],
  dependencies: ['notification-engine'],
});
