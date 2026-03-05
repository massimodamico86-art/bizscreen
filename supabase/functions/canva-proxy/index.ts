/**
 * Canva Proxy Edge Function
 *
 * Server-side proxy for Canva Connect API calls with:
 * - JWT auth verification (same pattern as calendar-proxy)
 * - Database-backed token storage (canva_oauth_tokens table)
 * - Token refresh when expired (5-minute pre-expiry buffer)
 * - PKCE token exchange for OAuth callback
 * - Design listing and export with polling
 *
 * Actions:
 * - "exchange_token": Exchange OAuth authorization code for tokens
 * - "list_designs": List user's Canva designs with pagination
 * - "export_design": Export a design to image format with polling
 * - "check_connection": Check if user has a valid Canva connection
 *
 * Environment variables: CANVA_CLIENT_ID, CANVA_CLIENT_SECRET
 *
 * Satisfies CANVA-01/CANVA-02/CANVA-04.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CANVA_TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token';
const CANVA_DESIGNS_URL = 'https://api.canva.com/rest/v1/designs';
const CANVA_EXPORTS_URL = 'https://api.canva.com/rest/v1/exports';

/** Pre-expiry buffer: refresh tokens 5 minutes before they expire */
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

/** Export polling: 2s interval, max 15 attempts (30s total) */
const EXPORT_POLL_INTERVAL_MS = 2_000;
const EXPORT_MAX_POLL_ATTEMPTS = 15;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getCanvaCredentials(): { clientId: string; clientSecret: string } {
  const clientId = Deno.env.get('CANVA_CLIENT_ID') || '';
  const clientSecret = Deno.env.get('CANVA_CLIENT_SECRET') || '';
  return { clientId, clientSecret };
}

/**
 * Check if a token is expired or about to expire (within 5-minute buffer).
 */
function isTokenExpired(tokenExpiry: string): boolean {
  const expiryDate = new Date(tokenExpiry);
  return expiryDate.getTime() < Date.now() + TOKEN_REFRESH_BUFFER_MS;
}

// ---------------------------------------------------------------------------
// Token Refresh
// ---------------------------------------------------------------------------

/**
 * Refresh a Canva access token using the stored refresh token.
 * Updates the database row with the new tokens.
 */
// deno-lint-ignore no-explicit-any
async function refreshCanvaToken(supabaseAdmin: any, tokenRow: any): Promise<string> {
  const { clientId, clientSecret } = getCanvaCredentials();

  const response = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenRow.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Canva token refresh failed: HTTP ${response.status} - ${errBody}`);
  }

  const data = await response.json();
  const newAccessToken = data.access_token;
  const newExpiry = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : tokenRow.token_expiry;

  // Update token in database
  await supabaseAdmin
    .from('canva_oauth_tokens')
    .update({
      access_token: newAccessToken,
      refresh_token: data.refresh_token || tokenRow.refresh_token,
      token_expiry: newExpiry,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tokenRow.id);

  return newAccessToken;
}

/**
 * Get a valid access token for the user, refreshing if necessary.
 * Returns the access token string or throws on failure.
 */
// deno-lint-ignore no-explicit-any
async function getValidAccessToken(supabaseAdmin: any, tokenRow: any): Promise<string> {
  if (!isTokenExpired(tokenRow.token_expiry)) {
    return tokenRow.access_token;
  }

  if (!tokenRow.refresh_token) {
    throw new Error('Token expired and no refresh token available');
  }

  return await refreshCanvaToken(supabaseAdmin, tokenRow);
}

// ---------------------------------------------------------------------------
// Action Handlers
// ---------------------------------------------------------------------------

/**
 * Exchange an OAuth authorization code for Canva tokens (PKCE flow).
 * Stores tokens in canva_oauth_tokens table via upsert on user_id.
 */
// deno-lint-ignore no-explicit-any
async function handleExchangeToken(
  supabaseAdmin: any,
  userId: string,
  tenantId: string,
  params: { code: string; codeVerifier: string; redirectUri: string },
): Promise<Response> {
  const { code, codeVerifier, redirectUri } = params;

  if (!code || !codeVerifier || !redirectUri) {
    return jsonResponse(
      { ok: false, error: { code: 'INVALID_PARAMS', message: 'code, codeVerifier, and redirectUri are required' } },
      400,
    );
  }

  const { clientId, clientSecret } = getCanvaCredentials();

  const response = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error('[canva-proxy] Token exchange failed:', errBody);
    return jsonResponse(
      { ok: false, error: { code: 'TOKEN_EXCHANGE_FAILED', message: `Canva token exchange failed: HTTP ${response.status}` } },
      502,
    );
  }

  const data = await response.json();

  const tokenExpiry = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : new Date(Date.now() + 3600 * 1000).toISOString(); // default 1 hour

  // Upsert token row (unique on user_id)
  const { error: upsertError } = await supabaseAdmin
    .from('canva_oauth_tokens')
    .upsert(
      {
        user_id: userId,
        tenant_id: tenantId,
        access_token: data.access_token,
        refresh_token: data.refresh_token || null,
        token_expiry: tokenExpiry,
        scopes: data.scope ? data.scope.split(' ') : [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (upsertError) {
    console.error('[canva-proxy] Token upsert failed:', upsertError);
    return jsonResponse(
      { ok: false, error: { code: 'DB_ERROR', message: 'Failed to store Canva tokens' } },
      500,
    );
  }

  return jsonResponse({ ok: true });
}

/**
 * List the authenticated user's Canva designs.
 * Refreshes token if expired, retries on 401.
 */
// deno-lint-ignore no-explicit-any
async function handleListDesigns(
  supabaseAdmin: any,
  userId: string,
  params: { query?: string; continuation?: string },
): Promise<Response> {
  // Lookup token from database
  const { data: tokenRow, error: tokenError } = await supabaseAdmin
    .from('canva_oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (tokenError || !tokenRow) {
    return jsonResponse(
      { ok: false, error: { code: 'NOT_CONNECTED', message: 'No Canva connection found. Please connect your Canva account first.' } },
      404,
    );
  }

  let accessToken = await getValidAccessToken(supabaseAdmin, tokenRow);

  // Build query params
  const queryParams = new URLSearchParams({
    ownership: 'owned',
    sort_by: 'modified_descending',
  });
  if (params.query) queryParams.set('query', params.query);
  if (params.continuation) queryParams.set('continuation', params.continuation);

  const url = `${CANVA_DESIGNS_URL}?${queryParams.toString()}`;

  // First attempt
  let response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // Retry on 401 with refreshed token
  if (response.status === 401 && tokenRow.refresh_token) {
    try {
      accessToken = await refreshCanvaToken(supabaseAdmin, tokenRow);
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (refreshErr) {
      console.error('[canva-proxy] Token refresh failed during list_designs:', refreshErr);
      return jsonResponse(
        { ok: false, error: { code: 'TOKEN_REFRESH_FAILED', message: 'Failed to refresh Canva token' } },
        502,
      );
    }
  }

  if (!response.ok) {
    return jsonResponse(
      { ok: false, error: { code: 'CANVA_API_ERROR', message: `Canva API returned HTTP ${response.status}` } },
      502,
    );
  }

  const data = await response.json();
  return jsonResponse({
    ok: true,
    data: {
      items: data.items || [],
      continuation: data.continuation || null,
    },
  });
}

/**
 * Export a Canva design to an image format.
 * Polls the export job until complete or timeout (30s).
 */
// deno-lint-ignore no-explicit-any
async function handleExportDesign(
  supabaseAdmin: any,
  userId: string,
  params: { designId: string; format?: string },
): Promise<Response> {
  const { designId, format = 'png' } = params;

  if (!designId) {
    return jsonResponse(
      { ok: false, error: { code: 'INVALID_PARAMS', message: 'designId is required' } },
      400,
    );
  }

  // Lookup token from database
  const { data: tokenRow, error: tokenError } = await supabaseAdmin
    .from('canva_oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (tokenError || !tokenRow) {
    return jsonResponse(
      { ok: false, error: { code: 'NOT_CONNECTED', message: 'No Canva connection found' } },
      404,
    );
  }

  let accessToken = await getValidAccessToken(supabaseAdmin, tokenRow);

  // Initiate export
  let exportResponse = await fetch(CANVA_EXPORTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      design_id: designId,
      format: { type: format },
    }),
  });

  // Retry on 401
  if (exportResponse.status === 401 && tokenRow.refresh_token) {
    try {
      accessToken = await refreshCanvaToken(supabaseAdmin, tokenRow);
      exportResponse = await fetch(CANVA_EXPORTS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          design_id: designId,
          format: { type: format },
        }),
      });
    } catch (refreshErr) {
      console.error('[canva-proxy] Token refresh failed during export_design:', refreshErr);
      return jsonResponse(
        { ok: false, error: { code: 'TOKEN_REFRESH_FAILED', message: 'Failed to refresh Canva token' } },
        502,
      );
    }
  }

  if (!exportResponse.ok) {
    return jsonResponse(
      { ok: false, error: { code: 'EXPORT_FAILED', message: `Canva export request failed: HTTP ${exportResponse.status}` } },
      502,
    );
  }

  const exportData = await exportResponse.json();
  const exportId = exportData.job?.id || exportData.id;

  if (!exportId) {
    return jsonResponse(
      { ok: false, error: { code: 'EXPORT_FAILED', message: 'No export job ID returned from Canva' } },
      502,
    );
  }

  // Poll for completion
  for (let attempt = 0; attempt < EXPORT_MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, EXPORT_POLL_INTERVAL_MS));

    const pollResponse = await fetch(`${CANVA_EXPORTS_URL}/${exportId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!pollResponse.ok) {
      continue; // Retry on transient errors
    }

    const pollData = await pollResponse.json();
    const status = pollData.job?.status || pollData.status;

    if (status === 'success' || status === 'completed') {
      const urls = pollData.job?.urls || pollData.urls || [];
      return jsonResponse({ ok: true, data: { urls } });
    }

    if (status === 'failed') {
      return jsonResponse(
        { ok: false, error: { code: 'EXPORT_FAILED', message: 'Canva export job failed' } },
        502,
      );
    }

    // Still in_progress, continue polling
  }

  // Timeout -- return job ID for client-side polling
  return jsonResponse({
    ok: true,
    data: {
      exportId,
      status: 'in_progress',
      message: 'Export still processing. Use exportId to poll status.',
    },
  });
}

/**
 * Check if the user has a valid (non-expired) Canva connection.
 */
// deno-lint-ignore no-explicit-any
async function handleCheckConnection(
  supabaseAdmin: any,
  userId: string,
): Promise<Response> {
  const { data: tokenRow, error: tokenError } = await supabaseAdmin
    .from('canva_oauth_tokens')
    .select('id, token_expiry, refresh_token')
    .eq('user_id', userId)
    .maybeSingle();

  if (tokenError || !tokenRow) {
    return jsonResponse({ ok: true, data: { connected: false } });
  }

  // Connected if token is not expired, or if we have a refresh token to renew it
  const connected = !isTokenExpired(tokenRow.token_expiry) || !!tokenRow.refresh_token;

  return jsonResponse({ ok: true, data: { connected } });
}

// ---------------------------------------------------------------------------
// Tenant ID Resolution
// ---------------------------------------------------------------------------

/**
 * Look up the user's tenant_id from user_profiles.
 */
// deno-lint-ignore no-explicit-any
async function getUserTenantId(supabaseAdmin: any, userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('user_profiles')
    .select('tenant_id')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.tenant_id || null;
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
      case 'exchange_token': {
        const tenantId = await getUserTenantId(supabaseAdmin, user.id);
        if (!tenantId) {
          return jsonResponse(
            { ok: false, error: { code: 'NO_TENANT', message: 'User has no tenant profile' } },
            400,
          );
        }
        return await handleExchangeToken(
          supabaseAdmin,
          user.id,
          tenantId,
          params as { code: string; codeVerifier: string; redirectUri: string },
        );
      }
      case 'list_designs':
        return await handleListDesigns(
          supabaseAdmin,
          user.id,
          params as { query?: string; continuation?: string },
        );
      case 'export_design':
        return await handleExportDesign(
          supabaseAdmin,
          user.id,
          params as { designId: string; format?: string },
        );
      case 'check_connection':
        return await handleCheckConnection(supabaseAdmin, user.id);
      default:
        return jsonResponse(
          {
            ok: false,
            error: {
              code: 'BAD_REQUEST',
              message: `Unknown action: ${action}. Supported actions: exchange_token, list_designs, export_design, check_connection`,
            },
          },
          400,
        );
    }
  } catch (err) {
    console.error('[canva-proxy] Unhandled error:', err);
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
