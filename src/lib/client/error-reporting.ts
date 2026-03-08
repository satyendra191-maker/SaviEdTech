'use client';

export interface ClientErrorReport {
    boundary: string;
    message: string;
    stack?: string | null;
    digest?: string | null;
    componentStack?: string | null;
    metadata?: Record<string, unknown>;
}

export function reportClientError(report: ClientErrorReport): void {
    if (typeof window === 'undefined') {
        return;
    }

    void fetch('/api/client-errors', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...report,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
        }),
        keepalive: true,
    }).catch(() => undefined);
}
