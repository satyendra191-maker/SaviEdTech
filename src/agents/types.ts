export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed' | 'waiting';

export type AgentType = 
  | 'architecture'
  | 'frontend'
  | 'backend'
  | 'database'
  | 'ai-systems'
  | 'devops'
  | 'testing'
  | 'security'
  | 'performance'
  | 'analytics'
  | 'growth';

export interface AgentCapability {
  name: string;
  description: string;
}

export interface AgentTask {
  id: string;
  type: AgentType;
  action: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: AgentStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  dependsOn?: string[];
}

export interface AgentHealth {
  status: 'healthy' | 'degraded' | 'critical';
  lastCheck: string;
  metrics: {
    tasksCompleted: number;
    tasksFailed: number;
    averageExecutionTime: number;
    uptime: number;
  };
}

export interface Agent {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  capabilities: AgentCapability[];
  status: AgentStatus;
  health: AgentHealth;
  currentTask?: AgentTask;
  lastError?: string;
  config: AgentConfig;
}

export interface AgentConfig {
  maxConcurrentTasks: number;
  timeoutMs: number;
  retryAttempts: number;
  enabled: boolean;
}

export interface AgentExecutionResult {
  success: boolean;
  taskId: string;
  agentId: string;
  output: Record<string, unknown>;
  error?: string;
  duration: number;
  timestamp: string;
}

export interface AgentMessage {
  id: string;
  from: AgentType;
  to: AgentType;
  type: 'task' | 'result' | 'error' | 'health_check' | 'sync';
  payload: Record<string, unknown>;
  timestamp: string;
  correlationId?: string;
}
