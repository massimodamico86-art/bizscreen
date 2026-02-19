# Research Summary: Player Hardening

**Domain:** Digital signage player reliability, monitoring & self-healing
**Researched:** 2026-02-19
**Overall confidence:** HIGH

## Executive Summary

The BizScreen codebase already contains robust implementations of every major building block needed for player hardening. The screenshot service (`screenshotService.js`) captures DOM snapshots via `html2canvas`, uploads to Supabase Storage, and handles offline queuing. The alert engine (`alertEngineService.js`) supports 11 alert types with severity escalation, rate limiting, deduplication, and dispatches via in-app and email channels. The stuck detection hook (`useStuckDetection.js`) monitors video stalls and page inactivity. The cache service (`cacheService.js`) provides IndexedDB v4 storage with LRU eviction and an offline event queue.

The player hardening milestone is therefore NOT about building new systems from scratch -- it is about deepening and connecting existing systems. Specifically: (1) adding auto-recovery actions to the existing stuck detection, (2) collecting diagnostic telemetry from browser APIs and shipping it to the existing telemetry table, (3) computing SHA-256 content hashes client-side using the native Web Crypto API to verify content integrity, and (4) adding a handful of new alert types to the existing engine.

**Zero new npm dependencies are needed.** All capabilities can be built with existing packages (`html2canvas`, `idb`, `@sentry/react`, `@supabase/supabase-js`, `resend`) plus standard browser APIs (`SubtleCrypto.digest`, `navigator.storage.estimate`, `performance.memory`, `navigator.connection`). The Web Crypto API for SHA-256 hashing is Baseline Widely Available since January 2020 and works on all target platforms including Tizen and WebOS smart TV webviews.

The biggest risks are self-inflicted: an auto-recovery system that causes infinite reload loops (the #1 critical pitfall), screenshot capture causing memory leaks on long-running players, and content hash verification generating false positive alerts due to CDN caching delays. All of these are well-understood patterns with known mitigations documented in PITFALLS.

## Key Findings

**Stack:** Zero new npm dependencies. Use existing `html2canvas`, `idb`, `@sentry/react`, `@supabase/supabase-js` plus browser-native Web Crypto API, StorageManager, Performance API, NetworkInformation API.

**Architecture:** Layered defense model -- stuck detection -> auto-recovery -> error boundary -> SW watchdog. Each layer catches what slips through the layer above. All layers report to existing Supabase backend + alert engine.

**Critical pitfall:** Infinite reload loop from auto-recovery. Must use `localStorage` crash counter with stability timer, progressive backoff, and hard stop at 6 crashes showing static fallback content.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Auto-Recovery & Crash Detection** - Build first because this is the highest-impact feature (prevents screens from going dark). Builds directly on existing `useStuckDetection.js`.
   - Addresses: Progressive recovery, crash counting, fallback content, recovery loop detection
   - Avoids: Infinite reload loop pitfall via crash counter pattern

2. **Diagnostic Telemetry Collection** - Build second because it enables all subsequent debugging and monitoring. Without telemetry, operators have zero visibility into device health.
   - Addresses: Memory/storage/network diagnostics, heartbeat enrichment, telemetry batching
   - Avoids: Telemetry volume pitfall via client-side throttle and batch inserts

3. **Content Verification** - Build third because it depends on understanding the content lifecycle and having telemetry to debug false positives.
   - Addresses: SHA-256 hashing, manifest verification, cache integrity, mismatch alerting
   - Avoids: CDN false positive pitfall via grace period and retry-with-cache-bust

4. **Screenshot Enhancement** - Build fourth because screenshots already work. This phase is polish (scheduled captures, retry, quality validation).
   - Addresses: Scheduled screenshots, retry logic, quality validation, memory-safe capture
   - Avoids: Memory leak pitfall via explicit cleanup and frequency limits

5. **Alert System Extensions** - Build last because it wires into the outputs of all previous phases.
   - Addresses: New alert types, escalation rules, dashboard UI updates, notification mappings
   - Avoids: Alert storm pitfall by relying on existing coalescing and rate limiting

6. **Service Worker Watchdog** (optional, if time permits) - Most complex feature with highest platform compatibility risk. Defer unless Phase 1-5 auto-recovery proves insufficient.
   - Addresses: Frozen tab recovery on smart TVs
   - Avoids: False positive reload pitfall via generous timeout and pause mechanism

**Phase ordering rationale:**
- Phases 1-2 are the "safety net" (keep screens running + see what is happening)
- Phases 3-4 are the "quality assurance" (verify content is correct + visual proof)
- Phase 5 is the "notification wiring" (tell operators about problems found by phases 1-4)
- Phase 6 is "deep defense" (catch edge cases phases 1-2 miss)

**Research flags for phases:**
- Phase 1: Needs careful testing of crash counter behavior across page reloads on all target platforms (web, Android, iOS, Tizen, WebOS). localStorage behavior on smart TVs needs validation.
- Phase 3: Needs investigation of how content hashes are currently computed server-side (Supabase RPC `check_if_scene_changed`) to ensure client-side SHA-256 produces matching hashes.
- Phase 6: Likely needs deeper research. Service Worker `clients.navigate()` support on Tizen 6.5 and WebOS 23 is unverified. May need to be scoped as an experimental feature with a feature flag.

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Stack | HIGH | Verified all existing packages via package.json + npm view. Verified browser API compatibility via MDN. Zero new deps needed. |
| Features | HIGH | Every feature maps to a specific existing service or proven browser API. Feature landscape is well-defined. |
| Architecture | HIGH | Layered defense pattern is well-established for kiosk web apps. All integration points verified by reading actual code. |
| Pitfalls | HIGH for patterns, MEDIUM for smart TV specifics | Pitfall patterns (reload loops, memory leaks, CDN caching) are well-documented in the industry. Smart TV-specific behavior (Tizen/WebOS) based on training data, not verified on hardware. |

## Gaps to Address

- **Server-side hash computation**: How does `check_if_scene_changed` RPC compute `content_hash`? Need to verify the algorithm matches what `SubtleCrypto.digest('SHA-256')` will produce client-side. If the server uses a different hashing approach (e.g., PostgreSQL `md5()`), client-side verification will always mismatch.
- **Tizen/WebOS Service Worker support**: Training data says Tizen 4.0+ and WebOS 4.0+ support basic SW, but `clients.navigate()` specifically has not been verified on these platforms. Needs device testing.
- **Supabase Storage lifecycle policies**: Need to verify if Supabase Storage supports automatic object expiration (TTL) for old screenshots, or if cleanup must be done via application code (current approach in `cleanupOldScreenshots`).
- **Telemetry table indexes**: Current `screen_telemetry` table schema needs review for query patterns used by the telemetry dashboard (likely needs composite index on `screen_id + event_timestamp`).
- **Real device memory constraints**: Tizen/WebOS RAM limits (1-2GB total shared with OS) need to be considered when setting memory warning thresholds. The 80% heap threshold may need adjustment based on actual device testing.
