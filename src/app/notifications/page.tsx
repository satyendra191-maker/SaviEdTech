'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
    Bell, 
    BookOpen, 
    Calendar, 
    CheckCircle, 
    Clock, 
    FileText, 
    GraduationCap, 
    MessageSquare, 
    Settings, 
    Trash2,
    Trophy,
    TrendingUp,
    User,
    X
} from 'lucide-react';

interface Notification {
    id: string;
    type: 'exam' | 'study' | 'result' | 'rank' | 'doubt' | 'system';
    title: string;
    message: string;
    time: string;
    read: boolean;
    icon?: React.ReactNode;
    link?: string;
}

const mockNotifications: Notification[] = [
    {
        id: '1',
        type: 'exam',
        title: 'Mock Test Available',
        message: 'JEE Main Full Syllabus Mock Test #45 is now available. Start your test within the next 24 hours.',
        time: '2 hours ago',
        read: false,
        icon: <GraduationCap className="w-5 h-5" />,
        link: '/mock-tests'
    },
    {
        id: '2',
        type: 'rank',
        title: 'Rank Prediction Update',
        message: 'Your predicted All India Rank has improved to #2,450 based on your recent performance.',
        time: '5 hours ago',
        read: false,
        icon: <TrendingUp className="w-5 h-5" />,
        link: '/dashboard/analytics'
    },
    {
        id: '3',
        type: 'study',
        title: 'Study Reminder',
        message: 'Don\'t forget to complete your daily practice! You\'re on a 7-day streak.',
        time: '1 day ago',
        read: true,
        icon: <Clock className="w-5 h-5" />
    },
    {
        id: '4',
        type: 'result',
        title: 'Test Results Available',
        message: 'Your results for Physics Chapter Test #12 are now available. Score: 85/100',
        time: '2 days ago',
        read: true,
        icon: <FileText className="w-5 h-5" />,
        link: '/dashboard/tests/results/123'
    },
    {
        id: '5',
        type: 'doubt',
        title: 'Doubt Resolved',
        message: 'Your doubt about "Integration by Parts" has been answered by our AI tutor.',
        time: '3 days ago',
        read: true,
        icon: <MessageSquare className="w-5 h-5" />,
        link: '/dashboard/doubts'
    },
    {
        id: '6',
        type: 'system',
        title: 'Welcome to SaviEduTech!',
        message: 'Start your journey to success. Explore courses and begin learning today.',
        time: '1 week ago',
        read: true,
        icon: <User className="w-5 h-5" />
    }
];

function getTypeColor(type: Notification['type']) {
    switch (type) {
        case 'exam': return 'bg-blue-100 text-blue-600';
        case 'rank': return 'bg-purple-100 text-purple-600';
        case 'result': return 'bg-green-100 text-green-600';
        case 'study': return 'bg-amber-100 text-amber-600';
        case 'doubt': return 'bg-cyan-100 text-cyan-600';
        default: return 'bg-slate-100 text-slate-600';
    }
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [showSettings, setShowSettings] = useState(false);

    const filteredNotifications = filter === 'unread' 
        ? notifications.filter(n => !n.read) 
        : notifications;

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => 
            n.id === id ? { ...n, read: true } : n
        ));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-4 safe-area-top">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
                        {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                {unreadCount} new
                            </span>
                        )}
                    </div>
                    <button 
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl touch-manipulation"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors touch-manipulation ${
                            filter === 'all' 
                                ? 'bg-slate-900 text-white' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors touch-manipulation ${
                            filter === 'unread' 
                                ? 'bg-slate-900 text-white' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Unread ({unreadCount})
                    </button>
                </div>
            </div>

            {showSettings && (
                <div className="bg-white border-b border-slate-200 px-4 py-4 animate-in slide-in-from-top-2">
                    <h3 className="font-semibold text-slate-900 mb-3">Notification Preferences</h3>
                    <div className="space-y-3">
                        {['Exam Updates', 'Study Reminders', 'Mock Test Results', 'Rank Predictions', 'Doubt Updates'].map((item) => (
                            <label key={item} className="flex items-center justify-between">
                                <span className="text-sm text-slate-700">{item}</span>
                                <input 
                                    type="checkbox" 
                                    defaultChecked 
                                    className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                                />
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <div className="p-4 space-y-3 pb-24">
                {filteredNotifications.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="font-semibold text-slate-900 mb-1">No notifications</h3>
                        <p className="text-sm text-slate-500">You&apos;re all caught up!</p>
                    </div>
                ) : (
                    <>
                        {filter === 'all' && unreadCount > 0 && (
                            <button 
                                onClick={markAllAsRead}
                                className="w-full py-2.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
                            >
                                Mark all as read
                            </button>
                        )}
                        
                        {filteredNotifications.map((notification) => (
                            <div 
                                key={notification.id}
                                className={`bg-white rounded-2xl border p-4 transition-all ${
                                    notification.read 
                                        ? 'border-slate-200' 
                                        : 'border-blue-200 shadow-md'
                                }`}
                            >
                                <div className="flex gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getTypeColor(notification.type)}`}>
                                        {notification.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h3 className={`font-semibold text-sm ${
                                                    notification.read ? 'text-slate-700' : 'text-slate-900'
                                                }`}>
                                                    {notification.title}
                                                </h3>
                                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-3">
                                            <span className="text-xs text-slate-400">{notification.time}</span>
                                            {notification.link && (
                                                <Link 
                                                    href={notification.link}
                                                    className="text-xs font-medium text-primary-600 hover:text-primary-700"
                                                >
                                                    View Details
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                                    {!notification.read && (
                                        <button 
                                            onClick={() => markAsRead(notification.id)}
                                            className="flex-1 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors touch-manipulation"
                                        >
                                            Mark as read
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => deleteNotification(notification.id)}
                                        className="py-2 px-3 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-manipulation"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
