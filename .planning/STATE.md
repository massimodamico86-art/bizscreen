# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core value:** Screens reliably display the right content at the right time, even when offline
**Current focus:** Phase 67 — Content Verification

## Current Position

Phase: 67 — fourth of 5 in v4.0 Player Hardening (Phases 64-68)
Plan: 1 of 2 complete
Status: In Progress
Last activity: 2026-02-20 — Plan 01 (Content version reporting and mismatch detection pipeline) complete

Progress: [█████-----] 50%

## Milestones Shipped

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v1 Production Release | 1-12 | 75 | 2026-01-24 |
| v2 Templates & Platform | 13-23 | 39 | 2026-01-27 |
| v2.1 Tech Debt Cleanup | 24-29 | 11 | 2026-01-28 |
| v2.2 Onboarding Polish | 30-35 | 16 | 2026-02-05 |
| v2.3 Production Hardening | 36-41 | 18 | 2026-02-09 |
| v2.4 Tech Debt Zero | 42-45 | 11 | 2026-02-10 |
| v3.0 Creative Experience | 46-50 | 10 | 2026-02-11 |
| v3.1 Data-Driven Screens | 51-55 | 15 | 2026-02-13 |
| v3.2 Display Toolkit | 56-63 | 16 | 2026-02-19 |

## Performance Metrics

**Cumulative (v1 through v3.2):**
- Total plans executed: 212
- Total phases: 63 completed
- Total milestones: 9 shipped

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 64 | 01 | 2min | 2 | 3 |
| 64 | 02 | 2min | 1 | 1 |
| 64 | 03 | 2min | 2 | 3 |
| 65 | 01 | 2min | 2 | 1 |
| Phase 65 P02 | 2min | 2 tasks | 2 files |
| 66 | 01 | 3min | 2 | 4 |
| 66 | 02 | 2min | 1 | 2 |
| 67 | 01 | 14min | 2 | 4 |

## Accumulated Context

### Decisions

Full decision log in PROJECT.md Key Decisions table.

- **64-01:** Metrics collected in hook file (not playerService) -- browser APIs are player-specific
- **64-01:** Each browser API call individually try-catch wrapped for graceful degradation
- **64-01:** DROP old function signature before CREATE OR REPLACE to avoid PostgreSQL overload conflict
- **64-02:** Dual-path alert resolution (instant heartbeat + periodic cron sweep) for reliability
- **64-02:** ON CONFLICT upsert for alert coalescing eliminates race conditions vs SELECT-then-INSERT
- **64-02:** Severity escalation at SQL level so cron job is fully autonomous
- **64-03:** Metric cards use border-l-4 color coding (green/yellow/red/gray) instead of gauges for compact display
- **64-03:** 30-second polling interval matches heartbeat cycle for fresh data on each refresh
- **64-03:** Offline banner and grayed-out stale metrics follow locked user decisions from CONTEXT.md
- **65-01:** All screenshot timing within heartbeat sendBeat() cycle -- no separate setInterval
- **65-01:** Recovery detection via wasOfflineRef set in catch block, cleared on successful heartbeat
- **65-01:** Initial capture fires naturally because lastScreenshotTimeRef starts at 0
- [Phase 65]: 65-02: Screenshot fields flow through existing get_screen_diagnostics RPC (no additional API call)
- [Phase 65]: 65-02: Capture Now button disables on both local requesting state and server needs_screenshot_update flag
- [Phase 65]: 65-02: 3-second delayed refresh after capture request picks up pending state before 30-second auto-refresh cycle
- **66-01:** mountTimeRef removed from useAutoRecovery since blank detection lives in useStuckDetection
- **66-01:** Recovery metrics only in heartbeat when crashCount > 0 to avoid polluting normal telemetry
- **66-01:** Blank screen detection uses 10s grace + 3 consecutive checks (30s) to prevent false positives
- **66-02:** isExhausted check placed before loading state check so exhausted devices never show spinner
- **66-02:** screenshotInProgressRef gates onPageStuck and onBlankScreen but not onVideoStuck (video restart is non-destructive)
- **67-01:** Scene version resolution joins scenes table to produce underlying content type (layout/playlist), not generic scene identifier
- **67-01:** Version string uses lightweight ID-based format (mode:source:contentId) per REQUIREMENTS.md Tizen/WebOS constraint
- **67-01:** Mismatch suppressed during needs_refresh window (status='pending') preventing false positives after publish
- **67-01:** onMismatchDetected callback approach keeps heartbeat hook stateless for mismatch handling

### Blockers/Concerns

- Phase 64: Confirm pg_cron availability on current Supabase plan (Edge Function cron is fallback)
- Phase 67: Verify CloudFront CDN TTL/invalidation timing for content verification grace period
- Phase 68: Verify which notification_preferences columns are actively wired in notificationDispatcherService.js

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 43 | Fix 17 remaining Playwright e2e test failures | 2026-02-18 | cab3395 | [43-fix-17-remaining-playwright-e2e-test-fai](./quick/43-fix-17-remaining-playwright-e2e-test-fai/) |
| 44 | Fix 4 failing Playwright e2e tests (auth/connection) | 2026-02-19 | 0ce7539 | [44-fix-4-failing-playwright-e2e-tests](./quick/44-fix-4-failing-playwright-e2e-tests/) |

## Session Continuity

Last session: 2026-02-20
Stopped at: Completed 67-01-PLAN.md
Resume file: .planning/phases/67-content-verification/67-01-SUMMARY.md
Next: 67-02-PLAN.md (transition-aware re-sync, dashboard mismatch warning)

---
*Updated: 2026-02-20 -- Phase 67 Plan 01 complete (1/2 plans)*
