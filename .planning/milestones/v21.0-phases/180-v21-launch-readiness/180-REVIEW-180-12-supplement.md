---
phase: 180-v21-launch-readiness
plan_supplement: 180-12
reviewed: 2026-05-13T00:00:00Z
depth: standard
diff_base: 5402a178^
files_reviewed: 5
files_reviewed_list:
  - src/pages/TemplateGalleryPage.jsx
  - tests/e2e/favorites.spec.js
  - tests/e2e/gallery-tour.spec.js
  - tests/e2e/helpers.js
  - tests/e2e/template-gallery.spec.js
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase 180 — Plan 180-12 Supplemental Code Review

**Reviewed:** 2026-05-13
**Depth:** standard (focused on Plan 180-12 diff against 5402a178^)
**Scope:** SC-5_v21.1 sr-only heading chain + SC-11_v21.1 driver.js overlay cleanup + test-infra stabilization.

This supplement covers ONLY changes introduced by Plan 180-12. The canonical
`180-REVIEW.md` (2026-05-12, status: partial) covers Plan 180-08-era files and
is not re-reviewed here.

## Summary

The diff is small, additive, and well-commented. SC-5_v21.1's sr-only heading
chain is purely structural and does not perturb the existing JSX, scroll
container, or virtualizer wiring. SC-11_v21.1's `.driver-overlay` force-removal
in `dismissAnyModals`, plus the new `forceRemoveGalleryTour` helper, are scoped
defensively and preserve the original popover dismissal loop. Test-infra
changes (skip markers, serial mode) are explicitly documented as v21.1
deferrals with stated root causes.

Two warnings concern semantic correctness and a residual race condition. The
four info items flag minor doc accuracy, missing observability for skipped
tests, and an inert guard.

## Warnings

### WR-01: Mis-ordered sr-only `<h3>` reading sequence when StarterPacksStrip renders — BLOCKER for screen-reader UX, WARNING for axe compliance

**File:** `src/pages/TemplateGalleryPage.jsx:665-666`
**Issue:**
The new sr-only headings render in this DOM order:

1. `<h1>Templates` (PageHeader, outside scroll container)
2. `<h2 className="sr-only">Template gallery` (new, sr-only)
3. `<h3 className="sr-only">All templates` (new, sr-only)
4. `<h2>Starter Packs` (StarterPacksStrip, line 74 of `StarterPacksStrip.jsx`, when packs exist)
5. `<h3>{pack.name}` (PackCard, line 80 of `PackCard.jsx`)
6. `<h4>{title}` (TemplateCard via VirtualizedTemplateGrid)

The sr-only `<h3>All templates`” promises a region listing "all templates,"
but in reading order the very next content a screen-reader user encounters is
`<h2>Starter Packs` and its `<h3>` pack cards — NOT the template grid that the
label describes. The actual "All templates" content (h4 TemplateCard nodes)
only appears AFTER the entire Starter Packs strip. A screen-reader user
navigating by heading lands on a label whose content does not follow it.

axe-core's `heading-order` rule only flags level INCREASES that skip (e.g.
h1→h3); h3→h2 is not a violation, so the fix likely satisfies axe. But the
fix achieves axe compliance at the cost of accurate region semantics.

The JSX comment also claims the chain is "continuous h1→h2→h3→h4" — when
StarterPacksStrip renders with packs this is inaccurate (h1→h2sr→h3sr→h2→h3→h4
with the second h2/h3 sandwich).

**Fix:**
Move the sr-only `<h3>All templates` to immediately precede the
`<VirtualizedTemplateGrid>` (and the empty-state branches that replace it), so
it actually labels the section it describes:

```jsx
<div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
  {/* Page-region label always present */}
  <h2 className="sr-only">Template gallery</h2>

  {!isFetching && !fetchError && !filters.q && !isEditorReturn && (
    <StarterPacksStrip ... />
  )}

  {/* Section label for the grid — sibling of the actual grid, after the strip */}
  <h3 className="sr-only">All templates</h3>

  {isFetching ? (...) : (...) /* grid/empty branches */}
</div>
```

This preserves the h1→h2→h3→h4 chain in BOTH packs-present and packs-absent
states (h2 sr-only → h2 visible Starter Packs is fine; the h3 sr-only sits
above either h3 pack cards' siblings or the h4 grid). axe-core still gets the
continuous chain, and screen-reader users get an accurate region label.

If the chosen placement is intentional (e.g. to keep both labels at the top
for layout reasons), update the JSX comment to reflect the actual DOM shape
and document the trade-off, because as written the comment is incorrect for
the packs-rendered code path.

---

### WR-02: `forceRemoveGalleryTour` race — gallery tour may launch AFTER cleanup runs

**File:** `tests/e2e/helpers.js:167-176` (helper) and `tests/e2e/template-gallery.spec.js:43`, `tests/e2e/favorites.spec.js:29` (callers)
**Issue:**
`useGalleryTour` (`src/hooks/useGalleryTour.js`) launches the tour via an
async chain that is NOT awaited by `waitForPageReady`:

1. `useEffect` re-runs when `isFetching` flips false (after template fetch).
2. Awaits async `getOnboardingProgress()` (RPC to Supabase).
3. Schedules `setTimeout(..., 100)` before `driverRef.current.drive()`.

So the popover/overlay can mount AFTER `gotoTemplates` returns. If
`getOnboardingProgress()` resolves after the 500 ms `waitForTimeout` +
`networkidle`, then `forceRemoveGalleryTour` finds zero `.driver-popover`/
`.driver-overlay` nodes — but the tour appears moments later and intercepts
the next test interaction (favorites heart click, "Browse all templates"
button, etc.). This is the same flakiness mode Plan 180-12 is closing,
re-introduced in a different timing window.

In current test runs this likely passes because the RPC is fast and the
500 ms+networkidle covers it — but it's a latent race that will resurface
under CI load or slow networks, and Plan 180-11 SC-11 re-run already
demonstrated this class of failure.

**Fix:**
Either:
(a) Wait for the tour to mount (or be confirmed-skipped) before removing:

```js
export async function forceRemoveGalleryTour(page) {
  // Give the tour up to ~1.5s to mount; ignore if it never does.
  await page
    .locator('.driver-overlay, .driver-popover')
    .first()
    .waitFor({ state: 'attached', timeout: 1500 })
    .catch(() => {});

  const driverEls = page.locator('.driver-overlay, .driver-popover');
  const count = await driverEls.count();
  if (count > 0) {
    await driverEls.evaluateAll((els) => els.forEach((e) => e.remove()));
    await page.waitForTimeout(100);
  }
}
```

OR (b) install a MutationObserver in `page.addInitScript` that auto-removes
`.driver-overlay`/`.driver-popover` nodes whenever they appear, for the
lifetime of the page (set per spec that wants the tour suppressed). The
observer approach also closes the race for any tour that fires post-navigation
(e.g. after a `waitForResponse` await).

If the team has accepted this residual race as part of the v21.1 deferral
(consistent with how `gallery-tour.spec.js` is now skipped), add a comment to
`forceRemoveGalleryTour`'s JSDoc explicitly noting the timing assumption and
the conditions under which it can still flake.

## Info

### IN-01: JSX comment claim about axe-core `.include()` scope is not authoritatively verified

**File:** `src/pages/TemplateGalleryPage.jsx:653-664`
**Issue:**
The comment states: "the `.include('[role="grid"]')` scope in the axe spec
restricts violation TARGETS, not the heading-order analysis itself." This is
the load-bearing assumption that justifies placing the sr-only headings
OUTSIDE `[role="grid"]`. Reviewing this without axe-core internals access:
the claim is plausible (otherwise the violation would never have been seen
inside `[role="grid"]` in the first place — the existing scoped scan inside
`tests/e2e/template-gallery-axe.spec.js` would already have been green
before this fix), but it's not citation-backed in the comment.

**Fix:**
Either link to axe-core's `heading-order` rule documentation or a reproduction
URL/log line proving the rule walks the full document under `.include()`, or
add a comment line referencing the specific Plan 180-12 verification log that
demonstrates the heading-order violation persisted inside the scoped scan
prior to this fix. Future readers should not have to re-derive this from axe
source.

---

### IN-02: Skipped tests in `gallery-tour.spec.js` lack a tracking issue reference

**File:** `tests/e2e/gallery-tour.spec.js:50, 86`
**Issue:**
Both gallery-tour tests are now `test.skip(true, ...)` with documented root
causes (per-user `completed_gallery_tour` DB-state non-determinism) and a
deferral target (v21.1 per-test isolation). The deferral text is good, but
neither call cites a tracking issue/ticket id — only "v21.1 per-test isolation
work" as a free-text reference. If the work is rescheduled or renamed (very
likely between v21.0 and v21.1), these markers become orphaned.

**Fix:**
Add a tracking handle that survives renames:
```js
test.skip(true, 'gallery-tour first-visit deferred — see deferred-items.md §Phase 180 / SC-11_v21.1; tracking: <ISSUE-ID>');
```
Either a deferred-items.md anchor, a Linear/GitHub issue id, or both. This
also surfaces the skip in `gh issue list` workflows.

---

### IN-03: `overlayCount > 0` guard in `dismissAnyModals` is functionally a no-op except for skipping the 100 ms wait

**File:** `tests/e2e/helpers.js:130-135`
**Issue:**
```js
const driverOverlays = page.locator('.driver-overlay');
const overlayCount = await driverOverlays.count();
if (overlayCount > 0) {
  await driverOverlays.evaluateAll((els) => els.forEach((e) => e.remove()));
  await page.waitForTimeout(100);
}
```
`evaluateAll` on an empty match is a no-op, so the `count()` round-trip exists
only to skip the `waitForTimeout(100)`. There's also a benign TOCTOU window
between `count()` and `evaluateAll`. Not a defect, but the pattern is unusual
enough to warrant a one-line comment explaining the guard's purpose ("avoid
unnecessary 100ms wait when no overlay is present").

**Fix:**
Add a single comment line, or unconditionally call `evaluateAll` and guard
only the `waitForTimeout`:
```js
await driverOverlays.evaluateAll((els) => els.forEach((e) => e.remove()));
if (overlayCount > 0) await page.waitForTimeout(100);
```

---

### IN-04: Phase 180 SC-11 comment block in `dismissAnyModals` overlaps with `forceRemoveGalleryTour` JSDoc — opportunity to consolidate

**File:** `tests/e2e/helpers.js:110-135` and `tests/e2e/helpers.js:153-176`
**Issue:**
Both blocks describe driver.js overlay removal mechanics, the failure mode it
addresses (Plan 180-11 Branch E), and the safety claim (driver.js state
already considered "completed"). The duplication is fine for now, but if a
future plan changes the overlay-removal contract, both call-sites must be
updated in lock-step. There's a small risk of one drifting from the other.

**Fix:**
No action required for Plan 180-12. If Plan 180-13 or later touches this
code, consider extracting a shared `removeDriverArtifacts(page, { triggerCallbacks })`
helper that both `dismissAnyModals` and `forceRemoveGalleryTour` delegate
to, with the `triggerCallbacks` flag controlling whether the popover close
button is clicked first.

---

_Reviewed: 2026-05-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Scope: Plan 180-12 supplement (diff base 5402a178^)_
