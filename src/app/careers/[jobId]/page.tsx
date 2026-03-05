'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import {
    MapPin,
    Briefcase,
    Clock,
    GraduationCap,
    DollarSign,
    ArrowLeft,
    CheckCircle,
    Share2,
    Calendar,
    Users,
    Building2,
} from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

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
    benefits: string[];
    is_active: boolean;
    created_at: string;
    applications_count: number;
    deadline: string | null;
}

export default function JobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const jobId = params.jobId as string;

    const [job, setJob] = useState<JobListing | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const supabase = createBrowserSupabaseClient();

    useEffect(() => {
        if (jobId) {
            fetchJobDetails();
        }
    }, [jobId]);

    const fetchJobDetails = async () => {
        try {
            setLoading(true);
            const { data, error } = await (supabase as any)
                .from('job_listings')
                .select('*')
                .eq('id', jobId)
                .eq('is_active', true)
                .single();

            if (error) throw error;
            if (!data) {
                setError('Job not found');
                return;
            }

            setJob(data);
        } catch (err) {
            console.error('Error fetching job details:', err);
            setError('Failed to load job details');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        const url = window.location.href;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

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
        if (min && !max) return `From ₹${(min / 100000).toFixed(1)}L per annum`;
        if (!min && max) return `Up to ₹${(max / 100000).toFixed(1)}L per annum`;
        return `₹${(min! / 100000).toFixed(0)}L - ₹${(max! / 100000).toFixed(0)}L per annum`;
    };

    const getDaysRemaining = (deadline: string | null) => {
        if (!deadline) return null;
        const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days < 0) return 'Closed';
        if (days === 0) return 'Closing today';
        if (days === 1) return '1 day left';
        return `${days} days left`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Navbar />
                <div className="max-w-4xl mx-auto px-4 py-12">
                    <div className="animate-pulse">
                        <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
                        <div className="h-4 bg-slate-200 rounded w-1/4 mb-8"></div>
                        <div className="h-32 bg-slate-200 rounded mb-6"></div>
                        <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    if (error || !job) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Navbar />
                <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Briefcase className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">
                        {error || 'Job Not Found'}
                    </h1>
                    <p className="text-slate-600 mb-6">
                        The position you're looking for doesn't exist or has been removed.
                    </p>
                    <Link
                        href="/careers"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Careers
                    </Link>
                </div>
                <Footer />
            </div>
        );
    }

    const daysRemaining = getDaysRemaining(job.deadline);

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />

            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Back Link */}
                <Link
                    href="/careers"
                    className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors mb-6"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to all positions
                </Link>

                {/* Header Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 mb-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                                    {job.title}
                                </h1>
                                {daysRemaining && (
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${daysRemaining === 'Closed'
                                            ? 'bg-red-100 text-red-700'
                                            : daysRemaining.includes('today')
                                                ? 'bg-orange-100 text-orange-700'
                                                : 'bg-green-100 text-green-700'
                                        }`}>
                                        {daysRemaining}
                                    </span>
                                )}
                            </div>
                            <p className="text-lg text-slate-600 mb-4">{job.department}</p>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                                <span className="flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4" />
                                    {job.location}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Briefcase className="w-4 h-4" />
                                    {getTypeLabel(job.type)}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <GraduationCap className="w-4 h-4" />
                                    {getExperienceLabel(job.experience_level)}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4" />
                                    Posted {new Date(job.created_at).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleShare}
                                className="p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                                title="Share this job"
                            >
                                {copied ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                    <Share2 className="w-5 h-5 text-slate-600" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
                        <Link
                            href={`/careers/apply?jobId=${job.id}`}
                            className="flex-1 sm:flex-none px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold text-center"
                        >
                            Apply Now
                        </Link>
                        <button
                            onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                            className="flex-1 sm:flex-none px-8 py-4 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-semibold"
                        >
                            Learn More
                        </button>
                    </div>
                </div>

                {/* Salary Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-green-600" />
                            </div>
                            <span className="text-sm text-slate-600">Salary Range</span>
                        </div>
                        <p className="text-lg font-semibold text-slate-900">
                            {formatSalary(job.salary_min, job.salary_max)}
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="text-sm text-slate-600">Applications</span>
                        </div>
                        <p className="text-lg font-semibold text-slate-900">
                            {job.applications_count} applicants
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-purple-600" />
                            </div>
                            <span className="text-sm text-slate-600">Department</span>
                        </div>
                        <p className="text-lg font-semibold text-slate-900">{job.department}</p>
                    </div>
                </div>

                {/* Job Details */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
                    <div className="p-6 md:p-8">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">About the Role</h2>
                        <div className="prose prose-slate max-w-none">
                            <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                                {job.description}
                            </p>
                        </div>
                    </div>

                    {/* Responsibilities */}
                    {job.responsibilities && job.responsibilities.length > 0 && (
                        <div className="px-6 md:px-8 pb-6">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">Key Responsibilities</h3>
                            <ul className="space-y-3">
                                {job.responsibilities.map((responsibility, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                                        <span className="text-slate-600">{responsibility}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Requirements */}
                    {job.requirements && job.requirements.length > 0 && (
                        <div className="px-6 md:px-8 pb-6">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">Requirements</h3>
                            <ul className="space-y-3">
                                {job.requirements.map((requirement, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                                        <span className="text-slate-600">{requirement}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Skills */}
                    {job.skills && job.skills.length > 0 && (
                        <div className="px-6 md:px-8 pb-6">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">Required Skills</h3>
                            <div className="flex flex-wrap gap-2">
                                {job.skills.map((skill) => (
                                    <span
                                        key={skill}
                                        className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Benefits */}
                    {job.benefits && job.benefits.length > 0 && (
                        <div className="px-6 md:px-8 pb-6">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">Benefits</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {job.benefits.map((benefit, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                        </div>
                                        <span className="text-slate-600 text-sm">{benefit}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Application CTA */}
                <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-8 text-center">
                    <h2 className="text-2xl font-bold text-white mb-3">
                        Interested in this position?
                    </h2>
                    <p className="text-white/90 mb-6 max-w-lg mx-auto">
                        Join our team and help shape the future of education in India. We'd love to hear from you!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href={`/careers/apply?jobId=${job.id}`}
                            className="px-8 py-4 bg-white text-indigo-600 rounded-xl hover:bg-slate-50 transition-colors font-semibold"
                        >
                            Apply Now
                        </Link>
                        <Link
                            href="/careers"
                            className="px-8 py-4 bg-white/10 text-white border border-white/30 rounded-xl hover:bg-white/20 transition-colors font-semibold"
                        >
                            View Other Positions
                        </Link>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
