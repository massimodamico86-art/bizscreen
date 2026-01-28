/**
 * Analytics Dashboard Page
 *
 * Main analytics dashboard with tabbed sections:
 * - Overview: Summary metrics (total view hours, active screens, top content)
 * - Content: Performance list sorted by total view time (ANA-03)
 * - Patterns: Viewing heatmap (ANA-04)
 *
 * Implements content performance dashboard requirements from CONTEXT.md.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Layers,
  Grid3X3,
} from 'lucide-react';
import { useLogger } from '../hooks/useLogger.js';


import {
  getContentAnalyticsSummary,
  getTopScenes,
  getContentPerformanceList,
  getViewingHeatmap,
  formatDuration,
  formatHours,
  formatRelativeTime,
} from '../services/contentAnalyticsService';

// Date range options (7d, 30d, 90d, 365d per plan)
const DATE_RANGE_OPTIONS = [
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '90d', label: '90 Days' },
  { id: '365d', label: '1 Year' },
];

// Tab definitions
const TABS = [
  { id: 'overview', label: 'Overview', icon: Grid3X3 },
  { id: 'content', label: 'Content', icon: Layers },
  { id: 'patterns', label: 'Patterns', icon: Calendar },
];

export default function AnalyticsDashboardPage({ showToast }) {
  const logger = useLogger('AnalyticsDashboardPage');

  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data state
  const [summary, setSummary] = useState(null);
  const [topScenes, setTopScenes] = useState([]);
  const [contentList, setContentList] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);

  // Load all data
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Fetch data in parallel
      const [summaryData, topScenesData, contentData, heatmap] = await Promise.all([
        getContentAnalyticsSummary(dateRange),
        getTopScenes(dateRange, 5),
        getContentPerformanceList(dateRange, 20),
        getViewingHeatmap(dateRange),
      ]);

      setSummary(summaryData);
      setTopScenes(topScenesData);
      setContentList(contentData);
      setHeatmapData(heatmap);
    } catch (error) {
      logger.error('Failed to load analytics data', { error });
      showToast?.('Failed to load analytics data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, showToast, logger]);

  // Load data on mount and when date range changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle refresh button
  const handleRefresh = () => {
    loadData(true);
  };

  // Loading state
  if (loading) {
    return (
      <PageLayout>
        <PageContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading analytics...</p>
            </div>
          </div>
        </PageContent>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-600" />
            Analytics Dashboard
          </span>
        }
        description="View content performance, viewing patterns, and engagement metrics"
        actions={
          <Button
            variant="ghost"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />
      <PageContent>
        <div className="space-y-6">
          {/* Date Range Pills */}
          <div className="flex flex-wrap gap-2">
            {DATE_RANGE_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setDateRange(option.id)}
                className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                  dateRange === option.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Tabs */}
          <Tabs
            tabs={TABS}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'overview' && (
              <OverviewTab
                summary={summary}
                topScenes={topScenes}
              />
            )}

            {activeTab === 'content' && (
              <ContentTab
                contentList={contentList}
              />
            )}

            {activeTab === 'patterns' && (
              <PatternsTab
                heatmapData={heatmapData}
              />
            )}
          </div>
        </div>
      </PageContent>
    </PageLayout>
  );
}

/**
 * Overview Tab - Summary metrics and top content
 */
function OverviewTab({ summary, topScenes }) {
  // Calculate total view hours from summary
  const totalViewHours = summary?.total_playback_hours || 0;
  const activeScreens = summary?.active_devices || 0;
  const totalScenes = summary?.total_scenes || 0;
  const avgUptime = summary?.avg_uptime_percent || 0;

  return (
    <div className="space-y-6">
      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total View Hours */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total View Hours</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatHours(totalViewHours)}
              </p>
            </div>
          </div>
        </Card>

        {/* Active Screens */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Monitor className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Screens</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeScreens}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            of {summary?.total_devices || 0} total
          </p>
        </Card>

        {/* Total Scenes */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Layers className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Content Items</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalScenes}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {summary?.active_scenes || 0} active
          </p>
        </Card>

        {/* Average Uptime */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Uptime</p>
              <p className={`text-2xl font-bold ${
                avgUptime >= 95 ? 'text-green-600' :
                avgUptime >= 80 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {avgUptime.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Content */}
      <Card>
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Play className="w-4 h-4 text-purple-600" />
            Top Content by View Time
          </h2>
        </div>
        <div className="p-4">
          {topScenes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No content playback data available</p>
              <p className="text-sm mt-1">Content will appear here once it starts playing</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topScenes.map((scene, index) => {
                const maxDuration = topScenes[0]?.total_duration_seconds || 1;
                const percentage = Math.round((scene.total_duration_seconds / maxDuration) * 100);

                return (
                  <div key={scene.scene_id} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-semibold text-blue-700">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900 truncate max-w-[280px]">
                          {scene.scene_name || 'Unnamed Scene'}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {formatHours(scene.total_duration_seconds / 3600)}
                      </span>
                    </div>
                    <div className="ml-8">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Monitor className="w-3 h-3" />
                          {scene.device_count || 0} screens
                        </span>
                        <span className="flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          {scene.play_count || 0} plays
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/**
 * Content Tab - Performance list sorted by total view time (ANA-03)
 */
function ContentTab({ contentList }) {
  // Sort controls
  const [sortField, setSortField] = useState('total_view_time_seconds');
  const [sortDirection, setSortDirection] = useState('desc');

  // Sort content list
  const sortedContent = [...contentList].sort((a, b) => {
    const aVal = a[sortField] || 0;
    const bVal = b[sortField] || 0;
    return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
  });

  // Handle sort click
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort header component
  const SortHeader = ({ field, label }) => (
    <th
      onClick={() => handleSort(field)}
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && (
          <span className="text-blue-600">
            {sortDirection === 'desc' ? '↓' : '↑'}
          </span>
        )}
      </div>
    </th>
  );

  return (
    <Card>
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          Content Performance
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Sorted by total view time. Click column headers to sort.
        </p>
      </div>

      {contentList.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No content performance data available</p>
          <p className="text-sm mt-1">Data will appear once content is played</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Content
                </th>
                <SortHeader field="total_view_time_seconds" label="Total View Time" />
                <SortHeader field="avg_view_duration_seconds" label="Avg Duration" />
                <SortHeader field="completion_rate" label="Completion %" />
                <SortHeader field="total_views" label="Views" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Viewed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedContent.map((content, index) => (
                <tr key={content.content_id || index} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900 truncate max-w-[200px]">
                        {content.content_name || 'Unnamed Content'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="font-medium text-gray-900">
                      {formatDuration(content.total_view_time_seconds || 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDuration(content.avg_view_duration_seconds || 0)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      (content.completion_rate || 0) >= 80
                        ? 'bg-green-100 text-green-700'
                        : (content.completion_rate || 0) >= 50
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {(content.completion_rate || 0).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {(content.total_views || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatRelativeTime(content.last_viewed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/**
 * Patterns Tab - Viewing heatmap (ANA-04)
 */
function PatternsTab({ heatmapData }) {
  const [metric, setMetric] = useState('view_count');

  return (
    <div className="space-y-6">
      {/* Metric Toggle */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">Show:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setMetric('view_count')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              metric === 'view_count'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            View Count
          </button>
          <button
            onClick={() => setMetric('duration')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              metric === 'duration'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Duration
          </button>
        </div>
      </div>

      {/* Heatmap Card */}
      <Card>
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-600" />
            Viewing Patterns
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            When your content is being viewed across the week
          </p>
        </div>
        <div className="p-4">
          {heatmapData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No viewing pattern data available</p>
              <p className="text-sm mt-1">Data will appear once content is played</p>
            </div>
          ) : (
            <ViewingHeatmap
              data={heatmapData}
              metric={metric}
              loading={false}
            />
          )}
        </div>
      </Card>

      {/* Insights */}
      {heatmapData.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium text-gray-900 mb-3">Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InsightCard heatmapData={heatmapData} type="peak" />
            <InsightCard heatmapData={heatmapData} type="quiet" />
          </div>
        </Card>
      )}
    </div>
  );
}

/**
 * Insight Card - Shows peak or quiet hours
 */
function InsightCard({ heatmapData, type }) {
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Find peak or quiet hour
  const sortedData = [...heatmapData].sort((a, b) =>
    type === 'peak'
      ? (b.view_count || 0) - (a.view_count || 0)
      : (a.view_count || 0) - (b.view_count || 0)
  );

  const cell = sortedData[0];
  if (!cell) return null;

  const formatHour = (hour) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  const isPeak = type === 'peak';

  return (
    <div className={`p-4 rounded-lg ${isPeak ? 'bg-blue-50' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-2 mb-2">
        {isPeak ? (
          <ArrowUpRight className="w-4 h-4 text-blue-600" />
        ) : (
          <Clock className="w-4 h-4 text-gray-500" />
        )}
        <span className={`text-sm font-medium ${isPeak ? 'text-blue-700' : 'text-gray-700'}`}>
          {isPeak ? 'Peak Viewing Time' : 'Quietest Period'}
        </span>
      </div>
      <p className="text-lg font-semibold text-gray-900">
        {DAYS[cell.day_of_week]} at {formatHour(cell.hour_of_day)}
      </p>
      <p className="text-sm text-gray-500 mt-1">
        {(cell.view_count || 0).toLocaleString()} views
      </p>
    </div>
  );
}
