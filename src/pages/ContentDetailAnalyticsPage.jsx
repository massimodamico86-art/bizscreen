/**
 * ContentDetailAnalyticsPage
 *
 * Dedicated analytics page for a single content item (scene, media, or playlist).
 * Fulfills ANA-01 (view duration) and ANA-02 (completion rate) with detailed breakdowns.
 * Accessed via /analytics/content/:contentType/:contentId route.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle,
  Eye,
  Calendar,
  BarChart2,
  Timer,
} from 'lucide-react';
import { useLogger } from '../hooks/useLogger.js';


import {
  getContentMetrics,
  getSceneTimeline,
  formatDuration,
  formatRelativeTime,
  DATE_RANGES,
} from '../services/contentAnalyticsService';

/**
 * Primary metric card with large display
 */
function PrimaryMetric({ icon: Icon, label, value, subValue, colorClass = 'bg-blue-100 text-blue-600' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {subValue && <p className="text-sm text-gray-500 mt-1">{subValue}</p>}
    </div>
  );
}

/**
 * Secondary metric display
 */
function SecondaryMetric({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
      <Icon className="w-5 h-5 text-gray-400" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

/**
 * Simple bar chart for timeline visualization
 */
function TimelineChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-gray-500">
        <p>No timeline data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.view_count || d.total_duration_seconds || 0), 1);

  return (
    <div className="h-40">
      <div className="flex items-end h-full gap-1">
        {data.map((bucket, i) => {
          const value = bucket.view_count || bucket.total_duration_seconds || 0;
          const height = Math.max(4, (value / maxValue) * 100);
          const date = new Date(bucket.bucket_start);
          const label = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric'
          });

          return (
            <div
              key={i}
              className="flex-1 group relative"
            >
              <div
                className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600 cursor-pointer"
                style={{ height: `${height}%` }}
              />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {label}: {bucket.view_count ? `${bucket.view_count} views` : formatDuration(value)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>Older</span>
        <span>Recent</span>
      </div>
    </div>
  );
}

/**
 * Loading skeleton
 */
function PageSkeleton() {
  return (
    <PageLayout>
      <PageContent>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                  <div className="h-4 bg-gray-200 rounded w-24" />
                </div>
                <div className="h-8 bg-gray-200 rounded w-20" />
              </div>
            ))}
          </div>
          <div className="h-40 bg-gray-200 rounded" />
        </div>
      </PageContent>
    </PageLayout>
  );
}

export default function ContentDetailAnalyticsPage({ showToast }) {
  const { contentType, contentId } = useParams();
  const navigate = useNavigate();
  const logger = useLogger('ContentDetailAnalyticsPage');

  // State
  const [metrics, setMetrics] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [dateRange, setDateRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Load data
  const loadData = useCallback(async (isRefresh = false) => {
    if (!contentId || !contentType) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch metrics for all content types
      const metricsData = await getContentMetrics(contentId, contentType, dateRange);
      setMetrics(metricsData);

      // Fetch timeline only for scenes (has dedicated RPC)
      if (contentType === 'scene') {
        const bucket = dateRange === '24h' ? 'hour' : dateRange === '7d' ? 'hour' : 'day';
        const timelineData = await getSceneTimeline(contentId, dateRange, bucket);
        setTimeline(timelineData || []);
      } else {
        setTimeline([]);
      }
    } catch (err) {
      logger.error('Failed to load content analytics', { error: err, contentId, contentType });
      setError(err.message);
      showToast?.('Failed to load analytics data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [contentId, contentType, dateRange, showToast, logger]);

  // Load data on mount and when filters change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle back navigation
  const handleBack = () => {
    navigate(-1);
  };

  // Loading state
  if (loading) {
    return <PageSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <PageLayout>
        <PageContent>
          <div className="text-center py-12">
            <BarChart2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load analytics</h2>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={() => loadData()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </PageContent>
      </PageLayout>
    );
  }

  // Format content type for display
  const contentTypeLabel = contentType?.charAt(0).toUpperCase() + contentType?.slice(1) || 'Content';

  // Calculate completion rate color
  const completionRate = Math.round(metrics?.completion_rate || 0);
  const completionColorClass = completionRate >= 80
    ? 'bg-green-100 text-green-600'
    : completionRate >= 50
      ? 'bg-orange-100 text-orange-600'
      : 'bg-blue-100 text-blue-600';

  return (
    <PageLayout>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <BarChart2 className="w-7 h-7 text-blue-600" />
            {contentTypeLabel} Analytics
          </span>
        }
        description={`Detailed analytics for ${contentType} content`}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => loadData(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="secondary"
              onClick={handleBack}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
        }
      />

      <PageContent>
        <div className="space-y-6">
          {/* Date Range Pills */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(DATE_RANGES).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setDateRange(key)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  dateRange === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Primary Metrics - ANA-01 and ANA-02 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ANA-01: Average View Duration */}
            <PrimaryMetric
              icon={Clock}
              label="Average View Duration"
              value={formatDuration(metrics?.avg_view_duration_seconds || 0)}
              subValue="Time viewers spend watching this content"
              colorClass="bg-blue-100 text-blue-600"
            />

            {/* ANA-02: Completion Rate */}
            <PrimaryMetric
              icon={CheckCircle}
              label="Completion Rate"
              value={`${completionRate}%`}
              subValue={
                completionRate >= 80
                  ? 'Excellent engagement'
                  : completionRate >= 50
                    ? 'Good engagement'
                    : 'Room for improvement'
              }
              colorClass={completionColorClass}
            />
          </div>

          {/* Secondary Metrics */}
          <Card>
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                Additional Metrics
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <SecondaryMetric
                icon={Eye}
                label="Total Views"
                value={(metrics?.total_views || 0).toLocaleString()}
              />
              <SecondaryMetric
                icon={Timer}
                label="Total View Time"
                value={formatDuration(metrics?.total_view_time_seconds || 0)}
              />
              <SecondaryMetric
                icon={Calendar}
                label="Last Viewed"
                value={formatRelativeTime(metrics?.last_viewed_at)}
              />
              <SecondaryMetric
                icon={BarChart2}
                label="Content Type"
                value={contentTypeLabel}
              />
            </div>
          </Card>

          {/* Timeline Visualization (for scenes) */}
          {contentType === 'scene' && (
            <Card>
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-600" />
                  View Activity Timeline
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  View activity over the selected time period
                </p>
              </div>
              <div className="p-4">
                <TimelineChart data={timeline} />
              </div>
            </Card>
          )}

          {/* No data message for non-scene content */}
          {contentType !== 'scene' && (
            <Card>
              <div className="p-6 text-center text-gray-500">
                <BarChart2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>Timeline visualization is available for scenes only.</p>
                <p className="text-sm mt-1">
                  Media and playlist timeline features coming soon.
                </p>
              </div>
            </Card>
          )}
        </div>
      </PageContent>
    </PageLayout>
  );
}
