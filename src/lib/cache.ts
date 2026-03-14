/**
 * Cache Layer with In-Memory Storage
 * 
 * Provides caching for:
 * - AI response caching
 * - Leaderboard caching
 * - Database query results
 * - Session management
 */

export interface CacheOptions {
    ttl?: number;
    prefix?: string;
}

const DEFAULT_TTL = 300; // 5 minutes

const memoryCache = new Map<string, {
    value: string;
    expiresAt: number;
}>();

export async function getCachedValue<T>(key: string): Promise<T | null> {
    const entry = memoryCache.get(key);
    if (entry && Date.now() < entry.expiresAt) {
        return JSON.parse(entry.value) as T;
    }
    memoryCache.delete(key);
    return null;
}

export async function setCachedValue<T>(
    key: string,
    value: T,
    ttlMs: number = DEFAULT_TTL * 1000
): Promise<void> {
    const serialized = JSON.stringify(value);
    memoryCache.set(key, {
        value: serialized,
        expiresAt: Date.now() + ttlMs,
    });
}

export async function deleteCachedValue(key: string): Promise<void> {
    memoryCache.delete(key);
}

export async function clearCachePattern(pattern: string): Promise<number> {
    let count = 0;
    for (const key of memoryCache.keys()) {
        if (key.includes(pattern)) {
            memoryCache.delete(key);
            count++;
        }
    }
    return count;
}

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

export function sanitizeCacheKey(input: string): string {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

export function cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, entry] of memoryCache.entries()) {
        if (now > entry.expiresAt) {
            memoryCache.delete(key);
        }
    }
}

if (typeof globalThis !== 'undefined') {
    setInterval(cleanupMemoryCache, 5 * 60 * 1000);
}

export function getCacheStats(): {
    memorySize: number;
} {
    return {
        memorySize: memoryCache.size,
    };
}
