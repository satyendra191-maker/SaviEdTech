'use client';

import type { ReactNode } from 'react';
import { FacultyHeader } from './faculty-header';
import { FacultyMobileNav } from './faculty-mobile-nav';
import { FacultySidebar } from './faculty-sidebar';
import { FacultyProvider } from './faculty-context';

interface FacultyLayoutProps {
    children: ReactNode;
    role?: string;
    subject?: string;
}

function FacultyLayoutContent({ children, role, subject }: FacultyLayoutProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <div className="flex">
                <FacultySidebar subject={subject} />
                <div className="flex-1 ml-0 lg:ml-64">
                    <FacultyHeader role={role} subject={subject} />
                    <main className="p-4 lg:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto mt-16">
                        {children}
                    </main>
                </div>
            </div>
            <FacultyMobileNav subject={subject} />
        </div>
    );
}

export function FacultyLayoutShell({ children, role = 'faculty', subject }: FacultyLayoutProps) {
    return (
        <FacultyProvider subject={subject}>
            <FacultyLayoutContent role={role} subject={subject}>{children}</FacultyLayoutContent>
        </FacultyProvider>
    );
}
