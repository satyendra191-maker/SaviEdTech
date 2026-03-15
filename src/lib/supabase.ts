/**
 * Supabase Client Configuration (Simplified)
 * Using only @supabase/supabase-js to avoid @supabase/ssr issues in Next.js 15
 */

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
    return createClient<Database>(supabaseUrl, supabaseAnonKey);
};

export const getSupabaseBrowserClient = () => {
    if (typeof window === 'undefined') return null;
    if (!browserClient) {
        browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
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
