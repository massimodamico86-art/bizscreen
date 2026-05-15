---
phase: 179-gallery-virtualization-launch-validation
reviewed: 2026-05-11T00:32:43Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - package.json
  - src/components/template-gallery/VirtualizedTemplateGrid.jsx
  - src/hooks/useContainerColumns.js
  - src/pages/TemplateGalleryPage.jsx
  - tests/e2e/template-gallery-axe.spec.js
  - tests/e2e/template-gallery-perf.spec.js
  - tests/e2e/template-gallery.spec.js
  - tests/setup.js
  - tests/unit/components/VirtualizedTemplateGrid.test.jsx
  - tests/unit/hooks/useContainerColumns.test.js
findings:
  critical: 2
  warning: 7
  info: 3
  total: 12
status: issues_found
---

# Phase 179: Code Review Report

**Reviewed:** 2026-05-11T00:32:43Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 179 introduces a `@tanstack/react-virtual` row-chunked masonry virtualizer
for the template gallery and adds five SC gates (virtualized DOM contract,
first-paint perf, scroll-reset, skeleton-flash, axe a11y). The threat-model
invariants requested in the phase context all hold: no `dangerouslySetInnerHTML`
introduced, `role="grid"`/`aria-rowcount` shape is correct, the ResizeObserver is
disconnected on unmount, and the `useSearchParams`/`fuse.js` URL-sync pipeline in
`TemplateGalleryPage.jsx` is preserved verbatim.

However, the adversarial review surfaced two BLOCKER defects in the validation
surface itself — both undermine the SC gates that the phase exists to enforce:

1. **SC-2 perf gate measures the wrong window.** `performance.mark('gallery-paint-start')`
   is set in `addInitScript` (which fires on every document load), but the test
   then performs in-app navigation via button click. The mark was set during
   `loginAndPrepare`'s document load, so `elapsed` measures "time since the
   post-login document started" — including login latency, dashboard idle time,
   and any wait inside `gotoTemplates`. This is not the gallery first-paint
   window SC-2 claims to gate.

2. **SC-3 unit test does not actually validate scroll-reset on filter change.**
   `scrollToOffsetSpy` is not cleared between the initial render and the
   rerender, so the assertion `toHaveBeenCalledWith(0)` would pass even if the
   rerender effect never fired. The test only proves the initial-mount effect
   ran; a regression where the templates-dep is dropped from `useEffect` would
   not be caught.

Beyond the validation surface, the most notable WARNING is a real UX defect on
non-desktop viewports: `useContainerColumns` hard-codes a default of `cols=4`,
and its "synchronous pre-fill" runs inside `useEffect` — i.e., after first
paint. On a 375px mobile viewport, the first paint renders four columns, then
snaps to one after the effect commits. The inline comment claiming this
prevents a one-render flash is factually incorrect.

The remaining findings are smaller — test-mock fragility, misleading parameter
in a helper, redundant filter passes, and inconsistent catalog floors between
two SC gates that both claim "full-catalog" coverage.

---

## Critical Issues

### CR-01: SC-2 perf gate measures the wrong elapsed window — `gallery-paint-start` mark is set at document load, not at user navigation

**File:** `tests/e2e/template-gallery-perf.spec.js:48-67`
**Issue:** The test sets `performance.mark('gallery-paint-start')` via
`page.addInitScript(...)`, which fires when the page document loads. By the
time the test reaches that line, `loginAndPrepare` has already navigated the
browser to the post-login document. `addInitScript` only takes effect on the
NEXT document load — but `gotoTemplates(page)` performs in-app navigation by
clicking a sidebar button (no new document load occurs). The mark is therefore
never set in the document under measurement, OR it was set during a prior
document and now measures something else entirely. The `performance.measure(...)`
call at line 65 will either return `undefined` (mark missing → `?? Infinity` →
test fails) or measure a window that includes login latency and dashboard idle
time. Neither matches SC-2's intent of "gallery first-paint <1s".

The pre-flight `expect(rowcount * 4).toBeGreaterThanOrEqual(400)` is a real
contract check, but the actual `expect(elapsed).toBeLessThan(1000)` assertion
is non-load-bearing because the elapsed value is decoupled from the action
under test.

**Fix:**
```js
// Set the mark INSIDE the test, just before the user-facing action.
// page.evaluate runs in the page context against the live document.
await page.evaluate(() => performance.mark('gallery-paint-start'));

await gotoTemplates(page);
await page.locator('[role="grid"]').first().waitFor({ state: 'visible', timeout: 5000 });

const elapsed = await page.evaluate(() => {
  performance.mark('gallery-paint-end');
  performance.measure('gallery-paint', 'gallery-paint-start', 'gallery-paint-end');
  return performance.getEntriesByName('gallery-paint')[0]?.duration ?? Infinity;
});
```
Also drop the `addInitScript` call (lines 48-50) — it is misleading and serves
no purpose given the in-app navigation pattern.

---

### CR-02: SC-3 unit test does not actually validate scroll-reset on templates-reference change

**File:** `tests/unit/components/VirtualizedTemplateGrid.test.jsx:122-142`
**Issue:** The test asserts `expect(scrollToOffsetSpy).toHaveBeenCalled()` after
a rerender, but the spy is not cleared between the initial mount and the
rerender. The initial render of `<VirtualizedTemplateGrid templates={t1}>`
already fires the `useEffect(..., [templates, virtualizer])` once, calling
`scrollToOffsetSpy(0)`. The subsequent rerender with `t2` is intended to be
what triggers the second call — but if that second call never fires (e.g., a
regression that drops `templates` from the dep array), the assertion still
passes because the initial-mount call is still counted.

This is the unit-level gate for SC-3 ("scrollToOffset(0) on filter change"),
and it does not gate what it claims to gate.

The comment on line 138 ("Per RESEARCH §Pitfall 2: assertion is 'called' (not
exactly-once)") justifies allowing multiple calls but does not justify
counting the initial-mount call as evidence of the post-filter-change behavior.

**Fix:**
```js
const { rerender } = render(
  <VirtualizedTemplateGrid templates={t1} cols={4} scrollElement={document.body} />
);

// Clear after initial-mount effect — the SC-3 contract is "scroll resets on
// templates IDENTITY CHANGE", so we must isolate the rerender's effect.
scrollToOffsetSpy.mockClear();

rerender(
  <VirtualizedTemplateGrid templates={t2} cols={4} scrollElement={document.body} />
);

expect(scrollToOffsetSpy).toHaveBeenCalledWith(0);
```

---

## Warnings

### WR-01: `useContainerColumns` causes a visual layout flash on non-desktop viewports

**File:** `src/hooks/useContainerColumns.js:33-50`
**Issue:** The hook initializes `useState(4)` and only corrects the value
inside `useEffect`. Effects run AFTER paint, so on a 375px mobile viewport,
React commits a first paint with `cols=4` (overflowing or compressed grid),
then re-paints with `cols=1` after the effect runs. The inline comment at
line 39-41 claims the synchronous pre-fill "prevents a one-render flash with
the SSR default", but the pre-fill executes inside `useEffect` and therefore
runs AFTER the first paint, not before it. The comment is factually
incorrect.

Impact: real users on phones and narrow tablets see a brief frame of a
4-column grid before it snaps to the correct narrower layout. SC-5 axe gates
do not catch this (axe doesn't measure layout-thrash); the mobile e2e test
(`tests/e2e/template-gallery.spec.js:128-136`) does not assert no-flash.

**Fix:** Use `useLayoutEffect` so the correction runs before paint:
```js
import { useLayoutEffect, useState } from 'react';
// ...
useLayoutEffect(() => {
  const el = ref.current;
  if (!el) return;
  setCols(widthToCols(el.getBoundingClientRect().width));
  const ro = new ResizeObserver((entries) => {
    const w = entries[0]?.contentRect?.width ?? 0;
    setCols(widthToCols(w));
  });
  ro.observe(el);
  return () => ro.disconnect();
}, [ref]);
```
And update the inline comment to reflect that the pre-fill runs pre-paint via
the layout effect, eliminating the flash on viewports where the SSR default
is wrong.

---

### WR-02: SC-5 axe test and SC-2 perf test use inconsistent catalog floors — both claim "full-catalog" validation

**File:** `tests/e2e/template-gallery-axe.spec.js:42` and `tests/e2e/template-gallery-perf.spec.js:60`
**Issue:** Both tests gate on a minimum-catalog pre-flight to defend against
unseeded databases (RESEARCH §A2). They disagree:
- Perf test: `expect(rowcount * 4).toBeGreaterThanOrEqual(400)` (~400 templates).
- Axe test: `expect(Number(rowcountAttr)).toBeGreaterThan(50)` (~200 templates).

Both SC contracts say "full catalog (~500)". If the seeded test DB has, say,
250 templates, the axe test would pass with a representative-enough sample,
but the perf test would skip (rowcount * 4 = 252 < 400 → assertion fails BEFORE
the elapsed measure). The inconsistency means one gate is much stricter than
the other, with no documented rationale.

**Fix:** Pick one canonical floor (e.g., 400 templates ≈ 100 rows at cols=4)
and apply it consistently across both gates, or document the asymmetry
explicitly in both test files.

---

### WR-03: `useContainerColumns` does not re-observe when `ref.current` changes after mount

**File:** `src/hooks/useContainerColumns.js:35-50`
**Issue:** The effect depends on `[ref]`, which is a stable React ref object
that never changes. If the consumer remounts the observed element (e.g., key
change on the scroll container causing React to replace the DOM node), the
hook's captured `el` becomes stale, the old observer keeps trying to observe
a detached node, and the new node is never observed. `cols` is then stuck at
whatever value the stale observer last produced.

This isn't currently triggered by `TemplateGalleryPage` (the scroll container
is never remounted), but the hook is exported as a reusable utility and its
contract is fragile.

**Fix:** Either document the constraint ("ref must be attached to a stable
DOM node for the hook's lifetime"), or use a callback ref pattern that
re-observes on element changes:
```js
const [el, setEl] = useState(null);
const setRef = useCallback((node) => { setEl(node); }, []);
useLayoutEffect(() => {
  if (!el) return;
  setCols(widthToCols(el.getBoundingClientRect().width));
  const ro = new ResizeObserver(...);
  ro.observe(el);
  return () => ro.disconnect();
}, [el]);
return { cols, ref: setRef };
```
(This is a bigger refactor; documenting the constraint is the minimum.)

---

### WR-04: `installROMock(initialWidth)` accepts an unused parameter that misrepresents the helper's API

**File:** `tests/unit/hooks/useContainerColumns.test.js:15-31`
**Issue:** The helper takes `initialWidth` as a parameter, immediately does
`void initialWidth`, and never references it. Every call site passes a width
that has no effect on the mock — the actual width comes from
`makeRefWithWidth`. Future readers (or a future test author) will reasonably
believe `installROMock(900)` sets up a 900px observation, then debug for
hours when their tests fail because the width came from somewhere else.

**Fix:** Remove the unused parameter:
```js
function installROMock() {
  disconnectSpy = vi.fn();
  globalThis.ResizeObserver = class { /* ... */ };
}
```
Update all call sites to drop the argument.

---

### WR-05: `displayedTemplates` re-applies the `editor_type === 'svg'` filter after fuse search even though the pool was already filtered

**File:** `src/pages/TemplateGalleryPage.jsx:398-413`
**Issue:** When `isEditorReturn` is true, line 402 narrows `pool` to svg-only.
Fuse is then constructed over `allTemplates` (line 347) — NOT over `pool` —
so `fuse.search(...)` may return polotno rows even with the svg-only pool
filter. The defensive re-filter at line 412 is correct and necessary.

However, the comment at line 408-410 says "When fuse runs against the full
corpus its results may include polotno rows" — which is true and explains the
necessity, but the broader filter structure makes the redundancy easy to miss
in future edits. The real fix is to either rebuild the `Fuse` instance scoped
to the editor-return pool, or factor the svg-only constraint into a single
post-search filter (the line 412 one) and remove the pre-search pool filter
at line 402.

This is not a correctness bug today, but the dual-filter shape invites a
regression where the post-search filter is removed under the (false) belief
that the pool filter is sufficient.

**Fix:** Drop the pool filter at line 402 and rely on the post-search filter
at line 412 as the single source of truth, OR build the `Fuse` instance over
`pool` so the post-search filter becomes truly redundant:
```js
const pool = useMemo(
  () => (isEditorReturn ? allTemplates.filter((t) => t.editor_type === 'svg') : allTemplates),
  [allTemplates, isEditorReturn],
);
const fuse = useMemo(() => new Fuse(pool, { /* ... */ }), [pool]);
// Then in displayedTemplates, drop both the pool filter AND the redundant post-fuse filter.
```

---

### WR-06: `VirtualizedTemplateGrid` fires `scrollToOffset(0)` on initial mount unconditionally — semantics differ from "reset on filter change"

**File:** `src/components/template-gallery/VirtualizedTemplateGrid.jsx:75-77`
**Issue:** The effect dep array is `[templates, virtualizer]`, which means it
fires on first mount as well as on every templates-reference change. The
SC-3 contract is "scroll resets on filter change" — but the initial mount is
not a filter change. In practice this is harmless because scrollTop starts
at 0, but two scenarios are affected:
1. If `VirtualizedTemplateGrid` remounts (e.g., key change), it forces
   scrollTop=0 instead of preserving the user's previous scroll offset.
2. If a parent ever passes a `scrollElement` that is mid-scroll on first
   mount (e.g., browser back-forward cache rehydration), the hook would
   reset scroll position the user expects to be preserved.

This is more "design ambiguity" than a bug, but the dep-array approach
conflates "mount" with "filter change". A `useRef` sentinel to skip the
first effect would express the SC-3 intent more precisely.

**Fix:**
```js
const isFirstMount = useRef(true);
useEffect(() => {
  if (isFirstMount.current) {
    isFirstMount.current = false;
    return;
  }
  virtualizer.scrollToOffset(0);
}, [templates, virtualizer]);
```

---

### WR-07: `data-tour="first-card"` may anchor a card that has been unmounted by virtualization

**File:** `src/components/template-gallery/VirtualizedTemplateGrid.jsx:132`
**Issue:** The `data-tour="first-card"` attribute is conditionally applied
when `absoluteIndex === 0`. Under virtualization, the first row (containing
the first card) is only rendered when scrollTop is within `overscan * rowHeight`
of the top. If the user scrolls down before triggering the gallery tour
(`useGalleryTour({ isFetching })` at `TemplateGalleryPage.jsx:185`), driver.js
will fail to find the anchor element.

The tour fires once per first visit, so in practice the user is at the top
when it fires. But the contract is implicit and brittle — a future
"replay tour" affordance, or a deep-link that auto-scrolls before tour
hydration, would silently break.

**Fix:** Anchor the tour to a stable selector (e.g., the grid itself, or the
filter bar) that does not depend on virtualization windowing. If "first card"
specifically must remain the anchor, scroll the container to top inside the
tour's `onHighlight` callback before driver.js measures the element.

---

## Info

### IN-01: Inline comment in `useContainerColumns.js` is factually incorrect

**File:** `src/hooks/useContainerColumns.js:39-41`
**Issue:** Comment claims the synchronous pre-fill "prevents a one-render
flash with the SSR default", but the pre-fill runs inside `useEffect` (post-
paint). The flash IS produced on viewports where the SSR default (4) is
wrong. See WR-01 for the fix; this is the documentation half of that
finding.
**Fix:** Either move to `useLayoutEffect` per WR-01 (then the comment becomes
true), or update the comment to say "corrects the SSR default within one
post-paint render cycle" — but the honest fix is to actually prevent the
flash.

---

### IN-02: Unused parameter pattern (`void X`) is used to silence ESLint but obscures intent in two places

**File:** `tests/unit/hooks/useContainerColumns.test.js:17, 22`
**Issue:** `void initialWidth` and `void _el` are used to silence
no-unused-vars. The first one (line 17) hides a real API problem (WR-04);
the second one (line 22) is benign since it documents that `observe()`
intentionally does not act on its argument. Consider naming the suppressor
consistently or replacing the dead parameter with a TODO comment explaining
why the API surface intentionally accepts a value it ignores.
**Fix:** For `initialWidth`, remove the parameter entirely (see WR-04). For
`_el`, leave it — the underscore prefix is the canonical "intentionally
unused" marker and `void` is redundant.

---

### IN-03: `widthToCols(width)` would throw if passed a negative width

**File:** `src/hooks/useContainerColumns.js:27-29`
**Issue:** `COL_BREAKPOINTS.find((b) => width >= b.minWidth).cols` returns
`undefined` if `.find()` doesn't match, and dereferencing `.cols` on
undefined throws. In practice `width` from `getBoundingClientRect()` or
`ResizeObserverEntry.contentRect.width` is non-negative, so this is purely
theoretical. But a guard is cheap.
**Fix:**
```js
function widthToCols(width) {
  const match = COL_BREAKPOINTS.find((b) => width >= b.minWidth);
  return match ? match.cols : 1;
}
```

---

_Reviewed: 2026-05-11T00:32:43Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
