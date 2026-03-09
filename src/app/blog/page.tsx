import type { Metadata } from 'next';
import Link from 'next/link';
import { Facebook, Instagram, Linkedin, Mail, MessageCircle, Twitter, Youtube } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Blog - SaviEduTech',
    description: 'Insights, preparation strategy, exam guidance, and learning updates from SaviEduTech.',
};

const SOCIAL_LINKS = [
    { name: 'YouTube', href: 'https://youtube.com/@saviedutech', icon: Youtube },
    { name: 'Instagram', href: 'https://instagram.com/saviedutech', icon: Instagram },
    { name: 'Facebook', href: 'https://facebook.com/saviedutech', icon: Facebook },
    { name: 'Twitter', href: 'https://x.com/saviedutech', icon: Twitter },
    { name: 'LinkedIn', href: 'https://linkedin.com/company/saviedutech', icon: Linkedin },
    { name: 'Telegram', href: 'https://t.me/saviedutech', icon: MessageCircle },
    { name: 'WhatsApp', href: 'https://wa.me/919506943134', icon: Mail },
];

const RSS_FEED_URL = '/api/blog/rss';

const posts = [
    {
        title: 'How to Build a JEE Revision Loop That Actually Sticks',
        category: 'JEE Strategy',
        description: 'A practical revision cycle using lectures, question practice, and timed checkpoints.',
        publishedAt: '2026-03-09',
    },
    {
        title: 'NEET Biology Retention: A Smarter NCERT Review Pattern',
        category: 'NEET',
        description: 'Use short concept reviews, rapid recall, and image-based learning for better memory.',
        publishedAt: '2026-03-08',
    },
    {
        title: 'What Parents Should Track During a Student Study Week',
        category: 'Parent Guidance',
        description: 'A cleaner way to review consistency, effort, and progress without overwhelming the learner.',
        publishedAt: '2026-03-07',
    },
];

export default function BlogPage() {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://saviedutech.com/blog';
    
    const shareLinks = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Check out SaviEduTech Blog for exam preparation tips!')}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
        whatsapp: `https://wa.me/919506943134?text=${encodeURIComponent('Check out SaviEduTech Blog: ' + shareUrl)}`,
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50">
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                <div className="max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">SaviEduTech Blog</p>
                    <h1 className="mt-4 text-4xl font-black text-slate-950 sm:text-5xl">
                        Study strategy, exam insights, and platform guidance
                    </h1>
                    <p className="mt-4 text-lg leading-8 text-slate-600">
                        A lightweight editorial space for students and parents to stay aligned with smarter preparation habits.
                    </p>
                    
                    <div className="mt-6 flex flex-wrap gap-4">
                        <Link 
                            href={RSS_FEED_URL}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-orange-700 font-semibold text-sm hover:bg-orange-200 transition-colors"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z"/>
                            </svg>
                            RSS Feed
                        </Link>
                        
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500">Share:</span>
                            <div className="flex gap-2">
                                <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors" aria-label="Share on Facebook">
                                    <Facebook className="w-4 h-4" />
                                </a>
                                <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-sky-100 text-sky-600 hover:bg-sky-200 transition-colors" aria-label="Share on Twitter">
                                    <Twitter className="w-4 h-4" />
                                </a>
                                <a href={shareLinks.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors" aria-label="Share on LinkedIn">
                                    <Linkedin className="w-4 h-4" />
                                </a>
                                <a href={shareLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors" aria-label="Share on WhatsApp">
                                    <MessageCircle className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-12 grid gap-6 lg:grid-cols-3">
                    {posts.map((post) => (
                        <article key={post.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">{post.category}</p>
                            <h2 className="mt-4 text-xl font-bold text-slate-950">{post.title}</h2>
                            <p className="mt-3 text-sm leading-7 text-slate-600">{post.description}</p>
                            <div className="mt-4 flex items-center justify-between">
                                <span className="text-xs text-slate-400">{post.publishedAt}</span>
                                <Link href="/contact" className="inline-flex text-sm font-semibold text-sky-700 hover:text-sky-900">
                                    Request full article
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="mt-16 rounded-3xl border border-slate-200 bg-white p-8">
                    <h2 className="text-2xl font-bold text-slate-950 mb-4">Stay Connected</h2>
                    <p className="text-slate-600 mb-6">Follow SaviEduTech on all social media platforms for real-time updates, exam tips, and educational content.</p>
                    <div className="flex flex-wrap gap-4">
                        {SOCIAL_LINKS.map((social) => {
                            const Icon = social.icon;
                            return (
                                <a
                                    key={social.name}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 text-slate-700 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 transition-colors"
                                >
                                    <Icon className="w-4 h-4" />
                                    {social.name}
                                </a>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
