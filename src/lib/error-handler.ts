/**
 * Global Error Handling System
 * Part of Feature 22: Global Error Handling System
 */

import { recordError } from '@/lib/performance';

export enum ErrorType {
    AUTHENTICATION = 'AUTHENTICATION_ERROR',
    AUTHORIZATION = 'AUTHORIZATION_ERROR',
    VALIDATION = 'VALIDATION_ERROR',
    DATABASE = 'DATABASE_ERROR',
    NETWORK = 'NETWORK_ERROR',
    PAYMENT = 'PAYMENT_ERROR',
    NOT_FOUND = 'NOT_FOUND_ERROR',
    RATE_LIMIT = 'RATE_LIMIT_ERROR',
    SERVER = 'SERVER_ERROR',
    UNKNOWN = 'UNKNOWN_ERROR',
}

export interface AppError {
    type: ErrorType;
    message: string;
    code?: string;
    statusCode: number;
    details?: Record<string, unknown>;
    timestamp: string;
    requestId?: string;
}

function sanitizeForJson(value: unknown): unknown {
    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'bigint') {
        return Number(value);
    }

    if (Array.isArray(value)) {
        return value.slice(0, 50).map(sanitizeForJson);
    }

    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: value.stack,
        };
    }

    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .filter(([, entry]) => entry !== undefined)
                .map(([key, entry]) => [key, sanitizeForJson(entry)])
        );
    }

    return String(value);
}

function getDefaultStatusCode(type: ErrorType): number {
    const statusCodes: Record<ErrorType, number> = {
        [ErrorType.AUTHENTICATION]: 401,
        [ErrorType.AUTHORIZATION]: 403,
        [ErrorType.VALIDATION]: 400,
        [ErrorType.DATABASE]: 500,
        [ErrorType.NETWORK]: 503,
        [ErrorType.PAYMENT]: 402,
        [ErrorType.NOT_FOUND]: 404,
        [ErrorType.RATE_LIMIT]: 429,
        [ErrorType.SERVER]: 500,
        [ErrorType.UNKNOWN]: 500,
    };

    return statusCodes[type] || 500;
}

function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

async function persistServerError(error: AppError, context?: Record<string, unknown>): Promise<void> {
    if (typeof window !== 'undefined') {
        return;
    }

    try {
        const { createAdminSupabaseClient } = await import('@/lib/supabase');
        const supabase = createAdminSupabaseClient();
        const sanitizedContext = sanitizeForJson(context || {}) as Record<string, unknown>;
        const requestPath = typeof sanitizedContext.path === 'string'
            ? sanitizedContext.path
            : typeof sanitizedContext.route === 'string'
                ? sanitizedContext.route
                : null;
        const requestMethod = typeof sanitizedContext.method === 'string'
            ? sanitizedContext.method
            : null;
        const userAgent = typeof sanitizedContext.userAgent === 'string'
            ? sanitizedContext.userAgent
            : null;
        const ipAddress = typeof sanitizedContext.ipAddress === 'string'
            ? sanitizedContext.ipAddress
            : null;
        const userId = typeof sanitizedContext.userId === 'string'
            ? sanitizedContext.userId
            : null;
        const stackTrace = typeof sanitizedContext.stackTrace === 'string'
            ? sanitizedContext.stackTrace
            : typeof error.details?.stack === 'string'
                ? error.details.stack
                : null;
        const errorType = typeof sanitizedContext.errorType === 'string'
            ? sanitizedContext.errorType
            : error.type;

        const errorLogsTable = supabase.from('error_logs') as unknown as {
            insert: (payload: Record<string, unknown>) => Promise<unknown>;
        };

        await errorLogsTable.insert({
            error_type: errorType,
            error_message: error.message,
            stack_trace: stackTrace,
            user_id: userId,
            request_path: requestPath,
            request_method: requestMethod,
            user_agent: userAgent,
            ip_address: ipAddress,
            metadata: {
                requestId: error.requestId,
                code: error.code,
                statusCode: error.statusCode,
                details: sanitizeForJson(error.details || {}),
                context: sanitizedContext,
            },
        });
    } catch (persistError) {
        console.error('[ErrorHandling] Failed to persist error log:', persistError);
    }
}

export function createApiError(
    type: ErrorType,
    message: string,
    options?: {
        code?: string;
        statusCode?: number;
        details?: Record<string, unknown>;
        requestId?: string;
    }
): AppError {
    return {
        type,
        message,
        code: options?.code,
        statusCode: options?.statusCode || getDefaultStatusCode(type),
        details: options?.details,
        timestamp: new Date().toISOString(),
        requestId: options?.requestId || generateRequestId(),
    };
}

export function isAppError(error: unknown): error is AppError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'type' in error &&
        'message' in error &&
        'statusCode' in error
    );
}

export function formatApiError(error: unknown): AppError {
    if (isAppError(error)) {
        return error;
    }

    const maybeSupabaseError = error as { code?: string; message?: string };
    if (maybeSupabaseError?.code && (
        maybeSupabaseError.code.startsWith('PGRST') ||
        /^\d{5}$/.test(maybeSupabaseError.code)
    )) {
        return handleSupabaseError(error);
    }

    if (error instanceof Error) {
        return createApiError(
            ErrorType.UNKNOWN,
            error.message,
            { details: { stack: error.stack } }
        );
    }

    return createApiError(
        ErrorType.UNKNOWN,
        'An unexpected error occurred',
        { details: { originalError: String(error) } }
    );
}

export function handleSupabaseError(error: unknown): AppError {
    const supabaseError = error as { message?: string; code?: string; details?: unknown };
    const message = supabaseError.message || 'Database operation failed';
    const code = supabaseError.code;

    if (code === 'PGRST301' || code === '42501') {
        return createApiError(
            ErrorType.AUTHORIZATION,
            'You do not have permission to perform this action',
            { code, details: { supabaseCode: code } }
        );
    }

    if (code === 'PGRST204' || code === '00000') {
        return createApiError(
            ErrorType.NOT_FOUND,
            'The requested resource was not found',
            { code, details: { supabaseCode: code } }
        );
    }

    if (code === '23505') {
        return createApiError(
            ErrorType.VALIDATION,
            'A record with this information already exists',
            { code, details: { supabaseCode: code } }
        );
    }

    return createApiError(
        ErrorType.DATABASE,
        message,
        { code, details: { supabaseCode: code, details: supabaseError.details } }
    );
}

export function handleAuthError(error: unknown): AppError {
    const authError = error as { message?: string; status?: number };
    const message = authError.message || 'Authentication failed';

    if (message.toLowerCase().includes('invalid')) {
        return createApiError(
            ErrorType.AUTHENTICATION,
            'Invalid credentials',
            { statusCode: 401 }
        );
    }

    if (message.toLowerCase().includes('token')) {
        return createApiError(
            ErrorType.AUTHENTICATION,
            'Session expired. Please log in again',
            { statusCode: 401 }
        );
    }

    return createApiError(
        ErrorType.AUTHENTICATION,
        message,
        { statusCode: authError.status || 401 }
    );
}

export function validateRequiredFields(
    data: Record<string, unknown>,
    requiredFields: string[]
): AppError | null {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
            missingFields.push(field);
        }
    }

    if (missingFields.length > 0) {
        return createApiError(
            ErrorType.VALIDATION,
            `Missing required fields: ${missingFields.join(', ')}`,
            { statusCode: 400, details: { missingFields } }
        );
    }

    return null;
}

export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function logError(error: AppError | Error, context?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const errorData = isAppError(error)
        ? error
        : createApiError(ErrorType.UNKNOWN, error.message, { details: { stack: error.stack } });

    recordError();

    console.error(`[${timestamp}] ERROR:`, {
        type: errorData.type,
        message: errorData.message,
        code: errorData.code,
        statusCode: errorData.statusCode,
        requestId: errorData.requestId,
        context: sanitizeForJson(context || {}),
    });

    void persistServerError(errorData, context);
}

export function errorResponse(
    error: unknown,
    context?: Record<string, unknown>
): Response {
    const appError = formatApiError(error);
    logError(appError, context);

    return Response.json(
        {
            success: false,
            error: {
                type: appError.type,
                message: appError.message,
                code: appError.code,
                requestId: appError.requestId,
            },
        },
        { status: appError.statusCode }
    );
}

export function withErrorHandling<T extends unknown[]>(
    handler: (...args: T) => Promise<Response>
) {
    return async (...args: T): Promise<Response> => {
        try {
            return await handler(...args);
        } catch (error) {
            return errorResponse(error, { handler: handler.name });
        }
    };
}

export function getErrorMessage(error: unknown): string {
    if (isAppError(error)) {
        return error.message;
    }

    if (error instanceof Error) {
        if (process.env.NODE_ENV === 'production') {
            return 'An unexpected error occurred. Please try again.';
        }

        return error.message;
    }

    return 'An unexpected error occurred';
}
