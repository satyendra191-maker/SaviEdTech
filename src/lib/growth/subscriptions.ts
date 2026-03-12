import { createClient } from '@supabase/supabase-js';
import type { 
  SubscriptionPlan, 
  UserSubscription, 
  SubscriptionPayment,
  SubscriptionTier,
  SubscriptionFeatures
} from '@/types/business';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const DEFAULT_FEATURES: SubscriptionFeatures = {
  ad_free: false,
  premium_courses: false,
  priority_ai_tutor: false,
  advanced_analytics: false,
  live_classes_access: false,
  mock_tests: 0,
  download_notes: false,
  certificate: false,
  mentor_sessions: 0
};

export const subscriptionService = {
  async createDefaultPlans(): Promise<void> {
    const plans = [
      {
        name: 'Free Plan',
        tier: 'free',
        monthly_price: 0,
        yearly_price: 0,
        features: {
          ...DEFAULT_FEATURES,
          ad_free: false,
          mock_tests: 5
        },
        is_active: true,
        sort_order: 1
      },
      {
        name: 'Pro Plan',
        tier: 'pro',
        monthly_price: 499,
        yearly_price: 4999,
        features: {
          ...DEFAULT_FEATURES,
          ad_free: true,
          premium_courses: true,
          priority_ai_tutor: true,
          advanced_analytics: true,
          live_classes_access: true,
          mock_tests: 50,
          download_notes: true,
          certificate: true,
          mentor_sessions: 1
        },
        is_active: true,
        sort_order: 2
      },
      {
        name: 'Elite Plan',
        tier: 'elite',
        monthly_price: 999,
        yearly_price: 9999,
        features: {
          ...DEFAULT_FEATURES,
          ad_free: true,
          premium_courses: true,
          priority_ai_tutor: true,
          advanced_analytics: true,
          live_classes_access: true,
          mock_tests: -1,
          download_notes: true,
          certificate: true,
          mentor_sessions: 4
        },
        is_active: true,
        sort_order: 3
      }
    ];

    for (const plan of plans) {
      const { error } = await supabase
        .from('subscription_plans')
        .upsert(plan, { onConflict: 'tier' });
      
      if (error && error.code !== '23505') {
        console.error(`Error creating plan ${plan.name}:`, error);
      }
    }
  },

  async getPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getPlanByTier(tier: SubscriptionTier): Promise<SubscriptionPlan | null> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('tier', tier)
      .eq('is_active', true)
      .single();
    
    if (error && error.code !== 'PGR_116') throw new Error(error.message);
    return data;
  },

  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();
    
    if (error && error.code !== 'PGR_116') throw new Error(error.message);
    return data;
  },

  async createSubscription(
    userId: string, 
    planId: string, 
    billingCycle: 'monthly' | 'yearly' = 'monthly'
  ): Promise<UserSubscription> {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + (billingCycle === 'yearly' ? 12 : 1));

    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        plan_id: planId,
        billing_cycle: billingCycle,
        expires_at: expiresAt.toISOString(),
        status: 'active'
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  async cancelSubscription(subscriptionId: string): Promise<UserSubscription> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        auto_renew: false,
        cancelled_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  async extendSubscription(subscriptionId: string, days: number): Promise<UserSubscription> {
    const sub = await supabase
      .from('user_subscriptions')
      .select('expires_at')
      .eq('id', subscriptionId)
      .single();

    if (!sub.data) throw new Error('Subscription not found');

    const currentExpiry = new Date(sub.data.expires_at);
    currentExpiry.setDate(currentExpiry.getDate() + days);

    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({ expires_at: currentExpiry.toISOString() })
      .eq('id', subscriptionId)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  async checkAccess(userId: string, feature: keyof SubscriptionFeatures): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription?.plan) {
      return feature === 'mock_tests' ? DEFAULT_FEATURES[feature] as number > 0 : 
             DEFAULT_FEATURES[feature] as boolean;
    }

    const featureValue = subscription.plan.features[feature];
    
    if (typeof featureValue === 'number') {
      return featureValue === -1 || featureValue > 0;
    }
    
    return featureValue as boolean;
  },

  async recordPayment(payment: Partial<SubscriptionPayment>): Promise<SubscriptionPayment> {
    const { data, error } = await supabase
      .from('subscription_payments')
      .insert(payment)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  async getPaymentHistory(userId: string): Promise<SubscriptionPayment[]> {
    const { data, error } = await supabase
      .from('subscription_payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getSubscriptionStats(): Promise<{
    totalActive: number;
    byTier: Record<SubscriptionTier, number>;
    monthlyRecurringRevenue: number;
    yearlyRecurringRevenue: number;
  }> {
    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        plan:subscription_plans(monthly_price, yearly_price, tier)
      `)
      .eq('status', 'active');

    if (!subscriptions) {
      return { 
        totalActive: 0, 
        byTier: { free: 0, pro: 0, elite: 0 }, 
        monthlyRecurringRevenue: 0, 
        yearlyRecurringRevenue: 0 
      };
    }

    const byTier: Record<SubscriptionTier, number> = { free: 0, pro: 0, elite: 0 };
    let mrr = 0;
    let yrr = 0;

    subscriptions.forEach((sub: UserSubscription & { plan?: SubscriptionPlan }) => {
      if (sub.plan) {
        byTier[sub.plan.tier as SubscriptionTier]++;
        if (sub.billing_cycle === 'monthly') {
          mrr += sub.plan.monthly_price || 0;
          yrr += (sub.plan.yearly_price || 0);
        } else {
          mrr += (sub.plan.yearly_price || 0) / 12;
          yrr += sub.plan.yearly_price || 0;
        }
      }
    });

    return {
      totalActive: subscriptions.length,
      byTier,
      monthlyRecurringRevenue: mrr,
      yearlyRecurringRevenue: yrr
    };
  }
};

export default subscriptionService;
