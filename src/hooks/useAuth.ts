'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import type { User, UserRole } from '@/types';

interface AuthState {
    user: User | null;
    role: UserRole | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

interface UseAuthReturn extends AuthState {
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signUp: (email: string, password: string, userData: Partial<User>) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
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
        userData: Partial<User>
    ): Promise<{ error: string | null }> => {
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: userData.full_name,
                        phone: userData.phone,
                        exam_target: userData.exam_target,
                        class_level: userData.class_level,
                        city: userData.city,
                    },
                },
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
        await supabase.auth.signOut();
        router.push('/');
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
    };
}
