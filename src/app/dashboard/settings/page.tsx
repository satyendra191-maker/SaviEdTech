'use client';

import { useEffect, useState } from 'react';
import { User, Bell, Shield, HelpCircle, ChevronRight, LogOut, Loader2, AlertCircle } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface SettingsData {
  profile: {
    full_name: string;
    email: string;
    avatar_url: string | null;
    role: string;
    exam_target: string | null;
    class_level: string | null;
    referral_code?: string | null;
    referral_count?: number | null;
    ads_disabled_until?: string | null;
    ads_disabled_permanent?: boolean | null;
  } | null;
}

const menuItems = [
  { icon: User, label: 'Edit Profile', description: 'Update your personal information', href: '#' },
  { icon: Bell, label: 'Notifications', description: 'Manage notification preferences', href: '#' },
  { icon: Shield, label: 'Privacy & Security', description: 'Password and security settings', href: '#' },
  { icon: HelpCircle, label: 'Help & Support', description: 'FAQs and contact support', href: '#' },
];

export default function SettingsPage() {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);

  useEffect(() => {
    async function fetchSettingsData() {
      if (!user) return;

      try {
        const supabase = getSupabaseBrowserClient();

        // Fetch user profile
        let { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, email, avatar_url, role, exam_target, class_level, referral_code, referral_count, ads_disabled_until, ads_disabled_permanent')
          .eq('id', user.id)
          .single();

        if (profileError) {
          // Backward-compatible fallback if newer referral columns are not present yet
          const fallback = await supabase
            .from('profiles')
            .select('full_name, email, avatar_url, role, exam_target, class_level')
            .eq('id', user.id)
            .single();

          profileData = fallback.data as typeof profileData;
          profileError = fallback.error;
        }

        if (profileError || !profileData) {
          throw profileError || new Error('Profile not found');
        }

        setData({
          profile: profileData as SettingsData['profile'],
        });
      } catch (err) {
        console.error('Error fetching settings data:', err);
        setError('Failed to load settings. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchSettingsData();
    }
  }, [user, authLoading]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.push('/login');
    } catch (err) {
      console.error('Error signing out:', err);
      setSigningOut(false);
    }
  };

  if (authLoading || loading) {
    return <SettingsSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="w-16 h-16 text-red-500" />
        <h2 className="text-xl font-semibold text-slate-900">Something went wrong</h2>
        <p className="text-slate-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const profile = data?.profile;
  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'S';
  const displayName = profile?.full_name || 'Student';
  const examTarget = profile?.exam_target || 'JEE Aspirant';
  const classLevel = profile?.class_level || 'Class 12';
  const referralCode = profile?.referral_code || null;
  const referralCount = profile?.referral_count || 0;
  const appOrigin = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL || 'https://saviedutech.com');
  const referralLink = referralCode ? `${appOrigin}/signup?ref=${referralCode}` : '';
  const adsDisabledUntil = profile?.ads_disabled_until ? new Date(profile.ads_disabled_until) : null;
  const isAdsDisabledTemporarily = !!(adsDisabledUntil && adsDisabledUntil.getTime() > Date.now());
  const isAdsDisabledPermanently = !!profile?.ads_disabled_permanent;
  const progressToNextReward = referralCount % 4;
  const referralsNeededForNextReward = progressToNextReward === 0 ? 4 : 4 - progressToNextReward;

  const copyReferralLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 2000);
    } catch (err) {
      console.error('Failed to copy referral link:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage your account and preferences</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-2xl font-bold">
              {initials}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-slate-900">{displayName}</h2>
            <p className="text-slate-500">{profile?.email || 'student@example.com'}</p>
            {profile?.role === 'student' && (
              <div className="flex items-center gap-2 mt-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                  {examTarget}
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                  {classLevel}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={i}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-slate-900">{item.label}</h3>
                  <p className="text-sm text-slate-500">{item.description}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          );
        })}
      </div>

      {/* Referral Program */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">Referral Program</h3>
            <p className="text-sm text-slate-500">
              4 successful referrals unlock 7 days of ad-free learning.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
            {referralCount} referrals
          </span>
        </div>

        {referralCode ? (
          <div className="space-y-3">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-500 mb-1">Your referral link</p>
              <p className="text-sm text-slate-800 break-all">{referralLink}</p>
            </div>
            <button
              onClick={copyReferralLink}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              {copiedReferral ? 'Copied' : 'Copy Referral Link'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Referral code will be available shortly.</p>
        )}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-xl border border-slate-100 bg-slate-50">
            <p className="text-slate-500">Next reward in</p>
            <p className="font-semibold text-slate-900">{referralsNeededForNextReward} referral(s)</p>
          </div>
          <div className="p-3 rounded-xl border border-slate-100 bg-slate-50">
            <p className="text-slate-500">Ads status</p>
            <p className="font-semibold text-slate-900">
              {isAdsDisabledPermanently
                ? 'Disabled permanently'
                : isAdsDisabledTemporarily
                  ? `Disabled until ${adsDisabledUntil?.toLocaleDateString()}`
                  : 'Enabled'}
            </p>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">About</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Version</span>
            <span className="text-slate-900">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Build</span>
            <span className="text-slate-900">2026.03.04</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Terms of Service</span>
            <a href="#" className="text-primary-600 hover:underline">View</a>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Privacy Policy</span>
            <a href="#" className="text-primary-600 hover:underline">View</a>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
      >
        {signingOut ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Signing Out...
          </>
        ) : (
          <>
            <LogOut className="w-5 h-5" />
            Sign Out
          </>
        )}
      </button>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 bg-slate-200 rounded w-32 mb-2"></div>
        <div className="h-4 bg-slate-200 rounded w-64"></div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-slate-200 rounded-full"></div>
          <div className="space-y-2">
            <div className="h-6 bg-slate-200 rounded w-48"></div>
            <div className="h-4 bg-slate-200 rounded w-64"></div>
            <div className="flex gap-2 mt-2">
              <div className="h-6 bg-slate-200 rounded w-24"></div>
              <div className="h-6 bg-slate-200 rounded w-20"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 border-b border-slate-100 last:border-b-0 h-20">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 rounded w-32"></div>
                <div className="h-3 bg-slate-200 rounded w-48"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="h-5 bg-slate-200 rounded w-16 mb-4"></div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex justify-between h-4">
              <div className="bg-slate-200 rounded w-32"></div>
              <div className="bg-slate-200 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-14 bg-slate-200 rounded-2xl"></div>
    </div>
  );
}
