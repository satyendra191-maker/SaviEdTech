import { createClient } from '@supabase/supabase-js';
import type { 
  Lead, 
  LeadActivity, 
  LeadScoring, 
  CrmStage,
  LeadStatus,
  LeadSource 
} from '@/types/business';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const crmService = {
  async createLead(leadData: Partial<Lead>): Promise<Lead> {
    const { data, error } = await supabase
      .from('leads')
      .insert(leadData)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  async getLeads(filters?: {
    status?: LeadStatus;
    source?: LeadSource;
    assigned_to?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<Lead[]> {
    let query = supabase
      .from('leads')
      .select(`
        *,
        interested_course:courses(title),
        assignee:profiles!leads_assigned_to_fkey(name, email)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.source) query = query.eq('source', filters.source);
    if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
    if (filters?.from_date) query = query.gte('created_at', filters.from_date);
    if (filters?.to_date) query = query.lte('created_at', filters.to_date);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  },

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    const { data, error } = await supabase
      .from('leads')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  async assignLead(leadId: string, userId: string): Promise<Lead> {
    return this.updateLead(leadId, { assigned_to: userId });
  },

  async convertLead(leadId: string, userId: string): Promise<Lead> {
    const { data, error } = await supabase
      .from('leads')
      .update({ 
        status: 'won', 
        converted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    await this.logActivity(leadId, 'conversion', 'Lead converted to paying student', { user_id: userId });
    return data;
  },

  async logActivity(
    leadId: string, 
    activityType: LeadActivity['activity_type'], 
    description?: string,
    metadata?: Record<string, unknown>
  ): Promise<LeadActivity> {
    const { data, error } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        activity_type: activityType,
        description,
        metadata
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  async getLeadActivities(leadId: string): Promise<LeadActivity[]> {
    const { data, error } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  async calculateLeadScore(leadId: string): Promise<LeadScoring> {
    const lead = await supabase
      .from('leads')
      .select('*, lead_activities(*)')
      .eq('id', leadId)
      .single();

    if (!lead.data) throw new Error('Lead not found');
    
    let score = 0;
    const activities = lead.data.lead_activities || [];
    const engagementLevels: Record<string, number> = {
      cold: 0,
      warm: 30,
      hot: 70
    };

    activities.forEach((activity: { activity_type: string }) => {
      switch (activity.activity_type) {
        case 'conversion': score += 50; break;
        case 'meeting': score += 20; break;
        case 'call': score += 10; break;
        case 'email': score += 5; break;
        case 'note': score += 2; break;
      }
    });

    if (lead.data.interested_course_id) score += 10;
    if (lead.data.follow_up_date) score += 5;

    const engagementLevel = score >= 70 ? 'hot' : score >= 30 ? 'warm' : 'cold';

    const { data, error } = await supabase
      .from('lead_scoring')
      .upsert({
        lead_id: leadId,
        score,
        engagement_level: engagementLevel,
        last_calculated: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async getCrmStages(): Promise<CrmStage[]> {
    const { data, error } = await supabase
      .from('crm_stages')
      .select('*')
      .order('stage_order');
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getLeadStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
    conversionRate: number;
  }> {
    const { data: leads } = await supabase.from('leads').select('status, source');
    if (!leads) return { total: 0, byStatus: {}, bySource: {}, conversionRate: 0 };

    const byStatus: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    leads.forEach((lead) => {
      byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
      bySource[lead.source] = (bySource[lead.source] || 0) + 1;
    });

    const converted = leads.filter(l => l.status === 'won').length;
    const conversionRate = leads.length > 0 ? (converted / leads.length) * 100 : 0;

    return {
      total: leads.length,
      byStatus,
      bySource,
      conversionRate
    };
  }
};

export default crmService;
