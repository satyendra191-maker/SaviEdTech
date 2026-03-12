'use client';

import { useEffect, useState } from 'react';
import { 
  Loader2, 
  Check, 
  X, 
  Link2,
  DollarSign,
  Users,
  TrendingUp,
  Copy,
  ExternalLink
} from 'lucide-react';

interface Affiliate {
  id: string;
  user_id: string;
  user?: { name: string; email: string };
  status: string;
  commission_rate: number;
  total_earnings: number;
  pending_earnings: number;
  paid_earnings: number;
  created_at: string;
}

interface AffiliateLink {
  id: string;
  link_token: string;
  destination_url: string;
  clicks: number;
  conversions: number;
  earnings: number;
  course?: { title: string };
}

export default function AffiliatesAdminPage() {
  const [loading, setLoading] = useState(true);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [stats, setStats] = useState({
    totalAffiliates: 0,
    approvedAffiliates: 0,
    totalEarnings: 0,
    pendingPayouts: 0
  });

  useEffect(() => {
    loadAffiliates();
  }, []);

  const loadAffiliates = async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: affiliatesData } = await supabase
        .from('affiliates')
        .select('*, user:profiles(name, email)')
        .order('created_at', { ascending: false });

      const affiliatesList = affiliatesData || [];
      setAffiliates(affiliatesList);

      setStats({
        totalAffiliates: affiliatesList.length,
        approvedAffiliates: affiliatesList.filter((a: any) => a.status === 'approved').length,
        totalEarnings: affiliatesList.reduce((sum: number, a: any) => sum + (a.total_earnings || 0), 0),
        pendingPayouts: affiliatesList.reduce((sum: number, a: any) => sum + (a.pending_earnings || 0), 0)
      });
    } catch (error) {
      console.error('Error loading affiliates:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveAffiliate = async (affiliateId: string) => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await supabase.from('affiliates').update({
        status: 'approved',
        approved_at: new Date().toISOString()
      }).eq('id', affiliateId);
      loadAffiliates();
    } catch (error) {
      console.error('Error approving affiliate:', error);
    }
  };

  const rejectAffiliate = async (affiliateId: string) => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await supabase.from('affiliates').update({ status: 'rejected' }).eq('id', affiliateId);
      loadAffiliates();
    } catch (error) {
      console.error('Error rejecting affiliate:', error);
    }
  };

  const loadAffiliateLinks = async (affiliateId: string) => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data } = await supabase
        .from('affiliate_links')
        .select('*, course:courses(title)')
        .eq('affiliate_id', affiliateId);

      setLinks(data || []);
    } catch (error) {
      console.error('Error loading links:', error);
    }
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/ref/${token}`;
    navigator.clipboard.writeText(link);
  };

  const pendingAffiliates = affiliates.filter((a: any) => a.status === 'pending');

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
          <h1 className="text-2xl font-bold text-gray-900">Affiliate Program</h1>
          <p className="text-gray-500">Manage affiliates and commissions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Total Affiliates</p>
              <p className="text-2xl font-bold">{stats.totalAffiliates}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <Check className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-2xl font-bold">{stats.approvedAffiliates}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-500">Total Earnings</p>
              <p className="text-2xl font-bold">₹{stats.totalEarnings.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-sm text-gray-500">Pending Payouts</p>
              <p className="text-2xl font-bold">₹{stats.pendingPayouts.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {pendingAffiliates.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h3 className="font-medium text-yellow-800 mb-3">Pending Applications ({pendingAffiliates.length})</h3>
          <div className="space-y-2">
            {pendingAffiliates.map((affiliate: any) => (
              <div key={affiliate.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                <div>
                  <p className="font-medium">{affiliate.user?.name || 'Unknown'}</p>
                  <p className="text-sm text-gray-500">{affiliate.user?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => approveAffiliate(affiliate.id)}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => rejectAffiliate(affiliate.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">All Affiliates</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Affiliate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earnings</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {affiliates.map((affiliate: any) => (
                <tr key={affiliate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{affiliate.user?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-500">{affiliate.user?.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      affiliate.status === 'approved' ? 'bg-green-100 text-green-700' :
                      affiliate.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {affiliate.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{affiliate.commission_rate}%</td>
                  <td className="px-6 py-4">₹{(affiliate.total_earnings || 0).toLocaleString()}</td>
                  <td className="px-6 py-4">₹{(affiliate.pending_earnings || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedAffiliate(affiliate);
                        loadAffiliateLinks(affiliate.id);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View Links
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAffiliate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Affiliate Links - {selectedAffiliate.user?.name}</h2>
              <button onClick={() => setSelectedAffiliate(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {links.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No links generated yet</p>
            ) : (
              <div className="space-y-3">
                {links.map((link: any) => (
                  <div key={link.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{link.course?.title || 'General Link'}</p>
                      <p className="text-xs text-gray-500 truncate">{link.destination_url}</p>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="text-center">
                        <p className="text-lg font-bold">{link.clicks}</p>
                        <p className="text-xs text-gray-500">Clicks</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">{link.conversions}</p>
                        <p className="text-xs text-gray-500">Sales</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">₹{link.earnings}</p>
                        <p className="text-xs text-gray-500">Earnings</p>
                      </div>
                      <button
                        onClick={() => copyLink(link.link_token)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
