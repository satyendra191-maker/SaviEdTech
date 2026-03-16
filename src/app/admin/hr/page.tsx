'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    Users, UserCheck, UserPlus, Briefcase, 
    Calendar, Clock, FileText, Settings,
    Search, Filter, ChevronRight, MoreHorizontal,
    Mail, Phone, Building2, MapPin, Activity
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { ADMIN_PRIVILEGED_ROLES, EMPLOYEE_ROLES } from '@/lib/auth/roles';

const HR_OPS_ROLES = new Set<string>(['hr', 'hr_manager', 'technical_support', 'support', 'compliance', 'compliance_team']);

interface Employee {
    id: string;
    full_name: string;
    email: string;
    role: string;
    status: string;
    department: string;
    joined_at: string;
}

export default function HRDashboardPage() {
    const supabase = getSupabaseBrowserClient();
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        onboarding: 0,
        leave: 0
    });

    useEffect(() => {
        fetchHRData();
    }, []);

    const fetchHRData = async () => {
        setLoading(true);
        try {
            // In a real app, we would fetch from a 'staff' or 'employees' table
            // For now, we fetch from 'profiles' filtered by employee roles
            const { data, count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact' })
                .in('role', Array.from(EMPLOYEE_ROLES))
                .order('full_name');

            if (data) {
                const mapped: Employee[] = data.map(p => ({
                    id: p.id,
                    full_name: p.full_name || 'Anonymous',
                    email: p.email,
                    role: p.role,
                    status: p.status || 'active',
                    department: p.role?.includes('manager') ? 'Management' : 'Education',
                    joined_at: p.created_at
                }));
                setEmployees(mapped);
                setStats({
                    total: count || 0,
                    active: mapped.filter(e => e.status === 'active').length,
                    onboarding: mapped.filter(e => e.status === 'pending').length,
                    leave: 0 // Placeholder
                });
            }
        } catch (error) {
            console.error('HR data fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">HR & Talent Portal</h1>
                    <p className="text-sm text-slate-500">Manage employee profiles, roles, and recruitment.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
                        <UserPlus className="w-4 h-4" />
                        Add Employee
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={Users} label="Total Workforce" value={String(stats.total)} color="text-indigo-600" bg="bg-indigo-50" />
                <StatCard icon={UserCheck} label="Active Staff" value={String(stats.active)} color="text-emerald-600" bg="bg-emerald-50" />
                <StatCard icon={Clock} label="Onboarding" value={String(stats.onboarding)} color="text-amber-600" bg="bg-amber-50" />
                <StatCard icon={Calendar} label="On Leave" value={String(stats.leave)} color="text-rose-600" bg="bg-rose-50" />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Employee List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-bold text-slate-900">Personnel Directory</h2>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search name, role..." 
                                    className="pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-100 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all w-48"
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3 text-left">Employee</th>
                                        <th className="px-5 py-3 text-left">Department</th>
                                        <th className="px-5 py-3 text-left">Role</th>
                                        <th className="px-5 py-3 text-left">Status</th>
                                        <th className="px-5 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {employees.map((emp) => (
                                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                        {emp.full_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900 truncate max-w-[150px]">{emp.full_name}</p>
                                                        <p className="text-[10px] text-slate-400">{emp.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-xs text-slate-600">{emp.department}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-tight">
                                                    {emp.role.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${emp.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                    <span className="text-xs text-slate-600 capitalize">{emp.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition-colors">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                    {/* Role Distribution Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <h2 className="font-bold text-slate-900 mb-4">Role Distribution</h2>
                        <div className="space-y-4">
                            <RoleItem label="Teaching Staff" count={employees.filter(e => e.role === 'teacher' || e.role === 'faculty').length} total={employees.length} color="bg-indigo-500" />
                            <RoleItem label="Management" count={employees.filter(e => e.role?.includes('manager')).length} total={employees.length} color="bg-emerald-500" />
                            <RoleItem label="Admins" count={employees.filter(e => ADMIN_PRIVILEGED_ROLES.includes(e.role as (typeof ADMIN_PRIVILEGED_ROLES)[number])).length} total={employees.length} color="bg-amber-500" />
                            <RoleItem label="HR & Ops" count={employees.filter(e => HR_OPS_ROLES.has(e.role)).length} total={employees.length} color="bg-rose-500" />
                        </div>
                    </div>

                    {/* HR Automations (Cron Jobs) */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                                <Activity className="w-4 h-4 text-rose-500" />
                                Workforce Sync
                            </h2>
                            <Link href="/admin/cron-jobs" className="text-[10px] font-bold text-indigo-600 uppercase">Track Jobs</Link>
                        </div>
                        <div className="space-y-3">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-bold text-slate-900">Attendance Audit</p>
                                    <p className="text-[9px] text-slate-400">Syncs biometric & app logs</p>
                                </div>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm" />
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-bold text-slate-900">Payroll Calculation</p>
                                    <p className="text-[9px] text-slate-400">Scheduled for 1st of month</p>
                                </div>
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Add Activity icon to the list of imports if missing.
// I'll ensure Activity is imported in this file too.

function StatCard({ icon: Icon, label, value, color, bg }: any) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 ${bg} ${color} rounded-xl flex items-center justify-center`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
            </div>
        </div>
    );
}

function RoleItem({ label, count, total, color }: any) {
    const percent = total > 0 ? (count / total) * 100 : 0;
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-600">{label}</span>
                <span className="font-bold text-slate-900">{count}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}

function ActionButton({ icon: Icon, label }: any) {
    return (
        <button className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-center group">
            <Icon className="w-5 h-5 text-indigo-300 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-medium text-white/70">{label}</span>
        </button>
    );
}
