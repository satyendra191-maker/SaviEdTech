/**
 * Security Utilities Module
 * 
 * IMPORTANT: This module contains security-critical functions.
 * All functions here should be used carefully and reviewed regularly.
 * 
 * Security measures implemented:
 * - Rate limiting to prevent brute force attacks (in-memory)
 * - Input sanitization to prevent XSS and injection attacks
 * - Request validation to ensure data integrity
 * - Security headers for browser protection
 * - Session management with expiration
 * - 2FA support infrastructure
 * 
 * For enhanced security with Redis, use src/lib/security-enhanced.ts
 */

import { z } from 'zod';

// ============================================================================
// RATE LIMITING (In-Memory)
// ============================================================================

/**
 * Rate limit store using in-memory Map (fallback when Redis unavailable)
 * In production, configure Redis via environment variable REDIS_URL
 */
interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limit configuration type
 */
export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

/**
 * Rate limit configuration
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
    // Auth endpoints: 5 attempts per 15 minutes
    AUTH: {
        maxRequests: 5,
        windowMs: 15 * 60 * 1000, // 15 minutes
    },
    // General API: 100 requests per minute
    API: {
        maxRequests: 100,
        windowMs: 60 * 1000, // 1 minute
    },
    // Strict rate limit for sensitive operations: 3 attempts per hour
    STRICT: {
        maxRequests: 3,
        windowMs: 60 * 60 * 1000, // 1 hour
    },
} as const;

/**
 * Check if a request should be rate limited
 * Uses in-memory rate limiting
 * 
 * @param identifier - Unique identifier (IP + route, user ID, etc.)
 * @param limit - Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
    identifier: string,
    limit: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    
    // In-memory rate limiting
    const entry = rateLimitStore.get(identifier);

    // Clean up expired entries
    if (entry && now > entry.resetTime) {
        rateLimitStore.delete(identifier);
    }

    if (!entry) {
        // First request in this window
        rateLimitStore.set(identifier, {
            count: 1,
            resetTime: now + limit.windowMs,
        });
        return {
            allowed: true,
            remaining: limit.maxRequests - 1,
            resetTime: now + limit.windowMs,
        };
    }

    if (entry.count >= limit.maxRequests) {
        // Rate limit exceeded
        return {
            allowed: false,
            remaining: 0,
            resetTime: entry.resetTime,
        };
    }

    // Increment count
    entry.count++;
    return {
        allowed: true,
        remaining: limit.maxRequests - entry.count,
        resetTime: entry.resetTime,
    };
}

/**
 * Generate rate limit identifier from request
 * Combines IP address and route for granular rate limiting
 */
export function generateRateLimitIdentifier(
    ip: string,
    route: string,
    type: 'auth' | 'api' | 'strict' = 'api'
): string {
    return `${type}:${ip}:${route}`;
}

// ============================================================================
// INPUT VALIDATION SCHEMAS (ZOD)
// ============================================================================

/**
 * Common validation schemas for form inputs
 * Using Zod for type-safe validation
 */

// Email validation with strict checks
export const emailSchema = z
    .string()
    .min(5, 'Email must be at least 5 characters')
    .max(254, 'Email must not exceed 254 characters')
    .email('Invalid email format')
    .refine((email) => !email.includes('..'), 'Email cannot contain consecutive dots')
    .refine(
        (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        'Email must have a valid domain'
    );

// Password validation with security requirements
export const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Username validation
export const usernameSchema = z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must not exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

// Phone number validation
export const phoneSchema = z
    .string()
    .regex(/^\+?[\d\s-()]{10,20}$/, 'Invalid phone number format');

// UUID validation
export const uuidSchema = z
    .string()
    .uuid('Invalid UUID format');

// Generic text input sanitization
export const textSchema = z
    .string()
    .min(1, 'Field is required')
    .max(5000, 'Input too long')
    .refine(
        (text) => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(text),
        'Input contains forbidden content'
    );

// Search query validation
export const searchQuerySchema = z
    .string()
    .max(200, 'Search query too long')
    .regex(/^[\w\s\-._@]+$/, 'Search query contains invalid characters');

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitize user input to prevent XSS attacks
 * Removes potentially dangerous HTML and scripts
 * 
 * @param input - Raw user input
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
    if (!input) return '';

    return input
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Remove script tags and their content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove event handlers
        .replace(/on\w+\s*=/gi, '')
        // Remove javascript: protocol
        .replace(/javascript:/gi, '')
        // Remove data: protocol (can be used for XSS)
        .replace(/data:/gi, '')
        // Escape special HTML characters
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#x27;')
        // Remove null bytes
        .replace(/\0/g, '');
}

/**
 * Sanitize URL to prevent open redirects and XSS
 * 
 * @param url - Raw URL input
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
    if (!url) return '';

    try {
        const parsed = new URL(url);

        // Only allow http and https protocols
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return '';
        }

        // Reconstruct safe URL
        return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}${parsed.search}`;
    } catch {
        // If URL parsing fails, check if it's a relative path
        if (url.startsWith('/') && !url.startsWith('//')) {
            // Allow relative paths
            return url.replace(/[<>'"]/g, '');
        }
        return '';
    }
}

/**
 * Escape special regex characters in a string
 * Useful for creating safe regex patterns from user input
 */
export function escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// SECURITY HEADERS
// ============================================================================

/**
 * Security headers configuration for Next.js
 * These headers protect against various web attacks
 */
export const SECURITY_HEADERS = {
    // Prevent clickjacking attacks
    'X-Frame-Options': 'DENY',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Enable XSS protection in browsers
    'X-XSS-Protection': '1; mode=block',

    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // DNS prefetch control
    'X-DNS-Prefetch-Control': 'on',

    // HSTS (HTTPS Strict Transport Security)
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',

    // Permissions policy (formerly Feature Policy)
    'Permissions-Policy': 'camera=(self), microphone=(self), display-capture=(self), geolocation=(), interest-cohort=()',
};

/**
 * Content Security Policy
 * Defines approved sources for content loading
 */
export const CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://checkout.razorpay.com https://cdn.razorpay.com https://js.razorpay.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://cdn.razorpay.com https://lumberjack.razorpay.com",
    "media-src 'self' https:",
    "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://api.razorpay.com https://checkout.razorpay.com",
].join('; ');

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

/**
 * Validate and parse JSON body from request
 * Prevents JSON parsing attacks and large payloads
 */
export async function validateJsonBody<T>(
    request: Request,
    schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
    try {
        // Check content length (max 1MB)
        const contentLength = request.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 1024 * 1024) {
            return { success: false, error: 'Request body too large' };
        }

        const body = await request.json();
        const result = schema.safeParse(body);

        if (!result.success) {
            return {
                success: false,
                error: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
            };
        }

        return { success: true, data: result.data };
    } catch {
        return { success: false, error: 'Invalid JSON body' };
    }
}

/**
 * Check if request is from a trusted source
 * Validates origin and referer headers
 */
export function isTrustedRequest(request: Request, allowedOrigins: string[]): boolean {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    // If no origin/referer, might be a same-origin request
    if (!origin && !referer) {
        return true;
    }

    const checkUrl = origin || referer;
    if (!checkUrl) return false;

    try {
        const url = new URL(checkUrl);
        return allowedOrigins.some((allowed) => {
            if (allowed.includes('*')) {
                const regex = new RegExp('^' + allowed.replace(/\*/g, '.*') + '$');
                return regex.test(url.hostname);
            }
            return url.hostname === allowed;
        });
    } catch {
        return false;
    }
}

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

/**
 * Generate secure random token
 * Uses crypto API for cryptographically secure randomness
 */
export function generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash sensitive data using SHA-256
 * Note: For passwords, use bcrypt or Argon2 instead
 */
export async function hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Constant time comparison to prevent timing attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

// ============================================================================
// SECURITY CONSTANTS
// ============================================================================

/**
 * Security-related constants
 */
export const SECURITY_CONSTANTS = {
    // Maximum login attempts before temporary lockout
    MAX_LOGIN_ATTEMPTS: 5,

    // Lockout duration in minutes
    LOCKOUT_DURATION_MINUTES: 30,

    // Session timeout in minutes
    SESSION_TIMEOUT_MINUTES: 60,

    // Password reset token expiry in hours
    PASSWORD_RESET_TOKEN_EXPIRY_HOURS: 1,

    // API key rotation interval in days
    API_KEY_ROTATION_DAYS: 90,

    // Suspicious patterns to block
    SUSPICIOUS_PATTERNS: [
        /\b(union\s+select|insert\s+into|delete\s+from|drop\s+table)\b/i,
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
        /javascript:/i,
        // Match event handlers only in HTML-like attribute context (avoids false positives like "phone=")
        /<[^>]*\son\w+\s*=/i,
        /\.\.\//, // Path traversal
        /%00/, // Null byte injection
    ],
};

/**
 * Check if input contains suspicious patterns
 * Used to detect potential attacks
 */
export function containsSuspiciousPatterns(input: string): boolean {
    return SECURITY_CONSTANTS.SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(input));
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clean up old rate limit entries periodically
 * Call this periodically to prevent memory leaks
 */
export function cleanupRateLimitStore(): void {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}

// Run cleanup every 10 minutes
if (typeof globalThis !== 'undefined') {
    setInterval(cleanupRateLimitStore, 10 * 60 * 1000);
}
