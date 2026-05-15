# Phase 179: Gallery Virtualization + Launch Validation - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace `TemplateGalleryPage`'s full-DOM render with `@tanstack/react-virtual` and prove <1s first-paint at the live ~485-template catalog (Phase 178 closure: 128 existing + 357 net-new gallery templates), without regressing any v20.0 URL-synced filter / sort / search behavior — clearing the final launch criterion for v21.0.

**In scope:**

- `@tanstack/react-virtual` integration into `src/pages/TemplateGalleryPage.jsx` (row-chunked, masonry-aware per OptiSigns parity — see D-02)
- Scroll container restructure: page becomes a flex column with a sticky FilterBar at top and a `flex-1` internal scroll container owning the virtualizer (D-03)
- ResizeObserver-driven column derivation (D-01) so the virtualizer's row chunking tracks the rendered Tailwind responsive grid (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`)
- `useVirtualizer({ measureElement })` for variable-height row support — enables OptiSigns-style mixed-orientation visual parity now that Phase 178 has shipped portrait + landscape hero variants (D-02)
- `TemplateCard` design-system update so SVGs render at native aspect inside the card thumbnail (replaces or supplements the current strict `aspect-video` constraint) — minimal change scoped to enabling masonry parity, not a card redesign
- Skeleton, empty, and error states rendered INSIDE the virtualized scroll container (SC-5)
- `scrollToOffset(0)` on every `filteredResults` identity change (SC-3), including search-input typing transitions (locked by SC-3's own Playwright scenario)
- `count = 0` while `isLoading` is true (SC-1) — guards against virtualizer rendering against stale/empty data
- `overscan` ≥ 3 rows (SC-1 minimum; planner picks final value — see Claude's Discretion)
- `aria-rowcount` on the virtual grid container (SC-5) and an axe-core scan of the virtualized gallery at full catalog producing zero violations (SC-5)
- Playwright tests at ~500-template scale: <1s render assertion with 1× CPU throttle (SC-2), mid-catalog scroll + search → assert scroll reset, search focus retained, no blank viewport (SC-3), `?category=Restaurant` URL → skeleton → category chip active → filtered count (SC-4), v20.0 gallery E2E suite ≥90% green (SC-5)

**Out of scope (deferred / future phase / v21.x / v22.0):**

- Admin queue page (`AdminTemplateQueuePage`) virtualization retrofit — Phase 178 CONTEXT explicitly tagged this as a v21.x watch item ("track as v21.x watch item, NOT a Phase 178/179 task"); same `@tanstack/react-virtual` dep can be retrofitted later if review-session lag is observed
- Branded category hero banners (OptiSigns visual parity item; pure design work, v22.0 candidate)
- Horizontal carousels per category on a landing/home view (already partially shipped via `StarterPacksStrip`; expansion is v22.0)
- TCAT-F2 vertical filter chip surfacing (Phase 178 produced the tagged data; surface is v22.0)
- TCAT-F5 orthogonal filter taxonomy (Category × Vertical × Template Type × Visual Style × Color Mood) — v22.0
- Search re-engineering (fuse.js stays; SC-3 only requires focus + scroll reset behavior — no algorithmic change)
- TemplateCard visual redesign beyond the minimal aspect-native rendering needed for masonry
- Performance work outside the gallery page (Player, admin, marketing pages keep current rendering)
- Service worker / route-level code splitting for the gallery bundle — separate concern, not blocking SC-2 if measurement passes against current bundle
- Image preloading / IntersectionObserver-based lazy loading of card thumbnails — current `<img loading="lazy">` is the v20.0 baseline; revisit only if SC-2 fails

</domain>

<decisions>
## Implementation Decisions

### Virtualizer × responsive grid

- **D-01:** **Column count derived via ResizeObserver on the internal scroll container** (Claude's discretion after user delegated). The virtualizer's `count = Math.ceil(filteredTemplates.length / cols)` math needs `cols` to match the actually-rendered grid. ResizeObserver tracks the real container width (e.g. <640 → 1, <768 → 2, <1024 → 3, else 4) so the mapping survives parent constraints (Player/admin shells, sidebars). Rejected: matchMedia (drifts if a parent layout constrains the gallery); locked-to-4-cols (regresses mobile to <200px-wide cards); one-virtual-row-per-item (contradicts SC-1 "row-chunked" wording + ~4× the row-overhead at 500 templates).

- **D-02:** **Masonry + `useVirtualizer({ measureElement })`** for variable-height rows. User directive: "OptiSigns is the standard you follow." `OPTISIGNS-WALKTHROUGH.md:117` describes their category view as "Masonry grid of templates (variable card heights — portraits are taller, landscapes are wider, mixed in same view)"; line 121 names `useVirtualizer({ measureElement })` as the right TanStack Virtual entry point for this. Phase 178 just shipped portrait + landscape hero variants (D-10) → mixed-orientation cards exist in the catalog today and the strict `aspect-video` card forces letterboxing. Going masonry now is the OptiSigns-parity choice; user explicitly overrode the walkthrough's own line-172 "Defer to v21.x" scope-call. **Risk surfaced & accepted:** `measureElement` adds layout-on-render cost; SC-2's <1s budget becomes the load-bearing perf gate. Planner MUST measure first-paint with the test fixture and tune `estimateSize` defaults so layout converges within the budget. Rejected: fixed `estimateSize` per breakpoint (cheaper but breaks OptiSigns parity); hybrid "fixed grid + object-fit:contain card" (captures the no-crop win without masonry, but explicitly rejected by user's "based on OptiSigns" directive).

- **D-03:** **Internal `flex-1` scroll container with sticky FilterBar above.** Page becomes a flex column: sticky FilterBar at top (the current `q` / `category` / `orientation` / `favorites` cluster), `flex-1` scroll container below owning the virtualizer (`overflow-y: auto`, `height` derived implicitly from `flex-1` not from `vh` math). Matches OptiSigns' category-view shape (persistent breadcrumb + hero, grid scrolls independently below). Best for SC-3 focus retention (Tab order stays predictable; the search input is outside the scroll-resetting container) and scopes `scrollToOffset(0)` to the grid not the page. **Visible behavior change vs v20.0:** the page no longer has body-level scroll — only the grid scrolls. Acceptable per SC-4 (URL-sync behavior preserved; the SC tests focus on grid visibility, not scroll position). Rejected: windowVirtualizer (slightly more expensive at ~500 items + `window.scrollTo` would scroll past a sticky filter bar); fixed-height region like `75vh` (wastes space on tall monitors, inconsistent with app conventions).

### Loading / empty / error inside the virtualized container (SC-5)

- **D-04:** Implementation pattern at planner discretion within these constraints (see Claude's Discretion). SC-5 requires skeleton, empty, and error states to render inside the virtualized scroll container; today they render inside the un-virtualized `TemplateCardGrid columns={4}` as full render branches. Whichever pattern the planner picks must preserve `count = 0` while `isLoading` is true (SC-1) and must not break SC-5's axe-core zero-violations gate.

### Scope discipline

- **D-05:** **Admin queue page retrofit stays out of scope.** Phase 178 CONTEXT explicitly tagged queue-page virtualization as "v21.x watch item, NOT a Phase 178/179 task." Phase 179 ships the dep + the pattern; same dep can be retrofitted later. This question was raised during gray-area selection and held by the user choosing not to discuss it.

### Claude's Discretion

The planner has flexibility on these details — research and code inspection should pick the right answer:

- **Skeleton-inside-virtualizer pattern (D-04):** three viable shapes — (a) overlay skeleton block above a `count=0` virtualizer, (b) render N skeleton rows AS virtual rows during loading, (c) swap inner content of the scroll container by render branch (skeleton block / empty block / error block / virtualizer). Planner picks; suggest (c) for clarity (each branch is its own component, no virtualizer state pollution during non-content states) but (a) is the lowest-risk if (c) creates flash-of-empty-virtualizer issues during loaded → re-loading transitions.
- **`overscan` value (SC-1 ≥3 minimum):** suggest `5` rows. At 4-col grid that's 20 extra cards either side — smooth scroll with manageable DOM. Bench at lower values if SC-2 needs headroom.
- **Per-card aspect detection for masonry (D-02):** templates have `width` + `height` on the `svg_templates` row (Phase 178 D-10 added orientation; existing rows have 1920×1080 landscape by default). TemplateCard reads `width/height` to choose `aspect-video` (landscape) vs `aspect-[9/16]` (portrait) vs `aspect-square` (rare/legacy). Fallback: parse `viewBox` from the SVG. Planner picks the cleanest mechanism — column-driven is the obvious answer because Phase 176 backfilled and Phase 178 wrote orientation explicitly.
- **`estimateSize` initial values (paired with D-02 measureElement):** suggest computing from current cols + container width: `Math.round(containerWidth/cols × 9/16) + 84` for landscape baseline. measureElement adjusts after first render. Lower the initial estimate slightly to bias toward over-counting rendered rows (smoother initial paint than under-estimating and getting a hop).
- **Test fixture source for SC-2 (Playwright at ~500 templates with 1× CPU throttle):** live local Supabase has 485 active templates (Phase 178 closure); use that as the canonical fixture and pin the Playwright test to `npm run db:start` (local Supabase) so the assertion is reproducible. Alternative if env-fragile: route-intercept `fetchGalleryTemplates` and inject 500 deterministic fixture rows. Planner picks based on CI shape; live-DB is simpler and matches `tests/e2e/admin-template-queue.spec.js` Phase 177 Plan 06 precedent.
- **Bundle-cost check for `@tanstack/react-virtual`:** package is ~10KB gzipped. Add a one-line build-size assertion against the gallery chunk if the planner wants a guard, but not load-bearing.
- **Migration path for the page itself:** the current `TemplateGalleryPage.jsx` is 801 LOC of single-file assembly. Planner decides whether to refactor inline (single file grows) or extract the virtualized grid into a sibling component (e.g. `src/components/template-gallery/VirtualizedTemplateGrid.jsx`); suggest extraction so the page file stays at <1000 LOC and so tests can target the virtualized grid in isolation.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements

- `.planning/ROADMAP.md` §"Phase 179: Gallery Virtualization + Launch Validation" — phase goal, dependencies on Phase 178 (catalog must be at ~500 templates), 5 success criteria covering TVRZ-01..05
- `.planning/REQUIREMENTS.md` §"Gallery Virtualization (TVRZ)" — TVRZ-01..05 requirement IDs and traceability table
- `.planning/PROJECT.md` §"Current Milestone: v21.0 Templates at Scale" — milestone goal, OptiSigns benchmark framing
- `.planning/STATE.md` §"v21.0 Phase Map" — Phase 179 risk note ("Explicit scroll container height required; scroll reset on filter change; overscan ≥3 rows")

### OptiSigns walkthrough (drives layout + parity decisions)

- `.planning/research/OPTISIGNS-WALKTHROUGH.md` §"Layout patterns" — home view (hero + horizontal carousels + flat grid) and category view (branded hero + masonry grid); explicit note at line 117 "variable card heights — portraits are taller, landscapes are wider, mixed in same view"
- `.planning/research/OPTISIGNS-WALKTHROUGH.md` §"Implication for BizScreen" (line 121) — `useVirtualizer({ measureElement })` named as the TanStack Virtual entry point for masonry
- `.planning/research/OPTISIGNS-WALKTHROUGH.md` §"Concrete UX patterns to mirror or diverge from" (line 172) — Mirror/Diverge table flags masonry as "Defer to v21.x, polish not blocking"; **explicitly overridden by user directive D-02** ("OptiSigns is the standard you follow")
- `.planning/research/OPTISIGNS-WALKTHROUGH.md` §"Filter Taxonomy" — 8-axis taxonomy; Phase 179 preserves the 3-axis v20.0 subset (TVRZ-04)

### Phase 178 outputs (the catalog Phase 179 virtualizes)

- `.planning/phases/178-vertical-content-seeding/178-CONTEXT.md` — D-10 (orientation parameter; portrait 1080×1920 + landscape 1920×1080); deferred-ideas line "Queue-page virtualization tracked as v21.x watch item, NOT Phase 178 task" — this carries forward to D-05 above
- `.planning/phases/178-vertical-content-seeding/178-VERIFICATION.md` — gallery total at 485 / TCAT-01 floor 427 cleared; 9/9 SC checks GREEN; 357 net-new active templates across 3 verticals — this is the catalog Phase 179 tests against
- `supabase/migrations/178_*.sql` — existing-127 vertical backfill; gallery_templates VIEW still exposes `vertical` for any future TCAT-F2 chip (out of scope this phase but informs the data shape)

### Architecture and stack research

- `.planning/research/ARCHITECTURE.md` §"Frontend Layer" — page-component conventions, design-system primitives
- `.planning/research/STACK.md` — `@tanstack/react-virtual` is the locked dep (TVRZ-01)
- `.planning/research/PITFALLS.md` — Pitfall list (validator at ingest, retry storms, etc.) is largely AI-pipeline focused; Phase 179 has no Anthropic loop. The general "no Promise.all over the catalog" discipline still applies in any data-loading code touched.

### Code touched by Phase 179 (extension points)

- `src/pages/TemplateGalleryPage.jsx` (801 LOC) — primary target. Render branches at "Pattern I — loading / error / zero-content / no-results / content" (line 619); loading branch uses `<TemplateCardGrid columns={4}><TemplateCardSkeleton/></TemplateCardGrid>` (line 632); content branch uses `<TemplateCardGrid columns={4}><TemplateCard/></TemplateCardGrid>` (line 749). All five branches need to live inside the new virtualized scroll container per SC-5.
- `src/design-system/components/TemplateCard.jsx` — `TemplateCard`, `TemplateCardGrid`, `TemplateCardSkeleton` definitions. `TemplateCardGrid` columns prop = 2 | 3 | 4 with Tailwind responsive classes (line 167). D-02 masonry requires either replacing `TemplateCardGrid` with a virtualizer-managed grid or teaching it to render arbitrary children at variable heights — planner picks; suggest a sibling `VirtualizedTemplateGrid` component that doesn't go through `TemplateCardGrid` (the Tailwind grid classes are incompatible with a virtualized `transform`-based layout).
- `src/design-system/index.js` — re-exports `TemplateCard`, `TemplateCardGrid`, `TemplateCardSkeleton`; add `VirtualizedTemplateGrid` if extracted
- `package.json` — add `@tanstack/react-virtual` to dependencies (peer of `react` already satisfied)
- `tests/e2e/template-gallery.spec.js` (or whichever spec covers TGAL-01..05 today) — extend with SC-2 (<1s render), SC-3 (scroll reset + focus retention), SC-4 (`?category=Restaurant` URL), SC-5 (axe-core scan); v20.0 gallery suite must still ≥90% green
- `tests/unit/components/*` — unit assertions on virtualizer config (overscan ≥ 3, count guard on isLoading) per SC-1; spy on `scrollToOffset` for SC-3

### v20.0 baseline that must not regress

- `tests/e2e/` — existing gallery E2E suite (TGAL-01..05 / TDSC-01..05); SC-5 requires ≥90% green post-virtualization
- URL-sync behavior (Phase 168/172/174 era) — `searchParams.get('q')` / `searchParams.get('category')` / etc.; Phase 179 changes the render strategy, not the URL contract

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`src/pages/TemplateGalleryPage.jsx`** — 801 LOC single-file assembly with 5 render branches (loading / error / zero-content / no-results / content). All branches today flow through `<TemplateCardGrid columns={4}>`; Phase 179 either keeps `TemplateCardGrid` for the non-content branches and routes `content` through a new `VirtualizedTemplateGrid`, or replaces all five with a single virtualized container that renders different children per branch. Filter state at lines 158-185 (q, category, orientation, favorites) is URL-synced via `searchParams`.
- **`src/design-system/components/TemplateCard.jsx`** — `TemplateCard` thumbnail is `aspect-video` (locked 16:9); D-02 masonry requires either a per-card aspect prop (e.g. `aspect="landscape" | "portrait" | "square"`) or a viewBox-derived auto mode. `TemplateCardSkeleton` (line 189) uses the same `aspect-video` skeleton — needs corresponding aspect awareness if rendered inside masonry rows.
- **`src/design-system/components/EmptyState`** (re-exported from design-system index) — used by zero-content / no-results / error branches; reusable inside virtualized container without modification (it's a full-block component).
- **`src/services/aiTemplate/templateDraftsService.js`** + the gallery's `fetchGalleryTemplates({ limit: 500 })` call at line 323 — Phase 179 changes no service contract; the in-memory fits-<500-rows assumption (line 16 comment) holds and is exactly what TanStack Virtual is designed for.
- **`fuse.js`** (line 27 import, instantiated at line 341) — search index; Phase 179's SC-3 requires search input to retain focus during typing (already true today because the fuse `useMemo` doesn't re-mount the input); scroll-reset on `filteredResults` identity change is the new behavior to add.

### Established Patterns

- **URL-synced filter state via `searchParams`** (Phase 168 onward) — `searchParams.get('q')` / `searchParams.get('category')` / `searchParams.get('orientation')` / `searchParams.get('favorites')`; SC-4 explicitly preserves this. The virtualizer is one layer below this — no URL contract touch.
- **Render branches with `EmptyState` fallback** (`zero-content` / `no-results` / `error`) — Pattern I in the TemplateGalleryPage header doc (line 619). Phase 179 keeps the branches; only the `content` branch swaps to virtualized rendering.
- **Tailwind responsive breakpoints `sm/md/lg`** — locked by design-system Tailwind config; ResizeObserver-driven cols (D-01) should hit those same thresholds (640 / 768 / 1024) to match the unvirtualized fallback during transitions.
- **`<img loading="lazy">` on TemplateCard thumbnails** — current lazy-loading approach; virtualization is complementary (virtual rows don't render off-screen items at all; lazy loading was the v20.0 partial mitigation). No conflict.
- **In-memory catalog assumption (<500 rows)** — `fetchGalleryTemplates({ limit: 500 })` at line 323; fuse.js indexes the full corpus. SC-2 is exactly this assumption tested at scale.

### Integration Points

- **Page-level scroll → internal scroll container (D-03)** — affects any feature that scrolls the gallery from outside (e.g. deep links with hash anchors); audit during planning whether any v20.0 behavior relied on `window.scrollTo` or `document.documentElement.scrollHeight` against the gallery page. Suggest a quick grep for `scrollTo` / `scrollIntoView` references in `src/` to find any.
- **`adminToolPages` / route registration** — `template-gallery` is a top-level user-facing route, not in `adminToolPages`; no nav-gate changes for Phase 179.
- **`StarterPacksStrip`** (visible in the gallery page) — strip stays above the filter row per existing UI-SPEC; remains outside the virtualized scroll container (so it doesn't scroll out of view if the user is browsing mid-catalog). Confirm during planning whether the strip lives in the sticky-top zone or above it.
- **`fetchGalleryTemplates` service contract** — unchanged. The 500-row limit + the in-memory filter+search pipeline are the inputs the virtualizer consumes.

</code_context>

<specifics>
## Specific Ideas

- **OptiSigns parity is the visual standard** — user directive at every gray-area decision point. D-02 (masonry + measureElement) and D-03 (internal scroll container with sticky filter bar) both resolved by reading the OptiSigns walkthrough and following the literal pattern, even where the walkthrough's own Mirror/Diverge table flagged the item as deferrable.
- **Mixed-orientation catalog is real now** — Phase 178 D-10 shipped portrait + landscape hero variants across all three verticals; masonry layout is no longer theoretical content discovery — it's the only layout that displays the Phase 178 portrait variants without letterboxing.
- **Phase 178 closure baseline:** 485 active gallery templates (128 existing + 357 net-new). SC-2's "~500-template catalog" assertion runs against live data — no synthetic fixture required if the planner uses the local Supabase DB.
- **801-LOC `TemplateGalleryPage.jsx` is the single integration site** — every other touch (design-system card aspect, virtualized grid component) flows back through this page.

</specifics>

<deferred>
## Deferred Ideas

- **Admin queue page (`AdminTemplateQueuePage`) virtualization retrofit** — Phase 178 CONTEXT v21.x watch item; revisit if review-session lag observed during real admin batch work
- **Branded category hero banners** (OptiSigns line 117 pattern) — pure design work, v22.0 candidate when design system has bandwidth for category-specific theming
- **Horizontal carousels per category on home/landing view** — already partially shipped via `StarterPacksStrip`; per-category expansion is v22.0 (OptiSigns walkthrough line 108)
- **TCAT-F2 vertical filter chip surfacing** — Phase 178 produced the data; v22.0 surfaces it as a user-facing chip
- **TCAT-F5 orthogonal filter taxonomy** (Category × Vertical × Template Type × Visual Style × Color Mood) — v22.0 (OptiSigns walkthrough line 165)
- **`@tanstack/react-virtual` retrofit to other long lists** — admin queue, marketing pages, etc. — none blocking; revisit per surface as needed
- **Service worker / route-level code splitting** for the gallery chunk — out of scope unless SC-2 fails against current bundle size
- **`IntersectionObserver`-based thumbnail preloading** — current `<img loading="lazy">` is the v20.0 baseline; revisit only if SC-2 needs the headroom
- **TemplateCard visual redesign beyond aspect-native rendering** — out of scope; D-02 minimal change only

</deferred>

---

*Phase: 179-gallery-virtualization-launch-validation*
*Context gathered: 2026-05-10*
