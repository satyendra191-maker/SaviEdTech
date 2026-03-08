'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Bell, X } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { formatRelativeTime } from '@/lib/utils';

type NotificationSurface = 'homepage' | 'dashboard';

interface NotificationRow {
    id: string;
    user_id: string | null;
    title: string;
    message: string;
    type: string | null;
    notification_type: string | null;
    created_at: string;
    is_active: boolean;
    target_surface: string[] | null;
    priority: number | null;
    action_url: string | null;
}

interface BannerNotification {
    id: string;
    title: string;
    message: string;
    type: string;
    createdAt: string;
    actionUrl: string | null;
    targetSurface: NotificationSurface[];
}

const FALLBACK_NOTIFICATIONS: Record<NotificationSurface, BannerNotification> = {
    homepage: {
        id: 'fallback-homepage-notification',
        title: 'Daily Challenge Live',
        message: 'Free JEE / NEET Practice',
        type: 'challenge',
        createdAt: new Date('2026-03-08T00:00:00.000Z').toISOString(),
        actionUrl: '/challenge',
        targetSurface: ['homepage'],
    },
    dashboard: {
        id: 'fallback-dashboard-notification',
        title: 'Platform Update',
        message: 'Daily challenge, mock tests, and new lectures are now live.',
        type: 'system',
        createdAt: new Date('2026-03-08T00:00:00.000Z').toISOString(),
        actionUrl: '/dashboard/tests',
        targetSurface: ['dashboard'],
    },
};

function getSurface(pathname: string | null): NotificationSurface | null {
    if (pathname === '/') {
        return 'homepage';
    }

    if (pathname === '/dashboard') {
        return 'dashboard';
    }

    return null;
}

function normalizeTargetSurface(values: string[] | null | undefined): NotificationSurface[] {
    const surfaces = (values || []).filter(
        (surface): surface is NotificationSurface =>
            surface === 'homepage' || surface === 'dashboard'
    );

    if (surfaces.length > 0) {
        return surfaces;
    }

    return ['homepage', 'dashboard'];
}

function toBannerNotification(row: NotificationRow): BannerNotification {
    return {
        id: row.id,
        title: row.title,
        message: row.message,
        type: row.type || row.notification_type || 'system',
        createdAt: row.created_at,
        actionUrl: row.action_url,
        targetSurface: normalizeTargetSurface(row.target_surface),
    };
}

function getDismissKey(surface: NotificationSurface, notificationId: string): string {
    return `saviedutech:notification-dismissed:${surface}:${notificationId}`;
}

function isDismissed(surface: NotificationSurface, notificationId: string): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.sessionStorage.getItem(getDismissKey(surface, notificationId)) === '1';
}

function dismiss(surface: NotificationSurface, notificationId: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.sessionStorage.setItem(getDismissKey(surface, notificationId), '1');
}

export function NotificationBar() {
    const pathname = usePathname();
    const surface = getSurface(pathname);
    const [notification, setNotification] = useState<BannerNotification | null>(null);
    const [loading, setLoading] = useState(true);

    const accentClasses = useMemo(() => {
        const type = notification?.type || 'system';
        if (type.includes('challenge')) {
            return 'bg-amber-500/10 text-amber-300 border-amber-400/30';
        }
        if (type.includes('lecture')) {
            return 'bg-cyan-500/10 text-cyan-300 border-cyan-400/30';
        }
        if (type.includes('test') || type.includes('exam')) {
            return 'bg-rose-500/10 text-rose-300 border-rose-400/30';
        }
        return 'bg-white/10 text-white/90 border-white/20';
    }, [notification?.type]);

    useEffect(() => {
        let isMounted = true;

        const loadNotification = async () => {
            if (!surface) {
                if (isMounted) {
                    setNotification(null);
                    setLoading(false);
                }
                return;
            }

            setLoading(true);

            try {
                const supabase = getSupabaseBrowserClient();
                if (!supabase) {
                    if (isMounted) {
                        const fallback = FALLBACK_NOTIFICATIONS[surface];
                        setNotification(isDismissed(surface, fallback.id) ? null : fallback);
                        setLoading(false);
                    }
                    return;
                }

                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (surface === 'dashboard' && user) {
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .maybeSingle();

                    const role = (profileData as { role?: string } | null)?.role;
                    if (role && role !== 'student') {
                        if (isMounted) {
                            setNotification(null);
                            setLoading(false);
                        }
                        return;
                    }
                }

                let query = supabase
                    .from('notifications')
                    .select('id, user_id, title, message, type, notification_type, created_at, is_active, target_surface, priority, action_url')
                    .eq('is_active', true)
                    .order('priority', { ascending: false })
                    .order('created_at', { ascending: false })
                    .limit(12);

                if (user) {
                    query = query.or(`user_id.is.null,user_id.eq.${user.id}`);
                } else {
                    query = query.is('user_id', null);
                }

                const { data, error } = await query;
                if (error) {
                    throw error;
                }

                const selected = ((data || []) as NotificationRow[])
                    .map(toBannerNotification)
                    .find((item) => item.targetSurface.includes(surface) && !isDismissed(surface, item.id));

                const fallback = FALLBACK_NOTIFICATIONS[surface];

                if (isMounted) {
                    setNotification(selected || (isDismissed(surface, fallback.id) ? null : fallback));
                    setLoading(false);
                }
            } catch (error) {
                console.warn('Failed to load notification banner:', error);
                if (isMounted) {
                    const fallback = FALLBACK_NOTIFICATIONS[surface];
                    setNotification(isDismissed(surface, fallback.id) ? null : fallback);
                    setLoading(false);
                }
            }
        };

        void loadNotification();

        const supabase = getSupabaseBrowserClient();
        const channel = surface && supabase
            ? supabase
                .channel(`banner-notifications:${surface}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
                    void loadNotification();
                })
                .subscribe()
            : null;

        return () => {
            isMounted = false;
            if (channel) {
                void channel.unsubscribe();
            }
        };
    }, [surface]);

    if (!surface || loading || !notification) {
        return null;
    }

    const closeNotification = () => {
        dismiss(surface, notification.id);
        setNotification(null);
    };

    return (
        <div className="relative border-b border-slate-800 bg-slate-950 px-4 py-2.5 text-white">
            <div className="mx-auto flex max-w-7xl items-center gap-3 pr-10">
                <div className={`hidden rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] sm:inline-flex ${accentClasses}`}>
                    {notification.type}
                </div>

                <Bell className="h-4 w-4 flex-shrink-0 text-cyan-400" />

                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                        {notification.title}
                        <span className="mx-2 text-slate-500">|</span>
                        <span className="font-medium text-slate-200">{notification.message}</span>
                    </p>
                    <p className="hidden text-xs text-slate-400 sm:block">
                        Updated {formatRelativeTime(notification.createdAt)}
                    </p>
                </div>

                {notification.actionUrl && (
                    <Link
                        href={notification.actionUrl}
                        className="hidden min-h-[40px] items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/15 sm:inline-flex"
                    >
                        Open
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                )}
            </div>

            <button
                onClick={closeNotification}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close notification"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
