'use client';

import { useState, useEffect } from 'react';
import { Bell, Building2, GraduationCap, AlertTriangle, Landmark, Briefcase, ExternalLink, Check, Archive } from 'lucide-react';

interface GovNotification {
  id: string;
  source: string;
  category: string;
  title: string;
  description: string;
  url: string;
  published_date: string;
  priority: 'high' | 'medium' | 'low';
  is_read: boolean;
  is_archived: boolean;
}

const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  taxation: { label: 'GST & Tax', icon: <Building2 className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700' },
  banking: { label: 'RBI & Banking', icon: <Landmark className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700' },
  education: { label: 'Education Board', icon: <GraduationCap className="w-4 h-4" />, color: 'bg-green-100 text-green-700' },
  local_body: { label: 'Municipal', icon: <Building2 className="w-4 h-4" />, color: 'bg-orange-100 text-orange-700' },
  disaster: { label: 'Disaster Mgmt', icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-red-100 text-red-700' },
  business: { label: 'MSME & Business', icon: <Briefcase className="w-4 h-4" />, color: 'bg-yellow-100 text-yellow-700' },
  policy: { label: 'Policy', icon: <Building2 className="w-4 h-4" />, color: 'bg-indigo-100 text-indigo-700' },
};

const sourceLogos: Record<string, string> = {
  'GST India': '/logos/gst.png',
  'RBI': '/logos/rbi.png',
  'CBSE': '/logos/cbse.png',
  'ICSE': '/logos/icse.png',
  'NEET NTA': '/logos/nta.png',
  'JEE Main NTA': '/logos/nta.png',
  'Gujarat Board': '/logos/gseb.png',
  'Jamnagar Municipal Corporation': '/logos/jmc.png',
  'Disaster Management India': '/logos/ndma.png',
  'MSME India': '/logos/msme.png',
  'Ministry of Education': '/logos/education.png',
  'UGC': '/logos/ugc.png',
  'NITI Aayog': '/logos/niti.png',
  'DPIIT': '/logos/dpiit.png',
};

export default function GovNotificationsPanel() {
  const [notifications, setNotifications] = useState<GovNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchNotifications();
  }, [selectedCategory]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.set('category', selectedCategory);
      }
      params.set('limit', '50');

      const response = await fetch(`/api/gov-notifications?${params}`);
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        setCategoryCounts(data.categoryCounts);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/gov-notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [id], action: 'mark_read' }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const ids = notifications.filter(n => !n.is_read).map(n => n.id);
      if (ids.length === 0) return;

      await fetch('/api/gov-notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: ids, action: 'mark_read' }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const archiveNotification = async (id: string) => {
    try {
      await fetch('/api/gov-notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [id], action: 'archive' }),
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to archive:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-IN');
  };

  const filteredNotifications = selectedCategory === 'all'
    ? notifications
    : notifications.filter(n => n.category === selectedCategory);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Government Notifications</h2>
              <p className="text-sm text-white/80">GOs, Circulars & Official Updates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-1.5 text-sm bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                Mark all read
              </button>
            )}
            <div className="px-3 py-1.5 bg-white/20 text-white rounded-lg text-sm font-medium">
              {unreadCount} unread
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            All ({notifications.length})
          </button>
          {Object.entries(categoryConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedCategory === key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {config.icon}
              {config.label} ({categoryCounts[key] || 0})
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No notifications found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => {
              const config = categoryConfig[notification.category] || categoryConfig.policy;
              return (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${config.color} shrink-0`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-500">{notification.source}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-400">{formatDate(notification.published_date)}</span>
                            {notification.priority === 'high' && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                                Urgent
                              </span>
                            )}
                          </div>
                          <h3 className={`font-medium text-gray-900 ${
                            !notification.is_read ? 'font-semibold' : ''
                          }`}>
                            {notification.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!notification.is_read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <a
                            href={notification.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View original"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => archiveNotification(notification.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Archive"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
        <p className="text-xs text-gray-500">
          Auto-updated every hour • Showing {filteredNotifications.length} of {notifications.length} notifications
        </p>
      </div>
    </div>
  );
}
