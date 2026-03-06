'use client';

import { useEffect, useState } from 'react';
import { 
    Database, Plus, Trash2, Download, RefreshCw, 
    CheckCircle, XCircle, Clock, Loader2, AlertCircle,
    HardDrive, Calendar, FileText
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface Backup {
    id: string;
    backup_type: string;
    status: string;
    file_name: string;
    file_size_bytes: number;
    row_count: number;
    download_url: string;
    created_at: string;
    completed_at: string;
    error_message: string | null;
}

interface BackupStats {
    total: number;
    completed: number;
    failed: number;
    totalSize: number;
    lastBackup: string | null;
}

export default function AdminBackupsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const supabase = getSupabaseBrowserClient();
    
    const [backups, setBackups] = useState<Backup[]>([]);
    const [stats, setStats] = useState<BackupStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && user) {
            fetchBackups();
            fetchStats();
        }
    }, [user, authLoading]);

    const fetchBackups = async () => {
        try {
            const response = await fetch('/api/cron/database-backup?action=list&limit=50');
            const result = await response.json();
            
            if (result.success) {
                setBackups(result.data);
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            console.error('Error fetching backups:', err);
            setError('Failed to load backups');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/cron/database-backup?action=stats');
            const result = await response.json();
            
            if (result.success) {
                setStats(result.data);
            }
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    const createBackup = async () => {
        setCreating(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/api/cron/database-backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', backupType: 'full' }),
            });
            
            const result = await response.json();
            
            if (result.success) {
                setSuccess('Backup created successfully');
                fetchBackups();
                fetchStats();
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create backup');
        } finally {
            setCreating(false);
        }
    };

    const deleteBackup = async (id: string) => {
        if (!confirm('Are you sure you want to delete this backup?')) return;

        setDeleting(id);
        setError(null);

        try {
            const response = await fetch('/api/cron/database-backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id }),
            });
            
            const result = await response.json();
            
            if (result.success) {
                setSuccess('Backup deleted successfully');
                fetchBackups();
                fetchStats();
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to delete backup');
        } finally {
            setDeleting(null);
        }
    };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateStr: string): string => {
        return new Date(dateStr).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        <CheckCircle className="w-3 h-3" /> Completed
                    </span>
                );
            case 'in_progress':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        <Loader2 className="w-3 h-3 animate-spin" /> In Progress
                    </span>
                );
            case 'failed':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                        <XCircle className="w-3 h-3" /> Failed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                        <Clock className="w-3 h-3" /> {status}
                    </span>
                );
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-slate-600">Please log in to access this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Database Backups</h1>
                    <p className="text-slate-600">Manage automated backups of your platform data</p>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <Database className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                                    <div className="text-sm text-slate-500">Total Backups</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-900">{stats.completed}</div>
                                    <div className="text-sm text-slate-500">Successful</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                    <HardDrive className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-900">{formatBytes(stats.totalSize)}</div>
                                    <div className="text-sm text-slate-500">Total Size</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                    <Calendar className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-900">
                                        {stats.lastBackup ? formatDate(stats.lastBackup) : 'Never'}
                                    </div>
                                    <div className="text-sm text-slate-500">Last Backup</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Messages */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                        <div className="text-red-700">{error}</div>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                        <div className="text-green-700">{success}</div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-slate-900">Backup History</h2>
                    <button
                        onClick={createBackup}
                        disabled={creating}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                        {creating ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Plus className="w-5 h-5" />
                                Create Backup
                            </>
                        )}
                    </button>
                </div>

                {/* Backup List */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {backups.length === 0 ? (
                        <div className="p-12 text-center">
                            <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">No backups yet. Create your first backup to protect your data.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Size
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Records
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Created
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {backups.map((backup) => (
                                        <tr key={backup.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-slate-400" />
                                                    <span className="font-medium text-slate-900 capitalize">
                                                        {backup.backup_type}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(backup.status)}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {formatBytes(backup.file_size_bytes || 0)}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {backup.row_count?.toLocaleString() || 0}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {formatDate(backup.created_at)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {backup.download_url && backup.status === 'completed' && (
                                                        <a
                                                            href={backup.download_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                            title="Download"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => deleteBackup(backup.id)}
                                                        disabled={deleting === backup.id}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                        title="Delete"
                                                    >
                                                        {deleting === backup.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
