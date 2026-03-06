'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient, createAdminSupabaseClient } from '@/lib/supabase';
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
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchUser, supabase]);

    const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                // Provide user-friendly error messages
                if (error.message.includes('Invalid login credentials')) {
                    return { error: 'Invalid email or password. Please try again.' };
                }
                if (error.message.includes('Email not confirmed')) {
                    return { error: 'Please verify your email before signing in.' };
                }
                return { error: error.message };
            }

            await fetchUser();
            return { error: null };
        } catch (err) {
            return { error: err instanceof Error ? err.message : 'Sign in failed' };
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

            // Step 2: Create profile using admin client (service role key)
            try {
                const roleValue = userData.role || 'student';
                const examValue = userData.exam_target || null;
                const classValue = userData.class_level || null;
                
                // Use admin client for profile creation
                const adminClient = createAdminSupabaseClient();
                
                const { error: profileError } = await (adminClient.from('profiles') as any).insert({
                    id: authData.user.id,
                    email: email,
                    full_name: userData.full_name || 'User',
                    phone: userData.phone || null,
                    role: roleValue,
                    exam_target: examValue,
                    class_level: classValue,
                    is_active: true,
                });

                if (profileError) {
                    console.error('Profile creation error:', profileError.message);
                }

                // Step 3: Create student profile only for students
                if (roleValue === 'student') {
                    await (adminClient.from('student_profiles') as any).insert({
                        id: authData.user.id,
                        study_streak: 0,
                        longest_streak: 0,
                        total_study_minutes: 0,
                        subscription_status: 'free',
                    }).catch(() => {});
                }
            } catch (profileErr) {
                console.error('Profile creation error:', profileErr);
            }

            return { error: null };
        } catch (err) {
            console.error('Sign up error:', err);
            return { error: err instanceof Error ? err.message : 'Sign up failed. Please try again.' };
        }
    };

    const signOut = async (): Promise<void> => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Sign out error:', error);
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
    };
}
