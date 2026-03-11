'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { MobileNav } from '@/components/dashboard/mobile-nav';
import { MobileMenuWidget } from '@/components/mobile-menu-widget';
import { Header } from '@/components/dashboard/header';
import { DashboardErrorBoundary } from '@/components/dashboard/error-boundary';
import { DashboardSidebarProvider, useDashboardSidebar } from '@/components/dashboard/sidebar-context';

function DashboardShellContent({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const { isCollapsed, isMobileOpen, closeMobile } = useDashboardSidebar();
    const isParentRoute = pathname.startsWith('/dashboard/parent');

    return (
        <div className="min-h-screen overflow-x-hidden bg-slate-50">
            <div className="hidden lg:block">
                <Sidebar mode="desktop" />
            </div>

            <div className={`fixed inset-0 z-40 lg:hidden ${isMobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                <button
                    aria-label="Close dashboard sidebar"
                    className={`absolute inset-0 bg-slate-900/40 transition-opacity ${isMobileOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={closeMobile}
                />
                <Sidebar mode="mobile" />
            </div>

            <div className="lg:hidden">
                <MobileNav role={isParentRoute ? 'parent' : 'student'} />
            </div>

            <div className={`min-w-0 transition-[margin] duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                <Header />
                <main className="min-w-0 overflow-x-hidden p-4 pb-24 lg:p-8 lg:pb-8">
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
