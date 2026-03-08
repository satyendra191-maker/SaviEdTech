'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

interface DashboardSidebarContextValue {
    isCollapsed: boolean;
    isMobileOpen: boolean;
    toggleCollapsed: () => void;
    toggleMobile: () => void;
    closeMobile: () => void;
}

const DashboardSidebarContext = createContext<DashboardSidebarContextValue | undefined>(undefined);
const STORAGE_KEY = 'dashboard_sidebar_collapsed';

export function DashboardSidebarProvider({ children }: { children: ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    useEffect(() => {
        const storedValue = window.localStorage.getItem(STORAGE_KEY);
        if (storedValue === 'true') {
            setIsCollapsed(true);
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEY, String(isCollapsed));
    }, [isCollapsed]);

    const value = useMemo(() => ({
        isCollapsed,
        isMobileOpen,
        toggleCollapsed: () => setIsCollapsed((current) => !current),
        toggleMobile: () => setIsMobileOpen((current) => !current),
        closeMobile: () => setIsMobileOpen(false),
    }), [isCollapsed, isMobileOpen]);

    return (
        <DashboardSidebarContext.Provider value={value}>
            {children}
        </DashboardSidebarContext.Provider>
    );
}

export function useDashboardSidebar() {
    const context = useContext(DashboardSidebarContext);
    if (!context) {
        throw new Error('useDashboardSidebar must be used within DashboardSidebarProvider');
    }
    return context;
}
