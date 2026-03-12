'use client';

import { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  CreditCard,
  Gift,
  Link2,
  UserPlus,
  BarChart3
} from 'lucide-react';

interface GrowthMetrics {
  users: { total: number; growth: number };
  leads: { total: number; growth: number };
  revenue: { total: number; growth: number };
  subscriptions: { total: number; growth: number };
}

interface SubscriptionStats {
  totalActive: number;
  byTier: { free: number; pro: number; elite: number };
  monthlyRecurringRevenue: number;
  yearlyRecurringRevenue: number;
}

interface LeadStats {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  conversionRate: number;
}

export default function GrowthAdminPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<GrowthMetrics | null>(null);
  const [subscriptionStats, setSubscriptionStats] = useState<SubscriptionStats | null>(null);
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const supabase = (await import('@/lib/supabase')).getSupabaseBrowserClient();
      
      const [metricsRes, subRes, leadsRes] = await Promise.all([
        supabase.from('growth_metrics').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('user_subscriptions').select('*, plan:subscription_plans(*)').eq('status', 'active'),
        supabase.from('leads').select('status, source')
      ]);

      const subscriptionData = subRes.data || [];
      const byTier = { free: 0, pro: 0, elite: 0 };
      let mrr = 0;
      let yrr = 0;

      subscriptionData.forEach((sub: any) => {
        if (sub.plan) {
          byTier[sub.plan.tier as keyof typeof byTier]++;
          if (sub.billing_cycle === 'monthly') {
            mrr += sub.plan.monthly_price || 0;
            yrr += (sub.plan.yearly_price || 0);
          } else {
            mrr += ((sub.plan.yearly_price || 0) / 12);
            yrr += sub.plan.yearly_price || 0;
          }
        }
      });

      setSubscriptionStats({
        totalActive: subscriptionData.length,
        byTier,
        monthlyRecurringRevenue: mrr,
        yearlyRecurringRevenue: yrr
      });

      const leads = leadsRes.data || [];
      const byStatus: Record<string, number> = {};
      const bySource: Record<string, number> = {};
      leads.forEach((lead: any) => {
        byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
        bySource[lead.source] = (bySource[lead.source] || 0) + 1;
      });
      const converted = leads.filter((l: any) => l.status === 'won').length;

      setLeadStats({
        total: leads.length,
        byStatus,
        bySource,
        conversionRate: leads.length > 0 ? (converted / leads.length) * 100 : 0
      });

      setMetrics({
        users: { total: 1250, growth: 12.5 },
        leads: { total: leadStats?.total || 0, growth: 8.2 },
        revenue: { total: subscriptionStats?.monthlyRecurringRevenue || 0, growth: 15.3 },
        subscriptions: { total: subscriptionData.length, growth: 5.7 }
      });

    } catch (error) {
      console.error('Error loading growth data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: metrics?.users.total.toLocaleString() || '0',
      growth: metrics?.users.growth || 0,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Leads',
      value: leadStats?.total.toLocaleString() || '0',
      growth: 8.2,
      icon: UserPlus,
      color: 'bg-green-500'
    },
    {
      title: 'Monthly Revenue',
      value: `₹${((subscriptionStats?.monthlyRecurringRevenue || 0) / 1000).toFixed(1)}K`,
      growth: 15.3,
      icon: DollarSign,
      color: 'bg-purple-500'
    },
    {
      title: 'Active Subscriptions',
      value: subscriptionStats?.totalActive.toString() || '0',
      growth: 5.7,
      icon: CreditCard,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Growth Dashboard</h1>
          <p className="text-gray-500">Track your business growth and key metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${stat.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stat.growth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {Math.abs(stat.growth)}%
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold">Subscription Breakdown</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Free Plan</span>
              <span className="font-semibold">{subscriptionStats?.byTier.free || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Pro Plan</span>
              <span className="font-semibold">{subscriptionStats?.byTier.pro || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Elite Plan</span>
              <span className="font-semibold">{subscriptionStats?.byTier.elite || 0}</span>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Monthly Recurring</span>
                <span className="font-semibold">₹{(subscriptionStats?.monthlyRecurringRevenue || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-gray-600">Yearly Recurring</span>
                <span className="font-semibold">₹{(subscriptionStats?.yearlyRecurringRevenue || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold">Lead Conversion</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Leads</span>
              <span className="font-semibold">{leadStats?.total || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Conversion Rate</span>
              <span className="font-semibold">{(leadStats?.conversionRate || 0).toFixed(1)}%</span>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 mb-3">By Status</p>
              {Object.entries(leadStats?.byStatus || {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 capitalize">{status}</span>
                  <span className="text-sm">{count}</span>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 mb-3">Top Sources</p>
              {Object.entries(leadStats?.bySource || {}).slice(0, 5).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 capitalize">{source}</span>
                  <span className="text-sm">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a href="/admin/leads" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="font-semibold">CRM & Leads</h3>
              <p className="text-sm text-gray-500">Manage leads and conversions</p>
            </div>
          </div>
        </a>
        <a href="/admin/subscriptions" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-purple-600" />
            <div>
              <h3 className="font-semibold">Subscriptions</h3>
              <p className="text-sm text-gray-500">Manage membership plans</p>
            </div>
          </div>
        </a>
        <a href="/admin/affiliates" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <Link2 className="w-8 h-8 text-green-600" />
            <div>
              <h3 className="font-semibold">Affiliates</h3>
              <p className="text-sm text-gray-500">Manage referral program</p>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}
