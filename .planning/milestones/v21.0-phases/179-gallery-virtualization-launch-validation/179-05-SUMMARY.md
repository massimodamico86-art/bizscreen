---
phase: 179-gallery-virtualization-launch-validation
plan: 05
subsystem: template-gallery
tags: [virtualization, page-rewire, scroll-container, render-branches, d-03, d-04, tdd-glue]

# Dependency graph
requires:
  - phase: 179
    provides: Plan 01 — @tanstack/react-virtual ^3.13.24 in package.json
  - phase: 179
    provides: Plan 02 — useContainerColumns hook (D-01 cols derivation from scroll container width)
  - phase: 179
    provides: Plan 04 — VirtualizedTemplateGrid component (row-chunked masonry virtualizer with overscan=5, measureElement, scrollToOffset(0) on identity change)
provides:
  - "src/pages/TemplateGalleryPage.jsx — restructured to D-03 flex-column shell: sticky FilterBar zone + flex-1 overflow-y-auto internal scroll container; D-04 5-branch ternary (loading/error/zero-content/favorites-empty/no-results/content) lives INSIDE the scroll container; content branch renders VirtualizedTemplateGrid (Plan 04)"
affects: [179-06, 179-07, 179-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-03 flex-column page shell: <PageContent> contains <div className='flex flex-col h-full'> with sticky FilterBar zone (top) + flex-1 overflow-y-auto scroll container (bottom); the scroll container is the virtualizer's scrollElement"
    - "D-04 render-branches-inside-scroll-container: all 5 ternary branches (loading skeleton / error EmptyState / zero-content EmptyState / favorites-empty EmptyState / no-results EmptyState / VirtualizedTemplateGrid) sit INSIDE the scroll container so the sticky FilterBar stays anchored across state transitions"
    - "Single-PageLayout return shape: 6 early-return blocks (~180 LOC) collapse to one ternary expression (~115 LOC); render-branch precedence preserved by reading-order = ternary-order"
    - "scrollContainerRef = useRef(null) declared alongside debounceTimerRef (existing ref site); useContainerColumns(scrollContainerRef) derives cols (1|2|3|4) from RO observed width; both passed to VirtualizedTemplateGrid as scrollElement={ref.current} + cols={cols}"
    - "Drop StaggeredPageTransition/StaggeredItem wrapper for the content branch — RESEARCH/PATTERNS guidance: doesn't compose with virtualizer remounts on scroll. Badges (New/Popular) and TemplateCard now encapsulated inside VirtualizedTemplateGrid (Plan 04)."

key-files:
  created: []
  modified:
    - "src/pages/TemplateGalleryPage.jsx (801 → 750 LOC; -51 net; 122 ins / 173 del; 1 commit)"

key-decisions:
  - "Followed plan's verbatim restructure pattern with zero deviations to the contract (sticky+scroll-container shell, ternary precedence, scrollContainerRef wiring, copy text byte-identical)"
  - "Dropped StaggeredPageTransition/StaggeredItem/TemplateCard/Badge from the design-system import block (no longer used in this file after the rewire). They remain exported from the design-system barrel; no other consumer touched. Verified: 0 occurrences of all four symbols in TemplateGalleryPage.jsx after edit."
  - "Net LOC reduction: 801 → 750. Plan predicted a reduction since the 6 PageLayout-wrapping early returns collapse to one. -51 LOC matches the prediction."

# Execution metrics
metrics:
  duration_min: ~7
  tasks_completed: 1
  files_changed: 1
  tests_added: 0
  tests_passing: 6  # Plan 04's existing VirtualizedTemplateGrid unit tests still green
  completed: 2026-05-11
---

# Phase 179 Plan 05: TemplateGalleryPage Rewire Summary

One-liner: Rewired `TemplateGalleryPage.jsx` to D-03's flex-column shell — sticky FilterBar zone on top + `flex-1 overflow-y-auto` internal scroll container below, with all 5 render branches (loading / error / zero-content / favorites-empty / no-results / content) collapsed into a single ternary INSIDE the scroll container per D-04; content branch now renders `VirtualizedTemplateGrid` (Plan 04). Net -51 LOC; build green; 6/6 unit tests still pass; URL-sync contract preserved verbatim.

## What Shipped

**`src/pages/TemplateGalleryPage.jsx`** — surgical rewire of the page shell + render-branch layout. The file is now structurally simpler:

- **Imports** — Added `VirtualizedTemplateGrid` (default) + `useContainerColumns` (named). Removed `TemplateCard`, `Badge`, `StaggeredPageTransition`, `StaggeredItem` (all four were only consumed by the content branch that is now encapsulated inside `VirtualizedTemplateGrid`).
- **Refs/hooks** — Added `scrollContainerRef = useRef(null)` + `cols = useContainerColumns(scrollContainerRef)` immediately after the existing `debounceTimerRef` (keeps refs co-located).
- **Render shape** — Collapsed 6 `return <PageLayout>...</PageLayout>;` blocks (loading branch + error + zero-content + favorites-empty + no-results + content) into ONE final return with:
  - `<PageLayout maxWidth="wide"><PageHeader title="Templates" description={pageDescription} /><PageContent>` wrapper
  - Inside `<PageContent>`: `<div className="flex flex-col h-full">`
  - Sticky FilterBar zone: `<div className="sticky top-0 z-10 bg-white">{filterBar}{activeFiltersRow}</div>`
  - Internal scroll container: `<div ref={scrollContainerRef} className="flex-1 overflow-y-auto">` holding the StarterPacksStrip (gated as before) + the 5-way ternary
  - `<PackPreviewModal />` placed OUTSIDE `<PageContent>` but INSIDE `<PageLayout>` (modal portal — sits above the page chrome).

## Locked Invariants (D-03/D-04 contract verbatim)

| Invariant | Where | Plan-required source |
|-----------|-------|----------------------|
| Single `<PageLayout>` wrapper (not 6 early returns) | One return at line ~633 | D-03 + PATTERNS lines 426–474 |
| Sticky FilterBar zone outside scroll container | `<div className="sticky top-0 z-10 bg-white">` at line 642 | D-03 |
| `flex-1 overflow-y-auto` scroll container | `<div ref={scrollContainerRef} className="flex-1 overflow-y-auto">` at line 652 | D-03 |
| All 5 render branches INSIDE scroll container | Ternary lines 669–729 | D-04 (pattern c) |
| Render-branch precedence preserved | Reading order: isFetching → fetchError → allTemplates===0 → favorites&&empty → empty → content | existing line-619 contract |
| `scrollContainerRef` declared with `useRef(null)` | Line 162 (alongside debounceTimerRef) | interfaces block |
| `useContainerColumns(scrollContainerRef)` invoked | Line 163 | D-01 |
| `scrollElement={scrollContainerRef.current}` passed to virtualizer | Line 722 | Plan 04 API |
| StarterPacksStrip ABOVE virtualized region inside scroll container | Lines 661–667, gated on `!isFetching && !fetchError && !filters.q && !isEditorReturn` | CONTEXT Integration Points + D-04 + Phase 174 D-04 |
| 4 EmptyState copy strings byte-identical | "Couldn't load templates" / "No templates yet" / "No favorites yet" / "No templates match your search" | TVRZ-04 regression guard |
| `data-tour="filter-bar"` anchor preserved | Line 486 (inside filterBar JSX, untouched) | Phase 174 D-18 + useGalleryTour.js |
| `data-tour="search-input"` anchor preserved | Line 499 (inside SearchBar in filterBar, untouched) | Phase 174 D-18 |
| `data-tour="first-card"` anchor preserved | Now lives in VirtualizedTemplateGrid (absoluteIndex===0), no longer in this file | useGalleryTour.js:45 |
| `<TemplateCardGrid columns={4}>` reduced to 1 occurrence | Loading-skeleton branch only; content branch uses VirtualizedTemplateGrid | acceptance criterion 9 |
| No `dangerouslySetInnerHTML` introduced | `grep -c` returns 0 | threat-model gate |
| URL-sync contract unchanged | `useSearchParams`, `filters` snapshot, debounced search, `updateFilter`, `clearAllFilters`, `displayedTemplates` useMemo, fuse.js — all untouched | TVRZ-04 SC contract |
| `editorReturn=1` contract unchanged | `isEditorReturn`, `returnSceneId`, `returnSlideId`, `applyTemplateToActiveSlide` path — all untouched | Phase 174 D-02 |

## Verification Results

### Grep acceptance criteria (all passing)

```text
✓ import VirtualizedTemplateGrid from '../components/template-gallery/VirtualizedTemplateGrid'  → line 49
✓ import { useContainerColumns } from '../hooks/useContainerColumns'                             → line 50
✓ useRef(null) — 2 occurrences (debounceTimerRef + scrollContainerRef)
✓ useContainerColumns(scrollContainerRef)                                                        → line 163
✓ ref={scrollContainerRef}                                                                       → line 652
✓ className="flex-1 overflow-y-auto"                                                             → line 652
✓ scrollElement={scrollContainerRef.current}                                                     → line 722
✓ <VirtualizedTemplateGrid                                                                       → line 719
✓ <TemplateCardGrid columns={4}>                                                                 → exactly 1 (skeleton branch)
✓ "Couldn't load templates"                                                                      → 1
✓ "No templates yet"                                                                             → 1
✓ "No favorites yet"                                                                             → 1
✓ "No templates match your search"                                                               → 1
✓ data-tour="filter-bar"                                                                         → line 486
✓ data-tour="search-input"                                                                       → line 499
✗ dangerouslySetInnerHTML                                                                        → 0 (threat-model gate clean)
✗ StaggeredPageTransition / StaggeredItem                                                        → 0 (cleanly dropped)
✗ <TemplateCard / <Badge direct usage                                                            → 0 (now via VirtualizedTemplateGrid)
```

### Lint (file-scoped — clean)

```text
$ npx eslint src/pages/TemplateGalleryPage.jsx
4 warnings, 0 errors  (all 4 warnings PRE-EXISTING — not introduced by this plan)
  - 246, 275: unused eslint-disable directives (inherited)
  - 338: unused eslint-disable directive (inherited)
  - 457: react-hooks/exhaustive-deps complex expression in filters.tags.join(',') (inherited)
```

Repo-wide `npm run lint` reports 315 errors, but they ALL pre-exist on the wave 1+2 base commit `5998e8da` (confirmed via `git stash` baseline check). They live in `tests/e2e/template-packs.spec.js`, `tests/load/k6-test.js`, and a handful of other unrelated files — out of scope per scope-boundary rule.

### Build (green)

```text
$ npm run build
✓ built in 7.37s
dist/assets/TemplateGalleryPage-Dh_WEUGD.js  82.13 kB │ gzip: 26.45 kB
```

### Unit tests (no regression)

```text
$ npx vitest run tests/unit/components/VirtualizedTemplateGrid.test.jsx
Test Files  1 passed (1)
     Tests  6 passed (6)  in 722ms
```

All 6 SC contracts from Plan 04 still hold (overscan ≥3, scrollToOffset(0) on identity change, aria-rowcount math, role="grid", null scrollElement tolerance, empty-templates handling). The wave-2 GREEN gate is preserved end-to-end.

## Commits

| Task | Commit | Message | Files |
|------|--------|---------|-------|
| 1 | `d70f4a3c` | `refactor(179-05): rewire TemplateGalleryPage to flex-column scroll container + VirtualizedTemplateGrid (D-03/D-04)` | `src/pages/TemplateGalleryPage.jsx` (122 ins / 173 del; -51 net LOC) |

## Line Count Delta

| Before | After | Δ |
|-------:|------:|---:|
| 801 LOC | 750 LOC | **-51 LOC** |

Reduction matches the plan's prediction — collapsing 6 `<PageLayout>...</PageLayout>` wrappers into one single return saves more lines than the new shell adds.

## Deviations from Plan

### Auto-fixed Issues

None. The plan was followed verbatim; no Rule 1/2/3 fixes were required.

### Other deviations from verbatim plan code

None to the contract. Two micro-deviations from the plan's literal Step-3 code skeleton (both cosmetic, fully compliant with the plan's intent):

1. **PackPreviewModal placement** — Plan code showed the modal AFTER `</PageContent>` but INSIDE `</PageLayout>`. Implemented exactly as the plan specified (line 740 — after `</PageContent>`, before `</PageLayout>`).
2. **Comment text** — Slightly more verbose inline comments than the plan skeleton (added D-03/D-04 anchor references inline so future readers see why the structure exists). No structural difference.

## Imports Removed

Per the plan's Step 4 instruction (drop `StaggeredPageTransition`/`StaggeredItem` since they don't compose with virtualizer remounts on scroll) plus the natural fallout from delegating card rendering to `VirtualizedTemplateGrid`:

- `TemplateCard` — now only used inside `VirtualizedTemplateGrid` (Plan 04)
- `Badge` — now only used inside `VirtualizedTemplateGrid` (Plan 04)
- `StaggeredPageTransition` — dropped per plan Step 4
- `StaggeredItem` — dropped per plan Step 4

All four remain exported from the design-system barrel (`src/design-system/index.js`); no other consumer touched. Verified pre-rewire grep showed `TemplateGalleryPage.jsx` was the sole consumer of `StaggeredPageTransition`/`StaggeredItem` in `src/`.

## Authentication Gates

None. Plan was fully autonomous (`autonomous: true`); no auth-protected resources touched.

## Threat Flags

None. The rewire introduces no new network endpoints, auth paths, or schema changes. The 5 render branches each render either a `<TemplateCardGrid>` of skeletons, an `<EmptyState>` with React-escaped text/attributes, or `<VirtualizedTemplateGrid>` (Plan 04, threat-model-clean). Verified: 0 occurrences of `dangerouslySetInnerHTML` in the file.

## Known Stubs

None. All five render branches are fully wired:

- Loading → real `TemplateCardGrid` + `TemplateCardSkeleton` (existing primitives)
- Error → real `EmptyState` with retry `refetch` callback
- Zero-content → real `EmptyState`
- Favorites-empty → real `EmptyState` with clear-filter callback
- No-results → real `EmptyState` with clear-all-filters callback
- Content → real `VirtualizedTemplateGrid` with all 8 required props sourced from live state (templates, cols, scrollElement, onApply, onToggleFavorite, applyingId, popularityThreshold, isNew)

The `scrollElement={scrollContainerRef.current}` value is `null` on the very first render before the ref attaches. This is the documented null-tolerance path covered by Plan 04 unit test #4 ("tolerates null scrollElement on first render (no crash)"). The component handles it by passing `() => null` as `getScrollElement`; `useVirtualizer` then renders zero virtual items until the ref attaches and a re-render delivers the real element. Not a stub — it's the contract.

## Self-Check: PASSED

- `src/pages/TemplateGalleryPage.jsx` exists (750 lines after edit) — VERIFIED via `wc -l`
- Commit `d70f4a3c` exists in git log — VERIFIED via `git log --oneline -1`
- File contains `import VirtualizedTemplateGrid from '../components/template-gallery/VirtualizedTemplateGrid'` at line 49 — VERIFIED via grep
- File contains `import { useContainerColumns } from '../hooks/useContainerColumns'` at line 50 — VERIFIED via grep
- File contains `useContainerColumns(scrollContainerRef)` at line 163 — VERIFIED via grep
- File contains `ref={scrollContainerRef}` at line 652 — VERIFIED via grep
- File contains `className="flex-1 overflow-y-auto"` at line 652 — VERIFIED via grep
- File contains `scrollElement={scrollContainerRef.current}` at line 722 — VERIFIED via grep
- All four EmptyState copy strings present exactly once — VERIFIED via grep
- `data-tour="filter-bar"` + `data-tour="search-input"` both present — VERIFIED via grep
- 0 occurrences of `dangerouslySetInnerHTML` — VERIFIED via grep
- 0 occurrences of `StaggeredPageTransition`/`StaggeredItem` — VERIFIED via grep
- 0 occurrences of direct `<TemplateCard ` / `<Badge ` usage — VERIFIED via grep
- Exactly 1 occurrence of `TemplateCardGrid columns={4}` (the loading-skeleton branch) — VERIFIED via grep
- `npm run build` exit 0 in 7.37s — VERIFIED
- `npx vitest run tests/unit/components/VirtualizedTemplateGrid.test.jsx` → 6 passed — VERIFIED
- File-scoped `npx eslint src/pages/TemplateGalleryPage.jsx` → 0 errors (4 pre-existing warnings) — VERIFIED
- No file deletions in commit (`git diff --diff-filter=D HEAD~1 HEAD` empty) — VERIFIED
- No untracked files left after commit (`git status --short | grep '^??'` empty) — VERIFIED
