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
    ],
    resources: [
        { name: 'JEE Preparation', href: '/jee' },
        { name: 'NEET Preparation', href: '/neet' },
        { name: 'Study Material', href: '/materials' },
        { name: 'Previous Year Papers', href: '/papers' },
        { name: 'Revision Notes', href: '/notes' },
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
        { name: 'FAQs', href: '/faqs' },
        { name: 'Privacy Policy', href: '/privacy' },
        { name: 'Terms of Service', href: '/terms' },
        { name: 'Refund Policy', href: '/refund' },
    ],
};

export function Footer() {
    return (
        <footer className="bg-slate-900 text-slate-300">
            {/* Main Footer */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
                    {/* Brand Column */}
                    <div className="col-span-2 md:col-span-3 lg:col-span-2">
                        <Link href="/" className="flex items-center gap-2 mb-6">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                                <GraduationCap className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <span className="text-xl font-bold text-white">Savi</span>
                                <span className="text-xl font-bold text-primary-400">EduTech</span>
                            </div>
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
                                <span>302, Parth A, 3/11 Patel Colony,<br />Jamnagar – 361008, Gujarat</span>
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
                        <p>
                            Designed and Developed by SaviTech AI © 2026 — All Rights Reserved
                        </p>
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