# Phase 112: Canva and Video Wall - Research

**Researched:** 2026-03-05
**Domain:** Canva Connect API integration, multi-screen video wall synchronization via Supabase Realtime
**Confidence:** MEDIUM

## Summary

This phase has two distinct feature areas: Canva integration (CANVA-01 through CANVA-04) and Video Wall (VWALL-01 through VWALL-04). Both build on existing project infrastructure but require new backend components.

**Canva integration** has significant existing scaffolding: `canvaService.js` already implements OAuth PKCE flow, token exchange, design listing, and export polling. However, the current implementation makes direct browser-to-Canva API calls which **will be blocked by CORS** -- Canva requires token exchange and API calls to go through a backend server. A `canva-proxy` Supabase Edge Function is mandatory, following the same pattern as `calendar-proxy`. The OAuth scopes in the existing service (`design:content:read`, `design:content:write`, `asset:read`, `asset:write`, `profile:read`) need adjustment -- listing designs requires `design:meta:read`, and exporting requires `design:content:read`. The existing `CanvaCallbackPage.jsx` handles the OAuth redirect correctly and can be reused with minor modifications.

**Video wall** requires a new database table for wall configurations, a leader/follower synchronization pattern using Supabase Realtime Broadcast (not postgres_changes), and bezel compensation math in the player. The project already uses Supabase Realtime extensively via `realtimeService.js` and `deviceSyncService.js` for device commands and content updates, but only via postgres_changes listeners. Broadcast channels (ephemeral pub/sub without database writes) are the correct primitive for sub-200ms sync and are already available in `@supabase/supabase-js@^2.80.0`.

**Primary recommendation:** Build a `canva-proxy` Edge Function for all Canva API calls (token exchange, list designs, export), then wire the existing `canvaService.js` to invoke it via `supabase.functions.invoke()`. For video wall, use Supabase Realtime Broadcast with a leader/follower pattern where the leader broadcasts playback timestamps and followers align their playback position.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CANVA-01 | User can browse their Canva designs from within BizScreen | Canva List Designs API (`GET /v1/designs`) via canva-proxy Edge Function; returns paginated designs with thumbnails |
| CANVA-02 | User can import a Canva design as a media asset (rendered as image) | Canva Export API (`POST /v1/exports`) to export as PNG, download URL, upload to Supabase Storage as media_asset |
| CANVA-03 | Imported Canva designs display correctly on the screen player | Standard image media_asset -- player already renders images; no special player work needed |
| CANVA-04 | User can re-import updated Canva designs to refresh content | Re-export design via Export API, replace file in Supabase Storage, update media_asset record with new URL/timestamp |
| VWALL-01 | Admin can create a video wall configuration (grid of screens) | New `video_walls` table with grid dimensions; admin UI for wall CRUD |
| VWALL-02 | Admin can define screen positions within the wall grid (rows x columns) | `video_wall_screens` junction table mapping screen IDs to row/column positions |
| VWALL-03 | Video wall distributes content across screens with bezel compensation | Player-side CSS transform with bezel gap parameters from wall config; scale + translate per screen position |
| VWALL-04 | Screens in a video wall synchronize content playback via Realtime (within 200ms) | Supabase Realtime Broadcast channel per wall; leader broadcasts timestamps; followers adjust playback |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.80.0 | Realtime Broadcast + Edge Function invocation | Already in project; has broadcast channel support |
| Supabase Edge Functions (Deno) | Latest | canva-proxy for server-side Canva API calls | Project pattern; calendar-proxy, rss-proxy, doc-converter already exist |
| Canva Connect API v1 | v1 | Design listing, export, OAuth token exchange | Official Canva REST API |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | existing | Icons (Grid3X3 for video wall, Palette for Canva) | Already in project for all icons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Realtime Broadcast | WebRTC DataChannel | Lower latency but much more complex; overkill for 200ms target |
| Edge Function for Canva proxy | Direct browser calls | Won't work -- Canva blocks CORS for token exchange and API calls |
| Polling for export status | Webhooks | Canva supports webhooks but Edge Function polling is simpler for async export jobs (30s max) |

**Installation:**
```bash
# No new npm packages needed -- all dependencies already in project
# New Edge Function: supabase/functions/canva-proxy/index.ts
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  services/
    canvaService.js          # MODIFY: Rewire to use Edge Function instead of direct API calls
  pages/
    CanvaCallbackPage.jsx    # EXISTING: Minor updates for scope/redirect
    VideoWallPage.jsx         # NEW: Admin video wall configuration page
  components/
    canva/
      CanvaDesignBrowser.jsx  # NEW: Browse/import modal for Canva designs
      CanvaDesignCard.jsx     # NEW: Thumbnail card for a Canva design
    video-wall/
      VideoWallConfigurator.jsx  # NEW: Grid editor for wall layout
      VideoWallScreenGrid.jsx    # NEW: Visual grid with drag-drop screen assignment
  player/
    components/
      VideoWallSync.jsx       # NEW: Leader/follower sync logic for player
supabase/
  functions/
    canva-proxy/
      index.ts                # NEW: Server-side Canva API proxy
  migrations/
    165_canva_tokens_video_walls.sql  # NEW: Tables for Canva tokens + video wall configs
```

### Pattern 1: Edge Function Proxy (Canva API)
**What:** All Canva API calls go through a Supabase Edge Function that holds the client secret and handles token refresh
**When to use:** Every Canva API interaction (token exchange, list designs, export)
**Example:**
```javascript
// Source: Existing project pattern (calendar-proxy, rss-proxy)
// Client side: src/services/canvaService.js
export async function listCanvaDesigns({ query, continuation, limit = 25 } = {}) {
  const { data, error } = await supabase.functions.invoke('canva-proxy', {
    body: {
      action: 'list_designs',
      query,
      continuation,
      limit,
    },
  });
  if (error) throw error;
  return data;
}

// Edge Function side: supabase/functions/canva-proxy/index.ts
// Reads canva_oauth_tokens from DB, refreshes if expired,
// calls Canva API, returns results
```

### Pattern 2: Supabase Realtime Broadcast (Video Wall Sync)
**What:** Ephemeral pub/sub messaging between screens in a video wall without database writes
**When to use:** Synchronizing playback state across screens within 200ms
**Example:**
```javascript
// Source: https://supabase.com/docs/guides/realtime/broadcast
// Leader screen broadcasts playback position
const wallChannel = supabase.channel(`video-wall:${wallId}`, {
  config: { broadcast: { self: false } },
});

wallChannel.subscribe((status) => {
  if (status !== 'SUBSCRIBED') return;
  // Leader sends sync messages every ~500ms
  setInterval(() => {
    wallChannel.send({
      type: 'broadcast',
      event: 'sync',
      payload: {
        currentIndex: playbackState.currentIndex,
        timestamp: Date.now(),
        itemStartTime: playbackState.itemStartTime,
      },
    });
  }, 500);
});

// Follower screens listen and adjust
wallChannel.on('broadcast', { event: 'sync' }, (payload) => {
  const { currentIndex, timestamp, itemStartTime } = payload.payload;
  const drift = Date.now() - timestamp;
  if (drift < 200) {
    // Within tolerance -- align index
    if (currentIndex !== localIndex) {
      setCurrentIndex(currentIndex);
    }
  }
});
```

### Pattern 3: Bezel Compensation CSS Transform
**What:** Scale and translate content so a single image spans multiple physical screens with bezel gap correction
**When to use:** Rendering content on a specific screen within a video wall grid
**Example:**
```javascript
// Each screen knows its position (row, col) and total grid size (rows, cols)
// bezelGap is the physical gap in pixels equivalent
function getWallTransform({ row, col, rows, cols, bezelGapX, bezelGapY }) {
  const scaleX = cols;
  const scaleY = rows;
  // Offset includes bezel compensation
  const translateX = -(col * 100) - (col * bezelGapX / cols);
  const translateY = -(row * 100) - (row * bezelGapY / rows);
  return {
    transform: `scale(${scaleX}, ${scaleY})`,
    transformOrigin: '0 0',
    left: `${translateX}%`,
    top: `${translateY}%`,
  };
}
```

### Anti-Patterns to Avoid
- **Direct browser Canva API calls:** CORS will block them. Always proxy through Edge Function.
- **Storing Canva tokens in localStorage:** The existing `canvaService.js` does this -- must migrate to database-backed storage in `canva_oauth_tokens` table for security and server-side refresh.
- **Using postgres_changes for wall sync:** Too slow (database write round-trip). Use Broadcast for ephemeral sync messages.
- **Frame-perfect video sync:** Out of scope per REQUIREMENTS.md. Software loose-sync (200ms) is the target; do not attempt genlock or NTP-based approaches.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Canva OAuth token management | Custom token refresh logic in browser | Edge Function with DB-backed tokens | CORS blocks direct calls; server handles refresh transparently |
| Realtime messaging | Custom WebSocket server | Supabase Realtime Broadcast | Already included in Supabase; handles reconnection, global routing |
| Design export polling | Custom retry/backoff for export jobs | Edge Function with simple poll loop | Export completes in <30s; Edge Function handles the wait server-side |
| Bezel compensation math | Manual pixel calculations per screen | CSS transform with scale/translate | Browser handles sub-pixel rendering; CSS transforms are GPU-accelerated |

**Key insight:** Both features are primarily orchestration of existing primitives (Canva API via proxy, Supabase Broadcast). The complexity is in correct wiring, not novel algorithms.

## Common Pitfalls

### Pitfall 1: Canva CORS Blocking
**What goes wrong:** Direct browser calls to Canva API endpoints (token exchange, list designs, export) fail silently or with CORS errors
**Why it happens:** Canva requires client_secret for token exchange which must not be exposed client-side; API calls need server-to-server auth
**How to avoid:** ALL Canva API calls must go through the canva-proxy Edge Function. The client never calls api.canva.com directly.
**Warning signs:** Network tab shows CORS preflight failures to api.canva.com

### Pitfall 2: Export Job Timeout
**What goes wrong:** Canva export API is asynchronous. If the Edge Function returns before export completes, client gets no download URL.
**Why it happens:** Large/complex designs can take 10-30 seconds to export
**How to avoid:** Edge Function polls the export job status internally before returning. Set a 30-second timeout with 1-second intervals. If still pending, return job ID for client-side polling.
**Warning signs:** Empty URLs in export response, export status stuck at "in_progress"

### Pitfall 3: Canva Token Expiry During Browse
**What goes wrong:** User's Canva access token expires while browsing designs, causing 401 errors
**Why it happens:** Canva access tokens expire (typically 4 hours). If user leaves tab open, token expires.
**How to avoid:** Edge Function checks token expiry before each API call; refreshes using stored refresh_token from DB. Same pattern as calendar-proxy.
**Warning signs:** 401 responses from Canva API after initial success

### Pitfall 4: Broadcast Channel Not Ready
**What goes wrong:** Leader sends sync messages before followers have subscribed, causing initial desync
**Why it happens:** Screens boot at different times; channel subscription is async
**How to avoid:** Leader waits for Presence (or a "ready" broadcast from followers) before starting content playback. Add a 3-second grace period after all expected screens report ready.
**Warning signs:** First content item skipped or shown at wrong position on some screens

### Pitfall 5: Video Wall Drift Over Time
**What goes wrong:** Screens gradually desync beyond 200ms due to JavaScript timer imprecision
**Why it happens:** `setTimeout`/`setInterval` are not precise; each screen's clock may differ
**How to avoid:** Leader broadcasts absolute timestamps, not relative offsets. Followers calculate drift from leader timestamp and adjust. Re-sync on every content item transition.
**Warning signs:** Screens visibly out of sync after running for >1 hour

### Pitfall 6: Canva Design Thumbnail Expiry
**What goes wrong:** Thumbnail URLs from Canva List Designs API expire after 15 minutes; UI shows broken images
**Why it happens:** Canva returns temporary URLs for privacy/security
**How to avoid:** Treat thumbnails as ephemeral; re-fetch on modal open. Do not cache thumbnail URLs in state long-term.
**Warning signs:** Broken image icons in the design browser after leaving modal open

## Code Examples

### Canva Proxy Edge Function Structure
```typescript
// Source: Project pattern from supabase/functions/calendar-proxy/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const CANVA_API_URL = 'https://api.canva.com/rest/v1';
const CANVA_TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Verify JWT
  const authHeader = req.headers.get('Authorization');
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader?.replace('Bearer ', ''),
  );
  if (authError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const { action, ...params } = await req.json();

  switch (action) {
    case 'exchange_token':
      return handleTokenExchange(supabase, user.id, params);
    case 'list_designs':
      return handleListDesigns(supabase, user.id, params);
    case 'export_design':
      return handleExportDesign(supabase, user.id, params);
    case 'check_connection':
      return handleCheckConnection(supabase, user.id);
    default:
      return jsonResponse({ error: 'Unknown action' }, 400);
  }
});
```

### Creating Media Asset from Canva Export
```javascript
// Source: Existing pattern from src/services/mediaService.js
import { supabase } from '../supabase';

export async function importCanvaDesign(designId, designTitle) {
  // 1. Export via Edge Function (waits for completion)
  const { data: exportResult } = await supabase.functions.invoke('canva-proxy', {
    body: { action: 'export_design', designId, format: 'png' },
  });

  // 2. Download the exported image
  const imageResponse = await fetch(exportResult.urls[0]);
  const imageBlob = await imageResponse.blob();

  // 3. Upload to Supabase Storage
  const fileName = `canva-${designId}-${Date.now()}.png`;
  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(fileName, imageBlob, { contentType: 'image/png' });
  if (uploadError) throw uploadError;

  // 4. Create media_asset record
  const { data: publicUrl } = supabase.storage.from('media').getPublicUrl(fileName);
  const { data: asset, error } = await supabase
    .from('media_assets')
    .insert({
      name: designTitle,
      type: 'image',
      url: publicUrl.publicUrl,
      file_size: imageBlob.size,
      mime_type: 'image/png',
      metadata: { source: 'canva', canva_design_id: designId },
    })
    .select()
    .single();
  if (error) throw error;
  return asset;
}
```

### Video Wall Database Schema
```sql
-- Migration: 165_canva_tokens_video_walls.sql

-- Canva OAuth tokens (server-side storage)
CREATE TABLE canva_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ NOT NULL,
  scopes TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Video wall configurations
CREATE TABLE video_walls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rows INTEGER NOT NULL CHECK (rows >= 1 AND rows <= 10),
  cols INTEGER NOT NULL CHECK (cols >= 1 AND cols <= 10),
  bezel_gap_x NUMERIC DEFAULT 0,  -- horizontal bezel gap in mm
  bezel_gap_y NUMERIC DEFAULT 0,  -- vertical bezel gap in mm
  playlist_id UUID REFERENCES playlists(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Screen positions within a video wall
CREATE TABLE video_wall_screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wall_id UUID NOT NULL REFERENCES video_walls(id) ON DELETE CASCADE,
  screen_id UUID NOT NULL REFERENCES tv_devices(id) ON DELETE CASCADE,
  row_position INTEGER NOT NULL CHECK (row_position >= 0),
  col_position INTEGER NOT NULL CHECK (col_position >= 0),
  is_leader BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(wall_id, row_position, col_position),
  UNIQUE(wall_id, screen_id)
);

-- RLS policies
ALTER TABLE canva_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_walls ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_wall_screens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own Canva tokens"
  ON canva_oauth_tokens FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Tenant members manage video walls"
  ON video_walls FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant members manage wall screens"
  ON video_wall_screens FOR ALL
  USING (wall_id IN (
    SELECT id FROM video_walls
    WHERE tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  ));
```

### Video Wall Broadcast Sync (Player)
```javascript
// Source: https://supabase.com/docs/guides/realtime/broadcast
import { supabase } from '../../supabase';

export function useVideoWallSync(wallId, screenPosition, isLeader) {
  const channelRef = useRef(null);

  useEffect(() => {
    if (!wallId) return;

    const channel = supabase.channel(`video-wall:${wallId}`, {
      config: { broadcast: { self: false } },
    });

    if (!isLeader) {
      // Follower: listen for sync events
      channel.on('broadcast', { event: 'sync' }, ({ payload }) => {
        onSyncMessage(payload);
      });
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Announce presence
        channel.send({
          type: 'broadcast',
          event: 'ready',
          payload: { screenPosition, isLeader },
        });
      }
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wallId, screenPosition, isLeader]);

  // Leader calls this to broadcast sync state
  const broadcastSync = useCallback((state) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'sync',
      payload: {
        currentIndex: state.currentIndex,
        timestamp: Date.now(),
        itemStartTime: state.itemStartTime,
      },
    });
  }, []);

  return { broadcastSync };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Canva Button SDK (embed) | Canva Connect API v1 (REST) | 2024 | Full server-side control; no embedded iframe dependency |
| WebSocket custom server for sync | Supabase Realtime Broadcast | Supabase v2 | No custom infrastructure; built into existing Supabase stack |
| localStorage for OAuth tokens | DB-backed token storage | Project convention (calendar-proxy) | Server-side refresh; multi-device support; RLS-protected |

**Deprecated/outdated:**
- Canva Button SDK: Legacy embed approach. Connect API v1 is the current integration method.
- `canvaService.js` direct API calls: Must be rewritten to use Edge Function proxy due to CORS.

## Open Questions

1. **Canva Client Secret Storage**
   - What we know: Edge Function needs `CANVA_CLIENT_ID` and `CANVA_CLIENT_SECRET` as environment variables
   - What's unclear: Whether these are already configured in Supabase project secrets
   - Recommendation: Add to Edge Function env via `supabase secrets set CANVA_CLIENT_ID=... CANVA_CLIENT_SECRET=...`

2. **Video Wall Leader Election**
   - What we know: One screen per wall must be the leader for sync
   - What's unclear: Whether leader should be statically assigned (DB flag) or dynamically elected
   - Recommendation: Static assignment via `is_leader` column in `video_wall_screens`. Simplest and most predictable. If leader goes offline, wall pauses until it returns.

3. **Canva OAuth Scope Change**
   - What we know: Existing `canvaService.js` requests `design:content:read design:content:write asset:read asset:write profile:read`
   - What's unclear: Whether `design:meta:read` (needed for List Designs) is a separate scope from `design:content:read`
   - Recommendation: Update scopes to include `design:meta:read` for listing and `design:content:read` for exporting. Verify in Canva Developer Portal.

4. **Multi-page Canva Design Export**
   - What we know: Canva designs can have multiple pages. Export returns multiple URLs for multi-page designs.
   - What's unclear: Whether to import all pages as separate media assets or only the first page
   - Recommendation: Import first page by default; add option to import all pages as individual assets. Simpler for v1.

## Sources

### Primary (HIGH confidence)
- [Canva Connect API - List Designs](https://www.canva.dev/docs/connect/api-reference/designs/list-designs/) - Endpoint format, query params, response schema, pagination
- [Canva Connect API - Create Export Job](https://www.canva.dev/docs/connect/api-reference/exports/create-design-export-job/) - Export formats (PNG/JPG/PDF/MP4), polling flow, rate limits
- [Supabase Realtime Broadcast](https://supabase.com/docs/guides/realtime/broadcast) - Channel creation, send/receive, ack/self config, code examples
- [Canva Connect API - Authentication](https://www.canva.dev/docs/connect/authentication/) - CORS requirement for server-side token exchange, PKCE flow

### Secondary (MEDIUM confidence)
- Existing codebase: `canvaService.js`, `realtimeService.js`, `deviceSyncService.js`, `calendar-proxy/index.ts` - Verified project patterns
- Existing codebase: `YodeckAddMediaModal.jsx` - Video wall placeholder UI already exists

### Tertiary (LOW confidence)
- Video wall bezel compensation math - Based on common CSS transform patterns; not verified against a specific digital signage reference implementation
- Canva export timing (10-30 seconds) - Based on general API behavior; not verified with benchmarks

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project; Canva API docs verified
- Architecture: MEDIUM - Edge Function proxy pattern is proven in project; video wall sync pattern is standard but untested in this codebase
- Pitfalls: HIGH - CORS issue verified via official docs; token storage pattern proven in calendar-proxy

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (Canva API is stable; Supabase Realtime is stable)
