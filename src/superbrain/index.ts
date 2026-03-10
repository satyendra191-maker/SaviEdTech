import { ENGINE_REGISTRY, getEngine } from './registry';
import {
  createTaskResult,
  type EngineHealth,
  type EngineHealthStatus,
  type EngineTask,
  type EngineTaskResult,
} from '@/modules/engine';

export interface SuperbrainTask extends EngineTask {
  engineId: string;
}

export interface SuperbrainTaskContext {
  requestId?: string;
  triggeredBy?: string;
  dryRun?: boolean;
}

export interface SuperbrainHealthReport {
  overallStatus: EngineHealthStatus;
  engines: Array<{ id: string; name: string; health: EngineHealth }>;
  generatedAt: string;
}

function deriveOverallStatus(healths: EngineHealth[]): EngineHealthStatus {
  if (healths.some((health) => health.status === 'critical')) return 'critical';
  if (healths.some((health) => health.status === 'degraded')) return 'degraded';
  return 'healthy';
}

export async function getSuperbrainHealth(): Promise<SuperbrainHealthReport> {
  const engines = await Promise.all(
    ENGINE_REGISTRY.map(async (engine) => ({
      id: engine.id,
      name: engine.name,
      health: await engine.getHealth(),
    }))
  );

  return {
    overallStatus: deriveOverallStatus(engines.map((engine) => engine.health)),
    engines,
    generatedAt: new Date().toISOString(),
  };
}

export async function runSuperbrainTask(
  task: SuperbrainTask,
  context: SuperbrainTaskContext = {}
): Promise<EngineTaskResult> {
  const engine = getEngine(task.engineId);
  if (!engine) {
    return createTaskResult(false, `Unknown engine: ${task.engineId}`);
  }

  if (!engine.runTask) {
    return createTaskResult(false, `Engine ${engine.id} does not support tasks`);
  }

  return engine.runTask(
    { id: task.id, type: task.type, payload: task.payload },
    context
  );
}

export { ENGINE_REGISTRY };
