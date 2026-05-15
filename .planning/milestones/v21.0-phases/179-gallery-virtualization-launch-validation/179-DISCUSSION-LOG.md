# Phase 179: Gallery Virtualization + Launch Validation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 179-gallery-virtualization-launch-validation
**Areas discussed:** Responsive grid × virtualizer

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Responsive grid × virtualizer | TemplateCardGrid is responsive (1/2/3/4 cols at sm/md/lg). useVirtualizer needs count = ceil(N/cols). | ✓ |
| Skeleton/empty/error inside virtual container | SC-5 says all three render INSIDE the virtualized container. | |
| Performance test fixture source | SC-2 requires Playwright at ~500 templates with 1× CPU throttle. | |
| Queue-page retrofit scope | Phase 178 CONTEXT tagged admin queue virtualization as v21.x watch item. | |

**User's choice:** Responsive grid × virtualizer (only)
**Notes:** User opted to discuss the single most consequential area; remaining three captured in CONTEXT.md decisions/deferred sections without back-and-forth (skeleton-inside-virtualizer flagged as Claude's discretion D-04; perf test fixture flagged as planner discretion; queue retrofit explicitly out of scope per D-05).

---

## Cols-source mechanism (D-01)

| Option | Description | Selected |
|--------|-------------|----------|
| ResizeObserver on container | Single source of truth tied to actual rendered width; robust under parent constraints. | ✓ (Claude's discretion) |
| matchMedia subscription | Decouples cols from container width; fragile if parent layout constrains. | |
| Lock to 4 cols, fix CSS | Drop responsive grid; regresses mobile to <200px cards. | |
| One item per virtual row + CSS grid | Browser handles wrapping; ~4× virtual-row overhead; contradicts SC-1 "row-chunked" wording. | |

**User's choice:** "you decide"
**Notes:** Claude selected ResizeObserver on container. Rationale: single source of truth tied to actual rendered width; robust if a parent constrains the gallery (Player/admin shells reuse this page); re-virtualize-on-resize cost negligible.

---

## Row height strategy (D-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed estimateSize per breakpoint | Cheap, deterministic, low risk to SC-2 <1s budget. | |
| measureElement (dynamic) | Pixel-accurate; required for masonry; layout-on-render cost. | ✓ (per OptiSigns directive) |

**User's choice:** "optisigns is the standard you follow"
**Notes:** Triggered a canonical-ref read of OPTISIGNS-WALKTHROUGH.md. Lines 117/121/172 surface a tension: walkthrough describes OptiSigns as masonry with variable heights AND explicitly classifies masonry as "Defer to v21.x, polish not blocking" in the Mirror/Diverge table. User asked to reconcile.

---

## Masonry vs deferral reconciliation (D-02 final)

| Option | Description | Selected |
|--------|-------------|----------|
| Masonry + measureElement (full parity) | OptiSigns visual parity; mixed-orientation cards at true aspect; SC-2 risk. | ✓ |
| Strict grid + fixed row height (defer masonry) | Walkthrough's own scope-call; lower SC-2 risk; portrait SVGs continue to letterbox. | |
| Hybrid: fixed grid + aspect-aware cards | Captures no-crop visual win without masonry layout cost; ~5 lines on TemplateCard. | |

**User's choice:** "choose based on optisigns"
**Notes:** Claude selected Masonry + measureElement per the literal OptiSigns standard. Risk surfaced and accepted in D-02: measureElement adds layout-on-render cost and SC-2's <1s budget becomes the load-bearing perf gate. Planner must measure first-paint and tune estimateSize defaults.

---

## Scroll container shape (D-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Internal flex-1, sticky filter bar above | Matches OptiSigns category-view shape; predictable Tab order; scopes scrollToOffset(0) to grid. | ✓ (per OptiSigns directive) |
| Window-level scroll (windowVirtualizer) | Most v20.0-compatible page-scroll behavior; slightly more expensive; scrollTo may scroll past sticky bar. | |
| Fixed-height region (e.g. 75vh) | Simplest config; wastes space on tall monitors; inconsistent with app conventions. | |

**User's choice:** "you decide based on optisigns"
**Notes:** Claude selected internal flex-1 with sticky FilterBar above. Rationale: OPTISIGNS-WALKTHROUGH.md line 117 describes a persistent breadcrumb/hero with grid scrolling independently below — exact match for internal flex-1. Visible behavior change vs v20.0: page no longer has body-level scroll; only the grid scrolls.

---

## Claude's Discretion

- **D-01 cols-source mechanism** — user said "you decide"; Claude chose ResizeObserver.
- **D-02 masonry vs strict** — user said "choose based on optisigns"; Claude chose Masonry + measureElement.
- **D-03 scroll container shape** — user said "you decide based on optisigns"; Claude chose internal flex-1.
- **D-04 skeleton-inside-virtualizer pattern** — three viable shapes flagged in CONTEXT.md Claude's Discretion; planner picks.
- **overscan value** — SC-1 minimum is 3 rows; suggest 5 in CONTEXT.md.
- **per-card aspect detection for masonry** — column-driven (svg_templates.width/height) suggested over viewBox parsing.
- **estimateSize initial values** — formula suggested in CONTEXT.md.
- **Test fixture source for SC-2** — live local Supabase (485 active templates) suggested over route-intercept mocks.
- **Migration path** — extraction of `VirtualizedTemplateGrid` sibling component suggested over inline refactor.

## Deferred Ideas

All deferred items captured in CONTEXT.md `<deferred>` section. Summary:

- Admin queue page virtualization retrofit (v21.x watch item)
- Branded category hero banners (v22.0)
- Horizontal carousels per category on landing view (v22.0)
- TCAT-F2 vertical filter chip surfacing (v22.0)
- TCAT-F5 orthogonal filter taxonomy (v22.0)
- @tanstack/react-virtual retrofit to other long lists (per surface as needed)
- Service worker / route-level code splitting (out of scope unless SC-2 fails)
- IntersectionObserver thumbnail preloading (out of scope unless SC-2 needs headroom)
- TemplateCard visual redesign beyond aspect-native rendering (out of scope; D-02 minimal change only)
