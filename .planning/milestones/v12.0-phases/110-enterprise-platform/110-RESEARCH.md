# Phase 110: Enterprise Platform - Research

**Researched:** 2026-03-04
**Domain:** Enterprise SSO (SAML 2.0), Public REST API with scoped tokens, Proof of Play reporting
**Confidence:** HIGH

## Summary

Phase 110 builds three enterprise capabilities atop a substantial foundation of existing code. The SSO infrastructure already exists -- `sso_providers` table (migration 036), `ssoService.js` with provider CRUD, and `EnterpriseSecurityPage.jsx` with a full SSO configuration form. The critical gap is wiring the actual `supabase.auth.signInWithSSO()` call into the login flow and registering providers via the Supabase CLI/Management API (the current implementation stores config locally but never delegates to Supabase GoTrue). The API infrastructure is similarly mature -- `api_tokens` table (migration 031), `apiTokenService.js` with full lifecycle management, `DeveloperSettingsPage.jsx` with token creation UI, and a `validate_api_token()` RPC. What is missing is the Edge Function API gateway that validates tokens and proxies requests. For Proof of Play, `playbackTrackingService.js` already captures `MEDIA_PLAY`, `SCENE_START`, `SCENE_END` events with offline queueing and batch insertion -- the gap is a dedicated reporting UI and CSV export, plus table partitioning for long-term performance.

**Primary recommendation:** Leverage the extensive existing codebase. SSO = wire `signInWithSSO()` + login flow integration. API = build one `api-gateway` Edge Function using the existing token validation RPC. PoP = add partitioning to `playback_events` table + reporting page with CSV export. No new npm packages required for any of the three features.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SSO-01 | Admin can configure a SAML identity provider with IdP metadata URL | Existing `sso_providers` table has `metadata_url` column; `ssoService.js` has `saveSSOProvider()`. Need to add Supabase CLI registration step or Management API call to register with GoTrue. |
| SSO-02 | Users can sign in via SSO from the login page | `supabase.auth.signInWithSSO({ domain })` documented and verified. Login page needs SSO button/redirect when domain matches a provider. |
| SSO-03 | SSO login creates a proper Supabase Auth session (preserves RLS) | Supabase GoTrue handles SAML assertion processing and creates a real session with `auth.uid()`. JWT includes `amr` claim with provider UUID. RLS preserved by design. |
| SSO-04 | Admin can enforce SSO-only login for their tenant | `sso_providers.enforce_sso` column exists; `is_sso_enforced()` RPC exists; `isSSOEnforced()` service function exists. Wire into login page to block email/password when enforced. |
| SSO-05 | System auto-detects SSO by email domain and redirects accordingly | `signInWithSSO({ domain })` matches on registered domains. Need: email domain extraction on login page, pre-check against SSO providers by domain. |
| API-01 | Admin can generate API tokens with scoped permissions | `apiTokenService.js` `createToken()` fully implemented with `biz_` prefix, SHA-256 hash, scoped permissions. `DeveloperSettingsPage.jsx` has create token modal. |
| API-02 | API supports reading screens, playlists, and media via REST endpoints | Need: `api-gateway` Edge Function with route table. Need: `api_list_screens`, `api_list_playlists`, `api_list_media` RPCs accepting `p_tenant_id`. |
| API-03 | API supports uploading media assets | Need: media upload endpoint in `api-gateway` that accepts multipart/form-data, uploads to S3 via presigned URL, creates `media_assets` record. |
| API-04 | API supports updating playlists and screen assignments | Need: `api_update_playlist`, `api_update_screen_assignment` RPCs with `p_tenant_id` scope. |
| API-05 | API rate limits requests per token | Existing `check_rate_limit()` RPC (migration 116) with `pg_advisory_xact_lock` and configurable window. Existing `api_request_logs` table (migration 107). Apply per `token_id` identifier. |
| API-06 | API documentation page available in developer settings | Need: static API docs section in `DeveloperSettingsPage.jsx` or a dedicated page. Swagger/OpenAPI spec optional for v1. |
| API-07 | API tokens are tenant-isolated (cannot access other tenants' data) | `api_tokens.owner_id` provides tenant context. Each API RPC must accept `p_tenant_id` from token validation (never from request body). `SECURITY DEFINER` RPCs scope all queries to tenant. |
| POP-01 | Player logs content playback events (item ID, start time, duration, screen ID) | `playbackTrackingService.js` already tracks `MEDIA_PLAY` events with `mediaId`, `startedAt`, `endedAt`, `durationSeconds`, `screenId`. Already queues and batch-flushes via `insert_playback_events()` RPC. **Already implemented.** |
| POP-02 | User can view Proof of Play report with date range filter | Need: `ProofOfPlayPage.jsx` with date range picker, screen selector, content filter. Aggregation RPC `get_proof_of_play_report()`. |
| POP-03 | User can export Proof of Play data as CSV | Need: client-side CSV generation from report data. No server-side file generation required. |
| POP-04 | Proof of Play data is partitioned by month for performance | Need: ALTER `playback_events` to use RANGE partitioning on `created_at` by month. Create initial partitions. Add pg_cron job (pattern from migration 150) to auto-create future partitions. |
| POP-05 | Dashboard shows playback summary statistics | Need: summary stat cards (total plays, total hours, unique content, active screens) on the Proof of Play page or existing analytics dashboard. Existing RPCs `get_analytics_summary()` and `get_playback_summary_by_screen()` already compute these. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.80.0 | `signInWithSSO()`, Edge Function client, RPC calls | Already in project; SAML SSO is built into GoTrue -- no additional auth library needed |
| Supabase Edge Functions (Deno) | N/A | `api-gateway` Edge Function for REST API | Existing pattern (4 Edge Functions already deployed). Validates API tokens, routes requests, applies rate limiting |
| PostgreSQL RANGE partitioning | N/A | Partition `playback_events` by month | Native PostgreSQL feature. No extension beyond `pg_cron` (already enabled in migration 150) |
| `pg_cron` | Already enabled | Auto-create future monthly partitions | Pattern established in migration 150 for offline detection |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing `apiTokenService.js` | N/A | Token CRUD, rotation, expiration | Already complete. No changes needed for API-01 |
| Existing `ssoService.js` | N/A | SSO provider config CRUD | Already complete. Add `signInWithSSO` call for SSO-02 |
| Existing `playbackTrackingService.js` | N/A | Player-side event capture and offline queue | Already complete for POP-01. No changes needed |
| Existing `check_rate_limit()` RPC | N/A | Rate limiting for API endpoints | Already complete (migration 116). Use with token_id as identifier for API-05 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Edge Function API gateway | PostgREST direct exposure | PostgREST exposes table structure; Edge Function gives clean REST interface, custom auth, and rate limiting |
| PostgreSQL-based rate limiting | Upstash Redis | External dependency; PostgreSQL approach already works and is tested |
| Custom SAML XML parsing | `supabase.auth.signInWithSSO()` | Never hand-roll SAML. Supabase GoTrue handles canonicalization, signature validation, wrapping attack prevention |
| Server-side CSV generation | Client-side CSV from JSON | Client-side is simpler, no Edge Function needed. Acceptable for reports under 10k rows |
| `pg_partman` extension | Manual partition management with pg_cron | pg_partman may not be available on Supabase. Manual approach with pg_cron is proven (migration 150 pattern) |

**Installation:**
```bash
# No new npm packages required
# Edge Function deployment:
supabase functions deploy api-gateway
# SAML provider registration:
supabase sso add --type saml --project-ref <ref> --metadata-url '<idp-metadata-url>' --domains company.com
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── services/
│   ├── ssoService.js             # EXISTING -- add signInWithSSO integration
│   ├── apiTokenService.js        # EXISTING -- no changes needed
│   ├── playbackTrackingService.js # EXISTING -- no changes needed
│   └── proofOfPlayService.js     # NEW -- report aggregation and CSV export
├── pages/
│   ├── EnterpriseSecurityPage.jsx # EXISTING -- SSO config already present
│   ├── DeveloperSettingsPage.jsx  # EXISTING -- token management + add API docs tab
│   └── ProofOfPlayPage.jsx       # NEW -- report viewer with date range and export
├── auth/
│   └── LoginPage.jsx             # EXISTING -- add SSO domain detection and redirect
supabase/
├── functions/
│   ├── api-gateway/
│   │   └── index.ts              # NEW -- single Edge Function as API router
│   └── _shared/
│       └── cors.ts               # EXISTING
├── migrations/
│   ├── XXX_proof_of_play_partitioning.sql  # NEW -- partition playback_events
│   ├── XXX_api_gateway_rpcs.sql            # NEW -- api_list_*, api_get_* RPCs
│   └── XXX_sso_domain_lookup.sql           # NEW -- domain-to-provider lookup RPC
```

### Pattern 1: Supabase SSO Login Flow

**What:** Domain-based SSO auto-detection on login page
**When to use:** When user enters email and domain matches an SSO provider

```javascript
// In LoginPage.jsx
const handleEmailBlur = async () => {
  const domain = email.split('@')[1];
  if (!domain) return;

  // Check if domain has an SSO provider
  const { data: provider } = await supabase
    .from('sso_providers')
    .select('id, name, enforce_sso')
    .eq('is_enabled', true)
    .contains('domains', [domain])  // or custom RPC
    .maybeSingle();

  if (provider) {
    setSsoProvider(provider);
    if (provider.enforce_sso) {
      // Auto-redirect to SSO
      handleSSOLogin(domain);
    }
  }
};

const handleSSOLogin = async (domain) => {
  const { data, error } = await supabase.auth.signInWithSSO({ domain });
  if (error) {
    setError(error.message);
    return;
  }
  if (data?.url) {
    window.location.href = data.url;
  }
};
```
Source: [Supabase SSO Docs](https://supabase.com/docs/guides/auth/enterprise-sso/auth-sso-saml)

### Pattern 2: API Gateway Edge Function

**What:** Single Edge Function that validates tokens, checks scopes, and proxies to tenant-scoped RPCs
**When to use:** All external API requests from third-party integrations

```typescript
// supabase/functions/api-gateway/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const ROUTES = {
  'GET /v1/screens':     { rpc: 'api_list_screens',    scope: 'screens:read' },
  'GET /v1/screens/:id': { rpc: 'api_get_screen',      scope: 'screens:read' },
  'GET /v1/playlists':   { rpc: 'api_list_playlists',  scope: 'playlists:read' },
  'PUT /v1/playlists/:id': { rpc: 'api_update_playlist', scope: 'playlists:write' },
  'GET /v1/media':       { rpc: 'api_list_media',      scope: 'media:read' },
  'POST /v1/media':      { rpc: 'api_upload_media',    scope: 'media:write' },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 1. Extract token from Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer biz_')) {
    return jsonResponse({ error: 'Missing or invalid API token' }, 401);
  }
  const rawToken = authHeader.replace('Bearer ', '');

  // 2. Hash token and validate
  const tokenHash = await sha256(rawToken);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const { data: validation } = await supabase.rpc('validate_api_token', {
    p_token_hash: tokenHash
  });

  if (!validation?.valid) {
    return jsonResponse({ error: validation?.error || 'Invalid token' }, 401);
  }

  // 3. Rate limit check
  const { data: rateCheck } = await supabase.rpc('check_rate_limit', {
    p_identifier: validation.token_id,
    p_action: 'api_request',
    p_max_requests: 100,
    p_window_minutes: 15
  });

  if (!rateCheck?.allowed) {
    return jsonResponse(
      { error: 'Rate limit exceeded' },
      429,
      { 'Retry-After': String(rateCheck.retry_after_seconds) }
    );
  }

  // 4. Match route and check scope
  const route = matchRoute(req);
  if (!route) {
    return jsonResponse({ error: 'Not found' }, 404);
  }

  if (!validation.scopes.includes(route.scope)) {
    return jsonResponse({ error: 'Insufficient permissions' }, 403);
  }

  // 5. Call tenant-scoped RPC
  const { data, error } = await supabase.rpc(route.rpc, {
    p_tenant_id: validation.owner_id,
    ...route.params
  });

  return jsonResponse(data || { error: error?.message }, error ? 500 : 200);
});
```
Source: Project pattern from existing Edge Functions (weather-proxy, rss-proxy)

### Pattern 3: Monthly Table Partitioning

**What:** RANGE partition `playback_events` by `created_at` month for Proof of Play performance
**When to use:** Required per POP-04 from day one of PoP deployment

```sql
-- Convert playback_events to partitioned table
-- NOTE: PostgreSQL cannot add partitioning to existing table. Options:
-- Option A: Create new partitioned table, migrate data, rename
-- Option B: Use inheritance-based partitioning (legacy)
-- Recommended: Option A (clean, modern)

-- 1. Create new partitioned table
CREATE TABLE playback_events_partitioned (
  LIKE playback_events INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- 2. Create monthly partitions
CREATE TABLE playback_events_y2026m01
  PARTITION OF playback_events_partitioned
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE playback_events_y2026m02
  PARTITION OF playback_events_partitioned
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- ... etc for each month

-- 3. Create DEFAULT partition (catches any unpartitioned data)
CREATE TABLE playback_events_default
  PARTITION OF playback_events_partitioned DEFAULT;

-- 4. pg_cron job to create next month's partition automatically
SELECT cron.schedule(
  'create_monthly_playback_partition',
  '0 0 25 * *',  -- Run on 25th of each month
  $$
    SELECT create_next_playback_partition();
  $$
);
```
Source: [PostgreSQL Partitioning Docs](https://www.postgresql.org/docs/current/ddl-partitioning.html), project pattern from migration 150

### Anti-Patterns to Avoid

- **Custom SAML XML parsing:** Never parse SAML assertions in an Edge Function or browser. Use `supabase.auth.signInWithSSO()` exclusively. Supabase GoTrue handles canonicalization, signature validation, and wrapping attack prevention.

- **Trusting tenant_id from API request body:** The API gateway MUST extract `tenant_id` from the validated token (via `validate_api_token()`), never from the request body or query parameters. This is the sole mechanism for tenant isolation.

- **Adding partitioning after data grows:** POP-04 explicitly requires partitioning from day one. Converting a large table to partitioned is a data migration. Start partitioned.

- **Separate Edge Functions per API endpoint:** One `api-gateway` function with internal routing. Multiple functions create deployment complexity and duplicate auth/rate-limit logic.

- **Exposing PostgREST directly for API:** PostgREST exposes table structure, uses Supabase auth (not API tokens), and cannot rate-limit per external token. Edge Function gateway is the correct approach.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SAML assertion processing | Custom SAML parser or Edge Function | `supabase.auth.signInWithSSO()` | SAML has canonicalization attacks, wrapping attacks, signature verification edge cases. GoTrue handles all of these. |
| Token generation/hashing | Custom crypto | Existing `apiTokenService.js` | Already implements `biz_` prefix, `crypto.subtle.digest('SHA-256')`, secure random generation |
| Rate limiting | Custom in-memory counters | Existing `check_rate_limit()` RPC | Already implements advisory locking, sliding window, retry-after calculation |
| Playback event capture | New tracking system | Existing `playbackTrackingService.js` | Already handles offline queuing, batch flush, 30s intervals, all event types |
| CSV export | Server-side file generation | Client-side CSV from JSON | Simple string construction from tabular data. No library needed for < 10k rows |

**Key insight:** This phase is about wiring existing infrastructure together, not building new systems. SSO config exists but is not connected to GoTrue. API tokens exist but have no gateway. Playback tracking exists but has no reporting UI.

## Common Pitfalls

### Pitfall 1: SSO Bypassing Supabase Auth and Breaking RLS

**What goes wrong:** If SAML is implemented as a separate auth mechanism (custom Edge Function processing SAML assertions), users have no `auth.uid()` and all RLS policies return empty results. The entire app breaks.
**Why it happens:** Developers unfamiliar with Supabase try to handle SAML themselves.
**How to avoid:** Use `supabase.auth.signInWithSSO()` exclusively. SSO users MUST end up with a real Supabase Auth session. The JWT `amr` claim confirms SSO authentication.
**Warning signs:** SSO users see empty screens, playlists, or media after login. `auth.uid()` returns null in service calls.

### Pitfall 2: API Token Tenant Leakage

**What goes wrong:** An API RPC accepts `p_tenant_id` from the request body instead of from the validated token. A malicious caller sends another tenant's ID and reads their data.
**Why it happens:** Developer passes request parameters directly to RPC without filtering.
**How to avoid:** The `api-gateway` Edge Function extracts `owner_id` from `validate_api_token()` result. This `owner_id` is passed as `p_tenant_id` to EVERY RPC. Never accept tenant_id from the request.
**Warning signs:** API endpoint code that reads `req.body.tenantId` or `req.query.tenantId` and passes it to an RPC.

### Pitfall 3: Unpartitioned Proof of Play Table Grows Unbounded

**What goes wrong:** `playback_events` table has millions of rows within months (one row per media play per screen, 30-second flush cycle). Queries for reports become slow. DELETE for data retention is expensive.
**Why it happens:** Partitioning is deferred as "optimization we can do later."
**How to avoid:** POP-04 explicitly requires partition by month from day one. Create the partitioned table structure in the initial migration. Add pg_cron job for auto-partition creation.
**Warning signs:** Report page takes > 5 seconds to load. Analytics RPCs time out.

### Pitfall 4: SSO Domain Lookup Fails on First Login

**What goes wrong:** User enters email, system checks `sso_providers` table for matching domain, but no domain column exists (current schema has no `domains` array column).
**Why it happens:** The existing `sso_providers` table stores metadata_url but not the email domains associated with the provider.
**How to avoid:** Add a `domains TEXT[]` column to `sso_providers` (or a separate `sso_domains` lookup table) mapping email domains to provider IDs. The Supabase CLI `--domains` flag registers this on the GoTrue side, but the admin UI also needs to store it for pre-login detection.
**Warning signs:** Login page cannot detect SSO before the user clicks "Sign in with SSO."

### Pitfall 5: Converting Existing Table to Partitioned

**What goes wrong:** PostgreSQL does not support `ALTER TABLE ... PARTITION BY`. You cannot add partitioning to an existing table in place.
**Why it happens:** Developer assumes partitioning can be retrofitted like adding an index.
**How to avoid:** Create a new partitioned table with the same schema, migrate existing data with `INSERT INTO ... SELECT FROM`, rename tables. Do this in a single migration.
**Warning signs:** Migration fails with "cannot add partition to non-partitioned table."

## Code Examples

Verified patterns from official sources and existing project code:

### SSO Domain-Based Auto-Detection (Login Page)

```javascript
// src/auth/LoginPage.jsx -- add to existing component
import { supabase } from '../supabase';

const handleEmailBlur = async () => {
  const domain = email.split('@')[1];
  if (!domain) return;

  // Check local sso_providers table for domain match
  const { data } = await supabase.rpc('lookup_sso_by_domain', {
    p_domain: domain
  });

  if (data?.provider_id) {
    setSsoDetected(true);
    setSsoProviderName(data.provider_name);

    if (data.enforce_sso) {
      // Auto-redirect: password field not needed
      const { data: ssoData, error } = await supabase.auth.signInWithSSO({
        domain: domain
      });
      if (ssoData?.url) {
        window.location.href = ssoData.url;
      }
    }
  }
};
```
Source: [Supabase signInWithSSO API](https://supabase.com/docs/reference/javascript/auth-signinwithsso)

### API Gateway Token Validation

```typescript
// supabase/functions/api-gateway/index.ts
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function validateToken(supabase, rawToken) {
  const tokenHash = await sha256(rawToken);
  const { data, error } = await supabase.rpc('validate_api_token', {
    p_token_hash: tokenHash
  });

  if (error || !data?.valid) {
    return { valid: false, error: data?.error || 'Invalid token' };
  }

  return {
    valid: true,
    tokenId: data.token_id,
    ownerId: data.owner_id,  // THIS IS THE TENANT ID
    scopes: data.scopes,
  };
}
```
Source: Existing `validate_api_token()` RPC from migration 031

### Proof of Play Report Aggregation RPC

```sql
CREATE OR REPLACE FUNCTION get_proof_of_play_report(
  p_tenant_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_screen_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  screen_name TEXT,
  content_name TEXT,
  content_type TEXT,
  total_plays BIGINT,
  total_duration_seconds BIGINT,
  first_played TIMESTAMPTZ,
  last_played TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    td.name AS screen_name,
    COALESCE(ma.name, s.name, pl.name, 'Unknown') AS content_name,
    pe.item_type AS content_type,
    COUNT(pe.id)::BIGINT AS total_plays,
    COALESCE(SUM(pe.duration_seconds), 0)::BIGINT AS total_duration_seconds,
    MIN(pe.started_at) AS first_played,
    MAX(pe.started_at) AS last_played
  FROM playback_events pe
  JOIN tv_devices td ON td.id = pe.screen_id
  LEFT JOIN media_assets ma ON ma.id = pe.media_id
  LEFT JOIN scenes s ON s.id = pe.scene_id
  LEFT JOIN playlists pl ON pl.id = pe.playlist_id
  WHERE pe.tenant_id = p_tenant_id
    AND pe.created_at >= p_start_date
    AND pe.created_at < p_end_date
    AND pe.event_type IN ('media_play', 'scene_end')
    AND pe.duration_seconds IS NOT NULL
    AND (p_screen_ids IS NULL OR pe.screen_id = ANY(p_screen_ids))
  GROUP BY td.name, content_name, pe.item_type
  ORDER BY total_plays DESC;
END;
$$;
```
Source: Project pattern from existing analytics RPCs (migrations 022, 079)

### Client-Side CSV Export

```javascript
// src/services/proofOfPlayService.js
export function exportToCSV(reportData) {
  const headers = [
    'Screen', 'Content', 'Type', 'Total Plays',
    'Total Duration (seconds)', 'First Played', 'Last Played'
  ];

  const rows = reportData.map(row => [
    row.screen_name,
    row.content_name,
    row.content_type,
    row.total_plays,
    row.total_duration_seconds,
    new Date(row.first_played).toISOString(),
    new Date(row.last_played).toISOString(),
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `proof-of-play-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
```
Source: Standard browser CSV export pattern

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom SAML processing in application | Supabase GoTrue `signInWithSSO()` | Supabase 2.x (2023+) | Eliminates SAML parsing, canonicalization, signature validation. Session is a real Supabase JWT. |
| API keys validated by application middleware | Edge Function with RPC-based token validation | Project convention (migration 031, 107) | Centralized validation with hash comparison, scope checking, and usage tracking |
| Single unpartitioned analytics table | PostgreSQL native RANGE partitioning by month | PostgreSQL 10+ (2017+) | Partition pruning, efficient retention (DROP partition), parallel scans |
| Full-table DELETE for data retention | DROP PARTITION for month cleanup | PostgreSQL 10+ | Instantaneous vs. vacuum-heavy DELETE. Critical for compliance data |

**Deprecated/outdated:**
- `ssoService.initiateSSOLogin()`: Current implementation manually constructs OIDC auth URLs and stores sessions in `sso_sessions` table. This should be replaced entirely by `supabase.auth.signInWithSSO()` which handles everything server-side.
- Custom `sso_sessions` table: Not needed when using Supabase GoTrue for SSO. GoTrue manages its own session state.

## Open Questions

1. **Supabase CLI SSO Registration vs. Management API**
   - What we know: SAML providers must be registered with Supabase GoTrue via `supabase sso add` CLI command. The admin UI can store config in `sso_providers` table.
   - What's unclear: Can the Management API be called from the admin UI to register providers programmatically, or must it be done via CLI? The Management API exposes SSO endpoints but requires a management token.
   - Recommendation: For v1, document the CLI registration step in the admin UI (show the command to run). Programmatic registration via Management API is a nice-to-have enhancement.

2. **Domain Column on sso_providers Table**
   - What we know: Supabase `signInWithSSO({ domain })` looks up by domain on the GoTrue side. The current `sso_providers` table does NOT have a `domains` column.
   - What's unclear: Whether to store domains in the `sso_providers` table for UI pre-detection, or create a separate lookup RPC that queries GoTrue.
   - Recommendation: Add a `domains TEXT[]` column to `sso_providers`. Admin enters domains when configuring SSO. Login page queries this column for pre-login detection. GoTrue's domain is registered via CLI separately.

3. **Existing playback_events Data Migration**
   - What we know: The `playback_events` table exists with data. PostgreSQL cannot add partitioning in-place.
   - What's unclear: How much existing data is in the table (likely minimal in dev). Whether migration needs to handle existing data gracefully.
   - Recommendation: In the migration, create new partitioned table, INSERT existing data, rename old to `_old`, rename new to original name. Drop `_old` after verification. Include a DEFAULT partition to catch edge cases.

4. **API Media Upload Flow**
   - What we know: Current media upload uses S3 presigned URLs via Vite dev middleware. The Edge Function needs an equivalent flow.
   - What's unclear: Whether the Edge Function should generate presigned URLs and return them (client uploads to S3 directly) or whether it should proxy the upload.
   - Recommendation: Edge Function generates presigned URL and returns it. Client uploads directly to S3. Edge Function creates `media_assets` record after successful upload confirmation. This matches the existing pattern.

## Sources

### Primary (HIGH confidence)
- [Supabase SAML SSO Docs](https://supabase.com/docs/guides/auth/enterprise-sso/auth-sso-saml) - Complete SAML setup guide, signInWithSSO flow, SP metadata, IdP-initiated workaround
- [Supabase signInWithSSO API Reference](https://supabase.com/docs/reference/javascript/auth-signinwithsso) - Method signature, parameters (domain, providerId, redirectTo), return type
- [PostgreSQL Table Partitioning Docs](https://www.postgresql.org/docs/current/ddl-partitioning.html) - RANGE partitioning syntax, partition pruning, management
- Existing project migrations: 031 (api_tokens), 036 (sso_providers), 022/079/099 (playback_events), 107 (api_request_logs), 116 (rate limiting), 150 (pg_cron)
- Existing project services: `ssoService.js`, `apiTokenService.js`, `playbackTrackingService.js`, `rateLimitService.js`
- Existing project pages: `EnterpriseSecurityPage.jsx`, `DeveloperSettingsPage.jsx`

### Secondary (MEDIUM confidence)
- [Supabase Rate Limiting Edge Functions](https://supabase.com/docs/guides/functions/examples/rate-limiting) - Upstash Redis pattern (project uses PostgreSQL-based alternative)
- [Supabase Enterprise SSO Overview](https://supabase.com/docs/guides/auth/enterprise-sso) - High-level SSO architecture, pricing ($0.015/SSO MAU)
- Previous v12.0 research: `.planning/research/ARCHITECTURE.md`, `.planning/research/STACK.md` - SSO, API, PoP architecture patterns

### Tertiary (LOW confidence)
- None. All findings verified against official documentation and existing project code.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed. All capabilities are in existing Supabase SDK and project code
- Architecture: HIGH - Clear patterns from existing Edge Functions, existing service layer, existing migrations. SSO flow documented by Supabase
- Pitfalls: HIGH - Well-known SAML security issues. Tenant isolation is a verified concern. Partitioning constraints are PostgreSQL fundamentals

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable domain -- Supabase SSO and PostgreSQL partitioning are mature features)
