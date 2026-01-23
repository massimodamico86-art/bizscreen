/**
 * DeviceDiagnosticsPage.jsx
 * Remote troubleshooting dashboard for TV devices.
 *
 * Features:
 * - Device grid with live screenshots
 * - Status indicators (online, offline, warning)
 * - Request screenshot refresh on demand
 * - Device detail modal with full diagnostics
 * - Filter by status (all, online, offline, warnings)
 *
 * @see deviceScreenshotService.js for API operations
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Monitor,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
  Camera,
  Loader2,
  Clock,
  MapPin,
  Layers,
  Calendar,
  X,
  ZoomIn,
  ExternalLink,
  Image,
  HardDrive,
  CloudOff,
  Database,
} from 'lucide-react';
import PageLayout from '../design-system/components/PageLayout';
import { useLogger } from '../hooks/useLogger.js';
import {
  fetchDevicesWithScreenshots,
  requestDeviceScreenshot,
  requestMultipleScreenshots,
  formatScreenshotAge,
  formatHeartbeatAge,
  getDeviceWarningLevel,
} from '../services/deviceScreenshotService';

// Format cache age helper
function formatCacheAge(timestamp) {
  if (!timestamp) return 'Never';

  const now = new Date();
  const syncTime = new Date(timestamp);
  const diffMs = now - syncTime;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return syncTime.toLocaleDateString();
}

// Status filter options
const STATUS_FILTERS = [
  { value: 'all', label: 'All Devices' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'warnings', label: 'With Warnings' },
];

// Status badge component
function StatusBadge({ isOnline, minutesSinceHeartbeat }) {
  const isStale = minutesSinceHeartbeat > 5;

  if (!isOnline || isStale) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
        <WifiOff size={12} />
        Offline
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
      <Wifi size={12} />
      Online
    </span>
  );
}

// Warning badge component
function WarningBadge({ warningLevel }) {
  if (warningLevel === 'none') return null;

  if (warningLevel === 'critical') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
        <XCircle size={12} />
        Critical
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
      <AlertTriangle size={12} />
      Warning
    </span>
  );
}

// Cache status badge component
function CacheStatusBadge({ cacheStatus, isOfflineMode }) {
  if (!cacheStatus || cacheStatus === 'none') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
        <Database size={12} />
        No Cache
      </span>
    );
  }

  if (cacheStatus === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
        <HardDrive size={12} />
        Cached OK
      </span>
    );
  }

  if (cacheStatus === 'stale') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
        <HardDrive size={12} />
        Stale Cache
      </span>
    );
  }

  if (cacheStatus === 'error') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
        <XCircle size={12} />
        Cache Error
      </span>
    );
  }

  return null;
}

// Offline mode badge component
function OfflineModeBadge({ isOfflineMode }) {
  if (!isOfflineMode) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800 animate-pulse">
      <CloudOff size={12} />
      Offline Mode
    </span>
  );
}

// Device card component
function DeviceCard({ device, onRequestScreenshot, onViewDetails, isRefreshing }) {
  const warningLevel = getDeviceWarningLevel(device);
  const hasScreenshot = !!device.last_screenshot_url;

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border overflow-hidden transition-all hover:shadow-md ${
        warningLevel === 'critical'
          ? 'border-red-300'
          : warningLevel === 'warning'
          ? 'border-yellow-300'
          : 'border-gray-200'
      }`}
    >
      {/* Screenshot preview */}
      <div
        className="relative aspect-video bg-gray-900 cursor-pointer group"
        onClick={() => onViewDetails(device)}
      >
        {hasScreenshot ? (
          <>
            <img
              src={device.last_screenshot_url}
              alt={`Screenshot of ${device.device_name}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <ZoomIn
                size={32}
                className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
            <Image size={48} className="mb-2 opacity-50" />
            <span className="text-sm">No screenshot</span>
          </div>
        )}

        {/* Status overlay */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <StatusBadge
            isOnline={device.is_online}
            minutesSinceHeartbeat={device.minutes_since_heartbeat}
          />
          <WarningBadge warningLevel={warningLevel} />
          <CacheStatusBadge cacheStatus={device.cache_status} />
          <OfflineModeBadge isOfflineMode={device.is_offline_mode} />
        </div>

        {/* Refresh indicator */}
        {device.needs_screenshot_update && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 animate-pulse">
              <Loader2 size={12} className="animate-spin" />
              Pending
            </span>
          </div>
        )}
      </div>

      {/* Device info */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900 truncate">{device.device_name}</h3>
          <button
            onClick={() => onRequestScreenshot(device.device_id)}
            disabled={isRefreshing || device.needs_screenshot_update}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
            title="Request new screenshot"
          >
            {isRefreshing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Camera size={16} />
            )}
          </button>
        </div>

        <div className="space-y-1 text-xs text-gray-500">
          {device.location_name && (
            <div className="flex items-center gap-1">
              <MapPin size={12} />
              <span className="truncate">{device.location_name}</span>
            </div>
          )}

          {device.active_scene_name && (
            <div className="flex items-center gap-1">
              <Layers size={12} />
              <span className="truncate">{device.active_scene_name}</span>
            </div>
          )}

          {device.assigned_schedule_name && (
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              <span className="truncate">{device.assigned_schedule_name}</span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>Heartbeat: {formatHeartbeatAge(device.minutes_since_heartbeat)}</span>
          </div>

          {hasScreenshot && (
            <div className="flex items-center gap-1">
              <Camera size={12} />
              <span>Screenshot: {formatScreenshotAge(device.screenshot_age_minutes)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Device detail modal
function DeviceDetailModal({ device, onClose, onRequestScreenshot, isRefreshing, onForceCacheSync, isSyncing }) {
  const warningLevel = getDeviceWarningLevel(device);

  if (!device) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <Monitor size={24} className="text-gray-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{device.device_name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <StatusBadge
                  isOnline={device.is_online}
                  minutesSinceHeartbeat={device.minutes_since_heartbeat}
                />
                <WarningBadge warningLevel={warningLevel} />
                <CacheStatusBadge cacheStatus={device.cache_status} />
                <OfflineModeBadge isOfflineMode={device.is_offline_mode} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Screenshot */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Live Screenshot</h3>
                <button
                  onClick={() => onRequestScreenshot(device.device_id)}
                  disabled={isRefreshing || device.needs_screenshot_update}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
                >
                  {isRefreshing || device.needs_screenshot_update ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      Refresh Screenshot
                    </>
                  )}
                </button>
              </div>

              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                {device.last_screenshot_url ? (
                  <a
                    href={device.last_screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative group"
                  >
                    <img
                      src={device.last_screenshot_url}
                      alt={`Screenshot of ${device.device_name}`}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ExternalLink
                        size={24}
                        className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </a>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                    <Image size={64} className="mb-3 opacity-50" />
                    <span className="text-sm">No screenshot available</span>
                    <span className="text-xs text-gray-400 mt-1">
                      Click refresh to capture one
                    </span>
                  </div>
                )}
              </div>

              {device.last_screenshot_at && (
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Last captured: {formatScreenshotAge(device.screenshot_age_minutes)}
                </p>
              )}
            </div>

            {/* Device details */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Device Information</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Status</dt>
                    <dd>
                      {device.is_online && device.minutes_since_heartbeat <= 5 ? (
                        <span className="text-green-600 font-medium">Online</span>
                      ) : (
                        <span className="text-red-600 font-medium">Offline</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Last Heartbeat</dt>
                    <dd className="text-gray-900">
                      {formatHeartbeatAge(device.minutes_since_heartbeat)}
                    </dd>
                  </div>
                  {device.location_name && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Location</dt>
                      <dd className="text-gray-900">{device.location_name}</dd>
                    </div>
                  )}
                  {device.screen_group_name && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Screen Group</dt>
                      <dd className="text-gray-900">{device.screen_group_name}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Content Assignment</h3>
                <dl className="space-y-2 text-sm">
                  {device.active_scene_name ? (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Active Scene</dt>
                      <dd className="text-gray-900 flex items-center gap-1">
                        <Layers size={14} />
                        {device.active_scene_name}
                      </dd>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Active Scene</dt>
                      <dd className="text-gray-400 italic">None assigned</dd>
                    </div>
                  )}
                  {device.assigned_schedule_name ? (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Schedule</dt>
                      <dd className="text-gray-900 flex items-center gap-1">
                        <Calendar size={14} />
                        {device.assigned_schedule_name}
                      </dd>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Schedule</dt>
                      <dd className="text-gray-400 italic">None assigned</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Cache Information */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Cache Information</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Cache Status</dt>
                    <dd>
                      <CacheStatusBadge cacheStatus={device.cache_status} />
                    </dd>
                  </div>
                  {device.is_offline_mode && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Offline Mode</dt>
                      <dd>
                        <OfflineModeBadge isOfflineMode={device.is_offline_mode} />
                      </dd>
                    </div>
                  )}
                  {device.cached_scene_id && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Cached Scene</dt>
                      <dd className="text-gray-900 flex items-center gap-1">
                        <HardDrive size={14} />
                        <span className="truncate max-w-[150px]" title={device.cached_scene_id}>
                          {device.cached_scene_id.substring(0, 8)}...
                        </span>
                      </dd>
                    </div>
                  )}
                  {device.last_cache_sync && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Last Sync</dt>
                      <dd className="text-gray-900">
                        {formatCacheAge(device.last_cache_sync)}
                      </dd>
                    </div>
                  )}
                  {device.offline_since && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Offline Since</dt>
                      <dd className="text-red-600">
                        {new Date(device.offline_since).toLocaleString()}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Warnings */}
              {warningLevel !== 'none' && (
                <div
                  className={`p-3 rounded-lg ${
                    warningLevel === 'critical' ? 'bg-red-50' : 'bg-yellow-50'
                  }`}
                >
                  <h3
                    className={`text-sm font-medium mb-1 ${
                      warningLevel === 'critical' ? 'text-red-800' : 'text-yellow-800'
                    }`}
                  >
                    {warningLevel === 'critical' ? 'Critical Issues' : 'Warnings'}
                  </h3>
                  <ul
                    className={`text-sm space-y-1 ${
                      warningLevel === 'critical' ? 'text-red-700' : 'text-yellow-700'
                    }`}
                  >
                    {(!device.is_online || device.minutes_since_heartbeat > 5) && (
                      <li className="flex items-center gap-1">
                        <WifiOff size={14} />
                        Device is offline or unresponsive
                      </li>
                    )}
                    {device.screenshot_age_minutes > 30 && (
                      <li className="flex items-center gap-1">
                        <Clock size={14} />
                        Screenshot is outdated (&gt;30 min)
                      </li>
                    )}
                    {device.needs_screenshot_update && (
                      <li className="flex items-center gap-1">
                        <Loader2 size={14} className="animate-spin" />
                        Screenshot refresh pending
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50">
          <button
            onClick={() => onForceCacheSync?.(device.device_id)}
            disabled={isSyncing || !device.is_online || device.minutes_since_heartbeat > 5}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!device.is_online || device.minutes_since_heartbeat > 5 ? 'Device must be online to sync' : 'Force the device to re-sync its content cache'}
          >
            {isSyncing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Force Re-Sync Content
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Main page component
export default function DeviceDiagnosticsPage({ showToast }) {
  const logger = useLogger('DeviceDiagnosticsPage');
