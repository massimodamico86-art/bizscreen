# Architecture Patterns: v12.0 Feature Parity

**Domain:** Digital signage platform -- 14 new features integrating with existing React 19 + Supabase + S3 architecture
**Researched:** 2026-03-02
**Confidence:** HIGH (based on deep codebase analysis of all integration points)

---

## Recommended Architecture

The 14 v12.0 features break into 5 architectural categories based on how they integrate with the existing system:

1. **New Widget Types** (4 features): YouTube/Vimeo, Web Page, Calendar, Google Slides -- extend the centralized widget registry
2. **Media Pipeline Extensions** (3 features): Document display, Media expiration, Audio/background music -- extend media_assets + player
3. **Content Model Extensions** (2 features): Nested playlists, Working hours/power scheduling -- extend playlist_items + schedules tables
4. **Enterprise/API Layer** (3 features): SSO/SAML, REST API, Proof of Play -- new services + Edge Functions
5. **Advanced Player Features** (2 features): Video wall, Canva integration deepening -- player coordination + OAuth import flow

### High-Level Integration Map

```
EXISTING                          NEW (v12.0)
========                          ===========

Widget Registry (12 types)  --->  +youtube, +webpage, +calendar, +gslides, +document, +audio  (6 new types)

media_assets table          --->  +expires_at column, +source column (canva, gslides, upload)
playlist_items table        --->  +sub_playlist_id column (nested playlists)
playlists table             --->  +audio_track_id column (background music)

Player (ViewPage)           --->  +audio layer, +video wall sync, +document renderer
playbackTrackingService     --->  +proof_of_play export RPC

ssoService.js (exists)      --->  Wire to Supabase Auth SSO (SAML flow completion)
apiTokenService.js (exists) --->  +Edge Function API gateway (validate tokens, route requests)
canvaService.js (exists)    --->  +import-to-media flow (export design -> upload to S3)

Edge Functions (4 exist)    --->  +document-converter, +api-gateway, +calendar-proxy
```

---

## Component Boundaries

### Tier 1: Widget Registry Extensions

These follow the established pattern exactly. Add ONE entry to `src/widgets/registry.js`, create the widget component in `src/player/components/widgets/`, and the entire editor + player pipeline picks it up automatically.

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `YouTubeWidget` | Embed YouTube/Vimeo via iframe with autoplay/mute | Widget registry, ZonePlayer |
| `WebPageWidget` | Display URL in sandboxed iframe with refresh interval | Widget registry, ZonePlayer (note: AppRenderer already has a basic `WebPageApp`) |
| `CalendarWidget` | Render Google Calendar/Outlook events in agenda/grid view | Widget registry, calendar-proxy Edge Function |
| `GoogleSlidesWidget` | Embed published Google Slides presentation | Widget registry (iframe embed, no proxy needed) |
| `DocumentWidget` | Display PDF pages as images (pre-converted server-side) | Widget registry, document-converter Edge Function |
| `AudioWidget` | Background music player (non-visual, persistent audio) | ViewPage audio layer (NOT a zone widget -- see rationale below) |

**Pattern to follow (from existing ClockWidget registration in registry.js):**
```javascript
// 1. Create src/player/components/widgets/YouTubeWidget.jsx
export function YouTubeWidget({ props, timezone }) {
  const { videoUrl, autoplay, muted, loop } = props;
  // Extract video ID, construct embed URL, render iframe
  return <iframe src={embedUrl} allow="autoplay; encrypted-media" />;
}

// 2. Register in src/widgets/registry.js
youtube: {
  component: YouTubeWidget,
  icon: Play, // from lucide-react
  label: 'YouTube / Vimeo',
  defaultProps: {
    videoUrl: '',
    autoplay: true,
    muted: true,
    loop: false,
    textColor: '#ffffff',
  },
},
```

**Web Page Widget Note:** `AppRenderer.jsx` already contains a working `WebPageApp` component with iframe rendering, URL config, refresh interval via `setInterval`, and zoom level via CSS `transform: scale()`. The v12.0 task is to register this as a proper widget type in the registry so it can be used in layout zones (not just as a full-screen app). The existing `WebPageApp` code can be adapted into the widget with minimal changes.

**YouTube/Vimeo URL Parsing:** The widget needs to handle both YouTube and Vimeo URLs and convert to their respective embed formats:
- YouTube: `https://www.youtube.com/watch?v=ID` -> `https://www.youtube.com/embed/ID?autoplay=1&mute=1`
- Vimeo: `https://vimeo.com/ID` -> `https://player.vimeo.com/video/ID?autoplay=1&muted=1`

Both support `autoplay`, `muted`, `loop` parameters. Both require the page to be in a secure context (HTTPS). The player already runs over HTTPS.

### Tier 2: Media Pipeline Extensions

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `documentConverterService.js` | Client service calling document-converter Edge Function | S3, Edge Function |
| `document-converter` Edge Function | Convert PDF pages to PNG images server-side | S3, Supabase DB |
| `mediaExpirationService.js` | Manage expires_at dates, auto-archive cron | media_assets table |
| Audio layer in ViewPage | Persistent audio playback overlaying visual content | ViewPage, playlists table |

**Document Display Architecture:**

Documents cannot be directly rendered on most TV/player platforms (Tizen, WebOS lack PDF rendering). The proven digital signage approach:

```
Upload PDF (or DOCX/PPTX/XLSX converted to PDF by user)
    |
    v
Edge Function: document-converter
    |-- Uses pdfjs-dist (pure JS, runs on Deno)
    |-- Extract each page as PNG image via OffscreenCanvas
    |-- Upload page images to S3 via presigned URL
    |
    v
Store page images in S3: media/{tenant_id}/documents/{doc_id}/page-{n}.png
    |
    v
media_assets row: type='document', metadata={ pages: [urls], page_count: N }
    |
    v
DocumentWidget cycles through page images with configurable interval per page
```

**CRITICAL CONSTRAINT:** Supabase Edge Functions run on Deno with limited binary support. LibreOffice/unoconv cannot run there. Two options:
1. **PDF-only server-side conversion** via Edge Function using `pdfjs-dist` (pure JS). For DOCX/PPTX/XLSX, require users to export as PDF first.
2. **External conversion service** (AWS Lambda with LibreOffice layer, or Gotenberg API). Edge Function calls external service.

**Recommendation:** Option 1 for MVP (PDF-only in Edge Function). Most competitors (Yodeck, OptiSigns) only support PDF natively. Word/PPT conversion is a "nice to have" that can use an external service later.

**Media Expiration Architecture:**

```sql
-- Migration: Add expires_at to media_assets
ALTER TABLE media_assets ADD COLUMN expires_at TIMESTAMPTZ;
ALTER TABLE media_assets ADD COLUMN source TEXT DEFAULT 'upload';
CREATE INDEX idx_media_assets_expires ON media_assets(expires_at) WHERE expires_at IS NOT NULL;

-- Cron job (via pg_cron or Supabase scheduled function):
UPDATE media_assets
SET status = 'expired', updated_at = now()
WHERE expires_at <= now() AND status = 'active';
```

The player's `get_resolved_player_content` RPC already filters by active content. Adding `AND (m.expires_at IS NULL OR m.expires_at > now())` to the RPC handles player-side filtering automatically. No player code changes needed.

**Admin UI changes:** Add a date picker to the media detail/upload form. Add a "Set Expiration" bulk action. Add an "Expiring Soon" filter to media library. Add visual indicator (badge) on media cards approaching expiration.

**Audio/Background Music Architecture:**

Audio is fundamentally different from visual content -- it must persist across visual content transitions as a continuous layer.

```
Option A: Audio Zone (in layout) -- a zone with audio content
Option B: Playlist-level Audio Track -- persistent <audio> outside visual renderer
```

**Recommendation:** Option B (playlist-level audio track). An audio zone would restart on every visual content change within the zone. Background music must survive slide transitions.

```sql
-- Migration: Add audio track to playlists
ALTER TABLE playlists ADD COLUMN audio_track_id UUID REFERENCES media_assets(id);
ALTER TABLE playlists ADD COLUMN audio_volume NUMERIC DEFAULT 0.5
  CHECK (audio_volume >= 0 AND audio_volume <= 1);
ALTER TABLE playlists ADD COLUMN audio_loop BOOLEAN DEFAULT true;
```

**Player integration in ViewPage.jsx:**
```javascript
// New hook: useAudioTrack.js
const audioRef = useRef(null);

useEffect(() => {
  if (content?.audioTrack?.url && audioRef.current) {
    audioRef.current.src = content.audioTrack.url;
    audioRef.current.volume = content.audioTrack.volume ?? 0.5;
    audioRef.current.loop = content.audioTrack.loop ?? true;
    audioRef.current.play().catch(() => {
      // Autoplay blocked -- degrade gracefully
    });
  }
  return () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  };
}, [content?.audioTrack]);

// In ViewPage JSX:
<>
  <audio ref={audioRef} style={{ display: 'none' }} />
  {/* ... existing visual content rendering */}
</>
```

**Platform constraint:** Most TV platforms (WebOS, Tizen) allow background audio without user interaction. Web browsers may block autoplay audio unless muted. The player should handle autoplay failure gracefully (log, do not show error).

### Tier 3: Content Model Extensions

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Nested playlist resolution | Flatten sub-playlists server-side before sending to player | `get_resolved_player_content` RPC |
| `workingHoursService.js` | Screen power schedule CRUD | screen_power_schedules table, device_commands |
| Power scheduling cron | Turn screens on/off based on working hours | pg_cron, device_commands table |

**Nested/Sub-Playlists Architecture:**

The existing `playlist_items` table has `item_type` CHECK constraint accepting `'media'` and `'app'`. Extend to include `'playlist'`:

```sql
-- Extend playlist_items for sub-playlists
ALTER TABLE playlist_items ADD COLUMN sub_playlist_id UUID REFERENCES playlists(id);
ALTER TABLE playlist_items DROP CONSTRAINT IF EXISTS playlist_items_item_type_check;
ALTER TABLE playlist_items ADD CONSTRAINT playlist_items_item_type_check
  CHECK (item_type IN ('media', 'app', 'playlist'));
```

**Resolution in RPC (flatten before sending to player):**
```sql
-- Recursive CTE in get_resolved_player_content
WITH RECURSIVE flat_items AS (
  -- Base: direct items that are not sub-playlists
  SELECT pi.id, pi.item_type, pi.item_id, pi.media_id, pi.duration, pi.position,
         1 as depth, pi.playlist_id as root_playlist_id
  FROM playlist_items pi
  WHERE pi.playlist_id = target_playlist_id AND pi.item_type != 'playlist'

  UNION ALL

  -- Recursive: expand sub-playlist items
  SELECT spi.id, spi.item_type, spi.item_id, spi.media_id, spi.duration, spi.position,
         fi.depth + 1, fi.root_playlist_id
  FROM playlist_items parent_ref
  JOIN playlist_items spi ON spi.playlist_id = parent_ref.sub_playlist_id
  WHERE parent_ref.playlist_id = target_playlist_id
    AND parent_ref.item_type = 'playlist'
    AND spi.item_type != 'playlist'  -- Only expand one level at a time
    AND fi.depth < 5  -- Max 5 levels deep
)
SELECT * FROM flat_items ORDER BY position;
```

**Max depth of 5** prevents infinite recursion. The player receives a flat list -- it does not need to know about nesting. This is resolved entirely server-side.

**Circular reference protection in service layer:**
```javascript
// playlistService.js -- validate before inserting sub-playlist item
export async function addSubPlaylist(parentPlaylistId, childPlaylistId) {
  if (parentPlaylistId === childPlaylistId) {
    throw new Error('A playlist cannot contain itself');
  }
  // Walk up the ancestor chain of childPlaylistId
  const ancestors = await getPlaylistAncestors(childPlaylistId);
  if (ancestors.includes(parentPlaylistId)) {
    throw new Error('Cannot create circular playlist reference');
  }
  return addPlaylistItem(parentPlaylistId, {
    itemType: 'playlist',
    itemId: childPlaylistId,
  });
}
```

**Admin UI:** In the playlist editor, add a "Add Sub-Playlist" action next to "Add Media". Show nested playlists as expandable groups with an indent indicator.

**Working Hours / Power Scheduling Architecture:**

```sql
CREATE TABLE screen_power_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  name TEXT DEFAULT 'Working Hours',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  schedule JSONB NOT NULL DEFAULT '{
    "monday":    {"enabled": true, "on": "08:00", "off": "18:00"},
    "tuesday":   {"enabled": true, "on": "08:00", "off": "18:00"},
    "wednesday": {"enabled": true, "on": "08:00", "off": "18:00"},
    "thursday":  {"enabled": true, "on": "08:00", "off": "18:00"},
    "friday":    {"enabled": true, "on": "08:00", "off": "18:00"},
    "saturday":  {"enabled": false},
    "sunday":    {"enabled": false}
  }',
  overrides JSONB DEFAULT '[]',  -- Holiday/special day overrides: [{date, on, off}]
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE screen_power_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON screen_power_schedules
  FOR ALL USING (tenant_id = auth.uid());
```

**Power control mechanism:** The player already supports remote commands via `device_commands` table (reboot, reload, clear_cache). Add `display_off` and `display_on` commands. A pg_cron job (every minute) checks schedules and inserts commands:

```sql
-- Cron function: evaluate power schedules
CREATE OR REPLACE FUNCTION check_power_schedules() RETURNS void AS $$
DECLARE
  sched RECORD;
  day_name TEXT;
  current_time_str TEXT;
  day_schedule JSONB;
  should_be_on BOOLEAN;
BEGIN
  FOR sched IN SELECT * FROM screen_power_schedules WHERE is_enabled = true LOOP
    day_name := lower(to_char(now() AT TIME ZONE sched.timezone, 'Day'));
    day_name := trim(day_name);
    current_time_str := to_char(now() AT TIME ZONE sched.timezone, 'HH24:MI');
    day_schedule := sched.schedule->day_name;

    IF day_schedule IS NULL OR NOT (day_schedule->>'enabled')::boolean THEN
      should_be_on := false;
    ELSE
      should_be_on := current_time_str >= day_schedule->>'on'
                  AND current_time_str < day_schedule->>'off';
    END IF;

    -- Insert command if state needs to change
    -- (check last command to avoid duplicates)
    IF should_be_on THEN
      INSERT INTO device_commands (screen_id, command)
      SELECT sched.screen_id, 'display_on'
      WHERE NOT EXISTS (
        SELECT 1 FROM device_commands
        WHERE screen_id = sched.screen_id
          AND command = 'display_on'
          AND created_at > now() - interval '2 minutes'
      );
    ELSE
      INSERT INTO device_commands (screen_id, command)
      SELECT sched.screen_id, 'display_off'
      WHERE NOT EXISTS (
        SELECT 1 FROM device_commands
        WHERE screen_id = sched.screen_id
          AND command = 'display_off'
          AND created_at > now() - interval '2 minutes'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule: run every minute
SELECT cron.schedule('check-power-schedules', '* * * * *', 'SELECT check_power_schedules()');
```

For actual display power control: CEC (Consumer Electronics Control) over HDMI is platform-dependent.
- **Web player**: Blank screen (CSS `display: none` on content) + reduce tick frequency
- **Tizen/WebOS**: Native CEC APIs to control HDMI display power
- **Android**: Wake lock release + screen brightness to 0

### Tier 4: Enterprise/API Layer

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| SSO/SAML completion | Wire existing ssoService.js to Supabase Auth SSO flow | Supabase Auth GoTrue, sso_providers table |
| `api-gateway` Edge Function | Validate API tokens, route REST requests | api_tokens table, Supabase tables via RPC |
| `proofOfPlayService.js` | Aggregate playback events into compliance reports | playback_events (via playbackTrackingService), CSV export |
| `ProofOfPlayPage.jsx` | Admin UI for generating/downloading PoP reports | proofOfPlayService |

**SSO/SAML Architecture:**

The foundation already exists:
- `sso_providers` table (migration 036) with OIDC and SAML fields
- `sso_sessions` table for state tracking
- `ssoService.js` with provider CRUD, OIDC auth URL generation, SAML config storage, enforcement checking, OIDC discovery validation
- `validateOIDCIssuer()` fetches `.well-known/openid-configuration`

**What is missing for production SAML:**

1. **Wire to Supabase Built-in SSO**: Use `supabase.auth.signInWithSSO()` rather than custom SAML processing. Supabase GoTrue handles SAML canonicalization, signature validation, and wrapping attack prevention.

2. **Login Flow Integration**: Add SSO button to login page when tenant has SSO enabled. Detect tenant from email domain.

```
Login Page
  |-- User enters email
  |-- Check: does email domain match an sso_providers record?
  |   YES --> supabase.auth.signInWithSSO({ domain: emailDomain })
  |           --> Redirects to IdP login page
  |           --> IdP posts SAML assertion
  |           --> Supabase GoTrue processes assertion
  |           --> AuthContext picks up session normally
  |   NO  --> Normal email/password login
```

3. **SP Metadata Configuration**: Expose BizScreen's SAML Service Provider metadata URL so IdP administrators can configure trust. Supabase provides this at `{SUPABASE_URL}/sso/saml/metadata`.

**IMPORTANT:** The existing `sso_providers` table stores config for the admin UI (showing provider name, enabled/disabled toggle, attribute mapping). The actual SAML processing delegates to Supabase's managed SSO infrastructure. Do NOT write custom SAML XML parsing in an Edge Function.

**Public REST API Architecture:**

The `api_tokens` table and `apiTokenService.js` already exist with:
- Token generation with `biz_` prefix and SHA-256 hashing
- Scoped permissions (apps:read, campaigns:read/write, playlists:read/write, screens:read, media:read/write)
- Token rotation, expiration, revocation
- Usage statistics RPC

**What is needed:** A single Edge Function as API gateway:

```
External Client              Edge Function              Supabase
  |                          api-gateway                   |
  |--- GET /api/v1/screens -->|                            |
  |    Authorization: Bearer biz_xxx                       |
  |                          |-- SHA-256 hash the token    |
  |                          |-- Lookup api_tokens by hash |
  |                          |-- Verify not revoked/expired|
  |                          |-- Check scope: 'screens:read' |
  |                          |-- Update last_used_at       |
  |                          |-- Call RPC: api_list_screens(tenant_id) -->|
  |                          |<--- JSON data ------------------|
  |<---- JSON Response ------|                             |
```

**Route table inside the gateway:**
```typescript
// supabase/functions/api-gateway/index.ts
const ROUTES: Record<string, { rpc: string; scope: string }> = {
  'GET /v1/screens':     { rpc: 'api_list_screens',    scope: 'screens:read' },
  'GET /v1/screens/:id': { rpc: 'api_get_screen',      scope: 'screens:read' },
  'GET /v1/playlists':   { rpc: 'api_list_playlists',  scope: 'playlists:read' },
  'POST /v1/playlists':  { rpc: 'api_create_playlist', scope: 'playlists:write' },
  'GET /v1/media':       { rpc: 'api_list_media',      scope: 'media:read' },
  'POST /v1/media':      { rpc: 'api_upload_media',    scope: 'media:write' },
  'GET /v1/campaigns':   { rpc: 'api_list_campaigns',  scope: 'campaigns:read' },
};
```

Each `api_*` RPC accepts `p_tenant_id` (from token lookup) instead of `auth.uid()`. Uses `SECURITY DEFINER` to bypass RLS (Edge Function is the caller, not the end user), but scopes all queries to the token's tenant.

**Rate limiting:** Use the same `rateLimitService` pattern. Store rate limit counters per token_id in a `api_rate_limits` table with `date_trunc('minute', now())` window.

**Proof of Play Architecture:**

`playbackTrackingService.js` already captures `SCENE_START`, `SCENE_END`, `MEDIA_PLAY` events with screen_id, scene_id, media_id, duration, timestamps, and offline queueing. The data pipeline is solid.

**What is needed:**

1. **Aggregation RPC**: Summarize playback events by date range, screen, content item
2. **CSV Export**: Client-side formatting from aggregated data (no server-side PDF generation needed for MVP)
3. **Admin UI Page**: Date range picker, screen multi-select, content filter, download button

```sql
CREATE OR REPLACE FUNCTION get_proof_of_play_report(
  p_tenant_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_screen_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  screen_id UUID,
  screen_name TEXT,
  content_id UUID,
  content_name TEXT,
  content_type TEXT,
  total_plays BIGINT,
  total_duration_seconds BIGINT,
  first_played TIMESTAMPTZ,
  last_played TIMESTAMPTZ
) AS $$
  SELECT
    pe.screen_id, s.name,
    COALESCE(pe.scene_id, pe.media_id),
    COALESCE(sc.name, ma.name),
    pe.item_type,
    COUNT(*), SUM(pe.duration_seconds),
    MIN(pe.started_at), MAX(pe.ended_at)
  FROM playback_events pe
  LEFT JOIN screens s ON s.id = pe.screen_id
  LEFT JOIN scenes sc ON sc.id = pe.scene_id
  LEFT JOIN media_assets ma ON ma.id = pe.media_id
  WHERE pe.tenant_id = p_tenant_id
    AND pe.started_at >= p_start_date AND pe.started_at < p_end_date
    AND (p_screen_ids IS NULL OR pe.screen_id = ANY(p_screen_ids))
  GROUP BY pe.screen_id, s.name, COALESCE(pe.scene_id, pe.media_id),
           COALESCE(sc.name, ma.name), pe.item_type
  ORDER BY total_plays DESC;
$$ LANGUAGE sql SECURITY DEFINER;
```

### Tier 5: Advanced Player Features

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Video wall coordinator | Synchronize content across multiple screens | Supabase Realtime broadcast channel |
| Canva import flow | Export Canva design as image, upload to S3 as media | canvaService.js, s3UploadService.js, mediaService.js |

**Video Wall Architecture:**

Video wall = multiple physical screens acting as one logical display.

```sql
CREATE TABLE video_walls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  columns INT NOT NULL DEFAULT 2,
  rows INT NOT NULL DEFAULT 2,
  bezel_h_mm NUMERIC DEFAULT 0,
  bezel_v_mm NUMERIC DEFAULT 0,
  playlist_id UUID REFERENCES playlists(id),
  scene_id UUID REFERENCES scenes(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE video_wall_screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wall_id UUID NOT NULL REFERENCES video_walls(id) ON DELETE CASCADE,
  screen_id UUID NOT NULL REFERENCES screens(id),
  grid_col INT NOT NULL,  -- 0-based
  grid_row INT NOT NULL,  -- 0-based
  UNIQUE(wall_id, grid_col, grid_row),
  UNIQUE(wall_id, screen_id)
);

ALTER TABLE video_walls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON video_walls FOR ALL USING (tenant_id = auth.uid());
ALTER TABLE video_wall_screens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Via wall" ON video_wall_screens FOR ALL
  USING (wall_id IN (SELECT id FROM video_walls WHERE tenant_id = auth.uid()));
```

**Rendering approach:** Each player renders FULL content but uses CSS `transform` to crop to its tile:

```javascript
// In ViewPage.jsx when screen is part of a video wall:
const { cols, rows, myCol, myRow } = wallConfig;
const wallStyle = {
  transform: `scale(${cols}, ${rows})`,
  transformOrigin: `${(myCol / (cols - 1)) * 100}% ${(myRow / (rows - 1)) * 100}%`,
  width: '100%',
  height: '100%',
  overflow: 'hidden',
};
```

**Synchronization via Supabase Realtime:**

```javascript
// useVideoWallSync.js
export function useVideoWallSync(wallId, screenId, wallConfig) {
  const isLeader = wallConfig.myCol === 0 && wallConfig.myRow === 0;
  const channelRef = useRef(null);

  useEffect(() => {
    const channel = supabase.channel(`wall:${wallId}`);

    if (isLeader) {
      // Leader broadcasts advance commands when content changes
      channelRef.current = channel;
    } else {
      // Followers listen and sync
      channel.on('broadcast', { event: 'sync' }, ({ payload }) => {
        setCurrentIndex(payload.index);
      });
    }

    channel.subscribe();
    return () => channel.unsubscribe();
  }, [wallId, isLeader]);

  // Leader calls this when advancing content
  const broadcastAdvance = useCallback((index) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'sync',
      payload: { index, ts: Date.now() }
    });
  }, []);

  return { isLeader, broadcastAdvance };
}
```

Leader election: screen at grid position (0,0) is always the leader. Simple, deterministic, no coordination needed.

**Canva Integration (Deepening):**

`canvaService.js` already has full OAuth + PKCE + token management + design listing + export polling. What is missing is the "import to media library" bridge:

```
User clicks "Import from Canva" in Media Library
    |
    v
List designs: canvaFetch('/designs') -- already implemented
    |
    v
User selects design in a browse modal
    |
    v
Export as PNG: exportDesign(designId, 'png') -- already implemented with polling
    |
    v
Download exported image from Canva CDN URL
    |
    v
Upload to S3 via s3UploadService (presigned URL flow) -- already implemented
    |
    v
Create media_assets record: { type: 'image', source: 'canva', metadata: { canva_design_id } }
    |
    v
Media appears in library, assignable to playlists/layout zones
```

This is primarily a UI feature (import modal with design browser). No new Edge Functions needed. All API components exist; they just need to be composed into a workflow.

**Google Slides Widget:**

Two modes:
1. **Embed mode (recommended for MVP):** Use Google Slides published embed URL in iframe. Requires slide deck to be "Published to web".
2. **Import mode (future enhancement):** Use Google Slides API to export slides as images, store in S3.

```javascript
// GoogleSlidesWidget.jsx
function extractSlidesId(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function GoogleSlidesWidget({ props }) {
  const { slidesUrl, autoAdvance, intervalSeconds = 10 } = props;
  const slidesId = extractSlidesId(slidesUrl);
  if (!slidesId) return <div>Invalid Google Slides URL</div>;

  const embedUrl = `https://docs.google.com/presentation/d/${slidesId}/embed?start=${autoAdvance}&loop=true&delayms=${intervalSeconds * 1000}`;
  return <iframe src={embedUrl} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />;
}
```

The `configType: 'google-slides'` entry already exists in `appCatalog.js`, confirming this was always planned.

---

## Data Flow Changes

### Content Resolution Chain (Modified)

**Current:** `Playlist -> Layout -> Schedule -> Screen`
**New:** `Playlist (with nested sub-playlists, flattened) -> Layout -> Schedule -> Screen (with working hours gate) + persistent audio layer`

**Changes to `get_resolved_player_content` RPC:**

1. Flatten nested playlists (recursive CTE, max depth 5)
2. Filter expired media (`expires_at IS NULL OR expires_at > now()`)
3. Include audio track URL + volume + loop from playlist record
4. Include video wall tile config (cols, rows, myCol, myRow) if screen is in a wall
5. Include working hours schedule so player can manage display on/off locally

### New Edge Functions

| Function | Purpose | Trigger | Complexity |
|----------|---------|---------|------------|
| `document-converter` | Convert PDF pages to PNG images | Admin upload of PDF | MEDIUM |
| `api-gateway` | Public REST API routing + token validation | External API clients | HIGH |
| `calendar-proxy` | Fetch Google Calendar/Outlook events, hide API key | CalendarWidget refresh | LOW (mirrors weather-proxy) |

Note: `sso-callback` is NOT needed. Supabase GoTrue handles SAML processing natively.

### New Database Tables

| Table | Purpose | RLS Policy |
|-------|---------|------------|
| `screen_power_schedules` | Working hours per screen | tenant_id = auth.uid() |
| `video_walls` | Video wall grid configurations | tenant_id = auth.uid() |
| `video_wall_screens` | Screen-to-wall-tile mapping | Via video_walls join |

### Modified Tables

| Table | Change | Migration |
|-------|--------|-----------|
| `media_assets` | `+expires_at TIMESTAMPTZ`, `+source TEXT DEFAULT 'upload'` | 156 |
| `playlist_items` | `+sub_playlist_id UUID REFERENCES playlists(id)`, extend item_type CHECK | 157 |
| `playlists` | `+audio_track_id UUID REFERENCES media_assets(id)`, `+audio_volume NUMERIC`, `+audio_loop BOOLEAN` | 158 |

---

## Patterns to Follow

### Pattern 1: Widget Registration (Established -- registry.js)

**What:** Add ONE entry to `src/widgets/registry.js` with `{ component, icon, label, defaultProps }`.
**When:** Adding any new content type that renders in a layout zone.
**Why it works:** `getWidgetComponent(type)` is used by SceneRenderer. `getWidgetTypes()` populates editor UI. `getWidgetDefaults(type)` provides initial props. All 12 existing types follow this exactly.

### Pattern 2: Edge Function Proxy (Established -- weather-proxy, rss-proxy, unsplash-proxy)

**What:** Server-side proxy that hides API keys, adds caching, sanitizes responses.
**When:** Any widget that fetches from a third-party API (Google Calendar, PDF conversion).
**Follow exactly:** Import `corsHeaders` from `../_shared/cors.ts`. Validate JWT or anon key. Check/populate DB cache. Return sanitized JSON.

### Pattern 3: Playlist-Level Audio (New)

**What:** Persistent `<audio>` element in ViewPage that lives outside the visual content renderer.
**When:** Background music / audio overlay features.
**Why not a zone widget:** Zone content restarts when the zone cycles to the next item. Audio must persist across visual transitions.

### Pattern 4: Server-Side Content Flattening (New)

**What:** Resolve nested/complex data structures in PostgreSQL RPC before sending to player.
**When:** Nested playlists, complex content resolution with expiration filtering.
**Why:** Player devices (Tizen, WebOS) have limited processing power. Server-side flattening reduces client complexity and ensures all platforms behave identically.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Document Rendering
**What:** Using PDF.js to render documents directly on the player.
**Why bad:** ~500KB library, CPU-intensive, fails on Tizen/WebOS. Font rendering varies.
**Instead:** Convert documents to images server-side. Player displays images.

### Anti-Pattern 2: Direct Third-Party API Calls from Player
**What:** Player widget calling Google Calendar API or Google Slides API directly.
**Why bad:** Exposes API keys in player bundle. Established anti-pattern since v3.1.
**Instead:** Always proxy through Edge Functions.

### Anti-Pattern 3: Recursive Playlist Resolution on Player
**What:** Sending nested playlist structure to player and letting it flatten.
**Why bad:** Recursive logic on constrained devices. Infinite loop risk.
**Instead:** Server-side recursive CTE with depth limit. Player receives flat list.

### Anti-Pattern 4: Custom SAML Processing
**What:** Writing SAML XML signature validation in a custom Edge Function.
**Why bad:** SAML is notoriously complex. XML canonicalization, signature wrapping attacks.
**Instead:** Use `supabase.auth.signInWithSSO()` -- delegates to GoTrue.

### Anti-Pattern 5: Polling for Video Wall Sync
**What:** Each wall screen polling server for current content index.
**Why bad:** Variable latency. Content visibly out of sync across screens.
**Instead:** Supabase Realtime broadcast channel. Sub-200ms latency.

### Anti-Pattern 6: Separate Audio Route
**What:** Creating a separate player route or hidden iframe for audio.
**Why bad:** Complex lifecycle. Audio stops if route changes.
**Instead:** Single `<audio>` element in ViewPage, persistent for entire session.

---

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| Proof of Play data | Small table, direct queries | Partition by month, materialized summary views | TimescaleDB or archive to S3 |
| API gateway throughput | Edge Function handles easily | Per-token rate limiting in DB | Dedicated API service |
| Document conversion | Edge Function sufficient | Queue-based with status polling | Lambda workers |
| Video wall Realtime | One channel per wall | Monitor connection limits | WebRTC for sub-frame sync |
| Calendar proxy | Cache covers most load | Per-tenant rate limiting | CDN-cached responses |
| Media expiration cron | pg_cron daily | Index scan, fast at 1M rows | Cursor-based batch |
| Nested playlist resolution | Recursive CTE fast at depth 5 | Same | Cache hot playlists |

---

## Suggested Build Order (Dependency-Aware)

### Phase 1: Quick Widget Wins (low risk, high value, no new tables)
- YouTube/Vimeo widget (iframe embed, registry entry)
- Web Page widget (port existing AppRenderer.WebPageApp to registry)
- Google Slides widget (iframe embed mode)
- Media expiration dates (ALTER TABLE + date picker UI + RPC filter)

**Rationale:** All follow established patterns. Highest feature-per-effort ratio. No new Edge Functions.

### Phase 2: Content Model Extensions (moderate risk, core table changes)
- Nested/sub-playlists (playlist_items schema change + RPC modification)
- Audio/background music (playlists table column + ViewPage audio layer)
- Working hours / power scheduling (new table + cron + player display management)

**Rationale:** These modify core content tables. Group for a single migration batch. Nested playlists has the most complex RPC change.

### Phase 3: Enterprise Features (complex but isolated)
- SSO/SAML (wire ssoService.js to Supabase Auth SSO)
- Public REST API gateway (new Edge Function + API-scoped RPCs)
- Proof of Play reporting (aggregation RPC + CSV export + admin page)

**Rationale:** Isolated from content resolution. SSO uses existing tables/service. API uses existing token service. PoP uses existing playback tracking.

### Phase 4: Advanced Integrations (high complexity, external dependencies)
- Document display (Edge Function for PDF-to-image conversion)
- Calendar widget (Edge Function proxy + Google Calendar API)
- Canva import deepening (compose existing services into import workflow)
- Video wall support (new tables + Realtime sync + player tile rendering)

**Rationale:** Most external dependencies and complexity. Video wall needs the most coordinated changes.

---

## New Files Summary

### Player Widgets (src/player/components/widgets/)
| File | Feature |
|------|---------|
| `YouTubeWidget.jsx` | YouTube/Vimeo embedding |
| `WebPageWidget.jsx` | Web page display (port from AppRenderer) |
| `CalendarWidget.jsx` | Google Calendar / Outlook agenda |
| `GoogleSlidesWidget.jsx` | Google Slides embed |
| `DocumentWidget.jsx` | PDF page image slideshow |

### Player Hooks (src/player/hooks/)
| File | Feature |
|------|---------|
| `useVideoWallSync.js` | Realtime sync for video walls |
| `useWorkingHours.js` | Display power management |
| `useAudioTrack.js` | Persistent background audio |

### Services (src/services/)
| File | Feature |
|------|---------|
| `documentConverterService.js` | PDF conversion orchestration |
| `proofOfPlayService.js` | PoP report aggregation + export |
| `workingHoursService.js` | Power schedule CRUD |
| `videoWallService.js` | Video wall CRUD |
| `calendarProxyService.js` | Calendar event fetching |
| `mediaExpirationService.js` | Expiration date management |

### Edge Functions (supabase/functions/)
| File | Feature |
|------|---------|
| `document-converter/index.ts` | PDF page extraction |
| `api-gateway/index.ts` | Public REST API routing |
| `calendar-proxy/index.ts` | Google Calendar / Outlook proxy |

### Admin Pages (src/pages/)
| File | Feature |
|------|---------|
| `ProofOfPlayPage.jsx` | PoP report UI |
| `VideoWallConfigPage.jsx` | Video wall setup |

### Database Migrations (supabase/migrations/)
| File | Changes |
|------|---------|
| `156_media_expiration.sql` | expires_at + source columns on media_assets |
| `157_nested_playlists.sql` | sub_playlist_id on playlist_items, extended CHECK |
| `158_audio_tracks.sql` | audio_track_id/volume/loop on playlists |
| `159_screen_power_schedules.sql` | New table + cron function |
| `160_video_walls.sql` | video_walls + video_wall_screens tables |
| `161_proof_of_play_rpc.sql` | Aggregation RPC |
| `162_api_gateway_rpcs.sql` | API-scoped query RPCs |
| `163_nested_playlist_resolution.sql` | Modified get_resolved_player_content |

### Modified Existing Files
| File | Changes |
|------|---------|
| `src/widgets/registry.js` | Add 5 new widget type entries |
| `src/player/components/widgets/index.js` | Export new widget components |
| `src/player/pages/ViewPage.jsx` | Audio layer, video wall style, working hours hook |
| `src/services/playlistService.js` | Sub-playlist add/remove + circular ref check |
| `src/services/mediaService.js` | Expiration date handling in CRUD + source field |
| `src/App.jsx` | New page routes for PoP, video wall config |
| `src/services/ssoService.js` | Wire signInWithSSO flow |

---

## Sources

- Codebase analysis: `src/widgets/registry.js` -- widget registration pattern (12 types, getWidgetComponent/getWidgetDefaults/getWidgetTypes)
- Codebase analysis: `src/services/canvaService.js` -- OAuth PKCE + export polling + design listing
- Codebase analysis: `src/services/ssoService.js` -- SSO foundation with sso_providers/sso_sessions, OIDC/SAML config
- Codebase analysis: `src/services/apiTokenService.js` -- API token with SHA-256, scopes, rotation, expiration
- Codebase analysis: `src/services/playbackTrackingService.js` -- event pipeline with offline queue, flush batching
- Codebase analysis: `src/player/components/AppRenderer.jsx` -- existing WebPageApp (iframe + refresh + zoom)
- Codebase analysis: `src/player/pages/ViewPage.jsx` -- player orchestration with 8 hooks
- Codebase analysis: `src/player/components/LayoutRenderer.jsx` -- zone rendering with percentage positioning
- Codebase analysis: `src/player/components/ZonePlayer.jsx` -- zone content cycling with analytics tracking
- Codebase analysis: `src/player/components/VideoPlayer.jsx` -- HLS/MP4 with stall detection
- Codebase analysis: `src/services/playlistService.js` -- playlist_items model (media/app types, position ordering)
- Codebase analysis: `src/services/cloud/cloudOAuthService.js` -- shared PKCE OAuth utility for 5 providers
- Codebase analysis: `supabase/migrations/036_enterprise_sso_scim_compliance.sql` -- SSO schema
- Codebase analysis: `src/config/appCatalog.js` -- google-slides already in catalog as configType
- Codebase analysis: `.planning/codebase/ARCHITECTURE.md` -- system design (layers, data flow, player subsystem)
- Codebase analysis: `.planning/codebase/INTEGRATIONS.md` -- integration catalog (all external services)
- Codebase analysis: `.planning/codebase/STACK.md` -- technology stack (Deno Edge Functions, idb 8.0.3, React 19)
- Training data: Supabase Edge Functions Deno runtime constraints (HIGH confidence)
- Training data: YouTube/Vimeo iframe embed API parameters (HIGH confidence)
- Training data: Google Slides embed URL format (HIGH confidence)
- Training data: SAML complexity and managed-service recommendation (HIGH confidence)
- Training data: Video wall CSS transform tile rendering (MEDIUM confidence)
- Training data: CEC display power control platform availability (MEDIUM confidence)
- Training data: pdfjs-dist Deno compatibility (MEDIUM confidence -- needs verification)

---

*Architecture analysis: 2026-03-02*
