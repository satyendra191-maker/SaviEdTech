'use client';

import { useEffect, useState } from 'react';
import { 
  Check, 
  CreditCard, 
  Loader2, 
  Plus, 
  Edit2, 
  Trash2,
  X
} from 'lucide-react';
import type { SubscriptionPlan, SubscriptionTier } from '@/types/business';

interface PlanFormData {
  name: string;
  tier: SubscriptionTier;
  monthly_price: number;
  yearly_price: number;
  features: {
    ad_free: boolean;
    premium_courses: boolean;
    priority_ai_tutor: boolean;
    advanced_analytics: boolean;
    live_classes_access: boolean;
    mock_tests: number;
    download_notes: boolean;
    certificate: boolean;
    mentor_sessions: number;
  };
}

export default function SubscriptionsAdminPage() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>({
    name: '',
    tier: 'pro',
    monthly_price: 0,
    yearly_price: 0,
    features: {
      ad_free: false,
      premium_courses: false,
      priority_ai_tutor: false,
      advanced_analytics: false,
      live_classes_access: false,
      mock_tests: 0,
      download_notes: false,
      certificate: false,
      mentor_sessions: 0
    }
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('sort_order');
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const sortOrder = formData.tier === 'free' ? 1 : formData.tier === 'pro' ? 2 : 3;

      if (editingPlan) {
        await supabase.from('subscription_plans').update({
          name: formData.name,
          tier: formData.tier,
          monthly_price: formData.monthly_price,
          yearly_price: formData.yearly_price,
          features: formData.features as unknown as Record<string, unknown>,
          is_active: true,
          sort_order: sortOrder
        }).eq('id', editingPlan.id);
      } else {
        await supabase.from('subscription_plans').insert({
          name: formData.name,
          tier: formData.tier,
          monthly_price: formData.monthly_price,
          yearly_price: formData.yearly_price,
          features: formData.features as unknown as Record<string, unknown>,
          is_active: true,
          sort_order: sortOrder
        });
      }

      setShowModal(false);
      setEditingPlan(null);
      loadPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
    }
  };

  const togglePlanStatus = async (plan: SubscriptionPlan) => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await supabase.from('subscription_plans').update({ is_active: !plan.is_active }).eq('id', plan.id);
      loadPlans();
    } catch (error) {
      console.error('Error toggling plan:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-gray-500">Manage membership tiers and pricing</p>
        </div>
        <button
          onClick={() => {
            setEditingPlan(null);
            setFormData({
              name: '',
              tier: 'pro',
              monthly_price: 0,
              yearly_price: 0,
              features: {
                ad_free: false,
                premium_courses: false,
                priority_ai_tutor: false,
                advanced_analytics: false,
                live_classes_access: false,
                mock_tests: 0,
                download_notes: false,
                certificate: false,
                mentor_sessions: 0
              }
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div 
            key={plan.id} 
            className={`bg-white rounded-xl shadow-sm border-2 p-6 ${
              plan.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                plan.tier === 'free' ? 'bg-gray-100 text-gray-600' :
                plan.tier === 'pro' ? 'bg-blue-100 text-blue-600' :
                'bg-purple-100 text-purple-600'
              }`}>
                {plan.tier.toUpperCase()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingPlan(plan);
                    setFormData({
                      name: plan.name,
                      tier: plan.tier,
                      monthly_price: plan.monthly_price,
                      yearly_price: plan.yearly_price,
                      features: plan.features as any
                    });
                    setShowModal(true);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => togglePlanStatus(plan)}
                  className={`p-1 ${plan.is_active ? 'text-green-600' : 'text-gray-400'}`}
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
            
            <div className="mt-4 space-y-2">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">₹{plan.monthly_price}</span>
                <span className="text-gray-500">/month</span>
              </div>
              <div className="text-sm text-gray-500">
                ₹{plan.yearly_price}/year (Save {Math.round((1 - plan.yearly_price / (plan.monthly_price * 12)) * 100)}%)
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {(plan.features as any)?.ad_free && (
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Ad-free experience</span>
                </div>
              )}
              {(plan.features as any)?.premium_courses && (
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Premium courses</span>
                </div>
              )}
              {(plan.features as any)?.priority_ai_tutor && (
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Priority AI tutor access</span>
                </div>
              )}
              {(plan.features as any)?.mock_tests > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>{(plan.features as any).mock_tests === -1 ? 'Unlimited' : (plan.features as any).mock_tests} mock tests</span>
                </div>
              )}
              {(plan.features as any)?.mentor_sessions > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>{(plan.features as any).mentor_sessions} mentor session(s)/month</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{editingPlan ? 'Edit Plan' : 'Create Plan'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                <select
                  value={formData.tier}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value as SubscriptionTier })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="elite">Elite</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Price (₹)</label>
                  <input
                    type="number"
                    value={formData.monthly_price}
                    onChange={(e) => setFormData({ ...formData, monthly_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yearly Price (₹)</label>
                  <input
                    type="number"
                    value={formData.yearly_price}
                    onChange={(e) => setFormData({ ...formData, yearly_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Features</h3>
                <div className="space-y-2">
                  {Object.entries(formData.features).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                      {typeof value === 'boolean' ? (
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setFormData({
                            ...formData,
                            features: { ...formData.features, [key]: e.target.checked }
                          })}
                          className="rounded"
                        />
                      ) : (
                        <input
                          type="number"
                          value={value as number}
                          onChange={(e) => setFormData({
                            ...formData,
                            features: { ...formData.features, [key]: Number(e.target.value) }
                          })}
                          className="w-20 px-2 py-1 border rounded"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingPlan ? 'Update Plan' : 'Create Plan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
