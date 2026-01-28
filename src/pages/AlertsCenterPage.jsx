/**
 * Alerts Center Page
 *
 * Central hub for viewing and managing all system alerts.
 * Supports filtering, bulk actions, and detailed alert views.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { useLogger } from '../hooks/useLogger.js';
import {
  AlertTriangle,
  AlertCircle,
  Bell,
  Monitor,
  Calendar,
  Database,
  Share2,
  Eye,
} from 'lucide-react';
import {
  getAlerts,
  getAlertSummary,
  acknowledgeAlert,
  resolveAlert,
  bulkAcknowledge,
  bulkResolve,
  ALERT_TYPES,
} from '../services/alertEngineService';

// Alert type labels
const TYPE_LABELS = {
  [ALERT_TYPES.DEVICE_OFFLINE]: 'Device Offline',
  [ALERT_TYPES.DEVICE_SCREENSHOT_FAILED]: 'Screenshot Failed',
  [ALERT_TYPES.DEVICE_CACHE_STALE]: 'Cache Stale',
  [ALERT_TYPES.DEVICE_ERROR]: 'Device Error',
  [ALERT_TYPES.SCHEDULE_MISSING_SCENE]: 'Missing Scene',
  [ALERT_TYPES.SCHEDULE_CONFLICT]: 'Schedule Conflict',
  [ALERT_TYPES.DATA_SOURCE_SYNC_FAILED]: 'Data Sync Failed',
  [ALERT_TYPES.SOCIAL_FEED_SYNC_FAILED]: 'Social Sync Failed',
  [ALERT_TYPES.CONTENT_EXPIRED]: 'Content Expired',
  [ALERT_TYPES.STORAGE_QUOTA_WARNING]: 'Storage Warning',
  [ALERT_TYPES.API_RATE_LIMIT]: 'API Rate Limit',
};

// Alert type icons
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

// Severity styles
const SEVERITY_STYLES = {
  critical: {
    badge: 'bg-red-100 text-red-800',
    icon: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
  warning: {
    badge: 'bg-yellow-100 text-yellow-800',
    icon: 'text-yellow-500',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    dot: 'bg-yellow-500',
  },
  info: {
    badge: 'bg-blue-100 text-blue-800',
    icon: 'text-blue-500',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
};

// Status styles
const STATUS_STYLES = {
  open: { badge: 'bg-red-100 text-red-800', label: 'Open' },
  acknowledged: { badge: 'bg-yellow-100 text-yellow-800', label: 'Acknowledged' },
  resolved: { badge: 'bg-green-100 text-green-800', label: 'Resolved' },
};

export default function AlertsCenterPage({ showToast, onNavigate }) {
  const { t } = useTranslation();
  const logger = useLogger('AlertsCenterPage');
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({
    open: 0,
    critical: 0,
    warning: 0,
    info: 0,
    acknowledged: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedAlerts, setSelectedAlerts] = useState(new Set());
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('open');
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  // Load alerts
  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const [alertsResult, summaryResult] = await Promise.all([
        getAlerts({
          status: statusFilter || null,
          severity: severityFilter || null,
          type: typeFilter || null,
          limit: pageSize,
          offset: page * pageSize,
        }),
        getAlertSummary(),
      ]);

      setAlerts(alertsResult.data);
      setTotalCount(alertsResult.count);
      setSummary(summaryResult);
    } catch (error) {
      logger.error('[AlertsCenterPage] Error loading alerts:', error);
      showToast?.(t('alerts.loadError', 'Failed to load alerts'), 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter, typeFilter, page, showToast, t]);

  // Initial load and filter changes
  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Handle acknowledge
  const handleAcknowledge = async (alertId) => {
    const success = await acknowledgeAlert(alertId);
    if (success) {
      showToast?.(t('alerts.acknowledged', 'Alert acknowledged'));
      loadAlerts();
    }
  };

  // Handle resolve
  const handleResolve = async (alertId, notes = null) => {
    const success = await resolveAlert(alertId, notes);
    if (success) {
      showToast?.(t('alerts.resolved', 'Alert resolved'));
      loadAlerts();
      setShowDetailModal(false);
    }
  };

  // Handle bulk acknowledge
  const handleBulkAcknowledge = async () => {
    if (selectedAlerts.size === 0) return;
    const count = await bulkAcknowledge(Array.from(selectedAlerts));
    if (count > 0) {
      showToast?.(t('alerts.bulkAcknowledged', '{{count}} alerts acknowledged', { count }));
      setSelectedAlerts(new Set());
      loadAlerts();
    }
  };

  // Handle bulk resolve
  const handleBulkResolve = async () => {
    if (selectedAlerts.size === 0) return;
    const count = await bulkResolve(Array.from(selectedAlerts));
    if (count > 0) {
      showToast?.(t('alerts.bulkResolved', '{{count}} alerts resolved', { count }));
      setSelectedAlerts(new Set());
      loadAlerts();
    }
  };

  // Toggle alert selection
  const toggleSelection = (alertId) => {
    const newSelection = new Set(selectedAlerts);
    if (newSelection.has(alertId)) {
      newSelection.delete(alertId);
    } else {
      newSelection.add(alertId);
    }
    setSelectedAlerts(newSelection);
  };

  // Toggle all selection
  const toggleAllSelection = () => {
    if (selectedAlerts.size === alerts.length) {
      setSelectedAlerts(new Set());
    } else {
      setSelectedAlerts(new Set(alerts.map((a) => a.id)));
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Navigate to related item
  const navigateToRelated = (alert) => {
    if (alert.device_id && onNavigate) {
      onNavigate('screens');
    } else if (alert.scene_id && onNavigate) {
      onNavigate('scenes');
    } else if (alert.schedule_id && onNavigate) {
      onNavigate('schedules');
    } else if (alert.data_source_id && onNavigate) {
      onNavigate('data-sources');
    }
  };

  // Summary cards data
  const summaryCards = [
    {
      label: t('alerts.openAlerts', 'Open Alerts'),
      value: summary.open,
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
    },
    {
      label: t('alerts.critical', 'Critical'),
      value: summary.critical,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      label: t('alerts.warnings', 'Warnings'),
      value: summary.warning,
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
    },
    {
      label: t('alerts.acknowledged', 'Acknowledged'),
      value: summary.acknowledged,
      icon: Eye,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
  ];

  return (
    <PageLayout
      title={t('alerts.title', 'Alerts Center')}
      description={t('alerts.description', 'Monitor and manage system alerts')}
      icon={Bell}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate?.('notification-settings')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Settings className="w-4 h-4" />
            {t('alerts.notificationSettings', 'Notification Settings')}
          </button>
          <button
            onClick={loadAlerts}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh', 'Refresh')}
          </button>
        </div>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className={`${card.bgColor} rounded-lg p-4 border border-gray-200`}
          >
            <div className="flex items-center gap-3">
              <card.icon className={`w-5 h-5 ${card.color}`} />
              <div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-600">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">{t('common.filters', 'Filters')}:</span>
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('alerts.allStatuses', 'All Statuses')}</option>
          <option value="open">{t('alerts.open', 'Open')}</option>
          <option value="acknowledged">{t('alerts.acknowledged', 'Acknowledged')}</option>
          <option value="resolved">{t('alerts.resolved', 'Resolved')}</option>
        </select>

        {/* Severity filter */}
        <select
          value={severityFilter}
          onChange={(e) => {
            setSeverityFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('alerts.allSeverities', 'All Severities')}</option>
          <option value="critical">{t('alerts.critical', 'Critical')}</option>
          <option value="warning">{t('alerts.warning', 'Warning')}</option>
          <option value="info">{t('alerts.info', 'Info')}</option>
        </select>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('alerts.allTypes', 'All Types')}</option>
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <option key={type} value={type}>
              {label}
            </option>
          ))}
        </select>

        {/* Clear filters */}
        {(statusFilter || severityFilter || typeFilter) && (
          <button
            onClick={() => {
              setStatusFilter('open');
              setSeverityFilter('');
              setTypeFilter('');
              setPage(0);
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {t('common.clearFilters', 'Clear filters')}
          </button>
        )}
      </div>

      {/* Bulk actions */}
      {selectedAlerts.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <span className="text-sm text-blue-700">
            {t('alerts.selectedCount', '{{count}} selected', { count: selectedAlerts.size })}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkAcknowledge}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
            >
              <Eye className="w-3 h-3" />
              {t('alerts.acknowledgeAll', 'Acknowledge')}
            </button>
            <button
              onClick={handleBulkResolve}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
            >
              <Check className="w-3 h-3" />
              {t('alerts.resolveAll', 'Resolve')}
            </button>
            <button
              onClick={() => setSelectedAlerts(new Set())}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              <X className="w-3 h-3" />
              {t('common.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Alerts table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p>{t('common.loading', 'Loading...')}</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">{t('alerts.noAlerts', 'No alerts found')}</p>
            <p className="text-sm mt-1">
              {t('alerts.noAlertsDescription', 'All systems are running smoothly')}
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={selectedAlerts.size === alerts.length && alerts.length > 0}
                  onChange={toggleAllSelection}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-1">{t('alerts.severity', 'Severity')}</div>
              <div className="col-span-3">{t('alerts.alert', 'Alert')}</div>
              <div className="col-span-2">{t('alerts.type', 'Type')}</div>
              <div className="col-span-2">{t('alerts.related', 'Related')}</div>
              <div className="col-span-1">{t('alerts.occurrences', 'Count')}</div>
              <div className="col-span-1">{t('alerts.lastSeen', 'Last Seen')}</div>
              <div className="col-span-1">{t('alerts.actions', 'Actions')}</div>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-gray-100">
              {alerts.map((alert) => {
                const Icon = TYPE_ICONS[alert.type] || AlertCircle;
                const severityStyle = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
                const statusStyle = STATUS_STYLES[alert.status] || STATUS_STYLES.open;
                const isSelected = selectedAlerts.has(alert.id);

                return (
                  <div
                    key={alert.id}
                    className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="col-span-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(alert.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>

                    {/* Severity */}
                    <div className="col-span-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${severityStyle.badge}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${severityStyle.dot}`} />
                        {alert.severity}
                      </span>
                    </div>

                    {/* Alert title */}
                    <div className="col-span-3">
                      <button
                        onClick={() => {
                          setSelectedAlert(alert);
                          setShowDetailModal(true);
                        }}
                        className="text-left hover:text-blue-600"
                      >
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                          {alert.title}
                        </p>
                        {alert.message && (
                          <p className="text-xs text-gray-500 line-clamp-1">{alert.message}</p>
                        )}
                      </button>
                    </div>

                    {/* Type */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-4 h-4 ${severityStyle.icon}`} />
                        <span className="text-sm text-gray-600">
                          {TYPE_LABELS[alert.type] || alert.type}
                        </span>
                      </div>
                    </div>

                    {/* Related item */}
                    <div className="col-span-2">
                      {alert.device?.name ? (
                        <button
                          onClick={() => navigateToRelated(alert)}
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Monitor className="w-3 h-3" />
                          {alert.device.name}
                        </button>
                      ) : alert.scene?.name ? (
                        <button
                          onClick={() => navigateToRelated(alert)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {alert.scene.name}
                        </button>
                      ) : alert.schedule?.name ? (
                        <button
                          onClick={() => navigateToRelated(alert)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {alert.schedule.name}
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>

                    {/* Occurrences */}
                    <div className="col-span-1">
                      {alert.occurrences > 1 ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                          {alert.occurrences}x
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">1</span>
                      )}
                    </div>

                    {/* Last seen */}
                    <div className="col-span-1">
                      <span className="text-sm text-gray-500">
                        {formatRelativeTime(alert.last_occurred_at)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1">
                      <div className="flex items-center gap-1">
                        {alert.status === 'open' && (
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            title={t('alerts.acknowledge', 'Acknowledge')}
                            className="p-1 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {alert.status !== 'resolved' && (
                          <button
                            onClick={() => handleResolve(alert.id)}
                            title={t('alerts.resolve', 'Resolve')}
                            className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedAlert(alert);
                            setShowDetailModal(true);
                          }}
                          title={t('alerts.viewDetails', 'View details')}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-sm text-gray-600">
              {t('common.showingOf', 'Showing {{from}}-{{to}} of {{total}}', {
                from: page * pageSize + 1,
                to: Math.min((page + 1) * pageSize, totalCount),
                total: totalCount,
              })}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.previous', 'Previous')}
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * pageSize >= totalCount}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.next', 'Next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedAlert(null);
          }}
          onAcknowledge={handleAcknowledge}
          onResolve={handleResolve}
          onNavigate={onNavigate}
          t={t}
        />
      )}
    </PageLayout>
  );
}

// Alert Detail Modal Component
function AlertDetailModal({ alert, onClose, onAcknowledge, onResolve, onNavigate, t }) {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const Icon = TYPE_ICONS[alert.type] || AlertCircle;
  const severityStyle = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
  const statusStyle = STATUS_STYLES[alert.status] || STATUS_STYLES.open;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`px-6 py-4 border-b ${severityStyle.bg} ${severityStyle.border}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg bg-white ${severityStyle.border} border`}
              >
                <Icon className={`w-5 h-5 ${severityStyle.icon}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{alert.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${severityStyle.badge}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusStyle.badge}`}>
                    {statusStyle.label}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Message */}
          {alert.message && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">
                {t('alerts.message', 'Message')}
              </h4>
              <p className="text-gray-900">{alert.message}</p>
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">
                {t('alerts.type', 'Type')}
              </h4>
              <p className="text-gray-900">{TYPE_LABELS[alert.type] || alert.type}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">
                {t('alerts.occurrences', 'Occurrences')}
              </h4>
              <p className="text-gray-900">{alert.occurrences}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">
                {t('alerts.firstSeen', 'First Seen')}
              </h4>
              <p className="text-gray-900">
                {new Date(alert.first_occurred_at).toLocaleString()}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">
                {t('alerts.lastSeen', 'Last Seen')}
              </h4>
              <p className="text-gray-900">
                {new Date(alert.last_occurred_at).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Related items */}
          {(alert.device || alert.scene || alert.schedule || alert.data_source) && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">
                {t('alerts.relatedItems', 'Related Items')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {alert.device && (
                  <button
                    onClick={() => {
                      onNavigate?.('screens');
                      onClose();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    <Monitor className="w-4 h-4" />
                    {alert.device.name}
                  </button>
                )}
                {alert.scene && (
                  <button
                    onClick={() => {
                      onNavigate?.('scenes');
                      onClose();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    {alert.scene.name}
                  </button>
                )}
                {alert.schedule && (
                  <button
                    onClick={() => {
                      onNavigate?.('schedules');
                      onClose();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    <Calendar className="w-4 h-4" />
                    {alert.schedule.name}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Meta data */}
          {alert.meta && Object.keys(alert.meta).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">
                {t('alerts.additionalInfo', 'Additional Information')}
              </h4>
              <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(alert.meta, null, 2)}
              </pre>
            </div>
          )}

          {/* Resolution notes input */}
          {alert.status !== 'resolved' && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">
                {t('alerts.resolutionNotes', 'Resolution Notes (optional)')}
              </h4>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder={t('alerts.resolutionNotesPlaceholder', 'Describe how this was resolved...')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>
          )}

          {/* Resolved info */}
          {alert.status === 'resolved' && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCheck className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {t('alerts.resolvedAt', 'Resolved at {{date}}', {
                    date: new Date(alert.resolved_at).toLocaleString(),
                  })}
                </span>
              </div>
              {alert.resolution_notes && (
                <p className="text-sm text-green-600 mt-1">{alert.resolution_notes}</p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            {t('common.close', 'Close')}
          </button>
          {alert.status === 'open' && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200"
            >
              <Eye className="w-4 h-4" />
              {t('alerts.acknowledge', 'Acknowledge')}
            </button>
          )}
          {alert.status !== 'resolved' && (
            <button
              onClick={() => onResolve(alert.id, resolutionNotes || null)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Check className="w-4 h-4" />
              {t('alerts.resolve', 'Resolve')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
