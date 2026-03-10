export type EngineHealthStatus = 'healthy' | 'degraded' | 'critical';

export interface EngineHealth {
  status: EngineHealthStatus;
  message: string;
  checkedAt: string;
  details?: Record<string, unknown>;
}

export interface EngineTask {
  id: string;
  type: string;
  payload?: Record<string, unknown>;
}

export interface EngineTaskResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface EngineContext {
  requestId?: string;
  triggeredBy?: string;
  dryRun?: boolean;
}

export interface EngineDefinition {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  dependencies?: string[];
  getHealth: (context?: EngineContext) => Promise<EngineHealth>;
  runTask?: (task: EngineTask, context?: EngineContext) => Promise<EngineTaskResult>;
}

export interface EngineConfig {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  dependencies?: string[];
  healthCheck?: (context?: EngineContext) => Promise<EngineHealth>;
  taskHandler?: (task: EngineTask, context?: EngineContext) => Promise<EngineTaskResult>;
}

export function createHealth(
  status: EngineHealthStatus,
  message: string,
  details?: Record<string, unknown>
): EngineHealth {
  return {
    status,
    message,
    checkedAt: new Date().toISOString(),
    details,
  };
}

export function createTaskResult(
  success: boolean,
  message: string,
  data?: unknown
): EngineTaskResult {
  return { success, message, data };
}

export function createEngine(config: EngineConfig): EngineDefinition {
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    capabilities: config.capabilities,
    dependencies: config.dependencies,
    getHealth:
      config.healthCheck ??
      (async () =>
        createHealth('healthy', `${config.name} operational`, {
          dependencies: config.dependencies ?? [],
        })),
    runTask: config.taskHandler,
  };
}
