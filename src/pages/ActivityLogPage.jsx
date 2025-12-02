/**
 * ActivityLogPage - Display and filter activity logs
 *
 * Features:
 * - Table of activities with actor, action, resource, time
 * - Filter by resource type
 * - Filter by date range (24h, 7d, 30d)
 * - Pagination
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import {
  Activity,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Monitor,
  ListVideo,
  Layout,
  Calendar,
  Image,
  Palette,
  Bell,
  X,
} from 'lucide-react';
import {
  getActivityLog,
  getActivityLogCount,
  formatActivity,
  describeActivity,
  RESOURCE_TYPES,
} from '../services/activityLogService';
import { useBranding } from '../contexts/BrandingContext';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  Button,
  Alert,
  EmptyState,
} from '../design-system';

const ITEMS_PER_PAGE = 25;

const DATE_RANGES = [
  { value: 1, labelKey: 'activityLog.last24Hours', label: 'Last 24 hours' },
  { value: 7, labelKey: 'activityLog.last7Days', label: 'Last 7 days' },
  { value: 30, labelKey: 'activityLog.last30Days', label: 'Last 30 days' },
  { value: 90, labelKey: 'activityLog.last90Days', label: 'Last 90 days' },
];

const RESOURCE_TYPE_OPTIONS = [
  { value: null, labelKey: 'activityLog.allTypes', label: 'All Types', icon: Activity },
  { value: RESOURCE_TYPES.SCREEN, labelKey: 'screens.title', label: 'Screens', icon: Monitor },
  { value: RESOURCE_TYPES.PLAYLIST, labelKey: 'playlists.title', label: 'Playlists', icon: ListVideo },
  { value: RESOURCE_TYPES.LAYOUT, labelKey: 'layouts.title', label: 'Layouts', icon: Layout },
  { value: RESOURCE_TYPES.SCHEDULE, labelKey: 'schedules.title', label: 'Schedules', icon: Calendar },
  { value: RESOURCE_TYPES.MEDIA, labelKey: 'mediaLibrary.title', label: 'Media', icon: Image },
  { value: RESOURCE_TYPES.BRANDING, labelKey: 'branding.title', label: 'Branding', icon: Palette },
  { value: RESOURCE_TYPES.ALERT_RULE, labelKey: 'alerts.title', label: 'Alerts', icon: Bell },
];

export default function ActivityLogPage() {
  const { t } = useTranslation();
  const { branding, isImpersonating, impersonatedClient } = useBranding();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [resourceType, setResourceType] = useState(null);
  const [days, setDays] = useState(30);

  // Pagination
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Load activities
  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get count first
      const { count } = await getActivityLogCount({
        resourceType,
        days,
      });
      setTotalCount(count);

      // Get activities
      const { data, error: fetchError } = await getActivityLog({
        resourceType,
        days,
        limit: ITEMS_PER_PAGE,
        offset: page * ITEMS_PER_PAGE,
      });

      if (fetchError) {
        setError(fetchError);
      } else {
        setActivities(data.map(formatActivity));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [resourceType, days, page]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [resourceType, days]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getResourceIcon = (type) => {
    const option = RESOURCE_TYPE_OPTIONS.find((o) => o.value === type);
    return option?.icon || Activity;
  };

  return (
    <PageLayout>
      <PageHeader
        title={t('activityLog.title', 'Activity Log')}
        description={
          isImpersonating
            ? t('activityLog.activityForClient', 'Activity for {{name}}', { name: impersonatedClient?.businessName || 'client' })
            : t('activityLog.description', 'Track changes and actions in your account')
        }
        icon={<Activity className="w-5 h-5" style={{ color: branding.primaryColor }} />}
        iconBackground={`${branding.primaryColor}20`}
        actions={
          <Button
            onClick={loadActivities}
            variant="secondary"
            disabled={loading}
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            {t('common.refresh', 'Refresh')}
          </Button>
        }
      />

      <PageContent>
        {/* Filters */}
        <Card className="mb-6" padding="default">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" aria-hidden="true" />
              <span className="text-sm font-medium text-gray-700">{t('common.filters', 'Filters')}:</span>
            </div>

            {/* Resource Type Filter */}
            <select
              value={resourceType || ''}
              onChange={(e) => setResourceType(e.target.value || null)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label={t('activityLog.filterByType', 'Filter by type')}
            >
              {RESOURCE_TYPE_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value || ''}>
                  {t(option.labelKey, option.label)}
                </option>
              ))}
            </select>

            {/* Date Range Filter */}
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label={t('activityLog.filterByDateRange', 'Filter by date range')}
            >
              {DATE_RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {t(range.labelKey, range.label)}
                </option>
              ))}
            </select>

            {/* Clear Filters */}
            {(resourceType || days !== 30) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setResourceType(null);
                  setDays(30);
                }}
                icon={<X className="w-3 h-3" />}
              >
                {t('common.clear', 'Clear')}
              </Button>
            )}

            {/* Result count */}
            <div className="ml-auto text-sm text-gray-500">
              {t('activityLog.activityCount', '{{count}} activities', { count: totalCount })}
            </div>
          </div>
        </Card>

        {/* Error */}
        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Loading */}
        {loading && activities.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" aria-label={t('common.loading', 'Loading')} />
          </div>
        )}

        {/* Empty state */}
        {!loading && activities.length === 0 && (
          <EmptyState
            icon={Activity}
            title={t('activityLog.noActivity', 'No activity found')}
            description={
              resourceType || days !== 30
                ? t('activityLog.tryAdjustingFilters', 'Try adjusting your filters')
                : t('activityLog.activitiesWillAppear', 'Activities will appear here as you make changes')
            }
          />
        )}

        {/* Activities Table */}
        {activities.length > 0 && (
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" role="table" aria-label={t('activityLog.table', 'Activity log table')}>
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('activityLog.time', 'Time')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('activityLog.user', 'User')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('activityLog.action', 'Action')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('activityLog.resource', 'Resource')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('activityLog.details', 'Details')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activities.map((activity) => {
                    const ResourceIcon = getResourceIcon(activity.resource_type);
                    return (
                      <tr key={activity.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-gray-400" aria-hidden="true" />
                            <span className="text-gray-900" title={activity.formattedDate}>
                              {activity.formattedTime}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-500" aria-hidden="true" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {activity.actor_name || t('common.system', 'System')}
                              </p>
                              {activity.actor_email && (
                                <p className="text-xs text-gray-500">{activity.actor_email}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 text-sm font-medium ${activity.color}`}
                          >
                            <span aria-hidden="true">{activity.icon}</span>
                            {activity.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <ResourceIcon className="w-4 h-4 text-gray-400" aria-hidden="true" />
                            <span className="text-sm text-gray-900">
                              {activity.resource_name || activity.resource_type}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600 max-w-xs truncate">
                            {describeActivity(activity)}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {t('activityLog.showingRange', 'Showing {{from}} to {{to}} of {{total}}', {
                    from: page * ITEMS_PER_PAGE + 1,
                    to: Math.min((page + 1) * ITEMS_PER_PAGE, totalCount),
                    total: totalCount
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label={t('common.previousPage', 'Previous page')}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-gray-600">
                    {t('activityLog.pageOf', 'Page {{current}} of {{total}}', { current: page + 1, total: totalPages })}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label={t('common.nextPage', 'Next page')}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}
      </PageContent>
    </PageLayout>
  );
}
