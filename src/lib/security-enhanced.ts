/**
 * Enhanced Security Module with Redis Support
 * 
 * Features:
 * - Redis-backed distributed rate limiting
 * - Session management with expiration
 * - 2FA support infrastructure
 * - Advanced attack detection
 */

import { z } from 'zod';

// ============================================================================
// RATE LIMITING (Redis-backed with in-memory fallback)
// ============================================================================

interface RateLimitEntry {
    count: number;
    resetTime: number;
    slidingWindow?: Map<number, number>;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
    blockDurationMs?: number;
    useSlidingWindow?: boolean;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
    AUTH: {
        maxRequests: 5,
        windowMs: 15 * 60 * 1000,
        blockDurationMs: 30 * 60 * 1000,
    },
    API: {
        maxRequests: 100,
        windowMs: 60 * 1000,
        useSlidingWindow: true,
    },
    STRICT: {
        maxRequests: 3,
        windowMs: 60 * 60 * 1000,
        blockDurationMs: 60 * 60 * 1000,
    },
    PAYMENT: {
        maxRequests: 10,
        windowMs: 60 * 1000,
    },
    AI_QUERY: {
        maxRequests: 30,
        windowMs: 60 * 1000,
    },
} as const;

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    blocked?: boolean;
    retryAfter?: number;
}

export async function checkRateLimit(
    identifier: string,
    limit: RateLimitConfig
): Promise<RateLimitResult> {
    const now = Date.now();
    
    // Try Redis first if available
    if (globalThis.__redisClient) {
        try {
            return await checkRateLimitRedis(identifier, limit);
        } catch (error) {
            console.warn('[RateLimit] Redis failed, falling back to in-memory');
        }
    }
    
    // Fallback to in-memory
    return checkRateLimitMemory(identifier, limit, now);
}

async function checkRateLimitRedis(
    identifier: string,
    limit: RateLimitConfig
): Promise<RateLimitResult> {
    const redis = globalThis.__redisClient;
    const key = `ratelimit:${identifier}`;
    const windowSeconds = Math.ceil(limit.windowMs / 1000);
    
    const current = await redis.incr(key);
    
    if (current === 1) {
        await redis.expire(key, windowSeconds);
    }
    
    const ttl = await redis.ttl(key);
    const resetTime = Date.now() + (ttl > 0 ? ttl * 1000 : limit.windowMs);
    
    if (current > limit.maxRequests) {
        const blockDuration = limit.blockDurationMs || limit.windowMs;
        return {
            allowed: false,
            remaining: 0,
            resetTime,
            blocked: true,
            retryAfter: Math.ceil(blockDuration / 1000),
        };
    }
    
    return {
        allowed: true,
        remaining: limit.maxRequests - current,
        resetTime,
    };
}

function checkRateLimitMemory(
    identifier: string,
    limit: RateLimitConfig,
    now: number
): RateLimitResult {
    const entry = rateLimitStore.get(identifier);
    
    if (entry && now > entry.resetTime) {
        rateLimitStore.delete(identifier);
    }
    
    if (!entry) {
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
        const blockDuration = limit.blockDurationMs || limit.windowMs;
        return {
            allowed: false,
            remaining: 0,
            resetTime: entry.resetTime,
            blocked: true,
            retryAfter: Math.ceil(blockDuration / 1000),
        };
    }
    
    entry.count++;
    return {
        allowed: true,
        remaining: limit.maxRequests - entry.count,
        resetTime: entry.resetTime,
    };
}

export function generateRateLimitIdentifier(
    ip: string,
    route: string,
    type: 'auth' | 'api' | 'strict' | 'payment' | 'ai' = 'api'
): string {
    return `${type}:${ip}:${route}`;
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

export interface SessionData {
    userId: string;
    role: string;
    createdAt: number;
    expiresAt: number;
    lastActivity: number;
    ipAddress?: string;
    userAgent?: string;
    twoFactorVerified?: boolean;
}

const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const SESSION_EXTEND_ON_ACTIVITY = true;

export function createSession(userId: string, role: string, options?: {
    ipAddress?: string;
    userAgent?: string;
}): SessionData {
    const now = Date.now();
    return {
        userId,
        role,
        createdAt: now,
        expiresAt: now + SESSION_TIMEOUT_MS,
        lastActivity: now,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
        twoFactorVerified: false,
    };
}

export function isSessionValid(session: SessionData): boolean {
    const now = Date.now();
    return now < session.expiresAt && now < session.lastActivity + SESSION_TIMEOUT_MS;
}

export function extendSession(session: SessionData): SessionData {
    if (!SESSION_EXTEND_ON_ACTIVITY) return session;
    const now = Date.now();
    return {
        ...session,
        lastActivity: now,
        expiresAt: now + SESSION_TIMEOUT_MS,
    };
}

export function validateSessionAge(createdAt: number, maxAgeMs: number = SESSION_TIMEOUT_MS): boolean {
    return Date.now() - createdAt < maxAgeMs;
}

// ============================================================================
// 2FA SUPPORT
// ============================================================================

export interface TwoFactorConfig {
    enabled: boolean;
    method: 'totp' | 'sms' | 'email';
    lastVerified?: number;
}

export const twoFactorSchema = z.object({
    code: z.string().length(6, 'Verification code must be 6 digits'),
    userId: z.string().uuid(),
    method: z.enum(['totp', 'sms', 'email']),
});

// ============================================================================
// INPUT VALIDATION (Enhanced)
// ============================================================================

export const emailSchema = z
    .string()
    .min(5, 'Email must be at least 5 characters')
    .max(254, 'Email must not exceed 254 characters')
    .email('Invalid email format')
    .refine((email) => !email.includes('..'), 'Email cannot contain consecutive dots')
    .refine((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Invalid email domain');

export const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const phoneSchema = z
    .string()
    .regex(/^\+?[\d\s\-()]{10,20}$/, 'Invalid phone number format');

export const uuidSchema = z.string().uuid('Invalid UUID format');

// ============================================================================
// INPUT SANITIZATION (Enhanced)
// ============================================================================

export function sanitizeInput(input: string): string {
    if (!input) return '';

    return input
        .replace(/<[^>]*>/g, '')
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/data:/gi, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\0/g, '');
}

export function sanitizeUrl(url: string): string {
    if (!url) return '';

    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return '';
        }
        return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}${parsed.search}`;
    } catch {
        if (url.startsWith('/') && !url.startsWith('//')) {
            return url.replace(/[<>'"]/g, '');
        }
        return '';
    }
}

export function escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// SECURITY HEADERS
// ============================================================================

export const SECURITY_HEADERS = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-DNS-Prefetch-Control': 'on',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Permissions-Policy': 'camera=(self), microphone=(self), display-capture=(self), geolocation=(), interest-cohort=()',
} as const;

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

export async function validateJsonBody<T>(
    request: Request,
    schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
    try {
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

export function isTrustedRequest(request: Request, allowedOrigins: string[]): boolean {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    if (!origin && !referer) return true;

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

export function generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

// ============================================================================
// ATTACK DETECTION
// ============================================================================

export const SECURITY_CONSTANTS = {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 30,
    SESSION_TIMEOUT_MINUTES: 60,
    PASSWORD_RESET_TOKEN_EXPIRY_HOURS: 1,
    API_KEY_ROTATION_DAYS: 90,
    SUSPICIOUS_PATTERNS: [
        /\b(union\s+select|insert\s+into|delete\s+from|drop\s+table)\b/i,
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
        /javascript:/i,
        /<[^>]*\son\w+\s*=/i,
        /\.\.\//,
        /%00/,
    ],
};

export function containsSuspiciousPatterns(input: string): boolean {
    return SECURITY_CONSTANTS.SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(input));
}

// ============================================================================
// CLEANUP
// ============================================================================

export function cleanupRateLimitStore(): void {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}

// Run cleanup every 5 minutes
if (typeof globalThis !== 'undefined') {
    setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

// ============================================================================
// REDIS CLIENT INITIALIZATION
// ============================================================================

declare global {
    var __redisClient: RedisClient | undefined;
}

export interface RedisClient {
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    ttl(key: string): Promise<number>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, mode?: 'EX' | 'PX', duration?: number): Promise<'OK'>;
    del(key: string): Promise<number>;
}

export async function initRedisClient(url?: string): Promise<RedisClient | null> {
    if (!url) {
        console.warn('[Redis] No Redis URL provided, using in-memory fallback');
        return null;
    }

    try {
        // Dynamic import for ioredis in production
        const Redis = await import('ioredis').catch(() => null);
        if (!Redis) {
            console.warn('[Redis] ioredis not installed, using in-memory fallback');
            return null;
        }

        const redis = new Redis.default(url);
        
        // Test connection
        await redis.ping();
        
        console.log('[Redis] Connected successfully');
        
        globalThis.__redisClient = {
            incr: (key) => redis.incr(key),
            expire: (key, seconds) => redis.expire(key, seconds),
            ttl: (key) => redis.ttl(key),
            get: (key) => redis.get(key),
            set: (key, value, mode, duration) => {
                if (mode && duration) {
                    return redis.set(key, value, mode, duration);
                }
                return redis.set(key, value);
            },
            del: (key) => redis.del(key),
        };
        
        return globalThis.__redisClient;
    } catch (error) {
        console.error('[Redis] Failed to connect:', error);
        return null;
    }
}

export function getRedisClient(): RedisClient | undefined {
    return globalThis.__redisClient;
}
