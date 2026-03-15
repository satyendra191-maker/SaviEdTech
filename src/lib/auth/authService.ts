'use client';

import { getSupabaseBrowserClient } from '@/lib/supabase';

export type OAuthProvider = 'google' | 'apple' | 'azure';
export type AuthProvider = OAuthProvider | 'email' | 'phone';
export type UserRole = 'admin' | 'teacher' | 'student' | 'parent' | 'faculty' | 'content_manager' | 'finance_manager';

interface SignUpData {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
  role?: UserRole;
  metadata?: Record<string, unknown>;
}

interface MagicLinkData {
  email: string;
}

interface OTPData {
  email?: string;
  phone?: string;
}

interface AuthResult {
  data?: {
    user: unknown;
    session: unknown;
  };
  error: Error | null;
}

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  return 'https://saviedutech.com';
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export const authService = {
  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return { error: new Error('Authentication service unavailable') };
    }

    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      return { data: result.data as AuthResult['data'], error: result.error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  async signUp(data: SignUpData): Promise<AuthResult> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return { error: new Error('Authentication service unavailable') };
    }

    try {
      const result = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            phone: data.phone,
            role: data.role || 'student',
            ...data.metadata,
          },
          emailRedirectTo: `${getBaseUrl()}/auth/callback`,
        },
      });
      return { data: result.data as AuthResult['data'], error: result.error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  async signInWithOAuth(provider: OAuthProvider): Promise<{ url?: string; error?: string }> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return { error: 'Authentication service unavailable' };
    }

    try {
      const baseUrl = getBaseUrl();
      const redirectTo = `${baseUrl}/auth/callback`;

      const result = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (result.error) {
        return { error: result.error.message };
      }

      if (result.data.url) {
        return { url: result.data.url };
      }

      return { error: 'Failed to initiate OAuth' };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'OAuth failed' };
    }
  },

  async signInWithMagicLink(data: MagicLinkData): Promise<{ error?: string }> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return { error: 'Authentication service unavailable' };
    }

    try {
      const result = await withTimeout(
        supabase.auth.signInWithOtp({
          email: data.email,
          options: {
            emailRedirectTo: `${getBaseUrl()}/auth/callback`,
          },
        }),
        15000,
        'Magic link request timed out'
      ) as { error: { message: string } | null };

      if (result.error) {
        return { error: result.error.message };
      }

      return {};
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to send magic link' };
    }
  },

  async signInWithOTP(data: OTPData, isEmail: boolean = true): Promise<{ error?: string }> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return { error: 'Authentication service unavailable' };
    }

    try {
      let result;

      if (isEmail && data.email) {
        result = await withTimeout(
          supabase.auth.signInWithOtp({
            email: data.email,
            options: {
              emailRedirectTo: `${getBaseUrl()}/auth/callback`,
            },
          }),
          15000,
          'OTP request timed out'
        );
      } else if (!isEmail && data.phone) {
        result = await withTimeout(
          supabase.auth.signInWithOtp({
            phone: data.phone,
          }),
          15000,
          'OTP request timed out'
        );
      } else {
        return { error: 'Email or phone required' };
      }

      if (result.error) {
        return { error: result.error.message };
      }

      return {};
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to send OTP' };
    }
  },

  async verifyOTP(phone: string, token: string): Promise<AuthResult> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return { error: new Error('Authentication service unavailable') };
    }

    try {
      const result = await withTimeout(
        supabase.auth.verifyOtp({ phone, token, type: 'sms' }),
        15000,
        'OTP verification timed out'
      ) as { data: unknown; error: unknown };
      return { data: result.data as AuthResult['data'], error: result.error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  async resetPassword(email: string): Promise<{ error?: string }> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return { error: 'Authentication service unavailable' };
    }

    try {
      const result = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getBaseUrl()}/auth/callback?type=recovery`,
      });

      if (result.error) {
        return { error: result.error.message };
      }

      return {};
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to reset password' };
    }
  },

  async updatePassword(newPassword: string): Promise<{ error?: string }> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return { error: 'Authentication service unavailable' };
    }

    try {
      const result = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (result.error) {
        return { error: result.error.message };
      }

      return {};
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to update password' };
    }
  },

  async signOut(): Promise<{ error?: string }> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return { error: 'Authentication service unavailable' };
    }

    try {
      const result = await supabase.auth.signOut();
      if (result.error) {
        return { error: result.error.message };
      }

      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }

      return {};
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to sign out' };
    }
  },

  async getSession() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return null;
    }

    try {
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch {
      return null;
    }
  },

  async getCurrentUser() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch {
      return null;
    }
  },

  async getUserProfile(userId: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch {
      return null;
    }
  },

  async updateProfile(userId: string, updates: Record<string, unknown>) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return { error: 'Authentication service unavailable' };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await supabase
        .from('profiles')
        .update(updates as never)
        .eq('id', userId)
        .select();

      if (result.error) {
        return { error: result.error };
      }

      return {};
    } catch (error) {
      return { error: error as Error };
    }
  },

  getRoleBasedRedirect(role: string | null): string {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'finance_manager':
        return '/admin/finance';
      case 'faculty':
      case 'content_manager':
        return '/dashboard';
      case 'teacher':
        return '/teacher/dashboard';
      case 'student':
        return '/dashboard';
      case 'parent':
        return '/parent/dashboard';
      default:
        return '/dashboard';
    }
  },
};

export default authService;
