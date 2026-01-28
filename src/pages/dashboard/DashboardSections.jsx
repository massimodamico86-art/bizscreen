/**
 * DashboardSections.jsx
 * Core dashboard display components: error state, stats grid, screen rows, quick actions.
 *
 * These components are extracted from DashboardPage for modularity and testability.
 * They receive all data via props and do not manage global state.
 */
import { useState } from 'react';
import {
  Image,
  Video,
  FileAudio,
  FileText,
  AlertTriangle,
} from 'lucide-react';

import { Badge, Stack, Card } from '../../design-system';
import { formatLastSeen } from '../../services/dashboardService';

/**
 * Error state displayed when dashboard data fetch fails.
 * Provides user-friendly message and retry option.
 *
 * @param {Object} props
 * @param {string|null} props.error - Error message to display (can be null)
 * @param {() => Promise<void>} props.onRetry - Async function to retry data fetch
 * @param {(key: string, fallback: string) => string} props.t - Translation function
 */
export function DashboardErrorState({ error, onRetry, t }) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    await onRetry();
    setRetrying(false);
  };

  return (
    <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
      <div className="p-6 flex items-start gap-4">
        <div className="p-3 bg-red-100 rounded-xl flex-shrink-0">
          <AlertTriangle className="w-7 h-7 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {t('dashboard.errorTitle', "Couldn't load dashboard")}
          </h2>
          <p className="text-gray-600 mb-4">
            {t('dashboard.errorDescription', "We're having trouble loading your dashboard data. This might be a temporary issue.")}
          </p>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4 font-mono">
              {error}
            </p>
          )}
          <Button
            onClick={handleRetry}
            disabled={retrying}
            icon={retrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            variant="secondary"
          >
            {retrying ? t('common.retrying', 'Retrying...') : t('common.tryAgain', 'Try Again')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/**
 * Stats grid with empty state hint when all stats are zero.
 * Shows clickable stat cards for screens, playlists, media, and apps.
 *
 * @param {Object} props
 * @param {Object|null} props.stats - Dashboard statistics object
 * @param {Object} [props.stats.screens] - Screen counts {total, online, offline}
 * @param {Object} [props.stats.playlists] - Playlist counts {total}
 * @param {Object} [props.stats.media] - Media counts {total, images, videos, apps}
 * @param {(page: string) => void} props.setCurrentPage - Navigation handler
 * @param {(key: string, fallback: string) => string} props.t - Translation function
 * @param {boolean} props.isFirstRun - Whether this is the user's first run
 * @param {Object|null} props.demoResult - Demo workspace creation result
 */
export function StatsGrid({ stats, setCurrentPage, t, isFirstRun, demoResult }) {
  // Calculate if workspace is completely empty (all stats zero)
  const screensTotal = stats?.screens?.total || 0;
  const playlistsTotal = stats?.playlists?.total || 0;
  const mediaTotal = stats?.media?.total || 0;
  const appsTotal = stats?.media?.apps || 0;
  const isAllZero = screensTotal === 0 && playlistsTotal === 0 && mediaTotal === 0 && appsTotal === 0;

  // Don't show the hint if user is in first-run or just created demo
  const showEmptyHint = isAllZero && !isFirstRun && !demoResult;

  // Build media breakdown display
  const mediaBreakdown = [];
  if (stats?.media?.images > 0) {
    mediaBreakdown.push({ icon: Image, count: stats.media.images, label: 'images' });
  }
  if (stats?.media?.videos > 0) {
    mediaBreakdown.push({ icon: Video, count: stats.media.videos, label: 'videos' });
  }
  if (stats?.media?.audio > 0) {
    mediaBreakdown.push({ icon: FileAudio, count: stats.media.audio, label: 'audio' });
  }
  if (stats?.media?.documents > 0) {
    mediaBreakdown.push({ icon: FileText, count: stats.media.documents, label: 'docs' });
  }

  return (
    <Stack gap="sm">
      {showEmptyHint && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 rounded-lg flex-shrink-0">
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-sm text-blue-800">
            {t('dashboard.emptyWorkspaceHint', "Your workspace is empty. Start by uploading media or adding a screen!")}
          </p>
        </div>
      )}
      {/* Responsive grid: 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('dashboard.totalScreens', 'Total Screens')}
          value={screensTotal}
          icon={<Monitor className="w-5 h-5" />}
          description={
            <span className="flex items-center gap-3">
              <span className="text-green-600 flex items-center gap-1">
                <Wifi className="w-3 h-3" /> {stats?.screens?.online || 0}
              </span>
              <span className="text-gray-400 flex items-center gap-1">
                <WifiOff className="w-3 h-3" /> {stats?.screens?.offline || 0}
              </span>
            </span>
          }
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setCurrentPage('screens')}
        />

        <StatCard
          title={t('dashboard.playlists', 'Playlists')}
          value={playlistsTotal}
          icon={<ListVideo className="w-5 h-5" />}
          description={t('dashboard.contentPlaylists', 'Content playlists')}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setCurrentPage('playlists')}
        />

        <StatCard
          title={t('dashboard.mediaAssets', 'Media Assets')}
          value={mediaTotal}
          icon={<Image className="w-5 h-5" />}
          description={
            <span className="flex items-center gap-2 flex-wrap">
              {mediaBreakdown.slice(0, 3).map(({ icon: Icon, count, label }) => (
                <span key={label} className="flex items-center gap-1" title={`${count} ${label}`}>
                  <Icon className="w-3 h-3" /> {count}
                </span>
              ))}
              {mediaBreakdown.length > 3 && (
                <span className="text-gray-400">+{mediaBreakdown.length - 3}</span>
              )}
              {mediaTotal === 0 && (
                <span className="text-gray-400">{t('dashboard.noMedia', 'No media yet')}</span>
              )}
            </span>
          }
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setCurrentPage('media-all')}
        />

        <StatCard
          title={t('dashboard.apps', 'Apps')}
          value={appsTotal}
          icon={<Grid3X3 className="w-5 h-5" />}
          description={t('dashboard.widgetsAndContent', 'Widgets & dynamic content')}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setCurrentPage('apps')}
        />
      </div>
    </Stack>
  );
}

/**
 * Single screen row in the Screens Overview section.
 * Displays screen name, online status, assigned content, and last seen time.
 *
 * @param {Object} props
 * @param {Object|null} props.screen - Screen data object
 * @param {string} [props.screen.id] - Screen ID
 * @param {string} [props.screen.device_name] - Device name
 * @param {boolean} [props.screen.isOnline] - Online status
 * @param {string} [props.screen.last_seen] - Last seen timestamp
 * @param {Object} [props.screen.assigned_playlist] - Assigned playlist {name}
 * @param {Object} [props.screen.assigned_layout] - Assigned layout {name}
 * @param {(key: string, fallback: string) => string} props.t - Translation function
 * @returns {JSX.Element|null} Screen row or null if screen is missing
 */
export function ScreenRow({ screen, t }) {
  // Defensive: guard against missing screen data
  if (!screen) return null;

  const deviceName = screen.device_name || t('screens.unnamedScreen', 'Unnamed Screen');
  const isOnline = Boolean(screen.isOnline);
  const contentName = screen.assigned_playlist?.name || screen.assigned_layout?.name || null;

  // Get both relative and exact time for tooltip
  const lastSeenData = formatLastSeen(screen.last_seen, true);
  const lastSeenRelative = typeof lastSeenData === 'object' ? lastSeenData.relative : lastSeenData;
  const lastSeenExact = typeof lastSeenData === 'object' ? lastSeenData.exact : null;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
        <div className="min-w-0">
          {/* Device name with tooltip for long names */}
          <p
            className="font-medium text-gray-900 truncate cursor-default"
            title={deviceName}
          >
            {deviceName}
          </p>
          <p
            className="text-xs text-gray-500 truncate cursor-default"
            title={contentName || undefined}
          >
            {contentName || t('screens.noContentAssigned', 'No content assigned')}
          </p>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-3">
        <Badge variant={isOnline ? 'success' : 'default'} size="sm">
          {isOnline ? t('screens.online', 'Online') : t('screens.offline', 'Offline')}
        </Badge>
        {/* Last seen with exact time tooltip */}
        <p
          className="text-xs text-gray-400 mt-1 flex items-center justify-end gap-1 cursor-default"
          title={lastSeenExact ? `Last seen: ${lastSeenExact}` : undefined}
        >
          <Clock className="w-2.5 h-2.5" />
          {lastSeenRelative}
        </p>
      </div>
    </div>
  );
}

/**
 * Quick action button for the Quick Actions section.
 * Displays an icon, title, description, and navigates on click.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon element to display
 * @param {string} props.iconBg - Tailwind background class for icon container
 * @param {string} props.title - Button title
 * @param {string} props.description - Button description
 * @param {() => void} props.onClick - Click handler
 */
export function QuickActionButton({ icon, iconBg, title, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all text-left group"
    >
      <div className={`p-2 ${iconBg} rounded-lg flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
    </button>
  );
}

/**
 * Recent Activity widget showing recent playlists and media uploads
 *
 * @param {Object} props
 * @param {Array} props.activities - Recent activity items
 * @param {(page: string) => void} props.setCurrentPage - Navigation handler
 * @param {(key: string, fallback: string) => string} props.t - Translation function
 * @param {boolean} props.loading - Whether data is loading
 */
export function RecentActivityWidget({ activities = [], setCurrentPage, t, loading }) {
  const getActivityIcon = (activity) => {
    if (activity.type === 'playlist') {
      return <ListVideo className="w-4 h-4 text-purple-600" />;
    }
    if (activity.mediaType === 'video') {
      return <Video className="w-4 h-4 text-blue-600" />;
    }
    if (activity.mediaType === 'audio') {
      return <FileAudio className="w-4 h-4 text-green-600" />;
    }
    return <Image className="w-4 h-4 text-orange-600" />;
  };

  const getActivityAction = (activity) => {
    switch (activity.action) {
      case 'created': return <PlusCircle className="w-3 h-3" />;
      case 'updated': return <Edit className="w-3 h-3" />;
      case 'uploaded': return <Upload className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">{t('dashboard.recentActivity', 'Recent Activity')}</h3>
          </div>
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </div>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">{t('dashboard.recentActivity', 'Recent Activity')}</h3>
          </div>
          <p className="text-sm text-gray-500 text-center py-4">
            {t('dashboard.noRecentActivity', 'No recent activity')}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">{t('dashboard.recentActivity', 'Recent Activity')}</h3>
          </div>
        </div>
        <Stack gap="sm">
          {activities.map((activity) => (
            <button
              key={`${activity.type}-${activity.id}`}
              onClick={() => setCurrentPage(activity.type === 'playlist' ? 'playlists' : 'media-all')}
              className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors text-left w-full"
            >
              <div className="p-1.5 bg-gray-100 rounded-lg flex-shrink-0">
                {getActivityIcon(activity)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate" title={activity.name}>
                  {activity.name}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  {getActivityAction(activity)}
                  <span className="capitalize">{activity.action}</span>
                  <span className="text-gray-300">·</span>
                  {formatLastSeen(activity.timestamp)}
                </p>
              </div>
              {activity.thumbnail && (
                <img
                  src={activity.thumbnail}
                  alt=""
                  className="w-8 h-8 object-cover rounded flex-shrink-0"
                />
              )}
            </button>
          ))}
        </Stack>
      </div>
    </Card>
  );
}

/**
 * Alerts Widget showing device health issues
 *
 * @param {Object} props
 * @param {Object} props.alertSummary - Alert summary from getAlertSummary()
 * @param {(page: string) => void} props.setCurrentPage - Navigation handler
 * @param {(key: string, fallback: string) => string} props.t - Translation function
 * @param {boolean} props.loading - Whether data is loading
 */
export function AlertsWidget({ alertSummary, setCurrentPage, t, loading }) {
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-amber-600" />;
      default: return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getSeverityBg = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100';
      case 'warning': return 'bg-amber-100';
      default: return 'bg-blue-100';
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">{t('dashboard.alerts', 'Alerts')}</h3>
          </div>
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </div>
      </Card>
    );
  }

  const hasAlerts = alertSummary && alertSummary.total > 0;

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">{t('dashboard.alerts', 'Alerts')}</h3>
            {hasAlerts && (
              <Badge variant={alertSummary.critical > 0 ? 'error' : 'warning'} size="sm">
                {alertSummary.total}
              </Badge>
            )}
          </div>
          {hasAlerts && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage('screens')}
            >
              {t('common.viewAll', 'View All')}
            </Button>
          )}
        </div>

        {!hasAlerts ? (
          <div className="text-center py-4">
            <div className="w-10 h-10 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
              <Wifi className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-600">{t('dashboard.allScreensHealthy', 'All screens are healthy')}</p>
          </div>
        ) : (
          <Stack gap="sm">
            {/* Summary badges */}
            <div className="flex gap-2 flex-wrap pb-2 border-b border-gray-100">
              {alertSummary.critical > 0 && (
                <Badge variant="error" size="sm">
                  {alertSummary.critical} {t('dashboard.critical', 'critical')}
                </Badge>
              )}
              {alertSummary.warning > 0 && (
                <Badge variant="warning" size="sm">
                  {alertSummary.warning} {t('dashboard.warnings', 'warnings')}
                </Badge>
              )}
              {alertSummary.info > 0 && (
                <Badge variant="info" size="sm">
                  {alertSummary.info} {t('dashboard.info', 'info')}
                </Badge>
              )}
            </div>

            {/* Top issues */}
            {alertSummary.topIssues?.map((issue, index) => (
              <button
                key={issue.deviceId || index}
                onClick={() => setCurrentPage('screens')}
                className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors text-left w-full"
              >
                <div className={`p-1.5 ${getSeverityBg(issue.severity)} rounded-lg flex-shrink-0`}>
                  {getSeverityIcon(issue.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate" title={issue.deviceName}>
                    {issue.deviceName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {issue.message}
                  </p>
                </div>
              </button>
            ))}
          </Stack>
        )}
      </div>
    </Card>
  );
}
