/**
 * Embed Utilities Service
 *
 * Pure utility module for URL parsing, validation, embed URL construction,
 * and thumbnail URL helpers for YouTube, Vimeo, Web Page, and Google Slides
 * embed widgets.
 *
 * No state, no React -- used by both player widgets and editor panels.
 *
 * @module services/embedUtils
 */

// ============================================================================
// YOUTUBE
// ============================================================================

/**
 * Extract YouTube video ID from various URL formats.
 *
 * Supports:
 * - youtube.com/watch?v=ID
 * - youtu.be/ID
 * - youtube.com/embed/ID
 * - youtube.com/shorts/ID
 * - youtube.com/v/ID
 *
 * @param {string} url - YouTube URL
 * @returns {string|null} 11-char video ID or null
 */
export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;

  // Pattern 1: youtube.com/watch?v=ID
  // Pattern 2: youtu.be/ID
  // Pattern 3: youtube.com/embed/ID
  // Pattern 4: youtube.com/shorts/ID
  // Pattern 5: youtube.com/v/ID
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }

  return null;
}

/**
 * Build YouTube embed URL with player parameters.
 *
 * Always sets autoplay=1, controls=0, modestbranding=1, rel=0, playsinline=1.
 * CRITICAL: When loop=1, also sets playlist={videoId} (YouTube requires this
 * for single-video loop).
 *
 * @param {string} videoId - YouTube video ID
 * @param {Object} [options]
 * @param {boolean} [options.muted=true] - Mute the video
 * @param {boolean} [options.loop=true] - Loop the video
 * @returns {string} Embed URL with query params
 */
export function buildYouTubeEmbedUrl(videoId, { muted = true, loop = true } = {}) {
  const params = new URLSearchParams({
    autoplay: '1',
    controls: '0',
    modestbranding: '1',
    rel: '0',
    playsinline: '1',
    mute: muted ? '1' : '0',
    loop: loop ? '1' : '0',
  });

  // YouTube requires playlist param set to the video ID for single-video loop
  if (loop) {
    params.set('playlist', videoId);
  }

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Get YouTube thumbnail URL (no API key needed).
 * Uses hqdefault (480x360) -- always available, unlike maxresdefault.
 *
 * @param {string} videoId - YouTube video ID
 * @returns {string} Thumbnail URL
 */
export function getYouTubeThumbnailUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// ============================================================================
// VIMEO
// ============================================================================

/**
 * Extract Vimeo video ID from URL.
 *
 * Supports:
 * - vimeo.com/{ID}
 * - player.vimeo.com/video/{ID}
 *
 * @param {string} url - Vimeo URL
 * @returns {string|null} Numeric video ID string or null
 */
export function extractVimeoId(url) {
  if (!url || typeof url !== 'string') return null;

  const patterns = [
    /(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }

  return null;
}

/**
 * Build Vimeo embed URL with player parameters.
 *
 * IMPORTANT: Vimeo uses `muted` param (not `mute` like YouTube).
 *
 * @param {string} videoId - Vimeo video ID
 * @param {Object} [options]
 * @param {boolean} [options.muted=true] - Mute the video
 * @param {boolean} [options.loop=true] - Loop the video
 * @returns {string} Embed URL with query params
 */
export function buildVimeoEmbedUrl(videoId, { muted = true, loop = true } = {}) {
  const params = new URLSearchParams({
    autoplay: '1',
    muted: muted ? '1' : '0',
    loop: loop ? '1' : '0',
    autopause: '0',
  });

  return `https://player.vimeo.com/video/${videoId}?${params.toString()}`;
}

/**
 * Get Vimeo thumbnail URL via oEmbed API (async, no auth needed).
 *
 * @param {string} videoUrl - Original Vimeo video URL
 * @returns {Promise<string|null>} Thumbnail URL or null on error
 */
export async function getVimeoThumbnailUrl(videoUrl) {
  try {
    const response = await fetch(
      `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoUrl)}&width=640`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.thumbnail_url || null;
  } catch {
    return null;
  }
}

// ============================================================================
// GOOGLE SLIDES
// ============================================================================

/**
 * Extract Google Slides presentation ID from URL.
 *
 * Supports:
 * - docs.google.com/presentation/d/{ID}/pub
 * - docs.google.com/presentation/d/{ID}/edit
 * - docs.google.com/presentation/d/{ID}/embed
 *
 * @param {string} url - Google Slides URL
 * @returns {string|null} Presentation ID or null
 */
export function extractGoogleSlidesId(url) {
  if (!url || typeof url !== 'string') return null;

  const match = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Check if a Google Slides URL is a published or embed URL.
 *
 * @param {string} url - Google Slides URL
 * @returns {boolean} True if URL contains /pub or /embed
 */
export function isPublishedSlidesUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /\/presentation\/d\/[^/]+\/(pub|embed)/.test(url);
}

/**
 * Build Google Slides embed URL with auto-advance parameters.
 *
 * @param {string} presentationId - Google Slides presentation ID
 * @param {Object} [options]
 * @param {number} [options.delayMs=5000] - Slide advance delay in ms
 * @param {boolean} [options.loop=true] - Loop the presentation
 * @returns {string} Embed URL with query params
 */
export function buildGoogleSlidesEmbedUrl(presentationId, { delayMs = 5000, loop = true } = {}) {
  const params = new URLSearchParams({
    start: 'true',
    loop: loop ? 'true' : 'false',
    delayms: String(delayMs),
  });

  return `https://docs.google.com/presentation/d/${presentationId}/embed?${params.toString()}`;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate an embed URL for a given widget type.
 *
 * @param {string} url - URL to validate
 * @param {string} type - Widget type: 'youtube' | 'vimeo' | 'google-slides' | 'webpage'
 * @returns {{ valid: boolean, error?: string, warning?: string }}
 */
export function validateEmbedUrl(url, type) {
  // Empty check
  if (!url || !url.trim()) {
    return { valid: false, error: 'URL is required' };
  }

  // URL format check
  try {
    new URL(url);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Type-specific validation
  switch (type) {
    case 'youtube': {
      const id = extractYouTubeId(url);
      if (!id) return { valid: false, error: 'Could not find a YouTube video ID in this URL' };
      return { valid: true };
    }

    case 'vimeo': {
      const id = extractVimeoId(url);
      if (!id) return { valid: false, error: 'Could not find a Vimeo video ID in this URL' };
      return { valid: true };
    }

    case 'google-slides': {
      const id = extractGoogleSlidesId(url);
      if (!id) return { valid: false, error: 'Could not find a Google Slides presentation ID in this URL' };
      if (!isPublishedSlidesUrl(url)) {
        return {
          valid: true,
          warning: 'This looks like a regular Slides link. To display it on screen, publish it first: File > Share > Publish to web.',
        };
      }
      return { valid: true };
    }

    case 'webpage':
      return { valid: true };

    default:
      return { valid: false, error: `Unknown embed type: ${type}` };
  }
}
