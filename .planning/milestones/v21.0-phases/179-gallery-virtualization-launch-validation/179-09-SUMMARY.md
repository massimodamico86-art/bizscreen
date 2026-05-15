---
phase: 179-gallery-virtualization-launch-validation
plan: "09"
subsystem: testing
tags: [gap-closure, testing, virtualization, e2e, unit]
dependency_graph:
  requires: []
  provides:
    - SC-2 perf spec wired to correct measurement window (TVRZ-02)
    - SC-3 unit gate now load-bearing (TVRZ-03 unit half)
    - TemplateGalleryPage unit suite restored to 9/9 GREEN (TVRZ-04 v20.0 clause)
  affects:
    - tests/e2e/template-gallery-perf.spec.js
    - tests/unit/components/VirtualizedTemplateGrid.test.jsx
    - tests/unit/pages/TemplateGalleryPage.test.jsx
tech_stack:
  added: []
  patterns:
    - page.evaluate() for in-document performance marks (Playwright)
    - spy.mockClear() between mount and rerender to isolate rerender-only assertions (vitest)
    - vi.mock() flat-list stub to bypass JSDOM virtualizer height measurement
key_files:
  created: []
  modified:
    - tests/e2e/template-gallery-perf.spec.js
    - tests/unit/components/VirtualizedTemplateGrid.test.jsx
    - tests/unit/pages/TemplateGalleryPage.test.jsx
decisions:
  - "Decision B compliance: Gap 3 fixed via vi.mock in page test file (path A); tests/setup.js JSDOM-height shim (path B) and test rewrites (path C) were both explicitly rejected"
  - "All 3 gap fixes are test-only; src/ is untouched throughout"
metrics:
  duration_min: 2
  completed: "2026-05-11"
  tasks: 3
  files_modified: 3
---

# Phase 179 Plan 09: Gap Closure — SC-2 Perf Mark Site, SC-3 Unit Spy, v20.0 Unit Regression Summary

One-liner: Test-only gap closure — three surgical fixes repair SC-2's wrong measurement window, SC-3's non-load-bearing spy, and the JSDOM virtualizer blocking 3/9 page unit tests.

## What Was Built

This plan closed the 3 BLOCKER gaps identified in `179-VERIFICATION.md`. All fixes are test-only; production source under `src/` was not modified.

### Gap 1 Closed — SC-2 / TVRZ-02 (Task 1, commit `7ccce86b`)

**Before:** `page.addInitScript(() => { performance.mark('gallery-paint-start'); })` ran in the pre-navigation document context. The `gotoTemplates()` helper triggers in-app navigation (button click) — same SPA document. `addInitScript` fires on document load (the login page), not the post-login app page, so the measurement window was wrong.

**Fix:** Replaced the 4-line `addInitScript` block with a single `await page.evaluate(() => performance.mark('gallery-paint-start'))` immediately before `gotoTemplates(page)`. `page.evaluate` runs in the current document (post-login), matching the performance timeline used by the `performance.measure(...)` block further down in the test body.

**Diff (verbatim):**
```diff
-    // Set start mark BEFORE goto
-    await page.addInitScript(() => {
-      performance.mark('gallery-paint-start');
-    });
-
+    // Set start mark inside the post-login document, immediately before in-app navigation (CR-01 fix)
+    await page.evaluate(() => performance.mark('gallery-paint-start'));
+
     await gotoTemplates(page);
```

### Gap 2 Closed — SC-3 / TVRZ-03 unit half (Task 2, commit `d0606e0e`)

**Before:** The SC-3 `it(...)` block called `render(...)` (mount), then immediately `rerender(...)`. The mount triggers `useEffect([templates, virtualizer]) → scrollToOffset(0)`. Without a `mockClear()` between them, the `toHaveBeenCalledWith(0)` assertion was satisfied by the mount call alone — so dropping `templates` from the `useEffect` dep array would NOT cause the test to fail (regression blind spot).

**Fix:** Inserted `scrollToOffsetSpy.mockClear()` on a new line between the closing `);` of `render(...)` and the `rerender(...)` call. After the clear, only the rerender effect can satisfy `toHaveBeenCalledWith(0)`.

**Diff (verbatim):**
```diff
     const { rerender } = render(
       <VirtualizedTemplateGrid templates={t1} cols={4} scrollElement={document.body} />
     );
+    // Clear mount-call so the assertion below measures ONLY the rerender effect (CR-02 fix)
+    scrollToOffsetSpy.mockClear();
     // Initial render triggers the effect once with t1.
```

### Gap 3 Closed — SC-5 / TVRZ-04 v20.0 regression (Task 3, commit `f49e66fb`)

**Before:** JSDOM's scroll container has zero height. The real `VirtualizedTemplateGrid` asks the virtualizer to measure container height → 0 → renders 0 items. Three tests (TGAL-03 sort order, TGAL-04 badges, TDSC-02 filters) timed out in `waitFor(...)` because the headings/badges/text never appeared in DOM.

**Fix:** Added a `vi.mock('../../../src/components/template-gallery/VirtualizedTemplateGrid', ...)` factory immediately after the existing mock cluster and before `renderPage`. The mock renders a flat `<div role="grid">` with one `<div role="row">` per template, each containing `<h3>{t.name}</h3>` and conditional `<span>New</span>` / `<span>Popular</span>` badges that mirror the real component's prop-driven logic (`isNew` + `popularityThreshold`). This bypasses virtualizer height measurement entirely while preserving the DOM contract the 3 failing tests assert on.

**Decision B compliance:** `tests/setup.js` was NOT modified (path B rejected). The 3 failing tests' names and assertions were NOT changed (path C rejected). The mock is scoped to this one test file via vitest's per-file module registry.

## Verification Outputs

### Task 1 — Gap 1 (SC-2 perf spec)

```
addInitScript count: 0
page.evaluate mark count: 1
gallery-paint-start occurrences: 2
performance.measure count: 1
toBeLessThan count: 1

Listing tests:
Total: 1 test in 1 file
```

All 6 acceptance criteria pass.

### Task 2 — Gap 2 (SC-3 unit spy)

```
mockClear count: 1
vi.mock('@tanstack/react-virtual' (actual call): 1
SC-3 test name preserved: 1

Test Files  2 passed (2)
      Tests  13 passed (13)
   Duration  716ms
```

13/13 pass; no regression on the other 5 component tests or 7 hook tests.

### Task 3 — Gap 3 (page unit suite)

```
vi.mock VirtualizedTemplateGrid count: 1

Test Files  1 passed (1)
      Tests  9 passed (9)
   Duration  843ms
```

9/9 pass — TGAL-03, TGAL-04, TDSC-02 restored to GREEN.

### Plan-Level Rollup

```
git diff src/    → (empty — no production code changes)
git diff tests/setup.js  → (empty — Decision B: path B rejected)
npm run build   → ✓ built in 7.37s (exit 0)
```

## Deviations from Plan

None — plan executed exactly as written. All 3 tasks applied the exact surgical changes described. No auto-fixes were required.

## Known Stubs

None — no stub patterns introduced. All test fixes are fully wired.

## Human Verification Items (Remain Outstanding)

The following 5 items from `179-VERIFICATION.md` are CI-only empirical tests that require database provisioning + CI credentials. They are explicitly out of scope for this gap-closure plan (Decision A: BLOCKERs only):

1. SC-2 empirical budget pass — `expect(elapsed).toBeLessThan(1000)` against a populated DB (~500 templates) under CI conditions
2. SC-3 browser-level scroll-reset — cross-browser E2E confirming `scrollToOffset(0)` fires on filter change in a live browser
3. SC-4 skeleton flash — visual timing assertion (requires CI with populated DB)
4. SC-5 axe accessibility scan — requires CI-provisioned authenticated session
5. Full E2E ≥90% delta — regression gate against complete test suite

Additionally deferred (per Decision A): WR-01 (mobile column flash) and WR-06 (mount scroll-to-0) are not included in this plan.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes were introduced. All 3 modified files are under `tests/` and are not bundled into the production build (`npm run build` exit 0 confirms no test-only artifact is referenced from production code). No threat flags.

## Self-Check: PASSED

Files modified:
- FOUND: tests/e2e/template-gallery-perf.spec.js
- FOUND: tests/unit/components/VirtualizedTemplateGrid.test.jsx
- FOUND: tests/unit/pages/TemplateGalleryPage.test.jsx

Commits:
- FOUND: 7ccce86b (Task 1)
- FOUND: d0606e0e (Task 2)
- FOUND: f49e66fb (Task 3)

Verification commands all passed:
- `addInitScript count: 0` ✓
- `page.evaluate mark count: 1` ✓
- `gallery-paint-start occurrences: 2` ✓
- `npx playwright test --list`: Total: 1 test in 1 file ✓
- `scrollToOffsetSpy.mockClear count: 1` ✓
- vitest 13/13 ✓
- `vi.mock VirtualizedTemplateGrid count: 1` ✓
- vitest 9/9 ✓
- `git diff src/`: empty ✓
- `git diff tests/setup.js`: empty ✓
- `npm run build`: exit 0 ✓
