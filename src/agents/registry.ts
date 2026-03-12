import type { Agent, AgentType, AgentTask, AgentExecutionResult, AgentHealth, AgentConfig } from './types';
import { v4 as uuid } from 'uuid';

const DEFAULT_CONFIG: AgentConfig = {
  maxConcurrentTasks: 5,
  timeoutMs: 300000,
  retryAttempts: 3,
  enabled: true,
};

export const AGENT_DEFINITIONS: Record<AgentType, Omit<Agent, 'health' | 'currentTask' | 'lastError'>> = {
  architecture: {
    id: 'agent-architecture',
    type: 'architecture',
    name: 'Architecture Agent',
    description: 'Maintains system architecture, validates microservice structure, prevents architectural drift',
    capabilities: [
      { name: 'validate_architecture', description: 'Validates system architecture' },
      { name: 'check_modularity', description: 'Ensures modular design' },
      { name: 'verify_patterns', description: 'Verifies design patterns' },
      { name: 'assess_scalability', description: 'Assesses scalability readiness' },
    ],
    status: 'idle',
    config: DEFAULT_CONFIG,
  },
  frontend: {
    id: 'agent-frontend',
    type: 'frontend',
    name: 'Frontend Agent',
    description: 'Builds UI components, maintains mobile-first UI, ensures responsive layouts',
    capabilities: [
      { name: 'build_component', description: 'Builds UI components' },
      { name: 'fix_styles', description: 'Fixes styling issues' },
      { name: 'optimize_rendering', description: 'Optimizes rendering performance' },
      { name: 'improve_ux', description: 'Improves user experience' },
    ],
    status: 'idle',
    config: DEFAULT_CONFIG,
  },
  backend: {
    id: 'agent-backend',
    type: 'backend',
    name: 'Backend Agent',
    description: 'Builds APIs, maintains microservices, ensures data integrity',
    capabilities: [
      { name: 'create_api', description: 'Creates API endpoints' },
      { name: 'fix_bug', description: 'Fixes backend bugs' },
      { name: 'optimize_query', description: 'Optimizes database queries' },
      { name: 'secure_endpoint', description: 'Secures API endpoints' },
    ],
    status: 'idle',
    config: DEFAULT_CONFIG,
  },
  database: {
    id: 'agent-database',
    type: 'database',
    name: 'Database Agent',
    description: 'Manages Supabase PostgreSQL schema, creates indexes, optimizes queries',
    capabilities: [
      { name: 'create_table', description: 'Creates database tables' },
      { name: 'add_index', description: 'Adds database indexes' },
      { name: 'optimize_query', description: 'Optimizes slow queries' },
      { name: 'migrate_schema', description: 'Manages schema migrations' },
    ],
    status: 'idle',
    config: DEFAULT_CONFIG,
  },
  'ai-systems': {
    id: 'agent-ai-systems',
    type: 'ai-systems',
    name: 'AI Systems Agent',
    description: 'Maintains AI learning engines, optimizes AI models, improves recommendation algorithms',
    capabilities: [
      { name: 'train_model', description: 'Trains AI models' },
      { name: 'optimize_algorithm', description: 'Optimizes AI algorithms' },
      { name: 'improve_recommendations', description: 'Improves recommendation quality' },
      { name: 'maintain_tutor', description: 'Maintains AI tutoring system' },
    ],
    status: 'idle',
    config: DEFAULT_CONFIG,
  },
  devops: {
    id: 'agent-devops',
    type: 'devops',
    name: 'DevOps Agent',
    description: 'Deployment automation, CI/CD pipelines, build validation',
    capabilities: [
      { name: 'deploy', description: 'Deploys to production' },
      { name: 'run_build', description: 'Runs build validation' },
      { name: 'configure_cicd', description: 'Configures CI/CD pipelines' },
      { name: 'monitor_health', description: 'Monitors system health' },
    ],
    status: 'idle',
    config: DEFAULT_CONFIG,
  },
  testing: {
    id: 'agent-testing',
    type: 'testing',
    name: 'Testing Agent',
    description: 'Runs automated tests, detects regressions, validates UI rendering',
    capabilities: [
      { name: 'run_tests', description: 'Runs automated tests' },
      { name: 'detect_regression', description: 'Detects regressions' },
      { name: 'validate_ui', description: 'Validates UI rendering' },
      { name: 'coverage_check', description: 'Checks test coverage' },
    ],
    status: 'idle',
    config: DEFAULT_CONFIG,
  },
  security: {
    id: 'agent-security',
    type: 'security',
    name: 'Security Agent',
    description: 'Security monitoring, vulnerability detection, API security validation',
    capabilities: [
      { name: 'scan_vulnerabilities', description: 'Scans for vulnerabilities' },
      { name: 'validate_auth', description: 'Validates authentication' },
      { name: 'detect_fraud', description: 'Detects fraud attempts' },
      { name: 'audit_logs', description: 'Audits security logs' },
    ],
    status: 'idle',
    config: DEFAULT_CONFIG,
  },
  performance: {
    id: 'agent-performance',
    type: 'performance',
    name: 'Performance Agent',
    description: 'Monitors API performance, optimizes database queries, improves page load speeds',
    capabilities: [
      { name: 'profile_api', description: 'Profiles API performance' },
      { name: 'optimize_queries', description: 'Optimizes slow queries' },
      { name: 'cache_optimization', description: 'Optimizes caching' },
      { name: 'scale_infrastructure', description: 'Scales infrastructure' },
    ],
    status: 'idle',
    config: DEFAULT_CONFIG,
  },
  analytics: {
    id: 'agent-analytics',
    type: 'analytics',
    name: 'Analytics Agent',
    description: 'Collects platform data, generates insights, improves AI learning algorithms',
    capabilities: [
      { name: 'collect_metrics', description: 'Collects platform metrics' },
      { name: 'generate_insights', description: 'Generates insights' },
      { name: 'track_user_behavior', description: 'Tracks user behavior' },
      { name: 'report_kpis', description: 'Reports KPIs' },
    ],
    status: 'idle',
    config: DEFAULT_CONFIG,
  },
  growth: {
    id: 'agent-growth',
    type: 'growth',
    name: 'Growth Engineering Agent',
    description: 'Marketing automation, SEO optimization, AI advertising campaigns',
    capabilities: [
      { name: 'optimize_seo', description: 'Optimizes SEO' },
      { name: 'run_campaigns', description: 'Runs marketing campaigns' },
      { name: 'optimize_funnel', description: 'Optimizes sales funnels' },
      { name: 'track_conversion', description: 'Tracks conversion rates' },
    ],
    status: 'idle',
    config: DEFAULT_CONFIG,
  },
};

export class AgentRegistry {
  private agents: Map<AgentType, Agent> = new Map();

  constructor() {
    Object.entries(AGENT_DEFINITIONS).forEach(([type, definition]) => {
      const agent: Agent = {
        ...definition,
        health: {
          status: 'healthy',
          lastCheck: new Date().toISOString(),
          metrics: {
            tasksCompleted: 0,
            tasksFailed: 0,
            averageExecutionTime: 0,
            uptime: 100,
          },
        },
        config: definition.config,
      };
      this.agents.set(type as AgentType, agent);
    });
  }

  getAgent(type: AgentType): Agent | undefined {
    return this.agents.get(type);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  updateAgentStatus(type: AgentType, status: Agent['status']): void {
    const agent = this.agents.get(type);
    if (agent) {
      agent.status = status;
    }
  }

  updateAgentHealth(type: AgentType, health: Partial<AgentHealth>): void {
    const agent = this.agents.get(type);
    if (agent) {
      agent.health = { ...agent.health, ...health };
    }
  }

  recordTaskCompletion(type: AgentType, success: boolean, duration: number): void {
    const agent = this.agents.get(type);
    if (agent) {
      agent.health.metrics.tasksCompleted++;
      if (!success) {
        agent.health.metrics.tasksFailed++;
      }
      const totalTasks = agent.health.metrics.tasksCompleted + agent.health.metrics.tasksFailed;
      agent.health.metrics.averageExecutionTime = 
        ((agent.health.metrics.averageExecutionTime * (totalTasks - 1)) + duration) / totalTasks;
      agent.health.lastCheck = new Date().toISOString();
    }
  }
}

export const agentRegistry = new AgentRegistry();
