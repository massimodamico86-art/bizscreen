/**
 * RSS Proxy Edge Function
 *
 * Fetches, parses, and sanitizes external RSS/Atom feeds server-side with:
 * - RSS 2.0 and Atom feed format support via fast-xml-parser
 * - HTML sanitization via sanitize-html (XSS prevention)
 * - Database-backed caching with TTL and conditional GET (ETag/If-Modified-Since)
 * - Image extraction from media:content, enclosure, and inline HTML
 * - JWT auth verification (same pattern as unsplash-proxy)
 *
 * Actions:
 * - "fetch": Fetch and parse an RSS/Atom feed URL, returning sanitized items
 *
 * Satisfies INFRA-02 (server-side proxy, no CORS/key exposure) and
 * RSS-04 (server-side sanitization).
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { XMLParser } from 'npm:fast-xml-parser@5';
import sanitizeHtml from 'npm:sanitize-html@2';
import { corsHeaders } from '../_shared/cors.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_TTL_MINUTES = 15;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_ITEMS = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Sanitize text content -- strip ALL HTML tags, return plain text.
 */
function sanitizeText(html: string | undefined | null): string {
  if (!html) return '';
  return sanitizeHtml(String(html), { allowedTags: [], allowedAttributes: {} }).trim();
}

/**
 * Sanitize rich content -- allow safe inline formatting tags only.
 */
function sanitizeRichContent(html: string | undefined | null): string {
  if (!html) return '';
  return sanitizeHtml(String(html), {
    allowedTags: ['b', 'i', 'em', 'strong', 'br', 'p'],
    allowedAttributes: {},
  }).trim();
}

/**
 * Extract the best available image URL from a feed item.
 *
 * Checks in priority order:
 * 1. media:content or media:thumbnail @_url
 * 2. enclosure with image MIME type @_url
 * 3. First <img src="..."> in description/content:encoded
 * 4. null
 */
// deno-lint-ignore no-explicit-any
function extractImageUrl(item: any, feedBaseUrl: string): string | null {
  // 1. media:content or media:thumbnail
  const mediaContent = item['media:content'] || item['media:group']?.['media:content'];
  if (mediaContent) {
    const url = Array.isArray(mediaContent) ? mediaContent[0]?.['@_url'] : mediaContent['@_url'];
    if (url) return resolveUrl(url, feedBaseUrl);
  }

  const mediaThumbnail = item['media:thumbnail'];
  if (mediaThumbnail) {
    const url = Array.isArray(mediaThumbnail) ? mediaThumbnail[0]?.['@_url'] : mediaThumbnail['@_url'];
    if (url) return resolveUrl(url, feedBaseUrl);
  }

  // 2. enclosure with image MIME type
  const enclosure = item.enclosure;
  if (enclosure) {
    const enclosures = Array.isArray(enclosure) ? enclosure : [enclosure];
    for (const enc of enclosures) {
      const type = enc['@_type'] || '';
      if (type.startsWith('image/') && enc['@_url']) {
        return resolveUrl(enc['@_url'], feedBaseUrl);
      }
    }
  }

  // 3. First <img src="..."> in content
  const content = item['content:encoded'] || item.description || item.content || item.summary || '';
  const imgMatch = String(content).match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch?.[1]) {
    return resolveUrl(imgMatch[1], feedBaseUrl);
  }

  return null;
}

/**
 * Resolve a potentially relative URL against a base URL.
 */
function resolveUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

/**
 * Extract the link URL from an item. Atom uses { @_href } on link element.
 */
// deno-lint-ignore no-explicit-any
function extractLink(item: any): string | null {
  const link = item.link;
  if (!link) return null;

  // Atom: link can be an object with @_href or an array of objects
  if (typeof link === 'object') {
    if (Array.isArray(link)) {
      // Find the 'alternate' link or the first one
      const alt = link.find(
        // deno-lint-ignore no-explicit-any
        (l: any) => l['@_rel'] === 'alternate' || !l['@_rel']
      );
      return alt?.['@_href'] || link[0]?.['@_href'] || null;
    }
    return link['@_href'] || null;
  }

  // RSS 2.0: link is a plain string
  return typeof link === 'string' ? link : null;
}

/**
 * Normalize an RSS 2.0 item into a standard feed item shape.
 */
// deno-lint-ignore no-explicit-any
function normalizeRssItem(item: any, feedBaseUrl: string) {
  // Prefer content:encoded over description for richer content
  const rawContent = item['content:encoded'] || item.description || '';

  return {
    title: sanitizeText(item.title),
    description: sanitizeRichContent(rawContent),
    link: extractLink(item),
    pubDate: item.pubDate || null,
    imageUrl: extractImageUrl(item, feedBaseUrl),
  };
}

/**
 * Normalize an Atom entry into a standard feed item shape.
 */
// deno-lint-ignore no-explicit-any
function normalizeAtomEntry(entry: any, feedBaseUrl: string) {
  // Atom content can be in 'content' (object with #text) or 'summary'
  const contentObj = entry.content;
  const rawContent =
    (typeof contentObj === 'object' ? contentObj['#text'] : contentObj) ||
    entry.summary ||
    '';

  return {
    title: sanitizeText(typeof entry.title === 'object' ? entry.title['#text'] : entry.title),
    description: sanitizeRichContent(rawContent),
    link: extractLink(entry),
    pubDate: entry.published || entry.updated || null,
    imageUrl: extractImageUrl(entry, feedBaseUrl),
  };
}

/**
 * Parse XML and extract feed items, handling both RSS 2.0 and Atom.
 */
function parseFeed(xmlText: string, feedUrl: string) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const parsed = parser.parse(xmlText);

  // RSS 2.0: <rss><channel><item>
  if (parsed?.rss?.channel) {
    const channel = parsed.rss.channel;
    const rawItems = channel.item;
    const items = Array.isArray(rawItems)
      ? rawItems
      : rawItems
        ? [rawItems]
        : [];

    return {
      feedTitle: sanitizeText(channel.title),
      // deno-lint-ignore no-explicit-any
      items: items.slice(0, MAX_ITEMS).map((item: any) => normalizeRssItem(item, feedUrl)),
    };
  }

  // Atom: <feed><entry>
  if (parsed?.feed) {
    const feed = parsed.feed;
    const rawEntries = feed.entry;
    const entries = Array.isArray(rawEntries)
      ? rawEntries
      : rawEntries
        ? [rawEntries]
        : [];

    const feedTitle = typeof feed.title === 'object' ? feed.title['#text'] : feed.title;

    return {
      feedTitle: sanitizeText(feedTitle),
      // deno-lint-ignore no-explicit-any
      items: entries.slice(0, MAX_ITEMS).map((entry: any) => normalizeAtomEntry(entry, feedUrl)),
    };
  }

  throw new Error('Unrecognized feed format: expected RSS 2.0 or Atom');
}

// ---------------------------------------------------------------------------
// Action Handler
// ---------------------------------------------------------------------------

/**
 * Fetch, parse, and cache an RSS/Atom feed.
 *
 * Flow: validate params -> cache check -> fetch feed (with conditional GET) ->
 * parse XML -> sanitize content -> cache write -> return response.
 */
// deno-lint-ignore no-explicit-any
async function handleFetchFeed(
  supabaseAdmin: any,
  params: { feedUrl: string },
): Promise<Response> {
  const { feedUrl } = params;

  // -- Validate parameters ---------------------------------------------------
  if (!feedUrl || typeof feedUrl !== 'string') {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'INVALID_PARAMS',
          message: 'feedUrl is required and must be a non-empty string',
        },
      },
      400,
    );
  }

  if (!feedUrl.startsWith('http://') && !feedUrl.startsWith('https://')) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'INVALID_PARAMS',
          message: 'feedUrl must start with http:// or https://',
        },
      },
      400,
    );
  }

  // -- Cache check -----------------------------------------------------------
  const { data: cached } = await supabaseAdmin
    .from('rss_feed_cache')
    .select('*')
    .eq('feed_url', feedUrl)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (cached) {
    return jsonResponse({
      ok: true,
      data: {
        feedTitle: cached.feed_title,
        items: cached.items,
        itemCount: cached.item_count,
      },
      meta: { cached: true },
    });
  }

  // Load stale cache entry for conditional GET headers (even if expired)
  const { data: staleCache } = await supabaseAdmin
    .from('rss_feed_cache')
    .select('etag, last_modified, feed_title, items, item_count')
    .eq('feed_url', feedUrl)
    .maybeSingle();

  // -- Fetch RSS feed --------------------------------------------------------
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let feedResponse: Response;
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      'User-Agent': 'BizScreen/1.0 RSS Proxy',
    };

    // Conditional GET headers from stale cache
    if (staleCache?.etag) {
      headers['If-None-Match'] = staleCache.etag;
    }
    if (staleCache?.last_modified) {
      headers['If-Modified-Since'] = staleCache.last_modified;
    }

    feedResponse = await fetch(feedUrl, {
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const message = err instanceof Error && err.name === 'AbortError'
      ? `Feed fetch timed out after ${FETCH_TIMEOUT_MS / 1000}s`
      : `Failed to fetch feed: ${err instanceof Error ? err.message : 'Unknown error'}`;
    return jsonResponse(
      { ok: false, error: { code: 'FEED_FETCH_ERROR', message } },
      502,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  // -- Handle 304 Not Modified -----------------------------------------------
  if (feedResponse.status === 304 && staleCache) {
    // Extend the cache TTL since feed hasn't changed
    const newExpiry = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000).toISOString();
    await supabaseAdmin
      .from('rss_feed_cache')
      .update({ expires_at: newExpiry, fetched_at: new Date().toISOString() })
      .eq('feed_url', feedUrl);

    return jsonResponse({
      ok: true,
      data: {
        feedTitle: staleCache.feed_title,
        items: staleCache.items,
        itemCount: staleCache.item_count,
      },
      meta: { cached: true },
    });
  }

  if (!feedResponse.ok) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'FEED_FETCH_ERROR',
          message: `Feed returned HTTP ${feedResponse.status}`,
        },
      },
      502,
    );
  }

  // -- Parse XML -------------------------------------------------------------
  const xmlText = await feedResponse.text();

  let feedData: { feedTitle: string; items: ReturnType<typeof normalizeRssItem>[] };
  try {
    feedData = parseFeed(xmlText, feedUrl);
  } catch (err) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'PARSE_ERROR',
          message: `Failed to parse feed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        },
      },
      422,
    );
  }

  // -- Cache write -----------------------------------------------------------
  const etag = feedResponse.headers.get('etag') || null;
  const lastModified = feedResponse.headers.get('last-modified') || null;
  const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000).toISOString();

  await supabaseAdmin.from('rss_feed_cache').upsert(
    {
      feed_url: feedUrl,
      feed_title: feedData.feedTitle,
      items: feedData.items,
      item_count: feedData.items.length,
      etag,
      last_modified: lastModified,
      fetched_at: new Date().toISOString(),
      expires_at: expiresAt,
    },
    { onConflict: 'feed_url' },
  );

  // -- Return response -------------------------------------------------------
  return jsonResponse({
    ok: true,
    data: {
      feedTitle: feedData.feedTitle,
      items: feedData.items,
      itemCount: feedData.items.length,
    },
    meta: { cached: false },
  });
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // -- Authentication ------------------------------------------------------
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse(
        {
          ok: false,
          error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' },
        },
        401,
      );
    }

    // Create Supabase admin client for cache table operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify user JWT
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse(
        {
          ok: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        },
        401,
      );
    }

    // -- Route action --------------------------------------------------------
    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case 'fetch':
        return await handleFetchFeed(supabaseAdmin, params as { feedUrl: string });
      default:
        return jsonResponse(
          {
            ok: false,
            error: {
              code: 'BAD_REQUEST',
              message: `Unknown action: ${action}. Supported actions: fetch`,
            },
          },
          400,
        );
    }
  } catch (err) {
    console.error('[rss-proxy] Unhandled error:', err);
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
        },
      },
      500,
    );
  }
});
