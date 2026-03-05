'use client';

import { useState } from 'react';
import {
    Share2,
    MessageCircle,
    Twitter,
    Linkedin,
    Facebook,
    Send,
    Check,
    Copy,
    X
} from 'lucide-react';
import {
    generateChallengeShareUrls,
    ChallengeShareData,
    copyToClipboard
} from '@/lib/social/share-utils';

interface ShareButtonsProps {
    shareData: ChallengeShareData;
    variant?: 'default' | 'compact' | 'minimal';
    className?: string;
}

interface ShareButton {
    name: string;
    icon: React.ReactNode;
    color: string;
    hoverColor: string;
    url: string;
}

export function ShareButtons({ shareData, variant = 'default', className = '' }: ShareButtonsProps) {
    const [showCopiedToast, setShowCopiedToast] = useState(false);
    const [isExpanded, setIsExpanded] = useState(variant !== 'compact');

    const urls = generateChallengeShareUrls(shareData);

    const shareButtons: ShareButton[] = [
        {
            name: 'WhatsApp',
            icon: <MessageCircle className="w-5 h-5" />,
            color: 'bg-green-500',
            hoverColor: 'hover:bg-green-600',
            url: urls.whatsapp,
        },
        {
            name: 'Twitter',
            icon: <Twitter className="w-5 h-5" />,
            color: 'bg-slate-900',
            hoverColor: 'hover:bg-slate-800',
            url: urls.twitter,
        },
        {
            name: 'LinkedIn',
            icon: <Linkedin className="w-5 h-5" />,
            color: 'bg-blue-600',
            hoverColor: 'hover:bg-blue-700',
            url: urls.linkedin,
        },
        {
            name: 'Facebook',
            icon: <Facebook className="w-5 h-5" />,
            color: 'bg-blue-500',
            hoverColor: 'hover:bg-blue-600',
            url: urls.facebook,
        },
        {
            name: 'Telegram',
            icon: <Send className="w-5 h-5" />,
            color: 'bg-sky-500',
            hoverColor: 'hover:bg-sky-600',
            url: urls.telegram,
        },
    ];

    const handleShare = (url: string) => {
        window.open(url, '_blank', 'width=600,height=400,scrollbars=yes');
    };

    const handleCopyLink = async () => {
        const success = await copyToClipboard(urls.message + '\n\nhttps://saviedutech.com/dashboard/challenge');
        if (success) {
            setShowCopiedToast(true);
            setTimeout(() => setShowCopiedToast(false), 2000);
        }
    };

    if (variant === 'minimal') {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                {shareButtons.slice(0, 3).map((button) => (
                    <button
                        key={button.name}
                        onClick={() => handleShare(button.url)}
                        className={`w-9 h-9 rounded-full ${button.color} ${button.hoverColor} text-white flex items-center justify-center transition-colors`}
                        title={`Share on ${button.name}`}
                        aria-label={`Share on ${button.name}`}
                    >
                        {button.icon}
                    </button>
                ))}
                <button
                    onClick={handleCopyLink}
                    className="w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors"
                    title="Copy link"
                    aria-label="Copy link"
                >
                    <Copy className="w-4 h-4" />
                </button>
            </div>
        );
    }

    if (variant === 'compact') {
        return (
            <div className={`relative ${className}`}>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors"
                >
                    <Share2 className="w-4 h-4" />
                    <span className="font-medium">Share Result</span>
                </button>

                {isExpanded && (
                    <div className="absolute top-full left-0 mt-2 p-3 bg-white rounded-xl shadow-lg border border-slate-200 z-50 min-w-[200px]">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">Share on</span>
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {shareButtons.map((button) => (
                                <button
                                    key={button.name}
                                    onClick={() => handleShare(button.url)}
                                    className={`w-10 h-10 rounded-lg ${button.color} ${button.hoverColor} text-white flex items-center justify-center transition-colors`}
                                    title={button.name}
                                    aria-label={`Share on ${button.name}`}
                                >
                                    {button.icon}
                                </button>
                            ))}
                            <button
                                onClick={handleCopyLink}
                                className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                                title="Copy link"
                                aria-label="Copy link"
                            >
                                {showCopiedToast ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Default variant
    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-700">Share your achievement</span>
            </div>

            <div className="flex flex-wrap gap-3">
                {shareButtons.map((button) => (
                    <button
                        key={button.name}
                        onClick={() => handleShare(button.url)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${button.color} ${button.hoverColor} text-white font-medium transition-colors`}
                        aria-label={`Share on ${button.name}`}
                    >
                        {button.icon}
                        <span>{button.name}</span>
                    </button>
                ))}

                <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                    aria-label="Copy link"
                >
                    {showCopiedToast ? (
                        <>
                            <Check className="w-5 h-5 text-green-600" />
                            <span className="text-green-600">Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy className="w-5 h-5" />
                            <span>Copy Link</span>
                        </>
                    )}
                </button>
            </div>

            {showCopiedToast && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                    <Check className="w-4 h-4" />
                    <span>Copied to clipboard!</span>
                </div>
            )}
        </div>
    );
}

export function ShareCard({ shareData, className = '' }: ShareButtonsProps) {
    const urls = generateChallengeShareUrls(shareData);
    const [showCopiedToast, setShowCopiedToast] = useState(false);

    const handleCopyLink = async () => {
        const success = await copyToClipboard(urls.message + '\n\nhttps://saviedutech.com/dashboard/challenge');
        if (success) {
            setShowCopiedToast(true);
            setTimeout(() => setShowCopiedToast(false), 2000);
        }
    };

    const handleShare = (url: string) => {
        window.open(url, '_blank', 'width=600,height=400,scrollbars=yes');
    };

    return (
        <div className={`bg-white rounded-2xl border border-slate-100 p-6 ${className}`}>
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary-600" />
                Share Your Result
            </h3>

            <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-slate-600 whitespace-pre-line">{urls.message}</p>
            </div>

            <div className="grid grid-cols-5 gap-2">
                <button
                    onClick={() => handleShare(urls.whatsapp)}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
                    aria-label="Share on WhatsApp"
                >
                    <MessageCircle className="w-6 h-6" />
                    <span className="text-xs font-medium">WhatsApp</span>
                </button>

                <button
                    onClick={() => handleShare(urls.twitter)}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                    aria-label="Share on Twitter"
                >
                    <Twitter className="w-6 h-6" />
                    <span className="text-xs font-medium">Twitter</span>
                </button>

                <button
                    onClick={() => handleShare(urls.linkedin)}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                    aria-label="Share on LinkedIn"
                >
                    <Linkedin className="w-6 h-6" />
                    <span className="text-xs font-medium">LinkedIn</span>
                </button>

                <button
                    onClick={() => handleShare(urls.facebook)}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-500 transition-colors"
                    aria-label="Share on Facebook"
                >
                    <Facebook className="w-6 h-6" />
                    <span className="text-xs font-medium">Facebook</span>
                </button>

                <button
                    onClick={handleCopyLink}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                    aria-label="Copy link"
                >
                    {showCopiedToast ? (
                        <Check className="w-6 h-6 text-green-600" />
                    ) : (
                        <Copy className="w-6 h-6" />
                    )}
                    <span className="text-xs font-medium">{showCopiedToast ? 'Copied!' : 'Copy'}</span>
                </button>
            </div>
        </div>
    );
}

export default ShareButtons;
