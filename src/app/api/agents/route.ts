import { NextRequest, NextResponse } from 'next/server';
import { orchestrator } from '@/agents/orchestrator';
import { agentRegistry } from '@/agents/registry';
import type { AgentType } from '@/agents/types';

export const dynamic = 'force-dynamic';

const ALLOWED_ACTIONS: Record<AgentType, string[]> = {
  architecture: ['validate_architecture', 'check_modularity', 'verify_patterns', 'assess_scalability'],
  frontend: ['build_component', 'fix_styles', 'optimize_rendering', 'improve_ux'],
  backend: ['create_api', 'fix_bug', 'optimize_query', 'secure_endpoint'],
  database: ['create_table', 'add_index', 'optimize_database_query', 'migrate_schema'],
  'ai-systems': ['train_model', 'optimize_algorithm', 'improve_recommendations', 'maintain_tutor'],
  devops: ['deploy', 'run_build', 'configure_cicd', 'monitor_health'],
  testing: ['run_tests', 'detect_regression', 'validate_ui', 'coverage_check'],
  security: ['scan_vulnerabilities', 'validate_auth', 'detect_fraud', 'audit_logs'],
  performance: ['profile_api', 'optimize_queries', 'cache_optimization', 'scale_infrastructure'],
  analytics: ['collect_metrics', 'generate_insights', 'track_user_behavior', 'report_kpis'],
  growth: ['optimize_seo', 'run_campaigns', 'optimize_funnel', 'track_conversion'],
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const agentType = searchParams.get('agent') as AgentType | null;

  if (action === 'health') {
    const agents = agentRegistry.getAllAgents();
    return NextResponse.json({
      success: true,
      agents: agents.map(a => ({
        id: a.id,
        type: a.type,
        name: a.name,
        status: a.status,
        health: a.health,
      })),
      running: orchestrator.getRunningTasks().length,
      results_stored: orchestrator.getAllResults().length,
    });
  }

  if (action === 'results') {
    const results = orchestrator.getAllResults().slice(-20);
    return NextResponse.json({
      success: true,
      results,
    });
  }

  if (action === 'agents') {
    const agents = agentRegistry.getAllAgents();
    return NextResponse.json({
      success: true,
      agents: agents.map(a => ({
        type: a.type,
        name: a.name,
        description: a.description,
        capabilities: a.capabilities,
        status: a.status,
        health: a.health,
      })),
    });
  }

  return NextResponse.json({
    success: true,
    message: 'SaviEduTech Autonomous Agent System',
    endpoints: {
      GET: {
        '?action=health': 'Get all agent health status',
        '?action=results': 'Get recent task results',
        '?action=agents': 'Get all agents and capabilities',
      },
      POST: {
        '?action=execute': 'Execute a task on an agent',
      },
    },
    agents: Object.keys(ALLOWED_ACTIONS),
  });
}

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action !== 'execute') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const body = await request.json();
    const { agent: agentType, task: taskAction, description, input = {}, priority = 'medium' } = body;

    if (!agentType || !taskAction) {
      return NextResponse.json(
        { error: 'Missing required fields: agent, task' },
        { status: 400 }
      );
    }

    if (!ALLOWED_ACTIONS[agentType as AgentType]) {
      return NextResponse.json(
        { error: `Invalid agent type: ${agentType}` },
        { status: 400 }
      );
    }

    if (!ALLOWED_ACTIONS[agentType as AgentType].includes(taskAction)) {
      return NextResponse.json(
        { error: `Invalid task ${taskAction} for agent ${agentType}` },
        { status: 400 }
      );
    }

    const task = orchestrator.createTask(
      agentType as AgentType,
      taskAction,
      description || `Execute ${taskAction} on ${agentType}`,
      input,
      priority
    );

    const result = await orchestrator.executeTask(task);

    return NextResponse.json({
      success: result.success,
      task_id: result.taskId,
      agent_id: result.agentId,
      output: result.output,
      error: result.error,
      duration: result.duration,
    });
  } catch (error) {
    console.error('Agent execution error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
