import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Singleton browser client
 */
let browserClient: any = null;

export const createBrowserSupabaseClient = () => {
    if (typeof window === 'undefined') return null;
    return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
};

export const getSupabaseBrowserClient = () => {
    if (typeof window === 'undefined') return null;
    if (!browserClient) {
        browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: false, // Recommended for Next.js 15 SSR callback routes
                flowType: 'pkce'
            }
        });
    }
    return browserClient;
};

export const createServerSupabaseClient = () => {
    return createClient<Database>(supabaseUrl, supabaseAnonKey);
};

export const createAdminSupabaseClient = () => {
    if (typeof window !== 'undefined') {
        throw new Error('Cannot use admin client in browser');
    }
    return createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};

export const handleSupabaseError = (error: any) => {
    if (error) {
        console.error('[Supabase Error]', error);
        throw error;
    }
};

export const isServer = () => typeof window === 'undefined';
export const isBrowser = () => typeof window !== 'undefined';

export const getUserRole = async (userId: string): Promise<string | null> => {
    const supabase = createServerSupabaseClient();
    const result: { data: { role: string } | null; error: Error | null } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
    if (!result.data) return null;
    return result.data.role ?? null;
};

export const isAuthenticated = async (): Promise<boolean> => {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
};
