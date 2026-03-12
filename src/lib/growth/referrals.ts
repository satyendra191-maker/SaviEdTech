import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import type { 
  ReferralProgram, 
  ReferralCode, 
  ReferralRedemption 
} from '@/types/business';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function generateReferralCode(): string {
  return `REF-${uuidv4().slice(0, 8).toUpperCase()}`;
}

export const referralService = {
  async createProgram(programData: Partial<ReferralProgram>): Promise<ReferralProgram> {
    const { data, error } = await supabase
      .from('referral_programs')
      .insert(programData)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  async getActiveProgram(): Promise<ReferralProgram | null> {
    const { data, error } = await supabase
      .from('referral_programs')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', new Date().toISOString())
      .or('ends_at.is.null,ends_at.gte.' + new Date().toISOString())
      .single();
    
    if (error && error.code !== 'PGR_116') throw new Error(error.message);
    return data;
  },

  async getAllPrograms(): Promise<ReferralProgram[]> {
    const { data, error } = await supabase
      .from('referral_programs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  async generateReferralCode(userId: string, programId?: string): Promise<ReferralCode> {
    const program = programId ? 
      await supabase.from('referral_programs').select('*').eq('id', programId).single() :
      await this.getActiveProgram();

    const code = generateReferralCode();
    
    const { data: existingCode } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingCode) {
      return existingCode;
    }

    const { data, error } = await supabase
      .from('referral_codes')
      .insert({
        user_id: userId,
        code,
        program_id: program?.data?.id,
        is_active: true
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  async getUserReferralCode(userId: string): Promise<ReferralCode | null> {
    const { data, error } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGR_116') throw new Error(error.message);
    return data;
  },

  async validateReferralCode(code: string): Promise<{
    valid: boolean;
    code?: ReferralCode;
    program?: ReferralProgram;
  }> {
    const { data: referralCode, error } = await supabase
      .from('referral_codes')
      .select('*, program:referral_programs(*)')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !referralCode) {
      return { valid: false };
    }

    if (referralCode.program) {
      const program = referralCode.program as unknown as ReferralProgram;
      const now = new Date();
      if (program.starts_at && new Date(program.starts_at) > now) return { valid: false };
      if (program.ends_at && new Date(program.ends_at) < now) return { valid: false };
      if (referralCode.used_count >= program.max_rewards_per_user) return { valid: false };
    }

    return { valid: true, code: referralCode, program: referralCode.program as unknown as ReferralProgram };
  },

  async redeemReferral(
    referrerId: string, 
    refereeId: string, 
    codeId: string,
    programId: string,
    purchaseAmount?: number
  ): Promise<ReferralRedemption> {
    const { data: code, error: codeError } = await supabase
      .from('referral_codes')
      .select('*, program:referral_programs(*)')
      .eq('id', codeId)
      .single();

    if (codeError || !code) throw new Error('Invalid referral code');
    
    const program = code.program as unknown as ReferralProgram;

    if (program.min_purchase_amount && purchaseAmount && purchaseAmount < program.min_purchase_amount) {
      throw new Error(`Minimum purchase amount of ${program.min_purchase_amount} required`);
    }

    const redemption = {
      referrer_id: referrerId,
      referee_id: refereeId,
      referral_code_id: codeId,
      program_id: programId,
      reward_type: program.reward_type,
      reward_value: program.reward_value,
      reward_credit_days: program.reward_credit_days,
      purchase_amount: purchaseAmount,
      status: 'completed',
      redeemed_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('referral_redemptions')
      .insert(redemption)
      .select()
      .single();
    
    if (error) throw new Error(error.message);

    await supabase
      .from('referral_codes')
      .update({
        used_count: (code.used_count || 0) + 1,
        total_rewards_given: (code.total_rewards_given || 0) + program.reward_value
      })
      .eq('id', codeId);

    if (program.reward_type === 'credit' && program.reward_credit_days) {
      await supabase
        .from('enrollments')
        .insert({
          user_id: refereeId,
          course_id: null,
          expiry_date: new Date(Date.now() + program.reward_credit_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
    }

    return data;
  },

  async getReferrerStats(userId: string): Promise<{
    totalReferrals: number;
    successfulReferrals: number;
    totalRewardsGiven: number;
    activeCode: ReferralCode | null;
  }> {
    const { data: code } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!code) {
      return { totalReferrals: 0, successfulReferrals: 0, totalRewardsGiven: 0, activeCode: null };
    }

    const { data: redemptions } = await supabase
      .from('referral_redemptions')
      .select('*')
      .eq('referrer_id', userId)
      .eq('status', 'completed');

    return {
      totalReferrals: code.used_count || 0,
      successfulReferrals: redemptions?.length || 0,
      totalRewardsGiven: code.total_rewards_given || 0,
      activeCode: code
    };
  },

  async getLeaderboard(limit = 10): Promise<Array<{
    user: { name: string; avatar_url?: string };
    referrals: number;
    rewards: number;
  }>> {
    const { data, error } = await supabase
      .from('referral_codes')
      .select(`
        user_id,
        used_count,
        total_rewards_given,
        user:profiles(name, avatar_url)
      `)
      .order('used_count', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    
    return (data || []).map((item: any) => ({
      user: item.user,
      referrals: item.used_count || 0,
      rewards: item.total_rewards_given || 0
    }));
  }
};

export default referralService;
