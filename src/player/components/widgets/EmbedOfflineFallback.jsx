// src/player/components/widgets/EmbedOfflineFallback.jsx
// Shared offline fallback component for embed widgets (YouTube, Vimeo, Web Page, Google Slides).
// Shows cached thumbnail with "Requires Internet" badge when the device is offline.

import { WifiOff } from 'lucide-react';

/**
 * EmbedOfflineFallback - Renders a thumbnail + "Requires Internet" badge
 * when the device is offline. Used by all 4 embed widget types.
 *
 * @param {Object} props
 * @param {string} [props.thumbnailUrl] - Remote or cached blob URL for thumbnail
 * @param {string} [props.label] - Widget label (e.g. "YouTube", "Vimeo")
 */
export function EmbedOfflineFallback({ thumbnailUrl, label }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#0f172a',
        overflow: 'hidden',
      }}
    >
      {/* Thumbnail image (dimmed) */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={label || 'Offline'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.6,
            display: 'block',
          }}
        />
      ) : (
        /* No thumbnail: show label text centered */
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 'clamp(0.75rem, 2vw, 1.25rem)',
          }}
        >
          {label || 'Content'}
        </div>
      )}

      {/* Bottom-right "Requires Internet" badge */}
      <div
        style={{
          position: 'absolute',
          bottom: '0.5rem',
          right: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '0.25rem',
          padding: '0.25rem 0.5rem',
          color: '#94a3b8',
          fontSize: '0.625rem',
          fontFamily: 'system-ui, sans-serif',
          lineHeight: 1,
        }}
      >
        <WifiOff size={12} />
        <span>Requires Internet</span>
      </div>
    </div>
  );
}

export default EmbedOfflineFallback;
