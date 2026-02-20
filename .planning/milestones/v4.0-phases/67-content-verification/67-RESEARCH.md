# Phase 67: Content Verification - Research

**Researched:** 2026-02-20
**Domain:** Content version tracking, server-side mismatch detection, player-side retry sync, admin diagnostics UI
**Confidence:** HIGH

## Summary

Phase 67 adds content verification to the BizScreen player so operators can trust that screens display the correct published content, not stale versions. The codebase already has extensive infrastructure to build on: the player sends heartbeats every 30 seconds via `update_device_status` RPC (which accepts a `p_cached_content_hash` parameter), the `usePlayerContent` hook already computes a content hash object and stores it in localStorage as `player_content_hash`, the `ScreenDetailDrawer` displays diagnostics with auto-refresh, and Phase 66's `useAutoRecovery` provides progressive recovery when things go wrong.

The key gap is that the existing content hash mechanism is entirely client-side -- the player stores a JSON hash of `{mode, source, playlistId, layoutId, campaignId}` in localStorage and sends it on heartbeat, but the server never computes its own expected version to compare against. The `update_device_status` RPC stores the hash but never evaluates it. Phase 67 needs to: (1) define a canonical content version identifier computed server-side, (2) have the player report its content version on every heartbeat, (3) have the server compare and signal mismatches, (4) have the player respond to mismatch signals by re-syncing content at a natural transition point, and (5) show verification status in the screen detail drawer.

**Primary recommendation:** Extend `get_resolved_player_content` to return a `content_version` string computed from the content assignment state (mode + source + content IDs). Extend `update_device_status` to accept `p_content_version` and compare it against the expected version (computed in SQL), returning a `content_mismatch` boolean in the response. Have the player check this response field and trigger a content reload at the next playlist item transition. Add a verification status row to the Device Health section of `ScreenDetailDrawer` showing mismatch warnings.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Verification status shown in the **screen detail drawer only** -- not on screen list cards
- Mismatch displayed as an **inline warning** (yellow/orange) within the diagnostics section -- not a banner-style alert
- No indication needed when content is verified and current -- only surface problems
- On mismatch detection, player waits for the **current playlist item to finish** before swapping to new content -- never interrupts mid-playback
- Swap happens at the natural transition point between items
- Content version represents the **active playlist assignment** to the screen
- Verification checks that the player is running the correct playlist/layout that's currently assigned

### Claude's Discretion
- **Indicator design**: Whether to add a status row in existing diagnostics or a small dedicated section -- fit it to the existing drawer layout
- **Viewer-facing refresh**: Whether there's any visible indication on the physical screen during content refresh -- optimize for seamless viewer experience
- **Heartbeat states**: Whether to report two states (Verified/Mismatched) or three (Verified/Mismatched/Syncing) -- pick what's useful without over-complicating
- **Big change behavior**: Whether a completely different playlist assignment should swap sooner than a minor update -- Claude determines based on change magnitude
- **Retry count and backoff**: Claude picks a reasonable retry count with appropriate backoff strategy
- **Failure degradation**: What happens when retries exhaust -- keep playing stale content, fall back to cached content, or another strategy based on Phase 66's capabilities
- **Alert event emission**: Whether to emit a `content_mismatch_persistent` event for Phase 68 or just update status -- design the right integration point
- **Reset behavior**: How verification state resets on publish and whether manual reset is needed -- design around the publish flow
- **Media item changes**: Whether updates to media within a playlist (reorder, add/remove) trigger verification beyond the playlist assignment itself -- base on how content publishing currently works
- **Schedule verification**: Whether time-based schedule content factors into verification or stays separate
- **Multi-zone granularity**: Whether multi-zone layouts verify as one unit or per-zone -- determine right granularity for layout verification
- **Manual sync button**: Whether to include a "Force Sync" button in the drawer on mismatch -- decide based on what makes sense with the retry mechanism

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VERI-01 | Player reports content version identifier on each heartbeat | Player already sends `cached_content_hash` via `update_device_status` RPC on every 30s heartbeat. Extend the content hash to be a canonical `content_version` string computed from `{mode, source, playlistId, layoutId, campaignId, sceneId}`. Store in localStorage and send as the existing `p_cached_content_hash` parameter (or a new `p_content_version` parameter). |
| VERI-02 | Server detects content version mismatch between published and player-reported versions | Extend `update_device_status` RPC to compute the expected content version for the device (call content resolution logic or query assignment columns) and compare against the player-reported version. Return `content_mismatch: true/false` in the JSONB response. Store `content_verified_at` and `content_version_status` on `tv_devices`. |
| VERI-03 | Player auto-retries content sync when server signals version mismatch | Player checks `content_mismatch` in the heartbeat response. If mismatch detected, set a flag that triggers content reload at the next natural transition (playlist item end). Use `loadContentRef` to re-fetch from server. Retry up to 3 times with exponential backoff. If retries exhaust, keep playing current content (stale is better than blank). |
| VERI-04 | Content verification never blocks active playback (play-then-verify pattern) | Verification is a background check on heartbeat response. Mismatch flag only triggers reload at the next item transition, never mid-playback. The existing `advanceToNext` in `usePlayerPlayback` is the natural transition point to intercept. |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase JS | ^2.x | Client SDK for RPC calls | Already used for heartbeat and content fetching |
| React | 19 | UI components and hooks | Already the project framework |
| Lucide React | ^0.x | Icon library | Already used in ScreenDetailDrawer |
| Tailwind CSS | 3.x | Styling | Already the project styling approach |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `playerService.js` | N/A (internal) | `updateDeviceStatus()` heartbeat RPC, `calculateBackoff()` | For heartbeat extension and retry logic |
| `usePlayerHeartbeat` | N/A (internal) | Heartbeat hook sending every 30s | For checking mismatch response and flagging re-sync |
| `usePlayerContent` | N/A (internal) | Content loading with `loadContentRef` | For triggering content re-fetch on mismatch |
| `useAutoRecovery` | N/A (internal) | Progressive recovery with crash counter | For failure escalation if content sync fails repeatedly |
| `screenDiagnosticsService.js` | N/A (internal) | Diagnostics data and helpers | For adding verification status helpers |
| `ScreenDetailDrawer.jsx` | N/A (internal) | Screen detail diagnostics UI | For adding mismatch warning display |
| `deviceSyncService.js` | N/A (internal) | `needs_refresh` flag and content push | For understanding existing content publish flow |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| String-based content version | SHA-256 hash of full content payload | SHA-256 is too expensive on Tizen/WebOS (explicitly out of scope in REQUIREMENTS.md). String concatenation of IDs is cheap and deterministic. |
| Server-side version computation in heartbeat RPC | Separate verification RPC | A separate call doubles the API traffic. Computing in the heartbeat is one query, already running every 30s. |
| Mismatch flag in heartbeat response | Supabase Realtime push notification | Realtime is already used for commands/refresh. But heartbeat-based verification is simpler, more reliable, and doesn't require a new subscription channel. |

**Installation:**
No new packages needed. All dependencies are already in the project.

## Architecture Patterns

### Recommended Changes Structure
```
supabase/migrations/
  153_content_verification.sql          # Content version columns, extended update_device_status, expected version computation

src/
  player/hooks/usePlayerHeartbeat.js    # MODIFY: Check mismatch response, set re-sync flag
  player/hooks/usePlayerContent.js      # MODIFY: Compute canonical content version, expose re-sync hook
  player/hooks/useContentVerification.js # CREATE: Verification state management, transition-aware re-sync
  services/playerService.js             # MODIFY: (minimal) May extend updateDeviceStatus return type
  services/screenDiagnosticsService.js  # MODIFY: Add verification status helpers
  components/ScreenDetailDrawer.jsx     # MODIFY: Add mismatch warning inline in Device Health section
```

### Pattern 1: Canonical Content Version Identifier
**What:** A deterministic string that uniquely identifies what content a screen SHOULD be displaying at this moment. Computed identically on both player and server.
**When to use:** Every heartbeat (player reports), every heartbeat response (server compares).
**Example:**
```javascript
/**
 * Compute a canonical content version string from resolved content.
 * This string must be identical when computed server-side and client-side
 * for the same content assignment state.
 *
 * Format: "{mode}:{source}:{primaryContentId}"
 * Examples:
 *   "playlist:assigned_playlist:550e8400-e29b-41d4-a716-446655440000"
 *   "layout:campaign:660e8400-e29b-41d4-a716-446655440001"
 *   "playlist:schedule:770e8400-e29b-41d4-a716-446655440002"
 *   "layout:device_override:880e8400-e29b-41d4-a716-446655440003"
 */
function computeContentVersion(content) {
  if (!content) return null;

  const mode = content.mode || content.type || 'unknown';
  const source = content.source || 'unknown';

  // Primary content ID depends on mode
  let contentId = 'none';
  if (mode === 'layout' && content.layout?.id) {
    contentId = content.layout.id;
  } else if (mode === 'playlist') {
    contentId = content.playlist?.id || content.items?.[0]?.id || 'none';
  }

  // Include campaign ID if present (affects content selection)
  const campaignSuffix = content.campaign?.id ? `:c${content.campaign.id}` : '';

  // Include scene ID if present (scenes wrap layouts/playlists)
  const sceneSuffix = content.scene?.id ? `:s${content.scene.id}` : '';

  return `${mode}:${source}:${contentId}${campaignSuffix}${sceneSuffix}`;
}
```

### Pattern 2: Server-Side Version Computation in Heartbeat
**What:** The `update_device_status` RPC computes the expected content version for the device and compares it against the player-reported version, returning a mismatch flag.
**When to use:** On every heartbeat (30s cycle).
**Example:**
```sql
-- Inside update_device_status, after updating the device row:

-- Compute expected content version
-- This mirrors the resolution priority chain from get_resolved_player_content
-- but only needs the final content assignment, not the full content payload.
v_expected_version := (
  SELECT
    CASE
      -- Emergency override (highest priority)
      WHEN p.emergency_content_id IS NOT NULL
        AND (p.emergency_duration_minutes IS NULL
          OR p.emergency_started_at + (p.emergency_duration_minutes || ' minutes')::interval > NOW())
      THEN p.emergency_content_type || ':emergency:' || p.emergency_content_id

      -- Campaign (check active campaign for screen)
      WHEN ac.campaign_id IS NOT NULL
      THEN ac.content_type || ':campaign:' || ac.content_id || ':c' || ac.campaign_id

      -- Device scene override
      WHEN d.active_scene_id IS NOT NULL
      THEN 'scene:device_override:' || d.active_scene_id

      -- Group scene
      WHEN sg.active_scene_id IS NOT NULL
      THEN 'scene:group_override:' || sg.active_scene_id

      -- Assigned layout
      WHEN d.assigned_layout_id IS NOT NULL
      THEN 'layout:assigned_layout:' || d.assigned_layout_id

      -- Assigned playlist
      WHEN d.assigned_playlist_id IS NOT NULL
      THEN 'playlist:assigned_playlist:' || d.assigned_playlist_id

      -- No content
      ELSE NULL
    END
  FROM tv_devices d
  LEFT JOIN profiles p ON p.id = d.tenant_id
  LEFT JOIN screen_groups sg ON sg.id = d.screen_group_id
  LEFT JOIN LATERAL get_active_campaign_for_screen(d.id, NOW()) ac ON true
  WHERE d.id = p_device_id
);

-- Compare versions
v_is_mismatch := (p_content_version IS NOT NULL
  AND v_expected_version IS NOT NULL
  AND p_content_version != v_expected_version);

-- Store verification state
UPDATE tv_devices
SET content_version_status = CASE
    WHEN v_is_mismatch THEN 'mismatched'
    WHEN p_content_version IS NOT NULL THEN 'verified'
    ELSE 'unknown'
  END,
  content_verified_at = CASE
    WHEN NOT v_is_mismatch AND p_content_version IS NOT NULL THEN NOW()
    ELSE content_verified_at
  END,
  expected_content_version = v_expected_version,
  reported_content_version = p_content_version
WHERE id = p_device_id;
```

### Pattern 3: Transition-Aware Content Re-Sync
**What:** When a mismatch is detected, the player sets a flag that is checked at the natural transition point (when `advanceToNext()` is called). Content reload happens between items, never interrupting playback.
**When to use:** When heartbeat response indicates `content_mismatch: true`.
**Example:**
```javascript
// useContentVerification hook
export function useContentVerification({
  screenId,
  loadContentRef,
  content,
}) {
  const logger = useLogger('useContentVerification');
  const pendingSyncRef = useRef(false);
  const retryCountRef = useRef(0);
  const MAX_SYNC_RETRIES = 3;

  // Called by heartbeat handler when mismatch detected
  const onMismatchDetected = useCallback((expectedVersion, reportedVersion) => {
    if (pendingSyncRef.current) return; // Already pending
    logger.warn('Content mismatch detected', { expectedVersion, reportedVersion });
    pendingSyncRef.current = true;
    retryCountRef.current = 0;
  }, [logger]);

  // Called at transition point (between playlist items)
  const checkAndSync = useCallback(async () => {
    if (!pendingSyncRef.current) return false; // No pending sync

    logger.info('Content re-sync at transition point', {
      retryCount: retryCountRef.current,
    });

    try {
      await loadContentRef.current?.(screenId, false);
      // Success -- reset state
      pendingSyncRef.current = false;
      retryCountRef.current = 0;
      logger.info('Content re-sync successful');
      return true;
    } catch (err) {
      retryCountRef.current++;
      logger.error('Content re-sync failed', {
        error: err,
        retryCount: retryCountRef.current,
      });

      if (retryCountRef.current >= MAX_SYNC_RETRIES) {
        // Exhausted retries -- keep playing stale content
        // Phase 66's auto-recovery will handle if things are truly broken
        logger.warn('Content re-sync retries exhausted, keeping current content');
        pendingSyncRef.current = false;
        retryCountRef.current = 0;
      }
      return false;
    }
  }, [screenId, loadContentRef, logger]);

  // Reset when content changes (manual publish or successful sync)
  useEffect(() => {
    pendingSyncRef.current = false;
    retryCountRef.current = 0;
  }, [content?.mode, content?.source, content?.playlist?.id, content?.layout?.id]);

  return {
    onMismatchDetected,
    checkAndSync,
    isPendingSync: pendingSyncRef.current,
  };
}
```

### Pattern 4: Mismatch Warning in ScreenDetailDrawer
**What:** An inline warning row in the Device Health section showing content verification mismatch.
**When to use:** Only when mismatch is detected -- no indicator when content is verified.
**Example:**
```jsx
{/* Content Verification Warning -- only shown on mismatch */}
{screenInfo.content_version_status === 'mismatched' && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
    <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0" />
    <div className="flex-1">
      <span className="font-medium text-yellow-800 text-sm">Content Mismatch</span>
      <p className="text-yellow-700 text-xs mt-0.5">
        Player is displaying different content than expected. Auto-sync pending.
      </p>
    </div>
    {/* Optional: Force Sync button */}
    <button
      onClick={handleForceSync}
      className="text-xs text-yellow-700 hover:text-yellow-900 px-2 py-1 rounded bg-yellow-100 hover:bg-yellow-200"
    >
      Force Sync
    </button>
  </div>
)}
```

### Anti-Patterns to Avoid
- **Full content payload comparison:** Do not compare the entire content JSON (hundreds of KB for layouts with media items). Compare a lightweight version identifier composed of content assignment IDs only. This keeps the heartbeat payload small and the comparison fast.
- **Interrupting active playback on mismatch:** The user explicitly decided: "player waits for current playlist item to finish before swapping." Never call `loadContent` in the middle of a video/image display. Only at the transition point.
- **Triggering recovery (Phase 66) for content mismatch:** Content mismatch is NOT a crash. Do not increment the crash counter or trigger `useAutoRecovery`. Content mismatch has its own retry path (3 retries with backoff). Only if the mismatch persists after retries should it potentially feed into Phase 68 alerts.
- **SHA-256 content hashing on player:** REQUIREMENTS.md explicitly excludes "SHA-256 content hashing on player" as too expensive on Tizen/WebOS hardware. Use lightweight ID-based version strings.
- **Verification on screen list cards:** The user explicitly decided: "screen detail drawer only." Do not add verification badges or icons to the screens list page.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Content version comparison | Custom deep-diff of content payloads | Lightweight string comparison of `mode:source:contentId` version identifiers | Content payloads are large (KB); ID comparison is O(1) |
| Retry with backoff for re-sync | Custom retry loop | `calculateBackoff()` from `playerService.js` | Already implements full jitter exponential backoff |
| Diagnostics data fetching | New API endpoint | Extended `get_screen_diagnostics` RPC with verification fields | Already returns device metrics, content source, etc. |
| Relative time formatting | Custom time-ago | `formatLastSeen()` from `screenDiagnosticsService.js` | Already handles all edge cases |
| Content loading with cache fallback | Custom fetch logic | `loadContentRef.current()` from `usePlayerContent` | Already handles server-first-then-cache pattern |
| Content publish notification | New realtime channel | Existing `needs_refresh` flag + `checkDeviceRefreshStatus()` | Already wired into heartbeat cycle |

**Key insight:** The content version verification adds a thin comparison layer on top of the existing heartbeat and content resolution infrastructure. The player already sends a content hash and the server already resolves content -- Phase 67 connects these two sides with a comparison step and a mismatch response.

## Common Pitfalls

### Pitfall 1: Version String Mismatch Due to Resolution Timing
**What goes wrong:** The server computes the expected version at heartbeat time, but the player's reported version was computed at content-load time. If a publish happens between content load and heartbeat, the server sees a "mismatch" that is actually just a timing gap.
**Why it happens:** The publish flow sets `needs_refresh = true` on the device, which triggers a content reload on the next heartbeat cycle. But the version comparison also happens on that same heartbeat, before the reload takes effect.
**How to avoid:** Add a grace period after publish. When `needs_refresh = true` on the device, suppress mismatch detection (return `content_mismatch: false`). The device will reload content on this heartbeat cycle, and the next heartbeat will verify the new content.
**Warning signs:** Transient "mismatched" status that resolves within 30-60 seconds after every publish.

### Pitfall 2: Campaign/Schedule Time-Dependent Content
**What goes wrong:** Content resolved via campaigns or schedules changes based on the current time. The player loaded content at 10:00 AM (schedule A), but at 10:30 AM the schedule switches to schedule B. The server now expects schedule B, but the player is still showing schedule A (which was correct when loaded).
**Why it happens:** The player's 30-second polling in `usePlayerContent` should detect the change, but there can be a window where the version check fires before the poll updates.
**How to avoid:** For schedule/campaign-sourced content, the version string should include enough information to identify the specific schedule slot. The player's 30-second content poll already handles schedule transitions. If the mismatch is due to a schedule transition, the content poll will resolve it naturally within 30 seconds.
**Warning signs:** Brief mismatch flickers at schedule transition boundaries.

### Pitfall 3: Content Version for Layouts with Multiple Zones
**What goes wrong:** A layout has 3 zones, each with a different playlist. Changing one zone's playlist doesn't change the layout ID, so a version based only on layout ID misses the change.
**Why it happens:** The layout ID is stable; it's the zone assignments that change.
**How to avoid:** For layouts, include the layout `updated_at` timestamp in the version string, or include a hash of zone assignment IDs. The `get_layout_content` function already fetches all zone assignments -- adding an `updated_at` to the version computation catches any zone-level change.
**Warning signs:** Player continues showing old zone content after a zone playlist reassignment.

### Pitfall 4: Infinite Re-Sync Loop
**What goes wrong:** Mismatch detected, player re-fetches content, but the re-fetched content still doesn't match the expected version (e.g., CDN cache serving stale content).
**Why it happens:** CloudFront CDN may have a stale cached response for media URLs. The content resolution itself is fresh (direct Supabase RPC), but referenced media may be cached.
**How to avoid:** Content version comparison is based on content assignment IDs (playlist ID, layout ID), not media URL freshness. If the IDs match after reload, consider it verified regardless of CDN state. Limit re-sync retries to 3 with exponential backoff. After exhausting retries, keep playing current content and let Phase 68 alerts surface the issue.
**Warning signs:** Player cycling through re-syncs without the mismatch clearing.

### Pitfall 5: Version String Computation Drift Between Client and Server
**What goes wrong:** The client computes the version string differently from the server (different field ordering, different handling of null values), causing permanent false mismatches.
**Why it happens:** Two independent implementations (JavaScript client + SQL server) of the same algorithm.
**How to avoid:** (1) Keep the version string format simple and flat: `"{mode}:{source}:{contentId}"`. (2) The server should compute and return the expected version in the content response (from `get_resolved_player_content`), so the player just stores and reports what the server gave it, rather than computing its own version. This eliminates dual-computation entirely.
**Warning signs:** Every device showing "mismatched" even when content is correct.

## Discretion Recommendations

### Indicator design: Status row in Device Health section
**Recommendation:** Add the mismatch warning as a status card within the existing "Device Health" section, positioned after the offline banner and before the metrics grid. Use the same `bg-yellow-50 border border-yellow-200 rounded-lg p-3` pattern as the offline banner but with yellow coloring. Only show when `content_version_status === 'mismatched'` -- no indicator when verified.
**Rationale:** The Device Health section already has the offline banner as precedent for showing warnings. Adding verification here keeps all health indicators together. The user decided against a banner-style alert, so an inline card within the existing section is the right fit.

### Viewer-facing refresh: No visible indication
**Recommendation:** No visible indicator on the physical screen during content refresh. The content swap happens at the natural transition between playlist items (fade effect already in place). Viewers see a normal transition, not a "reloading" spinner.
**Rationale:** The user said "optimize for seamless viewer experience." The existing transition effects (fade, slide) already handle content changes smoothly. Adding a visual indicator would draw attention to the refresh rather than masking it.

### Heartbeat states: Two states (Verified / Mismatched)
**Recommendation:** Report only two states. "Syncing" is a transient client-side state (the few seconds during re-fetch) that is not useful to persist on the server.
**Rationale:** Three states adds complexity. "Syncing" would be stale by the time the next heartbeat reports it (30s later, the sync either succeeded or failed). The server cares about: "Is this device showing the right content?" -- the answer is either yes (verified) or no (mismatched).

### Big change behavior: Same timing for all changes
**Recommendation:** All mismatches are treated the same -- wait for the current item to finish, then reload. Whether it's a minor playlist reorder or a completely different playlist assignment, the swap happens at the next transition.
**Rationale:** Detecting "change magnitude" adds complexity with minimal benefit. Playlist items typically display for 5-30 seconds. Waiting for the current item to finish is a bounded delay that provides a seamless viewer experience regardless of change size. Emergency content (which IS urgent) already bypasses all of this via the emergency override mechanism with priority 999.

### Retry count and backoff: 3 retries, exponential backoff
**Recommendation:** 3 retry attempts for content re-sync, using `calculateBackoff()` from `playerService.js` (base 2s, max 30s, full jitter). Total worst-case retry window: ~35 seconds.
**Rationale:** 3 retries is enough to handle transient network failures without creating excessive load. The existing `calculateBackoff` with full jitter prevents thundering herd if multiple devices mismatch simultaneously (e.g., after a fleet-wide publish).

### Failure degradation: Keep playing stale content
**Recommendation:** After 3 failed re-sync attempts, stop retrying and keep playing the current (stale) content. This is better than blank screen (Phase 66's domain) or cached fallback (which may be even older). The mismatch status persists on the server for Phase 68 to pick up as an alert.
**Rationale:** Stale content > no content. The user's core value is "Screens reliably display content." A screen showing yesterday's playlist is far better than a screen showing an error. Phase 68 will surface persistent mismatches as alerts for operator intervention.

### Alert event emission: Store status for Phase 68 consumption
**Recommendation:** Store `content_version_status` ('verified' | 'mismatched') and `content_mismatch_since` timestamp on the `tv_devices` row. Phase 68 can query devices where `content_version_status = 'mismatched' AND content_mismatch_since < NOW() - interval '5 minutes'` to raise alerts. Do not emit discrete events -- the status column is sufficient.
**Rationale:** Future requirement ALRT-06 says "Content version mismatch generates dedicated alert type." By storing the status column now, Phase 68 can implement this without any Phase 67 changes. A simple status column is easier to query than an events table.

### Reset behavior: Auto-reset on successful heartbeat verification
**Recommendation:** When the player reports a version that matches the expected version, the status automatically transitions from 'mismatched' to 'verified' and `content_verified_at` updates. When content is published (e.g., `broadcastSceneUpdate` sets `needs_refresh = true`), set `content_version_status` to 'pending' to suppress false mismatch during the transition window. No manual reset needed.
**Rationale:** The system should be self-healing. If the publish flow triggers a reload and the player picks up the new content, the next heartbeat will verify it automatically. Manual reset is an escape hatch that operators shouldn't need.

### Media item changes: Include playlist/layout updated_at in version
**Recommendation:** The version string for playlists should include the playlist's `updated_at` timestamp (truncated to minutes). When media items are added/removed/reordered within a playlist, the playlist's `updated_at` changes, which changes the version string, triggering verification. This captures intra-playlist changes without hashing individual items.
**Rationale:** The user asked "Whether updates to media within a playlist trigger verification." The answer is yes, because any media change within a playlist updates the playlist's `updated_at` timestamp via the API. This naturally flows into the version identifier.

### Schedule verification: Yes, included in normal verification
**Recommendation:** Schedule-based content is already resolved by `get_resolved_player_content` which returns the active schedule entry. The version string includes the source ('schedule') and the content ID. When a schedule transitions to a different time slot, the expected version changes server-side, and the player's 30-second content poll (in `usePlayerContent`) will pick up the new content and report the new version on the next heartbeat.
**Rationale:** Schedules are just another content resolution path. The version comparison works the same way regardless of whether content comes from a direct assignment, campaign, or schedule.

### Multi-zone granularity: Verify layout as one unit
**Recommendation:** Verify the entire layout as a single unit using the layout ID + `updated_at`. Do not verify individual zones separately. If any zone changes, the layout's `updated_at` changes, triggering a full layout reload.
**Rationale:** The player already loads the full layout content (all zones) in a single RPC call. There's no mechanism to reload a single zone independently. Per-zone verification would add complexity without a corresponding per-zone reload capability.

### Manual sync button: Yes, include Force Sync button
**Recommendation:** Show a "Force Sync" button on the mismatch warning card in the ScreenDetailDrawer. Clicking it sets `needs_refresh = true` on the device (using the existing `broadcastSceneUpdate` / direct `tv_devices` update pattern). This triggers an immediate content reload on the next heartbeat.
**Rationale:** Operators want a manual escape hatch when they see a mismatch. The "Force Sync" button uses the same mechanism as the existing content push flow, so it's trivial to implement and provides operator confidence.

## Code Examples

### Server-Side: Content Version Computation Approach
```sql
-- The BEST approach: have get_resolved_player_content return a content_version field
-- so the player doesn't compute its own version. The player just stores and reports
-- what the server gave it.

-- In get_resolved_player_content, add to every return path:
-- 'content_version', v_mode || ':' || v_source || ':' || COALESCE(content_id::text, 'none')

-- Then in update_device_status, compute expected version using the same logic
-- and compare against the reported version.
```

### Player-Side: Heartbeat Mismatch Handling
```javascript
// In usePlayerHeartbeat.js, after calling updateDeviceStatus:
const statusResult = await updateDeviceStatus(screenId, PLAYER_VERSION, contentVersion, metrics);

// Check for content mismatch signal from server
if (statusResult?.content_mismatch && !statusResult?.needs_refresh) {
  // Mismatch detected -- signal verification hook
  onMismatchDetected?.(statusResult.expected_version, contentVersion);
}
```

### Player-Side: Transition-Aware Sync
```javascript
// In usePlayerPlayback.js or the advanceToNext callback:
// Before advancing to next item, check if a sync is pending

const handleAdvanceToNext = useCallback(async () => {
  // Check for pending content verification sync
  if (checkAndSync) {
    const synced = await checkAndSync();
    if (synced) {
      // Content was reloaded -- the new content will determine the next item
      return;
    }
  }
  // Normal advance
  advanceToNext();
}, [advanceToNext, checkAndSync]);
```

### Migration: Add Verification Columns
```sql
-- Add content verification columns to tv_devices
ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS content_version_status TEXT DEFAULT 'unknown'
  CHECK (content_version_status IN ('unknown', 'verified', 'mismatched', 'pending')),
ADD COLUMN IF NOT EXISTS content_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS content_mismatch_since TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expected_content_version TEXT,
ADD COLUMN IF NOT EXISTS reported_content_version TEXT;

-- Index for querying mismatched devices (Phase 68 alert queries)
CREATE INDEX IF NOT EXISTS idx_tv_devices_content_mismatch
ON tv_devices(content_version_status, content_mismatch_since)
WHERE content_version_status = 'mismatched';
```

### Extending get_screen_diagnostics for Verification
```sql
-- Add to the screen object in get_screen_diagnostics:
--   'content_version_status', COALESCE(v_screen.content_version_status, 'unknown'),
--   'content_verified_at', v_screen.content_verified_at,
--   'content_mismatch_since', v_screen.content_mismatch_since,
--   'expected_content_version', v_screen.expected_content_version,
--   'reported_content_version', v_screen.reported_content_version
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-only content hash (current) | Server-client version comparison | Phase 67 | Server can detect when player has stale content |
| `needs_refresh` flag only (push model) | `needs_refresh` + version verification (push + pull) | Phase 67 | Catches cases where push notification was missed or reload failed |
| No mismatch visibility | Inline warning in screen detail drawer | Phase 67 | Operators can see verification status without manual checking |
| `cached_content_hash` (djb2 hash of full content JSON) | `content_version` (structured ID string) | Phase 67 | Deterministic, lightweight, comparable between client and server |

**Deprecated/outdated:**
- The existing `cached_content_hash` field (djb2 hash from `generateContentHash()` in `playerService.js`) is a full-content JSON hash that is NOT comparable server-side (server would need to serialize the same JSON identically). Phase 67 replaces this with a structured version string. The old hash field can be retained for backward compatibility but is no longer the verification mechanism.
- The existing `player_content_hash` localStorage key stores a JSON object `{mode, source, playlistId, layoutId, campaignId}`. Phase 67 will replace this with the server-provided `content_version` string.

## Open Questions

1. **Campaign content rotation and version stability**
   - What we know: Campaigns use weighted random selection (`get_active_campaign_for_screen`). If multiple campaigns are active with rotation, the "expected" content changes based on the random selection at heartbeat time.
   - What's unclear: Whether the version should track the campaign assignment (stable) or the specific content selected by the campaign (variable due to rotation).
   - Recommendation: Track the campaign ID in the version, NOT the specific rotated content within the campaign. `"playlist:campaign:PLAYLIST_ID:cCAMPAIGN_ID"`. This way, as long as the correct campaign is active and feeding the player, it's considered "verified" regardless of which rotation item is currently showing.

2. **CDN cache invalidation timing**
   - What we know: STATE.md flags "Verify CloudFront CDN TTL/invalidation timing for content verification grace period" as a concern.
   - What's unclear: What the current CloudFront TTL is for media assets, and whether stale CDN responses could cause a player to load the "right" playlist ID but with old media URLs.
   - Recommendation: Content verification is based on content assignment IDs (playlist ID, layout ID), not media URL freshness. CDN staleness is a separate concern from content verification. If media within a correctly-assigned playlist is stale due to CDN, that's not a verification mismatch -- it's a CDN invalidation issue. Keep verification scoped to "is the right content assigned?" not "are all assets fresh?"

3. **Language-resolved scene variants**
   - What we know: The content resolution applies language resolution (`get_scene_for_device_language`) to get the correct scene variant. Different devices in the same group may display different scene variants based on their display_language.
   - What's unclear: Whether the version should use the original scene ID or the resolved (language-variant) scene ID.
   - Recommendation: Use the RESOLVED scene ID in the version string. The server resolves the language variant during content resolution, and the player receives the resolved variant. Both sides should use the same resolved ID for consistency.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `supabase/migrations/149_telemetry_metrics.sql` -- current `update_device_status` RPC with `p_cached_content_hash` and `p_metrics` parameters
- Codebase analysis: `supabase/migrations/147_portrait_mode.sql` -- full `get_resolved_player_content` RPC with content resolution priority chain (Emergency > Campaign > Device Scene > Group Scene > Schedule > Legacy Schedule > Layout > Playlist)
- Codebase analysis: `supabase/migrations/151_diagnostics_metrics.sql` -- current `get_screen_diagnostics` RPC with device_metrics extension
- Codebase analysis: `src/player/hooks/usePlayerHeartbeat.js` -- heartbeat hook sending contentHash and metrics every 30s, checking needs_screenshot and needs_refresh
- Codebase analysis: `src/player/hooks/usePlayerContent.js` -- content loading with content hash computation (`{mode, source, playlistId, layoutId, campaignId}`), 30s polling, offline cache fallback
- Codebase analysis: `src/player/hooks/useAutoRecovery.js` -- progressive recovery (soft_reload -> hard_reload -> cached_fallback -> exhausted) with localStorage crash counter
- Codebase analysis: `src/player/pages/ViewPage.jsx` -- ViewPage wiring all hooks, transition points via `handleAdvanceToNext`
- Codebase analysis: `src/services/playerService.js` -- `updateDeviceStatus()`, `calculateBackoff()`, `generateContentHash()`
- Codebase analysis: `src/services/deviceSyncService.js` -- `needs_refresh` flag, `broadcastSceneUpdate()`, `checkDeviceRefreshStatus()`
- Codebase analysis: `src/components/ScreenDetailDrawer.jsx` -- full drawer layout with Overview, Device Health, Screenshot, Content Source, Current Content, Recent Activity sections
- Codebase analysis: `src/services/screenDiagnosticsService.js` -- diagnostics helpers, MetricCard pattern, `getMetricStatus()`, `formatMetricValue()`
- Phase 64 summaries: Heartbeat telemetry pipeline with JSONB metrics, pg_cron offline detection, alert integration
- Phase 66 summaries: Auto-recovery with crash counter, blank screen detection, progressive recovery strategy

### Secondary (MEDIUM confidence)
- REQUIREMENTS.md: VERI-01 through VERI-04 requirement definitions; explicit exclusion of "SHA-256 content hashing on player"
- STATE.md: Blocker note "Verify CloudFront CDN TTL/invalidation timing for content verification grace period"
- Future requirement ALRT-06: "Content version mismatch generates dedicated alert type" -- informs design of status column for Phase 68 consumption

### Tertiary (LOW confidence)
- Campaign rotation behavior during version computation -- the `get_active_campaign_for_screen` function uses weighted random selection, which may return different results on consecutive calls. Needs validation that campaign-level version (not content-rotation-level) is the right granularity.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project, no new dependencies
- Architecture: HIGH - extends existing heartbeat, content resolution, and diagnostics infrastructure with well-understood patterns; all key interfaces are thoroughly documented in Phase 64/66 summaries
- Pitfalls: HIGH - identified from actual codebase analysis of content resolution flow, heartbeat timing, publish flow, and campaign rotation behavior
- Version computation: MEDIUM - the dual-computation approach (client + server) has drift risk; the recommended "server provides version" pattern eliminates this but needs validation that `get_resolved_player_content` can be extended cleanly

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable domain, no fast-moving dependencies)
