---
phase: 173-starter-packs-favorites
plan: 08
subsystem: page-integration
tags: [ui, integration, page, template-gallery, starter-packs, favorites, tpck-01, tpck-02, tpck-04, tfav-01, tfav-02]

requires:
  - phase: 173-starter-packs-favorites
    plan: 05
    provides: toggleFavorite (gallery service), fetchStarterPacks / fetchPackDetail / applyStarterPack (marketplace service) — all consumed via the mounted strip + modal + card handler
  - phase: 173-starter-packs-favorites
    plan: 06
    provides: FavoriteButton design-system primitive + TemplateCard isFavorited/onToggleFavorite props (passed through on every rendered row)
  - phase: 173-starter-packs-favorites
    plan: 07
    provides: StarterPacksStrip (mounted above the grid), PackPreviewModal (mounted at page bottom with showToastAdapter bridge)

provides:
  - src/pages/TemplateGalleryPage.jsx — end-to-end wired page with strip + favorites chip + heart-on-card + pack modal + favorites-empty branch
  - showToastAdapter — object-form → 2-arg App.jsx toast bridge (Plan 07 explicitly carved this adapter for Plan 08)

affects:
  - 173-09-PLAN (admin page + App.jsx route — different files; sibling parallel worktree)
  - 173-10-PLAN (live E2E verification wave — can now drive the page end-to-end)

tech-stack:
  added: []
  patterns:
    - "URL-param favorites filter chip extending Phase 171 D-10 contract (searchParams.get('favorites') === '1'); toggle writes '1' or '' via the existing updateFilter writer without any new wiring"
    - "Strip gate on !filters.q ONLY — NOT on hasActiveFilters (RESEARCH Pitfall 5; D-11 literal). Category, orientation, favorites chips all keep the strip visible; only non-empty search hides it"
    - "Optimistic favorite toggle on TemplateCard: flip local allTemplates synchronously → await toggleFavorite → revert + red toast on error. Same row identified by composite (id, editor_type) to stay correct under polymorphic gallery_templates VIEW"
    - "Favorites-empty branch evaluated BEFORE the generic no-results branch so favorites-active precedence is explicit (UI-SPEC dictates distinct copy + action)"
    - "showToastAdapter: single useCallback that accepts the object form ({variant, heading, message, action}) and forwards to App.jsx's 2-arg showToast(message, type). Per D-14, navigation to 'scenes' stays opt-in — the adapter does NOT auto-invoke action.onClick"
    - "filterBar Favorites chip rendered as a plain <button role='checkbox' aria-checked> with brand-500 active style — matches the existing filterBar inline-button convention used by category/sort Selects (ToggleChips is reserved for multi-value segmented controls like orientation)"

key-files:
  created: []
  modified:
    - src/pages/TemplateGalleryPage.jsx

key-decisions:
  - "[173-08] Favorites chip rendered as inline <button role='checkbox'> inside filterBar, NOT as a ToggleChips segment. ToggleChips is a radio-group primitive (one of N); the Favorites filter is a single boolean, so a plain aria-pressed button matches the design-system conventions used elsewhere for single-boolean affordances"
  - "[173-08] useCallback dependency for handleToggleFavorite is [showToastAdapter], NOT [showToast]. The adapter is the stable reference the handler actually calls; revert-toast path goes through it. showToast can change on every App re-render so gating via the adapter keeps the handler identity stable across renders that don't re-create the adapter"
  - "[173-08] filters.favorites added to the displayedTemplates useMemo dep array explicitly. Without it, toggling favorites=1 would not re-run the filter pipeline because the useMemo wouldn't observe the change — subtle bug eliminated at wire-up time"
  - "[173-08] Favorites-empty branch rendered under PageLayout with filterBar (so user can clear the filter from the chip itself OR from the branch's 'Clear filter' action). activeFiltersRow is intentionally omitted from this branch because the only active filter is favorites, which has its own dedicated affordance"
  - "[173-08] showToastAdapter does NOT auto-invoke action.onClick. The App.jsx toast surface does not currently render action buttons, and D-14 mandates that navigation to 'scenes' is opt-in. Auto-invoking would force-navigate on every pack apply success, violating TPCK-02 ('no navigation away from the gallery required'). When the toast surface gains action buttons in a future phase, the adapter is the single place to wire through"
  - "[173-08] Handler composite key uses (t.id, t.editor_type) — matches the polymorphic gallery_templates VIEW discriminator and the template_favorites PK. Without editor_type the optimistic flip could hit the wrong row if svg and polotno rows ever share an id"
  - "[173-08] Strip mount position: between activeFiltersRow and StaggeredPageTransition (inside PageContent). D-10 says 'above the grid, between filter bar and grid' — placing it AFTER activeFiltersRow keeps the active-filter chip row immediately under the filter controls (keeps those together visually), and then the strip introduces the pack lane before the template grid below"

requirements-completed: [TPCK-01, TPCK-02, TPCK-04, TFAV-01, TFAV-02]

metrics:
  duration: 3min
  completed: 2026-04-23
  files_modified: 1
  files_created: 0
  tasks_completed: 1
  lines_added: 149
  lines_removed: 2
---

# Phase 173 Plan 08: TemplateGalleryPage Integration Summary

**TemplateGalleryPage is now end-to-end wired for the Phase 173 feature surface: the StarterPacksStrip sits above the grid (gated only on a non-empty search — Pitfall 5 cleared), a Favorites toggle chip in the filterBar flips URL param favorites=1, every TemplateCard row carries isFavorited + onToggleFavorite with an optimistic handler, and a dedicated favorites-empty EmptyState renders the UI-SPEC copy. PackPreviewModal is mounted with a showToastAdapter bridge that keeps D-14 opt-in navigation intact.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-23T13:22:50Z
- **Completed:** 2026-04-23T13:25:57Z
- **Tasks:** 1
- **Files modified:** 1
- **Files created:** 0
- **Net lines:** +149 / -2
- **Build:** GREEN — `npm run build` exits 0 in 6.52s; TemplateGalleryPage chunk built at 80.09 kB (gzip 26.92 kB)

## Accomplishments

- **Strip mount at the correct gate.** `{!filters.q && <StarterPacksStrip ... />}` placed between activeFiltersRow and StaggeredPageTransition. The gate is literally `!filters.q` — NOT `!hasActiveFilters` — so category/orientation/favorites chips all keep the strip visible; only typing a search query hides it (D-11, Pitfall 5).
- **Favorites URL-backed filter chip.** Single-line addition to the filterBar renders a `role="checkbox" aria-checked={filters.favorites}` button styled brand-500 when active; writes `?favorites=1` via the existing `updateFilter` writer. Extends the Phase 171 D-10 filter contract exactly as intended (no new URL-writer surface).
- **Optimistic favorite toggle handler.** `handleToggleFavorite` uses useCallback with showToastAdapter as the sole dep; flips local `allTemplates` synchronously via composite key (id, editor_type), awaits `toggleFavorite`, and on failure reverts + emits a red `'Failed to update favorite'` toast via the adapter. Matches UI-SPEC §Color: red error toast.
- **TemplateCard wired on every row.** Props added: `isFavorited={!!t.is_favorited}` and `onToggleFavorite={(nextValue) => handleToggleFavorite(t, nextValue)}`. The existing top-2-right slot in TemplateCard (Plan 06) picks these up and renders the heart with correct fill/stroke state.
- **Favorites-empty branch with UI-SPEC copy.** Rendered BEFORE the generic no-results branch so favorites-active always takes precedence. Copy: "No favorites yet" / "Tap the heart on any template to save it here." / "Clear filter" (clears `favorites=1`). Keeps the filterBar visible so users can self-correct.
- **PackPreviewModal mount with adapter.** The modal receives `showToast={showToastAdapter}` and `onNavigate={onNavigate}`. Apply success closes the modal; the adapter bridges `{variant:'success', heading:'Added N templates from <pack>', action:{label:'View scenes', onClick}}` to App.jsx's 2-arg `showToast(message, type)`. Per D-14, the adapter does NOT auto-invoke `action.onClick` — navigation stays opt-in.
- **No regressions.** Build is green, existing preview modal / search / orientation / category / sort filters / active-filter chips / generic no-results branch all preserved.

## Task Commits

1. **Task 1: TemplateGalleryPage — strip + favorites chip + heart-on-card + pack modal + favorites-empty branch** — `fb4413b1` (feat)

_Metadata commit for SUMMARY recorded as the final commit in this plan._

## Files Created/Modified

### Modified (1)

- `src/pages/TemplateGalleryPage.jsx` (+149 / -2) — imports expanded (useCallback, toggleFavorite, StarterPacksStrip, PackPreviewModal); filters state extended with `favorites`; displayedTemplates pipeline extended with is_favorited filter; filterBar extended with Favorites chip; new state slot `packModalState`; new `showToastAdapter` useCallback; new `handleToggleFavorite` useCallback; TemplateCard receives 2 new props per row; new favorites-empty branch inserted before generic no-results branch; StarterPacksStrip mounted in Content branch under the q-only gate; PackPreviewModal mounted at end of Content branch.

### Created
None — this is a page-integration plan; all new components/services landed in Plans 05–07.

## Decisions Made

- **Favorites chip is an inline `<button role="checkbox">`, not a ToggleChips segment.** ToggleChips is a segmented-control primitive (one-of-N). Favorites is a single boolean toggle. The inline button matches the filterBar's existing convention for boolean affordances and keeps the UI-SPEC's brand-50/brand-500 active style literal (no ToggleChips override surface needed).
- **showToastAdapter does NOT auto-invoke action callbacks.** D-14 explicitly carves "View scenes" as opt-in. App.jsx's current toast surface does not render action buttons; when that surface upgrades, the adapter is the single bridge point.
- **Handler uses composite key (id, editor_type) for the optimistic flip.** Matches the polymorphic gallery_templates VIEW and template_favorites PK shape. Prevents a cross-type id collision from mis-flipping the wrong row.
- **Favorites-empty branch checked BEFORE generic no-results.** UI-SPEC requires distinct copy + action for the favorites path. Ordering is explicit — favorites-active precedence at the branch level.
- **filters.favorites explicitly added to the displayedTemplates useMemo dep array.** Without it, toggling the chip would not re-run the filter pipeline. Subtle wire-up bug eliminated.
- **useCallback deps gate on showToastAdapter, not showToast.** The adapter is the stable reference that both the error-path in handleToggleFavorite and the modal's showToast prop share; the underlying App showToast may change across re-renders but the adapter identity is stable as long as App.jsx's showToast reference is.

## Deviations from Plan

None. All six surgical edits landed as planned with one minor addition: `filters.favorites` was added to the `displayedTemplates` useMemo dep array (not listed verbatim in the plan's action block but mandatory for correctness per React's hook rules). This is a Rule 2 auto-fix (missing critical functionality — without it the filter has no observable effect on re-render).

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added `filters.favorites` to useMemo dep array**
- **Found during:** Task 1 implementation review
- **Issue:** The plan's `<action>` block specified extending the filter chain with `if (filters.favorites) rows = rows.filter(...)` but did not explicitly list `filters.favorites` among the useMemo deps. Without it, toggling the favorites chip would not trigger re-computation of `displayedTemplates` on the next render (React hook rule: all referenced state must appear in the dep array).
- **Fix:** Appended `filters.favorites` to the existing dep array at line ~321 (in the original file before edits).
- **Files modified:** `src/pages/TemplateGalleryPage.jsx` (folded into Task 1).
- **Commit:** `fb4413b1`.

## Issues Encountered

None. Every plan grep passed on the first verification pass; build was green on the first run.

## User Setup Required

None — this is pure JSX page-integration wiring. Live DB objects, services, and UI primitives all shipped in Plans 04–07.

## Known Stubs

None. Every new prop flows to a real handler or real data source. The StarterPacksStrip empty-collapse (renders nothing when the pack list is empty) is intentional UI-SPEC behavior, not a stub.

## Threat Flags

None beyond the `<threat_model>` already declared in 173-08-PLAN.md (T-173-08-01..05 — all mitigated or accepted as designed). The adapter's intentional no-auto-invoke behavior for `action.onClick` directly enforces T-173-08 scope: no surface for forced navigation.

## Verification

- **Plan greps (14 of 14 PASS):**
  - `import StarterPacksStrip` — FOUND
  - `import PackPreviewModal` — FOUND
  - `import { toggleFavorite }` — FOUND (via `import { fetchGalleryTemplates, toggleFavorite } from '../services/templateGalleryService'`)
  - `favorites: searchParams.get('favorites') === '1'` — FOUND
  - `if (filters.favorites)` — FOUND
  - `{!filters.q && (` — FOUND
  - `StarterPacksStrip` — FOUND (mounted in Content branch)
  - `PackPreviewModal` — FOUND (mounted in Content branch)
  - `handleToggleFavorite` — FOUND (useCallback + TemplateCard prop call)
  - `isFavorited={!!t.is_favorited}` — FOUND
  - `onToggleFavorite={(nextValue) => handleToggleFavorite` — FOUND
  - `No favorites yet` — FOUND
  - `Tap the heart on any template to save it here.` — FOUND
  - NOT `{!hasActiveFilters && <StarterPacksStrip` — VERIFIED ABSENT (Pitfall 5 cleared literally)
- **Build:** `npm run build` exits 0 in 6.52s; TemplateGalleryPage chunk built at 80.09 kB (gzip 26.92 kB).

## Pointers

- **Plan 09** (sibling parallel worktree) — `AdminStarterPacksPage.jsx`, `PackEditorPanel.jsx`, `App.jsx` route registration. No file overlap with this plan.
- **Plan 10** (verification wave) — live E2E for TPCK-01..04 + TFAV-01..03. The page is now in the shape those E2E specs will drive against.

## Self-Check: PASSED

- File `src/pages/TemplateGalleryPage.jsx`: FOUND
- Commit `fb4413b1` (Task 1 — page integration): FOUND in git log
- grep `"import StarterPacksStrip"` in TemplateGalleryPage.jsx: FOUND
- grep `"import PackPreviewModal"` in TemplateGalleryPage.jsx: FOUND
- grep `"toggleFavorite"` import in TemplateGalleryPage.jsx: FOUND
- grep `"favorites: searchParams.get('favorites') === '1'"` in TemplateGalleryPage.jsx: FOUND
- grep `"if (filters.favorites)"` in TemplateGalleryPage.jsx: FOUND
- grep `"{!filters.q && ("` in TemplateGalleryPage.jsx: FOUND
- grep `"handleToggleFavorite"` in TemplateGalleryPage.jsx: FOUND
- grep `"isFavorited={!!t.is_favorited}"` in TemplateGalleryPage.jsx: FOUND
- grep `"onToggleFavorite={(nextValue) => handleToggleFavorite"` in TemplateGalleryPage.jsx: FOUND
- grep `"No favorites yet"` in TemplateGalleryPage.jsx: FOUND
- grep `"Tap the heart on any template to save it here."` in TemplateGalleryPage.jsx: FOUND
- `! grep "{!hasActiveFilters && <StarterPacksStrip"` in TemplateGalleryPage.jsx: VERIFIED ABSENT
- `npm run build` → exits 0 (built in 6.52s)

---
*Phase: 173-starter-packs-favorites*
*Completed: 2026-04-23*
