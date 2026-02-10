/**
 * Unsplash Proxy Service
 *
 * Client-side interface for the unsplash-proxy Edge Function.
 * All Unsplash API calls are proxied server-side to keep the API key secure.
 *
 * Usage:
 *   import { searchPhotos, trackDownload } from '../services/unsplashProxyService.js';
 *   const { photos, pagination } = await searchPhotos('coffee shop', { orientation: 'landscape' });
 *   // When user selects a photo:
 *   trackDownload(photo.id, photo.download_tracking_url);
 *
 * TOS Compliance:
 *   - Display photo.attribution.html near the photo
 *   - Use photo.urls.* directly (hotlink from Unsplash CDN, never re-host)
 *   - Call trackDownload() when user inserts a photo into their design
 */

import { supabase } from '../supabase.js';
import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('UnsplashProxyService');

const FUNCTION_NAME = 'unsplash-proxy';

/**
 * Search Unsplash photos through the server-side proxy.
 *
 * @param {string} query - Search term (e.g., "coffee shop")
 * @param {object} [options] - Search options
 * @param {number} [options.page=1] - Page number (1-based)
 * @param {number} [options.perPage=20] - Results per page (1-30)
 * @param {string} [options.orientation] - Filter: 'landscape', 'portrait', or 'squarish'
 * @returns {Promise<{photos: Array, pagination: {total: number, total_pages: number, page: number, per_page: number}, cached: boolean}>}
 */
export async function searchPhotos(query, options = {}) {
  if (!query || typeof query !== 'string' || query.trim() === '') {
    throw new Error('Search query must be a non-empty string');
  }

  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      action: 'search',
      query: query.trim(),
      page: options.page || 1,
      per_page: options.perPage || 20,
      orientation: options.orientation,
    },
  });

  if (error) {
    logger.error('Unsplash search invoke failed:', error.message);
    throw new Error(`Unsplash search failed: ${error.message}`);
  }

  if (data.ok === false) {
    if (data.error?.code === 'RATE_LIMITED') {
      const retryMinutes = Math.ceil((data.error.retry_after_seconds || 60) / 60);
      logger.warn('Unsplash rate limited, retry after:', data.error.retry_after_seconds, 'seconds');
      throw new Error(`Too many requests. Please try again in ${retryMinutes} minutes.`);
    }

    const errorMessage = data.error?.message || 'Unknown proxy error';
    logger.error('Unsplash proxy error:', errorMessage);
    throw new Error(errorMessage);
  }

  return {
    photos: data.data.photos,
    pagination: data.data.pagination,
    cached: data.meta?.cached || false,
  };
}

/**
 * Track a photo download with Unsplash (TOS requirement).
 *
 * This MUST be called when a user selects/inserts a photo into their design.
 * Unsplash Terms of Service require triggering the download endpoint to
 * credit the photographer. This is fire-and-forget -- it will never throw
 * or block the user's workflow.
 *
 * @param {string} photoId - Unsplash photo ID (for logging)
 * @param {string} downloadTrackingUrl - The download_tracking_url from search results
 */
export function trackDownload(photoId, downloadTrackingUrl) {
  if (!photoId || !downloadTrackingUrl) {
    logger.warn('trackDownload called with missing params:', { photoId, downloadTrackingUrl });
    return;
  }

  supabase.functions
    .invoke(FUNCTION_NAME, {
      body: {
        action: 'track-download',
        download_location: downloadTrackingUrl,
      },
    })
    .then(() => {
      logger.debug('Download tracked for photo:', photoId);
    })
    .catch((err) => {
      logger.warn('Download tracking failed for photo:', photoId, err.message);
    });
}
