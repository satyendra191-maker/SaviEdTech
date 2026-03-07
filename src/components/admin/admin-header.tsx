'use client';

import { Bell, Search, User, Menu, X } from 'lucide-react';
import { useSidebar } from './sidebar-context';

export function AdminHeader() {
    const { isCollapsed, toggleSidebar } = useSidebar();

    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shadow-sm">
            {/* Mobile Toggle & Search */}
            <div className="flex items-center gap-3 flex-1">
                <button
                    onClick={toggleSidebar}
                    className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </button>
                
                {/* Search */}
                <div className="flex-1 max-w-lg">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search students, leads, content..."
                            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all bg-slate-50"
                        />
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 lg:gap-4">
                {/* Notifications */}
                <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </button>

                {/* User */}
                <div className="flex items-center gap-2 lg:gap-3 pl-2 lg:pl-4 border-l border-slate-200">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-slate-900">Admin</p>
                        <p className="text-xs text-slate-500">Super Admin</p>
                    </div>
                    <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                        <User className="w-4 h-4 text-white" />
                    </div>
                </div>
            </div>
        </header>
    );
}
