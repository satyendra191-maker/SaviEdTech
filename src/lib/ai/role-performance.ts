import { createServerSupabaseClient } from '@/lib/supabase';

export interface RolePerformanceMetrics {
  aiGeneratedContentCount: number;
  aiVideoMinutes: number;
  dppGeneratedCount: number;
  lecturesDelivered: number;
  studentsEngaged: number;
  avgEngagementScore: number;
  performanceScore: number;
}

export interface RolePerformanceRecord {
  id?: string;
  roleType: 'faculty' | 'student' | 'parent' | 'admin' | 'ai_tutor';
  entityId: string;
  periodStart: Date;
  periodEnd: Date;
  metrics: RolePerformanceMetrics;
  notes?: string;
  createdAt?: string;
}

export async function trackRolePerformance(
  roleType: RolePerformanceRecord['roleType'],
  entityId: string,
  metrics: Partial<RolePerformanceMetrics>
): Promise<string> {
  const supabase = createServerSupabaseClient() as any;
  
  const { data, error } = await supabase
    .from('ai_role_performance')
    .insert({
      role_type: roleType,
      entity_id: entityId,
      period_start: new Date().toISOString().split('T')[0],
      period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      metrics: metrics,
      ai_generated_content_count: metrics.aiGeneratedContentCount || 0,
      ai_video_minutes: metrics.aiVideoMinutes || 0,
      dpp_generated_count: metrics.dppGeneratedCount || 0,
      lectures_delivered: metrics.lecturesDelivered || 0,
      students_engaged: metrics.studentsEngaged || 0,
      avg_engagement_score: metrics.avgEngagementScore || 0,
      performance_score: metrics.performanceScore || 0,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data?.id;
}

export async function getRolePerformance(
  roleType: RolePerformanceRecord['roleType'],
  entityId: string,
  periodStart?: Date,
  periodEnd?: Date
): Promise<RolePerformanceRecord[]> {
  const supabase = createServerSupabaseClient() as any;
  
  let query = supabase
    .from('ai_role_performance')
    .select('*')
    .eq('role_type', roleType)
    .eq('entity_id', entityId)
    .order('period_start', { ascending: false });

  if (periodStart) {
    query = query.gte('period_start', periodStart.toISOString().split('T')[0]);
  }
  if (periodEnd) {
    query = query.lte('period_end', periodEnd.toISOString().split('T')[0]);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((item: any) => ({
    id: item.id,
    roleType: item.role_type,
    entityId: item.entity_id,
    periodStart: new Date(item.period_start),
    periodEnd: new Date(item.period_end),
    metrics: item.metrics,
    notes: item.notes,
    createdAt: item.created_at,
  }));
}

export async function getRolePerformanceSummary(
  roleType: RolePerformanceRecord['roleType']
): Promise<{
  totalEntities: number;
  averageScore: number;
  topPerformers: Array<{ entityId: string; score: number }>;
  totalContentGenerated: number;
  totalVideosMinutes: number;
  totalDPPGenerated: number;
}> {
  const supabase = createServerSupabaseClient() as any;
  
  const { data, error } = await supabase
    .from('ai_role_performance')
    .select('entity_id, performance_score, ai_generated_content_count, ai_video_minutes, dpp_generated_count')
    .eq('role_type', roleType)
    .order('performance_score', { ascending: false })
    .limit(10);

  if (error) throw error;

  const records = data || [];
  const totalEntities = new Set(records.map((r: any) => r.entity_id)).size;
  const averageScore = records.reduce((sum: number, r: any) => sum + (r.performance_score || 0), 0) / (records.length || 1);
  const totalContentGenerated = records.reduce((sum: number, r: any) => sum + (r.ai_generated_content_count || 0), 0);
  const totalVideosMinutes = records.reduce((sum: number, r: any) => sum + (r.ai_video_minutes || 0), 0);
  const totalDPPGenerated = records.reduce((sum: number, r: any) => sum + (r.dpp_generated_count || 0), 0);

  return {
    totalEntities,
    averageScore: Math.round(averageScore * 100) / 100,
    topPerformers: records.slice(0, 10).map((r: any) => ({
      entityId: r.entity_id,
      score: r.performance_score,
    })),
    totalContentGenerated,
    totalVideosMinutes,
    totalDPPGenerated,
  };
}

export async function updateRolePerformance(
  recordId: string,
  updates: Partial<RolePerformanceMetrics>
): Promise<void> {
  const supabase = createServerSupabaseClient() as any;
  
  const { error } = await supabase
    .from('ai_role_performance')
    .update({
      metrics: updates,
      ai_generated_content_count: updates.aiGeneratedContentCount,
      ai_video_minutes: updates.aiVideoMinutes,
      dpp_generated_count: updates.dppGeneratedCount,
      lectures_delivered: updates.lecturesDelivered,
      students_engaged: updates.studentsEngaged,
      avg_engagement_score: updates.avgEngagementScore,
      performance_score: updates.performanceScore,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recordId);

  if (error) throw error;
}

export async function incrementAIGeneratedContent(
  roleType: RolePerformanceRecord['roleType'],
  entityId: string,
  contentType: 'video' | 'dpp' | 'lecture' | 'notes',
  value: number = 1
): Promise<void> {
  const supabase = createServerSupabaseClient() as any;
  
  const existing = await supabase
    .from('ai_role_performance')
    .select('id, ai_generated_content_count, dpp_generated_count')
    .eq('role_type', roleType)
    .eq('entity_id', entityId)
    .gte('period_end', new Date().toISOString().split('T')[0])
    .single();

  if (existing.data) {
    const updateFields: any = {
      ai_generated_content_count: (existing.data.ai_generated_content_count || 0) + value,
    };
    
    if (contentType === 'dpp') {
      updateFields.dpp_generated_count = (existing.data.dpp_generated_count || 0) + value;
    }

    await supabase
      .from('ai_role_performance')
      .update(updateFields)
      .eq('id', existing.data.id);
  } else {
    const insertFields: any = {
      role_type: roleType,
      entity_id: entityId,
      period_start: new Date().toISOString().split('T')[0],
      period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ai_generated_content_count: value,
      performance_score: 50,
    };

    if (contentType === 'dpp') {
      insertFields.dpp_generated_count = value;
    }

    await supabase
      .from('ai_role_performance')
      .insert(insertFields);
  }
}
