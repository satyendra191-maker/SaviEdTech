'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Phone,
    MapPin,
    Mail,
    Youtube,
    Facebook,
    Twitter,
    Linkedin,
    MessageCircle,
    GraduationCap
} from 'lucide-react';
import { AnimatedLogo } from './animated-logo';

const socialLinks = [
    { name: 'YouTube', icon: Youtube, href: 'https://youtube.com/@saviedutech', color: 'hover:text-red-500' },
    { name: 'Facebook', icon: Facebook, href: 'https://facebook.com/saviedutech', color: 'hover:text-blue-500' },
    { name: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com/company/saviedutech', color: 'hover:text-blue-600' },
    { name: 'Twitter', icon: Twitter, href: 'https://twitter.com/saviedutech', color: 'hover:text-sky-500' },
    { name: 'WhatsApp', icon: MessageCircle, href: 'https://wa.me/919506943134', color: 'hover:text-green-500' },
];

const footerLinks = {
    platform: [
        { name: 'Student Dashboard', href: '/dashboard' },
        { name: 'Lectures', href: '/lectures' },
        { name: 'Practice Questions', href: '/practice' },
        { name: 'Mock Tests', href: '/tests' },
        { name: 'Daily Challenge', href: '/challenge' },
        { name: 'Faculty', href: '/faculty' },
    ],
    resources: [
        { name: 'JEE Preparation', href: '/jee' },
        { name: 'NEET Preparation', href: '/neet' },
        { name: 'Study Material', href: '/materials' },
        { name: 'Previous Year Papers', href: '/papers' },
        { name: 'Online Courses', href: '/courses' },
    ],
    company: [
        { name: 'About Us', href: '/about' },
        { name: 'Our Faculty', href: '/faculty' },
        { name: 'Success Stories', href: '/stories' },
        { name: 'Contact', href: '/contact' },
        { name: 'Careers', href: '/careers' },
    ],
    support: [
        { name: 'Help Center', href: '/help' },
        { name: 'FAQs', href: '/faq' },
        { name: 'Donate', href: '/donate' },
        { name: 'Privacy Policy', href: '/privacy' },
        { name: 'Terms of Service', href: '/terms' },
        { name: 'Refund Policy', href: '/refund' },
    ],
};

export function Footer() {
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDashboardRoute = pathname?.startsWith("/dashboard") ||
        pathname?.startsWith("/admin") ||
        pathname?.startsWith("/super-admin") ||
        pathname?.startsWith("/faculty-dashboard") ||
        pathname?.startsWith("/auth/callback");

    if (!mounted || isDashboardRoute) return null;

    return (
        <footer className="bg-slate-900 text-slate-300">
            {/* Main Footer */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
                    {/* Brand Column */}
                    <div className="col-span-2 md:col-span-3 lg:col-span-2">
                        <Link href="/" className="flex items-center gap-2 mb-6">
                            <AnimatedLogo size="lg" showText={true} />
                        </Link>

                        <p className="text-slate-400 text-sm mb-6 max-w-xs">
                            Empowering students across India to achieve their dreams of cracking JEE & NEET through innovative digital learning.
                        </p>

                        {/* Contact Info */}
                        <div className="space-y-3">
                            <a href="tel:+919506943134" className="flex items-center gap-3 text-sm hover:text-white transition-colors">
                                <Phone className="w-4 h-4 text-primary-400" />
                                <span>+91 95069 43134</span>
                            </a>
                            <a href="mailto:contact@saviedutech.com" className="flex items-center gap-3 text-sm hover:text-white transition-colors">
                                <Mail className="w-4 h-4 text-primary-400" />
                                <span>contact@saviedutech.com</span>
                            </a>
                            <div className="flex items-start gap-3 text-sm">
                                <MapPin className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                                <span>302, Parth A, 3/11 Patel Colony,<br />Jamnagar - 361008, Gujarat</span>
                            </div>
                        </div>

                        {/* Social Links */}
                        <div className="flex items-center gap-3 mt-6">
                            {socialLinks.map((social) => {
                                const Icon = social.icon;
                                return (
                                    <a
                                        key={social.name}
                                        href={social.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center transition-all ${social.color} hover:bg-slate-700`}
                                        aria-label={social.name}
                                    >
                                        <Icon className="w-4 h-4" />
                                    </a>
                                );
                            })}
                        </div>
                    </div>

                    {/* Links Columns */}
                    <div>
                        <h3 className="text-white font-semibold mb-4 text-sm">Platform</h3>
                        <ul className="space-y-2.5">
                            {footerLinks.platform.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-white font-semibold mb-4 text-sm">Resources</h3>
                        <ul className="space-y-2.5">
                            {footerLinks.resources.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-white font-semibold mb-4 text-sm">Company</h3>
                        <ul className="space-y-2.5">
                            {footerLinks.company.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-white font-semibold mb-4 text-sm">Support</h3>
                        <ul className="space-y-2.5">
                            {footerLinks.support.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="w-16 h-16 relative drop-shadow-2xl">
                                    {/* Colorful 3D Logo for Footer */}
                                    <svg viewBox="0 0 100 100" className="w-16 h-16">
                                        <defs>
                                            <linearGradient id="footerGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#f472b6" />
                                                <stop offset="50%" stopColor="#a855f7" />
                                                <stop offset="100%" stopColor="#6366f1" />
                                            </linearGradient>
                                            <linearGradient id="footerGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#22d3ee" />
                                                <stop offset="100%" stopColor="#3b82f6" />
                                            </linearGradient>
                                            <filter id="footerGlow">
                                                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                                <feMerge>
                                                    <feMergeNode in="coloredBlur" />
                                                    <feMergeNode in="SourceGraphic" />
                                                </feMerge>
                                            </filter>
                                        </defs>
                                        {/* Central sphere */}
                                        <circle cx="50" cy="50" r="22" fill="url(#footerGrad1)" filter="url(#footerGlow)" />
                                        <circle cx="42" cy="42" r="8" fill="white" opacity="0.3" />
                                        {/* Orbit rings */}
                                        <ellipse cx="50" cy="50" rx="32" ry="12" fill="none" stroke="url(#footerGrad2)" strokeWidth="1.5" transform="rotate(0 50 50)" opacity="0.8" />
                                        <ellipse cx="50" cy="50" rx="32" ry="12" fill="none" stroke="#f472b6" strokeWidth="1.5" transform="rotate(60 50 50)" opacity="0.8" />
                                        <ellipse cx="50" cy="50" rx="32" ry="12" fill="none" stroke="#a855f7" strokeWidth="1.5" transform="rotate(-60 50 50)" opacity="0.8" />
                                        {/* Electrons */}
                                        <circle cx="82" cy="50" r="3" fill="#22d3ee" filter="url(#footerGlow)" />
                                        <circle cx="34" cy="77.7" r="3" fill="#a855f7" filter="url(#footerGlow)" />
                                        <circle cx="34" cy="22.3" r="3" fill="#f472b6" filter="url(#footerGlow)" />
                                        {/* Book symbol */}
                                        <g transform="translate(42, 42)">
                                            <path d="M2 4 L8 1 L14 4 L14 12 L8 15 L2 12 Z" fill="#ffffff" opacity="0.95" />
                                            <path d="M2 4 L8 7 L14 4" fill="none" stroke="#a855f7" strokeWidth="0.5" />
                                        </g>
                                    </svg>
                                </div>
                            </div>
                            <p>
                                Designed and Developed by SaviTech AI @ 2026 ( A brand unit of SGI ) - All Rights Reserved
                            </p>
                        </div>
                        <div className="flex items-center gap-6">
                            <Link href="/privacy" className="hover:text-slate-300 transition-colors">
                                Privacy
                            </Link>
                            <Link href="/terms" className="hover:text-slate-300 transition-colors">
                                Terms
                            </Link>
                            <Link href="/sitemap" className="hover:text-slate-300 transition-colors">
                                Sitemap
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
