/**
 * Redis Cache Layer with In-Memory Fallback
 * 
 * Provides distributed caching for:
 * - AI response caching
 * - Leaderboard caching
 * - Database query results
 * - Session management
 * - Rate limiting
 */

import { getRedisClient, type RedisClient } from './security-enhanced';

export interface CacheOptions {
    ttl?: number; // Time to live in seconds
    prefix?: string;
}

const DEFAULT_TTL = 300; // 5 minutes

const memoryCache = new Map<string, {
    value: string;
    expiresAt: number;
}>();

/**
 * Get cached value
 */
export async function getCachedValue<T>(key: string): Promise<T | null> {
    const redis = getRedisClient();
    
    if (redis) {
        try {
            const value = await redis.get(`cache:${key}`);
            if (value) {
                return JSON.parse(value) as T;
            }
            return null;
        } catch (error) {
            console.warn('[Cache] Redis get failed, falling back to memory');
        }
    }
    
    // Fallback to memory
    const entry = memoryCache.get(key);
    if (entry && Date.now() < entry.expiresAt) {
        return JSON.parse(entry.value) as T;
    }
    memoryCache.delete(key);
    return null;
}

/**
 * Set cached value
 */
export async function setCachedValue<T>(
    key: string,
    value: T,
    ttlMs: number = DEFAULT_TTL * 1000
): Promise<void> {
    const redis = getRedisClient();
    const serialized = JSON.stringify(value);
    const ttlSeconds = Math.ceil(ttlMs / 1000);
    
    if (redis) {
        try {
            await redis.set(`cache:${key}`, serialized, 'EX', ttlSeconds);
            return;
        } catch (error) {
            console.warn('[Cache] Redis set failed, falling back to memory');
        }
    }
    
    // Fallback to memory
    memoryCache.set(key, {
        value: serialized,
        expiresAt: Date.now() + ttlMs,
    });
}

/**
 * Delete cached value
 */
export async function deleteCachedValue(key: string): Promise<void> {
    const redis = getRedisClient();
    
    if (redis) {
        try {
            await redis.del(`cache:${key}`);
        } catch (error) {
            console.warn('[Cache] Redis delete failed');
        }
    }
    
    memoryCache.delete(key);
}

/**
 * Clear cache by pattern
 */
export async function clearCachePattern(pattern: string): Promise<number> {
    const redis = getRedisClient();
    let count = 0;
    
    if (redis) {
        // Redis KEYS is not recommended for production, but useful for cleanup
        // Consider using SCAN in production
        try {
            const keys = await redis.get(`cache:${pattern}*`);
            if (keys) {
                for (const key of keys.split('\n')) {
                    if (key) {
                        await redis.del(key);
                        count++;
                    }
                }
            }
        } catch (error) {
            console.warn('[Cache] Redis pattern clear failed');
        }
    }
    
    // Clear matching memory cache entries
    for (const key of memoryCache.keys()) {
        if (key.includes(pattern)) {
            memoryCache.delete(key);
            count++;
        }
    }
    
    return count;
}

/**
 * Get or set cache pattern
 */
export async function getOrSetCachedValue<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = DEFAULT_TTL * 1000
): Promise<T> {
    const cached = await getCachedValue<T>(key);
    if (cached !== null) {
        return cached;
    }
    
    const value = await fetcher();
    await setCachedValue(key, value, ttlMs);
    return value;
}

/**
 * Sanitize cache key
 */
export function sanitizeCacheKey(input: string): string {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

/**
 * Clean up expired memory cache entries
 * Should be called periodically
 */
export function cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, entry] of memoryCache.entries()) {
        if (now > entry.expiresAt) {
            memoryCache.delete(key);
        }
    }
}

// Run cleanup every 5 minutes
if (typeof globalThis !== 'undefined') {
    setInterval(cleanupMemoryCache, 5 * 60 * 1000);
}

/**
 * Cache statistics
 */
export function getCacheStats(): {
    memorySize: number;
    redisConnected: boolean;
} {
    return {
        memorySize: memoryCache.size,
        redisConnected: !!getRedisClient(),
    };
}
