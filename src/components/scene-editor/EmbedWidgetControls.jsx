/**
 * EmbedWidgetControls
 *
 * Configuration UI for the youtube, vimeo, webpage, and google-slides widget
 * types in both the scene editor and layout editor properties panels.
 * Provides URL input with inline validation, thumbnail preview with IndexedDB
 * pre-caching, and type-specific options (mute/loop, refresh/zoom, auto-advance).
 */

import { useState, useEffect } from 'react';
import { Youtube, Video, Globe, Presentation } from 'lucide-react';
import {
  validateEmbedUrl,
  extractYouTubeId,
  extractVimeoId,
  extractGoogleSlidesId,
  isPublishedSlidesUrl,
  getYouTubeThumbnailUrl,
  getVimeoThumbnailUrl,
} from '../../services/embedUtils.js';
import { cacheMedia } from '../../player/cacheService.js';

/**
 * Pre-fetch a thumbnail image blob and cache it in IndexedDB for offline use.
 * Failures are silent -- thumbnail caching is non-critical.
 *
 * @param {string} widgetType - Widget type for the cache key prefix
 * @param {string} thumbnailUrl - Remote thumbnail URL to fetch and cache
 */
async function cacheThumbnailBlob(widgetType, thumbnailUrl) {
  if (!thumbnailUrl) return;
  try {
    const res = await fetch(thumbnailUrl);
    if (!res.ok) return;
    const blob = await res.blob();
    await cacheMedia(`thumbnail:${widgetType}:${thumbnailUrl}`, blob);
  } catch { /* silent -- thumbnail caching is non-critical */ }
}

/** Icon component lookup by widget type */
const TYPE_ICONS = {
  youtube: Youtube,
  vimeo: Video,
  webpage: Globe,
  'google-slides': Presentation,
};

/** Label for the URL input by widget type */
const TYPE_LABELS = {
  youtube: 'Video URL',
  vimeo: 'Video URL',
  webpage: 'Page URL',
  'google-slides': 'Slides URL',
};

/** Placeholder text by widget type */
const TYPE_PLACEHOLDERS = {
  youtube: 'https://youtube.com/watch?v=...',
  vimeo: 'https://vimeo.com/...',
  webpage: 'https://example.com',
  'google-slides': 'https://docs.google.com/presentation/d/.../pub',
};

/**
 * @param {Object} params - Component props
 * @param {string} params.widgetType - 'youtube' | 'vimeo' | 'webpage' | 'google-slides'
 * @param {Object} params.props - Widget props from the block
 * @param {Function} params.onPropChange - Callback to update a single prop (key, value)
 */
export function EmbedWidgetControls({ widgetType, props, onPropChange }) {
  const [urlError, setUrlError] = useState(null);
  const [urlWarning, setUrlWarning] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);

  const Icon = TYPE_ICONS[widgetType] || Globe;

  // -----------------------------------------------------------------------
  // Thumbnail resolution effect
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setThumbnailPreview(null);

    const url = props.url;
    if (!url) return;

    // YouTube -- synchronous thumbnail resolution
    if (widgetType === 'youtube') {
      const videoId = extractYouTubeId(url);
      if (videoId) {
        const thumbUrl = getYouTubeThumbnailUrl(videoId);
        setThumbnailPreview(thumbUrl);
        onPropChange('thumbnailUrl', thumbUrl);
        cacheThumbnailBlob('youtube', thumbUrl);
      }
    }

    // Vimeo -- async oEmbed thumbnail
    if (widgetType === 'vimeo') {
      const vimeoId = extractVimeoId(url);
      if (vimeoId) {
        getVimeoThumbnailUrl(url).then((thumbUrl) => {
          if (cancelled || !thumbUrl) return;
          setThumbnailPreview(thumbUrl);
          onPropChange('thumbnailUrl', thumbUrl);
          cacheThumbnailBlob('vimeo', thumbUrl);
        });
      }
    }

    // Google Slides -- async thumbnail fetch from /export/png
    if (widgetType === 'google-slides') {
      if (isPublishedSlidesUrl(url)) {
        const presentationId = extractGoogleSlidesId(url);
        if (presentationId) {
          const thumbUrl = `https://docs.google.com/presentation/d/${presentationId}/export/png?pageid=p`;
          fetch(thumbUrl, { method: 'HEAD' })
            .then((res) => {
              if (cancelled) return;
              if (res.ok) {
                setThumbnailPreview(thumbUrl);
                onPropChange('thumbnailUrl', thumbUrl);
                cacheThumbnailBlob('google-slides', thumbUrl);
              }
            })
            .catch(() => {
              // Fetch failed (403/404 common for non-published) -- fallback handled in render
            });
        }
      }
    }

    // Web pages -- no thumbnail extraction (requires server-side proxy)

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.url, widgetType]);

  // -----------------------------------------------------------------------
  // URL validation on blur
  // -----------------------------------------------------------------------
  function handleUrlBlur() {
    if (!props.url) {
      setUrlError(null);
      setUrlWarning(null);
      return;
    }
    const result = validateEmbedUrl(props.url, widgetType);
    setUrlError(result.valid ? null : result.error);
    setUrlWarning(result.warning || null);
  }

  function handleUrlChange(value) {
    onPropChange('url', value);
    setUrlError(null);
    setUrlWarning(null);
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="space-y-3">
      {/* URL Input */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          <Icon className="w-3 h-3 inline mr-1" />
          {TYPE_LABELS[widgetType] || 'URL'}
        </label>
        <input
          type="text"
          className={`w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border ${
            urlError ? 'border-red-500' : 'border-gray-700'
          }`}
          placeholder={TYPE_PLACEHOLDERS[widgetType] || 'https://...'}
          value={props.url || ''}
          onChange={(e) => handleUrlChange(e.target.value)}
          onBlur={handleUrlBlur}
        />
        {urlError && (
          <p className="text-xs text-red-400 mt-0.5">{urlError}</p>
        )}
        {urlWarning && (
          <p className="text-xs text-amber-400 mt-0.5">{urlWarning}</p>
        )}
      </div>

      {/* Inline Thumbnail Preview */}
      {thumbnailPreview && (widgetType === 'youtube' || widgetType === 'vimeo' || widgetType === 'google-slides') && (
        <div>
          <img
            src={thumbnailPreview}
            alt={`${widgetType} preview`}
            className="rounded object-cover"
            style={{ maxHeight: 80 }}
          />
        </div>
      )}

      {/* Google Slides -- published fallback placeholder when no thumbnail */}
      {widgetType === 'google-slides' && props.url && isPublishedSlidesUrl(props.url) && !thumbnailPreview && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Presentation className="w-4 h-4" />
          <span>Published presentation</span>
        </div>
      )}

      {/* Web Page -- generic Globe icon placeholder (no OG image extraction) */}
      {widgetType === 'webpage' && props.url && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Globe className="w-4 h-4" />
          <span>Web page</span>
        </div>
      )}

      {/* ================================================================ */}
      {/* Type-specific options                                            */}
      {/* ================================================================ */}

      {/* YouTube / Vimeo: Mute + Loop toggles */}
      {(widgetType === 'youtube' || widgetType === 'vimeo') && (
        <>
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={props.muted !== false}
              onChange={(e) => onPropChange('muted', e.target.checked)}
              className="rounded border-gray-600 text-blue-500 bg-gray-800"
            />
            Muted
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={props.loop !== false}
              onChange={(e) => onPropChange('loop', e.target.checked)}
              className="rounded border-gray-600 text-blue-500 bg-gray-800"
            />
            Loop
          </label>
        </>
      )}

      {/* Web Page: Auto-refresh + Zoom */}
      {widgetType === 'webpage' && (
        <>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Auto-Refresh</label>
            <select
              className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
              value={props.refreshIntervalMinutes || 0}
              onChange={(e) => onPropChange('refreshIntervalMinutes', parseInt(e.target.value, 10))}
            >
              <option value={0}>None</option>
              <option value={5}>Every 5 minutes</option>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every 60 minutes</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Zoom: {Math.round((props.zoom || 1) * 100)}%
            </label>
            <input
              type="range"
              min={0.25}
              max={1}
              step={0.05}
              value={props.zoom || 1}
              onChange={(e) => onPropChange('zoom', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </>
      )}

      {/* Google Slides: Auto-advance + Loop */}
      {widgetType === 'google-slides' && (
        <>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Auto-Advance Interval</label>
            <select
              className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
              value={props.delayMs || 5000}
              onChange={(e) => onPropChange('delayMs', parseInt(e.target.value, 10))}
            >
              <option value={5000}>5 seconds</option>
              <option value={10000}>10 seconds</option>
              <option value={15000}>15 seconds</option>
              <option value={30000}>30 seconds</option>
              <option value={60000}>60 seconds</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={props.loop !== false}
              onChange={(e) => onPropChange('loop', e.target.checked)}
              className="rounded border-gray-600 text-blue-500 bg-gray-800"
            />
            Loop
          </label>
        </>
      )}
    </div>
  );
}
