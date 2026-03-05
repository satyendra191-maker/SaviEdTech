'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import {
    Users,
    Phone,
    Mail,
    MapPin,
    Filter,
    Download,
} from 'lucide-react';

interface Lead {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    exam_target: string;
    class_level: string;
    city: string | null;
    state: string | null;
    source: string;
    status: 'new' | 'contacted' | 'converted' | 'disqualified';
    created_at: string;
}

export default function LeadsPage() {
    const supabase = createBrowserSupabaseClient();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('lead_forms')
                .select('*')
                .order('created_at', { ascending: false });

            if (filterStatus !== 'all') {
                query = query.eq('status', filterStatus);
            }

            const { data, error } = await query;
            if (error) throw error;
            setLeads((data as Lead[]) || []);
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoading(false);
        }
    }, [supabase, filterStatus]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'bg-blue-100 text-blue-800';
            case 'contacted': return 'bg-yellow-100 text-yellow-800';
            case 'converted': return 'bg-green-100 text-green-800';
            case 'disqualified': return 'bg-red-100 text-red-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    const stats = {
        total: leads.length,
        new: leads.filter(l => l.status === 'new').length,
        contacted: leads.filter(l => l.status === 'contacted').length,
        converted: leads.filter(l => l.status === 'converted').length,
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Lead Management</h1>
                    <p className="text-slate-600 mt-1">Track and manage student inquiries</p>
                </div>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                    <Download className="w-5 h-5" />
                    Export CSV
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Leads" value={stats.total} />
                <StatCard icon={Filter} label="New" value={stats.new} />
                <StatCard icon={Phone} label="Contacted" value={stats.contacted} />
                <StatCard icon={Mail} label="Converted" value={stats.converted} />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex gap-4">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    >
                        <option value="all">All Status</option>
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="converted">Converted</option>
                        <option value="disqualified">Disqualified</option>
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Target</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Location</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
                            ) : leads.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No leads found</td></tr>
                            ) : (
                                leads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{lead.name}</div>
                                            <div className="text-sm text-slate-500">{lead.source}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-600">{lead.phone}</div>
                                            {lead.email && <div className="text-sm text-slate-500">{lead.email}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-900">{lead.exam_target}</div>
                                            <div className="text-sm text-slate-500">Class {lead.class_level}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-sm text-slate-600">
                                                <MapPin className="w-3 h-3" />
                                                {lead.city || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                                                {lead.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="text-xl font-bold text-slate-900">{value}</p>
                </div>
            </div>
        </div>
    );
}
