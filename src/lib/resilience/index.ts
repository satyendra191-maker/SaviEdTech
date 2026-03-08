type CircuitState = 'closed' | 'open' | 'half_open';

interface CircuitBreakerOptions {
    failureThreshold: number;
    resetTimeoutMs: number;
    halfOpenSuccessThreshold: number;
}

interface RetryOptions {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
}

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

class CircuitBreaker {
    private failures = 0;
    private successesInHalfOpen = 0;
    private state: CircuitState = 'closed';
    private openedAt = 0;

    constructor(private readonly options: CircuitBreakerOptions) {}

    isOpen(): boolean {
        if (this.state !== 'open') return false;
        const now = Date.now();
        if (now - this.openedAt >= this.options.resetTimeoutMs) {
            this.state = 'half_open';
            this.successesInHalfOpen = 0;
            return false;
        }
        return true;
    }

    getRetryAfterSeconds(): number {
        if (this.state !== 'open') return 0;
        const elapsed = Date.now() - this.openedAt;
        const remaining = Math.max(0, this.options.resetTimeoutMs - elapsed);
        return Math.ceil(remaining / 1000);
    }

    recordSuccess(): void {
        if (this.state === 'half_open') {
            this.successesInHalfOpen += 1;
            if (this.successesInHalfOpen >= this.options.halfOpenSuccessThreshold) {
                this.state = 'closed';
                this.failures = 0;
                this.successesInHalfOpen = 0;
            }
            return;
        }

        this.failures = 0;
    }

    recordFailure(): void {
        if (this.state === 'half_open') {
            this.trip();
            return;
        }

        this.failures += 1;
        if (this.failures >= this.options.failureThreshold) {
            this.trip();
        }
    }

    private trip(): void {
        this.state = 'open';
        this.openedAt = Date.now();
        this.successesInHalfOpen = 0;
    }
}

const circuitRegistry = new Map<string, CircuitBreaker>();
const cacheRegistry = new Map<string, CacheEntry<unknown>>();

function getOrCreateCircuitBreaker(
    key: string,
    options: CircuitBreakerOptions
): CircuitBreaker {
    const existing = circuitRegistry.get(key);
    if (existing) return existing;

    const breaker = new CircuitBreaker(options);
    circuitRegistry.set(key, breaker);
    return breaker;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt >= options.maxAttempts) break;

            const exponentialDelay = Math.min(
                options.maxDelayMs,
                options.baseDelayMs * 2 ** (attempt - 1)
            );
            const jitter = Math.floor(Math.random() * 150);
            await sleep(exponentialDelay + jitter);
        }
    }

    throw lastError;
}

export async function withCircuitBreaker<T>(
    circuitKey: string,
    operation: () => Promise<T>,
    options: CircuitBreakerOptions
): Promise<{ data: T; retryAfterSeconds?: number }> {
    const breaker = getOrCreateCircuitBreaker(circuitKey, options);

    if (breaker.isOpen()) {
        return {
            data: null as T,
            retryAfterSeconds: breaker.getRetryAfterSeconds(),
        };
    }

    try {
        const data = await operation();
        breaker.recordSuccess();
        return { data };
    } catch (error) {
        breaker.recordFailure();
        throw error;
    }
}

export function getCachedValue<T>(key: string): T | null {
    const cached = cacheRegistry.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
        cacheRegistry.delete(key);
        return null;
    }

    return cached.value as T;
}

export function setCachedValue<T>(key: string, value: T, ttlMs: number): void {
    cacheRegistry.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
    });
}

export function sanitizeCacheKey(input: string): string {
    return input.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 500);
}
