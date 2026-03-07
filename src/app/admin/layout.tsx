'use client';

import { ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';
import { SidebarProvider, useSidebar } from '@/components/admin/sidebar-context';

interface AdminLayoutProps {
    children: ReactNode;
}

function AdminLayoutContent({ children }: AdminLayoutProps) {
    const { isCollapsed } = useSidebar();

    return (
        <div className="min-h-screen bg-slate-100">
            <AdminSidebar />
            <div
                className={`transition-all duration-300 ${
                    isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
                }`}
            >
                <AdminHeader />
                <main className="p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    return (
        <SidebarProvider>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </SidebarProvider>
    );
}
