'use client';

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'elite' | 'guest';

export interface AccessLimits {
  lecturesPerDay: number;
  testsPerDay: number;
  DPPPerDay: number;
  canAccessLiveClasses: boolean;
  canDownloadNotes: boolean;
  canAccessAI: boolean;
  canViewAnalytics: boolean;
  canAccessLeaderboard: boolean;
  canAccessPractice: boolean;
  canAccessRevision: boolean;
  maxMockTests: number;
}

const freeLimits: AccessLimits = {
  lecturesPerDay: 3,
  testsPerDay: 2,
  DPPPerDay: 1,
  canAccessLiveClasses: false,
  canDownloadNotes: false,
  canAccessAI: false,
  canViewAnalytics: false,
  canAccessLeaderboard: true,
  canAccessPractice: true,
  canAccessRevision: true,
  maxMockTests: 5,
};

const basicLimits: AccessLimits = {
  lecturesPerDay: 10,
  testsPerDay: 5,
  DPPPerDay: 3,
  canAccessLiveClasses: false,
  canDownloadNotes: true,
  canAccessAI: true,
  canViewAnalytics: false,
  canAccessLeaderboard: true,
  canAccessPractice: true,
  canAccessRevision: true,
  maxMockTests: 20,
};

const proLimits: AccessLimits = {
  lecturesPerDay: -1,
  testsPerDay: -1,
  DPPPerDay: -1,
  canAccessLiveClasses: true,
  canDownloadNotes: true,
  canAccessAI: true,
  canViewAnalytics: true,
  canAccessLeaderboard: true,
  canAccessPractice: true,
  canAccessRevision: true,
  maxMockTests: 50,
};

const eliteLimits: AccessLimits = {
  lecturesPerDay: -1,
  testsPerDay: -1,
  DPPPerDay: -1,
  canAccessLiveClasses: true,
  canDownloadNotes: true,
  canAccessAI: true,
  canViewAnalytics: true,
  canAccessLeaderboard: true,
  canAccessPractice: true,
  canAccessRevision: true,
  maxMockTests: -1,
};

const guestLimits: AccessLimits = {
  lecturesPerDay: 2,
  testsPerDay: 1,
  DPPPerDay: 0,
  canAccessLiveClasses: false,
  canDownloadNotes: false,
  canAccessAI: false,
  canViewAnalytics: false,
  canAccessLeaderboard: true,
  canAccessPractice: true,
  canAccessRevision: false,
  maxMockTests: 3,
};

export function useAccessControl() {
  const { user, isLoading } = useAuth();

  const access = useMemo(() => {
    if (isLoading) {
      return {
        tier: 'guest' as SubscriptionTier,
        limits: guestLimits,
        isLoggedIn: false,
        isPremium: false,
        isLoading: true,
        subscriptionStatus: 'free',
        subscriptionExpiresAt: null,
      };
    }

    if (!user) {
      return {
        tier: 'guest' as SubscriptionTier,
        limits: guestLimits,
        isLoggedIn: false,
        isPremium: false,
        isLoading: false,
        subscriptionStatus: 'free',
        subscriptionExpiresAt: null,
      };
    }

    const userMetadata = user as any;
    const subscriptionStatus = userMetadata?.subscription_status || 'free';
    const expiresAt = userMetadata?.subscription_expires_at;
    const isExpired = expiresAt && new Date(expiresAt) < new Date();
    const tier: SubscriptionTier = isExpired ? 'free' : (subscriptionStatus || 'free');

    let limits: AccessLimits;
    switch (tier) {
      case 'elite':
        limits = eliteLimits;
        break;
      case 'pro':
        limits = proLimits;
        break;
      case 'basic':
        limits = basicLimits;
        break;
      default:
        limits = freeLimits;
    }

    return {
      tier,
      limits,
      isLoggedIn: true,
      isPremium: tier === 'pro' || tier === 'elite' || tier === 'basic',
      subscriptionStatus: tier,
      subscriptionExpiresAt: expiresAt,
      isLoading: false,
    };
  }, [user, isLoading]);

  const checkLimit = (type: 'lectures' | 'tests' | 'DPP', usedToday: number): { allowed: boolean; remaining: number } => {
    const limit = type === 'lectures' 
      ? access.limits.lecturesPerDay 
      : type === 'tests' 
        ? access.limits.testsPerDay 
        : access.limits.DPPPerDay;

    if (limit === -1) return { allowed: true, remaining: -1 };
    
    const remaining = limit - usedToday;
    return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
  };

  return {
    ...access,
    checkLimit,
  };
}

export function useFeatureAccess(feature: keyof AccessLimits) {
  const { limits } = useAccessControl();
  return limits[feature];
}
