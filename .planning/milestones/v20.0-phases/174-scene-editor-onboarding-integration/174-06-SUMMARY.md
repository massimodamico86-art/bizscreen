---
phase: 174-scene-editor-onboarding-integration
plan: 06
subsystem: ui
tags: [editor-return, react-router, useSearchParams, driver.js-anchors, gallery, additive]

# Dependency graph
requires:
  - phase: 174-scene-editor-onboarding-integration
    plan: 03
    provides: migration 174 deployed to live + local DB (apply_template_to_active_slide RPC + onboarding_progress columns)
  - phase: 174-scene-editor-onboarding-integration
    plan: 04
    provides: TemplatePreviewModal mode/returnSceneId/returnSlideId props + applyTemplateToActiveSlide client wrapper (parallel — see Notes)
provides:
  - "TemplateGalleryPage editor-return mode (URL → svg-only filter + packs-strip hide + modal mode passthrough)"
  - "3 of 4 data-tour anchors for the Plan 09 driver.js gallery tour: filter-bar, search-input, first-card"
affects:
  - 174-09 (useGalleryTour hook — anchors filter-bar/search-input/first-card now exist in DOM)
  - 174-04 (TemplatePreviewModal — Plan 06 supplies mode/returnSceneId/returnSlideId props it must accept)
  - 174-05 (SceneEditorPage Browse Templates button — gallery is now ready to receive editorReturn URL params)

# Tech tracking
tech-stack:
  added: []   # No new libraries — pure additive edits
  patterns:
    - "useSearchParams URL-flag mode (extends Phase 171 D-10 / Phase 173 favorites=1 pattern)"
    - "data-tour=\"<slug>\" attribute strategy for driver.js anchor selectors (RESEARCH Pattern 6)"
    - "Conditional render guard `{!filters.q && !isEditorReturn && (...)}` (StarterPacksStrip hide)"
    - "i === 0 ? 'first-card' : undefined idiom for single-anchor selection in a map (avoids wrapper div)"

key-files:
  created: []
  modified:
    - src/pages/TemplateGalleryPage.jsx (+71 / -4 lines)

key-decisions:
  - "Passed data-tour=\"search-input\" directly to <SearchBar /> rather than via wrapper — SearchBar.jsx spreads {...props} onto its root <div> (verified at design-system/components/SearchBar.jsx:78)."
  - "Passed data-tour=\"first-card\" / undefined directly to <TemplateCard /> rather than via wrapper — TemplateCard.jsx spreads {...props} onto its root <div> (verified at design-system/components/TemplateCard.jsx:68)."
  - "Applied svg-only filter twice in the displayedTemplates useMemo: once on `pool` before fuse and once on `rows` after fuse. fuse.search runs against the full corpus (its index is built once over allTemplates) and could surface polotno hits when isEditorReturn=true; the post-fuse filter restores the editor-return guarantee end-to-end. No-op when isEditorReturn=false."
  - "StarterPacksStrip hide is composed with the existing !filters.q gate via && — preserves the Phase 173 D-11 'text search hides packs' contract for non-editor-return users while adding the editor-return hide as a second gate."
  - "Modal props (mode/returnSceneId/returnSlideId) passed unconditionally — they default to safe values in Plan 04. No isEditorReturn guard around the prop passing; the mode prop itself encodes the flag via the ternary."

requirements-completed: []   # TEDR-02 + TEDR-03 are co-completed by Plans 02+03+04+05+06 together; this plan ships the gallery half. Marked complete by the verifier when all six wave plans land green.

# Metrics
duration: 3min
completed: 2026-04-29
---

# Phase 174 Plan 06: TemplateGalleryPage editor-return Wiring Summary

**Wired the gallery half of the editor-return contract (D-02 svg-only filter + D-04 URL parsing + D-04 StarterPacksStrip hide + D-06 modal-mode passthrough) and added 3 of 4 data-tour anchors that Plan 09's driver.js tour will target. Single-task plan, single commit, no deviations.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-29T02:20:49Z
- **Completed:** 2026-04-29T02:23:21Z
- **Tasks:** 1
- **Files modified:** 1
- **Lines added/removed:** +71 / -4

## Accomplishments

- `TemplateGalleryPage` reads `?editorReturn=1`, `?returnSceneId=<id>`, `?slideId=<id>` via the existing `useSearchParams()` hook (Phase 171 D-10 pattern extended).
- When `isEditorReturn=true`, the visible template list is filtered to `editor_type === 'svg'` only — polotno templates never appear in editor-return mode (D-02).
- When `isEditorReturn=true`, `StarterPacksStrip` is hidden (D-04). Combined with the existing `!filters.q` gate so non-editor-return search behaviour is preserved verbatim.
- `TemplatePreviewModal` receives three new props passthrough: `mode={isEditorReturn ? 'editor-return' : 'new-scene'}`, `returnSceneId={returnSceneId}`, `returnSlideId={returnSlideId}` (D-06 — Plan 04 wires the modal half).
- Three `data-tour` anchors added per D-18 nomenclature: `filter-bar` (sticky filter row container), `search-input` (SearchBar root via prop spread), `first-card` (first TemplateCard via index-conditional prop spread). The 4th anchor (`apply-cta`) lives on Plan 04's modal Apply button.
- All Phase 171/173 behaviours preserved: search debouncing, URL writers (`updateFilter`/`clearAllFilters`), favorites toggle (`handleToggleFavorite`), recently-used localStorage logic, fuse.js search index, popularityThreshold computation, all 5 render branches (loading/error/zero-content/no-results-favorites/no-results-generic/content), `StaggeredPageTransition` wrapping, `PackPreviewModal` rendering. Zero regressions.

## Task Commits

1. **Task 1: Wire editor-return mode + 3 data-tour anchors** — `61a7a569` (feat — single atomic commit, +71 / -4 lines).

**Plan metadata commit:** [pending — final commit ships SUMMARY.md per parallel-executor protocol]

## Files Modified

### `src/pages/TemplateGalleryPage.jsx`

#### Change 1 — URL params read (after the existing `filters` const at line 168)

```diff
   filters = {
     ...
     favorites: searchParams.get('favorites') === '1',  // Phase 173 TFAV-02
   };

+  // Phase 174 D-04 — editor-return mode reads from URL.
+  // SceneEditorPage (Plan 05) writes ?editorReturn=1&returnSceneId=<id>&slideId=<id>
+  // before navigating to the gallery. When all three are present we:
+  //   - filter to SVG templates only (D-02; polotno cannot be applied to an
+  //     existing slide because SceneEditorPage cannot render polotno design_json)
+  //   - hide StarterPacksStrip (D-04; packs apply N templates, editor-return
+  //     swaps a single slide)
+  //   - pass mode/returnSceneId/returnSlideId to TemplatePreviewModal so its
+  //     Apply branch routes through Plan 04's applyTemplateToActiveSlide RPC
+  //     instead of the clone-into-new-scene path.
+  const isEditorReturn = searchParams.get('editorReturn') === '1';
+  const returnSceneId  = searchParams.get('returnSceneId') || null;
+  const returnSlideId  = searchParams.get('slideId') || null;
```

#### Change 2 — svg-only filter (inside `displayedTemplates` useMemo)

```diff
   const displayedTemplates = useMemo(() => {
+    let pool = allTemplates;
+    if (isEditorReturn) {
+      // D-02: editor-return only supports SVG templates.
+      pool = pool.filter((t) => t.editor_type === 'svg');
+    }
+
     let rows =
-      filters.q.length >= 2 ? fuse.search(filters.q).map((r) => r.item) : allTemplates;
+      filters.q.length >= 2 ? fuse.search(filters.q).map((r) => r.item) : pool;
+
+    // When fuse runs against the full corpus its results may include polotno
+    // rows; re-apply the svg-only constraint after the fuse search to keep the
+    // editor-return guarantee end-to-end. (No-op when isEditorReturn is false.)
+    if (isEditorReturn) {
+      rows = rows.filter((t) => t.editor_type === 'svg');
+    }
     ...
   }, [
     allTemplates, fuse, filters.q, filters.category, filters.tags.join(','),
-    filters.orientation, filters.sort, filters.favorites, user?.id,
+    filters.orientation, filters.sort, filters.favorites, isEditorReturn, user?.id,
   ]);
```

#### Change 3 — `data-tour="filter-bar"` + `data-tour="search-input"` (inside `filterBar` JSX)

```diff
   const filterBar = (
-    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-4 mb-4 flex items-center gap-3 flex-wrap">
+    // Phase 174 D-18 — data-tour="filter-bar" anchors the driver.js gallery tour's first stop (Plan 09).
+    <div
+      data-tour="filter-bar"
+      className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-4 mb-4 flex items-center gap-3 flex-wrap"
+    >
       <div className="flex-1 min-w-[220px]">
         <SearchBar
           ...
+          // Phase 174 D-18 — data-tour="search-input" reaches the DOM via {...props}.
+          data-tour="search-input"
         />
       </div>
```

#### Change 4 — StarterPacksStrip hide + `data-tour="first-card"` + modal props passthrough (inside content branch)

```diff
-        {!filters.q && (
+        {!filters.q && !isEditorReturn && (
           <StarterPacksStrip ... />
         )}
         <StaggeredPageTransition>
           <TemplateCardGrid columns={4}>
             {displayedTemplates.map((t, i) => (
               <StaggeredItem key={t.id}>
                 <div className="relative">
                   ...
                   <TemplateCard
                     title={t.name}
                     ...
                     onToggleFavorite={(nextValue) => handleToggleFavorite(t, nextValue)}
+                    // Phase 174 D-18 — data-tour="first-card" reaches the DOM
+                    // via {...props}; only index 0 carries the attribute.
+                    data-tour={i === 0 ? 'first-card' : undefined}
                   />
                 </div>
               </StaggeredItem>
             ))}
           </TemplateCardGrid>
         </StaggeredPageTransition>
         <TemplatePreviewModal
           open={previewState.open}
           templates={displayedTemplates}
           initialIndex={previewState.index}
           onClose={() => setPreviewState((s) => ({ ...s, open: false }))}
           onNavigate={onNavigate}
           showToast={showToast}
+          // Phase 174 D-06 — editor-return mode passthrough (additive; Plan 04 ships safe defaults).
+          mode={isEditorReturn ? 'editor-return' : 'new-scene'}
+          returnSceneId={returnSceneId}
+          returnSlideId={returnSlideId}
         />
```

## Acceptance Criteria Verification

All 14 acceptance criteria from PLAN passed:

| Criterion | grep pattern | Result |
|---|---|---|
| URL read editorReturn | `searchParams.get('editorReturn')` | 1 occurrence (line 180) ✓ |
| URL read returnSceneId | `searchParams.get('returnSceneId')` | 1 occurrence (line 181) ✓ |
| URL read slideId | `searchParams.get('slideId')` | 1 occurrence (line 182) ✓ |
| isEditorReturn declaration | `isEditorReturn = searchParams.get('editorReturn') === '1'` | regex match ✓ |
| svg-only filter present | `editor_type === 'svg'` | 2 occurrences (lines 365, 375 — pre + post fuse) ✓ |
| StarterPacksStrip wrapped | `{!filters.q && !isEditorReturn &&` | line 708 ✓ |
| filter-bar anchor | `data-tour="filter-bar"` | line 449 ✓ |
| search-input anchor | `data-tour="search-input"` | line 462 ✓ |
| first-card anchor | `data-tour={i === 0 ? 'first-card' : undefined}` | line 749 ✓ |
| Modal mode wired | `mode={isEditorReturn` | line 770 ✓ |
| Modal returnSceneId | `returnSceneId={returnSceneId}` | line 771 ✓ |
| Modal returnSlideId | `returnSlideId={returnSlideId}` | line 772 ✓ |
| **Regression guard** | `handleToggleFavorite` | 2 occurrences (declaration + JSX use) ✓ |
| Build error gate | `npm run build 2>&1 \| grep error` | 0 errors, 0 warnings ✓ |

## Deviations from Plan

**None.** Plan executed exactly as written. The pattern map's recommendation to verify whether `SearchBar` and `TemplateCard` spread `{...props}` onto their root elements was confirmed (both do — SearchBar.jsx:78, TemplateCard.jsx:68), so no wrapper divs were needed for the search-input and first-card anchors. The plan accepted this as the preferred path; the wrapper-div fallback was not used.

The plan included an "Optional polish" Step 8 noting that the Favorites filter chip remains visible in editor-return mode without code change. Confirmed: `filterBar` renders the Favorites button unconditionally, independent of `isEditorReturn`.

## Authentication Gates

None encountered. All edits are pure code changes; no DB migrations, secrets, CLI auth, or environment variables involved.

## Issues Encountered

None. Build succeeded on first attempt with no errors and no warnings. All grep verification checks passed first-run.

## Notes on Wave 4 Parallelism

This plan ships in Wave 4 alongside Plan 04 (TemplatePreviewModal mode-prop integration) and Plan 05 (SceneEditorPage "Browse Templates" button). Wave 4 plans are isolated to different files and depend on Plans 02 and 03 (already shipped):

- **Plan 04** owns `src/components/template-gallery/TemplatePreviewModal.jsx` — adds the `mode`, `returnSceneId`, `returnSlideId` props with safe defaults and forks `handleApply` to call `applyTemplateToActiveSlide` when `mode === 'editor-return'`.
- **Plan 05** owns `src/pages/SceneEditorPage.jsx` — adds the topbar Browse Templates button that writes the editorReturn URL params and navigates to the gallery.
- **Plan 06 (this plan)** owns `src/pages/TemplateGalleryPage.jsx` — reads the URL params, filters, and passes the props to the modal.

After all three Wave 4 plans land, the editor-return round-trip is complete end-to-end: SceneEditor button → URL params → gallery filter+packs-hide → modal mode-prop → RPC apply → navigate back to scene editor. Plan 01's TEDR-01..03 E2E tests should turn GREEN at that point.

Plan 09 (Wave 5) consumes the 3 data-tour anchors added here plus the 4th anchor on the modal (Plan 04). Until Plan 09 ships the `useGalleryTour` hook, the anchors are inert DOM attributes — zero behavioural impact on the gallery.

## Threat Surface

The PLAN's threat model identified four threats, all dispositioned `accept` or `mitigate` by upstream gates:

- **T-174-06-01** (URL tampering of returnSceneId/slideId) — accepted; mitigated server-side by Plan 02's RPC ownership checks (`scenes.tenant_id = auth.uid()` + scene-slide membership check). Tampered URLs trigger `Scene not found or access denied` at the RPC layer.
- **T-174-06-02** (Polotno bypass via URL editing) — mitigated. The UI filter restricts the *visible* set to SVG; Plan 02's RPC additionally raises `Only SVG templates supported in editor-return mode` if a user crafts a polotno apply request directly. Two-layer defense.
- **T-174-06-03** (XSS via data-tour values) — accepted; all three values are static string literals (`"filter-bar"`, `"search-input"`, `"first-card"`). No user input flows into them.
- **T-174-06-04** (Information disclosure via StarterPacksStrip visibility) — accepted; UI visibility based on URL params is not a security signal worth protecting.

No new threat surface introduced beyond the registered set. No threat flags raised.

## Self-Check: PASSED

- ✓ FOUND: `src/pages/TemplateGalleryPage.jsx` (modified — git status confirms clean working tree post-commit)
- ✓ FOUND commit `61a7a569`: `feat(174-06): wire editor-return mode + 3 data-tour anchors in TemplateGalleryPage` (verified via `git log --oneline -3`)
- ✓ Build succeeds: `dist/assets/TemplateGalleryPage-DKexEvd1.js  80.44 kB │ gzip:  27.06 kB`
- ✓ All 14 acceptance criteria PASS
- ✓ No deviations
- ✓ Phase 173 favorites toggle regression check: `handleToggleFavorite` still appears 2x (declaration + JSX use)

---
*Phase: 174-scene-editor-onboarding-integration*
*Plan: 06 — TemplateGalleryPage editor-return wiring + 3 data-tour anchors*
*Completed: 2026-04-29*
