'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChunkRecovery } from './chunk-recovery';
import { GlobalErrorBoundary } from './error-boundary';
import { AuthProvider } from '@/lib/auth/AuthProvider';

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000,
                        refetchOnWindowFocus: false,
                        retry: 1,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            <GlobalErrorBoundary>
                <ChunkRecovery />
                <AuthProvider>
                    {children}
                </AuthProvider>
            </GlobalErrorBoundary>
        </QueryClientProvider>
    );
}
