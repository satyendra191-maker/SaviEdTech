'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import {
    ArrowLeft,
    Upload,
    FileText,
    X,
    CheckCircle,
    AlertCircle,
    Briefcase,
    MapPin,
    Loader2,
} from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

interface JobListing {
    id: string;
    title: string;
    department: string;
    location: string;
    type: string;
}

interface FormData {
    fullName: string;
    email: string;
    phone: string;
    linkedin: string;
    portfolio: string;
    currentCompany: string;
    yearsOfExperience: string;
    currentCTC: string;
    expectedCTC: string;
    noticePeriod: string;
    coverLetter: string;
    referrer: string;
}

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const ALLOWED_FILE_TYPES = ['application/pdf'];

function ApplyPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const jobId = searchParams.get('jobId');

    const [job, setJob] = useState<JobListing | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Form state
    const [formData, setFormData] = useState<FormData>({
        fullName: '',
        email: '',
        phone: '',
        linkedin: '',
        portfolio: '',
        currentCompany: '',
        yearsOfExperience: '',
        currentCTC: '',
        expectedCTC: '',
        noticePeriod: '',
        coverLetter: '',
        referrer: '',
    });

    // File upload state
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    const supabase = createBrowserSupabaseClient();

    useEffect(() => {
        if (jobId) {
            fetchJobDetails();
        } else {
            setLoading(false);
        }
    }, [jobId]);

    const fetchJobDetails = async () => {
        try {
            const { data, error } = await (supabase as any)
                .from('job_listings')
                .select('id, title, department, location, type')
                .eq('id', jobId)
                .eq('is_active', true)
                .single();

            if (error) throw error;
            setJob(data);
        } catch (err) {
            console.error('Error fetching job:', err);
            setError('Job not found or no longer accepting applications');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setFileError(null);

        if (!file) return;

        // Validate file type
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            setFileError('Please upload a PDF file only');
            return;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            setFileError('File size must be less than 1MB');
            return;
        }

        setResumeFile(file);
    };

    const removeFile = () => {
        setResumeFile(null);
        setFileError(null);
        setUploadProgress(0);
    };

    const uploadResume = async (): Promise<string | null> => {
        if (!resumeFile) return null;

        try {
            const fileExt = resumeFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `resumes/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('career-applications')
                .upload(filePath, resumeFile, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('career-applications')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('Error uploading resume:', error);
            throw new Error('Failed to upload resume');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validate required fields
        if (!formData.fullName.trim()) {
            setError('Please enter your full name');
            return;
        }
        if (!formData.email.trim()) {
            setError('Please enter your email');
            return;
        }
        if (!formData.phone.trim()) {
            setError('Please enter your phone number');
            return;
        }
        if (!resumeFile) {
            setError('Please upload your resume');
            return;
        }

        setSubmitting(true);

        try {
            // Upload resume first
            const resumeUrl = await uploadResume();

            // Submit application
            const response = await fetch('/api/careers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jobId: jobId || null,
                    ...formData,
                    resumeUrl,
                    fileName: resumeFile.name,
                    fileSize: resumeFile.size,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to submit application');
            }

            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error('Error submitting application:', err);
            setError(err instanceof Error ? err.message : 'Failed to submit application');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Navbar />
                <div className="max-w-2xl mx-auto px-4 py-16">
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-4">
                            Application Submitted!
                        </h1>
                        <p className="text-slate-600 mb-6">
                            Thank you for your interest in joining SaviEdTech. We have received your application
                            and will review it shortly. You will receive a confirmation email at{' '}
                            <span className="font-medium text-slate-900">{formData.email}</span>.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/careers"
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                            >
                                Browse More Jobs
                            </Link>
                            <Link
                                href="/"
                                className="px-6 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                            >
                                Go to Homepage
                            </Link>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />

            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* Back Link */}
                <Link
                    href={jobId ? `/careers/${jobId}` : '/careers'}
                    className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors mb-6"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                </Link>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        {job ? `Apply for ${job.title}` : 'General Application'}
                    </h1>
                    {job && (
                        <div className="flex flex-wrap items-center gap-4 text-slate-600">
                            <span className="flex items-center gap-1.5">
                                <Briefcase className="w-4 h-4" />
                                {job.department}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4" />
                                {job.location}
                            </span>
                        </div>
                    )}
                    {!job && (
                        <p className="text-slate-600">
                            Don't see a suitable position? Submit your resume for future opportunities.
                        </p>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="font-medium text-red-900">Error</h3>
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                )}

                {/* Application Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
                    {/* Personal Information */}
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                            Personal Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Enter your full name"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Phone <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="+91 98765 43210"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    LinkedIn Profile
                                </label>
                                <input
                                    type="url"
                                    name="linkedin"
                                    value={formData.linkedin}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="https://linkedin.com/in/yourprofile"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Portfolio/Website
                                </label>
                                <input
                                    type="url"
                                    name="portfolio"
                                    value={formData.portfolio}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="https://yourportfolio.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Professional Information */}
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                            Professional Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Current Company
                                </label>
                                <input
                                    type="text"
                                    name="currentCompany"
                                    value={formData.currentCompany}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Company name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Years of Experience
                                </label>
                                <select
                                    name="yearsOfExperience"
                                    value={formData.yearsOfExperience}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="">Select experience</option>
                                    <option value="0-1">0-1 years</option>
                                    <option value="1-3">1-3 years</option>
                                    <option value="3-5">3-5 years</option>
                                    <option value="5-8">5-8 years</option>
                                    <option value="8-12">8-12 years</option>
                                    <option value="12+">12+ years</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Current CTC (LPA)
                                </label>
                                <input
                                    type="text"
                                    name="currentCTC"
                                    value={formData.currentCTC}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="e.g., 8"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Expected CTC (LPA)
                                </label>
                                <input
                                    type="text"
                                    name="expectedCTC"
                                    value={formData.expectedCTC}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="e.g., 12"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Notice Period
                                </label>
                                <select
                                    name="noticePeriod"
                                    value={formData.noticePeriod}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="">Select notice period</option>
                                    <option value="immediate">Immediate</option>
                                    <option value="15-days">15 days</option>
                                    <option value="1-month">1 month</option>
                                    <option value="2-months">2 months</option>
                                    <option value="3-months">3 months</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    How did you hear about us?
                                </label>
                                <select
                                    name="referrer"
                                    value={formData.referrer}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="">Select an option</option>
                                    <option value="linkedin">LinkedIn</option>
                                    <option value="indeed">Indeed</option>
                                    <option value="referral">Employee Referral</option>
                                    <option value="website">Company Website</option>
                                    <option value="social-media">Social Media</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Resume Upload */}
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                            Resume Upload <span className="text-red-500">*</span>
                        </h2>
                        <div className="space-y-4">
                            {!resumeFile ? (
                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors">
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="resume-upload"
                                    />
                                    <label
                                        htmlFor="resume-upload"
                                        className="cursor-pointer flex flex-col items-center"
                                    >
                                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                                            <Upload className="w-8 h-8 text-indigo-600" />
                                        </div>
                                        <p className="text-lg font-medium text-slate-900 mb-1">
                                            Click to upload your resume
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            PDF only, max 1MB
                                        </p>
                                    </label>
                                </div>
                            ) : (
                                <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 truncate">
                                            {resumeFile.name}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            {(resumeFile.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={removeFile}
                                        className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-slate-500" />
                                    </button>
                                </div>
                            )}

                            {fileError && (
                                <div className="flex items-center gap-2 text-red-600 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    {fileError}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cover Letter */}
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                            Cover Letter
                        </h2>
                        <textarea
                            name="coverLetter"
                            value={formData.coverLetter}
                            onChange={handleInputChange}
                            rows={5}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            placeholder="Tell us why you're interested in this position and what makes you a great fit..."
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 sm:flex-none px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                'Submit Application'
                            )}
                        </button>
                        <Link
                            href="/careers"
                            className="px-8 py-4 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-semibold text-center"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>

            <Footer />
        </div>
    );
}

export default function ApplyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        }>
            <ApplyPageContent />
        </Suspense>
    );
}
