import { NextRequest, NextResponse } from 'next/server';
import { monitoredRoute } from '@/lib/api/route-utils';
import { createApiError, ErrorType, errorResponse, logError, validateRequiredFields } from '@/lib/error-handler';

interface ClientErrorPayload {
    boundary?: unknown;
    message?: unknown;
    stack?: unknown;
    digest?: unknown;
    componentStack?: unknown;
    metadata?: unknown;
    url?: unknown;
    userAgent?: unknown;
    timestamp?: unknown;
}

function normalizeText(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, maxLength) : null;
}

export async function POST(request: NextRequest) {
    return monitoredRoute(request, async () => {
        const body = await request.json().catch(() => null) as ClientErrorPayload | null;

        if (!body || typeof body !== 'object') {
            return errorResponse(
                createApiError(ErrorType.VALIDATION, 'Invalid client error payload.', { statusCode: 400 }),
                { path: '/api/client-errors', method: request.method }
            );
        }

        const requiredFieldsError = validateRequiredFields(body as Record<string, unknown>, ['boundary', 'message']);
        if (requiredFieldsError) {
            return errorResponse(requiredFieldsError, {
                path: '/api/client-errors',
                method: request.method,
            });
        }

        const message = normalizeText(body.message, 600) || 'Unknown client error';
        const stack = normalizeText(body.stack, 8000);
        const boundary = normalizeText(body.boundary, 120) || 'unknown-boundary';
        const userAgent = normalizeText(body.userAgent, 500);
        const url = normalizeText(body.url, 500);

        logError(
            createApiError(ErrorType.UNKNOWN, message, {
                code: 'CLIENT_ERROR',
                details: {
                    digest: normalizeText(body.digest, 200),
                    componentStack: normalizeText(body.componentStack, 4000),
                },
            }),
            {
                errorType: 'CLIENT_ERROR',
                path: url || '/client',
                method: 'CLIENT',
                userAgent,
                stackTrace: stack,
                boundary,
                clientTimestamp: normalizeText(body.timestamp, 80),
                metadata: typeof body.metadata === 'object' && body.metadata !== null ? body.metadata : {},
            }
        );

        return NextResponse.json(
            { success: true },
            {
                status: 202,
                headers: {
                    'Cache-Control': 'no-store',
                },
            }
        );
    }, {
        routeLabel: '/api/client-errors',
        defaultCacheControl: 'no-store',
        metadata: { feature: 'client-error-logging' },
    });
}
