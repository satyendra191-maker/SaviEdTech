'use client';

import { useEffect } from 'react';

const CHUNK_RELOAD_KEY = 'saviedutech:chunk-reload-once';

function isChunkLoadErrorMessage(message: string): boolean {
    return (
        message.includes('Loading chunk') ||
        message.includes('ChunkLoadError') ||
        message.includes('Failed to fetch dynamically imported module') ||
        message.includes('/_next/static/chunks/')
    );
}

export function ChunkRecovery() {
    useEffect(() => {
        const resetReloadFlag = () => {
            // Clear the reload guard after a successful page load.
            window.setTimeout(() => sessionStorage.removeItem(CHUNK_RELOAD_KEY), 3000);
        };

        const reloadOnce = () => {
            if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') {
                return;
            }

            sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
            window.location.reload();
        };

        const onError = (event: ErrorEvent) => {
            const message = event.message || '';
            if (isChunkLoadErrorMessage(message)) {
                reloadOnce();
            }
        };

        const onUnhandledRejection = (event: PromiseRejectionEvent) => {
            const reason =
                typeof event.reason === 'string'
                    ? event.reason
                    : event.reason instanceof Error
                        ? event.reason.message
                        : '';

            if (isChunkLoadErrorMessage(reason)) {
                reloadOnce();
            }
        };

        resetReloadFlag();
        window.addEventListener('error', onError);
        window.addEventListener('unhandledrejection', onUnhandledRejection);

        return () => {
            window.removeEventListener('error', onError);
            window.removeEventListener('unhandledrejection', onUnhandledRejection);
        };
    }, []);

    return null;
}
