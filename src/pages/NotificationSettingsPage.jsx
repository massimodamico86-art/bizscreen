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
import { useLogger } from '../hooks/useLogger.js';

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
  const logger = useLogger('NotificationSettingsPage');
