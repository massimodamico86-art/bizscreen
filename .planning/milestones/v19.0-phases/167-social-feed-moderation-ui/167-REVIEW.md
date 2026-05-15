---
phase: 167-social-feed-moderation-ui
reviewed: 2026-04-12T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/services/socialFeedModerationService.js
  - tests/unit/services/socialFeedModerationService.test.js
  - src/pages/SocialFeedModerationPage.jsx
  - src/App.jsx
  - tests/e2e/social-feed-moderation.spec.js
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 167: Code Review Report

**Reviewed:** 2026-04-12T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Five files were reviewed covering the Social Feed Moderation UI: a data-access service, its unit tests, the React page component, the App.jsx routing diff, and E2E smoke tests.

The service layer is well-structured and its tenant-scoping approach mirrors the established pattern in the codebase. The page component is clean and readable. However there is one critical security issue — the `social-moderation` route is exposed to all authenticated users without any feature flag or role guard, which deviates from the established gating pattern used by every other feature page in the app. Three additional logic/correctness warnings are present, along with two minor info items in the tests.

---

## Critical Issues

### CR-01: Social Moderation page exposed to all users without a feature flag or role guard

**File:** `src/App.jsx:540` (new line in diff)

**Issue:** Every comparable feature page in `App.jsx` (Campaigns, Screen Groups, Analytics, AI Assistant, Developer Settings, White Label, Reseller, etc.) is wrapped in a `<FeatureGate>`. The new `social-moderation` entry is rendered bare, identical to `review-inbox` — the one other un-gated page. This means any authenticated tenant can reach the moderation queue regardless of whether their plan includes the Social Feed feature, and regardless of user role. If a tenant has no social feeds at all the queue is just empty, but a tenant on a plan that has never had social feeds enabled should not see a menu entry for, or be able to navigate to, this page.

Beyond plan gating, the nav item is added to the flat `sidebarNavItems` array (line 481) which is the client-tier navigation array — it will appear in the sidebar for every client-role user and for every admin/super_admin while impersonating. There is no role guard (e.g., restricting to `admin` or `client` with the Social Feed feature) and no feature flag check.

**Fix:** Wrap the route in `<FeatureGate>` the same way analogous pages are gated. If a `Feature.SOCIAL_FEED` (or similar) constant exists in `featureFlags.js`, use it; otherwise add one. Example:

```jsx
// src/App.jsx — pages map
'social-moderation': (
  <Suspense fallback={<PageLoader />}>
    <FeatureGate
      feature={Feature.SOCIAL_FEED}
      fallback={
        <FeatureUpgradePrompt
          feature={Feature.SOCIAL_FEED}
          onNavigate={() => setCurrentPage('account-plan')}
        />
      }
    >
      <SocialFeedModerationPage showToast={showToast} onNavigate={setCurrentPage} />
    </FeatureGate>
  </Suspense>
),
```

Additionally, if the nav item should only render when the feature is enabled, the `sidebarNavItems` array entry should be conditionally included (or the sidebar should honour FeatureGate visibility, whichever pattern the app already uses for other feature-gated nav items).

---

## Warnings

### WR-01: Optimistic-update rollback captures a stale snapshot when multiple rapid actions are in flight

**File:** `src/pages/SocialFeedModerationPage.jsx:48`

**Issue:** `handleAction` captures `const previous = items` at the top of the function using the state value from the enclosing render closure. If a user fires two actions in quick succession (e.g., approves item A, then immediately approves item B before the first await resolves), the second call captures `previous` before item A has been removed from state. If the first action then fails and rolls back using its own `previous` snapshot, item A reappears even though it was already removed by the second action's optimistic update, leaving the UI in an inconsistent state.

**Fix:** Use the functional `setItems` overload for rollback, capturing the snapshot at the moment of action initiation against the actual current state:

```jsx
async function handleAction(feedId, kind) {
  // Capture snapshot atomically via functional updater
  let snapshot;
  setItems((curr) => {
    snapshot = curr;
    return curr.filter((x) => x.id !== feedId);
  });
  setPendingAction((p) => ({ ...p, [feedId]: kind === 'approve' ? 'approving' : 'rejecting' }));
  try {
    if (kind === 'approve') {
      await approveModerationItem(feedId);
      showToast?.(t('socialModeration.approved', 'Item approved'));
    } else {
      await rejectModerationItem(feedId);
      showToast?.(t('socialModeration.rejected', 'Item rejected'));
    }
  } catch (err) {
    console.error('[SocialFeedModerationPage]', kind, 'failed:', err);
    showToast?.(
      kind === 'approve'
        ? t('socialModeration.approveFailed', 'Failed to approve item')
        : t('socialModeration.rejectFailed', 'Failed to reject item'),
      'error'
    );
    setItems(snapshot); // rollback to the snapshot captured at action time
  } finally {
    setPendingAction((p) => { const c = { ...p }; delete c[feedId]; return c; });
  }
}
```

### WR-02: `fetchPendingModerationItems` may silently return already-moderated items when PostgREST left-join filter is not supported server-side

**File:** `src/services/socialFeedModerationService.js:49`

**Issue:** The query uses `.is('moderation.id', null)` to filter rows where no `social_feed_moderation` row exists for the tenant (line 49). This PostgREST embedded-resource filter syntax (`relation.column`) works only when PostgREST correctly translates it into an `IS NULL` condition on the outer join. If the PostgREST version or Supabase client version does not support the dot-notation filter on an embedded left-join, the filter is silently ignored and all `social_feeds` rows for the tenant (including already-approved or already-rejected ones) are returned. The caller would then display the full feed as if everything is pending, with no visible error.

**Fix:** Add a server-side RPC or a database view to handle this query reliably, or at a minimum add a defensive post-filter in the service as a belt-and-suspenders guard:

```js
// After fetching, defensively strip any rows that have a non-null moderation entry
// (guards against PostgREST silently ignoring the embedded-resource IS NULL filter)
return (data || [])
  .filter((row) => row.moderation === null || row.moderation?.id == null)
  .map(({ moderation, ...rest }) => rest);
```

This does not fix a broken server-side filter, but ensures the UI never shows a row that the DB returned with an attached moderation record.

### WR-03: `upsertModeration` silently sets `moderated_by: null` when `auth.getUser()` fails

**File:** `src/services/socialFeedModerationService.js:95-96`

**Issue:** The `supabase.auth.getUser()` call is fire-and-forget with no error check. If the session is stale or the network call fails, `userResult` is `undefined` or `{ data: null }`, `moderatedBy` is set to `null`, and the upsert proceeds silently with a null `moderated_by`. Depending on the DB schema constraint on `moderated_by` this will either succeed (losing the audit trail) or fail with a DB error that surfaces only as "Failed to approve/reject moderation item: ..." — giving no indication that the session was the root cause.

**Fix:** Check the error returned by `auth.getUser()` and, at minimum, log a warning:

```js
const { data: userResult, error: authError } = await supabase.auth.getUser();
if (authError) {
  console.warn('[socialFeedModerationService] auth.getUser failed:', authError.message);
}
const moderatedBy = userResult?.user?.id ?? null;
```

If `moderated_by` is a required audit column, consider throwing instead of falling through with `null`.

---

## Info

### IN-01: Unit test chainable mock does not verify `eq` is called with the correct tenant_id

**File:** `tests/unit/services/socialFeedModerationService.test.js:68-73`

**Issue:** The `fetchPendingModerationItems` happy-path test (line 52) sets up the chainable mock but does not assert that `.eq('tenant_id', 'tenant-1')` was called. The test only checks the shape of returned data. If someone removes or changes the `.eq('tenant_id', ...)` call in the service, the test still passes. Given that tenant isolation is the primary security property of this service, the test should verify it explicitly.

**Fix:**

```js
expect(chain.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1');
expect(chain.is).toHaveBeenCalledWith('moderation.id', null);
```

Add these assertions to the existing happy-path test after the `expect(result[0].provider)` assertions.

### IN-02: E2E test does not await `navLink` visibility before `refresh` test (third test)

**File:** `tests/e2e/social-feed-moderation.spec.js:69`

**Issue:** The third test ("refresh button is present and clickable") calls `await navLink.click()` without first asserting `navLink` is visible with a timeout (unlike the first two tests which use `await expect(navLink).toBeVisible({ timeout: 10000 })`). If the sidebar is slow to render, the click will fail with a "locator not visible" error rather than a timeout-based failure, which is harder to diagnose.

**Fix:**

```js
const navLink = page.getByRole('button', { name: /social moderation/i }).first();
await expect(navLink).toBeVisible({ timeout: 10000 }); // add this line
await navLink.click();
```

---

_Reviewed: 2026-04-12T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
