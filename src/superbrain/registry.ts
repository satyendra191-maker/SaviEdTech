import { engine as aiEngine } from '@/ai-engine';
import { engine as aiLearningEngine } from '@/ai-learning-engine';
import { engine as videoEngine } from '@/video-engine';
import { engine as whiteboardEngine } from '@/whiteboard-engine';
import { engine as seoEngine } from '@/seo-engine';
import { engine as growthEngine } from '@/growth-engine';
import { engine as salesEngine } from '@/sales-engine';
import { engine as financeEngine } from '@/finance-engine';
import { engine as hrEngine } from '@/hr-engine';
import { engine as franchiseEngine } from '@/franchise-engine';
import { engine as mobileEngine } from '@/mobile-app';
import { engine as notificationEngine } from '@/notification-engine';
import { engine as examUpdateEngine } from '@/exam-update-engine';
import { engine as analyticsEngine } from '@/analytics';
import { engine as automationEngine } from '@/automation';
import { engine as monitoringEngine } from '@/monitoring';
import { engine as securityEngine } from '@/security';
import { engine as backupsEngine } from '@/backups';
import type { EngineDefinition } from '@/modules/engine';

export const ENGINE_REGISTRY: EngineDefinition[] = [
  aiEngine,
  aiLearningEngine,
  videoEngine,
  whiteboardEngine,
  seoEngine,
  growthEngine,
  salesEngine,
  financeEngine,
  hrEngine,
  franchiseEngine,
  mobileEngine,
  notificationEngine,
  examUpdateEngine,
  analyticsEngine,
  automationEngine,
  monitoringEngine,
  securityEngine,
  backupsEngine,
];

const ENGINE_MAP = new Map(ENGINE_REGISTRY.map((engine) => [engine.id, engine]));

export function getEngine(engineId: string): EngineDefinition | undefined {
  return ENGINE_MAP.get(engineId);
}
