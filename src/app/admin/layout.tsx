import { ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';

interface AdminLayoutProps {
    children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Admin Sidebar */}
            <AdminSidebar />
            
            {/* Main Content */}
            <div className="lg:ml-64">
                <AdminHeader />
                <main className="p-4 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
