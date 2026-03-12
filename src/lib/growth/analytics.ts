import { createClient } from '@supabase/supabase-js';
import type { 
  GrowthMetric, 
  GrowthMetricType,
  CohortAnalytics,
  ConversionFunnel 
} from '@/types/business';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const growthService = {
  async recordMetric(
    metricType: GrowthMetricType, 
    value: number,
    metricDate?: string
  ): Promise<GrowthMetric> {
    const date = metricDate || new Date().toISOString().split('T')[0];
    
    const { data: prevMetric } = await supabase
      .from('growth_metrics')
      .select('value')
      .eq('metric_type', metricType)
      .lte('metric_date', date)
      .order('metric_date', { ascending: false })
      .limit(1)
      .single();

    const changePercentage = prevMetric ? 
      ((value - prevMetric.value) / prevMetric.value) * 100 : 0;

    const { data, error } = await supabase
      .from('growth_metrics')
      .insert({
        metric_date: date,
        metric_type: metricType,
        value,
        previous_value: prevMetric?.value,
        change_percentage: changePercentage
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  async getMetrics(
    metricType: GrowthMetricType,
    fromDate?: string,
    toDate?: string,
    limit = 30
  ): Promise<GrowthMetric[]> {
    let query = supabase
      .from('growth_metrics')
      .select('*')
      .eq('metric_type', metricType)
      .order('metric_date', { ascending: false })
      .limit(limit);

    if (fromDate) query = query.gte('metric_date', fromDate);
    if (toDate) query = query.lte('metric_date', toDate);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  },

  async calculateGrowthRate(metricType: GrowthMetricType, days = 30): Promise<{
    current: number;
    previous: number;
    growthRate: number;
    trend: 'up' | 'down' | 'stable';
  }> {
    const now = new Date();
    const currentFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousFrom = new Date(currentFrom.getTime() - days * 24 * 60 * 60 * 1000);

    const currentData = await this.getMetrics(
      metricType, 
      currentFrom.toISOString().split('T')[0], 
      now.toISOString().split('T')[0],
      100
    );

    const previousData = await this.getMetrics(
      metricType,
      previousFrom.toISOString().split('T')[0],
      currentFrom.toISOString().split('T')[0],
      100
    );

    const current = currentData.reduce((sum, m) => sum + m.value, 0);
    const previous = previousData.reduce((sum, m) => sum + m.value, 0);
    const growthRate = previous > 0 ? ((current - previous) / previous) * 100 : 0;

    return {
      current,
      previous,
      growthRate,
      trend: growthRate > 5 ? 'up' : growthRate < -5 ? 'down' : 'stable'
    };
  },

  async getConversionFunnel(funnelName: string): Promise<ConversionFunnel[]> {
    const { data, error } = await supabase
      .from('conversion_funnel')
      .select('*')
      .eq('funnel_name', funnelName)
      .order('stage_order');
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  async trackFunnelStage(
    funnelName: string,
    stage: string,
    stageOrder: number,
    usersCount: number
  ): Promise<ConversionFunnel> {
    const existing = await supabase
      .from('conversion_funnel')
      .select('users_count')
      .eq('funnel_name', funnelName)
      .eq('stage', stage)
      .single();

    const conversionRate = existing.data ? 
      (usersCount / existing.data.users_count) * 100 : 100;

    const { data, error } = await supabase
      .from('conversion_funnel')
      .upsert({
        funnel_name: funnelName,
        stage,
        stage_order: stageOrder,
        users_count: usersCount,
        conversion_rate: conversionRate,
        recorded_at: new Date().toISOString()
      }, { onConflict: 'funnel_name,stage' })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  async getCohortAnalytics(
    cohortType: 'daily' | 'weekly' | 'monthly',
    fromDate?: string,
    limit = 12
  ): Promise<CohortAnalytics[]> {
    let query = supabase
      .from('cohort_analytics')
      .select('*')
      .eq('cohort_type', cohortType)
      .order('cohort_date', { ascending: false })
      .limit(limit);

    if (fromDate) query = query.gte('cohort_date', fromDate);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  },

  async calculateRetention(
    cohortDate: string,
    cohortType: 'daily' | 'weekly' | 'monthly'
  ): Promise<CohortAnalytics> {
    const { data: users } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', cohortDate);

    const cohortTotal = users?.length || 0;
    
    const retentionDays = cohortType === 'daily' ? 1 : cohortType === 'weekly' ? 7 : 30;
    const retentionDate = new Date(cohortDate);
    retentionDate.setDate(retentionDate.getDate() + retentionDays);

    const { data: activeUsers } = await supabase
      .from('user_activity_log')
      .select('user_id')
      .gte('last_activity', retentionDate.toISOString());

    const retained = activeUsers?.length || 0;
    const retentionRate = cohortTotal > 0 ? (retained / cohortTotal) * 100 : 0;

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('id')
      .gte('enrolled_at', cohortDate);

    const revenue = (enrollments?.length || 0) * 500;

    const { data, error } = await supabase
      .from('cohort_analytics')
      .upsert({
        cohort_date: cohortDate,
        cohort_type: cohortType,
        total_users: cohortTotal,
        active_users: retained,
        retained_users: retained,
        retention_rate: retentionRate,
        revenue
      }, { onConflict: 'cohort_date,cohort_type' })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  async getDashboardSummary(): Promise<{
    users: { total: number; growth: number };
    leads: { total: number; growth: number };
    revenue: { total: number; growth: number };
    enrollments: { total: number; growth: number };
  }> {
    const [usersGrowth, leadsGrowth, revenueGrowth, enrollmentsGrowth] = await Promise.all([
      this.calculateGrowthRate('total_users'),
      this.calculateGrowthRate('new_leads'),
      this.calculateGrowthRate('revenue'),
      this.calculateGrowthRate('course_enrollments')
    ]);

    return {
      users: { total: usersGrowth.current, growth: usersGrowth.growthRate },
      leads: { total: leadsGrowth.current, growth: leadsGrowth.growthRate },
      revenue: { total: revenueGrowth.current, growth: revenueGrowth.growthRate },
      enrollments: { total: enrollmentsGrowth.current, growth: enrollmentsGrowth.growthRate }
    };
  },

  async getTopPerformers(limit = 10): Promise<Array<{
    user: { name: string; avatar_url?: string };
    metric: string;
    value: number;
  }>> {
    const topEnrollers = await supabase
      .from('profiles')
      .select('id, name, avatar_url, total_quizzes_taken')
      .order('total_quizzes_taken', { ascending: false })
      .limit(limit);

    return (topEnrollers.data || []).map(user => ({
      user: { name: user.name || 'Unknown', avatar_url: user.avatar_url },
      metric: 'quizzes_completed',
      value: user.total_quizzes_taken || 0
    }));
  }
};

export default growthService;
