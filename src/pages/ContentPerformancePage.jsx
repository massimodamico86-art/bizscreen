/**
 * Content Performance Page
 *
 * Dashboard showing scene performance, device uptime, and content analytics.
 * Features date range filters, top scenes chart, device uptime table, and scene detail modal.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';


import { useLogger } from '../hooks/useLogger.js';


import {
  fetchDashboardAnalytics,
  fetchSceneDetailAnalytics,
  DATE_RANGES,
  formatHours,
  formatRelativeTime,
  getUptimeColor,
  getUptimeBgColor,
} from '../services/contentAnalyticsService';
import { fetchScreenGroups } from '../services/screenGroupService';
import { fetchScenesForTenant } from '../services/sceneService';

export default function ContentPerformancePage({ showToast }) {
  const logger = useLogger('ContentPerformancePage');
  const navigate = useNavigate();

  // Filters
  const [dateRange, setDateRange] = useState('7d');
  const [groupId, setGroupId] = useState(null);
  const [sceneFilter, setSceneFilter] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Data
  const [summary, setSummary] = useState(null);
  const [topScenes, setTopScenes] = useState([]);
  const [deviceUptime, setDeviceUptime] = useState([]);
  const [screenGroups, setScreenGroups] = useState([]);
  const [allScenes, setAllScenes] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Scene detail modal
  const [selectedScene, setSelectedScene] = useState(null);
  const [sceneDetail, setSceneDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Load screen groups and scenes for filters
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const [groups, scenesResult] = await Promise.all([
          fetchScreenGroups(),
          fetchScenesForTenant(null, { page: 1, pageSize: 1000 }), // Load all for filter dropdown
        ]);
        setScreenGroups(groups || []);
        setAllScenes(scenesResult?.data || []);
      } catch (error) {
        logger.error('Failed to load filter options:', error);
      }
    }
    loadFilterOptions();
  }, []);

  // Load analytics data
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const filters = { groupId };
      const data = await fetchDashboardAnalytics(dateRange, filters);

      setSummary(data.summary);
      setTopScenes(data.topScenes);
      setDeviceUptime(data.deviceUptime);
    } catch (error) {
      logger.error('Failed to load analytics:', error);
      showToast?.('Failed to load analytics data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, groupId, showToast]);

  // Load data on filter change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load scene detail when scene is selected
  const handleSceneClick = async (scene) => {
    setSelectedScene(scene);
    setLoadingDetail(true);

    try {
      const detail = await fetchSceneDetailAnalytics(scene.scene_id, dateRange);
      setSceneDetail(detail);
    } catch (error) {
      logger.error('Failed to load scene detail:', error);
      showToast?.('Failed to load scene details', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeSceneDetail = () => {
    setSelectedScene(null);
    setSceneDetail(null);
  };

  // Navigate to scene editor
  const handleViewScene = (sceneId) => {
    navigate(`/scenes/${sceneId}`);
  };

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
            Content Performance
          </span>
        }
        description="Track scene playback, device uptime, and content engagement"
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
              variant={showFilters ? 'secondary' : 'ghost'}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          </div>
        }
      />
      <PageContent>
        <div className="space-y-6">
          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex flex-wrap gap-4 items-end">
                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Range
                  </label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.entries(DATE_RANGES).map(([key, { label }]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Screen Group Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Screen Group
                  </label>
                  <select
                    value={groupId || ''}
                    onChange={(e) => setGroupId(e.target.value || null)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Groups</option>
                    {screenGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Clear Filters */}
                {(groupId || sceneFilter) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setGroupId(null);
                      setSceneFilter(null);
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Quick Date Range Buttons (always visible) */}
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

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Devices</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary?.total_devices || 0}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                {summary?.active_devices || 0} active
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg Uptime</p>
                  <p className={`text-2xl font-bold ${getUptimeColor(summary?.avg_uptime_percent || 0)}`}>
                    {(summary?.avg_uptime_percent || 0).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Play className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Playback Time</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatHours(summary?.total_playback_hours || 0)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                {summary?.active_scenes || 0} scenes played
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Layers className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Live Now</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary?.scenes_live_now || 0}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-500">scenes playing</p>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Scenes Chart/Table */}
            <Card>
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-600" />
                  Top Scenes by Playback
                </h2>
              </div>
              <div className="p-4">
                {topScenes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No scene playback data available</p>
                    <p className="text-sm mt-1">Scenes will appear here once they start playing</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topScenes.slice(0, 8).map((scene, index) => {
                      const maxDuration = topScenes[0]?.total_duration_seconds || 1;
                      const percentage = Math.round((scene.total_duration_seconds / maxDuration) * 100);

                      return (
                        <div
                          key={scene.scene_id}
                          onClick={() => handleSceneClick(scene)}
                          className="cursor-pointer hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-semibold text-blue-700">
                                {index + 1}
                              </span>
                              <span className="font-medium text-gray-900 truncate max-w-[200px]">
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
                                {scene.device_count} devices
                              </span>
                              <span className="flex items-center gap-1">
                                <Play className="w-3 h-3" />
                                {scene.play_count} plays
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

            {/* Device Uptime Table */}
            <Card>
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-green-600" />
                  Device Uptime
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Device
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Group
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Uptime
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Offline
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Last Seen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deviceUptime.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          No device data available
                        </td>
                      </tr>
                    ) : (
                      deviceUptime.slice(0, 10).map((device) => (
                        <tr key={device.device_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Tv className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">
                                {device.device_name || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {device.group_name || '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getUptimeBgColor(device.uptime_percent || 0)} ${getUptimeColor(device.uptime_percent || 0)}`}
                            >
                              {(device.uptime_percent || 0).toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {device.offline_events_count > 0 ? (
                              <span className="flex items-center justify-end gap-1 text-red-600">
                                <WifiOff className="w-3 h-3" />
                                {device.offline_events_count}
                              </span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-500">
                            {formatRelativeTime(device.last_seen)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </PageContent>

      {/* Scene Detail Modal */}
      {selectedScene && (
        <Modal
          isOpen={true}
          onClose={closeSceneDetail}
          title={selectedScene.scene_name || 'Scene Details'}
          size="lg"
        >
          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : sceneDetail ? (
            <div className="space-y-6">
              {/* Scene Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-500">Total Playback</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatHours((sceneDetail.detail?.total_duration_seconds || 0) / 3600)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-500">Devices</p>
                  <p className="text-xl font-bold text-gray-900">
                    {sceneDetail.detail?.device_count || 0}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-500">Groups</p>
                  <p className="text-xl font-bold text-gray-900">
                    {sceneDetail.detail?.group_count || 0}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-500">Play Count</p>
                  <p className="text-xl font-bold text-gray-900">
                    {sceneDetail.detail?.play_count || 0}
                  </p>
                </div>
              </div>

              {/* Timeline Chart Placeholder */}
              {sceneDetail.timeline && sceneDetail.timeline.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Playback Timeline</h4>
                  <div className="h-32 bg-gray-50 rounded-lg p-4">
                    <div className="flex items-end h-full gap-1">
                      {sceneDetail.timeline.slice(-24).map((bucket, i) => {
                        const maxValue = Math.max(...sceneDetail.timeline.map(t => t.total_duration_seconds || 0));
                        const height = maxValue > 0
                          ? Math.max(4, ((bucket.total_duration_seconds || 0) / maxValue) * 100)
                          : 4;
                        return (
                          <div
                            key={i}
                            className="flex-1 bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                            style={{ height: `${height}%` }}
                            title={`${bucket.total_duration_seconds ? Math.round(bucket.total_duration_seconds / 60) : 0} minutes`}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Older</span>
                    <span>Recent</span>
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div className="text-sm text-gray-500">
                {sceneDetail.detail?.last_played_at && (
                  <p>Last played: {formatRelativeTime(sceneDetail.detail.last_played_at)}</p>
                )}
                {sceneDetail.detail?.first_played_at && (
                  <p>First played: {formatRelativeTime(sceneDetail.detail.first_played_at)}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button variant="secondary" onClick={closeSceneDetail}>
                  Close
                </Button>
                <Button onClick={() => handleViewScene(selectedScene.scene_id)}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Scene
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No detail data available
            </div>
          )}
        </Modal>
      )}
    </PageLayout>
  );
}
