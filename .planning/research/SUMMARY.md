# Project Research Summary

**Project:** BizScreen v4.0 — Player Hardening
**Domain:** Digital signage player reliability, monitoring, and self-healing operations
**Researched:** 2026-02-19
**Confidence:** HIGH

## Executive Summary

The v4.0 Player Hardening milestone is fundamentally an integration and wiring project, not a greenfield build. BizScreen already has approximately 70-80% of the required infrastructure: a working screenshot pipeline (`screenshotService.js`), a full-featured alert engine with 11 types and auto-escalation (`alertEngineService.js`), stuck detection (`useStuckDetection.js`), a three-phase offline cache (`cacheService.js`, `offlineService.js`), and a notification dispatch system covering both in-app and email (`notificationDispatcherService.js`). Zero new npm packages are needed. The recommended approach is to connect these existing systems with minimal new code — 4 new files, 9 modified files, and one database migration — while strictly following the established heartbeat-piggybacking and hook-composition patterns already throughout the codebase.

The single most critical missing piece is a **server-side heartbeat evaluator**: a scheduled function (Supabase pg_cron or Edge Function cron) that evaluates device heartbeat staleness and automatically triggers or resolves alerts. Every other monitoring feature — offline alerts, content mismatch detection, group health alerting — depends on this trigger existing. Without it, the entire alert-driven operations story collapses even though all the downstream machinery (alert engine, notification dispatcher, email delivery, UI) is fully built and waiting. This evaluator must be Phase 1.

The top implementation risk is **infinite reload loops from auto-recovery**. If a crash occurs during the startup path itself (corrupt IndexedDB, Supabase schema mismatch, bad cached content), naive auto-recovery fires repeatedly and bricks the device — no heartbeat can be sent during rapid reload cycles, making the device unreachable even for remote commands. Prevention requires a localStorage crash counter with a progressive backoff strategy, a hard maximum of 6 crashes before halting recovery, a stability timer that resets the counter only after 5 minutes of clean operation, and a pre-cached static fallback page that renders without any React or Supabase dependency. This guard must be the first thing implemented in the auto-recovery phase.

---

## Key Findings

### Recommended Stack

No new npm dependencies are required. The entire milestone is built on packages already in `package.json`: `html2canvas` v1.4.1 (screenshot capture), `idb` v8.0.3 (IndexedDB offline cache), `@sentry/react` v10.36.0 (error monitoring), `@supabase/supabase-js` (backend), and `resend` v6.8.0 (email alerts). Browser standard APIs cover the remaining gaps — `crypto.subtle.digest()` for content hashing (Baseline since January 2020, no polyfill), `navigator.storage.estimate()` for storage diagnostics (Baseline since September 2023), `performance.memory` for heap monitoring (Chromium-only, graceful degrade on iOS), and `navigator.connection` for network quality (Chromium-only, graceful degrade on iOS).

See `.planning/research/STACK-PLAYER-HARDENING.md` for full analysis including platform-specific API availability matrix.

**Core technologies:**
- `html2canvas` v1.4.1: screenshot capture — already working with JPEG compression, CORS handling, offline queuing; do not replace with alternatives
- `SubtleCrypto.digest('SHA-256')`: content hash verification — native browser API, zero-dependency, no npm hash libraries needed
- `navigator.connection` / `performance.memory`: diagnostic telemetry — Chromium-only APIs that cover all target smart TV platforms; gracefully degrade on iOS
- IndexedDB v4 (`cacheService.js`): offline resilience — bump to v5 to add a telemetry store; all existing stores unchanged
- Supabase pg_cron or Edge Function cron: server-side heartbeat evaluator — the only genuinely new infrastructure component in the entire milestone

**Three stack decisions with the strongest cross-researcher consensus:**
- Content verification MUST use HTTP HEAD requests, not SHA-256 blob hashing — hashing multi-hundred-MB video files on memory-constrained smart TVs causes playback jank and OOM crashes
- Telemetry MUST piggyback on the existing 30s heartbeat — never create a new `setInterval` for server communication
- Telemetry storage MUST use a JSONB snapshot column on `tv_devices` (latest state only), not a new time-series table — `player_network_metrics` already covers time-series network data

### Expected Features

See `.planning/research/FEATURES-PLAYER-HARDENING.md` for full feature matrix with complexity ratings and the complete dependency graph.

**Must have (table stakes) — ship in v4.0:**
- Automated device offline alerts — the core monitoring feature; `raiseDeviceOfflineAlert()` exists but nothing calls it automatically
- Screenshot display on Screen Detail page — `last_screenshot_url` is already stored; the ScreenDetailDrawer simply does not display it prominently
- Automated screenshot capture on interval — a counter in the heartbeat hook; no server changes needed
- Player auto-recovery from stuck states — `useStuckDetection` callbacks exist but are not wired to any recovery actions in ViewPage
- Content version mismatch detection — server-side comparison of expected vs. reported content hash; alert type `device_cache_stale` already exists
- Connection status indicator on player — wire existing `connectionStatus` state to existing `SyncStatusIndicator` component

**Should have (differentiators) — include where complexity permits:**
- Device diagnostic telemetry dashboard — memory, network, storage metrics surfaced on ScreenDetailDrawer from `player_telemetry` JSONB
- Recovery escalation state machine — formalize tiered recovery (skip item -> reload content -> page reload -> halt + fallback)
- Recovery loop detection with fallback content — localStorage crash counter, static fallback page pre-cached at pairing time
- Screenshot failure alerting — already implemented in `screenshotService.js`; only a device-metadata wiring fix needed
- Player self-diagnostics report — bundle telemetry + error buffer for on-demand operator inspection

**Defer to future milestone (v4.1+):**
- Screenshot history timeline — 5-screenshot retention is sufficient for v4.0; increase after core monitoring is proven
- Email digest for alert summaries — DB schema columns (`email_digest_enabled`, `email_digest_frequency`) are ready; low urgency
- Proactive screen group health alerting — natural follow-on after per-device alerting stabilizes
- Offline event replay orchestration — foundation exists and is functional; not urgent
- Network quality monitoring dashboard — data collection is easy but the UI adds scope to v4.0

**Anti-features — explicitly do not build:**
- Live video streaming from player (screenshots cover 95% of the diagnostic need at 1/50th the bandwidth)
- Player-side AI anomaly detection (incompatible with smart TV memory constraints)
- Full remote desktop/VNC (security risk; remote commands + screenshots + telemetry are sufficient)
- CPU estimation via `requestAnimationFrame` timing (unreliable, battery-draining; no real browser API exists)
- Real-time console log streaming (ingestion cost at scale; Sentry + "last 20 errors" buffer covers the need)
- Native push notifications via FCM/APNs (platform-specific complexity; 30s polling + Realtime is acceptable for signage)

### Architecture Approach

The architecture is coordinator-pattern hook composition, where `ViewPage.jsx` wires hooks together via refs (not state) to avoid re-render cascades on resource-constrained hardware. The key addition is `useAutoRecovery.js` which intercepts `useStuckDetection` callbacks and orchestrates a 4-stage escalation: content skip -> content reload -> page reload -> halt and display fallback. Recovery actions are returned as descriptors from the hook; ViewPage executes them — matching the established pattern already used by `usePlayerContent` and `usePlayerCommands`. All player-to-server communication flows through the existing 30s heartbeat; no new intervals are created. The server-side heartbeat evaluator is the only component that lives entirely outside the player codebase.

See `.planning/research/ARCHITECTURE-PLAYER-HARDENING.md` for data flow diagrams (all 6 data flows), exact file modification list with risk ratings, and dependency-based build order.

**New files to create (4 total):**
1. `src/player/hooks/useAutoRecovery.js` (~100 lines) — multi-stage recovery orchestration with localStorage crash counter and stability timer; returns action descriptors, does not execute side effects
2. `src/player/hooks/useContentVerification.js` (~70 lines) — HTTP HEAD checks on content URLs after each content load; reports verification status to telemetry pipeline
3. `src/player/services/telemetryCollector.js` (~50 lines) — aggregates health snapshot (memory, cache size, recovery stage, content verification status, uptime) for the heartbeat payload
4. `supabase/migrations/XXX_player_hardening.sql` (~50 lines) — adds `player_telemetry` JSONB column and `last_telemetry_at` to `tv_devices`, extends `update_device_status` RPC, adds 2 new alert type values to the CHECK constraint

**Existing files to modify (9 total):**
- `usePlayerHeartbeat.js` — add periodic auto-screenshot (time-elapsed check, not a new interval), accept and forward telemetry to `updateDeviceStatus` RPC
- `ViewPage.jsx` — wire `useAutoRecovery` in place of direct stuck callbacks, wire `useContentVerification`, pass telemetry ref
- `playerService.js` — extend `updateDeviceStatus` to accept optional telemetry param (backward compatible, `DEFAULT NULL`)
- `alertEngineService.js` — add `content_verification_failed` and `device_recovery_exhausted` types with escalation rules and helper functions
- `ScreenDetailDrawer.jsx` — add screenshot panel with image display, age indicator ("Captured 3 min ago"), and "Request New Screenshot" button
- `sw.js` — add watchdog ping/pong interval (30s check, 90s timeout) for frozen main thread detection
- `offlineService.js` — add `WATCHDOG_PONG` response handler (3 lines)
- `NotificationBell.jsx` — add 2 icon mappings for new alert types (2 lines)
- `src/player/hooks/index.js` — export 2 new hooks (trivial)

**Files that need NO changes:** `realtimeService.js`, `notificationDispatcherService.js`, `screenshotService.js`, `cacheService.js`, `useStuckDetection.js`, `usePlayerCommands.js`, `AlertsCenterPage.jsx` — these implementations are complete and correct as-is.

### Critical Pitfalls

See `.planning/research/PITFALLS-PLAYER-HARDENING.md` for full analysis including detection signals and phase-specific warnings.

1. **Infinite reload loop from auto-recovery** — recovery triggers a reload but the crash happens during startup, creating an infinite loop that bricks the device with no heartbeat reachable. Prevention: localStorage crash counter, hard maximum of 6 crashes, progressive backoff between levels, pre-cached static fallback that does not depend on React or Supabase. Implement this guard FIRST before wiring any recovery action.

2. **Service Worker watchdog killing healthy tabs** — timeout too aggressive causes false-positive reloads during heavy operations (content load, screenshot capture, cache sync). Prevention: 60-second minimum timeout (not 30), `WATCHDOG_PAUSE` message posted during known heavy operations, progressive two-ping response before forcing navigation.

3. **CDN cache false positives on content hash mismatch** — CloudFront serves stale content after an update, triggering spurious `DEVICE_CONTENT_MISMATCH` alerts that operators learn to ignore. Prevention: 5-minute grace period after content change detection, retry with cache-busting query param before alerting, accept both old and new hash during transition window.

4. **html2canvas memory leak on 24/7 players** — screenshot captures cause gradual heap growth on memory-constrained smart TVs. Prevention: cap scheduled screenshots at once every 15 minutes (not 5), explicit canvas cleanup after blob conversion (set dimensions to 0, remove from DOM, null all refs), skip capture if heap usage exceeds 80%.

5. **Race condition between recovery and content load** — `useStuckDetection` fires a second time while a recovery action is already in progress (async content reload can take >30 seconds). Prevention: `recoveryInProgress` ref that blocks additional triggers; 2-minute max timeout automatically clears the lock.

---

## Implications for Roadmap

Research strongly suggests a 5-phase structure ordered by dependency chain and risk mitigation priority.

### Phase 1: Foundation — Telemetry Pipeline + Server-Side Evaluator

**Rationale:** The server-side heartbeat evaluator is the single blocking dependency for all alert-driven monitoring. Telemetry infrastructure must land first because every subsequent phase adds health state that gets reported through the same pipeline. The database migration (new columns, new alert types in CHECK constraint) must precede any feature code that references those types. This phase has the clearest implementation pattern and no exotic requirements.

**Delivers:** Automated device offline alerts (raise and auto-resolve via pg_cron or Edge Function), enriched heartbeat payload carrying telemetry JSONB, `player_telemetry` snapshot stored on `tv_devices`, 2 new alert types registered in the database schema.

**Addresses:** Table stakes #3 (automated offline alerts); unblocks table stakes #5 (content mismatch detection).

**Avoids:** Shipping UI features before the alert trigger infrastructure exists; avoids schema migration conflicts across later phases.

**Concrete scope:** Create `telemetryCollector.js`, extend `playerService.updateDeviceStatus()` with optional telemetry param, write Supabase migration, deploy heartbeat evaluator as scheduled function.

### Phase 2: Screenshot Enhancement

**Rationale:** Highest operator-visible impact per engineering hour. Screenshot display on ScreenDetailDrawer transforms monitoring from "I see an offline indicator" to "I can see what the screen is actually showing." Auto-interval capture is approximately 5 lines added to `usePlayerHeartbeat`. Both features build directly on Phase 1's heartbeat infrastructure with no new dependencies or schema changes.

**Delivers:** Screenshot image displayed prominently in ScreenDetailDrawer with timestamp and age indicator; "Request New Screenshot" button; screenshots captured every 5 minutes automatically (not only on operator demand); screenshot failure alerting verified working with correct device metadata.

**Addresses:** Table stakes #1 (screenshot on detail page), table stakes #2 (auto-capture interval), table stakes #7 (screenshot failure alerting verification).

**Avoids:** html2canvas memory leak — implement explicit canvas cleanup and enforce 15-minute minimum frequency as part of this phase (Pitfall #2).

### Phase 3: Auto-Recovery

**Rationale:** Second-highest operator impact (stuck screens are the #1 support complaint in digital signage). Depends on Phase 1 telemetry because `device_recovery_exhausted` is signaled via the telemetry payload to the server-side evaluator rather than raised directly from the player (player runs as anon role and may lack permissions to insert alerts). The `useAutoRecovery` hook wraps existing detection and does not replace it.

**Delivers:** 4-stage progressive recovery (skip item -> reload content -> page reload -> halt with fallback), crash counter in localStorage with stability timer and hard maximum, static "Please stand by" fallback page pre-cached in IndexedDB at pairing time, `device_recovery_exhausted` alert path, connection status indicator rendered in ViewPage.

**Addresses:** Table stakes #4 (player auto-recovery), table stakes #6 (connection status indicator), differentiator: recovery loop detection with fallback content.

**Avoids:** Infinite reload loop — implement crash counter and hard maximum BEFORE wiring any recovery action to any event (Pitfall #1). Implement `recoveryInProgress` ref before connecting stuck detection callbacks (Pitfall #8).

### Phase 4: Content Verification

**Rationale:** Most nuanced feature; depends on Phase 3's recovery handling for what to do when verification fails repeatedly. HTTP HEAD checks (not SHA-256 blob hashing) is the mandated implementation approach — critical for performance on smart TV hardware. Server-side content hash comparison builds on the Phase 1 evaluator infrastructure already in place.

**Delivers:** `useContentVerification.js` checking URL accessibility after each content load event, `content_verification_failed` alert raised when >50% of content items fail verification, content verification status included in telemetry payload, server-side comparison of expected vs. player-reported content hash via Phase 1 evaluator.

**Addresses:** Table stakes #5 (content version mismatch detection), differentiator: content verification checksums.

**Avoids:** CDN cache false positives — implement 5-minute grace period and cache-busting retry before alerting (Pitfall #3). Do NOT implement SHA-256 blob hashing on the player under any circumstances — HEAD requests only.

### Phase 5: Service Worker Watchdog + Alert Tuning

**Rationale:** Capstone phase. The watchdog is a safety net for frozen-thread scenarios not covered by JavaScript error boundaries. Alert threshold tuning is best done after observing real alert patterns from Phases 1-4 in production. Lower risk because it modifies only peripheral files (`sw.js`, `offlineService.js`) and adds no new data stores.

**Delivers:** SW watchdog ping/pong for frozen main thread detection (30s ping interval, 90s timeout before forced reload), alert escalation threshold review and tuning based on production data, stale screenshot detection query in the Phase 1 evaluator (flag online devices without screenshots in >30 minutes), diagnostic telemetry cards in ScreenDetailDrawer (memory gauge, network quality badge, storage usage bar).

**Addresses:** Differentiator: device diagnostic telemetry UI, differentiator: player self-diagnostics report, overall system hardening.

**Avoids:** SW watchdog killing healthy tabs — enforce 60s timeout minimum and implement `WATCHDOG_PAUSE` during known heavy operations (Pitfall #4). Validate IndexedDB v5 migration includes delete-and-recreate fallback on corruption detection (Pitfall #5).

### Phase Ordering Rationale

- Phase 1 must be first: the server-side evaluator and DB migration are blocking dependencies for alert-raising in Phases 3 and 4, and the telemetry JSONB column is the reporting channel for all subsequent health state.
- Phase 2 is second: screenshot UI delivers the highest operator-visible value with the lowest risk and shortest implementation cycle; it is fully independent of recovery and verification.
- Phase 3 precedes Phase 4: content verification failure handling needs the recovery layer present — a verified-failed content state needs a recovery action path available, and the `recoveryInProgress` guard prevents verification retries from conflicting with active recovery.
- Phase 5 is last: watchdog and threshold tuning benefit from real production alert data; they are polish work, not foundational.
- Each phase produces independently deployable value with no cross-phase shipping dependency.

### Research Flags

**Phases with standard, well-documented patterns — skip `/gsd:research-phase`:**
- **Phase 2 (Screenshots):** Standard UI wiring; complete implementation with exact code snippets documented in ARCHITECTURE-PLAYER-HARDENING.md.
- **Phase 3 (Auto-Recovery):** State machine fully specified; localStorage crash counter is a well-established signage pattern with clear implementation in ARCHITECTURE-PLAYER-HARDENING.md.

**Phases that benefit from a brief planning spike before writing tasks:**
- **Phase 1 (Server-Side Evaluator):** Confirm whether pg_cron is enabled on the current Supabase plan tier. If not, Edge Function cron is the fallback — syntax and cold-start behavior differ. Verify before writing implementation tasks.
- **Phase 4 (Content Verification):** CDN grace period timing depends on actual CloudFront TTL configuration for Supabase Storage. Verify whether automatic CDN invalidation fires on content updates, and what the typical propagation time is.
- **Phase 5 (SW Watchdog):** `clients.navigate()` on Tizen and WebOS service workers is LOW confidence (cannot verify without device access). Include a fallback path via `postMessage` reload instruction and plan device-level testing before shipping this phase.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All findings verified by direct codebase analysis; zero new npm packages means no version compatibility uncertainty |
| Features | HIGH | Existing infrastructure audited file-by-file; gaps are specific and verified (e.g., confirmed no automated trigger in alertEngineService, confirmed unconnected stuck callbacks in ViewPage) |
| Architecture | HIGH | Every recommended change verified against actual source files; data flow diagrams derived from reading live code, not documentation or assumptions |
| Pitfalls | MEDIUM | Critical and moderate pitfalls derived from codebase analysis and domain expertise; smart TV platform specifics (Tizen SW behavior, WebOS webview quirks) are MEDIUM due to no physical device access for verification |

**Overall confidence:** HIGH

### Gaps to Address

- **Supabase plan tier for pg_cron:** Confirm pg_cron availability before choosing between pg_cron and Edge Function cron for the heartbeat evaluator. If using Edge Function cron, confirm Supabase cron scheduling syntax and cold-start latency characteristics.

- **Smart TV SW `clients.navigate()` support:** The SW watchdog relies on `clients.navigate()` to reload a frozen player. This is confirmed on desktop Chrome but behavior on Tizen 6.5 and WebOS 4.x is LOW confidence. Include a fallback path and plan device-level testing before Phase 5 ships.

- **CloudFront/Supabase Storage CDN invalidation:** Content verification grace period timing in Phase 4 depends on actual CDN TTL and whether automatic invalidation is triggered on content updates. Verify this during Phase 4 task planning.

- **`notification_preferences` wiring completeness:** The schema has `email_digest_enabled`, quiet hours, and severity filter columns, but the features research notes the table is "partially wired." Verify exactly which preference columns are actively respected by `notificationDispatcherService.js` before building user-configurable alert filtering UI.

- **iOS WKWebView graceful degradation:** `performance.memory` and `navigator.connection` are both unavailable on iOS. The diagnostic telemetry UI must display "unavailable" for these metrics rather than null or zero values. Design null states explicitly from the start of Phase 5.

---

## Sources

### Primary (HIGH confidence — direct codebase analysis)

All findings verified by reading actual source files in `/Users/massimodamico/bizscreen/`:

- `src/player/hooks/usePlayerHeartbeat.js` — heartbeat flow, screenshot trigger on `needs_screenshot_update` flag, content hash
- `src/player/hooks/useStuckDetection.js` — detection logic, callback surface, confirmed disconnected from recovery actions
- `src/player/hooks/usePlayerContent.js` — content loading, retry strategy, offline fallback, hash-based change detection
- `src/player/hooks/usePlayerCommands.js` — remote command handling (reboot, reload, clear_cache, reset)
- `src/player/cacheService.js` — IndexedDB v4 schema, LRU eviction, offline queue primitives
- `src/player/offlineService.js` — service worker registration, 3-phase sync, existing message handler
- `src/services/screenshotService.js` — capture, upload, cleanup (keep last 5), failure tracking, offline queue
- `src/services/alertEngineService.js` — 11 alert types, escalation rules, coalescing via unique index, rate limiting
- `src/services/notificationDispatcherService.js` — in-app + email dispatch, user preferences, quiet hours
- `src/services/playerService.js` — `updateDeviceStatus` RPC signature, `calculateBackoff` pattern
- `src/player/pages/ViewPage.jsx` — coordinator pattern, hook composition via refs
- `src/components/ScreenDetailDrawer.jsx` — existing diagnostic display surface
- `supabase/migrations/072_device_heartbeat.sql`, `075_device_screenshots.sql`, `082_alerts_notifications.sql` — schema ground truth for all device, screenshot, and alert tables

### Secondary (HIGH confidence — MDN verified)

- `SubtleCrypto.digest()` — SHA-256 on ArrayBuffer, Baseline since January 2020, no polyfill required
- `navigator.storage.estimate()` — Baseline since September 2023, universal browser support
- `performance.memory` — Chromium-only, deprecated but functional in all target TV platform webviews (Tizen 6.5 Chromium ~94, WebOS 23 Chromium ~108)

### Tertiary (MEDIUM confidence — training data, unverified on device)

- Tizen 6.5 uses approximately Chromium 94 — all recommended APIs present in this version per Samsung developer documentation
- WebOS 23 uses approximately Chromium 108 — all recommended APIs present in this version per LG developer documentation
- Service Worker `clients.navigate()` on Tizen/WebOS — confirmed in SW support docs but not verified via physical device testing

---
*Research completed: 2026-02-19*
*Ready for roadmap: yes*
