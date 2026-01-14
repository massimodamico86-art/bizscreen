/**
 * Notification Bell Component
 *
 * Bell icon for the top navigation bar with unread count badge.
 * Opens a dropdown with recent notifications on click.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  Monitor,
  Calendar,
  Database,
  Share2,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAsClicked,
} from '../../services/notificationDispatcherService';
import { ALERT_TYPES } from '../../services/alertEngineService';

// Map alert types to icons
const TYPE_ICONS = {
  [ALERT_TYPES.DEVICE_OFFLINE]: Monitor,
  [ALERT_TYPES.DEVICE_SCREENSHOT_FAILED]: Monitor,
  [ALERT_TYPES.DEVICE_CACHE_STALE]: Monitor,
  [ALERT_TYPES.DEVICE_ERROR]: Monitor,
  [ALERT_TYPES.SCHEDULE_MISSING_SCENE]: Calendar,
  [ALERT_TYPES.SCHEDULE_CONFLICT]: Calendar,
  [ALERT_TYPES.DATA_SOURCE_SYNC_FAILED]: Database,
  [ALERT_TYPES.SOCIAL_FEED_SYNC_FAILED]: Share2,
  [ALERT_TYPES.CONTENT_EXPIRED]: AlertTriangle,
  [ALERT_TYPES.STORAGE_QUOTA_WARNING]: AlertTriangle,
  [ALERT_TYPES.API_RATE_LIMIT]: AlertCircle,
};

// Map severity to colors
const SEVERITY_STYLES = {
  critical: {
    badge: 'bg-red-500',
    icon: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  warning: {
    badge: 'bg-yellow-500',
    icon: 'text-yellow-500',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
  info: {
    badge: 'bg-blue-500',
    icon: 'text-blue-500',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
};

export default function NotificationBell({ onNavigate }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('[NotificationBell] Error loading unread count:', error);
    }
  }, []);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications({ limit: 10 });
      setNotifications(data);
    } catch (error) {
      console.error('[NotificationBell] Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and polling
  useEffect(() => {
    loadUnreadCount();

    // Poll for new notifications every 30 seconds
    pollIntervalRef.current = setInterval(loadUnreadCount, 30000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [loadUnreadCount]);

  // Load full notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    // Mark as clicked/read
    await markAsClicked(notification.id);

    // Update local state
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    // Navigate if action URL exists
    if (notification.action_url && onNavigate) {
      const pageName = notification.action_url.split('/')[1]?.split('?')[0];
      if (pageName) {
        onNavigate(pageName);
      }
    }

    setIsOpen(false);
  };

  // Handle mark all as read
  const handleMarkAllRead = async () => {
    await markAsRead();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
    setUnreadCount(0);
  };

  // Format relative time
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return t('notifications.justNow', 'Just now');
    if (diffMinutes < 60)
      return t('notifications.minutesAgo', '{{count}}m ago', { count: diffMinutes });
    if (diffHours < 24)
      return t('notifications.hoursAgo', '{{count}}h ago', { count: diffHours });
    if (diffDays < 7)
      return t('notifications.daysAgo', '{{count}}d ago', { count: diffDays });
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label={t('notifications.viewNotifications', 'View notifications')}
      >
        <Bell className="w-5 h-5" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-medium text-gray-900">
              {t('notifications.title', 'Notifications')}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {t('notifications.markAllRead', 'Mark all read')}
                </button>
              )}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigate?.('alerts');
                }}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                {t('notifications.viewAll', 'View all')}
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-pulse">{t('common.loading', 'Loading...')}</div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('notifications.empty', 'No notifications')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map((notification) => {
                  const Icon =
                    TYPE_ICONS[notification.alert_type] || AlertCircle;
                  const severityStyle =
                    SEVERITY_STYLES[notification.severity] || SEVERITY_STYLES.info;
                  const isUnread = !notification.read_at;

                  return (
                    <li key={notification.id}>
                      <button
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                          isUnread ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Icon */}
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full ${severityStyle.bg} flex items-center justify-center`}
                          >
                            <Icon className={`w-4 h-4 ${severityStyle.icon}`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={`text-sm ${
                                  isUnread
                                    ? 'font-medium text-gray-900'
                                    : 'text-gray-700'
                                } line-clamp-1`}
                              >
                                {notification.title}
                              </p>
                              {isUnread && (
                                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                              )}
                            </div>
                            {notification.message && (
                              <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                {notification.message}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {formatRelativeTime(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigate?.('alerts');
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 py-1"
              >
                {t('notifications.seeAllAlerts', 'See all alerts')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
