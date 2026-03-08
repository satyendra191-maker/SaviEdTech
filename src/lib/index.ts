/**
 * SaviEduTech Platform Utilities Index
 * 
 * Features 21-23: Database Validation, Error Handling, Performance Optimization
 */

// Feature 21: Database Validation System
export * from './database/schema-validator';

// Feature 22: Error Handling System  
export * from './error-handler';

// Feature 23: Performance Optimization
export * from './performance';

// Re-export security utilities
export { checkRateLimit, RATE_LIMITS, type RateLimitConfig } from './security';

// Re-export supabase utilities
export {
    createBrowserSupabaseClient,
    createServerSupabaseClient,
    createAdminSupabaseClient,
    getSupabaseBrowserClient,
    handleSupabaseError,
    getUserRole,
    isAuthenticated
} from './supabase';

// Re-export resilience utilities
export { withRetry, withCircuitBreaker, getCachedValue, setCachedValue } from './resilience';
