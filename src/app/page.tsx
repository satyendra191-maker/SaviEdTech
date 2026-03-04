import { Hero } from '@/components/hero';
import { LeadForm } from '@/components/lead-form';
import { Features } from '@/components/features';
import { FacultySection } from '@/components/faculty-section';
import { Stats } from '@/components/stats';
import { Testimonials } from '@/components/testimonials';
import { DailyChallengePreview } from '@/components/daily-challenge-preview';

export default function HomePage() {
    return (
        <div className="min-h-screen">
            <Hero />
            <Stats />
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