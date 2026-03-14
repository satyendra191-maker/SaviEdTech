/**
 * Sentry Configuration for Error Tracking
 * 
 * Install: npm install @sentry/nextjs
 * 
 * Environment variables required:
 * - SENTRY_ORG=your_sentry_org
 * - SENTRY_PROJECT=your_sentry_project
 * - SENTRY_AUTH_TOKEN=your_sentry_auth_token
 * - NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn (optional, for client-side)
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

export function initSentry() {
    if (!SENTRY_DSN) {
        console.warn('[Sentry] DSN not configured, error tracking disabled');
        return;
    }

    Sentry.init({
        dsn: SENTRY_DSN,
        
        // Performance monitoring
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        
        // Session replay
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        
        // Environment
        environment: process.env.NODE_ENV || 'development',
        
        // Release tracking
        release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'development',
        
        // Ignore certain errors
        ignoreErrors: [
            'Network Error',
            'ChunkLoadError',
            'Loading chunk',
            /ResizeObserver/,
        ],
        
        // Filter events
        beforeSend(event, hint) {
            // Filter out certain errors
            const error = hint.originalException;
            if (error instanceof Error) {
                // Don't capture certain errors
                if (error.message.includes('hydration')) {
                    return null;
                }
            }
            return event;
        },
        
        // Integration setup
        integrations: [
            Sentry.replayIntegration({
                maskAllText: true,
                blockAllMedia: true,
            }),
            Sentry.browserTracingIntegration(),
        ],
    });
}

/**
 * Capture custom error with context
 */
export function captureError(error: Error, context?: Record<string, unknown>) {
    if (SENTRY_DSN) {
        Sentry.captureException(error, {
            extra: context,
        });
    } else {
        console.error('[Error]', error, context);
    }
}

/**
 * Capture custom message with level
 */
export function captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    context?: Record<string, unknown>
) {
    if (SENTRY_DSN) {
        Sentry.captureMessage(message, {
            level,
            extra: context,
        });
    } else {
        console.log(`[${level}]`, message, context);
    }
}

/**
 * Set user context
 */
export function setUserContext(userId: string, email?: string) {
    Sentry.setUser({
        id: userId,
        email,
    });
}

/**
 * Clear user context (for logout)
 */
export function clearUserContext() {
    Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
    category: string,
    message: string,
    data?: Record<string, unknown>
) {
    Sentry.addBreadcrumb({
        category,
        message,
        data,
        level: 'info',
    });
}

export { Sentry };
