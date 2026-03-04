import Link from 'next/link';
import { ArrowRight, Play, Users, Award, BookOpen } from 'lucide-react';

export function Hero() {
    return (
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }} />
            </div>

            {/* Floating Elements */}
            <div className="absolute top-20 left-10 w-20 h-20 bg-blue-500/20 rounded-full blur-2xl" />
            <div className="absolute bottom-20 right-10 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-emerald-500/20 rounded-full blur-xl" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Content */}
                    <div className="text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm mb-6">
                            <Award className="w-4 h-4 text-amber-400" />
                            <span>India's #1 Digital Coaching Platform</span>
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                            Crack{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                                JEE & NEET
                            </span>{' '}
                            with India's Best Faculty
                        </h1>

                        <p className="text-lg sm:text-xl text-slate-300 mb-8 max-w-2xl mx-auto lg:mx-0">
                            Join 100,000+ students mastering Physics, Chemistry, Mathematics & Biology with interactive lectures, daily practice, and AI-powered analytics.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-colors group"
                            >
                                Start Free Trial
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                href="/demo"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold border border-white/20 hover:bg-white/20 transition-colors"
                            >
                                <Play className="w-5 h-5" />
                                Watch Demo
                            </Link>
                        </div>

                        {/* Stats */}
                        <div className="flex flex-wrap justify-center lg:justify-start gap-8">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                                    <Users className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-white">100K+</div>
                                    <div className="text-sm text-slate-400">Students</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                                    <BookOpen className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-white">5000+</div>
                                    <div className="text-sm text-slate-400">Video Lectures</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                                    <Award className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-white">95%</div>
                                    <div className="text-sm text-slate-400">Success Rate</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hero Image / Video Preview */}
                    <div className="relative">
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                            <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                                <div className="text-center p-8">
                                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors group">
                                        <Play className="w-8 h-8 text-white ml-1 group-hover:scale-110 transition-transform" />
                                    </div>
                                    <p className="text-white/80 text-lg">See how SaviEduTech works</p>
                                </div>
                            </div>

                            {/* Floating Cards */}
                            <div className="absolute -bottom-4 -left-4 bg-white rounded-xl p-4 shadow-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-slate-900">Daily Progress</div>
                                        <div className="text-xs text-slate-500">+15% this week</div>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute -top-4 -right-4 bg-white rounded-xl p-4 shadow-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                        <Award className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-slate-900">Rank Predicted</div>
                                        <div className="text-xs text-slate-500">AIR under 1000</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Wave Divider */}
            <div className="absolute bottom-0 left-0 right-0">
                <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white" />
                </svg>
            </div>
        </section>
    );
}