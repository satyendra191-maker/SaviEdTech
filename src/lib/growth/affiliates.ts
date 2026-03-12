import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import type { Affiliate, AffiliateLink, AffiliateCommission } from '@/types/business';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function generateAffiliateToken(): string {
  return `AFF-${uuidv4().slice(0, 12).toLowerCase()}`;
}

export const affiliateService = {
  async applyAsAffiliate(userId: string): Promise<Affiliate> {
    const existing = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existing.data) {
      return existing.data;
    }

    const { data, error } = await supabase
      .from('affiliates')
      .insert({
        user_id: userId,
        status: 'pending',
        commission_rate: 10.00
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  async getAffiliate(userId: string): Promise<Affiliate | null> {
    const { data, error } = await supabase
      .from('affiliates')
      .select(`
        *,
        user:profiles(name, email)
      `)
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGR_116') throw new Error(error.message);
    return data;
  },

  async approveAffiliate(affiliateId: string, commissionRate = 10): Promise<Affiliate> {
    const { data, error } = await supabase
      .from('affiliates')
      .update({
        status: 'approved',
        commission_rate: commissionRate,
        approved_at: new Date().toISOString()
      })
      .eq('id', affiliateId)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  async rejectAffiliate(affiliateId: string): Promise<Affiliate> {
    const { data, error } = await supabase
      .from('affiliates')
      .update({ status: 'rejected' })
      .eq('id', affiliateId)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  async createAffiliateLink(
    affiliateId: string, 
    courseId?: string,
    destinationUrl?: string
  ): Promise<AffiliateLink> {
    const token = generateAffiliateToken();
    
    let destination = destinationUrl;
    if (!destination && courseId) {
      destination = `${process.env.NEXT_PUBLIC_BASE_URL}/courses/${courseId}?ref=${token}`;
    }

    const { data: existingLink } = await supabase
      .from('affiliate_links')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .eq('course_id', courseId || null)
      .maybeSingle();

    if (existingLink) return existingLink;

    const { data, error } = await supabase
      .from('affiliate_links')
      .insert({
        affiliate_id: affiliateId,
        course_id: courseId,
        link_token: token,
        destination_url: destination,
        is_active: true
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  async getAffiliateLinks(affiliateId: string): Promise<AffiliateLink[]> {
    const { data, error } = await supabase
      .from('affiliate_links')
      .select('*, course:courses(title, price)')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getAffiliateLinkByToken(token: string): Promise<AffiliateLink | null> {
    const { data, error } = await supabase
      .from('affiliate_links')
      .select(`
        *,
        affiliate:affiliates(*),
        course:courses(title, price)
      `)
      .eq('link_token', token)
      .eq('is_active', true)
      .single();
    
    if (error && error.code !== 'PGR_116') throw new Error(error.message);
    return data;
  },

  async trackClick(token: string): Promise<void> {
    const link = await this.getAffiliateLinkByToken(token);
    if (!link) return;

    await supabase
      .from('affiliate_links')
      .update({ clicks: (link.clicks || 0) + 1 })
      .eq('id', link.id);
  },

  async recordConversion(
    token: string,
    userId: string,
    courseId: string,
    saleAmount: number
  ): Promise<AffiliateCommission> {
    const link = await this.getAffiliateLinkByToken(token);
    if (!link || !link.affiliate) {
      throw new Error('Invalid affiliate link');
    }

    const affiliate = link.affiliate as unknown as Affiliate;
    const commissionAmount = (saleAmount * (affiliate.commission_rate || 10)) / 100;

    const { data, error } = await supabase
      .from('affiliate_commissions')
      .insert({
        affiliate_id: affiliate.id,
        link_id: link.id,
        user_id: userId,
        course_id: courseId,
        sale_amount: saleAmount,
        commission_rate: affiliate.commission_rate,
        commission_amount: commissionAmount,
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);

    await supabase
      .from('affiliate_links')
      .update({
        conversions: (link.conversions || 0) + 1,
        earnings: (link.earnings || 0) + commissionAmount
      })
      .eq('id', link.id);

    await supabase
      .from('affiliates')
      .update({
        pending_earnings: (affiliate.pending_earnings || 0) + commissionAmount
      })
      .eq('id', affiliate.id);

    return data;
  },

  async approveCommission(commissionId: string): Promise<AffiliateCommission> {
    const { data: commission, error: fetchError } = await supabase
      .from('affiliate_commissions')
      .select('*, affiliate:affiliates(*)')
      .eq('id', commissionId)
      .single();

    if (fetchError || !commission) throw new Error('Commission not found');
    
    const affiliate = commission.affiliate as unknown as Affiliate;

    const { data, error } = await supabase
      .from('affiliate_commissions')
      .update({ status: 'approved' })
      .eq('id', commissionId)
      .select()
      .single();
    
    if (error) throw new Error(error.message);

    await supabase
      .from('affiliates')
      .update({
        pending_earnings: (affiliate.pending_earnings || 0) - (commission.commission_amount || 0),
        total_earnings: (affiliate.total_earnings || 0) + (commission.commission_amount || 0)
      })
      .eq('id', affiliate.id);

    return data;
  },

  async getAffiliateStats(affiliateId: string): Promise<{
    totalClicks: number;
    totalConversions: number;
    totalEarnings: number;
    pendingEarnings: number;
    paidEarnings: number;
  }> {
    const { data: links } = await supabase
      .from('affiliate_links')
      .select('clicks, conversions, earnings')
      .eq('affiliate_id', affiliateId);

    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('total_earnings, pending_earnings, paid_earnings')
      .eq('id', affiliateId)
      .single();

    const totals = (links || []).reduce(
      (acc, link) => ({
        clicks: acc.clicks + (link.clicks || 0),
        conversions: acc.conversions + (link.conversions || 0),
        earnings: acc.earnings + (link.earnings || 0)
      }),
      { clicks: 0, conversions: 0, earnings: 0 }
    );

    return {
      totalClicks: totals.clicks,
      totalConversions: totals.conversions,
      totalEarnings: totals.earnings,
      pendingEarnings: affiliate?.pending_earnings || 0,
      paidEarnings: affiliate?.paid_earnings || 0
    };
  },

  async getAllAffiliates(filters?: { status?: string }): Promise<Affiliate[]> {
    let query = supabase
      .from('affiliates')
      .select(`
        *,
        user:profiles(name, email, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getAllCommissions(affiliateId?: string): Promise<AffiliateCommission[]> {
    let query = supabase
      .from('affiliate_commissions')
      .select(`
        *,
        affiliate:affiliates(user:profiles(name, email)),
        course:courses(title)
      `)
      .order('created_at', { ascending: false });

    if (affiliateId) query = query.eq('affiliate_id', affiliateId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }
};

export default affiliateService;
