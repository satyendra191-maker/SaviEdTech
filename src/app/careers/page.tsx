'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import {
    Search,
    MapPin,
    Briefcase,
    Clock,
    ChevronRight,
    Filter,
    Building2,
    GraduationCap,
    DollarSign,
} from 'lucide-react';

interface JobListing {
    id: string;
    title: string;
    department: string;
    location: string;
    type: 'full-time' | 'part-time' | 'contract' | 'internship';
    experience_level: 'entry' | 'mid' | 'senior' | 'lead';
    salary_min: number | null;
    salary_max: number | null;
    description: string;
    requirements: string[];
    responsibilities: string[];
    skills: string[];
    is_active: boolean;
    created_at: string;
    applications_count: number;
}

const DEPARTMENTS = [
    'All Departments',
    'Engineering',
    'Content',
    'Marketing',
    'Sales',
    'Operations',
    'Customer Success',
];

const JOB_TYPES = [
    { value: 'all', label: 'All Types' },
    { value: 'full-time', label: 'Full-time' },
    { value: 'part-time', label: 'Part-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'internship', label: 'Internship' },
];

const EXPERIENCE_LEVELS = [
    { value: 'all', label: 'All Levels' },
    { value: 'entry', label: 'Entry Level' },
    { value: 'mid', label: 'Mid Level' },
    { value: 'senior', label: 'Senior Level' },
    { value: 'lead', label: 'Lead/Manager' },
];

export default function CareersPage() {
    const router = useRouter();
    const [jobs, setJobs] = useState<JobListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
    const [selectedType, setSelectedType] = useState('all');
    const [selectedExperience, setSelectedExperience] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    const supabase = createBrowserSupabaseClient();

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const { data, error } = await (supabase as any)
                .from('job_listings')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setJobs(data || []);
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredJobs = jobs.filter((job) => {
        const matchesSearch =
            searchTerm === '' ||
            job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.skills.some((skill) => skill.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesDepartment =
            selectedDepartment === 'All Departments' || job.department === selectedDepartment;

        const matchesType = selectedType === 'all' || job.type === selectedType;

        const matchesExperience =
            selectedExperience === 'all' || job.experience_level === selectedExperience;

        return matchesSearch && matchesDepartment && matchesType && matchesExperience;
    });

    const getExperienceLabel = (level: string) => {
        const labels: Record<string, string> = {
            entry: 'Entry Level',
            mid: 'Mid Level',
            senior: 'Senior Level',
            lead: 'Lead/Manager',
        };
        return labels[level] || level;
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'full-time': 'Full-time',
            'part-time': 'Part-time',
            contract: 'Contract',
            internship: 'Internship',
        };
        return labels[type] || type;
    };

    const formatSalary = (min: number | null, max: number | null) => {
        if (!min && !max) return 'Competitive';
        if (min && !max) return `From ₹${(min / 100000).toFixed(1)}L`;
        if (!min && max) return `Up to ₹${(max / 100000).toFixed(1)}L`;
        return `₹${(min! / 100000).toFixed(0)}L - ₹${(max! / 100000).toFixed(0)}L`;
    };

    return (
        <div className="min-h-screen page-bg-jobs">
            {/* Hero Section */}
            <section className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 py-20 px-4">
                <div className="max-w-6xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Join Our Mission
                    </h1>
                    <p className="text-xl text-white/90 mb-2 max-w-2xl mx-auto">
                        Help us transform education for millions of students across India
                    </p>
                    <p className="text-white/80">
                        {jobs.length} open positions available
                    </p>
                </div>
            </section>

            {/* Search and Filters */}
            <section className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by job title, skills, or keywords..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        {/* Filter Toggle */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${showFilters
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            <Filter className="w-5 h-5" />
                            <span className="hidden sm:inline">Filters</span>
                        </button>
                    </div>

                    {/* Expanded Filters */}
                    {showFilters && (
                        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Department
                                </label>
                                <select
                                    value={selectedDepartment}
                                    onChange={(e) => setSelectedDepartment(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                >
                                    {DEPARTMENTS.map((dept) => (
                                        <option key={dept} value={dept}>
                                            {dept}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Job Type
                                </label>
                                <select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                >
                                    {JOB_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Experience Level
                                </label>
                                <select
                                    value={selectedExperience}
                                    onChange={(e) => setSelectedExperience(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                >
                                    {EXPERIENCE_LEVELS.map((level) => (
                                        <option key={level.value} value={level.value}>
                                            {level.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Job Listings */}
            <section className="max-w-6xl mx-auto px-4 py-8">
                {/* Results Count */}
                <div className="mb-6 flex items-center justify-between">
                    <p className="text-slate-600">
                        Showing <span className="font-semibold text-slate-900">{filteredJobs.length}</span> of{' '}
                        <span className="font-semibold text-slate-900">{jobs.length}</span> positions
                    </p>
                    {(searchTerm || selectedDepartment !== 'All Departments' || selectedType !== 'all' || selectedExperience !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedDepartment('All Departments');
                                setSelectedType('all');
                                setSelectedExperience('all');
                            }}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            Clear all filters
                        </button>
                    )}
                </div>

                {/* Jobs Grid */}
                {loading ? (
                    <div className="grid gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 animate-pulse">
                                <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                                <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
                                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Briefcase className="w-10 h-10 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">
                            No positions found
                        </h3>
                        <p className="text-slate-600 mb-6">
                            Try adjusting your search criteria or filters
                        </p>
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedDepartment('All Departments');
                                setSelectedType('all');
                                setSelectedExperience('all');
                            }}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                        >
                            Clear Filters
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredJobs.map((job) => (
                            <Link
                                key={job.id}
                                href={`/careers/${job.id}`}
                                className="group bg-white rounded-xl p-6 border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all"
                            >
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                {job.title}
                                            </h3>
                                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
                                                {job.department}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-4">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-4 h-4" />
                                                {job.location}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Briefcase className="w-4 h-4" />
                                                {getTypeLabel(job.type)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <GraduationCap className="w-4 h-4" />
                                                {getExperienceLabel(job.experience_level)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <DollarSign className="w-4 h-4" />
                                                {formatSalary(job.salary_min, job.salary_max)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                Posted {new Date(job.created_at).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                })}
                                            </span>
                                        </div>

                                        <p className="text-slate-600 line-clamp-2 mb-4">
                                            {job.description}
                                        </p>

                                        <div className="flex flex-wrap gap-2">
                                            {job.skills.slice(0, 4).map((skill) => (
                                                <span
                                                    key={skill}
                                                    className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                            {job.skills.length > 4 && (
                                                <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md">
                                                    +{job.skills.length - 4} more
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-indigo-600 font-medium md:pt-1">
                                        View Details
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {/* Why Join Us */}
            <section className="bg-white border-t border-slate-200 py-16">
                <div className="max-w-6xl mx-auto px-4">
                    <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
                        Why Join SaviEdTech?
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <GraduationCap className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">
                                Impact Millions
                            </h3>
                            <p className="text-slate-600">
                                Your work will directly help millions of students achieve their dreams of cracking JEE and NEET.
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Building2 className="w-8 h-8 text-purple-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">
                                Growth & Learning
                            </h3>
                            <p className="text-slate-600">
                                Continuous learning opportunities, mentorship, and a culture that encourages innovation.
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <DollarSign className="w-8 h-8 text-pink-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">
                                Competitive Benefits
                            </h3>
                            <p className="text-slate-600">
                                Attractive compensation, health insurance, flexible work hours, and more.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
