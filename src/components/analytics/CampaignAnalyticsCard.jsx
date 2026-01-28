/**
 * CampaignAnalyticsCard Component
 *
 * Displays performance analytics summary for a campaign.
 * Shows play count, duration, unique screens, avg plays/screen, and peak hour.
 */

import { formatHours } from '../../services/analyticsService';
import { DATE_RANGES } from '../../services/campaignAnalyticsService';

/**
 * Format peak hour for display (12h format with range)
 * @param {number|null} hour - Hour (0-23)
 * @returns {string} Formatted hour range
 */
function formatPeakHour(hour) {
  if (hour === null || hour === undefined) return 'No data';
  const endHour = (hour + 1) % 24;
  const formatHr = (h) => {
    if (h === 0) return '12am';
    if (h === 12) return '12pm';
    if (h < 12) return `${h}am`;
    return `${h - 12}pm`;
  };
  return `${formatHr(hour)} - ${formatHr(endHour)}`;
}

/**
 * Loading skeleton for the analytics card
 */
function AnalyticsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-gray-200 rounded w-24" />
        <div className="h-6 bg-gray-200 rounded w-20" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-4 w-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
      <div className="mt-3 h-4 bg-gray-200 rounded w-32" />
    </div>
  );
}

/**
 * Empty state when no analytics data
 */
function EmptyState() {
  return (
    <div className="text-center py-4">
      <BarChart3 size={24} className="mx-auto text-gray-300 mb-2" />
      <p className="text-sm text-gray-500">No playback data yet</p>
      <p className="text-xs text-gray-400 mt-1">
        Analytics will appear once the campaign plays on screens
      </p>
    </div>
  );
}

/**
 * CampaignAnalyticsCard displays performance metrics for a campaign
 *
 * @param {Object} props
 * @param {Object|null} props.analytics - Analytics data from getCampaignAnalytics
 * @param {string} props.dateRange - Current date range preset (e.g., '7d')
 * @param {Function} props.onDateRangeChange - Callback when date range changes
 * @param {boolean} props.loading - Whether data is loading
 */
export function CampaignAnalyticsCard({
  analytics,
  dateRange = '7d',
  onDateRangeChange,
  loading = false,
}) {
  // Handle loading state
  if (loading) {
    return (
      <Card className="p-6">
        <AnalyticsSkeleton />
      </Card>
    );
  }

  // Handle empty/no data state
  const hasData = analytics && analytics.total_play_count > 0;

  return (
    <Card className="p-6">
      {/* Header with date range selector */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Performance</h3>
        <select
          value={dateRange}
          onChange={(e) => onDateRangeChange?.(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        >
          {Object.entries(DATE_RANGES).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Total plays */}
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-600" />
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {(analytics.total_play_count || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Total Plays</p>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-green-600" />
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {formatHours((analytics.total_duration_seconds || 0) / 3600)}
                </p>
                <p className="text-xs text-gray-500">Duration</p>
              </div>
            </div>

            {/* Unique screens */}
            <div className="flex items-center gap-2">
              <Monitor size={18} className="text-purple-600" />
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {analytics.unique_screens || 0}
                </p>
                <p className="text-xs text-gray-500">Screens</p>
              </div>
            </div>

            {/* Avg plays per screen */}
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-orange-600" />
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {parseFloat(analytics.avg_plays_per_screen || 0).toFixed(1)}
                </p>
                <p className="text-xs text-gray-500">Avg/Screen</p>
              </div>
            </div>
          </div>

          {/* Peak hour */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              <span className="text-gray-400">Peak hour:</span>{' '}
              <span className="font-medium">{formatPeakHour(analytics.peak_hour)}</span>
            </p>
          </div>
        </>
      )}
    </Card>
  );
}

export default CampaignAnalyticsCard;
