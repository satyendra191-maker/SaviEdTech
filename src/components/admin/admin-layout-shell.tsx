'use client';

import type { ReactNode } from 'react';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminMobileNav } from '@/components/admin/admin-mobile-nav';
import { SidebarProvider } from '@/components/admin/sidebar-context';
import { GlobalErrorBoundary } from '@/components/error-boundary';

interface AdminLayoutShellProps {
    children: ReactNode;
    role?: string;
}

function AdminLayoutShellContent({ children, role }: AdminLayoutShellProps) {
    return (
        <div className="min-h-screen bg-slate-100">
            {/* No sidebar — full width layout */}
            <div className="min-w-0">
                <AdminHeader role={role} />
                <main className="p-4 lg:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto">
                    <GlobalErrorBoundary>{children}</GlobalErrorBoundary>
                </main>
            </div>
            <AdminMobileNav role={role} />
        </div>
    );
}

export function AdminLayoutShell({ children, role = 'admin' }: AdminLayoutShellProps) {
    return (
        <SidebarProvider>
            <AdminLayoutShellContent role={role}>{children}</AdminLayoutShellContent>
        </SidebarProvider>
    );
}
