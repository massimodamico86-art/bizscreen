// RSS Feed Service - Client service for fetching RSS/Atom feeds via the rss-proxy Edge Function
import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('RssFeedService');

/**
 * Fetch and parse an RSS/Atom feed via the server-side rss-proxy Edge Function.
 *
 * The Edge Function handles:
 * - RSS 2.0 and Atom format parsing
 * - HTML sanitization (XSS prevention)
 * - Database-backed caching with TTL
 * - Conditional GET (ETag/If-Modified-Since)
 *
 * @param {string} feedUrl - The URL of the RSS/Atom feed to fetch
 * @returns {Promise<{feedTitle: string, items: Array, itemCount: number}>} Parsed feed data
 * @throws {Error} If the feed cannot be fetched, parsed, or if auth fails
 */
export async function fetchRssFeed(feedUrl) {
  if (!feedUrl || typeof feedUrl !== 'string') {
    throw new Error('feedUrl is required and must be a non-empty string');
  }

  logger.debug('Fetching RSS feed', { feedUrl });

  const { data, error } = await supabase.functions.invoke('rss-proxy', {
    body: { action: 'fetch', feedUrl },
  });

  if (error) {
    logger.error('Edge Function invocation failed', { error, feedUrl });
    throw new Error(`RSS feed fetch failed: ${error.message || 'Unknown error'}`);
  }

  if (!data?.ok) {
    const errMsg = data?.error?.message || 'Unknown error from rss-proxy';
    logger.error('RSS proxy returned error', { error: data?.error, feedUrl });
    throw new Error(`RSS feed fetch failed: ${errMsg}`);
  }

  logger.debug('RSS feed fetched', {
    feedUrl,
    itemCount: data.data.itemCount,
    cached: data.meta?.cached,
  });

  return data.data;
}

/**
 * Validate an RSS feed URL.
 *
 * Performs client-side validation before sending to the Edge Function.
 * Checks that the URL is non-empty and uses http:// or https:// protocol.
 *
 * @param {string} url - The URL to validate
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
export function validateRssUrl(url) {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return { valid: false, error: 'Feed URL is required' };
  }

  const trimmed = url.trim();

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return { valid: false, error: 'Feed URL must start with http:// or https://' };
  }

  try {
    new URL(trimmed);
  } catch {
    return { valid: false, error: 'Feed URL is not a valid URL' };
  }

  return { valid: true };
}
