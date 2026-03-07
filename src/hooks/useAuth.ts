'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import type { User, UserRole, ExamTarget, ClassLevel } from '@/types';

interface AuthState {
    user: User | null;
    role: UserRole | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

interface SignUpUserData {
    full_name?: string;
    phone?: string;
    exam_target?: ExamTarget;
    class_level?: ClassLevel;
    city?: string;
    role?: string;
}

interface UseAuthReturn extends AuthState {
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signUp: (email: string, password: string, userData: SignUpUserData) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ error: string | null }>;
    updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
    signInWithGoogle: () => Promise<{ error: string | null }>;
}

export function useAuth(): UseAuthReturn {
    const router = useRouter();
    const [state, setState] = useState<AuthState>({
        user: null,
        role: null,
        isLoading: true,
        isAuthenticated: false,
    });

    // Memoize Supabase client to prevent unnecessary recreations
    const supabase = useMemo(() => getSupabaseBrowserClient(), []);

    const fetchUser = useCallback(async () => {
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

            // Fetch user profile
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

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
                user: profile as unknown as User,
                role: (profile as unknown as { role: UserRole }).role,
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

        // Subscribe to auth changes
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
                    // Redirect to home page on sign out
                    router.push('/');
                    router.refresh();
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchUser, supabase, router]);

    const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                // Handle specific error cases
                const errorMessage = error.message.toLowerCase();

                if (errorMessage.includes('invalid') || errorMessage.includes('credentials')) {
                    return { error: 'Invalid email or password. Please try again.' };
                } else if (errorMessage.includes('confirm') || errorMessage.includes('verify')) {
                    return { error: 'Please verify your email before signing in.' };
                } else if (errorMessage.includes('rate limit')) {
                    return { error: 'Too many attempts. Please wait a moment and try again.' };
                }
                return { error: error.message };
            }

            return { error: null };
        } catch (err) {
            return { error: err instanceof Error ? err.message : 'Sign in failed' };
        }
    };

    const signInWithGoogle = async (): Promise<{ error: string | null }> => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) return { error: error.message };
            return { error: null };
        } catch (err) {
            return { error: err instanceof Error ? err.message : 'Google sign in failed' };
        }
    };

    const signUp = async (
        email: string,
        password: string,
        userData: SignUpUserData
    ): Promise<{ error: string | null }> => {
        try {
            // Step 1: Sign up with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: userData.full_name,
                        phone: userData.phone,
                        exam_target: userData.exam_target,
                        class_level: userData.class_level,
                        role: userData.role || 'student',
                    },
                    emailRedirectTo: `${window.location.origin}/login`,
                },
            });

            if (authError) {
                console.error('Auth error:', authError.message);
                if (authError.message.includes('User already registered')) {
                    return { error: 'An account with this email already exists. Please sign in instead.' };
                }
                if (authError.message.includes('Password should be')) {
                    return { error: 'Password is too weak. Please use a stronger password.' };
                }
                if (authError.message.includes('Unable to validate')) {
                    return { error: 'Invalid email format. Please check your email address.' };
                }
                return { error: authError.message };
            }

            if (!authData.user) {
                return { error: 'Registration failed. Please try again.' };
            }

            // Handle Parent-Child Linking during registration
            if (userData.role === 'parent' && userData.phone) {
                try {
                    // Try to find student with this phone
                    const { data: studentProfile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('phone', userData.phone)
                        .eq('role', 'student')
                        .single();

                    if (studentProfile) {
                        await (supabase.from('parent_links') as any).insert({
                            parent_id: authData.user.id,
                            student_id: (studentProfile as any).id,
                            student_phone: userData.phone,
                            verification_status: 'approved' // Automatically link for now
                        });
                    }
                } catch (err) {
                    console.error('Failed to auto-link parent:', err);
                    // Don't fail registration if linking fails, parent can link manually in dashboard
                }
            }

            return { error: null };
        } catch (err) {
            console.error('Sign up error:', err);
            return { error: err instanceof Error ? err.message : 'Sign up failed. Please try again.' };
        }
    };

    const signOut = async (): Promise<void> => {
        try {
            // 1. Sign out from Supabase
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Sign out error:', error);
            }

            // 2. Clear all local storage related to supabase to ensure no ghost sessions
            if (typeof window !== 'undefined') {
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.includes('supabase.auth.token') || key.startsWith('sb-'))) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));
                
                // Clear session storage too
                sessionStorage.clear();
                
                // Manually clear cookies if we can (though they might be HttpOnly)
                document.cookie.split(";").forEach((c) => {
                    document.cookie = c
                        .replace(/^ +/, "")
                        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });
            }
        } catch (err) {
            console.error('Sign out error:', err);
        } finally {
            // Always clear state and redirect, even if API call fails
            setState({
                user: null,
                role: null,
                isLoading: false,
                isAuthenticated: false,
            });
            router.push('/');
            router.refresh();
        }
    };

    const resetPassword = async (email: string): Promise<{ error: string | null }> => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                if (error.message.includes('Email not found')) {
                    return { error: 'No account found with this email address.' };
                }
                return { error: error.message };
            }

            return { error: null };
        } catch (err) {
            return { error: err instanceof Error ? err.message : 'Password reset failed' };
        }
    };

    const updatePassword = async (newPassword: string): Promise<{ error: string | null }> => {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) {
                if (error.message.includes('Password should be')) {
                    return { error: 'Password is too weak. Please use a stronger password.' };
                }
                return { error: error.message };
            }

            return { error: null };
        } catch (err) {
            return { error: err instanceof Error ? err.message : 'Password update failed' };
        }
    };

    const refreshUser = async (): Promise<void> => {
        await fetchUser();
    };

    return {
        ...state,
        signIn,
        signUp,
        signOut,
        refreshUser,
        resetPassword,
        updatePassword,
        signInWithGoogle,
    };
}
