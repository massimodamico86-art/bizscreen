---
phase: 180-v21-launch-readiness
reviewed: 2026-05-12T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - src/pages/SuperAdminDashboardPage.jsx
  - supabase/functions/generate-svg-template/index.ts
  - tests/e2e/admin-template-queue-nav.spec.js
findings:
  critical: 0
  critical_resolved: 1
  warning: 3
  info: 2
  total: 6
  resolved: 1
status: partial — CR-01 closed by Plan 180-08; WR-01/WR-02/WR-03 + IN-01/IN-02 deferred to v21.1 test-infra polish (non-blocking)
---

# Phase 180: Code Review Report

**Reviewed:** 2026-05-12T00:00:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** partial — CR-01 closed by Plan 180-08; WR-01/WR-02/WR-03 + IN-01/IN-02 deferred to v21.1 test-infra polish (non-blocking)

## Summary

Phase 180 closes three v21.0-MILESTONE-AUDIT items — BLOCKER-1 (admin nav tile), FLOW-1 (no CustomEvent literals in the new spec), and a WARNING reclassification (EF header comment refresh). The functional code surface is small and the auth/routing wiring is correct, but the header-refresh deliverable introduced fresh doc drift that contradicts itself against the live dispatcher in the same file. The new Playwright spec is structurally sound but its skip-guard is asymmetric vs the reference spec it claims to mirror, which can turn a clean skip into a runtime failure on partially configured environments.

**Scope assessment per orchestrator focus areas:**

1. **Auth gate (SuperAdminDashboardPage.jsx):** No new auth surface. The new tile is rendered inside the same `{onNavigate && (...)}` conditional (L236) that is already reached only after the role check at L207 (`if (!isSuperAdmin) return Access Denied`). The `admin-template-queue` route id is already enrolled in the `adminToolPages` allow-list in `src/App.jsx:701` (Phase 177 TADM-04). Click-through is identical to the other 10 tiles. **PASS.**

2. **EF header accuracy (generate-svg-template/index.ts):** The new header documents 6 production actions and claims the legacy `spike` action "was retired during Phase 177 Plan 02 — the handler set above replaces it." However, the `if (body.action === "spike")` branch is still live at L104-L161 of the same file. The doc refresh therefore reintroduces drift in the exact area it was meant to fix. **FAIL — see CR-01.**

3. **Playwright spec soundness (admin-template-queue-nav.spec.js):** No banned literals (`test:setCurrentPage` / `dispatchEvent` / `window.dispatchEvent`) appear in the file — FLOW-1 contract-as-code holds. Locators resolve against real elements verified in `App.jsx:589`, `AdminTemplateQueuePage.jsx:353,522`, and `SuperAdminDashboardPage.jsx:229,251`. Skip-guard exists but is weaker than the reference spec it claims to mirror — see WR-01, WR-02.

## Critical Issues

### CR-01: EF header asserts `spike` action is retired, but the live dispatcher still handles it

**File:** `supabase/functions/generate-svg-template/index.ts:27-29` (header claim) vs `:104-161` (live handler)
**Issue:** The Phase 180 header refresh closes a WARNING by enumerating "every action below" as "LIVE production code path" and states:

> The legacy action="spike" boot-probe (Plan 01's Wave 0 diagnostics) was retired during Phase 177 Plan 02 — the handler set above replaces it. cURL boot probes are now documented in 177-01-SUMMARY.md for historical reference.

But `if (body.action === "spike")` is still a live dispatcher branch at L104, runs full Anthropic/deno-dom/resvg/aws-sdk probes, and returns a 200 with credentials echo (`is_admin`, `is_super_admin`) at L156-160. The header refresh therefore replaces one form of doc drift with another in the very file it set out to fix, and the dispatcher now has **7** action paths, not 6.

This is a BLOCKER for the phase's stated goal (the WARNING reclassification was specifically that the header must "accurately reflects the live 6-action handler set"). It is not a behavior bug — the spike path still works as before — but the deliverable does not satisfy its own acceptance criteria.

**Fix:** Either remove the `spike` branch from the dispatcher (preferred, since the header already claims it was retired and the diagnostics live in `177-01-SUMMARY.md`), **or** rewrite the header to describe 7 actions and drop the "was retired" sentence. Option A — code-side:

```ts
// Delete L104-L161 (the entire `if (body.action === "spike") { ... }` block).
// The header at L27-L29 then becomes accurate and the dispatcher matches its docs.
```

Option B — doc-side (less preferred — keeps live but undocumented diagnostic surface):

```ts
//   - action="spike"        → Wave 0 boot probes (Anthropic / deno-dom / resvg / AWS SDK).
//                             Retained for live diagnostics; returns is_admin / is_super_admin
//                             echo. Admin-gated like every other action.
// (and remove the "was retired during Phase 177 Plan 02" paragraph at L27-29)
```

---

### CR-01 Closure (Plan 180-08, 2026-05-12)

**Status:** RESOLVED — Option A applied (preferred per this review).

**What changed:** The `if (body.action === "spike") { ... }` dispatcher branch at index.ts:104-161 (58 lines) was deleted by Plan 180-08. The header paragraph at L27-L29 (which asserted "spike was retired during Phase 177 Plan 02") is now factually accurate — the dispatcher has 6 actions matching the documented set.

**Verification:**
- `grep -c 'action === "spike"' supabase/functions/generate-svg-template/index.ts` returns 0 (was 1)
- `grep -c '\[spike\]' supabase/functions/generate-svg-template/index.ts` returns 0 (was 3 — the console.error log tags inside the deleted block)
- `grep -c 'anthropic_ok\|deno_dom_ok\|resvg_wasm_ok\|aws_sdk_ok' supabase/functions/generate-svg-template/index.ts` returns 0 (local vars of the deleted block)
- `grep -c '@aws-sdk/client-s3' supabase/functions/generate-svg-template/index.ts` returns 0 (dynamic import inside the deleted block)
- The 6 production action branches (generate / approve / reject / save_edit / approve_bulk / reject_bulk) all survive: each `grep -c 'action === "<name>"'` returns 1
- The 3 production imports (`import Anthropic from`, `import { DOMParser }`, `import { Resvg, initWasm }`) are unchanged and still present at lines 42-44

**Diagnostic-loss risk:** None observed. The 4 boot probes (anthropic_ok / deno_dom_ok / resvg_wasm_ok / aws_sdk_ok) were already proven live at Phase 177 close per 177-01-SUMMARY.md; production paths exercise the same dependencies. The deleted block is recoverable from git history if a future debugging need arises.

**Cross-references:** Plan 180-08-PLAN.md, Plan 180-08-SUMMARY.md, 180-VERIFICATION.md (frontmatter `cr_01_impact:` + 8 body edits flipping WARNING references to RESOLVED).

## Warnings

### WR-01: Skip-guard checks only `TEST_SUPERADMIN_EMAIL`, missing `TEST_SUPERADMIN_PASSWORD`

**File:** `tests/e2e/admin-template-queue-nav.spec.js:26-29`
**Issue:** The skip predicate is `() => !process.env.TEST_SUPERADMIN_EMAIL`. The reference spec (`admin-starter-packs.spec.js:20`) checks both env vars:

```js
const SKIP = !process.env.TEST_SUPERADMIN_EMAIL || !process.env.TEST_SUPERADMIN_PASSWORD;
```

If a CI environment provisions only the email (common partial-secret leak from rotated secrets), this spec will not skip — it will run, call `loginAndPrepare`, and that helper throws at `helpers.js:30`:

> `Error: Test credentials not configured. Set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables.`

The test then fails in `beforeEach` with a misleading error message that mentions the wrong env var names. This converts a clean skip into a noisy red-test, which is exactly the failure mode skip-guards exist to prevent.

**Fix:**
```js
test.skip(
  () => !process.env.TEST_SUPERADMIN_EMAIL || !process.env.TEST_SUPERADMIN_PASSWORD,
  'super_admin test credentials (TEST_SUPERADMIN_EMAIL / TEST_SUPERADMIN_PASSWORD) not configured'
);
```

### WR-02: Skip-guard pattern diverges from the reference spec it claims to mirror

**File:** `tests/e2e/admin-template-queue-nav.spec.js:14-15, 26-29`
**Issue:** The header comment says:

> Skip-guard pattern: mirrors admin-starter-packs.spec.js — entire suite skips when TEST_SUPERADMIN_EMAIL is unset, so this spec is safe to commit and runs only when super_admin creds are provisioned.

But the reference spec uses a module-level `const SKIP = ...` constant and calls `test.skip(SKIP, ...)` inside each `test(...)` (admin-starter-packs.spec.js:20, 54). The new spec puts a function-form `test.skip(() => ..., ...)` at the `describe`-level — Playwright evaluates this per-test but the predicate is closed over each time, so a single env-var read happens at module load anyway. The behaviour is equivalent today, but the claim "mirrors admin-starter-packs.spec.js" is inaccurate, which matters because the executor's acceptance gates likely audit the comment against the actual code pattern.

**Fix:** Either update the comment to describe the chosen pattern accurately ("describe-level test.skip predicate"), or convert to the reference pattern:
```js
const SKIP = !process.env.TEST_SUPERADMIN_EMAIL || !process.env.TEST_SUPERADMIN_PASSWORD;

test.describe('...', () => {
  test('...', async ({ page }) => {
    test.skip(SKIP, 'super_admin test credentials not configured');
    // ... rest of test
  });
});
```

### WR-03: Tile locator is over-anchored — brittle to future a11y improvements

**File:** `tests/e2e/admin-template-queue-nav.spec.js:46`
**Issue:** `page.getByRole('button', { name: /^AI Template Queue$/i })` uses a fully-anchored regex (`^...$`). The button's accessible name is computed from the inner `<span>AI Template Queue</span>` plus the `Sparkles` and `ChevronRight` lucide-react icons (no `aria-label` today, so the name reduces to "AI Template Queue"). If a future commit adds an aria-label to either icon for screen-reader users — a normal a11y improvement — the accessible name becomes `"<icon-label> AI Template Queue <chevron-label>"` and this locator silently stops matching. The same risk exists for any of the other 10 tiles' E2E coverage, but those have no E2E coverage today; this new spec is the first to depend on the exact name.

**Fix:** Drop the end-anchor or use `exact: true` with a string match, e.g.:
```js
const tile = page.getByRole('button', { name: 'AI Template Queue', exact: true });
```
Playwright's `exact: true` matches the trimmed accessible name and is more resilient to surrounding-icon a11y improvements than `^...$` regex anchoring.

## Info

### IN-01: Spec does not assert URL or `currentPage` state change after click

**File:** `tests/e2e/admin-template-queue-nav.spec.js:48-56`
**Issue:** The post-click assertions check that the `Template Queue` heading and `pending-list` testid become visible, which is a strong signal that the click navigated correctly. However, because the heading text and testid both also exist on the source page if the user is already there (they don't — but a regression to "click is a no-op but heading is somehow re-rendered" would slip past), a stricter contract would also assert that the Super Admin Dashboard heading is gone, or assert against `page.url()`. This is defense-in-depth only; the current assertions are adequate for v21.0.

**Fix (optional, defense-in-depth):**
```js
await expect(page.getByRole('heading', { name: /^Super Admin Dashboard$/i })).not.toBeVisible();
await expect(page.getByRole('heading', { name: /^Template Queue$/i })).toBeVisible({ timeout: 5000 });
```

### IN-02: Header comment hard-codes line numbers that can drift

**File:** `tests/e2e/admin-template-queue-nav.spec.js:40,44,52-54`
**Issue:** The test comments cite specific line numbers in other source files (e.g., `App.jsx:712-715`, `SuperAdminDashboardPage.jsx:235`, `AdminTemplateQueuePage.jsx:353`, `:522`). These are accurate today but will become stale as soon as any of those files gets an unrelated edit. They are documentation only — they don't affect test behavior — but they degrade over time. Verified against current code: `App.jsx:712-720` (block starts at L712 with `if (authUserProfile?.role === 'super_admin')`), `SuperAdminDashboardPage.jsx:236` (off by 1 — the `{onNavigate && (` is L236, not L235), `AdminTemplateQueuePage.jsx:353` (correct), `:522` (correct). The L235 cite is already off-by-one on commit day.

**Fix:** Either prune the line-number cites (keep file references), or accept that they will drift — but do not treat them as a verification surface. No code change required.

---

_Reviewed: 2026-05-12T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
