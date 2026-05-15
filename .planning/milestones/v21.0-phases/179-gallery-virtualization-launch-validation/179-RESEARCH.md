# Phase 179: Gallery Virtualization + Launch Validation — Research

**Researched:** 2026-05-10
**Domain:** Browser-side virtualization of a ~500-template masonry gallery; Playwright performance + axe-core validation
**Confidence:** HIGH (TanStack Virtual API verified via Context7 `/tanstack/virtual`; package versions live-queried via `npm view`; integration site read line-by-line; Playwright/axe patterns verified against official docs)

---

## Summary

Phase 179 replaces `TemplateGalleryPage`'s full-DOM render (~485 cards today, target ~500) with a row-chunked `@tanstack/react-virtual` v3.13.24 virtualizer using `measureElement` to support OptiSigns-style mixed-orientation masonry. CONTEXT.md D-01..D-05 lock the approach: ResizeObserver-derived `cols` → row chunking → `useVirtualizer({ measureElement })` → internal `flex-1` scroll container → skeleton/empty/error states render inside that container. Research focuses on the HOW (idioms, gotchas, scroll reset on filter identity change, count=0 guard, axe-core for virtualized DOM, CDP-based 1× CPU throttle) — not the WHAT.

The 5 success criteria map cleanly to a unit+E2E split: SC-1 (virtualizer config + CSS audit) → vitest; SC-2/3/4/5 → Playwright. The one notable contradiction with CONTEXT.md is that **TanStack Virtual ships a native `lanes` option for masonry** [VERIFIED: Context7 `/tanstack/virtual`] which is conceptually cleaner than row-chunking. The locked decision (D-02) is row-chunking with `measureElement` + ResizeObserver-derived `cols`. We honor the lock, but the Open Questions section flags this so the planner can consciously confirm or invoke the lock-override path before plan-writing.

**Primary recommendation:** Honor D-01..D-05 verbatim. Implement as `VirtualizedTemplateGrid` (sibling component to keep `TemplateGalleryPage.jsx` under 1000 LOC). Row height = max of items in row (landscape vs portrait), measured post-mount via `data-index` + `ref={virtualizer.measureElement}`. ResizeObserver tracks scroll-container width → derives `cols` (1/2/3/4 at 640/768/1024 breakpoints). Effect-driven `scrollToOffset(0)` keyed on `filteredTemplates` reference identity. Skeleton branch renders with `count=0` so the virtualizer is dormant during loading. Playwright SC-2 uses `page.context().newCDPSession()` + `Emulation.setCPUThrottlingRate { rate: 1 }` (1× = no throttle, but the API call itself documents intent and is the CI-stable spot to swap rates if hardware varies). Axe-core scan via `@axe-core/playwright` 4.11.3 scoped to the gallery container.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 — Column count derived via ResizeObserver on the internal scroll container.** The virtualizer's `count = Math.ceil(filteredTemplates.length / cols)` math needs `cols` to match the actually-rendered grid. ResizeObserver tracks the real container width (e.g. <640 → 1, <768 → 2, <1024 → 3, else 4) so the mapping survives parent constraints. Rejected: matchMedia; locked-to-4-cols; one-virtual-row-per-item.

**D-02 — Masonry + `useVirtualizer({ measureElement })`** for variable-height rows. User directive: "OptiSigns is the standard you follow." Phase 178 D-10 shipped portrait + landscape hero variants → mixed-orientation cards exist in the catalog today and the strict `aspect-video` card forces letterboxing. **Risk surfaced & accepted:** `measureElement` adds layout-on-render cost; SC-2's <1s budget becomes the load-bearing perf gate. Planner MUST measure first-paint with the test fixture and tune `estimateSize` defaults so layout converges within the budget. Rejected: fixed `estimateSize` per breakpoint; hybrid fixed-grid + object-fit:contain.

**D-03 — Internal `flex-1` scroll container with sticky FilterBar above.** Page becomes a flex column: sticky FilterBar at top, `flex-1` scroll container below owning the virtualizer (`overflow-y: auto`, `height` derived implicitly from `flex-1` not from `vh` math). **Visible behavior change vs v20.0:** the page no longer has body-level scroll — only the grid scrolls. Acceptable per SC-4. Rejected: windowVirtualizer; fixed `75vh`.

**D-04 — Skeleton / empty / error states render INSIDE the virtualized scroll container.** Implementation pattern at planner discretion within these constraints. Must preserve `count = 0` while `isLoading` is true (SC-1) and must not break SC-5's axe-core zero-violations gate.

**D-05 — Admin queue page retrofit stays out of scope.** Phase 178 CONTEXT explicitly tagged queue-page virtualization as "v21.x watch item, NOT a Phase 178/179 task." Phase 179 ships the dep + the pattern; same dep can be retrofitted later.

### Claude's Discretion

- **Skeleton-inside-virtualizer pattern (D-04):** three viable shapes — (a) overlay skeleton block above a `count=0` virtualizer, (b) render N skeleton rows AS virtual rows during loading, (c) swap inner content of the scroll container by render branch. Suggest (c) for clarity; (a) is lowest-risk if (c) creates flash-of-empty-virtualizer.
- **`overscan` value (SC-1 ≥3 minimum):** suggest `5` rows. Bench at lower values if SC-2 needs headroom.
- **Per-card aspect detection for masonry (D-02):** templates have `width` + `height` on `svg_templates` rows; existing `orientation` column maps directly to TemplateCard's already-shipped `orientation` prop (`landscape` | `portrait` | `square`).
- **`estimateSize` initial values:** suggest computing from current cols + container width.
- **Test fixture source for SC-2:** live local Supabase has 485 active templates; use that as the canonical fixture and pin to `npm run db:start`. Alternative: route-intercept `fetchGalleryTemplates`.
- **Bundle-cost check for `@tanstack/react-virtual`:** ~10KB gzipped. Optional one-line build-size assertion.
- **Migration path:** suggest extracting `VirtualizedTemplateGrid` into `src/components/template-gallery/` so the page file stays <1000 LOC.

### Deferred Ideas (OUT OF SCOPE)

- Admin queue page (`AdminTemplateQueuePage`) virtualization retrofit — v21.x watch item
- Branded category hero banners — v22.0 candidate
- Horizontal carousels per category on home/landing view — v22.0
- TCAT-F2 vertical filter chip surfacing — v22.0
- TCAT-F5 orthogonal filter taxonomy — v22.0
- `@tanstack/react-virtual` retrofit to other long lists — none blocking
- Service worker / route-level code splitting for the gallery chunk
- `IntersectionObserver`-based thumbnail preloading
- TemplateCard visual redesign beyond aspect-native rendering
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TVRZ-01 | `@tanstack/react-virtual` activated for `TemplateGalleryPage` template grid (replaces full-DOM render) | Standard Stack §`@tanstack/react-virtual`; Code Examples §Row-Chunked Masonry Virtualizer; Architecture Patterns §VirtualizedTemplateGrid extraction |
| TVRZ-02 | Initial render <1s on mid-range Chromium with 1× CPU throttle at full ~500-template catalog | Code Examples §Playwright CDP CPU Throttle + performance.mark; Common Pitfalls §`measureElement` layout cost |
| TVRZ-03 | Smooth scroll; fuse.js search re-renders preserve user scroll position and focus during typing | Code Examples §`scrollToOffset(0)` on filteredResults identity change; Common Pitfalls §Effect dep on filteredResults reference identity |
| TVRZ-04 | URL-synced filter/sort/search state from v20.0 works post-virtualization — no TGAL-01..05 / TDSC-01..05 regression | Architecture Patterns §Internal Scroll Container + Sticky FilterBar; Common Pitfalls §Body scroll removal regression risk |
| TVRZ-05 | Skeleton, empty, error states render inside virtualized container; axe-core zero violations; `aria-rowcount` on virtual grid container; v20.0 gallery E2E ≥90% green | Code Examples §axe-core scan + aria-rowcount; Architecture Patterns §Render Branches Inside Scroll Container |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Virtualized grid rendering | Browser / Client | — | Pure client-side concern; consumes in-memory `filteredTemplates` array |
| ResizeObserver column derivation | Browser / Client | — | Reads actual DOM container width post-layout |
| Scroll container + sticky filter bar layout | Browser / Client | — | CSS layout; no SSR in this app |
| `scrollToOffset(0)` on filter change | Browser / Client | — | Imperative API call on virtualizer instance |
| fuse.js search (existing) | Browser / Client | — | In-memory; unchanged by Phase 179 |
| URL-synced filter state (existing) | Browser / Client | — | `useSearchParams` from react-router-dom v7; unchanged |
| Template catalog fetch | API / Backend | Database | `fetchGalleryTemplates({ limit: 500 })` reads `gallery_templates` VIEW; unchanged by Phase 179 |
| Performance measurement | Browser / Client | — | `performance.mark` / `performance.measure` in test fixture; CDP `Emulation.setCPUThrottlingRate` from Playwright |
| Accessibility validation | Browser / Client | — | `@axe-core/playwright` runs against rendered DOM; verifies aria-rowcount + scoped to grid |

**Sanity check:** Phase 179 is entirely a browser-tier change. Zero backend / database touches. The closest cross-tier interaction is the test fixture using a live local Supabase DB for SC-2 (~500 templates), but that's a CI/test concern not a runtime architectural concern.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-virtual` | ^3.13.24 [VERIFIED: `npm view @tanstack/react-virtual version` → 3.13.24 (2026-04-17)] | Headless virtualization; row-chunked + `measureElement` masonry primitive | TanStack Virtual is the de-facto headless virtualizer for React 18+/19. Successor to `react-virtual`. Zero CSS opinions. Native `lanes` for masonry. Already locked in `.planning/research/STACK.md`. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@axe-core/playwright` | ^4.11.3 [VERIFIED: `npm view @axe-core/playwright version` → 4.11.3 (2026-04-30)] | Axe-core engine wired into Playwright for SC-5 zero-violations scan | Add as devDependency. `AxeBuilder({ page }).include(<gridSelector>).analyze()` runs the scan; `expect(results.violations).toEqual([])` is the assertion shape per [Playwright accessibility docs](https://playwright.dev/docs/accessibility-testing). |
| `@playwright/test` | ^1.57.0 [VERIFIED: package.json] | E2E framework; supports CDP via `page.context().newCDPSession()` for `Emulation.setCPUThrottlingRate` | Existing — no version change |
| `vitest` | ^4.0.14 [VERIFIED: package.json] | Unit tests for virtualizer config (SC-1) — overscan ≥ 3, count=0 guard, scrollToOffset spy (SC-3) | Existing |
| `fuse.js` | ^7.3.0 [VERIFIED: package.json] | Client-side search (existing; SC-3 requires its identity-change behavior is preserved) | Existing — DO NOT touch |
| `react-router-dom` | ^7.9.5 [VERIFIED: package.json] | URL-synced filter state via `useSearchParams` (existing; SC-4) | Existing — DO NOT touch |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@tanstack/react-virtual` row-chunked (D-02) | `@tanstack/react-virtual` with native `lanes: cols` (masonry primitive built in) [VERIFIED: Context7 `/tanstack/virtual` "useVirtualizer - Masonry Layout"] | `lanes` is conceptually cleaner — assigns items to shortest lane, no row-chunk math. **But** [VERIFIED: [TanStack/virtual#1063](https://github.com/TanStack/virtual/issues/1063)] lane re-layout when `lanes` changes (which it would on ResizeObserver-driven `cols` change) is a known broken edge case with `measureElement`. Row-chunked + `measureElement` (D-02) sidesteps this by recomputing `count = ceil(N/cols)` instead of changing `lanes`. **Locked decision honored.** |
| `@tanstack/react-virtual` row-chunked (D-02) | `react-window` | TanStack Virtual is headless (no CSS), TS-native, actively maintained; react-window injects styles and has been in maintenance mode. Already locked in STACK.md. |
| Internal `flex-1` scroll container (D-03) | `useWindowVirtualizer` + `scrollMargin` | Window virtualizer scrolls the body; sticky FilterBar would either scroll out of view or need extra fixed-position scaffolding. Internal scroll matches OptiSigns category-view shape. Already locked. |
| `@axe-core/playwright` | Manual ARIA assertion (Playwright `getByRole`, `aria-*` attribute checks) | Manual checks miss the long tail of WCAG rules and the violations array shape is brittle. Axe-core is the industry-standard accessibility engine; first-party Playwright integration. |

**Installation:**

```bash
npm install @tanstack/react-virtual
npm install --save-dev @axe-core/playwright
```

**Version verification (locked at research time):**
- `@tanstack/react-virtual` 3.13.24 — published 2026-04-17 [VERIFIED: npm registry]
- `@axe-core/playwright` 4.11.3 — published 2026-04-30 [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  TemplateGalleryPage  (page-level shell)                 │
│                                                                          │
│  ┌─ React state (existing) ────────────────────────────────────────┐    │
│  │ allTemplates, isFetching, fetchError, filters, fuse, displayed │    │
│  │     ▲                                                           │    │
│  │     │  fetchGalleryTemplates({ limit: 500 }) — UNCHANGED        │    │
│  │     │                                                           │    │
│  │  Supabase ← gallery_templates VIEW (~485 active rows today)     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─ NEW: flex column layout (D-03) ─────────────────────────────────┐   │
│  │                                                                  │   │
│  │  ┌─ sticky FilterBar  (existing JSX, unchanged) ──────────────┐ │   │
│  │  │  SearchBar | Select(cat) | Select(tag) | ToggleChips      │ │   │
│  │  │  | Select(sort) | Favorites chip                          │ │   │
│  │  └────────────────────────────────────────────────────────────┘ │   │
│  │                                                                  │   │
│  │  ┌─ flex-1 scroll container  (NEW; ref'd for ResizeObserver) ─┐  │   │
│  │  │     ▲                                                     │  │   │
│  │  │     │ ResizeObserver → cols (1/2/3/4 at 640/768/1024)     │  │   │
│  │  │     │                                                     │  │   │
│  │  │  ┌── render branch (D-04) ─────────────────────────────┐ │  │   │
│  │  │  │                                                      │ │  │   │
│  │  │  │  isFetching → <Skeleton block /> (count=0, SC-1)    │ │  │   │
│  │  │  │  fetchError → <Error block />                       │ │  │   │
│  │  │  │  allTemplates.length===0 → <ZeroContent block />    │ │  │   │
│  │  │  │  displayed.length===0    → <NoResults block />      │ │  │   │
│  │  │  │  else                    → <VirtualizedTemplateGrid │ │  │   │
│  │  │  │                              templates={displayed} │ │  │   │
│  │  │  │                              cols={cols}           │ │  │   │
│  │  │  │                              scrollElement={ref}   │ │  │   │
│  │  │  │                              onApply, onFavorite/> │ │  │   │
│  │  │  │                                                      │ │  │   │
│  │  │  └──────────────────────────────────────────────────────┘ │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘

VirtualizedTemplateGrid (NEW, sibling of TemplateGalleryPage):
  • Receives templates (filtered+sorted), cols, scrollElement ref
  • rows = chunk(templates, cols)  — array of arrays
  • virtualizer = useVirtualizer({
      count: rows.length,
      getScrollElement: () => scrollElement,
      estimateSize: () => ESTIMATE,  // computed from cols + container width
      overscan: 5,
      measureElement: (el) => el.getBoundingClientRect().height,
    })
  • useEffect([templates]) → virtualizer.scrollToOffset(0)
  • Renders rows[virtualRow.index]; each row is a CSS flex/grid of `cols` TemplateCards
  • aria-rowcount = rows.length  (full virtual count, not rendered count — for axe / screen readers)
  • Each rendered row has data-index={virtualRow.index} + ref={virtualizer.measureElement}
```

### Recommended Project Structure

```
src/
├── pages/
│   └── TemplateGalleryPage.jsx           # MODIFIED: branches now wrap in flex column
│                                          # + scroll container ref + ResizeObserver
├── components/
│   └── template-gallery/
│       ├── StarterPacksStrip.jsx          # existing — stays ABOVE filter bar
│       ├── PackPreviewModal.jsx           # existing — unchanged
│       ├── PackCard.jsx                   # existing — unchanged
│       └── VirtualizedTemplateGrid.jsx    # NEW: useVirtualizer wrapper
├── hooks/
│   └── useContainerColumns.js             # NEW (suggested): ResizeObserver → cols
└── design-system/components/
    ├── TemplateCard.jsx                   # ALREADY supports orientation prop — no change needed
    └── TemplateCardSkeleton.jsx           # ALREADY shipped; reused in loading branch
```

### Pattern 1: Row-Chunked Masonry Virtualizer (D-02)

**What:** Each "virtual row" contains exactly `cols` items. Row height = max of the items in that row (post-measurement via `measureElement`). Works because mixed portrait + landscape cards in the same row tile naturally if the row matches the tallest card.

**When to use:** Always — locked by D-02.

**Example:**
```jsx
// Source: derived from Context7 `/tanstack/virtual` "Dynamic Item Sizing with measureElement"
//         + the same library's "Masonry Layout with Lanes" snippet (for the lane concept)
// Adapted to D-02 row-chunking (NOT native `lanes`) per Open Question OQ-1.
import { useVirtualizer } from '@tanstack/react-virtual';

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function VirtualizedTemplateGrid({ templates, cols, scrollElement, ...cardProps }) {
  const rows = useMemo(() => chunk(templates, cols), [templates, cols]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 320,   // approximate landscape-card row height; refined by measureElement
    overscan: 5,                // SC-1: ≥3 minimum; 5 is the suggested default per CONTEXT
  });

  // SC-3: scroll reset on filtered-results identity change
  useEffect(() => {
    virtualizer.scrollToOffset(0);
    // Intentional: re-run when the templates array reference changes
  }, [templates, virtualizer]);

  const items = virtualizer.getVirtualItems();

  return (
    <div
      role="grid"
      aria-rowcount={rows.length}                              // SC-5
      style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
    >
      {items.map((vRow) => {
        const row = rows[vRow.index];
        return (
          <div
            key={vRow.key}
            data-index={vRow.index}
            ref={virtualizer.measureElement}                   // D-02: measureElement after mount
            role="row"
            aria-rowindex={vRow.index + 1}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${vRow.start}px)`,
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gap: '1rem',
              alignItems: 'start',                              // critical for masonry — DO NOT use 'stretch'
            }}
          >
            {row.map((tpl) => (
              <TemplateCard key={tpl.id} orientation={tpl.orientation} {...cardProps} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
```

**Critical CSS detail:** `align-items: start` (NOT `stretch`) on the row container — otherwise the row containers will stretch to equal heights and defeat masonry. The shorter card simply sits at the top of its column with its native aspect.

### Pattern 2: ResizeObserver-Derived Column Count (D-01)

**What:** Track the scroll container's actual width via ResizeObserver; map to `cols` via Tailwind breakpoint thresholds.

**When to use:** Always — locked by D-01.

**Example:**
```jsx
// Source: pattern adapted from src/ScaledStage.jsx (already in this codebase, lines 22-32)
//         + Context7 `/tanstack/virtual` ResizeObserver guidance
import { useEffect, useState, useRef } from 'react';

const COL_BREAKPOINTS = [
  { minWidth: 1024, cols: 4 },   // lg
  { minWidth: 768,  cols: 3 },   // md
  { minWidth: 640,  cols: 2 },   // sm
  { minWidth: 0,    cols: 1 },   // mobile default
];

function widthToCols(width) {
  return COL_BREAKPOINTS.find((b) => width >= b.minWidth).cols;
}

export function useContainerColumns(ref) {
  const [cols, setCols] = useState(4);  // SSR-safe default; corrected by RO on mount

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Initial measurement — RO does NOT fire on first observe in some browsers
    setCols(widthToCols(el.getBoundingClientRect().width));
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setCols(widthToCols(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return cols;
}
```

**StrictMode caveat [VERIFIED: React 18+ behavior]:** Effects run twice in development StrictMode. The pattern above is idempotent (RO is disposed on cleanup, then re-created) — no double-subscribe issue. Verified pattern in `src/ScaledStage.jsx`.

**Initial measurement caveat [VERIFIED: WHATWG Resize Observer spec]:** ResizeObserver fires asynchronously after the first observe call, so the initial `setCols(widthToCols(getBoundingClientRect().width))` is a synchronous pre-fill that prevents a one-render flash with the SSR default.

### Pattern 3: Render Branches Inside the Scroll Container (D-04)

**What:** All five render branches (loading / error / zero-content / no-results / content) live inside the same `flex-1` scroll container, so the page layout doesn't reflow between states and the sticky FilterBar stays anchored.

**Recommendation (planner discretion within D-04):** Pattern (c) — swap inner content of the scroll container by render branch. Each non-content branch renders a regular block (EmptyState/skeleton/error), with `count = 0` ensured by simply not mounting `VirtualizedTemplateGrid` when not in the content branch.

```jsx
// Inside TemplateGalleryPage render
<div className="flex flex-col h-full">
  {filterBar}
  <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
    {!isFetching && !fetchError && filters.q === '' && !isEditorReturn && (
      <StarterPacksStrip onSelect={...} />
    )}
    {activeFiltersRow}
    {isFetching ? (
      <SkeletonBlock />          /* renders N TemplateCardSkeleton blocks; count=0 virtualizer */
    ) : fetchError ? (
      <ErrorBlock onRetry={refetch} />
    ) : allTemplates.length === 0 ? (
      <ZeroContentBlock />
    ) : displayed.length === 0 ? (
      <NoResultsBlock onClear={clearAllFilters} />
    ) : (
      <VirtualizedTemplateGrid
        templates={displayed}
        cols={cols}
        scrollElement={scrollContainerRef.current}
        onApply={handleSelectTemplate}
        onToggleFavorite={handleToggleFavorite}
      />
    )}
  </div>
</div>
```

### Anti-Patterns to Avoid

- **`useWindowVirtualizer`:** locked OUT by D-03. The sticky FilterBar plus window scroll combine to scroll the filter bar out of view (or require fixed-position scaffolding).
- **`stretch` align-items on row containers:** defeats masonry. Use `align-items: start`.
- **Calling `virtualizer.measure()` manually:** the `measureElement` ref callback + `data-index` attribute are the documented integration — the library handles ResizeObserver internally per-item. Calling `measure()` manually is reserved for after non-resize layout invalidations (e.g., font load).
- **Dynamic `lanes` change on cols change:** [VERIFIED: TanStack/virtual#1063] breaks with `measureElement`. D-02 row-chunking avoids this entirely.
- **`scrollToOffset(0)` inside the same render as the filter change:** must be in an effect keyed on the templates reference, not a direct call in the render. Synchronous calls during render fight with React's scheduler.
- **Forgetting `data-index` on the row container:** the ref callback `virtualizer.measureElement` needs `data-index` on the same element to associate the measurement with the virtual row index. Easy to miss; silent layout corruption if absent.
- **Removing body scroll without auditing the page:** D-03 changes `TemplateGalleryPage` from body-scroll to internal-scroll. Confirmed no `scrollTo` or `scrollIntoView` references in this page or any sibling component touches `documentElement.scrollHeight` for the gallery [VERIFIED: grep over `src/` returned only 3 references, all in unrelated PlaylistEditorPage + BulkActionConfirmModal].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Window/container size tracking | Custom debounced resize handler on `window.resize` | ResizeObserver [VERIFIED: standard Web API, fully supported in Chrome/Edge/Firefox/Safari per MDN] | Fires only when target resizes (not on every window resize); cheaper; gives the actually-rendered container width even when sidebars/parent layouts constrain it |
| Item virtualization | Custom slice-by-scrollTop + offset math | `@tanstack/react-virtual` `useVirtualizer` | Months of edge cases (smooth scroll mid-measurement, scrollbar widths, sticky elements, momentum scroll on touch, RTL, dynamic content) already handled. Library is ~10KB gzipped. |
| Masonry layout (if going `lanes` route) | Hand-rolled shortest-lane assignment | `useVirtualizer({ lanes: cols })` [VERIFIED: Context7 `/tanstack/virtual` "Masonry Layout with Lanes"] | Native primitive. **But D-02 locks row-chunking instead** — see Open Questions OQ-1. |
| Accessibility scan | Hand-rolled aria attribute assertions | `@axe-core/playwright` `AxeBuilder` | Industry-standard 100+ rule engine; first-party Playwright integration; one-line scope-to-element via `.include()` |
| CPU throttle | Hand-rolled busy loops to slow JS | `CDPSession.send('Emulation.setCPUThrottlingRate', { rate })` [VERIFIED: Chrome DevTools Protocol] | Chrome's official throttling primitive; matches Chrome DevTools "Performance" tab CPU throttle |
| Performance measurement | `Date.now()` deltas | `performance.mark` / `performance.measure` [VERIFIED: W3C User Timing] | Built into the Performance Timeline; visible in DevTools; sub-millisecond precision; existing pattern at `src/legacy/utils/performance.js` |
| Identity-change detection | Deep equality on filteredTemplates | Reference equality via `useEffect` dep | `displayedTemplates` is already a fresh array on every filter change (line 394 `useMemo` returns a new array reference) — reference identity is the correct signal |

**Key insight:** Every gray area in this phase has a well-known headless primitive. Custom solutions for any of these are 100% loss — more code, more bugs, no win.

## Common Pitfalls

### Pitfall 1: `measureElement` cost dominates first-paint at scale

**What goes wrong:** With ~500 templates → ~125 rows at 4 cols, each row's `measureElement` runs `getBoundingClientRect()` post-mount. If `estimateSize` is wildly off (e.g., 100px when actual is 320px), the virtualizer over-renders rows during initial layout convergence, blowing the 1s SC-2 budget.

**Why it happens:** TanStack Virtual uses `estimateSize` to compute total scroll height and which rows are in viewport. A bad estimate means the virtualizer thinks 20 rows are in viewport, mounts all 20, measures, recalculates, and may need a second pass.

**How to avoid:** Compute `estimateSize` from current cols + container width. For 4-col layout at typical widths, a landscape card row is ~320px (image aspect-video ~16:9 → ~225px image + ~95px text/padding). Bias slightly HIGH (over-estimate ⇒ under-render initial mount ⇒ smoother).

**Warning signs:** SC-2 Playwright run >1s on a clean fixture; visible "card flicker" on initial mount as rows reposition.

### Pitfall 2: `scrollToOffset(0)` double-fires during fuse.js search typing

**What goes wrong:** Every keystroke in the search input updates `filters.q` → triggers `displayedTemplates` useMemo → returns a new array reference → useEffect with deps `[templates]` fires `scrollToOffset(0)`. If the user is typing fast (≤150ms debounce window per existing code), the call may fire 3-5 times in quick succession. Each call may race with the next.

**Why it happens:** The 150ms debounce only applies to the URL param write, not to the local fuse.js search re-run. fuse.js runs on every render where `filters.q.length >= 2`.

**How to avoid:** `scrollToOffset(0)` is idempotent at the same offset, so multiple calls don't visibly conflict. **But** the SC-3 spy assertion ("scrollToOffset is called on every filteredResults identity change") needs to tolerate multiple calls, not assert exactly-once. Plan the SC-3 test as `expect(spy).toHaveBeenCalled()` not `toHaveBeenCalledTimes(1)`. Alternative: gate the effect with a `useRef` last-templates-ref-equality check.

**Warning signs:** SC-3 test asserts exactly-once and fails; or spy logs spam.

### Pitfall 3: Body scroll removal regresses a v20.0 deep-link

**What goes wrong:** D-03 moves scroll from body to the internal `flex-1` container. Any v20.0 feature that scrolled the gallery from outside (e.g., a hash anchor `#section`, or `window.scrollTo` in a sibling component) silently no-ops because the body now has no scroll height.

**Why it happens:** Body-scroll → internal-scroll is a layout contract change. v20.0 features that assumed body scroll still issue body-scroll commands.

**How to avoid:** [VERIFIED: grep over `src/` for `scrollTo` and `scrollIntoView`] only 3 references exist:
- `src/components/Admin/BulkActionConfirmModal.jsx:55` — unrelated (feed modal)
- `src/pages/PlaylistEditorPage.jsx:573,588,590` — unrelated (playlist editor)

No gallery-related body-scroll references found. Risk is LOW but planner should grep once more in any v21.0 phase 178 changes to be safe.

**Warning signs:** Any URL-based deep link with a fragment (`#tour-step-2`) suddenly no-ops; tour/onboarding flows that assume body scroll fail.

### Pitfall 4: `aria-rowcount` reflects rendered rows, not virtual rows

**What goes wrong:** If `aria-rowcount` is computed from `virtualizer.getVirtualItems().length` (rendered rows, typically ~8-15), screen readers report a tiny grid. SC-5 axe-core scan may still pass (axe doesn't always validate count correctness), but the gallery is functionally inaccessible.

**Why it happens:** Easy mental slip — the virtual list "feels like" the rendered list.

**How to avoid:** `aria-rowcount = rows.length` (the full count, e.g., ~125). `aria-rowindex` on each rendered row is `virtualRow.index + 1` (1-indexed per WAI-ARIA spec).

**Warning signs:** Screen reader announces "Row 3 of 8" when scrolled to mid-catalog (should be "Row 50 of 125").

### Pitfall 5: count=0 during isLoading interacts with measureElement

**What goes wrong:** If a virtualizer instance is created with `count: 0`, then later `count: 125`, the `estimateSize` callback runs at the new count but `measureElement` hasn't yet been called for any row → the total-size estimate is uniformly the `estimateSize()` return for all rows → if that's significantly off, mass repositioning on first render.

**Why it happens:** The first render of the content branch has zero measurements; only after each row mounts does measureElement fire.

**How to avoid:** Pattern (c) from D-04 — don't mount `VirtualizedTemplateGrid` during loading at all. The virtualizer instance is created fresh when transitioning loading → content. This avoids the count-transition edge case entirely.

**Warning signs:** Visible card "jump" on first mount of content branch; flicker at top of grid.

### Pitfall 6: `lanes` re-layout breaks with measureElement when cols changes

**What goes wrong:** If the planner deviates from D-02 row-chunking and uses native `lanes: cols`, then ResizeObserver-driven `cols` changes → lane re-layout is broken in `measureElement` mode [VERIFIED: TanStack/virtual#1063].

**Why it happens:** Known bug in TanStack Virtual's lane re-assignment cache invalidation when measureElement is enabled.

**How to avoid:** Honor D-02 row-chunking. Don't switch to `lanes` mid-phase without explicit user override.

**Warning signs:** Cards "jump lanes" on viewport resize; missing cards at certain widths.

### Pitfall 7: CDP CPU throttle does not stack across page navigations

**What goes wrong:** `cdpSession.send('Emulation.setCPUThrottlingRate', { rate: 1 })` applies to the current page/context, but a `page.goto()` may reset it (or not — Chrome behavior varies).

**Why it happens:** CDP session is bound to the page; some commands persist across nav, some don't.

**How to avoid:** Set the throttle AFTER navigation, BEFORE the `performance.mark('gallery-paint-start')` is set. Or use `cdpSession.send` inside a `page.addInitScript` if a more durable hook is needed.

**Warning signs:** SC-2 perf assertion passes locally but fails in CI (or vice versa) due to different CDP semantics.

## Code Examples

### Example 1: Playwright CDP CPU Throttle + performance.mark (SC-2)

```javascript
// Source: pattern from https://playwright.dev/docs/api/class-cdpsession + W3C User Timing
// Adapted for the gallery <1s SC-2 assertion
import { test, expect } from '@playwright/test';

test('gallery first-paint <1s at 500-template catalog with 1× CPU (SC-2)', async ({ page, context }) => {
  // Open a CDP session BEFORE navigation
  const client = await context.newCDPSession(page);

  // Rate=1 means "1× = no throttle" — explicit no-op. Planner should set this to 4 or 6
  // for a true throttled measurement; rate=1 is documented for CI hardware that already
  // approximates "mid-range Chromium / M1" per CONTEXT.md SC-2 wording. Bench to confirm.
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  // Mark navigation start in the page context BEFORE goto
  await page.addInitScript(() => {
    window.__galleryStartMark = 'gallery-paint-start';
    performance.mark(window.__galleryStartMark);
  });

  await page.goto('/templates'); // or sidebar-click pattern per existing template-gallery.spec.js

  // Wait for the grid to be visible — Playwright auto-waits
  await page.locator('[role="grid"]').first().waitFor({ state: 'visible', timeout: 5000 });

  // Capture the elapsed in the page context
  const elapsed = await page.evaluate(() => {
    performance.mark('gallery-paint-end');
    performance.measure('gallery-paint', 'gallery-paint-start', 'gallery-paint-end');
    return performance.getEntriesByName('gallery-paint')[0]?.duration ?? Infinity;
  });

  console.log(`[SC-2] gallery first-paint: ${elapsed.toFixed(0)}ms (budget 1000ms)`);
  expect(elapsed).toBeLessThan(1000);
});
```

### Example 2: Axe-Core Scan Scoped to Virtualized Grid (SC-5)

```javascript
// Source: https://playwright.dev/docs/accessibility-testing
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('virtualized gallery is axe-core clean at full catalog (SC-5)', async ({ page }) => {
  await page.goto('/templates');
  await page.locator('[role="grid"]').first().waitFor({ state: 'visible' });

  const results = await new AxeBuilder({ page })
    .include('[role="grid"]')             // scope to the virtual grid container
    .analyze();

  // aria-rowcount sanity check at axe time (axe doesn't validate this directly,
  // so we assert it ourselves as a redundant check)
  const rowcount = await page.locator('[role="grid"]').getAttribute('aria-rowcount');
  expect(Number(rowcount)).toBeGreaterThan(50);  // ≥500 templates / 4 cols ≈ 125 rows

  expect(results.violations).toEqual([]);
});
```

**Why scope to `[role="grid"]`:** Without scoping, axe scans the entire page including unrelated React Router page transitions and sticky filter bar that might trip rules unrelated to the virtualization work. SC-5 is specifically about the virtualized container being clean.

### Example 3: Unit Test on Virtualizer Config (SC-1)

```javascript
// Source: standard vitest + @testing-library/react pattern from tests/unit/components/
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import VirtualizedTemplateGrid from '../../../src/components/template-gallery/VirtualizedTemplateGrid';

describe('VirtualizedTemplateGrid config (SC-1)', () => {
  it('overscan is ≥3 rows', () => {
    // Approach: spy on useVirtualizer's options at instantiation
    // (planner picks mechanism — could be a wrapper that exports options for testing)
  });

  it('count=0 when templates=[] (count guard during isLoading)', () => {
    // The parent gates VirtualizedTemplateGrid mounting on !isLoading, but a
    // belt-and-suspenders check: even if templates=[] is passed, the grid renders
    // role="grid" with aria-rowcount=0 and no rows.
    const { container } = render(
      <VirtualizedTemplateGrid templates={[]} cols={4} scrollElement={null} />
    );
    expect(container.querySelector('[role="grid"]')).toHaveAttribute('aria-rowcount', '0');
  });

  it('aria-rowcount equals ceil(templates.length / cols)', () => {
    const templates = Array.from({ length: 17 }, (_, i) => ({ id: `t${i}`, name: 'T', orientation: 'landscape' }));
    const { container } = render(
      <VirtualizedTemplateGrid templates={templates} cols={4} scrollElement={document.body} />
    );
    expect(container.querySelector('[role="grid"]')).toHaveAttribute('aria-rowcount', '5');
    // 17 templates / 4 cols = 4.25 → ceil = 5
  });
});
```

### Example 4: `scrollToOffset(0)` on filteredTemplates Identity Change (SC-3)

```javascript
// Source: pattern derived from TanStack Virtual API + React effect deps
import { useEffect } from 'react';

useEffect(() => {
  // Reset to top whenever the templates array reference changes.
  // This is keyed on reference identity — displayedTemplates is a fresh array
  // on every filter/search/sort change (line 394 useMemo).
  virtualizer.scrollToOffset(0);
}, [templates, virtualizer]);
```

**SC-3 spy test pattern:**

```javascript
// Source: vitest spy + RTL pattern
import { vi } from 'vitest';

it('scrollToOffset(0) is called when templates identity changes (SC-3)', () => {
  const scrollSpy = vi.fn();
  // Mock useVirtualizer to return an object with scrollToOffset = scrollSpy
  // (planner picks mock strategy)
  // ... render, change templates prop, assert spy called with 0
  expect(scrollSpy).toHaveBeenCalledWith(0);
});
```

### Example 5: `?category=Restaurant` Deep-Link (SC-4)

```javascript
// Source: existing pattern from tests/e2e/template-gallery.spec.js line 92-100
import { test, expect } from '@playwright/test';

test('deep link ?category=Restaurant preserves URL contract (SC-4)', async ({ page }) => {
  await page.goto('/templates?category=Restaurant');

  // Skeleton appears before results
  // (planner picks selector — e.g., a [data-testid="skeleton-row"] in the skeleton branch)
  // ...

  // After load: category chip is active
  await expect(page.getByRole('button', { name: /Category: Restaurant/i })).toBeVisible();

  // Filtered count matches — uses existing PageHeader description "${N} templates available"
  // (planner picks count assertion shape; existing template-gallery.spec.js is structural-only per TQAL-05)
});
```

## Runtime State Inventory

Phase 179 is a render-strategy refactor in a single file (`TemplateGalleryPage.jsx`) plus one new sibling component. No data layer or live service touches.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — virtualization is a presentation-layer change. Templates remain in `gallery_templates` VIEW; favorites remain in `template_favorites` table. | None |
| Live service config | None — no Supabase Edge Function, no AWS S3 config, no third-party service touches. | None |
| OS-registered state | None — no scheduled tasks, no pm2 processes, no launchd plists registered for the gallery page. | None |
| Secrets/env vars | None — `VITE_E2E_TEST_MODE` already used by playwright.config.js for existing test mode; no new env vars needed. | None |
| Build artifacts | New `@tanstack/react-virtual` chunk in Vite build output. Existing `rollup-plugin-visualizer` will show the new bundle weight. | Optional: planner may add a `build:size` assertion (CONTEXT.md Claude's Discretion) gating the gallery chunk total. Not load-bearing. |

**Verified by:** `grep -rn "scrollTo\|scrollIntoView" src/` (only 3 references, all unrelated); no DB schema touches in scope; no Edge Function changes in scope; no S3/CDN changes in scope.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All test infrastructure | ✓ (assumed; v20+ for `structuredClone`, project standard) | per `package.json` engines (not pinned) | — |
| npm | Package install | ✓ | per `package.json` | — |
| `@tanstack/react-virtual` 3.13.24 | TVRZ-01 | ✗ (not yet installed; per `package.json` line 35-57 search) | — | `npm install @tanstack/react-virtual` |
| `@axe-core/playwright` 4.11.3 | SC-5 axe scan | ✗ (not yet installed; per `package.json` line 60-86 search) | — | `npm install --save-dev @axe-core/playwright` |
| Playwright + Chromium | SC-2/3/4/5 | ✓ | `@playwright/test ^1.57.0` per package.json | — |
| Vitest | SC-1 unit tests | ✓ | `vitest ^4.0.14` per package.json | — |
| Local Supabase (`npm run db:start`) | SC-2 fixture (485 live templates per Phase 178 closure) | ✓ (assumed; Phase 178 closure verified gallery_templates row count via `verify-178-counts.cjs`) | — | Route-intercept `fetchGalleryTemplates` and inject 500 deterministic fixture rows |
| Chrome DevTools Protocol (CDP) | SC-2 CPU throttle | ✓ (built into Playwright Chromium projects via `context.newCDPSession()`) | — | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** Both `@tanstack/react-virtual` and `@axe-core/playwright` are missing but trivially installable. Planner's first task should be `npm install` both.

## Validation Architecture

> nyquist_validation: enabled (no explicit `false` in `.planning/config.json`)

### Test Framework

| Property | Value |
|----------|-------|
| Unit framework | Vitest ^4.0.14 + @testing-library/react ^16.3.0 + jsdom ^27.3.0 [VERIFIED: package.json] |
| E2E framework | @playwright/test ^1.57.0 (Chromium only per playwright.config.js line 51-54) |
| Accessibility scanner | @axe-core/playwright ^4.11.3 (NEW — install required) |
| Unit config file | implicit `vitest run --dir tests/unit` per package.json `test:unit` script |
| E2E config file | `playwright.config.js` (project root) |
| Quick unit run | `npm run test:unit` |
| Quick E2E run | `npm run test:e2e -- tests/e2e/template-gallery.spec.js` |
| Full suite | `npm run test:all` (vitest + playwright) |

### Phase Requirements → Test Map

| Req ID | SC | Behavior | Test Type | Automated Command | File Exists? |
|--------|----|----------|-----------|-------------------|--------------|
| TVRZ-01 | SC-1 | `@tanstack/react-virtual` activated; scroll container has explicit CSS height; `overscan ≥3`; `count = 0` guarded while `isLoading` | unit | `npm run test:unit -- VirtualizedTemplateGrid` | ❌ Wave 0 (new component → new test file) |
| TVRZ-02 | SC-2 | Initial render <1s with 1× CPU throttle at ~500-template catalog | E2E (Playwright + CDP) | `npm run test:e2e -- template-gallery-perf.spec.js` | ❌ Wave 0 (new spec) |
| TVRZ-03 | SC-3 | (a) viewport shows first result after search; (b) search input retains focus; (c) no blank viewport; `scrollToOffset(0)` called on every filteredResults identity change | E2E + unit spy | `npm run test:e2e -- template-gallery.spec.js` + `npm run test:unit -- scroll-reset` | ⚠ Spec partial (template-gallery.spec.js exists; needs scroll-reset case added) |
| TVRZ-04 | SC-4 | `?category=Restaurant` URL → skeleton → category chip active → filtered count; no flash of "0 results" | E2E | `npm run test:e2e -- template-gallery.spec.js` (TDSC-04 case already exists at line 92; extend with skeleton-flash assertion) | ⚠ Partial (TDSC-04 case exists; needs skeleton-flash gate) |
| TVRZ-05 | SC-5 | Skeleton/empty/error inside virtualized container; axe-core zero violations; `aria-rowcount` present; v20.0 gallery E2E ≥90% green | E2E (axe) + E2E (regression) | `npm run test:e2e -- template-gallery-axe.spec.js` + `npm run test:e2e -- tests/e2e/template-gallery*.spec.js` | ❌ Wave 0 (axe spec new) / ✓ Existing (template-gallery*.spec.js, template-gallery-100.spec.js) |

### Sampling Rate

- **Per task commit:** `npm run test:unit -- VirtualizedTemplateGrid` (≤2s)
- **Per wave merge:** `npm run test:unit` + `npm run test:e2e -- template-gallery*.spec.js` (≤90s for unit; ≤5min for E2E suite)
- **Phase gate:** Full suite green (`npm run test:all`) before `/gsd-verify-work`. Phase 178 baseline ≥90% green per SC-5 contract.

### Wave 0 Gaps

- [ ] `tests/unit/components/VirtualizedTemplateGrid.test.jsx` — SC-1 unit assertions (overscan ≥3, count=0 guard, aria-rowcount math)
- [ ] `tests/unit/hooks/useContainerColumns.test.js` — ResizeObserver-driven cols (D-01) test with mocked RO
- [ ] `tests/e2e/template-gallery-perf.spec.js` — SC-2 (<1s first-paint with CDP throttle)
- [ ] `tests/e2e/template-gallery-axe.spec.js` — SC-5 axe-core scan
- [ ] Extend `tests/e2e/template-gallery.spec.js` — SC-3 (scroll reset + focus retention + no blank viewport) + SC-4 (`?category=Restaurant` skeleton-flash gate)
- [ ] Install: `npm install @tanstack/react-virtual && npm install --save-dev @axe-core/playwright`

## Security Domain

> `security_enforcement` is not explicitly `false` in `.planning/config.json` → enabled by default.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 179 is presentation-layer only; no auth boundary touched |
| V3 Session Management | no | No session changes |
| V4 Access Control | no | Gallery is user-facing; existing RLS on `gallery_templates` VIEW unchanged |
| V5 Input Validation | yes (light) | `useSearchParams` reads `?category=`, `?q=`, etc. — these flow into existing fuse.js + filter logic, NOT into DOM or HTML. No XSS surface change. |
| V6 Cryptography | no | No crypto changes |
| V11 Configuration | yes (light) | No new secrets; new devDependency (`@axe-core/playwright`) and runtime dependency (`@tanstack/react-virtual`) reviewed for known CVEs — both libraries are widely used, MIT-licensed, actively maintained |

### Known Threat Patterns for `@tanstack/react-virtual` + Playwright/axe stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Supply chain — malicious npm package | Tampering | Pin to `^3.13.24` (carat allows patches only within 3.x.x); review `package-lock.json` diff before merge. TanStack Virtual is owned by `tannerlinsley` / TanStack org with high reputation. |
| `aria-rowcount` confusion attack — screen-reader DoS via inconsistent row count | Denial of Service (accessibility) | Unit test asserts `aria-rowcount === ceil(filteredTemplates.length / cols)`. Pitfall 4 documents the failure mode. |
| Search-input XSS via fuse.js | Tampering | fuse.js does NOT render user input as HTML — only used as a search query. Existing v20.0 protection unchanged. |
| `dangerouslySetInnerHTML` regression in new component | Tampering | `VirtualizedTemplateGrid` MUST NOT use `dangerouslySetInnerHTML`. Code review gate; planner should add a lint/grep gate. |

**Net security posture:** Phase 179 has minimal security surface. The largest concern is supply-chain integrity of two new dependencies, both well-established and verified via npm registry timestamps (2026-04-17 and 2026-04-30 — recent, actively maintained).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-virtual` v2 | `@tanstack/react-virtual` v3 [VERIFIED: TanStack org rename 2022] | v3.0 release | Headless, no styles injected; package name + import path changed |
| `react-window` (Brian Vaughn) | `@tanstack/react-virtual` v3 | Maintenance mode on react-window | TanStack is actively developed; supports masonry via `lanes`; SSR-friendly |
| Manual chunk-by-row math for grid virtualization | `useVirtualizer({ lanes: N })` native masonry | TanStack Virtual 3.x | Native masonry primitive available — but **D-02 row-chunking is the locked decision** for this phase; see Open Questions |
| `useLayoutEffect` for ResizeObserver setup | `useEffect` (RO is async by spec; no layout-thrash benefit from useLayoutEffect) | React 18+ best practice | Use `useEffect` for RO — matches `src/ScaledStage.jsx` pattern |
| `window.matchMedia` for breakpoint detection | `ResizeObserver` on the actual container | Multi-column layout best practice | RO survives parent layout constraints (sidebars, modals); matchMedia drifts |

**Deprecated/outdated:**
- `react-virtual` (without `@tanstack/` prefix) — renamed to `@tanstack/react-virtual` in 2022; package no longer maintained
- `react-window` — in maintenance mode; not actively developed
- Hand-rolled scroll virtualization — solved problem; never appropriate

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A typical landscape TemplateCard renders at ~320px row height (image ~225px aspect-video + ~95px text/padding) at 4-col layout on ~1200px wide container | Pattern 1 `estimateSize` | If actual is significantly different, first-paint may exceed SC-2 budget. **Mitigation:** planner measures live during Wave 1 and adjusts. Not load-bearing because `measureElement` self-corrects after first render. |
| A2 | Local Supabase has ≥485 active templates per Phase 178 closure note | Environment Availability + SC-2 fixture | If local DB is unseeded, SC-2 perf test runs against insufficient data and may falsely pass. **Mitigation:** SC-2 spec should assert `aria-rowcount * cols >= 400` as a pre-flight gate. |
| A3 | Body-scroll → internal-scroll regression risk is LOW based on the `scrollTo`/`scrollIntoView` grep (3 hits, all unrelated) | Pitfall 3 | If a less-obvious mechanism (e.g., `document.body.scrollTo` via a third-party tour library like driver.js) regresses, gallery-tour.spec.js may flake. **Mitigation:** run gallery-tour.spec.js explicitly as part of SC-5's "v20.0 E2E suite ≥90% green" sub-gate. |
| A4 | Playwright `Emulation.setCPUThrottlingRate { rate: 1 }` is effectively a no-op on CI Chromium (rate=1 means no throttle, per Chrome DevTools spec) | Pitfall 7 + Example 1 | If CI hardware is slower than "mid-range Chromium / M1" baseline, rate=1 may still measure >1s. **Mitigation:** SC-2 wording in CONTEXT.md says "mid-range Chromium hardware (~M1, 1× CPU throttling)" — interpret rate=1 strictly; if hardware varies in CI, the planner may need to bench locally and adopt a tighter budget for fast CI hardware. |
| A5 | `@axe-core/playwright` 4.11.3 produces zero violations on a correctly-implemented role="grid" + aria-rowcount pattern at this catalog scale | Code Examples Example 2 + SC-5 | If axe surfaces unexpected violations from sibling components (FilterBar, StarterPacksStrip) scoped into the grid, the gate fails. **Mitigation:** `.include('[role="grid"]')` scopes the scan to the virtual grid container only, excluding siblings. Documented in Example 2. |

## Open Questions (RESOLVED)

> All three OQs resolved during /gsd-plan-phase 179 (2026-05-10). Each carries a `RESOLVED:` marker linking the binding decision to the plan/file that codifies it. Closing this audit trail eliminates implicit-resolution gaps flagged by gsd-plan-checker.

1. **OQ-1: Row-chunking (D-02) vs. native `lanes` masonry.**

   **RESOLVED:** D-02 row-chunking honored. `align-items: start` codified as load-bearing CSS in `179-04-PLAN.md` (must_haves.truths + JSDoc + acceptance grep). Native `lanes` rejected pending [TanStack/virtual#1063](https://github.com/TanStack/virtual/issues/1063) fix.
 TanStack Virtual ships a `lanes` option [VERIFIED: Context7 `/tanstack/virtual` "Masonry Layout with Lanes"] that handles shortest-lane assignment natively, avoiding the row-chunk math. However, [VERIFIED: TanStack/virtual#1063] documents that lane re-layout breaks with `measureElement` when `lanes` changes — which would happen on ResizeObserver-driven cols change.

   D-02 explicitly locks row-chunking with `measureElement`. The row-chunking approach avoids the lane re-layout bug entirely (cols changes → `count = ceil(N/cols)` recomputes, no `lanes` value changes), so this is the safer choice with the current bug landscape.

   - What we know: row-chunking + `measureElement` works (the canonical mixed-height grid pattern in TanStack docs); native `lanes` is cleaner conceptually but bug-prone with cols change.
   - What's unclear: whether row-chunking with `measureElement` produces a true masonry visual when items within a row have different heights — yes, if `align-items: start` is set on the row container, the shorter card sits at the top of its column.
   - Recommendation: honor D-02. Document the `align-items: start` requirement as load-bearing CSS in the plan. If planner wants to override D-02 toward `lanes`, escalate to user — this is a locked decision.

2. **OQ-2: True CPU throttle rate for SC-2.**

   **RESOLVED:** `rate=1` (literal interpretation). Documented in the SC-2 spec file's header comment (Plan 03 scaffold + Plan 06 preservation gate). If CI hardware variance produces flake, escalate to user with bench data.
 CONTEXT.md SC-2 says "1× CPU throttling" — `Emulation.setCPUThrottlingRate { rate: 1 }` is documented as 1× = no throttle. The phase prompt explicitly says "1× CPU throttle via CDP." The literal interpretation is rate=1 (no throttle), which gives a baseline measurement on whatever CI hardware is available.

   - What we know: CDP `rate` is a multiplier (rate=4 means 4× slower); rate=1 is "no throttle."
   - What's unclear: whether SC-2's author intended rate=1 (no throttle, but using CDP to document intent) or rate=4 (typical "mid-range" emulation).
   - Recommendation: implement with rate=1 first (literal interpretation; matches CONTEXT.md SC-2 wording exactly). If the test is too lenient or too brittle on CI, planner may revisit with the user. Document the chosen rate in the test file's header comment for traceability.

3. **OQ-3: Skeleton pattern (a) vs. (c) under D-04.**

   **RESOLVED:** Pattern (c) — render branches swap inner content of the scroll container. Codified in `179-05-PLAN.md` (5 branches: skeleton / empty-no-favorites / empty-no-results / error / content). Fallback to (a) only if loaded → re-loading transition produces a visible flash in practice.
 CONTEXT.md offers two patterns: (a) overlay skeleton block above a `count=0` virtualizer, or (c) swap inner content of the scroll container by render branch. Suggested: (c).

   - What we know: (c) is cleaner architecturally; (a) is lowest-risk for transition flashes.
   - What's unclear: whether the loaded → re-loading transition (e.g., after a manual refresh) causes a flash with (c) — TemplateGalleryPage's `refetch()` sets `isFetching=true` synchronously, which would unmount `VirtualizedTemplateGrid` and re-mount on completion. This re-mount discards measurement cache.
   - Recommendation: start with (c). If re-loading causes a visible flash, fall back to (a). Tests should not be sensitive to this — assert structural visibility (skeleton appears, content appears) not intra-frame transition behavior.

## Sources

### Primary (HIGH confidence)
- Context7 `/tanstack/virtual` — `useVirtualizer`, `measureElement`, `lanes`, `scrollToOffset`, `scrollToIndex`, `overscan`, `getVirtualItems`, `getTotalSize`, `scrollMargin` (fetched via `npx ctx7@latest docs /tanstack/virtual` 2026-05-10)
- Context7 `/tanstack/virtual` — "Dynamic Item Sizing with measureElement in useVirtualizer" (code example)
- Context7 `/tanstack/virtual` — "Masonry Layout with Lanes using useVirtualizer" (code example)
- [Playwright accessibility-testing docs](https://playwright.dev/docs/accessibility-testing) — `AxeBuilder({ page }).include().analyze()` pattern, `expect(results.violations).toEqual([])` assertion shape
- [Playwright CDPSession API](https://playwright.dev/docs/api/class-cdpsession) — `context.newCDPSession(page)` + `client.send('Emulation.setCPUThrottlingRate', { rate })`
- [`@tanstack/react-virtual` npm registry](https://www.npmjs.com/package/@tanstack/react-virtual) — version 3.13.24 verified via `npm view`
- [`@axe-core/playwright` npm registry](https://www.npmjs.com/package/@axe-core/playwright) — version 4.11.3 verified via `npm view`
- `src/pages/TemplateGalleryPage.jsx` (801 LOC) — read line-by-line; integration site
- `src/design-system/components/TemplateCard.jsx` — read line-by-line; confirmed `orientation` prop already shipped with `aspect-video` / `aspect-[9/16]` / `aspect-square` mapping
- `src/ScaledStage.jsx` — existing ResizeObserver pattern in the codebase (lines 22-32)
- `.planning/phases/179-gallery-virtualization-launch-validation/179-CONTEXT.md` — locked decisions D-01..D-05
- `.planning/REQUIREMENTS.md` — TVRZ-01..05 requirement IDs
- `.planning/ROADMAP.md` Phase 179 — Goal + 5 Success Criteria (SC-1..SC-5)
- `.planning/research/STACK.md` Capability Area 3 — `@tanstack/react-virtual` locked
- `.planning/research/OPTISIGNS-WALKTHROUGH.md` lines 117, 121, 172 — masonry parity directives

### Secondary (MEDIUM confidence)
- [TanStack/virtual#1063 — Measurements don't get re-calculated when lanes are changed (with measureElement)](https://github.com/TanStack/virtual/issues/1063) — bug verifying D-02 row-chunking is the safer choice over native `lanes`
- [BrowserStack — Performance Testing using Playwright](https://www.browserstack.com/guide/playwright-performance-testing) — CDP performance pattern
- [Checkly — Measuring Page Performance Using Playwright](https://www.checklyhq.com/docs/learn/playwright/performance/) — performance.mark + Playwright pattern
- [DEV Community — How We Automate Accessibility Testing with Playwright and Axe](https://dev.to/subito/how-we-automate-accessibility-testing-with-playwright-and-axe-3ok5) — axe-core integration patterns

### Tertiary (LOW confidence)
- None — all critical claims verified against Context7 or official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified live via `npm view`; APIs verified via Context7
- Architecture: HIGH — patterns derived from Context7 + existing codebase patterns (ScaledStage.jsx) + CONTEXT.md locked decisions
- Pitfalls: HIGH — bug #1063 verified via GitHub; axe-core scope behavior verified via official docs; ResizeObserver semantics verified against MDN/spec
- Validation Architecture: HIGH — Playwright + Vitest stack and test file patterns verified against existing tests in `tests/e2e/` and `tests/unit/`
- Open Questions: explicitly flagged as decisions for planner to either honor D-02 (recommended) or escalate

**Research date:** 2026-05-10
**Valid until:** 2026-06-10 (TanStack Virtual is in stable 3.x; React 19 ecosystem is settled; Playwright/axe-core moving slowly)

---

*Phase: 179-gallery-virtualization-launch-validation*
*Research conducted: 2026-05-10*
*Author: gsd-researcher (Claude Opus 4.7 / 1M context)*
