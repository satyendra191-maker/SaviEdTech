'use client';

import { useState, useEffect, useCallback } from 'react';
import { DataTable, StatusBadge } from '@/components/admin/DataTable';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { JobListing, JobApplication, ApplicationWithJob } from '@/types/careers';
import {
    Plus,
    Briefcase,
    Users,
    X,
    CheckCircle,
    AlertCircle,
    Trash2,
    Edit,
    Download,
} from 'lucide-react';

const JOB_TYPES = [
    { value: 'full-time', label: 'Full-time' },
    { value: 'part-time', label: 'Part-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'internship', label: 'Internship' },
];

const EXPERIENCE_LEVELS = [
    { value: 'entry', label: 'Entry Level' },
    { value: 'mid', label: 'Mid Level' },
    { value: 'senior', label: 'Senior Level' },
    { value: 'lead', label: 'Lead/Manager' },
];

const APPLICATION_STATUS = [
    { value: 'new', label: 'New', color: 'blue' },
    { value: 'reviewing', label: 'Reviewing', color: 'yellow' },
    { value: 'shortlisted', label: 'Shortlisted', color: 'green' },
    { value: 'rejected', label: 'Rejected', color: 'red' },
    { value: 'hired', label: 'Hired', color: 'purple' },
];

export default function CareersAdminPage() {
    const [activeTab, setActiveTab] = useState<'jobs' | 'applications'>('jobs');
    const [jobs, setJobs] = useState<JobListing[]>([]);
    const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view' | null>(null);
    const [selectedItem, setSelectedItem] = useState<JobListing | ApplicationWithJob | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form state for job creation/editing
    const [formData, setFormData] = useState<{
        title: string;
        department: string;
        location: string;
        type: 'full-time' | 'part-time' | 'contract' | 'internship';
        experience_level: 'entry' | 'mid' | 'senior' | 'lead';
        salary_min: string;
        salary_max: string;
        description: string;
        requirements: string[];
        responsibilities: string[];
        skills: string[];
        benefits: string[];
        deadline: string;
        is_active: boolean;
    }>({
        title: '',
        department: '',
        location: '',
        type: 'full-time',
        experience_level: 'entry',
        salary_min: '',
        salary_max: '',
        description: '',
        requirements: [''],
        responsibilities: [''],
        skills: [''],
        benefits: [''],
        deadline: '',
        is_active: true,
    });

    const supabase = createBrowserSupabaseClient();

    const fetchJobs = useCallback(async () => {
        try {
            const { data, error } = await (supabase as any)
                .from('job_listings')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setJobs(data || []);
        } catch (err) {
            console.error('Error fetching jobs:', err);
            setError('Failed to load job listings');
        }
    }, [supabase]);

    const fetchApplications = useCallback(async () => {
        try {
            const { data, error } = await (supabase as any)
                .from('job_applications')
                .select(`
                    *,
                    job_listings:job_id (title, department)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setApplications(data || []);
        } catch (err) {
            console.error('Error fetching applications:', err);
            setError('Failed to load applications');
        }
    }, [supabase]);

    useEffect(() => {
        setLoading(true);
        if (activeTab === 'jobs') {
            fetchJobs().then(() => setLoading(false));
        } else {
            fetchApplications().then(() => setLoading(false));
        }
    }, [activeTab, fetchJobs, fetchApplications]);

    const handleCreateJob = () => {
        setDialogMode('create');
        setSelectedItem(null);
        setFormData({
            title: '',
            department: '',
            location: '',
            type: 'full-time',
            experience_level: 'entry',
            salary_min: '',
            salary_max: '',
            description: '',
            requirements: [''],
            responsibilities: [''],
            skills: [''],
            benefits: [''],
            deadline: '',
            is_active: true,
        });
        setDialogOpen(true);
    };

    const handleEditJob = (job: JobListing) => {
        setDialogMode('edit');
        setSelectedItem(job);
        setFormData({
            title: job.title,
            department: job.department,
            location: job.location,
            type: job.type,
            experience_level: job.experience_level,
            salary_min: job.salary_min?.toString() || '',
            salary_max: job.salary_max?.toString() || '',
            description: job.description,
            requirements: job.requirements.length > 0 ? job.requirements : [''],
            responsibilities: job.responsibilities.length > 0 ? job.responsibilities : [''],
            skills: job.skills.length > 0 ? job.skills : [''],
            benefits: job.benefits?.length > 0 ? job.benefits : [''],
            deadline: job.deadline ? job.deadline.split('T')[0] : '',
            is_active: job.is_active,
        });
        setDialogOpen(true);
    };

    const handleViewApplication = (application: ApplicationWithJob) => {
        setDialogMode('view');
        setSelectedItem(application);
        setDialogOpen(true);
    };

    const handleSubmitJob = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            const jobData = {
                title: formData.title,
                department: formData.department,
                location: formData.location,
                type: formData.type,
                experience_level: formData.experience_level,
                salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
                salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
                description: formData.description,
                requirements: formData.requirements.filter(r => r.trim() !== ''),
                responsibilities: formData.responsibilities.filter(r => r.trim() !== ''),
                skills: formData.skills.filter(s => s.trim() !== ''),
                benefits: formData.benefits.filter(b => b.trim() !== ''),
                deadline: formData.deadline || null,
                is_active: formData.is_active,
            };

            if (dialogMode === 'create') {
                const { error } = await (supabase as any).from('job_listings').insert(jobData);
                if (error) throw error;
                setSuccess('Job listing created successfully');
            } else if (dialogMode === 'edit' && selectedItem) {
                const { error } = await (supabase as any)
                    .from('job_listings')
                    .update(jobData)
                    .eq('id', selectedItem.id);
                if (error) throw error;
                setSuccess('Job listing updated successfully');
            }

            setDialogOpen(false);
            fetchJobs();
        } catch (err) {
            console.error('Error saving job:', err);
            setError('Failed to save job listing');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteJob = async (job: JobListing) => {
        if (!confirm('Are you sure you want to delete this job listing? This action cannot be undone.')) {
            return;
        }

        try {
            const { error } = await (supabase as any).from('job_listings').delete().eq('id', job.id);
            if (error) throw error;
            setSuccess('Job listing deleted successfully');
            fetchJobs();
        } catch (err) {
            console.error('Error deleting job:', err);
            setError('Failed to delete job listing');
        }
    };

    const handleUpdateApplicationStatus = async (applicationId: string, newStatus: string) => {
        try {
            const { error } = await (supabase as any)
                .from('job_applications')
                .update({ status: newStatus })
                .eq('id', applicationId);

            if (error) throw error;
            setSuccess('Application status updated');
            fetchApplications();
        } catch (err) {
            console.error('Error updating status:', err);
            setError('Failed to update application status');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleArrayInputChange = (index: number, field: keyof typeof formData, value: string) => {
        setFormData(prev => {
            const array = [...(prev[field] as string[])];
            array[index] = value;
            return { ...prev, [field]: array };
        });
    };

    const addArrayItem = (field: keyof typeof formData) => {
        setFormData(prev => ({
            ...prev,
            [field]: [...(prev[field] as string[]), ''],
        }));
    };

    const removeArrayItem = (index: number, field: keyof typeof formData) => {
        setFormData(prev => {
            const array = [...(prev[field] as string[])];
            array.splice(index, 1);
            if (array.length === 0) array.push('');
            return { ...prev, [field]: array };
        });
    };

    const downloadResume = (url: string, fileName: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = APPLICATION_STATUS.find(s => s.value === status);
        return statusConfig ? (
            <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${statusConfig.color}-100 text-${statusConfig.color}-700`}>
                {statusConfig.label}
            </span>
        ) : status;
    };

    // Job columns
    const jobColumns = [
        {
            key: 'title',
            header: 'Job Title',
            render: (row: JobListing) => (
                <div>
                    <p className="font-medium text-slate-900">{row.title}</p>
                    <p className="text-sm text-slate-500">{row.department}</p>
                </div>
            ),
        },
        {
            key: 'location',
            header: 'Location',
            render: (row: JobListing) => row.location,
        },
        {
            key: 'type',
            header: 'Type',
            render: (row: JobListing) => (
                <span className="capitalize">{row.type.replace('-', ' ')}</span>
            ),
        },
        {
            key: 'applications_count',
            header: 'Applications',
            render: (row: JobListing) => (
                <span className="inline-flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {row.applications_count}
                </span>
            ),
        },
        {
            key: 'is_active',
            header: 'Status',
            render: (row: JobListing) => (
                <StatusBadge status={row.is_active ? 'active' : 'inactive'} />
            ),
        },
        {
            key: 'created_at',
            header: 'Posted',
            render: (row: JobListing) =>
                new Date(row.created_at).toLocaleDateString('en-IN'),
        },
    ];

    // Application columns
    const applicationColumns = [
        {
            key: 'full_name',
            header: 'Applicant',
            render: (row: ApplicationWithJob) => (
                <div>
                    <p className="font-medium text-slate-900">{row.full_name}</p>
                    <p className="text-sm text-slate-500">{row.email}</p>
                </div>
            ),
        },
        {
            key: 'job_title',
            header: 'Position',
            render: (row: ApplicationWithJob) => (
                <div>
                    <p className="font-medium text-slate-900">
                        {row.job_listings?.title || 'General Application'}
                    </p>
                    <p className="text-sm text-slate-500">
                        {row.job_listings?.department || '-'}
                    </p>
                </div>
            ),
        },
        {
            key: 'years_of_experience',
            header: 'Experience',
            render: (row: ApplicationWithJob) => row.years_of_experience || '-',
        },
        {
            key: 'status',
            header: 'Status',
            render: (row: ApplicationWithJob) => getStatusBadge(row.status),
        },
        {
            key: 'created_at',
            header: 'Applied',
            render: (row: ApplicationWithJob) =>
                new Date(row.created_at).toLocaleDateString('en-IN'),
        },
    ];

    return (
        <div className="p-4 lg:p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <Briefcase className="w-8 h-8 text-indigo-600" />
                    Career Portal Management
                </h1>
                <p className="text-slate-600 mt-1">
                    Manage job listings and track applications
                </p>
            </div>

            {/* Success/Error Messages */}
            {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <p className="text-green-800">{success}</p>
                    <button onClick={() => setSuccess(null)} className="ml-auto">
                        <X className="w-4 h-4 text-green-600" />
                    </button>
                </div>
            )}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <p className="text-red-800">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="w-4 h-4 text-red-600" />
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('jobs')}
                    className={`px-6 py-3 font-medium transition-colors ${activeTab === 'jobs'
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                >
                    Job Listings
                </button>
                <button
                    onClick={() => setActiveTab('applications')}
                    className={`px-6 py-3 font-medium transition-colors ${activeTab === 'applications'
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                >
                    Applications
                </button>
            </div>

            {/* Content */}
            {activeTab === 'jobs' ? (
                <DataTable
                    data={jobs}
                    columns={jobColumns}
                    keyExtractor={(row) => row.id}
                    title="Job Listings"
                    searchKeys={['title', 'department', 'location']}
                    loading={loading}
                    onEdit={handleEditJob}
                    onDelete={handleDeleteJob}
                    actions={
                        <button
                            onClick={handleCreateJob}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Post New Job
                        </button>
                    }
                />
            ) : (
                <DataTable
                    data={applications}
                    columns={applicationColumns}
                    keyExtractor={(row) => row.id}
                    title="Applications"
                    searchKeys={['full_name', 'email']}
                    loading={loading}
                    onView={handleViewApplication}
                />
            )}

            {/* Dialog */}
            {dialogOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Dialog Header */}
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900">
                                {dialogMode === 'create' && 'Post New Job'}
                                {dialogMode === 'edit' && 'Edit Job Listing'}
                                {dialogMode === 'view' && 'Application Details'}
                            </h2>
                            <button
                                onClick={() => setDialogOpen(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Dialog Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {dialogMode === 'view' && selectedItem && 'full_name' in selectedItem ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-slate-500">Full Name</p>
                                            <p className="font-medium text-slate-900">{selectedItem.full_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Email</p>
                                            <p className="font-medium text-slate-900">{selectedItem.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Phone</p>
                                            <p className="font-medium text-slate-900">{selectedItem.phone}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Experience</p>
                                            <p className="font-medium text-slate-900">{selectedItem.years_of_experience || '-'}</p>
                                        </div>
                                    </div>

                                    {selectedItem.linkedin && (
                                        <div>
                                            <p className="text-sm text-slate-500">LinkedIn</p>
                                            <a href={selectedItem.linkedin} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                                                {selectedItem.linkedin}
                                            </a>
                                        </div>
                                    )}

                                    {selectedItem.portfolio && (
                                        <div>
                                            <p className="text-sm text-slate-500">Portfolio</p>
                                            <a href={selectedItem.portfolio} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                                                {selectedItem.portfolio}
                                            </a>
                                        </div>
                                    )}

                                    <div>
                                        <p className="text-sm text-slate-500">Resume</p>
                                        <button
                                            onClick={() => downloadResume(selectedItem.resume_url, selectedItem.resume_file_name)}
                                            className="flex items-center gap-2 text-indigo-600 hover:underline"
                                        >
                                            <Download className="w-4 h-4" />
                                            {selectedItem.resume_file_name}
                                        </button>
                                    </div>

                                    {selectedItem.cover_letter && (
                                        <div>
                                            <p className="text-sm text-slate-500">Cover Letter</p>
                                            <p className="text-slate-700 mt-1 whitespace-pre-wrap">{selectedItem.cover_letter}</p>
                                        </div>
                                    )}

                                    <div>
                                        <p className="text-sm text-slate-500 mb-2">Update Status</p>
                                        <div className="flex gap-2">
                                            {APPLICATION_STATUS.map((status) => (
                                                <button
                                                    key={status.value}
                                                    onClick={() => handleUpdateApplicationStatus(selectedItem.id, status.value)}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedItem.status === status.value
                                                        ? `bg-${status.color}-100 text-${status.color}-700`
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                        }`}
                                                >
                                                    {status.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmitJob} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Job Title *
                                            </label>
                                            <input
                                                type="text"
                                                name="title"
                                                value={formData.title}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Department *
                                            </label>
                                            <input
                                                type="text"
                                                name="department"
                                                value={formData.department}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Location *
                                            </label>
                                            <input
                                                type="text"
                                                name="location"
                                                value={formData.location}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Job Type *
                                            </label>
                                            <select
                                                name="type"
                                                value={formData.type}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                required
                                            >
                                                {JOB_TYPES.map(t => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Experience Level *
                                            </label>
                                            <select
                                                name="experience_level"
                                                value={formData.experience_level}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                required
                                            >
                                                {EXPERIENCE_LEVELS.map(e => (
                                                    <option key={e.value} value={e.value}>{e.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Application Deadline
                                            </label>
                                            <input
                                                type="date"
                                                name="deadline"
                                                value={formData.deadline}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Salary Min (₹)
                                            </label>
                                            <input
                                                type="number"
                                                name="salary_min"
                                                value={formData.salary_min}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                placeholder="e.g., 500000"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Salary Max (₹)
                                            </label>
                                            <input
                                                type="number"
                                                name="salary_max"
                                                value={formData.salary_max}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                placeholder="e.g., 1000000"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Description *
                                        </label>
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            rows={4}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                                            required
                                        />
                                    </div>

                                    {/* Requirements */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Requirements
                                        </label>
                                        {formData.requirements.map((req, idx) => (
                                            <div key={idx} className="flex gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    value={req}
                                                    onChange={(e) => handleArrayInputChange(idx, 'requirements', e.target.value)}
                                                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="e.g., Bachelor's degree in Computer Science"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeArrayItem(idx, 'requirements')}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => addArrayItem('requirements')}
                                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                        >
                                            + Add Requirement
                                        </button>
                                    </div>

                                    {/* Responsibilities */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Responsibilities
                                        </label>
                                        {formData.responsibilities.map((resp, idx) => (
                                            <div key={idx} className="flex gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    value={resp}
                                                    onChange={(e) => handleArrayInputChange(idx, 'responsibilities', e.target.value)}
                                                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="e.g., Develop and maintain web applications"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeArrayItem(idx, 'responsibilities')}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => addArrayItem('responsibilities')}
                                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                        >
                                            + Add Responsibility
                                        </button>
                                    </div>

                                    {/* Skills */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Skills
                                        </label>
                                        {formData.skills.map((skill, idx) => (
                                            <div key={idx} className="flex gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    value={skill}
                                                    onChange={(e) => handleArrayInputChange(idx, 'skills', e.target.value)}
                                                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="e.g., React, TypeScript"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeArrayItem(idx, 'skills')}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => addArrayItem('skills')}
                                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                        >
                                            + Add Skill
                                        </button>
                                    </div>

                                    {/* Benefits */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Benefits
                                        </label>
                                        {formData.benefits.map((benefit, idx) => (
                                            <div key={idx} className="flex gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    value={benefit}
                                                    onChange={(e) => handleArrayInputChange(idx, 'benefits', e.target.value)}
                                                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="e.g., Health insurance, Flexible work hours"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeArrayItem(idx, 'benefits')}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => addArrayItem('benefits')}
                                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                        >
                                            + Add Benefit
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            name="is_active"
                                            checked={formData.is_active}
                                            onChange={handleInputChange}
                                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                            id="is-active"
                                        />
                                        <label htmlFor="is-active" className="text-sm text-slate-700">
                                            Active (visible to candidates)
                                        </label>
                                    </div>
                                </form>
                            )}
                        </div>

                        {/* Dialog Footer */}
                        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                            <button
                                onClick={() => setDialogOpen(false)}
                                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            {dialogMode !== 'view' && (
                                <button
                                    onClick={handleSubmitJob}
                                    disabled={submitting}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : dialogMode === 'create' ? 'Create Job' : 'Update Job'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
