/**
 * Redis Cache Layer for Hyperscale
 * 
 * Features:
 * - Session storage
 * - API response caching  
 * - AI response caching
 * - Leaderboard caching
 * - Rate limiting
 * - Exam state caching
 */

class RedisCache {
    private client: unknown = null;
    private isConnected = false;

    private getRedisUrl(): string {
        return process.env.REDIS_URL || process.env.REDIS_TLS_URL || '';
    }

    private async getClient() {
        if (this.client && this.isConnected) {
            return this.client;
        }

        const redisUrl = this.getRedisUrl();
        
        if (!redisUrl) {
            console.warn('[Redis] No Redis URL configured, caching disabled');
            return this.getDummyClient();
        }

        try {
            const Redis = (await import('ioredis')).default;
            this.client = new Redis(redisUrl, {
                maxRetriesPerRequest: 3,
                retryStrategy: (times: number) => Math.min(times * 50, 2000),
                enableReadyCheck: true,
                lazyConnect: true,
            });

            this.client.on('connect', () => {
                this.isConnected = true;
                console.log('[Redis] Connected');
            });

            this.client.on('error', (err: Error) => {
                console.error('[Redis] Error:', err.message);
            });

            this.client.on('close', () => {
                this.isConnected = false;
            });

            await (this.client as { connect: () => Promise<void> }).connect();
            return this.client;
        } catch (error) {
            console.error('[Redis] Connection failed:', error);
            return this.getDummyClient();
        }
    }

    private getDummyClient() {
        return {
            get: async () => null,
            set: async () => 'OK',
            setex: async () => 'OK',
            del: async () => 0,
            incr: async () => 1,
            expire: async () => 1,
            ttl: async () => -1,
            zadd: async () => 1,
            zrevrange: async () => [],
            scan: async () => ['0', []],
        };
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const client = await this.getClient() as { get: (key: string) => Promise<string | null> };
            const data = await client.get(key);
            if (!data) return null;
            return JSON.parse(data) as T;
        } catch {
            return null;
        }
    }

    async set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
        try {
            const client = await this.getClient() as { set: (key: string, val: string) => Promise<string>; setex: (key: string, ttl: number, val: string) => Promise<string> };
            const serialized = JSON.stringify(value);
            
            if (ttlSeconds) {
                await client.setex(key, ttlSeconds, serialized);
            } else {
                await client.set(key, serialized);
            }
            return true;
        } catch {
            return false;
        }
    }

    async delete(key: string): Promise<boolean> {
        try {
            const client = await this.getClient() as { del: (key: string) => Promise<number> };
            await client.del(key);
            return true;
        } catch {
            return false;
        }
    }

    async increment(key: string, ttlSeconds?: number): Promise<number> {
        try {
            const client = await this.getClient() as { incr: (key: string) => Promise<number>; expire: (key: string, ttl: number) => Promise<number> };
            const result = await client.incr(key);
            
            if (ttlSeconds && result === 1) {
                await client.expire(key, ttlSeconds);
            }
            
            return result;
        } catch {
            return 0;
        }
    }

    async getRateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
        try {
            const client = await this.getClient() as { incr: (key: string) => Promise<number>; expire: (key: string, ttl: number) => Promise<number>; ttl: (key: string) => Promise<number> };
            const current = await client.incr(key);
            
            if (current === 1) {
                await client.expire(key, windowSeconds);
            }
            
            const ttl = await client.ttl(key);
            const resetAt = Math.floor(Date.now() / 1000) + ttl;
            
            return {
                allowed: current <= limit,
                remaining: Math.max(0, limit - current),
                resetAt,
            };
        } catch {
            return { allowed: true, remaining: limit, resetAt: 0 };
        }
    }

    async cacheAPIResponse(key: string, data: unknown): Promise<boolean> {
        return this.set(key, data, 300);
    }

    async getCachedAPIResponse<T>(key: string): Promise<T | null> {
        return this.get<T>(key);
    }

    async cacheAIResponse(key: string, data: unknown): Promise<boolean> {
        return this.set(key, data, 3600);
    }

    async getCachedAIResponse<T>(key: string): Promise<T | null> {
        return this.get<T>(key);
    }

    async setLeaderboard(key: string, scores: Array<{ userId: string; score: number }>): Promise<boolean> {
        try {
            const client = await this.getClient() as { zadd: (key: string, score: number, member: string) => Promise<number>; expire: (key: string, ttl: number) => Promise<number> };
            
            for (const { userId, score } of scores) {
                await client.zadd(key, score, userId);
            }
            
            await client.expire(key, 3600);
            return true;
        } catch {
            return false;
        }
    }

    async getLeaderboard(key: string, start = 0, end = 9): Promise<Array<{ rank: number; userId: string; score: number }>> {
        try {
            const client = await this.getClient() as { zrevrange: (key: string, start: number, end: number, withScores: string) => Promise<string[]> };
            const results = await client.zrevrange(key, start, end, 'WITHSCORES');
            
            const leaderboard: Array<{ rank: number; userId: string; score: number }> = [];
            
            for (let i = 0; i < results.length; i += 2) {
                leaderboard.push({
                    rank: start + (i / 2) + 1,
                    userId: results[i],
                    score: parseFloat(results[i + 1] || '0'),
                });
            }
            
            return leaderboard;
        } catch {
            return [];
        }
    }

    async cacheExamState(examId: string, state: unknown): Promise<boolean> {
        return this.set(`exam:${examId}:state`, state, 7200);
    }

    async getExamState<T>(examId: string): Promise<T | null> {
        return this.get<T>(`exam:${examId}:state`);
    }

    async invalidateExamState(examId: string): Promise<boolean> {
        return this.delete(`exam:${examId}:state`);
    }

    async cacheUserSession(userId: string, session: unknown): Promise<boolean> {
        return this.set(`session:${userId}`, session, 86400);
    }

    async getUserSession<T>(userId: string): Promise<T | null> {
        return this.get<T>(`session:${userId}`);
    }

    async invalidateUserSession(userId: string): Promise<boolean> {
        return this.delete(`session:${userId}`);
    }
}

export const redisCache = new RedisCache();

export const CACHE_KEYS = {
    API: (endpoint: string) => `api:${endpoint}`,
    AI: (query: string) => `ai:${Buffer.from(query).toString('base64').slice(0, 50)}`,
    LEADERBOARD: (type: string) => `leaderboard:${type}`,
    EXAM_STATE: (examId: string) => `exam:${examId}:state`,
    USER_SESSION: (userId: string) => `session:${userId}`,
    RATE_LIMIT: (identifier: string) => `ratelimit:${identifier}`,
};

export default redisCache;
