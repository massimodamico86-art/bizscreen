---
phase: 67-content-verification
plan: 01
subsystem: database, player
tags: [supabase, rpc, heartbeat, content-verification, mismatch-detection, postgresql]

# Dependency graph
requires:
  - phase: 64-telemetry
    provides: "update_device_status RPC with metrics parameter, heartbeat telemetry pipeline"
  - phase: 65-screenshots
    provides: "get_screen_diagnostics with screenshot fields"
  - phase: 66-auto-recovery
    provides: "Recovery state in heartbeat metrics, useAutoRecovery for failure escalation"
provides:
  - "content_version_status, content_verified_at, content_mismatch_since columns on tv_devices"
  - "Server-side expected content version computation in update_device_status"
  - "content_mismatch boolean and expected_content_version in heartbeat response"
  - "computeContentVersion() function in playerService.js"
  - "contentVersionRef exposed from usePlayerContent for heartbeat reporting"
  - "onMismatchDetected callback in usePlayerHeartbeat for Plan 02 to wire re-sync"
  - "get_screen_diagnostics extended with verification fields for dashboard display"
  - "Partial index idx_tv_devices_content_mismatch for Phase 68 alert queries"
affects: [67-02-content-verification, 68-alerts]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Server-client version comparison via heartbeat response", "needs_refresh suppression to avoid false positive mismatches during publish window"]

key-files:
  created:
    - "supabase/migrations/153_content_verification.sql"
  modified:
    - "src/services/playerService.js"
    - "src/player/hooks/usePlayerHeartbeat.js"
    - "src/player/hooks/usePlayerContent.js"

key-decisions:
  - "Scene version resolution joins scenes table to produce underlying content type (layout/playlist) rather than generic scene identifier, matching get_resolved_player_content output"
  - "Version string uses lightweight ID-based format (mode:source:contentId) not SHA-256 hash, per REQUIREMENTS.md constraint on Tizen/WebOS"
  - "Mismatch suppressed during needs_refresh window by setting status to pending, preventing false positives after publish"
  - "onMismatchDetected callback approach (not state/effect) keeps heartbeat hook stateless for mismatch handling"

patterns-established:
  - "Content version format: {mode}:{source}:{contentId}[:c{campaignId}] -- deterministic, lightweight, comparable"
  - "Server computes expected version from content resolution priority chain in heartbeat RPC"
  - "content_mismatch_since uses COALESCE to only record first mismatch timestamp, not overwrite on subsequent heartbeats"

requirements-completed: [VERI-01, VERI-02]

# Metrics
duration: 14min
completed: 2026-02-20
---

# Phase 67 Plan 01: Content Verification Pipeline Summary

**Server-side content version comparison in heartbeat RPC with mismatch detection, player-side canonical version computation and reporting via contentVersionRef**

## Performance

- **Duration:** 14 min
- **Started:** 2026-02-20T18:44:23Z
- **Completed:** 2026-02-20T18:57:57Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Database migration with 5 verification columns, partial index, and extended update_device_status computing expected version across full priority chain (emergency, campaign, device scene, group scene, layout, playlist)
- computeContentVersion() function producing canonical version strings from resolved content
- Heartbeat sends content version and receives mismatch boolean, with onMismatchDetected callback ready for Plan 02
- get_screen_diagnostics extended with all verification fields for dashboard display

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration with content verification columns and extended heartbeat RPC** - `8e03d5e` (feat)
2. **Task 2: Add content version computation to playerService and wire heartbeat reporting** - `b7f198b` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `supabase/migrations/153_content_verification.sql` - Content verification columns, extended update_device_status with version comparison, extended get_screen_diagnostics
- `src/services/playerService.js` - computeContentVersion() function and extended updateDeviceStatus with contentVersion parameter
- `src/player/hooks/usePlayerHeartbeat.js` - Sends contentVersion on heartbeat, checks mismatch response, calls onMismatchDetected callback
- `src/player/hooks/usePlayerContent.js` - Computes and exposes contentVersionRef on content load and poll update

## Decisions Made
- Scene version resolution joins scenes table to resolve to underlying content type (layout/playlist with device_override/group_override source), matching what get_resolved_player_content returns to the player -- avoids permanent false mismatches
- Version string format is `{mode}:{source}:{contentId}` with optional `:c{campaignId}` suffix, not SHA-256 hash (per REQUIREMENTS.md Tizen/WebOS constraint)
- needs_refresh suppression sets content_version_status to 'pending' and returns content_mismatch=false during publish window, preventing false positive mismatches
- onMismatchDetected is a callback parameter (not hook state/effect) so heartbeat hook remains stateless for mismatch handling -- Plan 02 will create useContentVerification to manage verification state
- content_mismatch_since uses COALESCE(content_mismatch_since, NOW()) to only record first detection timestamp, not overwrite on subsequent heartbeats (useful for Phase 68 alert duration queries)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed scene version string computation to match player-received content**
- **Found during:** Task 2 verification (cross-checking server and client version formats)
- **Issue:** Server computed `scene:device_override:{scene_id}` for device scene overrides, but get_resolved_player_content returns `mode='layout'` or `mode='playlist'` with `source='device_override'` and the layout/playlist ID -- the player would compute `layout:device_override:{layout_id}` causing permanent false mismatches
- **Fix:** Added LEFT JOIN to scenes table in heartbeat RPC to resolve scene's actual content (layout_id or primary_playlist_id), producing matching version strings like `layout:device_override:{layout_id}`
- **Files modified:** supabase/migrations/153_content_verification.sql
- **Verification:** Traced version string format through both code paths -- server and client now produce identical strings for all content resolution modes
- **Committed in:** b7f198b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix preventing permanent false mismatches for scene-based content. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- contentVersionRef and onMismatchDetected callback are ready for Plan 02 to wire useContentVerification hook
- get_screen_diagnostics returns all verification fields for Plan 02's dashboard mismatch warning display
- Partial index idx_tv_devices_content_mismatch ready for Phase 68 alert queries

## Self-Check: PASSED

- FOUND: supabase/migrations/153_content_verification.sql
- FOUND: commit 8e03d5e (Task 1)
- FOUND: commit b7f198b (Task 2)
- FOUND: 67-01-SUMMARY.md

---
*Phase: 67-content-verification*
*Completed: 2026-02-20*
