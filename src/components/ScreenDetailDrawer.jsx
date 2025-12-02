import { useState, useEffect } from 'react';
import {
  X,
  Monitor,
  Wifi,
  WifiOff,
  Clock,
  Play,
  Layout,
  ListVideo,
  Calendar,
  Target,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Loader2,
  ArrowRight,
  MapPin,
  Users,
  Image
} from 'lucide-react';
import Button from './Button';
import Badge from './Badge';
import {
  getScreenDiagnostics,
  getResolutionPathInfo,
  getOnlineStatusInfo,
  formatLastSeen,
  formatUptime,
  getUptimeColor,
  getPreviewInfo
} from '../services/screenDiagnosticsService';

const ScreenDetailDrawer = ({ screen, onClose, showToast }) => {
  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (screen?.id) {
      loadDiagnostics();
    }
  }, [screen?.id]);

  const loadDiagnostics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getScreenDiagnostics(screen.id);
      setDiagnostics(data);
    } catch (err) {
      console.error('Error loading diagnostics:', err);
      setError(err.message || 'Failed to load diagnostics');
      showToast?.('Error loading screen diagnostics', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!screen) return null;

  const screenInfo = diagnostics?.screen || {};
  const contentSource = diagnostics?.content_source || {};
  const resolvedContent = diagnostics?.resolved_content || {};
  const recentPlayback = diagnostics?.recent_playback || {};

  const statusInfo = getOnlineStatusInfo(screenInfo);
  const pathInfo = getResolutionPathInfo(contentSource.resolution_path);
  const previewInfo = getPreviewInfo(resolvedContent);

  // Icons for resolution paths
  const pathIcons = {
    campaign: <Target size={16} className="text-red-500" />,
    schedule: <Calendar size={16} className="text-teal-500" />,
    layout: <Layout size={16} className="text-purple-500" />,
    playlist: <ListVideo size={16} className="text-orange-500" />,
    none: <AlertCircle size={16} className="text-gray-400" />
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusInfo.bgColor}`}>
              <Monitor size={20} className={statusInfo.color} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {screen.device_name || 'Screen Details'}
              </h2>
              <div className="flex items-center gap-2">
                <Badge
                  variant={screenInfo.is_online ? 'success' : 'default'}
                  className="text-xs"
                >
                  {screenInfo.is_online ? (
                    <><Wifi size={10} className="mr-1" /> Online</>
                  ) : (
                    <><WifiOff size={10} className="mr-1" /> Offline</>
                  )}
                </Badge>
                {screenInfo.player_version && (
                  <span className="text-xs text-gray-500">v{screenInfo.player_version}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadDiagnostics}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh diagnostics"
            >
              <RefreshCw size={18} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
              <p className="text-gray-500 text-sm">Loading diagnostics...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 p-6">
              <AlertCircle className="w-12 h-12 text-red-400" />
              <p className="text-red-600 font-medium">Failed to load diagnostics</p>
              <p className="text-gray-500 text-sm text-center">{error}</p>
              <Button variant="outline" onClick={loadDiagnostics}>
                <RefreshCw size={16} />
                Try Again
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* Section 1: Overview */}
              <div className="p-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Overview
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Location */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                      <MapPin size={12} />
                      Location
                    </div>
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {screenInfo.location_name || 'Unassigned'}
                    </p>
                  </div>
                  {/* Group */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                      <Users size={12} />
                      Group
                    </div>
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {screenInfo.group_name || 'Unassigned'}
                    </p>
                  </div>
                  {/* Last Seen */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                      <Clock size={12} />
                      Last Seen
                    </div>
                    <p className="font-medium text-gray-900 text-sm">
                      {formatLastSeen(screenInfo.last_seen_at)}
                    </p>
                  </div>
                  {/* Timezone */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                      <Clock size={12} />
                      Timezone
                    </div>
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {screenInfo.timezone || 'UTC'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Content Source */}
              <div className="p-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Content Source
                </h3>

                {/* Resolution Path Indicator */}
                <div className={`rounded-lg p-4 ${
                  contentSource.resolution_path === 'none'
                    ? 'bg-gray-100 border border-gray-200'
                    : 'bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      {pathIcons[contentSource.resolution_path] || pathIcons.none}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{pathInfo.label}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{pathInfo.description}</p>
                    </div>
                    {contentSource.resolution_path !== 'none' && (
                      <CheckCircle size={18} className="text-green-500" />
                    )}
                  </div>
                </div>

                {/* Resolution Chain */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Resolution Priority Chain:</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {['campaign', 'schedule', 'layout', 'playlist'].map((step, idx) => {
                      const isActive = contentSource.resolution_path === step;
                      const isPassed = ['campaign', 'schedule', 'layout', 'playlist'].indexOf(contentSource.resolution_path) < idx;
                      return (
                        <div key={step} className="flex items-center gap-2">
                          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${
                            isActive
                              ? 'bg-orange-100 text-orange-800 ring-2 ring-orange-300'
                              : isPassed
                                ? 'bg-gray-100 text-gray-400'
                                : 'bg-gray-50 text-gray-500'
                          }`}>
                            {pathIcons[step]}
                            {step.charAt(0).toUpperCase() + step.slice(1)}
                          </div>
                          {idx < 3 && (
                            <ArrowRight size={12} className="text-gray-300" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Active Source Details */}
                {contentSource.active_campaign && (
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={14} className="text-red-500" />
                      <span className="font-medium text-red-900 text-sm">Active Campaign</span>
                    </div>
                    <p className="text-sm text-gray-900">{contentSource.active_campaign.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Priority: {contentSource.active_campaign.priority} |
                      Ends: {new Date(contentSource.active_campaign.end_date).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {contentSource.active_schedule && (
                  <div className="bg-teal-50 rounded-lg p-3 border border-teal-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar size={14} className="text-teal-500" />
                      <span className="font-medium text-teal-900 text-sm">Active Schedule</span>
                    </div>
                    <p className="text-sm text-gray-900">{contentSource.active_schedule.schedule_name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {contentSource.active_schedule.start_time} - {contentSource.active_schedule.end_time}
                    </p>
                  </div>
                )}

                {contentSource.assigned_layout && (
                  <div className={`rounded-lg p-3 border ${
                    contentSource.resolution_path === 'layout'
                      ? 'bg-purple-50 border-purple-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layout size={14} className="text-purple-500" />
                        <span className="text-sm text-gray-900">
                          {contentSource.assigned_layout.name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {contentSource.assigned_layout.template_type}
                      </span>
                    </div>
                  </div>
                )}

                {contentSource.assigned_playlist && (
                  <div className={`rounded-lg p-3 border ${
                    contentSource.resolution_path === 'playlist'
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <ListVideo size={14} className="text-orange-500" />
                      <span className="text-sm text-gray-900">
                        {contentSource.assigned_playlist.name}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Live Preview */}
              <div className="p-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Current Content
                </h3>

                {previewInfo.type === 'none' ? (
                  <div className="bg-gray-100 rounded-lg p-6 text-center">
                    <AlertCircle size={32} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600 font-medium">No Content Configured</p>
                    <p className="text-gray-500 text-sm mt-1">
                      Assign a layout, playlist, or schedule to this screen
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    {/* Preview Header */}
                    <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {previewInfo.type === 'layout' ? (
                          <Layout size={14} className="text-purple-500" />
                        ) : (
                          <ListVideo size={14} className="text-orange-500" />
                        )}
                        <span className="font-medium text-sm text-gray-900">
                          {previewInfo.name}
                        </span>
                      </div>
                      {previewInfo.itemCount !== undefined && (
                        <span className="text-xs text-gray-500">
                          {previewInfo.itemCount} item{previewInfo.itemCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Preview Thumbnail */}
                    <div className="aspect-video bg-gray-200 relative">
                      {previewInfo.thumbnail ? (
                        <img
                          src={previewInfo.thumbnail}
                          alt={previewInfo.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <Play size={32} className="mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-500 text-sm">Preview not available</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Content Items Preview */}
                    {previewInfo.items && previewInfo.items.length > 0 && (
                      <div className="p-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">Content items:</p>
                        <div className="flex gap-2 overflow-x-auto">
                          {previewInfo.items.slice(0, 5).map((item, idx) => (
                            <div
                              key={idx}
                              className="w-12 h-12 flex-shrink-0 bg-gray-200 rounded overflow-hidden"
                            >
                              {item.thumbnail_url ? (
                                <img
                                  src={item.thumbnail_url}
                                  alt={item.name || `Item ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Image size={16} className="text-gray-400" />
                                </div>
                              )}
                            </div>
                          ))}
                          {previewInfo.items.length > 5 && (
                            <div className="w-12 h-12 flex-shrink-0 bg-gray-300 rounded flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">
                                +{previewInfo.items.length - 5}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 4: Analytics Snippet */}
              <div className="p-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Recent Activity (24h)
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {/* Uptime */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                      <TrendingUp size={12} />
                      Uptime
                    </div>
                    <p className={`text-xl font-bold ${getUptimeColor(recentPlayback.uptime_24h_percent || 0)}`}>
                      {formatUptime(recentPlayback.uptime_24h_percent)}
                    </p>
                  </div>
                  {/* Last Playback */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                      <Play size={12} />
                      Last Playback
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {recentPlayback.last_event_at
                        ? formatLastSeen(recentPlayback.last_event_at)
                        : 'No data'}
                    </p>
                  </div>
                </div>

                {/* Top Items */}
                {recentPlayback.top_items && recentPlayback.top_items.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-2">Top played items:</p>
                    <div className="space-y-2">
                      {recentPlayback.top_items.slice(0, 3).map((item, idx) => (
                        <div key={item.media_id || idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-4">{idx + 1}.</span>
                            <span className="text-sm text-gray-900 truncate max-w-[180px]">
                              {item.media_name}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {item.play_count} play{item.play_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Close
          </Button>
          <Button
            onClick={() => window.open(`/player?screen=${screen.id}`, '_blank')}
            className="flex-1"
          >
            <ExternalLink size={16} />
            Open Player
          </Button>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default ScreenDetailDrawer;
