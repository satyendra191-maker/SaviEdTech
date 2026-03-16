'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { authService, UserRole } from '@/lib/auth/authService';
import { EMPLOYEE_ROLES } from '@/lib/auth/roles';

export interface Profile {
  id: string;
  email: string;
  name?: string | null;
  full_name?: string | null;
  role: UserRole;
  phone?: string | null;
  avatar_url?: string | null;
  is_verified: boolean;
  status: 'pending' | 'active' | 'blocked';
  created_at?: string;
}

export type VerificationStatus = 'pending' | 'active' | 'blocked';

function isEmployeeRole(role: string | null): boolean {
  return role ? EMPLOYEE_ROLES.includes(role as UserRole) : false;
}

interface AuthState {
  user: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  isEmployee: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, userData: {
    fullName?: string;
    phone?: string;
    role?: UserRole;
    metadata?: Record<string, unknown>;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithApple: () => Promise<{ error: string | null }>;
  signInWithMicrosoft: () => Promise<{ error: string | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signInWithOTP: (emailOrPhone: string, isEmail: boolean) => Promise<{ error: string | null }>;
  verifyOTP: (phone: string, token: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: process.env.NODE_ENV === 'development' 
      ? { id: '00000000-0000-0000-0000-000000000000', email: 'satyendra191@gmail.com', role: 'admin', full_name: 'Admin User', status: 'active', is_verified: true } as any
      : null,
    role: process.env.NODE_ENV === 'development' ? 'admin' : null,
    isLoading: process.env.NODE_ENV !== 'development',
    isAuthenticated: process.env.NODE_ENV === 'development',
    isVerified: process.env.NODE_ENV === 'development',
    verificationStatus: process.env.NODE_ENV === 'development' ? 'active' : 'pending',
    isEmployee: process.env.NODE_ENV === 'development',
  });

  const supabase = useMemo(() => {
    try {
      return getSupabaseBrowserClient();
    } catch (error) {
      console.warn('Supabase client initialization failed:', error);
      return null;
    }
  }, []);

  const fetchUser = useCallback(async () => {
    if (!supabase) {
      setState({
        user: null,
        role: null,
        isLoading: false,
        isAuthenticated: false,
        isVerified: false,
        verificationStatus: 'pending',
        isEmployee: false,
      });
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        if (process.env.NODE_ENV === 'development') {
          setState({
            user: { id: '00000000-0000-0000-0000-000000000000', email: 'satyendra191@gmail.com' } as any,
            role: 'admin',
            isLoading: false,
            isAuthenticated: true,
            isVerified: true,
            verificationStatus: 'active',
            isEmployee: true,
          });
          return;
        }
        setState({
          user: null,
          role: null,
          isLoading: false,
          isAuthenticated: false,
          isVerified: false,
          verificationStatus: 'pending',
          isEmployee: false,
        });
        return;
      }

      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if ((error || !profile) && typeof window !== 'undefined') {
        try {
          await fetch('/api/auth/bootstrap-profile', { method: 'POST' });
          const retry = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();
          profile = retry.data;
          error = retry.error;
        } catch (bootstrapError) {
          console.error('Profile bootstrap request failed:', bootstrapError);
        }
      }

      if (error || !profile) {
        setState({
          user: null,
          role: null,
          isLoading: false,
          isAuthenticated: false,
          isVerified: false,
          verificationStatus: 'pending',
          isEmployee: false,
        });
        return;
      }

      const profileRole = profile.role || 'student';
      const verificationStatus = profile.status || 'pending';
      const isVerified = profile.is_verified === true && verificationStatus === 'active';
      const isEmployee = isEmployeeRole(profileRole);

      setState({
        user: profile as unknown as Profile,
        role: profileRole as UserRole,
        isLoading: false,
        isAuthenticated: true,
        isVerified,
        verificationStatus,
        isEmployee,
      });
    } catch {
      setState({
        user: null,
        role: null,
        isLoading: false,
        isAuthenticated: false,
        isVerified: false,
        verificationStatus: 'pending',
        isEmployee: false,
      });
    }
  }, [supabase]);

  useEffect(() => {
    fetchUser();

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return () => {};

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchUser();
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            role: null,
            isLoading: false,
            isAuthenticated: false,
            isVerified: false,
            verificationStatus: 'pending',
            isEmployee: false,
          });
          router.push('/login');
          router.refresh();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUser, router]);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!supabase) {
      return { error: 'Authentication service unavailable' };
    }
    try {
      const { error } = await authService.signInWithEmail(email, password);
      if (error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('invalid') || errorMessage.includes('credentials')) {
          return { error: 'Invalid email or password' };
        }
        if (errorMessage.includes('confirm') || errorMessage.includes('verify')) {
          return { error: 'Please verify your email' };
        }
        if (errorMessage.includes('rate limit')) {
          return { error: 'Too many attempts. Please wait' };
        }
        return { error: error.message };
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        await supabase.auth.signOut();
        return { error: 'Authentication failed. Please try again.' };
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        return { error: 'Profile not found. Please contact support.' };
      }

      const verificationStatus = profile.status || 'pending';
      const isVerified = profile.is_verified === true && verificationStatus === 'active';
      const profileRole = profile.role || 'student';
      const isEmployee = isEmployeeRole(profileRole);

      if (verificationStatus === 'blocked') {
        await supabase.auth.signOut();
        return { error: 'Your account has been blocked. Please contact support.' };
      }

      if (!isVerified) {
        await supabase.auth.signOut();
        
        if (isEmployee) {
          return { error: 'Your account is pending approval by administrator.' };
        }
        return { error: 'Please verify your email to sign in.' };
      }

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Sign in failed' };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userData: { fullName?: string; phone?: string; role?: UserRole; metadata?: Record<string, unknown> }
  ): Promise<{ error: string | null }> => {
    if (!supabase) {
      return { error: 'Authentication service unavailable' };
    }
    
    const isEmployee = userData.role ? isEmployeeRole(userData.role) : false;
    
    try {
      const { error } = await authService.signUp({
        email,
        password,
        fullName: userData.fullName,
        phone: userData.phone,
        role: userData.role,
        metadata: userData.metadata,
      });
      if (error) {
        return { error: error.message };
      }
      
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Sign up failed' };
    }
  };

  const signOut = async (): Promise<void> => {
    if (!supabase) {
      setState({
        user: null,
        role: null,
        isLoading: false,
        isAuthenticated: false,
        isVerified: false,
        verificationStatus: 'pending',
        isEmployee: false,
      });
      router.push('/');
      router.refresh();
      return;
    }
    try {
      await authService.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setState({
        user: null,
        role: null,
        isLoading: false,
        isAuthenticated: false,
        isVerified: false,
        verificationStatus: 'pending',
        isEmployee: false,
      });
      router.push('/login');
      router.refresh();
    }
  };

  const signInWithGoogle = async (): Promise<{ error: string | null }> => {
    if (!supabase) {
      return { error: 'Authentication service unavailable' };
    }
    try {
      const result = await authService.signInWithOAuth('google');
      if (result.error) {
        return { error: result.error };
      }
      if (result.url) {
        window.location.href = result.url;
      }
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Google sign in failed' };
    }
  };

  const signInWithApple = async (): Promise<{ error: string | null }> => {
    if (!supabase) {
      return { error: 'Authentication service unavailable' };
    }
    try {
      const result = await authService.signInWithOAuth('apple');
      if (result.error) {
        return { error: result.error };
      }
      if (result.url) {
        window.location.href = result.url;
      }
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Apple sign in failed' };
    }
  };

  const signInWithMicrosoft = async (): Promise<{ error: string | null }> => {
    if (!supabase) {
      return { error: 'Authentication service unavailable' };
    }
    try {
      const result = await authService.signInWithOAuth('azure');
      if (result.error) {
        return { error: result.error };
      }
      if (result.url) {
        window.location.href = result.url;
      }
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Microsoft sign in failed' };
    }
  };

  const signInWithMagicLink = async (email: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await authService.signInWithMagicLink({ email });
      if (error) {
        return { error };
      }
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Magic link failed' };
    }
  };

  const signInWithOTP = async (emailOrPhone: string, isEmail: boolean): Promise<{ error: string | null }> => {
    try {
      const { error } = await authService.signInWithOTP(
        isEmail ? { email: emailOrPhone } : { phone: emailOrPhone },
        isEmail
      );
      if (error) {
        return { error };
      }
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'OTP request failed' };
    }
  };

  const verifyOTP = async (phone: string, token: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await authService.verifyOTP(phone, token);
      if (error) {
        return { error: error.message };
      }
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'OTP verification failed' };
    }
  };

  const resetPassword = async (email: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await authService.resetPassword(email);
      if (error) {
        return { error };
      }
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Password reset failed' };
    }
  };

  const updatePassword = async (newPassword: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await authService.updatePassword(newPassword);
      if (error) {
        return { error };
      }
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Password update failed' };
    }
  };

  const refreshUser = async (): Promise<void> => {
    await fetchUser();
  };

  const value = {
    ...state,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithApple,
    signInWithMicrosoft,
    signInWithMagicLink,
    signInWithOTP,
    verifyOTP,
    resetPassword,
    updatePassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthProvider;
