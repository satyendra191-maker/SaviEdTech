'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, User, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface ParentLink {
    id: string;
    student_id: string;
    student_name: string | null;
    student_phone: string;
    verification_status: string;
    created_at: string;
}

export default function ParentVerifyPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const supabase = getSupabaseBrowserClient();
    
    const [studentPhone, setStudentPhone] = useState('');
    const [studentName, setStudentName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [existingLinks, setExistingLinks] = useState<ParentLink[]>([]);
    const [verificationCode, setVerificationCode] = useState('');
    const [showVerification, setShowVerification] = useState(false);

    useEffect(() => {
        if (!authLoading && user) {
            fetchExistingLinks();
        }
    }, [user, authLoading]);

    const fetchExistingLinks = async () => {
        if (!user) return;
        
        const { data, error } = await supabase
            .from('parent_links')
            .select('*')
            .eq('parent_id', user.id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setExistingLinks(data);
        }
    };

    const requestLink = async () => {
        if (!user || !studentPhone) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const { data, error } = await (supabase as any).rpc('link_parent_to_student', {
                p_parent_id: user.id,
                p_student_phone: studentPhone,
                p_student_name: studentName || null
            });

            if (error) throw error;

            setSuccess('Link request submitted! Waiting for student approval.');
            setStudentPhone('');
            setStudentName('');
            setShowVerification(false);
            fetchExistingLinks();
        } catch (err: any) {
            setError(err.message || 'Failed to request link');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Approved</span>;
            case 'pending':
                return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Pending</span>;
            case 'rejected':
                return <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Rejected</span>;
            default:
                return <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">{status}</span>;
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!user) {
        router.push('/login');
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <div className="max-w-2xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Parent Monitoring Portal</h1>
                    <p className="text-slate-600">Link your account to monitor your child's progress on SaviEduTech</p>
                </div>

                {/* Existing Links */}
                {existingLinks.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Linked Students</h2>
                        <div className="space-y-4">
                            {existingLinks.map((link) => (
                                <div key={link.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                            <User className="w-5 h-5 text-primary-600" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-900">
                                                {link.student_name || 'Student'}
                                            </div>
                                            <div className="text-sm text-slate-500">{link.student_phone}</div>
                                        </div>
                                    </div>
                                    {getStatusBadge(link.verification_status)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Request Form */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Link New Student</h2>
                    
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                            <div>
                                <div className="font-medium text-red-700">Error</div>
                                <div className="text-sm text-red-600">{error}</div>
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                            <div>
                                <div className="font-medium text-green-700">Success</div>
                                <div className="text-sm text-green-600">{success}</div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Student's Registered Phone Number
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="tel"
                                    value={studentPhone}
                                    onChange={(e) => setStudentPhone(e.target.value)}
                                    placeholder="Enter phone number"
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Enter the phone number your child used to register on SaviEduTech
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Student's Name (Optional)
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={studentName}
                                    onChange={(e) => setStudentName(e.target.value)}
                                    placeholder="Enter name for identification"
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <button
                            onClick={requestLink}
                            disabled={loading || !studentPhone}
                            className="w-full py-3 bg-gradient-to-r from-primary-600 to-blue-600 text-white font-medium rounded-xl hover:from-primary-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                'Request Link'
                            )}
                        </button>
                    </div>
                </div>

                {/* Instructions */}
                <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100">
                    <h3 className="font-semibold text-blue-900 mb-3">How it works</h3>
                    <ol className="space-y-2 text-sm text-blue-800">
                        <li className="flex gap-2">
                            <span className="font-medium">1.</span>
                            Enter your child's registered phone number
                        </li>
                        <li className="flex gap-2">
                            <span className="font-medium">2.</span>
                            Your child will receive a notification to approve the link
                        </li>
                        <li className="flex gap-2">
                            <span className="font-medium">3.</span>
                            Once approved, you can monitor their progress from your dashboard
                        </li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
