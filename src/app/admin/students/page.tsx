'use client';

import { useState, useEffect, useCallback } from 'react';
import { DataTable, StatusBadge, ActionButton } from '@/components/admin/DataTable';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import {
    Users,
    GraduationCap,
    TrendingUp,
    Clock,
    Award,
    Target,
    Mail,
    Phone,
    MapPin,
    X,
    Save,
    Ban,
    Check,
} from 'lucide-react';
import type { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];
type StudentProfile = Database['public']['Tables']['student_profiles']['Row'];

type DialogMode = 'edit' | 'view' | null;

interface StudentWithProfile extends Profile {
    student_profile?: StudentProfile;
}

export default function StudentsPage() {
    const [students, setStudents] = useState<StudentWithProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<DialogMode>(null);
    const [selectedStudent, setSelectedStudent] = useState<StudentWithProfile | null>(null);

    const supabase = createBrowserSupabaseClient();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('*, student_profiles(*)')
                .eq('role', 'student')
                .order('created_at', { ascending: false });

            if (profilesError) throw profilesError;
            setStudents(profilesData || []);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleView = (item: object) => {
        setSelectedStudent(item as StudentWithProfile);
        setDialogMode('view');
        setDialogOpen(true);
    };

    const handleEdit = (item: object) => {
        setSelectedStudent(item as StudentWithProfile);
        setDialogMode('edit');
        setDialogOpen(true);
    };

    const handleToggleActive = async (item: object) => {
        const student = item as StudentWithProfile;
        const newStatus = !student.is_active;
        const action = newStatus ? 'activate' : 'deactivate';

        if (!confirm(`Are you sure you want to ${action} this student?`)) return;

        try {
            const { error } = await (supabase
                .from('profiles') as unknown as { update: (d: object) => { eq: (k: string, v: string) => Promise<{ error: Error | null }> } })
                .update({ is_active: newStatus })
                .eq('id', student.id);

            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error updating student:', error);
            alert('Failed to update student. Please try again.');
        }
    };

    const handleSave = async (formData: FormData) => {
        try {
            const data: Record<string, unknown> = {};
            formData.forEach((value, key) => {
                if (key === 'is_active') {
                    data[key] = value === 'on';
                } else if (key === 'study_streak' || key === 'longest_streak' || key === 'total_study_minutes') {
                    data[key] = value ? Number(value) : 0;
                } else {
                    data[key] = value;
                }
            });

            if (selectedStudent) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase.from('profiles') as any).update(data).eq('id', selectedStudent.id);
            }

            setDialogOpen(false);
            await fetchData();
        } catch (error) {
            console.error('Error saving student:', error);
            alert('Failed to save student. Please try again.');
        }
    };

    const columns = [
        {
            key: 'name',
            header: 'Student',
            sortable: true,
            render: (row: object) => {
                const student = row as StudentWithProfile;
                return (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-700 font-medium">
                                {student.full_name?.charAt(0) || student.email.charAt(0)}
                            </span>
                        </div>
                        <div>
                            <p className="font-medium text-slate-900">{student.full_name || 'N/A'}</p>
                            <p className="text-xs text-slate-500">{student.email}</p>
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'exam_target',
            header: 'Target',
            render: (row: object) => {
                const student = row as StudentWithProfile;
                return (
                    <div>
                        <span className="text-sm text-slate-900">{student.exam_target || 'N/A'}</span>
                        <p className="text-xs text-slate-500">Class {student.class_level || 'N/A'}</p>
                    </div>
                );
            }
        },
        {
            key: 'subscription',
            header: 'Subscription',
            render: (row: object) => {
                const student = row as StudentWithProfile;
                const status = student.student_profile?.subscription_status || 'free';
                const variants: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
                    'free': 'default',
                    'basic': 'info',
                    'premium': 'success',
                };
                return <StatusBadge status={status} variant={variants[status] || 'default'} />;
            },
            width: '100px'
        },
        {
            key: 'stats',
            header: 'Activity',
            render: (row: object) => {
                const student = row as StudentWithProfile;
                return (
                    <div className="text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Streak: {student.student_profile?.study_streak || 0} days
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {Math.floor((student.student_profile?.total_study_minutes || 0) / 60)}h studied
                        </div>
                    </div>
                );
            },
            width: '140px'
        },
        {
            key: 'location',
            header: 'Location',
            render: (row: object) => {
                const student = row as StudentWithProfile;
                return (
                    <div className="text-sm text-slate-600">
                        {student.city && <span>{student.city}</span>}
                        {student.state && <span>, {student.state}</span>}
                        {!student.city && !student.state && <span>N/A</span>}
                    </div>
                );
            },
            width: '120px'
        },
        {
            key: 'is_active',
            header: 'Status',
            render: (row: object) => {
                const student = row as StudentWithProfile;
                return (
                    <StatusBadge
                        status={student.is_active ? 'Active' : 'Inactive'}
                        variant={student.is_active ? 'success' : 'error'}
                    />
                );
            },
            width: '100px'
        },
    ];

    const totalStudyMinutes = students.reduce((acc, s) => acc + (s.student_profile?.total_study_minutes || 0), 0);
    const premiumStudents = students.filter(s => s.student_profile?.subscription_status === 'premium').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Student Management</h1>
                    <p className="text-slate-500">View and manage student accounts and progress</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard icon={Users} label="Total Students" value={students.length} />
                <StatCard icon={Check} label="Active" value={students.filter(s => s.is_active).length} />
                <StatCard icon={Award} label="Premium" value={premiumStudents} />
                <StatCard icon={TrendingUp} label="Avg Streak" value={Math.round(students.reduce((acc, s) => acc + (s.student_profile?.study_streak || 0), 0) / (students.length || 1))} />
                <StatCard icon={Clock} label="Total Hours" value={Math.floor(totalStudyMinutes / 60)} />
            </div>

            {/* Data Table */}
            <DataTable
                data={students as unknown as object[]}
                columns={columns}
                keyExtractor={(row) => (row as StudentWithProfile).id}
                title="All Students"
                loading={loading}
                onEdit={handleEdit}
                onView={handleView}
                onDelete={handleToggleActive}
                searchKeys={['full_name', 'email', 'phone', 'city']}
            />

            {/* Dialog */}
            {dialogOpen && selectedStudent && (
                <StudentDialog
                    mode={dialogMode}
                    student={selectedStudent}
                    onClose={() => setDialogOpen(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                    <p className="text-sm text-slate-500">{label}</p>
                </div>
            </div>
        </div>
    );
}

interface StudentDialogProps {
    mode: DialogMode;
    student: StudentWithProfile;
    onClose: () => void;
    onSave: (formData: FormData) => void;
}

function StudentDialog({ mode, student, onClose, onSave }: StudentDialogProps) {
    const [activeTab, setActiveTab] = useState('profile');
    const isView = mode === 'view';
    const isEdit = mode === 'edit';

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-700 font-medium text-lg">
                                {student.full_name?.charAt(0) || student.email.charAt(0)}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">{student.full_name || 'Unnamed'}</h3>
                            <p className="text-sm text-slate-500">{student.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 border-b border-slate-200">
                    <div className="flex gap-6">
                        {['profile', 'academic', 'activity'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                                    ? 'border-primary-600 text-primary-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'profile' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        name="full_name"
                                        defaultValue={student.full_name || ''}
                                        disabled={isView}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        defaultValue={student.email}
                                        disabled
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        defaultValue={student.phone || ''}
                                        disabled={isView}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                    <input
                                        type="text"
                                        defaultValue={student.role}
                                        disabled
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                                    <input
                                        type="text"
                                        name="city"
                                        defaultValue={student.city || ''}
                                        disabled={isView}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                                    <input
                                        type="text"
                                        name="state"
                                        defaultValue={student.state || ''}
                                        disabled={isView}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    defaultChecked={student.is_active}
                                    disabled={isView}
                                    className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                                />
                                <label className="text-sm font-medium text-slate-700">Account Active</label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'academic' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Exam Target</label>
                                    <select
                                        name="exam_target"
                                        defaultValue={student.exam_target || ''}
                                        disabled={isView}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                    >
                                        <option value="">Select Target</option>
                                        <option value="JEE">JEE</option>
                                        <option value="NEET">NEET</option>
                                        <option value="Both">Both</option>
                                        <option value="JEE Mains">JEE Mains</option>
                                        <option value="JEE Advanced">JEE Advanced</option>
                                        <option value="CBSE Board">CBSE Board</option>
                                        <option value="Foundation">Foundation</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Class Level</label>
                                    <select
                                        name="class_level"
                                        defaultValue={student.class_level || ''}
                                        disabled={isView}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                    >
                                        <option value="">Select Class</option>
                                        <option value="9">Class 9</option>
                                        <option value="10">Class 10</option>
                                        <option value="11">Class 11</option>
                                        <option value="12">Class 12</option>
                                        <option value="Dropper">Dropper</option>
                                    </select>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                                <h4 className="font-medium text-slate-900">Student Profile Stats</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-slate-500">Subscription:</span>
                                        <span className="ml-2 font-medium">{student.student_profile?.subscription_status || 'free'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Predicted Rank:</span>
                                        <span className="ml-2 font-medium">{student.student_profile?.rank_prediction || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Predicted Percentile:</span>
                                        <span className="ml-2 font-medium">{student.student_profile?.percentile_prediction ? `${student.student_profile.percentile_prediction}%` : 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Subscription Expires:</span>
                                        <span className="ml-2 font-medium">
                                            {student.student_profile?.subscription_expires_at
                                                ? new Date(student.student_profile.subscription_expires_at).toLocaleDateString()
                                                : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-slate-50 p-4 rounded-lg text-center">
                                    <p className="text-3xl font-bold text-slate-900">{student.student_profile?.study_streak || 0}</p>
                                    <p className="text-sm text-slate-500">Current Streak (days)</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg text-center">
                                    <p className="text-3xl font-bold text-slate-900">{student.student_profile?.longest_streak || 0}</p>
                                    <p className="text-sm text-slate-500">Longest Streak</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg text-center">
                                    <p className="text-3xl font-bold text-slate-900">
                                        {Math.floor((student.student_profile?.total_study_minutes || 0) / 60)}
                                    </p>
                                    <p className="text-sm text-slate-500">Hours Studied</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Subjects</label>
                                <input
                                    type="text"
                                    defaultValue={student.student_profile?.preferred_subjects?.join(', ') || ''}
                                    disabled
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Strong Topics</label>
                                    <textarea
                                        defaultValue={student.student_profile?.strong_topics?.join('\n') || ''}
                                        disabled
                                        rows={4}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Weak Topics</label>
                                    <textarea
                                        defaultValue={student.student_profile?.weak_topics?.join('\n') || ''}
                                        disabled
                                        rows={4}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50"
                                    />
                                </div>
                            </div>

                            <div className="text-sm text-slate-500">
                                <p>Last Active: {student.last_active_at ? new Date(student.last_active_at).toLocaleString() : 'Never'}</p>
                                <p>Joined: {new Date(student.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    )}
                </form>

                {isEdit && (
                    <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={() => {
                                const form = document.querySelector('form');
                                if (form) form.requestSubmit();
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            Save Changes
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
