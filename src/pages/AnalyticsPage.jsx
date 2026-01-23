/**
 * Analytics Page
 *
 * Dashboard showing screen uptime, playback statistics, and content analytics.
 */

import { useState, useEffect } from 'react';
import {
  BarChart3,
  Monitor,
  Clock,
  Play,
  ListVideo,
  Image,
  RefreshCw,
  TrendingUp,
  Wifi,
  Settings,
  Mail,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { useLogger } from '../hooks/useLogger.js';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  Button,
  Alert,
} from '../design-system';
import {
  getAnalyticsSummary,
  getScreenUptime,
  getPlaybackByScreen,
  getPlaybackByPlaylist,
  getPlaybackByMedia,
  DATE_RANGES,
  formatDuration,
  formatHours,
  getUptimeColor,
} from '../services/analyticsService';
import { fetchLocations } from '../services/locationService';
import { canManageTeam } from '../services/permissionsService';
import {
  getReportSubscriptions,
  updateReportSubscription,
} from '../services/reportSettingsService';

export default function AnalyticsPage({ showToast }) {
  const { t } = useTranslation();
  const logger = useLogger('AnalyticsPage');
  // Filters
  const [dateRange, setDateRange] = useState('7d');
  const [locationId, setLocationId] = useState(null);
  const [locations, setLocations] = useState([]);

  // Data
  const [summary, setSummary] = useState(null);
  const [uptimeData, setUptimeData] = useState([]);
  const [screenPlayback, setScreenPlayback] = useState([]);
  const [playlistPlayback, setPlaylistPlayback] = useState([]);
  const [mediaPlayback, setMediaPlayback] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Report settings
  const [showReportSettings, setShowReportSettings] = useState(false);
  const [reportSettings, setReportSettings] = useState({ weekly: null, monthly: null });
  const [canManageReports, setCanManageReports] = useState(false);

  // Load locations
  useEffect(() => {
    async function loadLocations() {
      try {
        const data = await fetchLocations();
        setLocations(data);
      } catch (error) {
        logger.error('Failed to load locations:', error);
      }
    }
    loadLocations();
  }, []);

  // Check permissions
  useEffect(() => {
    async function checkPermissions() {
      const canManage = await canManageTeam();
      setCanManageReports(canManage);
    }
    checkPermissions();
  }, []);

  // Load analytics data
  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [summaryData, uptime, screens, playlists, media] = await Promise.all([
        getAnalyticsSummary(dateRange, locationId),
        getScreenUptime(dateRange, locationId),
        getPlaybackByScreen(dateRange, locationId),
        getPlaybackByPlaylist(dateRange, locationId),
        getPlaybackByMedia(dateRange, locationId),
      ]);

      setSummary(summaryData);
      setUptimeData(uptime);
      setScreenPlayback(screens);
      setPlaylistPlayback(playlists);
      setMediaPlayback(media);
    } catch (error) {
      logger.error('Failed to load analytics:', error);
      showToast?.('Failed to load analytics data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load data on filter change
  useEffect(() => {
    loadData();
  }, [dateRange, locationId]);

  // Load report settings
  useEffect(() => {
    async function loadReportSettings() {
      try {
        const subs = await getReportSubscriptions();
        const weekly = subs.find(s => s.frequency === 'weekly') || null;
        const monthly = subs.find(s => s.frequency === 'monthly') || null;
        setReportSettings({ weekly, monthly });
      } catch (error) {
        logger.error('Failed to load report settings:', error);
      }
    }
    if (canManageReports) {
      loadReportSettings();
    }
  }, [canManageReports]);

  // Toggle report subscription
  const handleToggleReport = async (frequency, enabled) => {
    try {
      await updateReportSubscription(frequency, { enabled });
      setReportSettings(prev => ({
        ...prev,
        [frequency]: prev[frequency] ? { ...prev[frequency], enabled } : { frequency, enabled },
      }));
      showToast?.(`${frequency.charAt(0).toUpperCase() + frequency.slice(1)} reports ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      logger.error('Failed to update report:', error);
      showToast?.('Failed to update report settings', 'error');
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <PageContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" aria-hidden="true" />
              <p className="text-gray-600">{t('analytics.loading', 'Loading analytics...')}</p>
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
            <BarChart3 className="w-7 h-7 text-blue-600" aria-hidden="true" />
            {t('analytics.title', 'Analytics')}
          </span>
        }
        description={t('analytics.description', 'Track screen performance and content playback')}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => loadData(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              {t('common.refresh', 'Refresh')}
            </Button>

            {canManageReports && (
              <Button
                variant={showReportSettings ? 'secondary' : 'ghost'}
                onClick={() => setShowReportSettings(!showReportSettings)}
              >
                <Mail className="w-4 h-4" aria-hidden="true" />
                {t('analytics.emailReports', 'Email Reports')}
              </Button>
            )}
          </div>
        }
      />
      <PageContent>
        <div className="space-y-6">

      {/* Report Settings Panel */}
      {showReportSettings && canManageReports && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Email Report Settings
          </h3>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-blue-200">
              <input
                type="checkbox"
                checked={reportSettings.weekly?.enabled || false}
                onChange={(e) => handleToggleReport('weekly', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <span className="font-medium text-gray-900">Weekly Report</span>
                <p className="text-sm text-gray-500">Sent every Monday</p>
              </div>
            </label>

            <label className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-blue-200">
              <input
                type="checkbox"
                checked={reportSettings.monthly?.enabled || false}
                onChange={(e) => handleToggleReport('monthly', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <span className="font-medium text-gray-900">Monthly Report</span>
                <p className="text-sm text-gray-500">Sent 1st of each month</p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
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

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              value={locationId || ''}
              onChange={(e) => setLocationId(e.target.value || null)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Monitor className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Screens</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.total_screens || 0}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            {summary?.active_screens || 0} active
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
            {summary?.total_events || 0} events
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <ListVideo className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Content</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.distinct_playlists || 0}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            playlists, {summary?.distinct_media || 0} media
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Screen Uptime Table */}
        <Card>
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-green-600" aria-hidden="true" />
              {t('analytics.uptime.title', 'Screen Uptime')}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('analytics.uptime.screen', 'Screen')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('analytics.uptime.location', 'Location')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('analytics.uptime.uptime', 'Uptime')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {uptimeData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                      {t('analytics.uptime.empty', 'No uptime data available')}
                    </td>
                  </tr>
                ) : (
                  uptimeData.slice(0, 10).map((screen) => (
                    <tr key={screen.screen_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {screen.screen_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {screen.location_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-semibold ${getUptimeColor(
                            screen.uptime_percent || 0
                          )}`}
                        >
                          {(screen.uptime_percent || 0).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Top Screens by Playback */}
        <Card>
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" aria-hidden="true" />
              {t('analytics.playback.title', 'Top Screens by Playback')}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('analytics.playback.screen', 'Screen')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('analytics.playback.playback', 'Playback')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('analytics.playback.events', 'Events')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {screenPlayback.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                      {t('analytics.playback.empty', 'No playback data available')}
                    </td>
                  </tr>
                ) : (
                  screenPlayback.slice(0, 10).map((screen) => (
                    <tr key={screen.screen_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {screen.screen_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {screen.location_name || 'No location'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        {formatDuration(screen.total_playback_seconds)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-500">
                        {screen.total_events}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Top Playlists */}
        <Card>
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ListVideo className="w-4 h-4 text-orange-600" aria-hidden="true" />
              {t('analytics.playlists.title', 'Top Playlists')}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('analytics.playlists.playlist', 'Playlist')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('analytics.playlists.playback', 'Playback')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('analytics.playlists.screens', 'Screens')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {playlistPlayback.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                      {t('analytics.playlists.empty', 'No playlist data available')}
                    </td>
                  </tr>
                ) : (
                  playlistPlayback.slice(0, 10).map((playlist) => (
                    <tr key={playlist.playlist_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ListVideo className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {playlist.playlist_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        {formatDuration(playlist.total_playback_seconds)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-500">
                        {playlist.screens_count}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Top Media */}
        <Card>
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Image className="w-4 h-4 text-blue-600" aria-hidden="true" />
              {t('analytics.media.title', 'Top Media Items')}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('analytics.media.media', 'Media')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('analytics.media.type', 'Type')}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t('analytics.media.playback', 'Playback')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mediaPlayback.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                      {t('analytics.media.empty', 'No media data available')}
                    </td>
                  </tr>
                ) : (
                  mediaPlayback.slice(0, 10).map((media) => (
                    <tr key={media.media_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">
                          {media.media_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          {media.media_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        {formatDuration(media.total_playback_seconds)}
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
    </PageLayout>
  );
}
