// src/player/components/widgets/WebPageWidget.jsx
// Web page iframe widget for screen playback with auto-refresh and zoom.
// Shows cached thumbnail + "Requires Internet" badge when offline.

import { useState, useEffect, useRef } from 'react';
import { getCachedMediaUrl } from '../../cacheService.js';
import { EmbedOfflineFallback } from './EmbedOfflineFallback.jsx';

/**
 * WebPageWidget - Renders a live website via iframe embed.
 *
 * @param {Object} props - Widget props from registry defaultProps
 * @param {string} props.url - Web page URL
 * @param {number} [props.refreshIntervalMinutes=0] - Auto-refresh interval (0 = disabled)
 * @param {number} [props.zoom=1] - Zoom/scale level
 * @param {string} [props.thumbnailUrl] - Thumbnail URL for offline/loading
 */
export function WebPageWidget({ props = {} }) {
  const { url, refreshIntervalMinutes = 0, zoom = 1, thumbnailUrl } = props;

  // Online/offline detection
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cached thumbnail resolution for offline fallback
  const [cachedThumbnailUrl, setCachedThumbnailUrl] = useState(null);

  useEffect(() => {
    if (!thumbnailUrl) return;
    let cancelled = false;
    getCachedMediaUrl(`thumbnail:webpage:${thumbnailUrl}`)
      .then((blobUrl) => {
        if (!cancelled && blobUrl) setCachedThumbnailUrl(blobUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [thumbnailUrl]);

  // Auto-refresh via refreshKey increment
  const [refreshKey, setRefreshKey] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (refreshIntervalMinutes > 0) {
      intervalRef.current = setInterval(() => {
        setRefreshKey((k) => k + 1);
      }, refreshIntervalMinutes * 60 * 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshIntervalMinutes]);

  if (!url) return null;

  const resolvedThumbnail = cachedThumbnailUrl || thumbnailUrl;

  // Offline: show fallback
  if (!isOnline) {
    return <EmbedOfflineFallback thumbnailUrl={resolvedThumbnail} label="Web Page" />;
  }

  // Zoom: scale iframe via transform
  const needsZoom = zoom !== 1 && zoom > 0;
  const iframeStyle = {
    border: 'none',
    ...(needsZoom
      ? {
          width: `${100 / zoom}%`,
          height: `${100 / zoom}%`,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
        }
      : {
          width: '100%',
          height: '100%',
        }),
  };

  // Online: render iframe
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <iframe
        key={refreshKey}
        src={url}
        title="Web Page"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        referrerPolicy="no-referrer"
        style={iframeStyle}
      />
    </div>
  );
}

export default WebPageWidget;
