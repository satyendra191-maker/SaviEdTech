'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Facebook,
    Instagram,
    Linkedin,
    Mail,
    MapPin,
    MessageCircle,
    Phone,
    Send,
    Twitter,
    Youtube,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

const quickLinks = [
    { name: 'Courses', href: '/courses' },
    { name: 'Faculty', href: '/faculty' },
    { name: 'Career', href: '/careers' },
    { name: 'Blog', href: '/blog' },
    { name: 'Donate', href: '/donate' },
    { name: 'Contact', href: '/contact' },
];

const socialLinks = [
    { name: 'YouTube', href: 'https://youtube.com/@saviedutech', icon: Youtube, hover: 'hover:text-red-400' },
    { name: 'Instagram', href: 'https://instagram.com/saviedutech', icon: Instagram, hover: 'hover:text-pink-400' },
    { name: 'Facebook', href: 'https://facebook.com/saviedutech', icon: Facebook, hover: 'hover:text-blue-400' },
    { name: 'Twitter / X', href: 'https://x.com/saviedutech', icon: Twitter, hover: 'hover:text-sky-300' },
    { name: 'LinkedIn', href: 'https://linkedin.com/company/saviedutech', icon: Linkedin, hover: 'hover:text-cyan-300' },
    { name: 'Telegram', href: 'https://t.me/saviedutech', icon: Send, hover: 'hover:text-sky-300' },
    { name: 'WhatsApp', href: 'https://wa.me/919506943134', icon: MessageCircle, hover: 'hover:text-emerald-300' },
];

export function Footer() {
    const pathname = usePathname();

    const isDashboardRoute = pathname?.startsWith('/dashboard')
        || pathname?.startsWith('/admin')
        || pathname?.startsWith('/super-admin')
        || pathname?.startsWith('/faculty-dashboard')
        || pathname?.startsWith('/auth/callback');

    if (isDashboardRoute) {
        return null;
    }

    return (
        <footer className="bg-slate-950 text-slate-300">
            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                <div className="grid gap-10 xl:grid-cols-[1fr_0.75fr_0.9fr]">
                    <div>
                        <Link href="/" className="inline-flex">
                            <Logo
                                size="sm"
                                variant="full"
                                theme="dark"
                            />
                        </Link>

                        <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
                            SaviEduTech is a clean, AI-powered learning platform for JEE, NEET, and Board preparation with lectures, practice, exams, and guided support.
                        </p>

                        <div className="mt-6 space-y-3 text-sm text-slate-400">
                            <a href="tel:+919506943134" className="flex items-center gap-3 transition-colors hover:text-white">
                                <Phone className="h-4 w-4 text-sky-300" />
                                +91 9506943134
                            </a>
                            <a href="mailto:support@saviedutech.in" className="flex items-center gap-3 transition-colors hover:text-white">
                                <Mail className="h-4 w-4 text-sky-300" />
                                support@saviedutech.in
                            </a>
                            <div className="flex items-start gap-3">
                                <MapPin className="mt-1 h-4 w-4 shrink-0 text-sky-300" />
                                <span>
                                    SaviEduTech - A Brand Unit of Savita Global Interprises
                                    <br />
                                    302, Parth A, 3/11 Patel Colony
                                    <br />
                                    Jamnagar - 361008
                                    <br />
                                    Gujarat, India
                                </span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-white">Explore</h3>
                        <div className="mt-5 grid gap-2">
                            {quickLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className="rounded-xl px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-white">Connect</h3>
                        <p className="mt-5 text-sm leading-7 text-slate-400">
                            Follow SaviEduTech across social platforms and stay connected with new content, updates, and student support.
                        </p>

                        <div className="mt-5 flex flex-wrap gap-3">
                            {socialLinks.map((social) => {
                                const Icon = social.icon;
                                return (
                                    <a
                                        key={social.name}
                                        href={social.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={social.name}
                                        className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:-translate-y-0.5 hover:bg-white/10 ${social.hover}`}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t border-white/10">
                <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
                    <p>Developed and Designed by SaviTech AI © 2026 SaviEduTech (A brand unit of Savita Global Interprises) - All Rights Reserved</p>
                    <div className="flex items-center gap-5">
                        <Link href="/privacy" className="transition-colors hover:text-slate-300">Privacy</Link>
                        <Link href="/terms" className="transition-colors hover:text-slate-300">Terms</Link>
                        <Link href="/refund" className="transition-colors hover:text-slate-300">Refund</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
