'use client';

import { useState } from 'react';
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
import { BrandLogo } from '@/components/brand-logo';

const socialLinks = [
    { name: 'YouTube', href: 'https://youtube.com/@saviedutech', icon: Youtube, hover: 'hover:text-red-500' },
    { name: 'Instagram', href: 'https://instagram.com/saviedutech', icon: Instagram, hover: 'hover:text-pink-500' },
    { name: 'Facebook', href: 'https://facebook.com/saviedutech', icon: Facebook, hover: 'hover:text-blue-500' },
    { name: 'Twitter / X', href: 'https://x.com/saviedutech', icon: Twitter, hover: 'hover:text-sky-500' },
    { name: 'LinkedIn', href: 'https://linkedin.com/company/saviedutech', icon: Linkedin, hover: 'hover:text-cyan-500' },
    { name: 'Telegram', href: 'https://t.me/saviedutech', icon: Send, hover: 'hover:text-sky-400' },
    { name: 'WhatsApp', href: 'https://wa.me/919506943134', icon: MessageCircle, hover: 'hover:text-emerald-500' },
];

const emptyForm = {
    name: '',
    phone: '',
    email: '',
    class: '',
    message: '',
};

export function ContactPageClient() {
    const [form, setForm] = useState(emptyForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const updateField = (field: keyof typeof emptyForm, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        setSubmitError(null);
        setSubmitMessage(null);

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(typeof data.error === 'string' ? data.error : 'Failed to submit your contact message.');
            }

            setSubmitMessage(
                typeof data.message === 'string'
                    ? data.message
                    : 'Thank you! Your message has been successfully submitted. Our team will contact you shortly.'
            );
            setForm(emptyForm);
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'Failed to submit your contact message.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                <div className="max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">Contact SaviEduTech</p>
                    <h1 className="mt-4 text-4xl font-black text-slate-950 sm:text-5xl">Talk to the team directly</h1>
                    <p className="mt-4 text-lg leading-8 text-slate-600">
                        Reach out for course guidance, admissions help, platform support, or partnership conversations.
                    </p>
                </div>

                <div className="mt-12 grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
                        <h2 className="text-xl font-bold text-slate-950">Get in touch</h2>
                        <div className="mt-6 space-y-5 text-sm leading-7 text-slate-600">
                            <div className="flex items-start gap-3">
                                <MapPin className="mt-1 h-5 w-5 shrink-0 text-sky-700" />
                                <div>
                                    <p className="font-semibold text-slate-900">Address</p>
                                    <p>
                                        SaviEduTech
                                        <br />
                                        A Brand Unit Of SGI
                                        <br />
                                        302 Parth A
                                        <br />
                                        3/11 Patel Colony
                                        <br />
                                        Jamnagar – 361008
                                        <br />
                                        Gujarat
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Mail className="mt-1 h-5 w-5 shrink-0 text-sky-700" />
                                <div>
                                    <p className="font-semibold text-slate-900">Email</p>
                                    <a href="mailto:support@saviedutech.in" className="transition-colors hover:text-sky-700">
                                        support@saviedutech.in
                                    </a>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Phone className="mt-1 h-5 w-5 shrink-0 text-sky-700" />
                                <div>
                                    <p className="font-semibold text-slate-900">Phone</p>
                                    <a href="tel:+919506943134" className="transition-colors hover:text-sky-700">
                                        +91 9506943134
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 rounded-3xl bg-slate-950 p-5 text-slate-300">
                            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-300">Social Connect</p>
                            <div className="mt-4 flex flex-wrap gap-3">
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

                    <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
                        <div className="mb-6 flex justify-start">
                            <BrandLogo size="md" showText={true} showTagline={true} taglineTone="dark" wordmarkTone="dark" />
                        </div>

                        <h2 className="text-2xl font-bold text-slate-950">Send a message</h2>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                            Share your question and the team will get back to you shortly.
                        </p>

                        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Name</label>
                                    <input
                                        value={form.name}
                                        onChange={(event) => updateField('name', event.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition-colors focus:border-sky-400"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Contact Number</label>
                                    <input
                                        value={form.phone}
                                        onChange={(event) => updateField('phone', event.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition-colors focus:border-sky-400"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(event) => updateField('email', event.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition-colors focus:border-sky-400"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Class</label>
                                    <select
                                        value={form.class}
                                        onChange={(event) => updateField('class', event.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition-colors focus:border-sky-400"
                                        required
                                    >
                                        <option value="">Select Class</option>
                                        <option value="Class 6">Class 6</option>
                                        <option value="Class 7">Class 7</option>
                                        <option value="Class 8">Class 8</option>
                                        <option value="Class 9">Class 9</option>
                                        <option value="Class 10">Class 10</option>
                                        <option value="Class 11">Class 11</option>
                                        <option value="Class 12">Class 12</option>
                                        <option value="Dropper">Dropper</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Message</label>
                                <textarea
                                    rows={6}
                                    value={form.message}
                                    onChange={(event) => updateField('message', event.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition-colors focus:border-sky-400"
                                    required
                                />
                            </div>

                            {submitMessage ? (
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                                    {submitMessage}
                                </div>
                            ) : null}

                            {submitError ? (
                                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                                    {submitError}
                                </div>
                            ) : null}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Message'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
