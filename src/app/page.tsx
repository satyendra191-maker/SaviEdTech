import dynamic from 'next/dynamic';
import { Hero } from '@/components/hero';
import { LeadForm } from '@/components/lead-form';
import { Features } from '@/components/features';
import { FacultySection } from '@/components/faculty-section';
import { Stats } from '@/components/stats';
import { Testimonials } from '@/components/testimonials';
import { DailyChallengePreview } from '@/components/daily-challenge-preview';
import { AsyncErrorBoundary } from '@/components/error-boundary';

const AIQuerySystem = dynamic(
    () => import('@/components/ai-query-system').then((module) => module.AIQuerySystem),
    {
        loading: () => (
            <div className="mx-auto mt-12 w-full max-w-2xl rounded-3xl border border-white/15 bg-white/5 p-6 text-white shadow-2xl">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 w-40 rounded bg-white/10" />
                    <div className="h-20 rounded-2xl bg-white/10" />
                    <div className="h-12 rounded-2xl bg-white/10" />
                </div>
            </div>
        ),
    }
);

export default function HomePage() {
    return (
        <div className="min-h-screen page-bg-education">
            <Hero />
            <Stats />
            <section className="py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900">
                <AsyncErrorBoundary
                    fallback={
                        <div className="mx-auto mt-12 w-full max-w-2xl rounded-3xl border border-white/15 bg-white/5 p-6 text-white shadow-2xl">
                            <h3 className="text-xl font-bold">SaviEdu AI is temporarily unavailable</h3>
                            <p className="mt-2 text-sm text-slate-300">
                                Ask again in a moment, or use the dashboard for lectures, practice, and mock tests.
                            </p>
                        </div>
                    }
                >
                    <AIQuerySystem />
                </AsyncErrorBoundary>
            </section>
            <Features />
            <FacultySection />
            <DailyChallengePreview />
            <Testimonials />
            <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                                Start Your Journey to Success
                            </h2>
                            <p className="text-lg text-slate-600 mb-8">
                                Join thousands of students who have transformed their dreams into reality with SaviEduTech. Our expert faculty and comprehensive study materials give you the edge you need.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    'Live interactive lectures from expert faculty',
                                    'Daily practice problems with instant solutions',
                                    'Full-length mock tests with detailed analysis',
                                    'Personalized revision recommendations',
                                    '24/7 doubt resolution support',
                                ].map((item, index) => (
                                    <li key={index} className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-slate-700">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <LeadForm />
                    </div>
                </div>
            </section>
        </div>
    );
}
