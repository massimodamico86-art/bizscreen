---
phase: 167-social-feed-moderation-ui
fixed_at: 2026-04-13T00:00:00Z
review_path: .planning/phases/167-social-feed-moderation-ui/167-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 167: Code Review Fix Report

**Fixed at:** 2026-04-13T00:00:00Z
**Source review:** .planning/phases/167-social-feed-moderation-ui/167-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (1 critical, 3 warning)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### CR-01: Social Moderation page exposed to all users without a feature flag or role guard

**Files modified:** `src/App.jsx`, `src/config/plans.js`
**Commit:** d9c7a36d
**Applied fix:**
- Added `Feature.SOCIAL_FEED = 'social_feed'` constant to `src/config/plans.js` (Feature enum).
- Added `FEATURE_METADATA` entry for SOCIAL_FEED ("Social Feed Moderation", marketing category).
- Included `'social_feed'` in the feature lists for the Pro, Enterprise, and Reseller plans (Free and Starter intentionally excluded so the moderation UI is gated behind a paid plan).
- Wrapped the `social-moderation` route in `src/App.jsx` with `<FeatureGate feature={Feature.SOCIAL_FEED} fallback={<FeatureUpgradePrompt feature={Feature.SOCIAL_FEED} onNavigate={() => setCurrentPage('account-plan')} />}>`, mirroring the gating pattern used by Analytics, AI Assistant, Campaigns, etc.
- Added `feature: Feature.SOCIAL_FEED` to the `social-moderation` entry in the `navigation` array so the existing sidebar `canAccess` logic dims/disables the nav item for tenants whose plan does not include it.

### WR-01: Optimistic-update rollback captures a stale snapshot when multiple rapid actions are in flight

**Files modified:** `src/pages/SocialFeedModerationPage.jsx`
**Commit:** f1488d04
**Applied fix:**
- Replaced the closure-captured `const previous = items` with a `let snapshot` populated atomically inside the functional `setItems` updater. The snapshot now reflects the actual current state at the moment the update is applied, so a failed action rolls back to the correct list even when multiple actions are in flight concurrently.

### WR-02: `fetchPendingModerationItems` may silently return already-moderated items when PostgREST left-join filter is not supported server-side

**Files modified:** `src/services/socialFeedModerationService.js`
**Commit:** 8465acda
**Applied fix:**
- Added a defensive `.filter((row) => row.moderation === null || row.moderation?.id == null)` step before stripping the embedded `moderation` key, ensuring that any row returned with a non-null embedded moderation record is dropped client-side. This guards against the embedded-resource `IS NULL` filter being silently ignored by older PostgREST/Supabase client versions.

### WR-03: `upsertModeration` silently sets `moderated_by: null` when `auth.getUser()` fails

**Files modified:** `src/services/socialFeedModerationService.js`
**Commit:** 42bafcc3
**Applied fix:**
- Destructured `error` from the `supabase.auth.getUser()` response and emit a `console.warn` when it is non-null, so a stale or failing session is visible in the logs rather than silently producing a `moderated_by: null` upsert. The existing `null` fallback for `moderatedBy` is preserved (the column remains nullable per the migration), but operators can now correlate a missing audit-trail row with the underlying auth failure.

---

_Fixed: 2026-04-13T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
