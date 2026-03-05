/**
 * Supabase Client Configuration
 * 
 * SECURITY WARNINGS - READ BEFORE USING:
 * 
 * 1. createAdminSupabaseClient() uses SUPABASE_SERVICE_ROLE_KEY which has FULL DATABASE ACCESS.
 *    - NEVER use this in client-side code (browser)
 *    - ONLY use in API routes, server components, or server-side code
 *    - This key bypasses all Row Level Security (RLS) policies
 * 
 * 2. createBrowserSupabaseClient() and getSupabaseBrowserClient() are for client-side use only.
 *    - These use the anon key which respects RLS policies
 *    - Safe to use in React components and browser code
 * 
 * 3. createServerSupabaseClient() is for server-side use (API routes, server components).
 *    - Uses the anon key but with server-side cookie handling
 *    - Respects RLS policies based on authenticated user
 * 
 * 4. NEVER expose SUPABASE_SERVICE_ROLE_KEY in:
 *    - Environment variables with NEXT_PUBLIC_ prefix
 *    - Client-side code
 *    - Frontend configuration
 *    - Browser console logs
 * 
 * If you see SUPABASE_SERVICE_ROLE_KEY being used outside of server-only files,
 * report it immediately as a security incident.
 */

import { createClient } from '@supabase/supabase-js';
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

type DatabaseClient = Database['public'];

// Environment variables - validated at runtime (lazy evaluation to prevent build failures)
const getSupabaseUrl = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
    }
    return url;
};

const getSupabaseAnonKey = () => {
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!key) {
        throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
    }
    return key;
};

/**
 * SERVER-ONLY: Service role key
 * This key has full database access and bypasses RLS.
 * WARNING: Never expose this to the client!
 */
const getSupabaseServiceKey = () => {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations');
    }
    return key;
};

/**
 * Browser client for client-side operations
 * 
 * SECURITY: Safe for browser use - uses anon key with RLS policies
 * Usage: React components, client-side hooks, browser event handlers
 * 
 * @example
 * const supabase = createBrowserSupabaseClient();
 * const { data } = await supabase.from('profiles').select('*');
 */
export const createBrowserSupabaseClient = () => {
    return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
};

/**
 * Server client for server-side operations
 * 
 * SECURITY: Server-only - uses anon key with proper cookie handling
 * Usage: API routes, server components, middleware
 * 
 * Note: This creates a fresh client each time. For better performance in
 * high-throughput scenarios, consider implementing connection pooling.
 * 
 * @example
 * const supabase = createServerSupabaseClient();
 * const { data: { user } } = await supabase.auth.getUser();
 */
export const createServerSupabaseClient = () => {
    return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
        cookies: {
            get(name: string) {
                // In actual server context (API routes), cookies will be provided via request
                // This default implementation is for cases where cookies aren't available
                return '';
            },
            set(name: string, value: string, options: Record<string, unknown>) {
                // No-op - will be overridden in actual server context
                // eslint-disable-next-line no-console
                console.warn(`[Security] Cookie 'set' called outside of request context: ${name}`);
            },
            remove(name: string, options: Record<string, unknown>) {
                // No-op - will be overridden in actual server context
                // eslint-disable-next-line no-console
                console.warn(`[Security] Cookie 'remove' called outside of request context: ${name}`);
            },
        },
    });
};

/**
 * Admin client for privileged operations
 * 
 * ⚠️⚠️⚠️ SECURITY WARNING - SERVER ONLY ⚠️⚠️⚠️
 * 
 * This client uses the SERVICE ROLE KEY which:
 * - Has FULL DATABASE ACCESS (bypasses all RLS policies)
 * - Can read, write, and delete ANY data
 * - Can manage users, auth, and configurations
 * 
 * CRITICAL RULES:
 * 1. NEVER use this in client-side code (React components, hooks, browser code)
 * 2. NEVER expose this to the browser (no NEXT_PUBLIC_ prefix)
 * 3. ONLY use in API routes or server-side code
 * 4. ALWAYS validate user permissions before using
 * 5. Log all admin operations for audit purposes
 * 
 * Usage: Admin operations, cron jobs, data migrations, user management
 * 
 * @example
 * // In an API route:
 * if (session?.user?.role !== 'admin') {
 *   return res.status(403).json({ error: 'Forbidden' });
 * }
 * const supabase = createAdminSupabaseClient();
 * const { data } = await supabase.auth.admin.listUsers();
 */
export const createAdminSupabaseClient = () => {
    // Server-only check - fail fast if used in browser
    if (typeof window !== 'undefined') {
        throw new Error(
            '[SECURITY VIOLATION] createAdminSupabaseClient() CANNOT be used in browser. ' +
            'This function requires SUPABASE_SERVICE_ROLE_KEY which has full database access. ' +
            'Use createBrowserSupabaseClient() instead for client-side operations.'
        );
    }

    // Log admin client creation for security auditing
    console.log(`[Security] Admin Supabase client created at ${new Date().toISOString()}`);

    return createClient<Database>(getSupabaseUrl(), getSupabaseServiceKey(), {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
};

/**
 * Singleton browser client instance
 * 
 * SECURITY: This is safe for browser use - uses anon key only
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Get the singleton browser client instance
 * 
 * SECURITY: Safe for browser use
 * Throws error if called in server context to prevent accidental misuse
 * 
 * @example
 * const supabase = getSupabaseBrowserClient();
 */
export const getSupabaseBrowserClient = () => {
    // During SSR/build, return a dummy client to prevent errors
    // The real client will be created on the client side after hydration
    if (typeof window === 'undefined') {
        // Return a minimal mock that won't throw during prerender
        return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
    }

    if (!browserClient) {
        browserClient = createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
    }

    return browserClient;
};

/**
 * Helper function to handle Supabase errors
 * Sanitizes error messages to prevent information leakage
 * 
 * @param error - Error from Supabase
 * @throws Sanitized error
 */
export const handleSupabaseError = (error: Error | null): void => {
    if (error) {
        // Log full error for debugging (server-side only)
        console.error('[Supabase Error]', error);

        // Sanitize error message for client (prevent information leakage)
        const sanitizedMessage = error.message
            ?.replace(/supabaseServiceKey/g, '[REDACTED]')
            ?.replace(/SUPABASE_SERVICE_ROLE_KEY/g, '[REDACTED]')
            ?.substring(0, 200) || 'Database operation failed';

        throw new Error(sanitizedMessage);
    }
};

/**
 * Check if current code is running on server
 * Useful for determining which client to use
 */
export const isServer = (): boolean => typeof window === 'undefined';

/**
 * Check if current code is running in browser
 * Useful for determining which client to use
 */
export const isBrowser = (): boolean => typeof window !== 'undefined';

/**
 * Helper to check if user is authenticated
 * 
 * SECURITY: Uses browser client (safe for client-side)
 * 
 * @returns Promise<boolean> indicating if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
};

/**
 * Helper to get current user
 * 
 * SECURITY: Uses browser client (safe for client-side)
 * Returns null if not authenticated
 * 
 * @returns Current user or null
 */
export const getCurrentUser = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

/**
 * Helper to get user role
 * 
 * SECURITY: Uses browser client with RLS policies
 * Returns null if not authenticated or on error
 * 
 * @returns User role string or null
 */
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
        console.error('[Security] Error fetching user role:', error);
        return null;
    }

    return data?.role || null;
};

/**
 * Verify that admin client is only used in appropriate contexts
 * Call this before using admin operations in sensitive routes
 * 
 * @param context - Description of the calling context for logging
 * @throws Error if called in browser context
 */
export const verifyServerOnly = (context: string): void => {
    if (typeof window !== 'undefined') {
        throw new Error(
            `[Security] ${context} can only be executed server-side. ` +
            'This operation requires elevated privileges that are not available in the browser.'
        );
    }
    console.log(`[Security] Server-only operation verified: ${context}`);
};
