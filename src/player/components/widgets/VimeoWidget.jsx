// src/player/components/widgets/VimeoWidget.jsx
// Vimeo video player widget for screen playback via iframe embed.
// Shows cached thumbnail + "Requires Internet" badge when offline.

import { useState, useEffect } from 'react';
import { extractVimeoId, buildVimeoEmbedUrl } from '../../../services/embedUtils.js';
import { getCachedMediaUrl } from '../../cacheService.js';
import { EmbedOfflineFallback } from './EmbedOfflineFallback.jsx';

/**
 * VimeoWidget - Renders a Vimeo video via iframe embed.
 *
 * @param {Object} props - Widget props from registry defaultProps
 * @param {string} props.url - Vimeo video URL
 * @param {boolean} [props.muted=true] - Mute the video
 * @param {boolean} [props.loop=true] - Loop the video
 * @param {string} [props.thumbnailUrl] - Thumbnail URL for offline/loading
 */
export function VimeoWidget({ props = {} }) {
  const { url, muted = true, loop = true, thumbnailUrl } = props;

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
    getCachedMediaUrl(`thumbnail:vimeo:${thumbnailUrl}`)
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

  // Extract video ID
  const videoId = extractVimeoId(url);
  if (!videoId && !url) return null;
  if (!videoId) return null;

  // Build embed URL
  const embedUrl = buildVimeoEmbedUrl(videoId, { muted, loop });
  const resolvedThumbnail = cachedThumbnailUrl || thumbnailUrl;

  // Offline: show fallback
  if (!isOnline) {
    return <EmbedOfflineFallback thumbnailUrl={resolvedThumbnail} label="Vimeo" />;
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
          alt="Vimeo"
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

      {/* Vimeo iframe */}
      <iframe
        src={embedUrl}
        title="Vimeo"
        allow="autoplay; encrypted-media; fullscreen"
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

export default VimeoWidget;
