// src/player/components/widgets/GoogleSlidesWidget.jsx
// Google Slides embed widget for screen playback with auto-advance.
// Shows cached thumbnail + "Requires Internet" badge when offline.

import { useState, useEffect } from 'react';
import {
  extractGoogleSlidesId,
  buildGoogleSlidesEmbedUrl,
} from '../../../services/embedUtils.js';
import { getCachedMediaUrl } from '../../cacheService.js';
import { EmbedOfflineFallback } from './EmbedOfflineFallback.jsx';

/**
 * GoogleSlidesWidget - Renders a Google Slides presentation via iframe embed.
 *
 * @param {Object} props - Widget props from registry defaultProps
 * @param {string} props.url - Google Slides URL (published or edit)
 * @param {number} [props.delayMs=5000] - Slide advance delay in ms
 * @param {boolean} [props.loop=true] - Loop the presentation
 * @param {string} [props.thumbnailUrl] - Thumbnail URL for offline/loading
 */
export function GoogleSlidesWidget({ props = {} }) {
  const { url, delayMs = 5000, loop = true, thumbnailUrl } = props;

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
    getCachedMediaUrl(`thumbnail:google-slides:${thumbnailUrl}`)
      .then((blobUrl) => {
        if (!cancelled && blobUrl) setCachedThumbnailUrl(blobUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [thumbnailUrl]);

  // Iframe loaded state for crossfade
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Extract presentation ID
  const presentationId = extractGoogleSlidesId(url);
  if (!presentationId) return null;

  // Build embed URL
  const slidesEmbedUrl = buildGoogleSlidesEmbedUrl(presentationId, { delayMs, loop });
  const resolvedThumbnail = cachedThumbnailUrl || thumbnailUrl;

  // Offline: show fallback
  if (!isOnline) {
    return <EmbedOfflineFallback thumbnailUrl={resolvedThumbnail} label="Google Slides" />;
  }

  // Online: render iframe with thumbnail placeholder
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#000',
        overflow: 'hidden',
      }}
    >
      {/* Thumbnail placeholder while iframe loads */}
      {!iframeLoaded && resolvedThumbnail && (
        <img
          src={resolvedThumbnail}
          alt="Google Slides"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1,
          }}
        />
      )}

      {/* Google Slides iframe */}
      <iframe
        src={slidesEmbedUrl}
        title="Google Slides"
        allow="autoplay; fullscreen"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={() => setIframeLoaded(true)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          opacity: iframeLoaded ? 1 : 0,
          transition: 'opacity 300ms ease',
          zIndex: 2,
        }}
      />
    </div>
  );
}

export default GoogleSlidesWidget;
