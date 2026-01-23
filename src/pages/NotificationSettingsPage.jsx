/**
 * Notification Settings Page
 *
 * Allows users to configure their notification preferences.
 * Controls which alerts they receive and through which channels.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import {
  Bell,
  Mail,
  Smartphone,
  AlertTriangle,
  AlertCircle,
  Info,
  Monitor,
  Calendar,
  Database,
  Share2,
  Save,
  ArrowLeft,
  Clock,
} from 'lucide-react';
import { PageLayout } from '../design-system/components/PageLayout';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from '../services/notificationDispatcherService';
import { ALERT_TYPES } from '../services/alertEngineService';

// Alert type categories for grouping
const ALERT_CATEGORIES = {
  device: {
    label: 'Device Alerts',
    icon: Monitor,
    types: [
      ALERT_TYPES.DEVICE_OFFLINE,
      ALERT_TYPES.DEVICE_SCREENSHOT_FAILED,
      ALERT_TYPES.DEVICE_CACHE_STALE,
      ALERT_TYPES.DEVICE_ERROR,
    ],
  },
  schedule: {
    label: 'Schedule Alerts',
    icon: Calendar,
    types: [ALERT_TYPES.SCHEDULE_MISSING_SCENE, ALERT_TYPES.SCHEDULE_CONFLICT],
  },
  data: {
    label: 'Data & Sync Alerts',
    icon: Database,
    types: [ALERT_TYPES.DATA_SOURCE_SYNC_FAILED, ALERT_TYPES.SOCIAL_FEED_SYNC_FAILED],
  },
  system: {
    label: 'System Alerts',
    icon: AlertTriangle,
    types: [
      ALERT_TYPES.CONTENT_EXPIRED,
      ALERT_TYPES.STORAGE_QUOTA_WARNING,
      ALERT_TYPES.API_RATE_LIMIT,
    ],
  },
};

// Alert type labels
const TYPE_LABELS = {
  [ALERT_TYPES.DEVICE_OFFLINE]: 'Device goes offline',
  [ALERT_TYPES.DEVICE_SCREENSHOT_FAILED]: 'Screenshot capture fails',
  [ALERT_TYPES.DEVICE_CACHE_STALE]: 'Device cache becomes stale',
  [ALERT_TYPES.DEVICE_ERROR]: 'Device errors',
  [ALERT_TYPES.SCHEDULE_MISSING_SCENE]: 'Schedule references missing scene',
  [ALERT_TYPES.SCHEDULE_CONFLICT]: 'Schedule conflicts',
  [ALERT_TYPES.DATA_SOURCE_SYNC_FAILED]: 'Data source sync fails',
  [ALERT_TYPES.SOCIAL_FEED_SYNC_FAILED]: 'Social feed sync fails',
  [ALERT_TYPES.CONTENT_EXPIRED]: 'Content expires',
  [ALERT_TYPES.STORAGE_QUOTA_WARNING]: 'Storage quota warnings',
  [ALERT_TYPES.API_RATE_LIMIT]: 'API rate limits hit',
};

// Severity options
const SEVERITY_OPTIONS = [
  { value: 'info', label: 'All alerts (Info and above)', icon: Info },
  { value: 'warning', label: 'Warnings and Critical only', icon: AlertTriangle },
  { value: 'critical', label: 'Critical only', icon: AlertCircle },
];

// Common timezones
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

export default function NotificationSettingsPage({ showToast, onNavigate }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Preferences state
  const [channelEmail, setChannelEmail] = useState(true);
  const [channelInApp, setChannelInApp] = useState(true);
  const [minSeverity, setMinSeverity] = useState('warning');
  const [enabledTypes, setEnabledTypes] = useState(new Set(Object.values(ALERT_TYPES)));
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');
  const [quietHoursTimezone, setQuietHoursTimezone] = useState('UTC');
  const [emailDigestEnabled, setEmailDigestEnabled] = useState(false);
  const [emailDigestFrequency, setEmailDigestFrequency] = useState('daily');

  // Load preferences
  useEffect(() => {
    const loadPreferences = async () => {
      setLoading(true);
      try {
        const prefs = await getNotificationPreferences();
        if (prefs) {
          setChannelEmail(prefs.channel_email ?? true);
          setChannelInApp(prefs.channel_in_app ?? true);
          setMinSeverity(prefs.min_severity || 'warning');

          // Handle types whitelist/blacklist
          if (prefs.types_blacklist && prefs.types_blacklist.length > 0) {
            const allTypes = new Set(Object.values(ALERT_TYPES));
            prefs.types_blacklist.forEach((t) => allTypes.delete(t));
            setEnabledTypes(allTypes);
          } else if (prefs.types_whitelist && prefs.types_whitelist.length > 0) {
            setEnabledTypes(new Set(prefs.types_whitelist));
          }

          // Quiet hours
          if (prefs.quiet_hours_start && prefs.quiet_hours_end) {
            setQuietHoursEnabled(true);
            setQuietHoursStart(prefs.quiet_hours_start);
            setQuietHoursEnd(prefs.quiet_hours_end);
            setQuietHoursTimezone(prefs.quiet_hours_timezone || 'UTC');
          }

          // Email digest
          setEmailDigestEnabled(prefs.email_digest_enabled ?? false);
          setEmailDigestFrequency(prefs.email_digest_frequency || 'daily');
        }
      } catch (error) {
        console.error('[NotificationSettingsPage] Error loading preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Save preferences
  const handleSave = async () => {
    setSaving(true);
    try {
      const allTypes = Object.values(ALERT_TYPES);
      const disabledTypes = allTypes.filter((t) => !enabledTypes.has(t));

      await saveNotificationPreferences({
        channel_email: channelEmail,
        channel_in_app: channelInApp,
        min_severity: minSeverity,
        types_whitelist: null, // Use blacklist approach
        types_blacklist: disabledTypes.length > 0 ? disabledTypes : null,
        quiet_hours_start: quietHoursEnabled ? quietHoursStart : null,
        quiet_hours_end: quietHoursEnabled ? quietHoursEnd : null,
        quiet_hours_timezone: quietHoursEnabled ? quietHoursTimezone : null,
        email_digest_enabled: emailDigestEnabled,
        email_digest_frequency: emailDigestFrequency,
      });

      showToast?.(t('settings.saved', 'Settings saved successfully'));
    } catch (error) {
      console.error('[NotificationSettingsPage] Error saving preferences:', error);
      showToast?.(t('settings.saveError', 'Failed to save settings'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Toggle alert type
  const toggleType = (type) => {
    const newEnabled = new Set(enabledTypes);
    if (newEnabled.has(type)) {
      newEnabled.delete(type);
    } else {
      newEnabled.add(type);
    }
    setEnabledTypes(newEnabled);
  };

  // Toggle category (all types in category)
  const toggleCategory = (category) => {
    const categoryTypes = ALERT_CATEGORIES[category].types;
    const allEnabled = categoryTypes.every((t) => enabledTypes.has(t));

    const newEnabled = new Set(enabledTypes);
    if (allEnabled) {
      categoryTypes.forEach((t) => newEnabled.delete(t));
    } else {
      categoryTypes.forEach((t) => newEnabled.add(t));
    }
    setEnabledTypes(newEnabled);
  };

  if (loading) {
    return (
      <PageLayout
        title={t('notifications.settings', 'Notification Settings')}
        icon={Bell}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={t('notifications.settings', 'Notification Settings')}
      description={t(
        'notifications.settingsDescription',
        'Configure how and when you receive alerts'
      )}
      icon={Bell}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate?.('alerts')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back', 'Back to Alerts')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save Settings')}
          </button>
        </div>
      }
    >
      <div className="max-w-3xl space-y-6">
        {/* Notification Channels */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t('notifications.channels', 'Notification Channels')}
          </h3>
          <div className="space-y-4">
            {/* In-app notifications */}
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {t('notifications.inApp', 'In-app Notifications')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t(
                      'notifications.inAppDescription',
                      'Show alerts in the notification bell'
                    )}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={channelInApp}
                onChange={(e) => setChannelInApp(e.target.checked)}
                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </label>

            {/* Email notifications */}
            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Mail className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {t('notifications.email', 'Email Notifications')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t(
                      'notifications.emailDescription',
                      'Receive alerts via email'
                    )}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={channelEmail}
                onChange={(e) => setChannelEmail(e.target.checked)}
                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* Severity Filter */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t('notifications.minSeverity', 'Minimum Severity')}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {t(
              'notifications.minSeverityDescription',
              'Only receive notifications for alerts at or above this severity level'
            )}
          </p>
          <div className="space-y-2">
            {SEVERITY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border ${
                  minSeverity === option.value
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-transparent hover:bg-gray-100'
                }`}
              >
                <input
                  type="radio"
                  name="severity"
                  value={option.value}
                  checked={minSeverity === option.value}
                  onChange={(e) => setMinSeverity(e.target.value)}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <option.icon
                  className={`w-5 h-5 ${
                    option.value === 'critical'
                      ? 'text-red-500'
                      : option.value === 'warning'
                        ? 'text-yellow-500'
                        : 'text-blue-500'
                  }`}
                />
                <span className="text-sm font-medium text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Alert Types */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t('notifications.alertTypes', 'Alert Types')}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {t(
              'notifications.alertTypesDescription',
              'Choose which types of alerts you want to receive'
            )}
          </p>

          <div className="space-y-6">
            {Object.entries(ALERT_CATEGORIES).map(([key, category]) => {
              const CategoryIcon = category.icon;
              const enabledCount = category.types.filter((t) => enabledTypes.has(t)).length;
              const allEnabled = enabledCount === category.types.length;
              const someEnabled = enabledCount > 0 && !allEnabled;

              return (
                <div key={key} className="space-y-3">
                  {/* Category header */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allEnabled}
                      ref={(el) => {
                        if (el) el.indeterminate = someEnabled;
                      }}
                      onChange={() => toggleCategory(key)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <CategoryIcon className="w-5 h-5 text-gray-500" />
                    <span className="font-medium text-gray-900">{category.label}</span>
                    <span className="text-sm text-gray-400">
                      ({enabledCount}/{category.types.length})
                    </span>
                  </label>

                  {/* Category types */}
                  <div className="ml-8 space-y-2">
                    {category.types.map((type) => (
                      <label
                        key={type}
                        className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={enabledTypes.has(type)}
                          onChange={() => toggleType(type)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {TYPE_LABELS[type] || type}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {t('notifications.quietHours', 'Quiet Hours')}
              </h3>
              <p className="text-sm text-gray-500">
                {t(
                  'notifications.quietHoursDescription',
                  'Pause notifications during specific hours'
                )}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={quietHoursEnabled}
                onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>

          {quietHoursEnabled && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('notifications.startTime', 'Start Time')}
                  </label>
                  <input
                    type="time"
                    value={quietHoursStart}
                    onChange={(e) => setQuietHoursStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('notifications.endTime', 'End Time')}
                  </label>
                  <input
                    type="time"
                    value={quietHoursEnd}
                    onChange={(e) => setQuietHoursEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('notifications.timezone', 'Timezone')}
                </label>
                <select
                  value={quietHoursTimezone}
                  onChange={(e) => setQuietHoursTimezone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Email Digest */}
        {channelEmail && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {t('notifications.emailDigest', 'Email Digest')}
                </h3>
                <p className="text-sm text-gray-500">
                  {t(
                    'notifications.emailDigestDescription',
                    'Receive a summary of alerts instead of individual emails'
                  )}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailDigestEnabled}
                  onChange={(e) => setEmailDigestEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>

            {emailDigestEnabled && (
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('notifications.digestFrequency', 'Digest Frequency')}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="digestFrequency"
                      value="daily"
                      checked={emailDigestFrequency === 'daily'}
                      onChange={(e) => setEmailDigestFrequency(e.target.value)}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      {t('notifications.daily', 'Daily')}
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="digestFrequency"
                      value="weekly"
                      checked={emailDigestFrequency === 'weekly'}
                      onChange={(e) => setEmailDigestFrequency(e.target.value)}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      {t('notifications.weekly', 'Weekly')}
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
