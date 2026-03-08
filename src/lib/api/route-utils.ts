import { NextRequest } from 'next/server';
import { errorResponse, formatApiError } from '@/lib/error-handler';
import { recordApiRequestMetric } from '@/lib/performance';

function getClientIp(request: NextRequest): string | null {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0]?.trim() || null;
    }

    return request.headers.get('x-real-ip');
}

export function clampInteger(value: string | null, fallback: number, min: number, max: number): number {
    const parsed = Number.parseInt(value || '', 10);

    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(Math.max(parsed, min), max);
}

export async function monitoredRoute(
    request: NextRequest,
    handler: () => Promise<Response>,
    options?: {
        routeLabel?: string;
        defaultCacheControl?: string;
        metadata?: Record<string, unknown>;
        userId?: string | null;
    }
): Promise<Response> {
    const routeLabel = options?.routeLabel || new URL(request.url).pathname;
    const startedAt = performance.now();

    try {
        const response = await handler();
        const durationMs = Math.round(performance.now() - startedAt);

        if (options?.defaultCacheControl && !response.headers.get('Cache-Control')) {
            response.headers.set('Cache-Control', options.defaultCacheControl);
        }

        void recordApiRequestMetric({
            endpoint: routeLabel,
            method: request.method,
            statusCode: response.status,
            durationMs,
            userId: options?.userId ?? null,
            cacheStatus: response.headers.get('x-savi-cache'),
            metadata: {
                ...(options?.metadata || {}),
                fallback: response.headers.get('x-savi-fallback') === 'true',
            },
        });

        return response;
    } catch (error) {
        const appError = formatApiError(error);
        const durationMs = Math.round(performance.now() - startedAt);

        void recordApiRequestMetric({
            endpoint: routeLabel,
            method: request.method,
            statusCode: appError.statusCode,
            durationMs,
            errorType: appError.type,
            userId: options?.userId ?? null,
            metadata: options?.metadata,
        });

        return errorResponse(appError, {
            ...(options?.metadata || {}),
            path: routeLabel,
            method: request.method,
            userAgent: request.headers.get('user-agent'),
            ipAddress: getClientIp(request),
            userId: options?.userId ?? null,
        });
    }
}
