/**
 * ContentInlineMetrics Component
 *
 * Displays inline analytics summary for content (scene, media, playlist).
 * Shows: View Duration, Completion Rate, Total Views, Last Viewed
 * Includes link to full analytics page.
 */

import { useState, useEffect } from 'react';
import { Clock, CheckCircle, Eye, Calendar } from 'lucide-react';
import {
  getContentMetrics,
  formatDuration,
  formatRelativeTime,
} from '../../services/contentAnalyticsService';

/**
 * Single metric item display
 */
function MetricItem({ icon: Icon, label, value, subValue, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
        {subValue && <p className="text-xs text-gray-400">{subValue}</p>}
      </div>
    </div>
  );
}

/**
 * Skeleton loading state
 */
function MetricsSkeleton() {
  return (
    <Card padding="sm">
      <div className="animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded w-16 mb-1" />
                <div className="h-4 bg-gray-200 rounded w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function ContentInlineMetrics({
  contentId,
  contentType, // 'scene' | 'media' | 'playlist'
  dateRange = '7d',
  showLink = true,
  className = '',
}) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadMetrics() {
      if (!contentId || !contentType) return;

      setLoading(true);
      setError(null);

      try {
        const data = await getContentMetrics(contentId, contentType, dateRange);
        setMetrics(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, [contentId, contentType, dateRange]);

  if (loading) {
    return <MetricsSkeleton />;
  }

  if (error) {
    return (
      <Card padding="sm" className={className}>
        <p className="text-sm text-red-600">Failed to load analytics</p>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  const completionRate = Math.round(metrics.completion_rate || 0);
  const completionColor = completionRate >= 80 ? 'green' : completionRate >= 50 ? 'orange' : 'blue';

  return (
    <Card padding="sm" className={className}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-gray-400" />
          Analytics Summary
        </h4>
        {showLink && (
          <Link
            to={`/analytics/content/${contentType}/${contentId}`}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            View full analytics
            <TrendingUp className="w-3 h-3" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricItem
          icon={Clock}
          label="Avg. View Duration"
          value={formatDuration(metrics.avg_view_duration_seconds || 0)}
          color="blue"
        />
        <MetricItem
          icon={CheckCircle}
          label="Completion Rate"
          value={`${completionRate}%`}
          color={completionColor}
        />
        <MetricItem
          icon={Eye}
          label="Total Views"
          value={(metrics.total_views || 0).toLocaleString()}
          color="purple"
        />
        <MetricItem
          icon={Calendar}
          label="Last Viewed"
          value={formatRelativeTime(metrics.last_viewed_at)}
          color="orange"
        />
      </div>
    </Card>
  );
}

export default ContentInlineMetrics;
