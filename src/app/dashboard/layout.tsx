import { ReactNode } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { MobileNav } from '@/components/dashboard/mobile-nav';
import { Header } from '@/components/dashboard/header';
import { DashboardErrorBoundary } from '@/components/dashboard/error-boundary';

interface DashboardLayoutProps {
    children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
                <Sidebar />
            </div>

            {/* Mobile Navigation */}
            <div className="lg:hidden">
                <MobileNav />
            </div>

            {/* Main Content */}
            <div className="lg:ml-64">
                <Header />
                <main className="p-4 lg:p-8 pb-24 lg:pb-8">
                    <DashboardErrorBoundary>
                        {children}
                    </DashboardErrorBoundary>
                </main>
            </div>
        </div>
    );
}
