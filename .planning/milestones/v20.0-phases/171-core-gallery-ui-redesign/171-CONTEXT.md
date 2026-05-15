# Phase 171: Core Gallery UI Redesign - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the legacy `SvgTemplateGalleryPage` with a modern `TemplateGalleryPage` that lets users browse, search, filter, and sort templates through a responsive card grid. The legacy page is deleted — no coexistence. This phase covers gallery UX (TGAL-01 through TGAL-05) and discovery/search (TDSC-01 through TDSC-05). Preview modal and apply flow belong to Phase 172.

</domain>

<decisions>
## Implementation Decisions

### Gallery Layout & Cards
- **D-01:** Flat card grid layout — no curated sections (Featured, Popular, Recent). The legacy horizontal-scroll sections are replaced by sort options instead.
- **D-02:** Card content: template thumbnail (SVG preview or placeholder), template name, and contextual badges — orientation icon (landscape/portrait), "New" badge for recent additions, "Popular" badge for high `use_count`. No category label on cards.
- **D-03:** Hover interaction: subtle scale-up (1.02–1.03x) with elevated shadow. Uses design system motion primitives (`scaleTap`, `fadeInScale`).
- **D-04:** Legacy `SvgTemplateGalleryPage.jsx` is replaced in-place on the same route. No feature flag coexistence.

### Filter & Search UX
- **D-05:** Inline horizontal filter bar above the grid — no sidebar. Maximizes grid space. Filter bar contains: search input, category dropdown, tags dropdown, orientation toggle chips, sort dropdown.
- **D-06:** Client-side search using fuse.js over name/description/tags. All templates fetched on mount via `templateGalleryService.fetchGalleryTemplates()`, then fuse.js indexes them for instant sub-second filtering.
- **D-07:** Category and tag filters use dropdown menus. Selected values appear as dismissible chips below the filter bar. "Clear all" action removes all active filters and search in one click (TDSC-03).

### Sort & URL State
- **D-08:** Sort control is a dropdown in the filter bar. Options: Newest (`created_at` desc), Most Popular (`use_count` desc), Alphabetical (`name` asc), Recently Used (client-side).
- **D-09:** "Recently Used" sort uses localStorage to track per-template usage timestamps. Templates with usage entries sort by timestamp desc; others append after, sorted by `created_at`. Acceptable that this clears on browser switch.
- **D-10:** Full filter+sort+search state persisted in URL query params via `useSearchParams()`. Params: `category`, `tags`, `orientation`, `sort`, `q`. Sharing a URL produces the same filtered view (TDSC-04).

### Loading, Empty & Error States
- **D-11:** Loading state: skeleton card grid (8–12 cards) using `TemplateCardSkeleton` from design system. Filter bar also shows skeleton placeholders.
- **D-12:** Empty state (no results): `EmptyState` component with `SearchIllustration`, "No templates match your search" message, and suggestions — try different keywords, fewer filters, or "Browse all templates" link that clears filters (TDSC-05).
- **D-13:** Error state (fetch failure): `EmptyState` component with error illustration, "Couldn't load templates" message, and "Try again" button that re-fetches. No redirect, stays on gallery page.

### Claude's Discretion
- Grid column count and responsive breakpoints
- Exact fuse.js configuration (threshold, keys, weights)
- Dropdown component implementation (design system Select vs custom)
- Badge styling (color, size, position on card)
- Debounce timing for search input
- Page header content and breadcrumb structure

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Layer
- `.planning/phases/170-data-layer-foundation/170-CONTEXT.md` — Phase 170 decisions on `gallery_templates` VIEW, `templateGalleryService`, editor_type discriminator
- `src/services/templateGalleryService.js` — Sole data-access point for gallery UI (Phase 170 output)

### Design System
- `src/design-system/index.js` — Full component inventory including TemplateCard, TemplateCardGrid, TemplateCardSkeleton, FilterChips, SearchBar, EmptyState, Badge, PageLayout, PageTransition
- `src/design-system/components/EmptyState.jsx` — EmptyState component API (icon, title, description, action, size)

### Legacy Page (to be replaced)
- `src/pages/SvgTemplateGalleryPage.jsx` — Current gallery page with sidebar filters, horizontal scroll sections, search — reference for feature parity

### Requirements
- `.planning/REQUIREMENTS.md` §Gallery UX (TGAL-01..05) and §Discovery & Search (TDSC-01..05) — acceptance criteria for this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TemplateCard`, `TemplateCardGrid`, `TemplateCardSkeleton` — design system template components, ready to use for the new grid
- `FilterChips`, `ToggleChips` — chip components for active filter display and orientation toggles
- `SearchBar` — search input component from design system
- `EmptyState` + `SearchIllustration`, `TemplatesIllustration` — empty state with illustrations
- `Badge`, `StatusBadge` — for "New" and "Popular" badges on cards
- `PageLayout`, `PageHeader`, `PageContent` — page structure components
- `PageTransition`, `StaggeredPageTransition`, `StaggeredItem` — animation wrappers
- `Skeleton` components — base skeleton primitives (`Skeleton`, `SkeletonText`, `SkeletonImage`)

### Established Patterns
- Design system components imported from `../design-system` (barrel export)
- Card component wraps `DSCard` with `padding="none"` default
- Pages use `showToast` and `onNavigate` props from App.jsx
- No existing `useSearchParams` usage in gallery — this is net-new
- Tailwind CSS for styling throughout

### Integration Points
- `App.jsx` — route registration for the gallery page (currently `SvgTemplateGalleryPage`)
- `templateGalleryService.fetchGalleryTemplates()` — data source (options: category, orientation, editorType, tags, search, sortBy, limit, offset)
- `svgTemplateService.fetchUserSvgDesigns()` — user designs (currently used by legacy page; evaluate whether to include in new page)
- fuse.js — needs to be installed (`npm install fuse.js`) and integrated for client-side search

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 171-core-gallery-ui-redesign*
*Context gathered: 2026-04-16*
