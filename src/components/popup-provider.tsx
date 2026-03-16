'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { EMPLOYEE_ROLES } from '@/lib/auth/roles';

type PopupFrequency = 'once_per_session' | 'daily' | 'weekly';
type PopupPlacement = 'homepage' | 'student_dashboard';

interface PopupContextType {
    showPopup: boolean;
    closePopup: () => void;
}

interface PopupAdRecord {
    id: string;
    title: string | null;
    content: string | null;
    ad_title: string | null;
    ad_message: string | null;
    image_url: string | null;
    button_text: string | null;
    button_url: string | null;
    display_duration_seconds: number | null;
    display_frequency: string | null;
    placements: string[] | null;
    start_date: string | null;
    end_date: string | null;
    priority: number | null;
    max_impressions: number | null;
    current_impressions: number | null;
    is_active: boolean | null;
}

interface PopupAdViewModel {
    id: string;
    title: string;
    message: string | null;
    imageUrl: string | null;
    buttonText: string | null;
    buttonUrl: string | null;
    displayDurationSeconds: number;
    displayFrequency: PopupFrequency;
    placements: PopupPlacement[];
}

interface PopupProviderProps {
    children: ReactNode;
}

const POPUP_SESSION_KEY = 'saviedutech:popup-session';
const POPUP_FREQUENCY_KEY = 'saviedutech:popup-frequency';

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export function usePopup() {
    const context = useContext(PopupContext);
    if (!context) {
        throw new Error('usePopup must be used within PopupProvider');
    }
    return context;
}

function normalizeFrequency(value: string | null | undefined): PopupFrequency {
    if (value === 'daily' || value === 'weekly') {
        return value;
    }
    return 'once_per_session';
}

function normalizePlacements(value: string[] | null | undefined): PopupPlacement[] {
    const validPlacements = (value || []).filter(
        (placement): placement is PopupPlacement =>
            placement === 'homepage' || placement === 'student_dashboard'
    );

    if (validPlacements.length > 0) {
        return validPlacements;
    }

    return ['homepage', 'student_dashboard'];
}

function buildSessionKey(userId: string, adId: string): string {
    return `${POPUP_SESSION_KEY}:${userId}:${adId}`;
}

function buildFrequencyKey(userId: string, adId: string): string {
    return `${POPUP_FREQUENCY_KEY}:${userId}:${adId}`;
}

function isWithinSchedule(ad: PopupAdRecord, now: number): boolean {
    const startsAt = ad.start_date ? new Date(ad.start_date).getTime() : null;
    const endsAt = ad.end_date ? new Date(ad.end_date).getTime() : null;

    if (startsAt && now < startsAt) {
        return false;
    }

    if (endsAt && now > endsAt) {
        return false;
    }

    return true;
}

function hasReachedImpressionCap(ad: PopupAdRecord): boolean {
    if (!ad.max_impressions) {
        return false;
    }

    return (ad.current_impressions || 0) >= ad.max_impressions;
}

function hasSeenPopup(userId: string, ad: PopupAdViewModel): boolean {
    if (typeof window === 'undefined') {
        return true;
    }

    const sessionSeen = window.sessionStorage.getItem(buildSessionKey(userId, ad.id));
    if (sessionSeen) {
        return true;
    }

    if (ad.displayFrequency === 'once_per_session') {
        return false;
    }

    const persisted = window.localStorage.getItem(buildFrequencyKey(userId, ad.id));
    if (!persisted) {
        return false;
    }

    const seenAt = new Date(persisted).getTime();
    if (!Number.isFinite(seenAt)) {
        return false;
    }

    const now = Date.now();
    const limitMs = ad.displayFrequency === 'daily'
        ? 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;

    return now - seenAt < limitMs;
}

function markPopupSeen(userId: string, ad: PopupAdViewModel): void {
    if (typeof window === 'undefined') {
        return;
    }

    const timestamp = new Date().toISOString();
    window.sessionStorage.setItem(buildSessionKey(userId, ad.id), timestamp);

    if (ad.displayFrequency !== 'once_per_session') {
        window.localStorage.setItem(buildFrequencyKey(userId, ad.id), timestamp);
    }
}

function toViewModel(ad: PopupAdRecord): PopupAdViewModel {
    return {
        id: ad.id,
        title: ad.ad_title || ad.title || 'SaviEduTech Update',
        message: ad.ad_message || ad.content,
        imageUrl: ad.image_url,
        buttonText: ad.button_text,
        buttonUrl: ad.button_url,
        displayDurationSeconds: Math.max(ad.display_duration_seconds || 10, 10),
        displayFrequency: normalizeFrequency(ad.display_frequency),
        placements: normalizePlacements(ad.placements),
    };
}

export function PopupProvider({ children }: PopupProviderProps) {
    const pathname = usePathname();
    const [showPopup, setShowPopup] = useState(false);
    const [countdown, setCountdown] = useState(10);
    const [canClose, setCanClose] = useState(false);
    const [ad, setAd] = useState<PopupAdViewModel | null>(null);

    const popupPlacement: PopupPlacement | null = pathname === '/'
        ? 'homepage'
        : pathname === '/dashboard'
            ? 'student_dashboard'
            : null;

    useEffect(() => {
        let isMounted = true;
        let showTimer: ReturnType<typeof setTimeout> | null = null;

        const resetPopup = () => {
            if (!isMounted) {
                return;
            }

            setAd(null);
            setShowPopup(false);
            setCanClose(false);
            setCountdown(10);
        };

        const loadPopup = async () => {
            if (!popupPlacement) {
                resetPopup();
                return;
            }

            try {
                const supabase = getSupabaseBrowserClient();
                if (!supabase) {
                    resetPopup();
                    return;
                }

                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (!user) {
                    resetPopup();
                    return;
                }

                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, role, ads_disabled_permanent, ads_disabled_until')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profileError) {
                    throw profileError;
                }

                const role = (profileData as { role?: string } | null)?.role || 'student';
                if (EMPLOYEE_ROLES.includes(role as (typeof EMPLOYEE_ROLES)[number])) {
                    resetPopup();
                    return;
                }

                const adsDisabledPermanent = !!(profileData as { ads_disabled_permanent?: boolean } | null)?.ads_disabled_permanent;
                const adsDisabledUntil = (profileData as { ads_disabled_until?: string | null } | null)?.ads_disabled_until;
                const adsDisabledTemporarily = !!adsDisabledUntil && new Date(adsDisabledUntil).getTime() > Date.now();

                if (adsDisabledPermanent || adsDisabledTemporarily) {
                    resetPopup();
                    return;
                }

                const { data: studentProfile } = await supabase
                    .from('student_profiles')
                    .select('subscription_status')
                    .eq('id', user.id)
                    .maybeSingle();

                if ((studentProfile as { subscription_status?: string } | null)?.subscription_status === 'premium') {
                    resetPopup();
                    return;
                }

                const { data: ads, error: adsError } = await supabase
                    .from('popup_ads')
                    .select(`
                        id,
                        title,
                        content,
                        ad_title,
                        ad_message,
                        image_url,
                        button_text,
                        button_url,
                        display_duration_seconds,
                        display_frequency,
                        placements,
                        start_date,
                        end_date,
                        priority,
                        max_impressions,
                        current_impressions,
                        is_active
                    `)
                    .eq('is_active', true)
                    .order('priority', { ascending: false })
                    .order('created_at', { ascending: false })
                    .limit(12);

                if (adsError) {
                    throw adsError;
                }

                const now = Date.now();
                const matchedAd = ((ads || []) as PopupAdRecord[])
                    .filter((candidate) => isWithinSchedule(candidate, now))
                    .filter((candidate) => !hasReachedImpressionCap(candidate))
                    .map(toViewModel)
                    .find((candidate) => candidate.placements.includes(popupPlacement) && !hasSeenPopup(user.id, candidate));

                if (!matchedAd) {
                    resetPopup();
                    return;
                }

                if (!isMounted) {
                    return;
                }

                setAd(matchedAd);
                setCountdown(matchedAd.displayDurationSeconds);
                setCanClose(false);
                setShowPopup(false);

                showTimer = setTimeout(() => {
                    if (!isMounted) {
                        return;
                    }

                    markPopupSeen(user.id, matchedAd);
                    setShowPopup(true);
                }, 1200);
            } catch (error) {
                console.warn('Failed to load popup advertisement:', error);
                resetPopup();
            }
        };

        void loadPopup();

        const supabase = getSupabaseBrowserClient();
        if (!supabase) return () => { isMounted = false; };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                void loadPopup();
            }

            if (event === 'SIGNED_OUT') {
                resetPopup();
            }
        });

        return () => {
            isMounted = false;
            if (showTimer) {
                clearTimeout(showTimer);
            }
            subscription.unsubscribe();
        };
    }, [popupPlacement]);

    useEffect(() => {
        if (!showPopup || !ad) {
            return;
        }

        if (countdown <= 0) {
            setCanClose(true);
            return;
        }

        const timer = setTimeout(() => {
            setCountdown((current) => current - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [ad, countdown, showPopup]);

    const closePopup = () => {
        if (!canClose) {
            return;
        }

        setShowPopup(false);
    };

    return (
        <PopupContext.Provider value={{ showPopup, closePopup }}>
            {children}
            {showPopup && ad && (
                <div className="popup-overlay">
                    <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
                        <button
                            onClick={closePopup}
                            disabled={!canClose}
                            className={`absolute right-4 top-4 z-10 rounded-full p-2 transition-colors ${
                                canClose
                                    ? 'bg-white/90 text-slate-600 hover:bg-slate-100'
                                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            }`}
                            aria-label={canClose ? 'Close popup advertisement' : `Popup closes in ${countdown} seconds`}
                        >
                            <X className="h-5 w-5" />
                        </button>

                        {ad.imageUrl && (
                            <div className="h-48 w-full overflow-hidden bg-slate-100 sm:h-56">
                                <img
                                    src={ad.imageUrl}
                                    alt={ad.title}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        )}

                        <div className="space-y-5 p-6 sm:p-7">
                            <div className="flex items-center gap-4">
                                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-lg font-bold text-white">
                                    {canClose ? 'OK' : countdown}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-600">
                                        Promotion
                                    </p>
                                    <h3 className="text-xl font-bold text-slate-900">
                                        {ad.title}
                                    </h3>
                                </div>
                            </div>

                            {ad.message && (
                                <p className="text-sm leading-6 text-slate-600 sm:text-base">
                                    {ad.message}
                                </p>
                            )}

                            <div className="flex flex-col gap-3 sm:flex-row">
                                {ad.buttonText && ad.buttonUrl && (
                                    <a
                                        href={ad.buttonUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                                    >
                                        {ad.buttonText}
                                    </a>
                                )}

                                <button
                                    onClick={closePopup}
                                    disabled={!canClose}
                                    className={`inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border px-5 py-3 text-sm font-semibold transition-colors ${
                                        canClose
                                            ? 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                            : 'border-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    {canClose ? 'Close' : `Close in ${countdown}s`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </PopupContext.Provider>
    );
}
