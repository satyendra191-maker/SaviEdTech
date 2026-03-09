const DEFAULT_POST_AUTH_PATH = '/dashboard';

const AUTH_ONLY_ROUTES = new Set([
    '/login',
    '/register',
    '/signup',
    '/reset-password',
    '/auth/callback',
    '/api/auth/callback',
    '/auth/auth-code-error',
]);

const CALLBACK_PARAM_KEYS = new Set([
    'code',
    'access_token',
    'refresh_token',
    'token',
    'token_type',
    'expires_at',
    'expires_in',
    'provider_token',
    'provider_refresh_token',
    'state',
    'id',
    'user_id',
    'userId',
    'uid',
]);

const BARE_UUID_PATH_RE =
    /^\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function hasAuthCallbackArtifacts(searchParams: URLSearchParams): boolean {
    for (const key of CALLBACK_PARAM_KEYS) {
        if (searchParams.has(key)) {
            return true;
        }
    }

    return false;
}

export function sanitizeInternalRedirect(
    requestedPath?: string | null,
    fallback = DEFAULT_POST_AUTH_PATH
): string {
    if (!requestedPath) {
        return fallback;
    }

    const trimmed = requestedPath.trim();
    if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) {
        return fallback;
    }

    try {
        const parsedUrl = new URL(trimmed, 'https://saviedutech.local');
        const pathname = parsedUrl.pathname || fallback;

        if (AUTH_ONLY_ROUTES.has(pathname) || BARE_UUID_PATH_RE.test(pathname)) {
            return fallback;
        }

        const cleanedParams = new URLSearchParams();

        parsedUrl.searchParams.forEach((value, key) => {
            if (CALLBACK_PARAM_KEYS.has(key)) {
                return;
            }

            if ((key === 'redirect' || key === 'next') && (value.includes('://') || value.startsWith('//'))) {
                return;
            }

            cleanedParams.append(key, value);
        });

        const search = cleanedParams.toString();
        return `${pathname}${search ? `?${search}` : ''}`;
    } catch {
        return fallback;
    }
}

export function resolvePostAuthDestination(options?: {
    next?: string | null;
    redirect?: string | null;
    type?: string | null;
    fallback?: string;
}): string {
    if (options?.type === 'recovery') {
        return '/reset-password';
    }

    return sanitizeInternalRedirect(
        options?.next ?? options?.redirect,
        options?.fallback ?? DEFAULT_POST_AUTH_PATH
    );
}

