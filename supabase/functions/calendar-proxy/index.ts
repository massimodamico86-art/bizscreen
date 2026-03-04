/**
 * Calendar Proxy Edge Function
 *
 * Fetches calendar events from Google Calendar and Microsoft Outlook APIs
 * server-side with:
 * - JWT auth verification (same pattern as rss-proxy)
 * - Database-backed token storage (calendar_oauth_tokens table)
 * - Token refresh on 401 for unattended player operation
 * - Event caching with TTL (calendar_event_cache table)
 * - Normalized event format across providers
 *
 * Actions:
 * - "fetch": Fetch events for a specific calendar source by sourceId
 *
 * Satisfies CAL-02/CAL-04 (server-side proxy for calendar APIs).
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_TTL_MINUTES = 5;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_EVENTS = 50;
const EVENT_WINDOW_DAYS = 7;

// Google OAuth endpoints
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars';

// Microsoft OAuth endpoints
const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const MS_GRAPH_API = 'https://graph.microsoft.com/v1.0/me/calendarView';

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
 * Get ISO date strings for the event window (now to now + EVENT_WINDOW_DAYS).
 */
function getEventWindow(): { timeMin: string; timeMax: string } {
  const now = new Date();
  const future = new Date(now.getTime() + EVENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return {
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Event Normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a Google Calendar event to the common shape.
 */
// deno-lint-ignore no-explicit-any
function normalizeGoogleEvent(event: any) {
  return {
    id: event.id,
    title: event.summary || '(No title)',
    description: event.description || '',
    startTime: event.start?.dateTime || event.start?.date,
    endTime: event.end?.dateTime || event.end?.date,
    allDay: !event.start?.dateTime,
    location: event.location || null,
  };
}

/**
 * Normalize a Microsoft Graph calendar event to the common shape.
 */
// deno-lint-ignore no-explicit-any
function normalizeOutlookEvent(event: any) {
  return {
    id: event.id,
    title: event.subject || '(No title)',
    description: event.bodyPreview || '',
    startTime: event.start?.dateTime,
    endTime: event.end?.dateTime,
    allDay: event.isAllDay || false,
    location: event.location?.displayName || null,
  };
}

// ---------------------------------------------------------------------------
// Provider-specific Event Fetching
// ---------------------------------------------------------------------------

/**
 * Fetch events from Google Calendar API v3.
 */
async function fetchGoogleCalendarEvents(
  calendarId: string,
  accessToken: string,
): Promise<{ events: ReturnType<typeof normalizeGoogleEvent>[]; status: number }> {
  const { timeMin, timeMax } = getEventWindow();

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(MAX_EVENTS),
  });

  const url = `${GOOGLE_CALENDAR_API}/${encodeURIComponent(calendarId)}/events?${params.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });

    if (!response.ok) {
      return { events: [], status: response.status };
    }

    const data = await response.json();
    // deno-lint-ignore no-explicit-any
    const events = (data.items || []).map((item: any) => normalizeGoogleEvent(item));
    return { events, status: 200 };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch events from Microsoft Graph calendarView API.
 */
async function fetchOutlookCalendarEvents(
  accessToken: string,
): Promise<{ events: ReturnType<typeof normalizeOutlookEvent>[]; status: number }> {
  const { timeMin, timeMax } = getEventWindow();

  const params = new URLSearchParams({
    startDateTime: timeMin,
    endDateTime: timeMax,
    $top: String(MAX_EVENTS),
    $orderby: 'start/dateTime',
    $select: 'subject,start,end,location,isAllDay,bodyPreview',
  });

  const url = `${MS_GRAPH_API}?${params.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="UTC"',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return { events: [], status: response.status };
    }

    const data = await response.json();
    // deno-lint-ignore no-explicit-any
    const events = (data.value || []).map((item: any) => normalizeOutlookEvent(item));
    return { events, status: 200 };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Token Refresh
// ---------------------------------------------------------------------------

/**
 * Refresh a Google Calendar access token using the stored refresh token.
 * Updates the database with the new token.
 */
// deno-lint-ignore no-explicit-any
async function refreshGoogleToken(supabaseAdmin: any, tokenRow: any): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID') || Deno.env.get('VITE_GOOGLE_CALENDAR_CLIENT_ID') || '';

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenRow.refresh_token,
      client_id: clientId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token refresh failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  const newAccessToken = data.access_token;
  const newExpiry = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null;

  // Update token in database
  await supabaseAdmin
    .from('calendar_oauth_tokens')
    .update({
      access_token: newAccessToken,
      token_expiry: newExpiry,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tokenRow.id);

  return newAccessToken;
}

/**
 * Refresh a Microsoft Outlook access token using the stored refresh token.
 * Updates the database with the new token.
 */
// deno-lint-ignore no-explicit-any
async function refreshOutlookToken(supabaseAdmin: any, tokenRow: any): Promise<string> {
  const clientId = Deno.env.get('MICROSOFT_CALENDAR_CLIENT_ID') || Deno.env.get('VITE_MICROSOFT_CALENDAR_CLIENT_ID') || '';

  const response = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenRow.refresh_token,
      client_id: clientId,
      scope: 'Calendars.ReadBasic offline_access',
    }),
  });

  if (!response.ok) {
    throw new Error(`Outlook token refresh failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  const newAccessToken = data.access_token;
  const newExpiry = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null;

  // Update token in database -- also update refresh_token if rotated
  await supabaseAdmin
    .from('calendar_oauth_tokens')
    .update({
      access_token: newAccessToken,
      refresh_token: data.refresh_token || tokenRow.refresh_token,
      token_expiry: newExpiry,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tokenRow.id);

  return newAccessToken;
}

// ---------------------------------------------------------------------------
// Action Handler
// ---------------------------------------------------------------------------

/**
 * Fetch calendar events for a specific source.
 *
 * Flow: validate params -> lookup token from DB -> cache check ->
 * fetch from provider API (with 401 retry via token refresh) -> cache write -> return events.
 */
// deno-lint-ignore no-explicit-any
async function handleFetchEvents(
  supabaseAdmin: any,
  userId: string,
  params: { sourceId: string },
): Promise<Response> {
  const { sourceId } = params;

  if (!sourceId || typeof sourceId !== 'string') {
    return jsonResponse(
      { ok: false, error: { code: 'INVALID_PARAMS', message: 'sourceId is required' } },
      400,
    );
  }

  // -- Lookup token from database -----------------------------------------------
  const { data: tokenRow, error: tokenError } = await supabaseAdmin
    .from('calendar_oauth_tokens')
    .select('*')
    .eq('id', sourceId)
    .eq('owner_id', userId)
    .maybeSingle();

  if (tokenError || !tokenRow) {
    return jsonResponse(
      { ok: false, error: { code: 'NOT_FOUND', message: 'Calendar source not found' } },
      404,
    );
  }

  const { provider, calendar_id, access_token, refresh_token } = tokenRow;

  // -- Cache check ---------------------------------------------------------------
  const { data: cached } = await supabaseAdmin
    .from('calendar_event_cache')
    .select('*')
    .eq('calendar_id', calendar_id)
    .eq('provider', provider)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (cached) {
    return jsonResponse({
      ok: true,
      data: cached.events,
      meta: { cached: true, eventCount: cached.events?.length || 0 },
    });
  }

  // -- Fetch from provider -------------------------------------------------------
  // deno-lint-ignore no-explicit-any
  let result: { events: any[]; status: number };

  if (provider === 'gcal') {
    result = await fetchGoogleCalendarEvents(calendar_id, access_token);
  } else if (provider === 'outlook_cal') {
    result = await fetchOutlookCalendarEvents(access_token);
  } else {
    return jsonResponse(
      { ok: false, error: { code: 'UNSUPPORTED_PROVIDER', message: `Unknown provider: ${provider}` } },
      400,
    );
  }

  // -- Token refresh on 401 ------------------------------------------------------
  if (result.status === 401 && refresh_token) {
    try {
      const newAccessToken = provider === 'gcal'
        ? await refreshGoogleToken(supabaseAdmin, tokenRow)
        : await refreshOutlookToken(supabaseAdmin, tokenRow);

      // Retry fetch with new token
      if (provider === 'gcal') {
        result = await fetchGoogleCalendarEvents(calendar_id, newAccessToken);
      } else {
        result = await fetchOutlookCalendarEvents(newAccessToken);
      }
    } catch (refreshErr) {
      console.error('[calendar-proxy] Token refresh failed:', refreshErr);
      return jsonResponse(
        {
          ok: false,
          error: {
            code: 'TOKEN_REFRESH_FAILED',
            message: refreshErr instanceof Error ? refreshErr.message : 'Token refresh failed',
          },
        },
        502,
      );
    }
  }

  // Check if the retry (or first attempt) still failed
  if (result.status !== 200) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'PROVIDER_ERROR',
          message: `Calendar provider returned HTTP ${result.status}`,
        },
      },
      502,
    );
  }

  // -- Cache write ----------------------------------------------------------------
  const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000).toISOString();

  await supabaseAdmin.from('calendar_event_cache').upsert(
    {
      calendar_id,
      provider,
      events: result.events,
      fetched_at: new Date().toISOString(),
      expires_at: expiresAt,
    },
    { onConflict: 'calendar_id, provider' },
  );

  // -- Return response -----------------------------------------------------------
  return jsonResponse({
    ok: true,
    data: result.events,
    meta: { cached: false, eventCount: result.events.length },
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
    // -- Authentication ----------------------------------------------------------
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' } },
        401,
      );
    }

    // Create Supabase admin client for DB operations
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
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
        401,
      );
    }

    // -- Route action ------------------------------------------------------------
    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case 'fetch':
        return await handleFetchEvents(supabaseAdmin, user.id, params as { sourceId: string });
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
    console.error('[calendar-proxy] Unhandled error:', err);
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
