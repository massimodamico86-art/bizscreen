/**
 * Weather Proxy Edge Function
 *
 * Proxies all OpenWeatherMap API calls server-side with:
 * - Current weather, 5-day forecast, forward geocoding, reverse geocoding
 * - Database-backed caching with 15-minute TTL
 * - Dual auth: authenticated user JWTs AND anon key (for player devices)
 * - Secure API key management (key never reaches the browser)
 *
 * Actions:
 * - "current": Fetch current weather by city name or coordinates
 * - "forecast": Fetch 5-day forecast by city name or coordinates
 * - "geocode": Forward geocoding (city name -> coordinates)
 * - "reverse-geocode": Reverse geocoding (coordinates -> city name)
 *
 * Satisfies WTHR-01 (server-side proxy, API key never in client bundle).
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_TTL_MINUTES = 15;
const FETCH_TIMEOUT_MS = 10_000;
const OWM_BASE = 'https://api.openweathermap.org/data/2.5';
const GEO_BASE = 'https://api.openweathermap.org/geo/1.0';

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
 * Fetch a URL with an AbortController timeout.
 */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check database cache for a valid (non-expired) entry.
 */
// deno-lint-ignore no-explicit-any
async function checkCache(supabaseAdmin: any, cacheKey: string): Promise<any | null> {
  const { data: cached } = await supabaseAdmin
    .from('weather_cache')
    .select('response_data')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  return cached?.response_data ?? null;
}

/**
 * Write (upsert) a response into the cache.
 */
// deno-lint-ignore no-explicit-any
async function writeCache(
  supabaseAdmin: any,
  cacheKey: string,
  action: string,
  location: string,
  units: string,
  // deno-lint-ignore no-explicit-any
  responseData: any,
): Promise<void> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000).toISOString();

  await supabaseAdmin.from('weather_cache').upsert(
    {
      cache_key: cacheKey,
      action,
      location,
      units,
      response_data: responseData,
      fetched_at: new Date().toISOString(),
      expires_at: expiresAt,
    },
    { onConflict: 'cache_key' },
  );
}

// ---------------------------------------------------------------------------
// Action Handlers
// ---------------------------------------------------------------------------

/**
 * Fetch current weather by city name or coordinates.
 */
// deno-lint-ignore no-explicit-any
async function handleCurrent(supabaseAdmin: any, params: any, apiKey: string): Promise<Response> {
  const { city, units = 'imperial', lat, lon } = params;

  if (!city && (lat === undefined || lon === undefined)) {
    return jsonResponse(
      { ok: false, error: { code: 'INVALID_PARAMS', message: 'city or lat/lon is required' } },
      400,
    );
  }

  const locationKey = city || `${lat},${lon}`;
  const cacheKey = `current:${locationKey}:${units}`;

  // Check cache
  const cached = await checkCache(supabaseAdmin, cacheKey);
  if (cached) {
    return jsonResponse({ ok: true, data: cached, meta: { cached: true } });
  }

  // Build URL
  let url: string;
  if (lat !== undefined && lon !== undefined) {
    url = `${OWM_BASE}/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${apiKey}`;
  } else {
    url = `${OWM_BASE}/weather?q=${encodeURIComponent(city)}&units=${units}&appid=${apiKey}`;
  }

  // Fetch from OWM
  let response: Response;
  try {
    response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
  } catch (err) {
    const message = err instanceof Error && err.name === 'AbortError'
      ? `Weather fetch timed out after ${FETCH_TIMEOUT_MS / 1000}s`
      : `Failed to fetch weather: ${err instanceof Error ? err.message : 'Unknown error'}`;
    return jsonResponse({ ok: false, error: { code: 'UPSTREAM_ERROR', message } }, 502);
  }

  if (!response.ok) {
    return jsonResponse(
      { ok: false, error: { code: 'UPSTREAM_ERROR', message: `OpenWeatherMap returned HTTP ${response.status}` } },
      502,
    );
  }

  const data = await response.json();

  // Cache the response
  await writeCache(supabaseAdmin, cacheKey, 'current', locationKey, units, data);

  return jsonResponse({ ok: true, data, meta: { cached: false } });
}

/**
 * Fetch 5-day forecast by city name or coordinates.
 */
// deno-lint-ignore no-explicit-any
async function handleForecast(supabaseAdmin: any, params: any, apiKey: string): Promise<Response> {
  const { city, units = 'imperial', lang = 'en', lat, lon } = params;

  if (!city && (lat === undefined || lon === undefined)) {
    return jsonResponse(
      { ok: false, error: { code: 'INVALID_PARAMS', message: 'city or lat/lon is required' } },
      400,
    );
  }

  const locationKey = city || `${lat},${lon}`;
  const cacheKey = `forecast:${locationKey}:${units}`;

  // Check cache
  const cached = await checkCache(supabaseAdmin, cacheKey);
  if (cached) {
    return jsonResponse({ ok: true, data: cached, meta: { cached: true } });
  }

  // Build URL
  let url: string;
  if (lat !== undefined && lon !== undefined) {
    url = `${OWM_BASE}/forecast?lat=${lat}&lon=${lon}&units=${units}&lang=${lang}&appid=${apiKey}`;
  } else {
    url = `${OWM_BASE}/forecast?q=${encodeURIComponent(city)}&units=${units}&lang=${lang}&appid=${apiKey}`;
  }

  // Fetch from OWM
  let response: Response;
  try {
    response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
  } catch (err) {
    const message = err instanceof Error && err.name === 'AbortError'
      ? `Forecast fetch timed out after ${FETCH_TIMEOUT_MS / 1000}s`
      : `Failed to fetch forecast: ${err instanceof Error ? err.message : 'Unknown error'}`;
    return jsonResponse({ ok: false, error: { code: 'UPSTREAM_ERROR', message } }, 502);
  }

  if (!response.ok) {
    return jsonResponse(
      { ok: false, error: { code: 'UPSTREAM_ERROR', message: `OpenWeatherMap returned HTTP ${response.status}` } },
      502,
    );
  }

  const data = await response.json();

  // Cache the response
  await writeCache(supabaseAdmin, cacheKey, 'forecast', locationKey, units, data);

  return jsonResponse({ ok: true, data, meta: { cached: false } });
}

/**
 * Forward geocoding: city name -> coordinates.
 */
// deno-lint-ignore no-explicit-any
async function handleGeocode(supabaseAdmin: any, params: any, apiKey: string): Promise<Response> {
  const { query, limit = 5 } = params;

  if (!query || typeof query !== 'string') {
    return jsonResponse(
      { ok: false, error: { code: 'INVALID_PARAMS', message: 'query is required' } },
      400,
    );
  }

  const cacheKey = `geocode:${query}:${limit}`;

  // Check cache
  const cached = await checkCache(supabaseAdmin, cacheKey);
  if (cached) {
    return jsonResponse({ ok: true, data: cached, meta: { cached: true } });
  }

  const url = `${GEO_BASE}/direct?q=${encodeURIComponent(query)}&limit=${limit}&appid=${apiKey}`;

  let response: Response;
  try {
    response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
  } catch (err) {
    const message = err instanceof Error && err.name === 'AbortError'
      ? `Geocode fetch timed out after ${FETCH_TIMEOUT_MS / 1000}s`
      : `Failed to fetch geocode: ${err instanceof Error ? err.message : 'Unknown error'}`;
    return jsonResponse({ ok: false, error: { code: 'UPSTREAM_ERROR', message } }, 502);
  }

  if (!response.ok) {
    return jsonResponse(
      { ok: false, error: { code: 'UPSTREAM_ERROR', message: `OpenWeatherMap returned HTTP ${response.status}` } },
      502,
    );
  }

  const data = await response.json();

  // Cache the response
  await writeCache(supabaseAdmin, cacheKey, 'geocode', query, 'n/a', data);

  return jsonResponse({ ok: true, data, meta: { cached: false } });
}

/**
 * Reverse geocoding: coordinates -> city name.
 */
// deno-lint-ignore no-explicit-any
async function handleReverseGeocode(supabaseAdmin: any, params: any, apiKey: string): Promise<Response> {
  const { lat, lon } = params;

  if (lat === undefined || lon === undefined) {
    return jsonResponse(
      { ok: false, error: { code: 'INVALID_PARAMS', message: 'lat and lon are required' } },
      400,
    );
  }

  const locationKey = `${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`;
  const cacheKey = `reverse:${locationKey}`;

  // Check cache
  const cached = await checkCache(supabaseAdmin, cacheKey);
  if (cached) {
    return jsonResponse({ ok: true, data: cached, meta: { cached: true } });
  }

  const url = `${GEO_BASE}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;

  let response: Response;
  try {
    response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
  } catch (err) {
    const message = err instanceof Error && err.name === 'AbortError'
      ? `Reverse geocode fetch timed out after ${FETCH_TIMEOUT_MS / 1000}s`
      : `Failed to fetch reverse geocode: ${err instanceof Error ? err.message : 'Unknown error'}`;
    return jsonResponse({ ok: false, error: { code: 'UPSTREAM_ERROR', message } }, 502);
  }

  if (!response.ok) {
    return jsonResponse(
      { ok: false, error: { code: 'UPSTREAM_ERROR', message: `OpenWeatherMap returned HTTP ${response.status}` } },
      502,
    );
  }

  const data = await response.json();

  // Cache the response
  await writeCache(supabaseAdmin, cacheKey, 'reverse-geocode', locationKey, 'n/a', data);

  return jsonResponse({ ok: true, data, meta: { cached: false } });
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
    // -- Authentication --------------------------------------------------------
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' } },
        401,
      );
    }

    // Create Supabase admin client for cache table operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Dual auth: accept authenticated user JWTs AND the anon key.
    // Player devices are NOT authenticated users -- they use the anon key.
    const token = authHeader.replace('Bearer ', '');

    // Try user JWT first
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      // Fall back to anon key check (for player devices)
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
      if (token !== anonKey) {
        return jsonResponse(
          { ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
          401,
        );
      }
      // Anon key is valid -- proceed without user context
    }

    // -- Verify API key --------------------------------------------------------
    const apiKey = Deno.env.get('OPENWEATHER_API_KEY');
    if (!apiKey) {
      console.error('[weather-proxy] OPENWEATHER_API_KEY is not set');
      return jsonResponse(
        { ok: false, error: { code: 'CONFIG_ERROR', message: 'Weather integration is not configured' } },
        503,
      );
    }

    // -- Route action ----------------------------------------------------------
    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case 'current':
        return await handleCurrent(supabaseAdmin, params, apiKey);
      case 'forecast':
        return await handleForecast(supabaseAdmin, params, apiKey);
      case 'geocode':
        return await handleGeocode(supabaseAdmin, params, apiKey);
      case 'reverse-geocode':
        return await handleReverseGeocode(supabaseAdmin, params, apiKey);
      default:
        return jsonResponse(
          {
            ok: false,
            error: {
              code: 'BAD_REQUEST',
              message: `Unknown action: ${action}. Supported actions: current, forecast, geocode, reverse-geocode`,
            },
          },
          400,
        );
    }
  } catch (err) {
    console.error('[weather-proxy] Unhandled error:', err);
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
