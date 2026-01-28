/**
 * SecurityDashboardPage - Monitor sanitization events and flagged users
 *
 * Features:
 * - Table of recent sanitization events with user, context, and summary
 * - Flagged users section showing users with repeated sanitization events
 * - Admin-only access (enforced by RLS and routing)
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import {
  Shield,
} from 'lucide-react';


import {
  getSanitizationEvents,
  getFlaggedUsers,
  getSanitizationEventCount,
} from '../services/securityService.js';

const ITEMS_PER_PAGE = 25;
const FLAGGED_THRESHOLD = 5;

export default function SecurityDashboardPage() {
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const [flaggedUsers, setFlaggedUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [eventsResult, flaggedResult, countResult] = await Promise.all([
        getSanitizationEvents({
          limit: ITEMS_PER_PAGE,
          offset: page * ITEMS_PER_PAGE,
        }),
        getFlaggedUsers({ threshold: FLAGGED_THRESHOLD }),
        getSanitizationEventCount(),
      ]);

      if (eventsResult.error) {
        setError(eventsResult.error);
      } else {
        setEvents(eventsResult.data);
      }

      if (!flaggedResult.error) {
        setFlaggedUsers(flaggedResult.data);
      }

      if (!countResult.error) {
        setTotalCount(countResult.count);
      }
    } catch (err) {
      setError(err.message || 'Failed to load security data');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Format timestamp for display
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  // Format removed summary for display
  const formatSummary = (summary) => {
    if (!summary || Object.keys(summary).length === 0) {
      return 'No details';
    }

    const parts = [];
    if (summary.scripts) parts.push(`${summary.scripts} script${summary.scripts > 1 ? 's' : ''}`);
    if (summary.handlers) parts.push(`${summary.handlers} handler${summary.handlers > 1 ? 's' : ''}`);
    if (summary.iframes) parts.push(`${summary.iframes} iframe${summary.iframes > 1 ? 's' : ''}`);
    if (summary.objects) parts.push(`${summary.objects} object${summary.objects > 1 ? 's' : ''}`);
    if (summary.embeds) parts.push(`${summary.embeds} embed${summary.embeds > 1 ? 's' : ''}`);
    if (summary.otherElements) parts.push(`${summary.otherElements} element${summary.otherElements > 1 ? 's' : ''}`);
    if (summary.otherAttributes) parts.push(`${summary.otherAttributes} attr${summary.otherAttributes > 1 ? 's' : ''}`);
    if (summary.other) parts.push(`${summary.other} other`);

    return parts.length > 0 ? parts.join(', ') : 'Unknown content removed';
  };

  // Get severity color based on summary
  const getSeverityColor = (summary) => {
    if (!summary) return 'text-gray-500';
    if (summary.scripts > 0) return 'text-red-600';
    if (summary.handlers > 0 || summary.iframes > 0) return 'text-orange-600';
    return 'text-yellow-600';
  };

  return (
    <PageLayout>
      <PageHeader
        title={t('security.title', 'Security Dashboard')}
        description={t('security.description', 'Monitor sanitization events and flagged users')}
        icon={<Shield className="w-5 h-5 text-red-600" />}
        iconBackground="bg-red-100"
        actions={
          <Button
            onClick={loadData}
            variant="secondary"
            disabled={loading}
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            {t('common.refresh', 'Refresh')}
          </Button>
        }
      />

      <PageContent>
        {/* Error Alert */}
        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card padding="default">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileWarning className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{totalCount}</p>
                <p className="text-sm text-gray-500">{t('security.totalEvents', 'Total Events')}</p>
              </div>
            </div>
          </Card>

          <Card padding="default">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Flag className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{flaggedUsers.length}</p>
                <p className="text-sm text-gray-500">{t('security.flaggedUsers', 'Flagged Users')}</p>
              </div>
            </div>
          </Card>

          <Card padding="default">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{FLAGGED_THRESHOLD}+</p>
                <p className="text-sm text-gray-500">{t('security.flagThreshold', 'Flag Threshold')}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Flagged Users Section */}
        <Card className="mb-6" padding="none">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-500" />
              {t('security.flaggedUsersTitle', 'Flagged Users')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('security.flaggedUsersDescription', 'Users with {{threshold}} or more sanitization events', { threshold: FLAGGED_THRESHOLD })}
            </p>
          </div>

          {flaggedUsers.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-3 text-green-400" />
              <p className="font-medium">{t('security.noFlaggedUsers', 'No flagged users')}</p>
              <p className="text-sm">{t('security.noFlaggedUsersHint', 'All users are below the threshold')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('security.user', 'User')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('security.eventCount', 'Event Count')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('security.lastEvent', 'Last Event')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {flaggedUsers.map((user) => (
                    <tr key={user.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-red-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {user.full_name || 'Unknown User'}
                            </p>
                            <p className="text-xs text-gray-500">{user.email || user.user_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {user.event_count} events
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.last_event ? formatTime(user.last_event) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Recent Sanitization Events */}
        <Card padding="none">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Code className="w-5 h-5 text-blue-500" />
              {t('security.recentEvents', 'Recent Sanitization Events')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('security.recentEventsDescription', 'Content that was sanitized to prevent XSS attacks')}
            </p>
          </div>

          {loading && events.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <EmptyState
              icon={Shield}
              title={t('security.noEvents', 'No sanitization events')}
              description={t('security.noEventsHint', 'Events will appear here when potentially malicious content is sanitized')}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full" role="table">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('security.time', 'Time')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('security.user', 'User')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('security.context', 'Context')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('security.removed', 'Removed')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {events.map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900" title={new Date(event.created_at).toLocaleString()}>
                              {formatTime(event.created_at)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {event.user_name || event.user_email || 'Anonymous'}
                              </p>
                              {event.user_email && event.user_name && (
                                <p className="text-xs text-gray-500">{event.user_email}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {event.context || 'unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm ${getSeverityColor(event.removed_summary)}`}>
                            {formatSummary(event.removed_summary)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {t('security.showingRange', 'Showing {{from}} to {{to}} of {{total}}', {
                      from: page * ITEMS_PER_PAGE + 1,
                      to: Math.min((page + 1) * ITEMS_PER_PAGE, totalCount),
                      total: totalCount,
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={t('common.previousPage', 'Previous page')}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600">
                      {t('security.pageOf', 'Page {{current}} of {{total}}', { current: page + 1, total: totalPages })}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={t('common.nextPage', 'Next page')}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </PageContent>
    </PageLayout>
  );
}
