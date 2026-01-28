/**
 * Storage Usage Bar (US-158)
 *
 * Compact horizontal bar showing storage usage with breakdown by type.
 * Displays: used / total with colored segments for each media type.
 */

import { useState, useEffect } from 'react';
import { Image, Video, Music, FileText } from 'lucide-react';
import { getStorageUsage, formatBytes } from '../../services/mediaService';

// Default storage limit (5GB) - could be made configurable per plan
const DEFAULT_STORAGE_LIMIT = 5 * 1024 * 1024 * 1024;

export function StorageUsageBar({
  storageLimit = DEFAULT_STORAGE_LIMIT,
  onRefresh,
  className = '',
}) {
  const [usage, setUsage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadUsage = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await getStorageUsage();
      setUsage(data);
    } catch (err) {
      logger.error('Failed to load storage usage', { error: err });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsage();
  }, []);

  const handleRefresh = () => {
    loadUsage(true);
    onRefresh?.();
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}>
        <Loader2 size={14} className="animate-spin" />
        <span>Loading storage...</span>
      </div>
    );
  }

  if (!usage) {
    return null;
  }

  const totalBytes = usage.total_bytes || 0;
  const usedPercent = Math.min((totalBytes / storageLimit) * 100, 100);
  const isNearLimit = usedPercent >= 80;
  const isAtLimit = usedPercent >= 95;

  // Calculate segment widths as percentages of total used
  const segments = [
    { key: 'image', bytes: usage.image_bytes, color: 'bg-blue-500', icon: Image },
    { key: 'video', bytes: usage.video_bytes, color: 'bg-purple-500', icon: Video },
    { key: 'audio', bytes: usage.audio_bytes, color: 'bg-green-500', icon: Music },
    { key: 'document', bytes: usage.document_bytes, color: 'bg-amber-500', icon: FileText },
  ].filter(s => s.bytes > 0);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon */}
      <HardDrive size={16} className="text-gray-400 flex-shrink-0" />

      {/* Usage bar and text */}
      <div className="flex-1 min-w-0">
        {/* Bar container */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full flex transition-all duration-300"
            style={{ width: `${usedPercent}%` }}
          >
            {segments.map((segment, idx) => {
              const segmentPercent = totalBytes > 0 ? (segment.bytes / totalBytes) * 100 : 0;
              return (
                <div
                  key={segment.key}
                  className={`h-full ${segment.color} ${idx === 0 ? 'rounded-l-full' : ''} ${idx === segments.length - 1 ? 'rounded-r-full' : ''}`}
                  style={{ width: `${segmentPercent}%` }}
                  title={`${segment.key}: ${formatBytes(segment.bytes)}`}
                />
              );
            })}
          </div>
        </div>

        {/* Text */}
        <div className="flex items-center justify-between mt-1">
          <span className={`text-xs ${isAtLimit ? 'text-red-600 font-medium' : isNearLimit ? 'text-amber-600' : 'text-gray-500'}`}>
            {formatBytes(totalBytes)} / {formatBytes(storageLimit)}
          </span>
          <span className="text-xs text-gray-400">
            {usage.total_count} {usage.total_count === 1 ? 'file' : 'files'}
          </span>
        </div>
      </div>

      {/* Refresh button */}
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors disabled:opacity-50"
        title="Refresh storage usage"
      >
        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
      </button>
    </div>
  );
}

/**
 * Compact inline version for header use
 */
export function StorageUsageInline({
  storageLimit = DEFAULT_STORAGE_LIMIT,
  className = '',
}) {
  const [usage, setUsage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUsage = async () => {
      try {
        const data = await getStorageUsage();
        setUsage(data);
      } catch (err) {
        logger.error('Failed to load storage usage', { error: err });
      } finally {
        setIsLoading(false);
      }
    };
    loadUsage();
  }, []);

  if (isLoading || !usage) {
    return null;
  }

  const totalBytes = usage.total_bytes || 0;
  const usedPercent = Math.min((totalBytes / storageLimit) * 100, 100);
  const isNearLimit = usedPercent >= 80;
  const isAtLimit = usedPercent >= 95;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <HardDrive size={14} className="text-gray-400" />
      <div className="flex items-center gap-1.5">
        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-blue-500'
            }`}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        <span className={`text-xs ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-gray-500'}`}>
          {formatBytes(totalBytes)}
        </span>
      </div>
    </div>
  );
}

/**
 * Detailed breakdown popover content
 */
export function StorageBreakdown({ usage, storageLimit = DEFAULT_STORAGE_LIMIT }) {
  if (!usage) return null;

  const types = [
    { label: 'Images', bytes: usage.image_bytes, count: usage.image_count, icon: Image, color: 'text-blue-500' },
    { label: 'Videos', bytes: usage.video_bytes, count: usage.video_count, icon: Video, color: 'text-purple-500' },
    { label: 'Audio', bytes: usage.audio_bytes, count: usage.audio_count, icon: Music, color: 'text-green-500' },
    { label: 'Documents', bytes: usage.document_bytes, count: usage.document_count, icon: FileText, color: 'text-amber-500' },
  ];

  const totalBytes = usage.total_bytes || 0;
  const usedPercent = ((totalBytes / storageLimit) * 100).toFixed(1);

  return (
    <div className="p-4 space-y-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-900">
          {formatBytes(totalBytes)}
        </div>
        <div className="text-sm text-gray-500">
          of {formatBytes(storageLimit)} ({usedPercent}% used)
        </div>
      </div>

      <div className="space-y-2">
        {types.map(type => {
          const Icon = type.icon;
          const typePercent = totalBytes > 0 ? ((type.bytes / totalBytes) * 100).toFixed(1) : 0;
          return (
            <div key={type.label} className="flex items-center gap-3">
              <Icon size={16} className={type.color} />
              <div className="flex-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">{type.label}</span>
                  <span className="text-gray-500">{formatBytes(type.bytes)}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {type.count} {type.count === 1 ? 'file' : 'files'} ({typePercent}%)
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StorageUsageBar;
