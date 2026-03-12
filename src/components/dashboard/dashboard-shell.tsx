'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MobileNav } from '@/components/dashboard/mobile-nav';
import { MobileMenuWidget } from '@/components/mobile-menu-widget';
import { Header } from '@/components/dashboard/header';
import { DashboardErrorBoundary } from '@/components/dashboard/error-boundary';
import { DashboardSidebarProvider } from '@/components/dashboard/sidebar-context';

function DashboardShellContent({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isParentRoute = pathname.startsWith('/dashboard/parent');

    return (
        <div className="min-h-screen overflow-x-hidden bg-slate-50">
            {/* Mobile bottom navigation */}
            <div className="lg:hidden">
                <MobileNav role={isParentRoute ? 'parent' : 'student'} />
            </div>

            {/* Main content — full width, no sidebar offset */}
            <div className="min-w-0">
                <Header />
                <main className="min-w-0 overflow-x-hidden p-4 pb-24 lg:p-8 lg:pb-8 max-w-6xl mx-auto">
                    <DashboardErrorBoundary>
                        {children}
                    </DashboardErrorBoundary>
                </main>
            </div>

            <MobileMenuWidget role={isParentRoute ? 'parent' : 'student'} />
        </div>
    );
}

export function DashboardShell({ children }: { children: ReactNode }) {
    return (
        <DashboardSidebarProvider>
            <DashboardShellContent>{children}</DashboardShellContent>
        </DashboardSidebarProvider>
    );
}
