/**
 * Unsplash Proxy Edge Function
 *
 * Proxies search requests to the Unsplash API with:
 * - TOS-compliant response shaping (attribution with UTM, hotlinked CDN URLs, download tracking)
 * - 24-hour database-backed caching to respect Unsplash rate limits
 * - Per-tenant hourly rate limiting via atomic SQL function
 * - Secure API key management (key never reaches the browser)
 *
 * Actions:
 * - "search": Search Unsplash photos with caching and rate limiting
 * - "track-download": Report photo usage to Unsplash per TOS requirements
 *
 * This is BizScreen's first Edge Function, establishing the infrastructure pattern
 * for directory structure, CORS handling, and secrets management.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UNSPLASH_BASE = 'https://api.unsplash.com';
const CACHE_TTL_HOURS = 24;
const RATE_LIMIT_PER_HOUR = 100;
const APP_NAME = 'bizscreen';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchParams {
  query: string;
  page?: number;
  per_page?: number;
  orientation?: 'landscape' | 'portrait' | 'squarish';
}

interface RateLimitResult {
  allowed: boolean;
  current_count: number;
  max_allowed: number;
  retry_after_seconds: number;
}

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
 * Build a deterministic cache key from normalized search parameters.
 * Lowercase, trim, and collapse whitespace so "Coffee  Shop" and "coffee shop"
 * resolve to the same cache entry.
 */
function buildCacheKey(params: {
  query: string;
  page: number;
  per_page: number;
  orientation: string | null;
}): string {
  return JSON.stringify({
    query: params.query.toLowerCase().trim().replace(/\s+/g, ' '),
    page: params.page,
    per_page: params.per_page,
    orientation: params.orientation || null,
  });
}

/**
 * Shape a raw Unsplash photo object into a TOS-compliant response.
 * Includes attribution with UTM parameters, hotlinked CDN URLs,
 * and the download tracking URL.
 */
// deno-lint-ignore no-explicit-any
function shapePhoto(photo: any) {
  const profileUrl = `https://unsplash.com/@${photo.user.username}?utm_source=${APP_NAME}&utm_medium=referral`;
  const unsplashUrl = `https://unsplash.com/?utm_source=${APP_NAME}&utm_medium=referral`;
  const photoUrl = `https://unsplash.com/photos/${photo.id}?utm_source=${APP_NAME}&utm_medium=referral`;

  return {
    id: photo.id,
    description: photo.description || photo.alt_description,
    color: photo.color,
    width: photo.width,
    height: photo.height,
    urls: {
      thumb: photo.urls.thumb,
      small: photo.urls.small,
      regular: photo.urls.regular,
      full: photo.urls.full,
      raw: photo.urls.raw,
    },
    attribution: {
      photographer: {
        name: photo.user.name,
        username: photo.user.username,
        profile_url: profileUrl,
      },
      unsplash_url: unsplashUrl,
      photo_url: photoUrl,
      html: `Photo by <a href="${profileUrl}">${photo.user.name}</a> on <a href="${unsplashUrl}">Unsplash</a>`,
    },
    download_tracking_url: photo.links.download_location,
  };
}

// ---------------------------------------------------------------------------
// Action Handlers
// ---------------------------------------------------------------------------

/**
 * Handle a photo search request.
 *
 * Flow: validate params -> check rate limit -> check cache -> call Unsplash API
 * -> shape results -> write cache -> return response.
 */
// deno-lint-ignore no-explicit-any
async function handleSearch(
  supabaseAdmin: any,
  tenantId: string,
  params: SearchParams,
): Promise<Response> {
  // -- Validate parameters ---------------------------------------------------
  const { query, orientation } = params;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'INVALID_PARAMS',
          message: 'query is required and must be a non-empty string',
        },
      },
      400,
    );
  }

  const page = Math.max(1, Math.floor(params.page || 1));
  const per_page = Math.max(1, Math.min(30, Math.floor(params.per_page || 20)));

  if (
    orientation &&
    !['landscape', 'portrait', 'squarish'].includes(orientation)
  ) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'INVALID_PARAMS',
          message:
            'orientation must be one of: landscape, portrait, squarish',
        },
      },
      400,
    );
  }

  // -- Rate limit check ------------------------------------------------------
  const { data: rlData, error: rlError } = await supabaseAdmin.rpc(
    'check_unsplash_rate_limit',
    { p_tenant_id: tenantId, p_max_requests: RATE_LIMIT_PER_HOUR },
  );

  if (rlError) {
    console.error('[unsplash-proxy] Rate limit check failed:', rlError.message);
    // Do not block the request if rate limiting infrastructure fails
  } else if (rlData && rlData.length > 0) {
    const rl: RateLimitResult = rlData[0];
    if (!rl.allowed) {
      return jsonResponse(
        {
          ok: false,
          error: {
            code: 'RATE_LIMITED',
            message: `Too many requests. You have made ${rl.current_count} of ${rl.max_allowed} allowed requests this hour. Please try again later.`,
            retry_after_seconds: rl.retry_after_seconds,
          },
        },
        429,
      );
    }
  }

  // -- Cache check -----------------------------------------------------------
  const cacheKey = buildCacheKey({
    query,
    page,
    per_page,
    orientation: orientation || null,
  });

  const { data: cached } = await supabaseAdmin
    .from('unsplash_search_cache')
    .select('*')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (cached) {
    const cacheAgeSeconds = Math.floor(
      (Date.now() - new Date(cached.cached_at).getTime()) / 1000,
    );
    return jsonResponse({
      ok: true,
      data: {
        photos: cached.results,
        pagination: {
          total: cached.total_results,
          total_pages: cached.total_pages,
          page: cached.page,
          per_page: cached.per_page,
        },
      },
      meta: {
        cached: true,
        cache_age_seconds: cacheAgeSeconds,
      },
    });
  }

  // -- Unsplash API call -----------------------------------------------------
  const accessKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
  if (!accessKey) {
    console.error('[unsplash-proxy] UNSPLASH_ACCESS_KEY is not set');
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'CONFIG_ERROR',
          message: 'Unsplash integration is not configured',
        },
      },
      503,
    );
  }

  const searchUrl = new URL(`${UNSPLASH_BASE}/search/photos`);
  searchUrl.searchParams.set('query', query);
  searchUrl.searchParams.set('page', String(page));
  searchUrl.searchParams.set('per_page', String(per_page));
  searchUrl.searchParams.set('content_filter', 'high');
  if (orientation) {
    searchUrl.searchParams.set('orientation', orientation);
  }

  const unsplashResponse = await fetch(searchUrl.toString(), {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });

  if (!unsplashResponse.ok) {
    const remaining = unsplashResponse.headers.get('X-Ratelimit-Remaining');
    console.error(
      `[unsplash-proxy] Unsplash API error: ${unsplashResponse.status} (remaining: ${remaining})`,
    );
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'UPSTREAM_ERROR',
          message: `Unsplash API returned status ${unsplashResponse.status}`,
        },
      },
      502,
    );
  }

  const unsplashData = await unsplashResponse.json();
  const upstreamRateLimit = Number(
    unsplashResponse.headers.get('X-Ratelimit-Limit'),
  );
  const upstreamRateRemaining = Number(
    unsplashResponse.headers.get('X-Ratelimit-Remaining'),
  );

  // -- Shape results ---------------------------------------------------------
  // deno-lint-ignore no-explicit-any
  const photos = unsplashData.results.map((photo: any) => shapePhoto(photo));

  // -- Cache write -----------------------------------------------------------
  const expiresAt = new Date(
    Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000,
  ).toISOString();

  await supabaseAdmin.from('unsplash_search_cache').upsert(
    {
      cache_key: cacheKey,
      query: query,
      page: page,
      per_page: per_page,
      orientation: orientation || null,
      total_results: unsplashData.total || 0,
      total_pages: unsplashData.total_pages || 0,
      results: photos,
      unsplash_rate_limit: upstreamRateLimit || null,
      unsplash_rate_remaining: upstreamRateRemaining || null,
      cached_at: new Date().toISOString(),
      expires_at: expiresAt,
    },
    { onConflict: 'cache_key' },
  );

  // -- Return response -------------------------------------------------------
  return jsonResponse({
    ok: true,
    data: {
      photos,
      pagination: {
        total: unsplashData.total || 0,
        total_pages: unsplashData.total_pages || 0,
        page,
        per_page,
      },
    },
    meta: {
      cached: false,
      upstream_rate_remaining: upstreamRateRemaining || null,
    },
  });
}

/**
 * Track a photo download per Unsplash TOS.
 *
 * Must be called when a user selects/inserts a photo into their design.
 * The Edge Function awaits the call but the client treats it as fire-and-forget.
 * Errors are logged but do not propagate to the user.
 */
// deno-lint-ignore no-explicit-any
async function handleDownloadTracking(
  _supabaseAdmin: any,
  params: { download_location: string },
): Promise<Response> {
  const { download_location } = params;

  // Validate the download location URL
  if (
    !download_location ||
    typeof download_location !== 'string' ||
    !download_location.startsWith('https://api.unsplash.com/')
  ) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'INVALID_PARAMS',
          message:
            'download_location is required and must be a valid Unsplash API URL',
        },
      },
      400,
    );
  }

  const accessKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
  if (!accessKey) {
    console.error(
      '[unsplash-proxy] UNSPLASH_ACCESS_KEY is not set for download tracking',
    );
    // Return success anyway -- download tracking failure should not block the user
    return jsonResponse({ ok: true, data: { tracked: false } });
  }

  try {
    await fetch(download_location, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });
  } catch (err) {
    console.error('[unsplash-proxy] Download tracking failed:', err);
    // Return success anyway -- download tracking failure should not block the user
  }

  return jsonResponse({ ok: true, data: { tracked: true } });
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

    // Create Supabase admin client for cache/rate-limit table operations
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

    // Extract tenant_id from user metadata or fall back to user.id
    // (In this schema, user.id IS the tenant_id for most clients;
    // matches existing pattern in feedbackService.js and usageService.js)
    const tenantId = user.user_metadata?.tenant_id || user.id;

    // -- Route action --------------------------------------------------------
    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case 'search':
        return await handleSearch(supabaseAdmin, tenantId, params as SearchParams);
      case 'track-download':
        return await handleDownloadTracking(
          supabaseAdmin,
          params as { download_location: string },
        );
      default:
        return jsonResponse(
          {
            ok: false,
            error: {
              code: 'BAD_REQUEST',
              message: `Unknown action: ${action}. Supported actions: search, track-download`,
            },
          },
          400,
        );
    }
  } catch (err) {
    console.error('[unsplash-proxy] Unhandled error:', err);
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
