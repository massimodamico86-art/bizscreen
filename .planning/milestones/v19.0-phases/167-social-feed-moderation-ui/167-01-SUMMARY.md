---
phase: 167-social-feed-moderation-ui
plan: "01"
subsystem: services
tags: [services, social-feed, moderation, data-layer, tdd]
requirements: [WDGT-01, WDGT-02]

dependency_graph:
  requires:
    - src/supabase.js
    - src/services/tenantService.js
    - supabase/migrations/081_social_media_feeds.sql
  provides:
    - src/services/socialFeedModerationService.js
  affects:
    - Plan 02 (UI component that consumes these three functions)

tech_stack:
  added: []
  patterns:
    - PostgREST left-join embedding for pending detection via `.is('moderation.id', null)`
    - Upsert with `onConflict: 'tenant_id,feed_id'` for idempotent approve/reject
    - Tenant scoping via `getEffectiveOwnerId()` (no caller-supplied tenant_id)

key_files:
  created:
    - src/services/socialFeedModerationService.js
    - tests/unit/services/socialFeedModerationService.test.js
  modified: []

decisions:
  - "Strip embedded `moderation` key from fetchPendingModerationItems return — callers only need the feed shape, not the join artifact"
  - "Shared `upsertModeration(feedId, approved)` helper to avoid code duplication between approve and reject"
  - "Return early with [] when ownerId is null to satisfy T-167-01 threat mitigation (no supabase call with null tenant)"

metrics:
  duration: "12 minutes"
  completed_date: "2026-04-12"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 167 Plan 01: Social Feed Moderation Service Summary

## One-Liner

JWT-scoped service layer for social feed moderation queue using PostgREST left-join pending detection and idempotent upsert with `tenant_id,feed_id` conflict key.

## What Was Built

Created the data access layer for the Social Feed Moderation UI (Plan 02 consumer):

- `fetchPendingModerationItems()` — queries `social_feeds` with a left-embed of `social_feed_moderation` and filters `.is('moderation.id', null)` to return only unmoderated items for the current tenant; strips the `moderation` join artifact before returning
- `approveModerationItem(feedId)` — upserts `social_feed_moderation` with `approved: true`
- `rejectModerationItem(feedId)` — upserts `social_feed_moderation` with `approved: false`

Both approve/reject delegate to a shared `upsertModeration(feedId, approved)` helper that hard-codes the `tenant_id` from `getEffectiveOwnerId()` (preventing cross-tenant writes, per T-167-02).

## TDD Execution

**RED commit (d8743378):** `tests/unit/services/socialFeedModerationService.test.js` — 8 test cases covering list-success, list-empty, list-no-owner, list-error, approve-success, approve-error, reject-success, reject-error. Suite failed with "Cannot find module" as expected.

**GREEN commit (d4034c2d):** `src/services/socialFeedModerationService.js` — all 8 tests pass.

## Test Results

```
Test Files  1 passed (1)
      Tests  8 passed (8)
   Duration  277ms
```

Full unit suite: 55/59 files pass; the 4 failing files (`tests/integration/featureFlags.test.js`, `tests/integration/usageQuotas.test.js`, `tests/unit/api/lruCache.test.js`, `tests/unit/api/usageTracker.test.js`) are pre-existing failures unrelated to this plan.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Coverage

| Threat | Mitigation | Implemented |
|--------|-----------|-------------|
| T-167-01 (Info Disclosure) | Filter by `tenant_id = ownerId`, return [] if null | Yes — `if (!ownerId) return []` |
| T-167-02 (Tampering) | tenant_id set from `getEffectiveOwnerId()`, not caller | Yes — upsertModeration hard-codes ownerId |
| T-167-03 (Repudiation) | Accept — moderated_by/at written per schema | N/A (accept) |
| T-167-04 (EoP) | `.is('moderation.id', null)` cannot be subverted by client | Yes — PostgREST filter |
| T-167-05 (DoS) | Accept — no LIMIT, deferred to Plan 02 | N/A (accept) |

## Known Stubs

None — all three functions are fully wired to Supabase.

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| d8743378 | test | add failing tests for socialFeedModerationService (RED) |
| d4034c2d | feat | implement socialFeedModerationService (GREEN) |

## Self-Check

Files created:
- `src/services/socialFeedModerationService.js` — FOUND
- `tests/unit/services/socialFeedModerationService.test.js` — FOUND

Commits:
- d8743378 — FOUND
- d4034c2d — FOUND

## Self-Check: PASSED
