/**
 * API Gateway Edge Function
 *
 * Public REST API for external integrations. Validates API tokens (biz_ prefix),
 * applies rate limiting, checks scopes, and routes to tenant-scoped PostgreSQL RPCs.
 *
 * Authentication: Bearer token with SHA-256 hash validated via validate_api_token RPC.
 * Rate limiting: 100 requests per 15-minute window per token via check_rate_limit RPC.
 * Tenant isolation: owner_id from token validation is passed as p_tenant_id to all RPCs.
 *
 * Endpoints:
 *   GET  /v1/screens                  - List screens
 *   GET  /v1/screens/:id              - Get single screen
 *   GET  /v1/playlists                - List playlists
 *   GET  /v1/playlists/:id            - Get playlist with items
 *   PUT  /v1/playlists/:id            - Update playlist
 *   GET  /v1/media                    - List media assets
 *   POST /v1/media                    - Get presigned S3 upload URL
 *   POST /v1/media/confirm            - Create media record after upload
 *   PUT  /v1/screens/:id/assignment   - Assign playlist to screen
 *
 * Requirements: API-01 through API-07
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RouteConfig {
  rpc?: string;
  handler?: string;
  scope: string;
}

interface MatchedRoute {
  config: RouteConfig;
  params: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Route Table
// ---------------------------------------------------------------------------

const ROUTES: Record<string, RouteConfig> = {
  'GET /v1/screens':                { rpc: 'api_list_screens',            scope: 'screens:read' },
  'GET /v1/screens/:id':            { rpc: 'api_get_screen',              scope: 'screens:read' },
  'GET /v1/playlists':              { rpc: 'api_list_playlists',          scope: 'playlists:read' },
  'GET /v1/playlists/:id':          { rpc: 'api_get_playlist',            scope: 'playlists:read' },
  'PUT /v1/playlists/:id':          { rpc: 'api_update_playlist',         scope: 'playlists:write' },
  'GET /v1/media':                  { rpc: 'api_list_media',              scope: 'media:read' },
  'POST /v1/media':                 { handler: 'generatePresignedUrl',    scope: 'media:write' },
  'POST /v1/media/confirm':         { rpc: 'api_create_media_record',     scope: 'media:write' },
  'PUT /v1/screens/:id/assignment': { rpc: 'api_update_screen_assignment', scope: 'screens:write' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a JSON response with CORS headers.
 */
function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

/**
 * SHA-256 hash a string using Web Crypto API.
 * Returns lowercase hex string.
 */
async function sha256(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Match an HTTP method + pathname against the route table.
 * Handles :id path parameters.
 */
function matchRoute(method: string, pathname: string): MatchedRoute | null {
  // Normalize pathname -- remove trailing slash
  const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  // Try exact match first (non-parameterized routes)
  const exactKey = `${method} ${normalizedPath}`;
  if (ROUTES[exactKey]) {
    return { config: ROUTES[exactKey], params: {} };
  }

  // Try parameterized routes
  for (const [pattern, config] of Object.entries(ROUTES)) {
    const [routeMethod, routePath] = pattern.split(' ', 2);
    if (routeMethod !== method) continue;

    const routeParts = routePath.split('/');
    const pathParts = normalizedPath.split('/');

    if (routeParts.length !== pathParts.length) continue;

    const params: Record<string, string> = {};
    let matched = true;

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        // Parameter segment
        const paramName = routeParts[i].slice(1);
        params[paramName] = pathParts[i];
      } else if (routeParts[i] !== pathParts[i]) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return { config, params };
    }
  }

  return null;
}

/**
 * HMAC-SHA256 using Web Crypto API.
 */
async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

/**
 * Get HMAC signing key for AWS Signature V4.
 */
async function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(
    new TextEncoder().encode('AWS4' + secretKey).buffer as ArrayBuffer,
    dateStamp,
  );
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

/**
 * Convert ArrayBuffer to lowercase hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a presigned S3 PUT URL using AWS Signature V4.
 * Uses Web Crypto API for HMAC-SHA256 computations.
 */
async function generatePresignedUrl(
  bucket: string,
  region: string,
  key: string,
  contentType: string,
  accessKeyId: string,
  secretAccessKey: string,
  expiresIn: number,
): Promise<string> {
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = dateStamp + 'T' + now.toISOString().slice(11, 19).replace(/:/g, '') + 'Z';
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;

  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');

  // Canonical query string (parameters must be sorted)
  const queryParams: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'content-type;host',
  };

  const canonicalQueryString = Object.keys(queryParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join('&');

  // Canonical headers
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const signedHeaders = 'content-type;host';

  // Canonical request
  const canonicalRequest = [
    'PUT',
    '/' + encodedKey,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  // String to sign
  const canonicalRequestHashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonicalRequest),
  );
  const canonicalRequestHash = bufferToHex(canonicalRequestHashBuffer);

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');

  // Signing key
  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, 's3');
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = bufferToHex(signatureBuffer);

  // Presigned URL
  return `https://${host}/${encodedKey}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
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
    // ------------------------------------------------------------------
    // 1. Token extraction
    // ------------------------------------------------------------------
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse(
        { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } },
        401,
      );
    }

    const rawToken = authHeader.slice(7); // Remove "Bearer "

    // Validate token prefix
    if (!rawToken.startsWith('biz_')) {
      return jsonResponse(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid API token format. Tokens must start with biz_' } },
        401,
      );
    }

    // ------------------------------------------------------------------
    // 2. Token validation via SHA-256 hash + validate_api_token RPC
    // ------------------------------------------------------------------
    const tokenHash = await sha256(rawToken);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: tokenResult, error: tokenError } = await supabaseAdmin.rpc(
      'validate_api_token',
      { p_token_hash: tokenHash },
    );

    if (tokenError) {
      console.error('[api-gateway] Token validation error:', tokenError);
      return jsonResponse(
        { error: { code: 'INTERNAL_ERROR', message: 'Token validation failed' } },
        500,
      );
    }

    if (!tokenResult?.valid) {
      return jsonResponse(
        { error: { code: 'UNAUTHORIZED', message: tokenResult?.error || 'Invalid API token' } },
        401,
      );
    }

    const tenantId: string = tokenResult.owner_id;
    const tokenId: string = tokenResult.token_id;
    const tokenScopes: string[] = tokenResult.scopes || [];

    // ------------------------------------------------------------------
    // 3. Rate limiting via check_rate_limit RPC
    // ------------------------------------------------------------------
    const { data: rateResult, error: rateError } = await supabaseAdmin.rpc(
      'check_rate_limit',
      {
        p_identifier: tokenId,
        p_action: 'api_request',
        p_max_requests: 100,
        p_window_minutes: 15,
      },
    );

    if (rateError) {
      console.error('[api-gateway] Rate limit check error:', rateError);
      // Fail open -- don't block requests if rate limiter is broken
    } else if (rateResult && !rateResult.allowed) {
      return jsonResponse(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'Rate limit exceeded. Maximum 100 requests per 15-minute window.',
            retry_after_seconds: rateResult.retry_after_seconds,
          },
        },
        429,
        { 'Retry-After': String(rateResult.retry_after_seconds || 60) },
      );
    }

    // ------------------------------------------------------------------
    // 4. URL routing
    // ------------------------------------------------------------------
    const url = new URL(req.url);
    // Strip the Edge Function prefix (e.g., /api-gateway) from the path
    const fullPath = url.pathname;
    const gatewayPrefix = '/api-gateway';
    const apiPath = fullPath.startsWith(gatewayPrefix)
      ? fullPath.slice(gatewayPrefix.length)
      : fullPath;

    const matched = matchRoute(req.method, apiPath);

    if (!matched) {
      return jsonResponse(
        {
          error: {
            code: 'NOT_FOUND',
            message: `No route found for ${req.method} ${apiPath}`,
            available_routes: Object.keys(ROUTES),
          },
        },
        404,
      );
    }

    // ------------------------------------------------------------------
    // 5. Scope check
    // ------------------------------------------------------------------
    const requiredScope = matched.config.scope;
    if (!tokenScopes.includes(requiredScope)) {
      return jsonResponse(
        {
          error: {
            code: 'FORBIDDEN',
            message: `Token lacks required scope: ${requiredScope}`,
            required_scope: requiredScope,
            token_scopes: tokenScopes,
          },
        },
        403,
      );
    }

    // ------------------------------------------------------------------
    // 6. Handle presigned URL generation (POST /v1/media)
    // ------------------------------------------------------------------
    if (matched.config.handler === 'generatePresignedUrl') {
      const body = await req.json();
      const { filename, content_type } = body;

      if (!filename || !content_type) {
        return jsonResponse(
          { error: { code: 'BAD_REQUEST', message: 'filename and content_type are required' } },
          400,
        );
      }

      const s3Bucket = Deno.env.get('S3_BUCKET');
      const s3Region = Deno.env.get('S3_REGION');
      const s3AccessKey = Deno.env.get('S3_ACCESS_KEY_ID');
      const s3SecretKey = Deno.env.get('S3_SECRET_ACCESS_KEY');

      if (!s3Bucket || !s3Region || !s3AccessKey || !s3SecretKey) {
        console.error('[api-gateway] S3 credentials not configured');
        return jsonResponse(
          { error: { code: 'CONFIG_ERROR', message: 'S3 storage is not configured' } },
          503,
        );
      }

      const fileKey = `uploads/${tenantId}/${crypto.randomUUID()}/${filename}`;
      const uploadUrl = await generatePresignedUrl(
        s3Bucket,
        s3Region,
        fileKey,
        content_type,
        s3AccessKey,
        s3SecretKey,
        3600,
      );

      return jsonResponse({
        data: {
          upload_url: uploadUrl,
          file_key: fileKey,
          expires_in: 3600,
        },
      });
    }

    // ------------------------------------------------------------------
    // 7. RPC call for all other routes
    // ------------------------------------------------------------------
    const rpcName = matched.config.rpc!;
    const rpcParams: Record<string, unknown> = {
      p_tenant_id: tenantId,
    };

    // Extract parameters based on route
    const queryLimit = url.searchParams.get('limit');
    const queryOffset = url.searchParams.get('offset');

    // List endpoints: add pagination params
    if (rpcName.startsWith('api_list_')) {
      rpcParams.p_limit = queryLimit ? Math.min(parseInt(queryLimit, 10), 100) : 50;
      rpcParams.p_offset = queryOffset ? Math.max(parseInt(queryOffset, 10), 0) : 0;
    }

    // Single resource endpoints: add ID param
    if (matched.params.id) {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(matched.params.id)) {
        return jsonResponse(
          { error: { code: 'BAD_REQUEST', message: 'Invalid UUID format for resource ID' } },
          400,
        );
      }
    }

    // Route-specific parameter mapping
    switch (rpcName) {
      case 'api_get_screen':
        rpcParams.p_screen_id = matched.params.id;
        break;
      case 'api_get_playlist':
        rpcParams.p_playlist_id = matched.params.id;
        break;
      case 'api_update_playlist': {
        const body = await req.json();
        rpcParams.p_playlist_id = matched.params.id;
        if (body.name !== undefined) rpcParams.p_name = body.name;
        if (body.description !== undefined) rpcParams.p_description = body.description;
        break;
      }
      case 'api_update_screen_assignment': {
        const body = await req.json();
        rpcParams.p_screen_id = matched.params.id;
        rpcParams.p_playlist_id = body.playlist_id;
        break;
      }
      case 'api_create_media_record': {
        const body = await req.json();
        if (!body.name || !body.type || !body.file_url) {
          return jsonResponse(
            { error: { code: 'BAD_REQUEST', message: 'name, type, and file_url are required' } },
            400,
          );
        }
        rpcParams.p_name = body.name;
        rpcParams.p_type = body.type;
        rpcParams.p_file_url = body.file_url;
        rpcParams.p_file_size = body.file_size || 0;
        break;
      }
    }

    // Execute RPC
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(rpcName, rpcParams);

    if (rpcError) {
      console.error(`[api-gateway] RPC ${rpcName} error:`, rpcError);
      return jsonResponse(
        { error: { code: 'INTERNAL_ERROR', message: `Database operation failed: ${rpcError.message}` } },
        500,
      );
    }

    // ------------------------------------------------------------------
    // 8. Response formatting
    // ------------------------------------------------------------------

    // Single resource endpoints: check for null (not found)
    if (['api_get_screen', 'api_get_playlist'].includes(rpcName)) {
      if (!rpcData) {
        return jsonResponse(
          { error: { code: 'NOT_FOUND', message: 'Resource not found' } },
          404,
        );
      }
      return jsonResponse({ data: rpcData });
    }

    // Update endpoints: check for error in result or null
    if (['api_update_playlist', 'api_update_screen_assignment', 'api_create_media_record'].includes(rpcName)) {
      if (!rpcData) {
        return jsonResponse(
          { error: { code: 'NOT_FOUND', message: 'Resource not found or not owned by your tenant' } },
          404,
        );
      }
      if (rpcData.error) {
        return jsonResponse(
          { error: { code: 'BAD_REQUEST', message: rpcData.error } },
          400,
        );
      }
      return jsonResponse({ data: rpcData });
    }

    // List endpoints: return with meta
    if (rpcName.startsWith('api_list_')) {
      return jsonResponse({
        data: rpcData?.items || [],
        meta: {
          total_count: rpcData?.total_count || 0,
          limit: rpcParams.p_limit,
          offset: rpcParams.p_offset,
        },
      });
    }

    // Fallback
    return jsonResponse({ data: rpcData });

  } catch (err) {
    console.error('[api-gateway] Unhandled error:', err);
    return jsonResponse(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
        },
      },
      500,
    );
  }
});
