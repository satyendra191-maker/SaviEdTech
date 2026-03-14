'use client';

import Link from 'next/link';
import { X, Lock, Crown, AlertTriangle } from 'lucide-react';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useState } from 'react';

interface AccessGateProps {
  feature: 'live-classes' | 'ai' | 'downloads' | 'analytics' | 'tests' | 'lectures' | 'dpp';
  children: React.ReactNode;
  showUpgradeButton?: boolean;
}

export function AccessGate({ feature, children, showUpgradeButton = true }: AccessGateProps) {
  const { isLoggedIn, isPremium, tier, limits } = useAccessControl();
  const [dismissed, setDismissed] = useState(false);

  const getFeatureAccess = () => {
    switch (feature) {
      case 'live-classes':
        return { allowed: limits.canAccessLiveClasses, name: 'Live Classes', required: 'Premium' };
      case 'ai':
        return { allowed: limits.canAccessAI, name: 'AI Tutor', required: 'Premium' };
      case 'downloads':
        return { allowed: limits.canDownloadNotes, name: 'Download Notes', required: 'Premium' };
      case 'analytics':
        return { allowed: limits.canViewAnalytics, name: 'Advanced Analytics', required: 'Premium' };
      case 'tests':
        return { allowed: limits.maxMockTests > 0, name: 'Mock Tests', required: tier === 'guest' ? 'Free Account' : 'Higher Plan' };
      case 'lectures':
        return { allowed: limits.lecturesPerDay === -1 || limits.lecturesPerDay > 0, name: 'Premium Lectures', required: 'Premium' };
      case 'dpp':
        return { allowed: limits.DPPPerDay > 0, name: 'DPP', required: 'Higher Plan' };
      default:
        return { allowed: true, name: 'Feature', required: 'Premium' };
    }
  };

  const featureAccess = getFeatureAccess();

  if (featureAccess.allowed) {
    return <>{children}</>;
  }

  if (dismissed) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-4 shadow-2xl border border-amber-100">
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-2 right-2 p-1 hover:bg-slate-100 rounded-full"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
              {isLoggedIn ? <Crown className="w-8 h-8 text-amber-600" /> : <Lock className="w-8 h-8 text-amber-600" />}
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {isLoggedIn ? 'Upgrade to Premium' : 'Sign Up to Continue'}
            </h3>
            
            <p className="text-sm text-slate-600 mb-4">
              {isLoggedIn 
                ? `Your current plan doesn't include ${featureAccess.name}. Upgrade to unlock this feature!`
                : `Create a free account to get started, or upgrade to Premium for unlimited access to ${featureAccess.name}.`
              }
            </p>

            {showUpgradeButton && (
              <div className="flex flex-col gap-2">
                {isLoggedIn ? (
                  <Link
                    href="/dashboard/subscriptions"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all"
                  >
                    <Crown className="w-4 h-4" />
                    Upgrade Now
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/signup"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all"
                    >
                      Create Free Account
                    </Link>
                    <Link
                      href="/login"
                      className="text-sm text-slate-500 hover:text-slate-700"
                    >
                      Already have an account? Sign In
                    </Link>
                  </>
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                Current plan: <span className="font-semibold capitalize">{tier}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeatureLimitBanner() {
  const { tier, limits, isLoggedIn } = useAccessControl();

  if (isLoggedIn && (tier === 'pro' || tier === 'elite')) {
    return null;
  }

  const showBanner = !isLoggedIn || tier === 'free';

  if (!showBanner) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 px-4 py-2">
      <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 text-sm">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <span className="text-slate-700">
          {isLoggedIn 
            ? `Free plan: ${limits.lecturesPerDay === -1 ? 'Unlimited' : limits.lecturesPerDay} lectures/day. `
            : `Guest: ${limits.lecturesPerDay} free lectures/day. `
          }
        </span>
        {!isLoggedIn && (
          <Link href="/signup" className="text-violet-600 font-semibold hover:underline">
            Sign Up for More
          </Link>
        )}
        {isLoggedIn && tier === 'free' && (
          <Link href="/dashboard/subscriptions" className="text-amber-600 font-semibold hover:underline">
            Upgrade to Premium
          </Link>
        )}
      </div>
    </div>
  );
}
