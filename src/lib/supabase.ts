import { createClient } from '@supabase/supabase-js';
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

type DatabaseClient = Database['public'];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Browser client for client-side operations
export const createBrowserSupabaseClient = () => {
    return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
};

// Server client for server-side operations
export const createServerSupabaseClient = () => {
    return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
        cookies: {
            get(name: string) {
                return '';
            },
            set(name: string, value: string, options: Record<string, unknown>) {
                // No-op - will be overridden in actual server context
            },
            remove(name: string, options: Record<string, unknown>) {
                // No-op - will be overridden in actual server context
            },
        },
    });
};

// Admin client for privileged operations (server only)
export const createAdminSupabaseClient = () => {
    if (!supabaseServiceKey) {
        throw new Error(
            'SUPABASE_SERVICE_ROLE_KEY is required for admin operations'
        );
    }
    return createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
};

// Singleton instance for browser
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export const getSupabaseBrowserClient = () => {
    if (typeof window === 'undefined') {
        throw new Error('getSupabaseBrowserClient should only be called in browser environment');
    }

    if (!browserClient) {
        browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
    }

    return browserClient;
};

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: Error | null): void => {
    if (error) {
        console.error('Supabase Error:', error);
        throw new Error(error.message);
    }
};

// Helper to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
};

// Helper to get current user
export const getCurrentUser = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

// Helper to get user role
export const getUserRole = async (): Promise<string | null> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single() as { data: { role: string } | null; error: Error | null };

    if (error) {
        console.error('Error fetching user role:', error);
        return null;
    }

    return data?.role || null;
};

// Helper to check if user is admin
export const isAdmin = async (): Promise<boolean> => {
    const role = await getUserRole();
    return role === 'admin';
};

// Real-time subscription helper
export const subscribeToTable = (
    table: string,
    callback: (payload: unknown) => void,
    filter?: string
) => {
    const supabase = getSupabaseBrowserClient();

    const channel = supabase
        .channel(`${table}-changes`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: table,
                filter: filter,
            },
            callback
        )
        .subscribe();

    return channel;
};
