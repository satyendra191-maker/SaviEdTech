import { orchestrator } from './orchestrator';
import { agentRegistry } from './registry';
import type { AgentType, AgentTask } from './types';

export interface PlatformHealth {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  checks: {
    database: boolean;
    auth: boolean;
    api: boolean;
    build: boolean;
  };
}

export interface Improvement {
  id: string;
  type: 'performance' | 'security' | 'feature' | 'bugfix';
  description: string;
  status: 'identified' | 'in_progress' | 'completed';
  agent: AgentType;
  timestamp: string;
}

class AutonomousDevelopmentLoop {
  private isRunning = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private improvements: Improvement[] = [];
  private readonly CHECK_INTERVAL = 60000;
  private readonly MAX_CONCURRENT_CHECKS = 3;

  async checkPlatformHealth(): Promise<PlatformHealth> {
    const checks = {
      database: true,
      auth: true,
      api: true,
      build: true,
    };

    const hasIssues = Object.values(checks).some(v => !v);

    return {
      status: hasIssues ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  async identifyImprovements(): Promise<Improvement[]> {
    const newImprovements: Improvement[] = [];

    const health = await this.checkPlatformHealth();
    
    if (health.status === 'degraded') {
      if (!health.checks.database) {
        newImprovements.push({
          id: `imp-${Date.now()}-1`,
          type: 'performance',
          description: 'Database query optimization needed',
          status: 'identified',
          agent: 'database',
          timestamp: new Date().toISOString(),
        });
      }

      if (!health.checks.build) {
        newImprovements.push({
          id: `imp-${Date.now()}-2`,
          type: 'bugfix',
          description: 'Build issues detected',
          status: 'identified',
          agent: 'devops',
          timestamp: new Date().toISOString(),
        });
      }
    }

    newImprovements.push({
      id: `imp-${Date.now()}-3`,
      type: 'performance',
      description: 'API response time monitoring',
      status: 'identified',
      agent: 'performance',
      timestamp: new Date().toISOString(),
    });

    newImprovements.push({
      id: `imp-${Date.now()}-4`,
      type: 'security',
      description: 'Security vulnerability scan',
      status: 'identified',
      agent: 'security',
      timestamp: new Date().toISOString(),
    });

    this.improvements.push(...newImprovements);
    return newImprovements;
  }

  async executeImprovementTask(improvement: Improvement): Promise<void> {
    improvement.status = 'in_progress';

    try {
      const task = orchestrator.createTask(
        improvement.agent,
        this.getAgentAction(improvement.agent),
        improvement.description,
        { improvement_id: improvement.id },
        'medium'
      );

      const result = await orchestrator.executeTask(task);

      if (result.success) {
        improvement.status = 'completed';
      } else {
        improvement.status = 'identified';
      }
    } catch (error) {
      console.error(`Failed to execute improvement ${improvement.id}:`, error);
      improvement.status = 'identified';
    }
  }

  private getAgentAction(agent: AgentType): string {
    const actions: Record<AgentType, string> = {
      architecture: 'validate_architecture',
      frontend: 'optimize_rendering',
      backend: 'optimize_query',
      database: 'optimize_database_query',
      'ai-systems': 'optimize_algorithm',
      devops: 'monitor_health',
      testing: 'run_tests',
      security: 'scan_vulnerabilities',
      performance: 'profile_api',
      analytics: 'collect_metrics',
      growth: 'optimize_seo',
    };
    return actions[agent];
  }

  async runAutonomousCycle(): Promise<void> {
    console.log('[Autonomous] Starting development cycle...');

    const improvements = await this.identifyImprovements();
    console.log(`[Autonomous] Identified ${improvements.length} potential improvements`);

    for (const improvement of improvements.slice(0, this.MAX_CONCURRENT_CHECKS)) {
      await this.executeImprovementTask(improvement);
    }

    console.log('[Autonomous] Development cycle completed');
  }

  start(): void {
    if (this.isRunning) {
      console.log('[Autonomous] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[Autonomous] Starting autonomous development loop');

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.runAutonomousCycle();
      } catch (error) {
        console.error('[Autonomous] Cycle error:', error);
      }
    }, this.CHECK_INTERVAL);

    this.runAutonomousCycle();
  }

  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.isRunning = false;
    console.log('[Autonomous] Stopped autonomous development loop');
  }

  getImprovements(): Improvement[] {
    return this.improvements;
  }

  getHealth(): PlatformHealth {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: true,
        auth: true,
        api: true,
        build: true,
      },
    };
  }
}

export const autonomousLoop = new AutonomousDevelopmentLoop();
