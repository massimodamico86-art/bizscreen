# Phase 171: Core Gallery UI Redesign - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 171-core-gallery-ui-redesign
**Areas discussed:** Gallery layout & cards, Filter & search UX, Sort & URL state, Loading/empty/error states

---

## Gallery layout & cards

| Option | Description | Selected |
|--------|-------------|----------|
| Flat card grid | Single uniform grid, curated sections become sort options | ✓ |
| Sectioned grid | Keep Featured/Popular/Recent horizontal scroll sections + full grid below | |
| You decide | Let Claude choose | |

**User's choice:** Flat card grid
**Notes:** Reuses existing TemplateCardGrid. Legacy horizontal-scroll sections replaced by sort options.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Thumbnail + name + badges | Orientation icon, "New" badge, "Popular" badge. Minimal and scannable. | ✓ |
| Thumbnail + name + category + badges | Adds category label for more context | |
| You decide | Let Claude choose | |

**User's choice:** Thumbnail + name + badges
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Scale + shadow lift | Subtle scale-up (1.02–1.03x) with elevated shadow | ✓ |
| Overlay with action buttons | Dark overlay with "Preview" and "Use Template" buttons | |
| You decide | Let Claude choose | |

**User's choice:** Scale + shadow lift
**Notes:** Uses design system motion primitives.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Replace in-place | Delete legacy page, build new on same route | ✓ |
| Coexist with feature flag | Keep old page behind feature flag | |

**User's choice:** Replace in-place
**Notes:** No dead code, no confusion. Legacy filter logic reimplemented fresh.

---

## Filter & search UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline filter bar | Horizontal bar above grid with chips + search | ✓ |
| Collapsible sidebar | Legacy sidebar approach | |
| You decide | Let Claude choose | |

**User's choice:** Inline filter bar
**Notes:** Maximizes grid space, uses existing FilterChips + SearchBar from design system.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side fuse.js | Load all templates, fuse.js for instant search | ✓ |
| DB-side ILIKE | Debounced DB queries via templateGalleryService | |
| Hybrid | Initial DB load, then client-side | |

**User's choice:** Client-side fuse.js
**Notes:** Already decided in STATE.md. Catalog <500 records fits in memory.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown menus | Category/Tags open as dropdown selectors, active values as chips | ✓ |
| Always-visible chip rows | All options as clickable chips in horizontal rows | |
| You decide | Let Claude choose | |

**User's choice:** Dropdown menus
**Notes:** Orientation uses toggle chips (Landscape/Portrait).

---

## Sort & URL state

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown in filter bar | Sort dropdown alongside filter controls | ✓ |
| Toggle pills above grid | Horizontal pill group showing all sort options | |
| You decide | Let Claude choose | |

**User's choice:** Dropdown in filter bar
**Notes:** Shows current sort label, options: Newest, Most Popular, A-Z, Recently Used.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side localStorage | Track usage timestamps in localStorage | ✓ |
| DB column (last_used_at) | Per-user usage tracking in database | |
| Skip Recently Used sort | Drop from sort options entirely | |

**User's choice:** Client-side localStorage
**Notes:** Acceptable that this clears on browser switch. No DB changes needed.

---

| Option | Description | Selected |
|--------|-------------|----------|
| All filter+sort+search in URL | Full state in query params via useSearchParams() | ✓ |
| Minimal (search + category only) | Partial URL state | |
| You decide | Let Claude choose | |

**User's choice:** All filter+sort+search in URL
**Notes:** Params: category, tags, orientation, sort, q. Full shareability per TDSC-04.

---

## Loading, empty & error states

| Option | Description | Selected |
|--------|-------------|----------|
| Skeleton card grid | 8-12 skeleton cards using TemplateCardSkeleton | ✓ |
| Centered spinner | Simple loading spinner | |
| You decide | Let Claude choose | |

**User's choice:** Skeleton card grid
**Notes:** Filter bar also shows skeleton placeholders.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Illustration + suggestions | SearchIllustration + message + helpful suggestions | ✓ |
| Minimal text only | "No results" + "Clear filters" button | |
| You decide | Let Claude choose | |

**User's choice:** Illustration + suggestions
**Notes:** Suggestions: try different keywords, fewer filters, browse all templates link.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Inline error with retry | EmptyState with error illustration + "Try again" button | ✓ |
| Toast + stale data | Toast error, keep displaying previously loaded templates | |
| You decide | Let Claude choose | |

**User's choice:** Inline error with retry
**Notes:** No redirect, stays on gallery page.

---

## Claude's Discretion

- Grid column count and responsive breakpoints
- Exact fuse.js configuration (threshold, keys, weights)
- Dropdown component implementation
- Badge styling (color, size, position)
- Debounce timing for search input
- Page header content and breadcrumb structure

## Deferred Ideas

None — discussion stayed within phase scope.
