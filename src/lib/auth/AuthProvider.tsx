'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { authService, UserRole } from '@/lib/auth/authService';

interface Profile {
  id: string;
  email: string;
  name?: string | null;
  full_name?: string | null;
  role: UserRole;
  phone?: string | null;
  avatar_url?: string | null;
}

interface AuthState {
  user: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
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
    user: null,
    role: null,
    isLoading: true,
    isAuthenticated: false,
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
      });
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        setState({
          user: null,
          role: null,
          isLoading: false,
          isAuthenticated: false,
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
        });
        return;
      }

      setState({
        user: profile as unknown as Profile,
        role: (profile as unknown as Profile).role,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch {
      setState({
        user: null,
        role: null,
        isLoading: false,
        isAuthenticated: false,
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
