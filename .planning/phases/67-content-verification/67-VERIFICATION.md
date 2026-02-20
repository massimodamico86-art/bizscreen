---
phase: 67-content-verification
verified: 2026-02-20T20:00:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Trigger a content mismatch on a live player by reassigning a different playlist, wait for heartbeat, confirm yellow warning appears in ScreenDetailDrawer"
    expected: "Yellow 'Content Mismatch' card visible in Device Health section; Force Sync button present; clicking it clears the warning within one heartbeat cycle"
    why_human: "Requires a live Supabase environment with a paired TV device to observe the full roundtrip: heartbeat RPC comparison, DB column update, drawer refresh, and Force Sync button effect"
  - test: "Confirm content re-sync happens only at a playlist transition, not mid-item"
    expected: "Current item plays to completion; sync occurs at the transition boundary before the next item starts; no visible interruption"
    why_human: "Transition-aware timing cannot be verified with grep; requires observing player behavior across a full item cycle when a mismatch is pending"
---

# Phase 67: Content Verification Verification Report

**Phase Goal:** Operators can trust that screens are displaying the correct published content, not stale versions
**Verified:** 2026-02-20T20:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Player computes a canonical content version string from resolved content and sends it on every heartbeat | VERIFIED | `computeContentVersion()` exported from `src/services/playerService.js` (line 361); called in `usePlayerContent.js` on load (line 173) and poll update (line 294); `contentVersionRef` passed to `usePlayerHeartbeat` which sends it via `updateDeviceStatus(... contentVersion)` (line 129) |
| 2 | Server detects when a player's reported content version differs from the currently published version | VERIFIED | `update_device_status` RPC in `153_content_verification.sql` computes `v_expected_version` via full priority chain (emergency > campaign > device scene > group scene > layout > playlist), compares with `p_content_version`, returns `content_mismatch` boolean in JSONB response (line 181) |
| 3 | Player automatically retries content sync when the server signals a version mismatch | VERIFIED | `useContentVerification.js` receives `onMismatchDetected` callback from heartbeat (wired in `ViewPage.jsx` line 192); queues `pendingSyncRef=true`; `checkAndSync()` retries via `loadContentRef.current()` up to `MAX_SYNC_RETRIES=3` before graceful degradation |
| 4 | Content verification runs after playback starts and never interrupts or delays active content display | VERIFIED | `verifiedAdvanceToNext` wrapper in `ViewPage.jsx` (line 156) calls `checkAndSync()` only between items; passed as `advanceToNext` parameter to `usePlayerPlayback` so all transition paths (timer, video-end, error handlers) go through it; sync never triggered mid-item |

**Score:** 4/4 truths verified

---

### Required Artifacts

#### Plan 01 Artifacts

| Artifact | Provides | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `supabase/migrations/153_content_verification.sql` | Content verification columns, extended update_device_status with version comparison, extended get_screen_diagnostics | Yes | Yes — 355 lines, 5 columns, partial index, full priority chain, mismatch flag in response | N/A (migration) | VERIFIED |
| `src/services/playerService.js` | computeContentVersion function and extended updateDeviceStatus | Yes | Yes — `computeContentVersion` at line 361 handles layout/playlist/scene/emergency modes; `updateDeviceStatus` sends `p_content_version` and returns `content_mismatch`, `expected_content_version` | Imported by `usePlayerContent.js`, called in `usePlayerHeartbeat.js` | VERIFIED |
| `src/player/hooks/usePlayerHeartbeat.js` | Heartbeat sends content version and checks mismatch response | Yes | Yes — reads `contentVersionRef.current`, calls `updateDeviceStatus` with it, checks `statusResult?.content_mismatch`, calls `onMismatchDetected` callback | Called from `ViewPage.jsx` with `contentVersionRef` and `onMismatchDetected` options | VERIFIED |
| `src/player/hooks/usePlayerContent.js` | Content version stored in state from resolved content | Yes | Yes — `contentVersionRef = useRef(null)` at line 122; populated at line 173 on load and line 294 on poll; exported in hook return at line 363 | Consumed by `ViewPage.jsx` and forwarded to heartbeat | VERIFIED |

#### Plan 02 Artifacts

| Artifact | Provides | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `src/player/hooks/useContentVerification.js` | Content verification state management with transition-aware re-sync | Yes | Yes — 125 lines; `onMismatchDetected`, `checkAndSync`, `hasPendingSync`, auto-reset effect; all refs (no useState) | Imported and used in `ViewPage.jsx`; in barrel export `hooks/index.js` | VERIFIED |
| `src/player/pages/ViewPage.jsx` | ViewPage wired with useContentVerification at advanceToNext transition point | Yes | Yes — imports `useContentVerification`, creates `verifiedAdvanceToNext` wrapper, passes to `usePlayerPlayback`, passes `onMismatchDetected` to heartbeat | Central orchestration point for all three systems | VERIFIED |
| `src/components/ScreenDetailDrawer.jsx` | Mismatch warning card in Device Health section with Force Sync button | Yes | Yes — imports `forceDeviceSync`; renders yellow card only when `content_version_status === 'mismatched'`; Force Sync button calls `forceDeviceSync(screenInfo.id)` with toast feedback | Renders `screenInfo.content_version_status` from `get_screen_diagnostics` data | VERIFIED |
| `src/services/screenDiagnosticsService.js` | Helper function for Force Sync action | Yes | Yes — `forceDeviceSync` exported at line 219; updates `needs_refresh=true` and `content_version_status='pending'` | Imported by `ScreenDetailDrawer.jsx` | VERIFIED |

---

### Key Link Verification

#### Plan 01 Key Links

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `usePlayerContent.js` | `playerService.js` | `computeContentVersion` called on content load | WIRED | `import { computeContentVersion }` at line 20 of `usePlayerContent.js`; called at lines 173, 294 |
| `usePlayerHeartbeat.js` | `update_device_status` RPC | Sends `contentVersion` parameter | WIRED | `updateDeviceStatus(screenId, PLAYER_VERSION, contentHash, metrics, contentVersion)` at line 129; maps to `p_content_version` in RPC call |
| `update_device_status` RPC | `tv_devices.content_version_status` | SQL comparison and column update | WIRED | `UPDATE tv_devices SET content_version_status = CASE ...` at lines 147-158 of migration 153 |

#### Plan 02 Key Links

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `useContentVerification.js` | `usePlayerContent.js` | `loadContentRef.current()` for re-fetching | WIRED | `loadContentRef.current?.(screenId, false)` at line 71 of `useContentVerification.js`; `loadContentRef` passed as prop from ViewPage |
| `ViewPage.jsx` | `useContentVerification.js` | `checkAndSync` called in `verifiedAdvanceToNext` | WIRED | `const synced = await checkAndSync()` at line 157; `verifiedAdvanceToNext` passed to `usePlayerPlayback` at line 173 |
| `usePlayerHeartbeat.js` | `useContentVerification.js` | `onMismatchDetected` callback from heartbeat response | WIRED | `onMismatchDetected` passed in options to `usePlayerHeartbeat` at line 192 of ViewPage; called at line 136 of usePlayerHeartbeat when `content_mismatch` is true |
| `ScreenDetailDrawer.jsx` | `screenDiagnosticsService.js` | `forceDeviceSync` triggers needs_refresh | WIRED | `import { forceDeviceSync }` at line 42 of ScreenDetailDrawer; called at line 288 in Force Sync button onClick |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| VERI-01 | 67-01 | Player reports content version identifier on each heartbeat | SATISFIED | `computeContentVersion()` + `contentVersionRef` in `usePlayerContent.js`; forwarded via `usePlayerHeartbeat` to `updateDeviceStatus` RPC on every 30s heartbeat |
| VERI-02 | 67-01 | Server detects content version mismatch between published and player-reported versions | SATISFIED | `update_device_status` computes full priority-chain `v_expected_version`, compares with `p_content_version`, stores `content_version_status` on device row, returns `content_mismatch` boolean |
| VERI-03 | 67-02 | Player auto-retries content sync when server signals version mismatch | SATISFIED | `useContentVerification` hook: `onMismatchDetected` queues pending sync; `checkAndSync` retries via `loadContentRef` up to 3 times with graceful degradation on exhaustion |
| VERI-04 | 67-02 | Content verification never blocks active playback (play-then-verify pattern) | SATISFIED | `verifiedAdvanceToNext` wrapper only calls `checkAndSync` at transition boundary; all playback timer, video-end, and error paths flow through it; current item plays uninterrupted |

All four VERI requirements are satisfied. No orphaned requirements found — REQUIREMENTS.md shows all four mapped to Phase 67 and marked Complete.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/services/playerService.js` | 373 | `mode === 'scene'` branch in `computeContentVersion` — dead code path since `get_resolved_player_content` never returns `mode='scene'` (resolves to underlying `layout` or `playlist`) | Info | None — branch is unreachable; version strings still match correctly because the server also resolves scenes to their underlying type |
| `src/player/hooks/usePlayerHeartbeat.js` | 135 | `!statusResult?.needs_refresh` guard is redundant — `needs_refresh` is not in the RPC response JSONB | Info | None — evaluates to `!undefined` which is `true`, so the guard never blocks the callback; server-side suppression already handles this correctly by returning `content_mismatch: false` when `needs_refresh=true` in DB |

No blockers or warnings found. Both items are info-level observations that do not affect correctness.

---

### Human Verification Required

#### 1. Live Mismatch Detection Roundtrip

**Test:** Pair a TV device, assign a playlist, wait for it to appear online. Then reassign the device to a different playlist (creating a server-side expected version change). Wait up to 30 seconds for the next heartbeat.
**Expected:** The ScreenDetailDrawer for that device shows a yellow "Content Mismatch" card with a "Force Sync" button. Clicking Force Sync shows a toast "Sync requested — screen will update shortly" and clears the yellow card (status transitions to 'pending').
**Why human:** Requires a live Supabase instance with a paired player device to verify the DB write, RPC comparison, and drawer UI update through a real heartbeat cycle.

#### 2. Transition-Aware Sync Timing

**Test:** With a mismatch pending (heartbeat received `content_mismatch: true`), observe the player during playlist item playback.
**Expected:** The current item plays to full completion without interruption. The content sync attempt happens only at the natural transition to the next item. No visual glitch, pause, or flash occurs during playback.
**Why human:** Playback timing and visual smoothness cannot be verified programmatically; requires watching the player in real time.

---

### Build Verification

Build result: `npm run build` — PASSED (12.57s, no errors; only pre-existing chunk size advisory warnings unrelated to this phase)

---

### Gaps Summary

No gaps. All four observable truths are verified, all eight artifacts exist and are substantively implemented, all four key links are wired, all four VERI requirements are satisfied, and the build passes clean. Two info-level observations (dead code branch, redundant guard) have no correctness impact.

---

_Verified: 2026-02-20T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
