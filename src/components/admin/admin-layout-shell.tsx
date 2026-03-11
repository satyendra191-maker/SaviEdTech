'use client';

import type { ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminMobileNav } from '@/components/admin/admin-mobile-nav';
import { SidebarProvider, useSidebar } from '@/components/admin/sidebar-context';
import { GlobalErrorBoundary } from '@/components/error-boundary';

interface AdminLayoutShellProps {
    children: ReactNode;
    role?: string;
}

function AdminLayoutShellContent({ children, role }: AdminLayoutShellProps) {
    const { isCollapsed } = useSidebar();

    return (
        <div className="min-h-screen bg-slate-100">
            <AdminSidebar />
            <div className={`transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                <AdminHeader role={role} />
                <main className="p-4 lg:p-6 pb-24 lg:pb-6">
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
