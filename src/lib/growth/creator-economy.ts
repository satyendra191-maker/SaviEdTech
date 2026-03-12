import { createClient } from '@supabase/supabase-js';
import type { 
  InstructorProfile, 
  InstructorPayout,
  CourseSale 
} from '@/types/business';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const creatorService = {
  async applyAsInstructor(
    userId: string, 
    data: {
      bio?: string;
      expertise?: string[];
      qualifications?: string;
      years_experience?: number;
    }
  ): Promise<InstructorProfile> {
    const existing = await supabase
      .from('instructor_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existing.data) {
      throw new Error('You have already applied as an instructor');
    }

    const { data: profile, error } = await supabase
      .from('instructor_profiles')
      .insert({
        user_id: userId,
        bio: data.bio,
        expertise: data.expertise,
        qualifications: data.qualifications,
        years_experience: data.years_experience,
        status: 'pending',
        revenue_share_percentage: 70.00,
        payout_threshold: 1000
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return profile;
  },

  async getInstructorProfile(userId: string): Promise<InstructorProfile | null> {
    const { data, error } = await supabase
      .from('instructor_profiles')
      .select(`
        *,
        user:profiles(name, email, avatar_url)
      `)
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGR_116') throw new Error(error.message);
    return data;
  },

  async approveInstructor(instructorId: string): Promise<InstructorProfile> {
    const { data, error } = await supabase
      .from('instructor_profiles')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', instructorId)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  async rejectInstructor(instructorId: string): Promise<InstructorProfile> {
    const { data, error } = await supabase
      .from('instructor_profiles')
      .update({ status: 'rejected' })
      .eq('id', instructorId)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  async updateInstructorProfile(
    instructorId: string, 
    updates: Partial<InstructorProfile>
  ): Promise<InstructorProfile> {
    const { data, error } = await supabase
      .from('instructor_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', instructorId)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  async recordCourseSale(
    courseId: string,
    instructorId: string,
    buyerId: string,
    amount: number
  ): Promise<CourseSale> {
    const { data: instructor } = await supabase
      .from('instructor_profiles')
      .select('revenue_share_percentage, pending_payout, total_earnings')
      .eq('id', instructorId)
      .single();

    const revenueShare = instructor?.revenue_share_percentage || 70;
    const platformFee = amount * (1 - revenueShare / 100);
    const instructorEarnings = amount - platformFee;

    const { data: sale, error } = await supabase
      .from('course_sales')
      .insert({
        course_id: courseId,
        instructor_id: instructorId,
        buyer_id: buyerId,
        amount,
        platform_fee: platformFee,
        instructor_earnings: instructorEarnings,
        sale_date: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);

    await supabase
      .from('instructor_profiles')
      .update({
        pending_payout: (instructor?.pending_payout || 0) + instructorEarnings,
        total_earnings: (instructor?.total_earnings || 0) + instructorEarnings
      })
      .eq('id', instructorId);

    return sale;
  },

  async getInstructorEarnings(
    instructorId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<{
    totalSales: number;
    totalEarnings: number;
    platformFees: number;
    sales: CourseSale[];
  }> {
    let query = supabase
      .from('course_sales')
      .select('*, course:courses(title)')
      .eq('instructor_id', instructorId)
      .order('sale_date', { ascending: false });

    if (fromDate) query = query.gte('sale_date', fromDate);
    if (toDate) query = query.lte('sale_date', toDate);

    const { data: sales, error } = await query;
    if (error) throw new Error(error.message);

    const totals = (sales || []).reduce(
      (acc, sale) => ({
        totalSales: acc.totalSales + (sale.amount || 0),
        totalEarnings: acc.totalEarnings + (sale.instructor_earnings || 0),
        platformFees: acc.platformFees + (sale.platform_fee || 0)
      }),
      { totalSales: 0, totalEarnings: 0, platformFees: 0 }
    );

    return { totalSales: totals.totalSales, totalEarnings: totals.totalEarnings, platformFees: totals.platformFees, sales: sales || [] };
  },

  async requestPayout(instructorId: string): Promise<InstructorPayout> {
    const { data: instructor } = await supabase
      .from('instructor_profiles')
      .select('*')
      .eq('id', instructorId)
      .single();

    if (!instructor) throw new Error('Instructor not found');
    if (instructor.pending_payout < instructor.payout_threshold) {
      throw new Error(`Minimum payout threshold is ${instructor.payout_threshold}`);
    }

    const { data: payout, error } = await supabase
      .from('instructor_payouts')
      .insert({
        instructor_id: instructorId,
        amount: instructor.pending_payout,
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);

    await supabase
      .from('instructor_profiles')
      .update({
        pending_payout: 0,
        paid_earnings: (instructor.paid_earnings || 0) + instructor.pending_payout
      })
      .eq('id', instructorId);

    return payout;
  },

  async getInstructorPayouts(instructorId: string): Promise<InstructorPayout[]> {
    const { data, error } = await supabase
      .from('instructor_payouts')
      .select('*')
      .eq('instructor_id', instructorId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getAllInstructors(filters?: { status?: string }): Promise<InstructorProfile[]> {
    let query = supabase
      .from('instructor_profiles')
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

  async getTopInstructors(limit = 10): Promise<InstructorProfile[]> {
    const { data, error } = await supabase
      .from('instructor_profiles')
      .select(`
        *,
        user:profiles(name, email, avatar_url)
      `)
      .eq('status', 'approved')
      .order('total_earnings', { ascending: false })
      .limit(limit);
    
    if (error) throw new Error(error.message);
    return data || [];
  }
};

export default creatorService;
