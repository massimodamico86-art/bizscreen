# Phase 171: Core Gallery UI Redesign - Research

**Researched:** 2026-04-19
**Domain:** React gallery UI — client-side search/filter/sort over a Postgres VIEW-backed catalog; URL-persisted state; responsive card grid
**Confidence:** HIGH

## Summary

Phase 171 is a **page-level UI replacement backed by existing data and components** — not a greenfield build. Phase 170 already delivered the single source of truth: a `gallery_templates` Postgres VIEW (21 columns, unified SVG + Polotno templates, RLS-safe) fronted by `templateGalleryService.fetchGalleryTemplates()`. The design system (`src/design-system/`) ships every UI primitive the phase needs: `TemplateCard` (already has `orientation` + `featured` + hover-overlay + `onSelect`/`onPreview` props), `TemplateCardGrid` (responsive 1→2→3→4 at lg), `TemplateCardSkeleton`, `SearchBar`, `FilterChips`, `ToggleChips`, `Select`, `EmptyState`, `SearchIllustration`, `TemplatesIllustration`, `Badge`, `PageLayout`, `StaggeredPageTransition`. CONTEXT.md and UI-SPEC.md lock the design choices; RESEARCH.md's job is to verify the three net-new integration seams: **fuse.js integration**, **URL query-param state via `useSearchParams`**, and **Recently Used via localStorage**.

The phase has one mechanical risk (the `template-marketplace` pageMap alias — Pitfall 5 in the v20.0 research) that must be handled atomically when replacing `SvgTemplateGalleryPage`. Everything else is assembly: the TemplateCard already renders the hover overlay with `onSelect`/`onPreview`, the grid already supports 4-column responsive layout, Badge already supports the `success`/`default` variants UI-SPEC calls for, and the service's return shape is raw snake_case VIEW rows that the new page must adapt at the component boundary (the service's JSDoc comment D-08 confirms "callers handle casing" — the service does NOT camelCase).

**Primary recommendation:** Build `TemplateGalleryPage.jsx` as a single-file page that (1) calls `fetchGalleryTemplates()` once on mount with no filters, (2) pipes results through a memoized fuse.js index + client-side filter/sort pipeline, (3) reads+writes filter state via `useSearchParams` (React Router v7, already mounted via `AppRouter.jsx`), (4) renders existing design-system primitives per UI-SPEC, and (5) is wired into App.jsx `pageMap` atomically at BOTH `'templates'` and `'svg-templates'` and `'template-marketplace'` aliases so no legacy call-site is orphaned. Do not build a new component library — use what exists.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Gallery Layout & Cards
- **D-01:** Flat card grid layout — no curated sections (Featured, Popular, Recent). The legacy horizontal-scroll sections are replaced by sort options instead.
- **D-02:** Card content: template thumbnail (SVG preview or placeholder), template name, and contextual badges — orientation icon (landscape/portrait), "New" badge for recent additions, "Popular" badge for high `use_count`. No category label on cards.
- **D-03:** Hover interaction: subtle scale-up (1.02–1.03x) with elevated shadow. Uses design system motion primitives (`scaleTap`, `fadeInScale`).
- **D-04:** Legacy `SvgTemplateGalleryPage.jsx` is replaced in-place on the same route. No feature flag coexistence.

#### Filter & Search UX
- **D-05:** Inline horizontal filter bar above the grid — no sidebar. Maximizes grid space. Filter bar contains: search input, category dropdown, tags dropdown, orientation toggle chips, sort dropdown.
- **D-06:** Client-side search using fuse.js over name/description/tags. All templates fetched on mount via `templateGalleryService.fetchGalleryTemplates()`, then fuse.js indexes them for instant sub-second filtering.
- **D-07:** Category and tag filters use dropdown menus. Selected values appear as dismissible chips below the filter bar. "Clear all" action removes all active filters and search in one click (TDSC-03).

#### Sort & URL State
- **D-08:** Sort control is a dropdown in the filter bar. Options: Newest (`created_at` desc), Most Popular (`use_count` desc), Alphabetical (`name` asc), Recently Used (client-side).
- **D-09:** "Recently Used" sort uses localStorage to track per-template usage timestamps. Templates with usage entries sort by timestamp desc; others append after, sorted by `created_at`. Acceptable that this clears on browser switch.
- **D-10:** Full filter+sort+search state persisted in URL query params via `useSearchParams()`. Params: `category`, `tags`, `orientation`, `sort`, `q`. Sharing a URL produces the same filtered view (TDSC-04).

#### Loading, Empty & Error States
- **D-11:** Loading state: skeleton card grid (8–12 cards) using `TemplateCardSkeleton` from design system. Filter bar also shows skeleton placeholders.
- **D-12:** Empty state (no results): `EmptyState` component with `SearchIllustration`, "No templates match your search" message, and suggestions — try different keywords, fewer filters, or "Browse all templates" link that clears filters (TDSC-05).
- **D-13:** Error state (fetch failure): `EmptyState` component with error illustration, "Couldn't load templates" message, and "Try again" button that re-fetches. No redirect, stays on gallery page.

### Claude's Discretion
- Grid column count and responsive breakpoints (UI-SPEC already locks 1→2→3→4)
- Exact fuse.js configuration (threshold, keys, weights)
- Dropdown component implementation (design system Select vs custom)
- Badge styling (color, size, position on card) (UI-SPEC already locks: "New" = `Badge variant="success"`, "Popular" = `Badge variant="default"`)
- Debounce timing for search input (UI-SPEC locks 150ms)
- Page header content and breadcrumb structure

### Deferred Ideas (OUT OF SCOPE)
None — per CONTEXT.md "No specific requirements" and "Discussion stayed within phase scope."

**Downstream phases (do not solve here):**
- Preview modal + apply flow → Phase 172
- Starter packs + favorites (including "Favorites only" filter) → Phase 173
- Scene editor integration + onboarding tour (driver.js) → Phase 174
- Virtualization, new content, tsvector FTS, `use_count` increment-on-apply → Phase 175 / v20.1
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TGAL-01 | Browse all templates in redesigned gallery with modern card layout, orientation badges, and hover states | `TemplateCard` (already supports `orientation` + hover overlay with `onSelect`/`onPreview`) + `TemplateCardGrid columns={4}` + `Badge` for orientation; Pattern 1 & Component Responsibilities below |
| TGAL-02 | Distinct empty, loading (skeletons), and error states | `TemplateCardSkeleton` × 12 for loading; `EmptyState` with `SearchIllustration` (no-results) / `TemplatesIllustration` (error); three-state discriminator pattern below |
| TGAL-03 | Sort by Newest, Most Popular (`use_count`), Alphabetical, Recently Used | Client-side sort pipeline over VIEW rows; `use_count`, `created_at`, `name` present in VIEW; Recently Used via localStorage (D-09) |
| TGAL-04 | "New" badge on templates added within a configurable recency window | `Badge variant="success"` keyed off `created_at` vs. configurable window (recommend 30d default per v20.0 research §Features "New badge (30-day auto-expiry)") |
| TGAL-05 | Responsive — usable density and legibility on mobile and desktop | `TemplateCardGrid` already implements `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`; UI-SPEC confirms breakpoints |
| TDSC-01 | Free-text search by name, description, tags with instant sub-second filtering | fuse.js 7.3.0 client-side index built once, sub-ms at <500 rows; 150ms debounce (UI-SPEC); keys: `name` (weight 2), `description` (weight 1), `tags` (weight 1.5) |
| TDSC-02 | Filter by category, tags, orientation with dismissible filter chips | Category + Tags via `Select` dropdowns; Orientation via `ToggleChips variant="primary"`; active values rendered as dismissible chips using `FilterChips` pattern |
| TDSC-03 | Clear all active filters and search in one action | "Clear all" `Button variant="ghost" size="sm"` that resets `searchParams` to empty object; UI-SPEC Active Filters Row |
| TDSC-04 | Filter, sort, and search state persist in URL query params for shareable/deep-linkable views | React Router v7 `useSearchParams` hook (already available via `AppRouter.jsx` root `<Routes>`); params: `q`, `category`, `tags`, `orientation`, `sort` (D-10 + UI-SPEC URL State Persistence) |
| TDSC-05 | "No results" empty state with suggestions when filters yield zero templates | `EmptyState` with `SearchIllustration`, copy per UI-SPEC "No templates match your search", action = "Browse all templates" button that clears filters |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Template fetch (SELECT from `gallery_templates` VIEW) | API / Backend (Supabase/Postgres) | — | VIEW + RLS already enforce row-level correctness; no app-tier logic |
| Client-side filter/search/sort over fetched list | Browser / Client (React useMemo) | — | Catalog is <500 rows; in-memory fuse.js index is sub-ms; zero round-trips per keystroke |
| URL-persisted filter/sort state | Browser / Client (React Router `useSearchParams`) | — | URL is the source of truth for shareable views; pure browser concern |
| "Recently Used" usage tracking | Browser / Client (localStorage) | — | Per-browser convenience sort; acceptable to be ephemeral (D-09) |
| "New"/"Popular" badge derivation | Browser / Client (React render logic) | — | Computed from VIEW columns `created_at`/`use_count`; no server derivation needed |
| Thumbnail asset serving | CDN / Static | Database / Storage | `thumbnail` column in VIEW points to S3/public URL; no app tier involved |
| Route registration (pageMap wiring) | Frontend Server (React shell) | — | `App.jsx` owns the pseudo-router `currentPage` state map |

## Standard Stack

### Core — Already Installed (verified via `package.json`)
| Library | Installed Version | Latest (npm verified 2026-04-19) | Purpose | Why Standard |
|---------|------------------|-----------------------------------|---------|--------------|
| react | ^19.1.1 | — | UI framework | Locked baseline |
| react-router-dom | ^7.9.5 | 7.14.1 | `useSearchParams` for URL state (D-10) | Already wrapping `/app/*` in `AppRouter.jsx`; no upgrade needed for Phase 171 |
| framer-motion | ^12.23.24 | 12.38.0 | Stagger animation, hover motion, dropdown motion | UI-SPEC Animation Contract: `StaggeredPageTransition`, `scaleHover`, `fadeInScale`, `dropdown` motion primitives already defined in `src/design-system/motion.js` |
| lucide-react | ^0.548.0 | — | Icons (Monitor/Smartphone for orientation, Search, X, ChevronDown) | Locked throughout codebase |
| tailwindcss | ^3.4.18 | — | Styling | Brand tokens (`brand-500`, `rounded-card`, `shadow-elevated`) defined in `tailwind.config.js` |

### Core — Net-New (one install)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fuse.js | ^7.3.0 | Client-side fuzzy search (D-06) | [VERIFIED: npm view fuse.js version → 7.3.0] Zero-dependency, sub-ms at <500 rows. Already pre-decided in v20.0 research (`STACK.md`) and STATE.md line 60 decision log. No other package is justified. |

**Installation:**
```bash
npm install fuse.js@^7.3.0
```

### Rejected Alternatives (do not consider)
| Instead of | Could Use | Why Rejected |
|------------|-----------|--------------|
| fuse.js | Algolia / Typesense / Meilisearch | External SaaS; catalog <500 rows makes cost/latency trade unfavorable; v20.0 STACK.md Rejected Libraries |
| `useSearchParams` | Custom history/URL helper | React Router v7 is already mounted; no reason to reinvent; v20.0 SUMMARY.md §Architecture |
| `useSearchParams` | Zustand / Jotai | Filter state is page-local; URL params handle sharing; v20.0 STACK.md Filter/Facet State |
| `@tanstack/react-virtual` | N/A — out of scope for 171 | Gate virtualization on catalog >200 rows (TGAL-F1 deferred); current catalog is ~12 seeded rows |
| `react-window` | — | Does not handle mixed portrait/landscape heights without `VariableSizeGrid`; deferred altogether |

### Design System Components Used (all already exist in `src/design-system/`)
| Component | Import | Role in Phase 171 |
|-----------|--------|-------------------|
| `PageLayout` | `design-system` | Outer wrapper, `maxWidth="wide"` |
| `PageHeader` | `design-system` | Title "Templates" + dynamic "{N} templates available" |
| `PageContent` | `design-system` | Wraps filter bar + grid |
| `SearchBar` | `design-system` | Debounced search input (variant default, size md) |
| `FilterChips` | `design-system` | Active filter chip row (dismissible) |
| `ToggleChips` | `design-system` | Orientation toggle (All/Landscape/Portrait) with `variant="primary"` |
| `Select` | `design-system/FormElements` | Category, Tags, Sort dropdowns |
| `TemplateCard` | `design-system` | Per-template card with `orientation`, `featured`, `onSelect`, `onPreview` props |
| `TemplateCardGrid` | `design-system` | Responsive grid (`columns={4}` → 1/2/3/4) |
| `TemplateCardSkeleton` | `design-system` | Loading placeholder (render × 12) |
| `EmptyState` | `design-system` | No-results + error states (`size="lg"`) |
| `SearchIllustration`, `TemplatesIllustration` | `design-system` | Icons inside EmptyState |
| `Badge` | `design-system` | "New" (`variant="success"`), "Popular" (`variant="default"`) |
| `StaggeredPageTransition`, `StaggeredItem` | `design-system` | Card grid entrance animation |
| `Button` | `design-system` | "Clear all", "Browse all templates", "Try again" |

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│  Browser — URL query params (source of truth for filter state) │
│  /app#templates?q=menu&category=Food&orientation=landscape…    │
└─────────────────┬──────────────────────────────────────────────┘
                  │ useSearchParams()
                  ▼
┌────────────────────────────────────────────────────────────────┐
│  TemplateGalleryPage (NEW in src/pages/)                       │
│                                                                 │
│   useEffect(once) ──► templateGalleryService.fetchGalleryT…()  │
│                                    │                            │
│                                    ▼                            │
│   [ raw VIEW rows (snake_case) ]  →  allTemplates state        │
│                                                                 │
│   new Fuse(allTemplates, { keys: [name, description, tags] })  │
│                                    │                            │
│                                    ▼                            │
│   useMemo filter pipeline:                                     │
│     1. fuse.search(q) OR allTemplates                          │
│     2. filter by category (dropdown value)                     │
│     3. filter by tags (dropdown value — array overlap)         │
│     4. filter by orientation (toggle chip)                     │
│     5. sort by {newest|popular|alpha|recent}                   │
│                                    │                            │
│                                    ▼                            │
│   displayedTemplates                                           │
│                                                                 │
│   ┌───────────────────┬──────────────────┬──────────────────┐ │
│   │ Loading? (isFetching)                                   │ │
│   │   → TemplateCardSkeleton × 12                           │ │
│   │ Error? (fetchError)                                     │ │
│   │   → EmptyState + Try again button → refetch()           │ │
│   │ displayedTemplates.length === 0 && hasActiveFilters?    │ │
│   │   → EmptyState "No templates match" + clearAllFilters() │ │
│   │ displayedTemplates.length === 0 && allTemplates === 0?  │ │
│   │   → EmptyState "No templates yet" (no action)           │ │
│   │ Otherwise                                               │ │
│   │   → TemplateCardGrid                                    │ │
│   │      └─ TemplateCard × N  (staggered entry)             │ │
│   └─────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────────────┐
│  templateGalleryService.fetchGalleryTemplates()                │
│  (src/services/templateGalleryService.js — Phase 170 output)   │
│   SELECT * FROM gallery_templates (no filters — client does)   │
└─────────────────┬──────────────────────────────────────────────┘
                  ▼
┌────────────────────────────────────────────────────────────────┐
│  Postgres — gallery_templates VIEW (migration 167)             │
│  UNION ALL of svg_templates + template_library                 │
│  Columns: id, source_table, editor_type, name, description,    │
│    category, tags, orientation, thumbnail, svg_url, svg_content│
│    design_json, width, height, tenant_id, created_by,          │
│    created_at, updated_at, use_count, is_featured, is_active,  │
│    slug                                                        │
│  Inherits caller RLS (NOT SECURITY DEFINER)                    │
└────────────────────────────────────────────────────────────────┘
```

### Recommended File Layout
```
src/
├── pages/
│   ├── TemplateGalleryPage.jsx           # NEW — main page component (TGAL-01…05, TDSC-01…05)
│   └── SvgTemplateGalleryPage.jsx        # DELETED at end of phase (D-04)
├── pages/TemplateGallery/                 # (optional — if page decomposition warranted)
│   ├── TemplateGalleryFilterBar.jsx      # Inline filter bar (SearchBar + 3 selects + toggle)
│   ├── TemplateGalleryActiveFilters.jsx  # Dismissible chip row
│   └── useTemplateGalleryState.js        # Custom hook: wraps useSearchParams + derives filters
├── services/
│   └── templateGalleryService.js          # EXISTING (Phase 170) — no changes needed
├── design-system/                         # EXISTING — consumed, not modified
tests/
├── unit/pages/
│   └── TemplateGalleryPage.test.jsx      # NEW — RTL tests for filter/sort/empty states
└── e2e/
    └── template-gallery.spec.js           # NEW — Playwright browse+search+filter+share-URL
```

### Pattern 1: One-Shot Fetch + Client-Side Pipeline
**What:** Fetch all templates once, filter/search/sort entirely in memory via fuse.js + `useMemo`.
**When to use:** Catalog fits in memory (<500 rows) AND users expect instant keystroke feedback.
**Why not server-side:** Per-keystroke round-trip adds 100-300ms; Supabase `.ilike()` does not search `tags` array without extra complexity; fuzzy matching requires client lib anyway.
**Example:**
```javascript
// Source: fuse.js docs (https://www.fusejs.io/examples) + v20.0 STACK.md
import { useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { fetchGalleryTemplates } from '../services/templateGalleryService';

function useTemplateGalleryData() {
  const [allTemplates, setAllTemplates] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const refetch = async () => {
    setIsFetching(true);
    setFetchError(null);
    const { data, error } = await fetchGalleryTemplates({ limit: 500 });
    if (error) setFetchError(error);
    else setAllTemplates(data);
    setIsFetching(false);
  };

  useEffect(() => { refetch(); }, []);

  // Fuse index rebuilt only when allTemplates changes.
  const fuse = useMemo(
    () => new Fuse(allTemplates, {
      keys: [
        { name: 'name',        weight: 2 },   // strongest signal
        { name: 'tags',        weight: 1.5 }, // tags are curated
        { name: 'description', weight: 1 },
      ],
      threshold: 0.35,   // 0 = exact, 1 = match anything; 0.35 ~= "forgiving but precise"
      ignoreLocation: true,
      minMatchCharLength: 2,
    }),
    [allTemplates]
  );

  return { allTemplates, isFetching, fetchError, refetch, fuse };
}
```

### Pattern 2: URL-Backed Filter State
**What:** Treat `useSearchParams` as the single source of truth for `q`, `category`, `tags`, `orientation`, `sort`. Reading derives from params; writing calls `setSearchParams(prev => …)`.
**When to use:** Filters must be shareable, back-button-navigable, and reload-stable (TDSC-04).
**Example:**
```javascript
// Source: React Router v7 docs (react-router.com) + UI-SPEC URL State Persistence
import { useSearchParams } from 'react-router-dom';

function useGalleryFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    q:           searchParams.get('q')           ?? '',
    category:    searchParams.get('category')    ?? '',
    tags:        (searchParams.get('tags') ?? '').split(',').filter(Boolean),
    orientation: searchParams.get('orientation') ?? '',
    sort:        searchParams.get('sort')        ?? 'newest',
  };

  const updateFilter = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
        next.delete(key);
      } else {
        next.set(key, Array.isArray(value) ? value.join(',') : value);
      }
      return next;
    }, { replace: true }); // UI-SPEC: replace (not push) to avoid back-button spam
  };

  const clearAll = () => setSearchParams(new URLSearchParams(), { replace: true });

  return { filters, updateFilter, clearAll };
}
```

### Pattern 3: Client-Side Filter + Sort Pipeline
**What:** Compose `fuse.search(q)` → category filter → tag filter → orientation filter → sort, all inside one `useMemo`.
**When to use:** Every filter+sort combination must run in <50ms (TDSC-01 "sub-second" requirement).
**Example:**
```javascript
// Source: project-internal pattern (SvgTemplateGalleryPage.jsx lines 124-163 style, simplified)
const displayedTemplates = useMemo(() => {
  // 1. Search stage
  let rows = filters.q.length >= 2
    ? fuse.search(filters.q).map(r => r.item)
    : allTemplates;

  // 2. Category
  if (filters.category) {
    rows = rows.filter(t => t.category === filters.category);
  }
  // 3. Tags (overlap)
  if (filters.tags.length > 0) {
    rows = rows.filter(t => Array.isArray(t.tags) && t.tags.some(tag => filters.tags.includes(tag)));
  }
  // 4. Orientation
  if (filters.orientation) {
    rows = rows.filter(t => t.orientation === filters.orientation);
  }
  // 5. Sort
  rows = [...rows];
  switch (filters.sort) {
    case 'popular':
      rows.sort((a, b) => (b.use_count ?? 0) - (a.use_count ?? 0));
      break;
    case 'alpha':
      rows.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
      break;
    case 'recent': {
      const usage = readRecentlyUsed();  // { [templateId]: timestamp }
      rows.sort((a, b) => {
        const at = usage[a.id] ?? 0;
        const bt = usage[b.id] ?? 0;
        if (at === bt) return new Date(b.created_at) - new Date(a.created_at);
        return bt - at;
      });
      break;
    }
    case 'newest':
    default:
      rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  return rows;
}, [allTemplates, fuse, filters]);
```

### Pattern 4: Three-State UI Discriminator (loading | error | empty-no-filters | empty-with-filters | content)
**What:** Explicit branching before grid render — legacy page conflates empty-with-filters and empty-no-DB.
**When to use:** TGAL-02 + TDSC-05 require distinct copy for "No templates yet" vs. "No templates match your search".
**Example:**
```jsx
if (isFetching)                    return <SkeletonGrid count={12} />;
if (fetchError)                    return <EmptyState icon={<TemplatesIllustration />} title="Couldn't load templates" description="…" action={<Button onClick={refetch}>Try again</Button>} size="lg" />;
if (allTemplates.length === 0)     return <EmptyState icon={<TemplatesIllustration />} title="No templates yet" description="Templates will appear here once content is added to the library." size="lg" />;
if (displayedTemplates.length === 0) return <EmptyState icon={<SearchIllustration />} title="No templates match your search" description="Try different keywords, fewer filters, or browse the full library." action={<Button variant="secondary" onClick={clearAll}>Browse all templates</Button>} size="lg" />;
return <TemplateCardGrid columns={4}>{displayedTemplates.map(...)}</TemplateCardGrid>;
```

### Pattern 5: Atomic pageMap Alias Update (addresses v20.0 Pitfall 5)
**What:** Update ALL three `pageMap` keys (`'templates'`, `'svg-templates'`, `'template-marketplace'`) in the same commit that deletes `SvgTemplateGalleryPage`.
**Why:** `App.jsx` lines 531, 558, 563 currently all point to `SvgTemplateGalleryPage`. Orphaning any one of them silently serves a deleted component.
**Verification task:** a unit test asserting `pageMap['template-marketplace'] === pageMap['templates']` at App.jsx level, OR an import-side assertion that only `TemplateGalleryPage` is lazy-imported for these three keys.

### Anti-Patterns to Avoid
- **Do NOT re-fetch on every filter change.** The legacy page already uses `useMemo` — preserve that discipline. The VIEW returns all rows; client does everything else.
- **Do NOT call `fetchGalleryTemplates({ search: q })` server-side while fuse.js runs client-side.** Two competing search paths = Pitfall 1 again.
- **Do NOT leave `sessionStorage.setItem('pendingTemplate', …)` from the legacy `handleTemplateClick`.** For Phase 171 the card `onSelect` is a no-op stub (Phase 172 wires the preview modal); deleting the sessionStorage write is a phase-171 correctness requirement because any code that touches sessionStorage during the port carries forward Pitfall 4 of v20.0.
- **Do NOT hard-code the category/tag option lists.** The legacy page has `FILTER_CONFIG.categories/industries/tags` hard-coded at the top of the file. New page MUST derive option lists from `allTemplates` distinct values so new seeded rows auto-populate dropdowns (Pitfall: "Category list hardcoded in both FILTER_CONFIG and service" — v20.0 PITFALLS.md Technical Debt table).
- **Do NOT assume `template_library` rows have `orientation`.** The VIEW emits `NULL::text AS orientation` for Polotno rows (migration 167 line 256). Orientation filter `filters.orientation === 'landscape'` must match NULL-safely — rows with NULL orientation are excluded from orientation-filtered views, which is acceptable because polotno templates inherently don't carry orientation metadata today.
- **Do NOT expect `camelCase` from the service.** Phase 170 D-08 locks service return as raw snake_case VIEW rows. Gallery page MUST read `created_at`, `use_count`, `is_featured`, `svg_url` directly — NOT `createdAt` etc. (STATE.md doesn't flag this; the service JSDoc and `scripts/smoke-template-gallery.mjs` confirm snake_case.) Note that `TemplateCard`'s props (`imageUrl`, `onSelect`) do use camelCase — adapt at the render boundary via `<TemplateCard imageUrl={t.thumbnail} title={t.name} orientation={t.orientation} featured={t.is_featured} />`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy text matching over tags/title/description | Custom Levenshtein / regex search | `fuse.js` | Handles typos, weighted keys, result scoring, array keys (`tags`), scales to 10k rows with no perf tuning |
| URL query-param parsing | Custom `useQueryParams` hook | `useSearchParams` from `react-router-dom` | Integrates with React Router v7 history; `setSearchParams` with `{ replace: true }` already handles back-button semantics |
| Debounced search input | Custom `useDebounce` | Plain `setTimeout`/`clearTimeout` inside onChange, **or** `useMemo` on the 150ms-stable value | Debounce behavior here is trivial (50 lines max); avoid adding `use-debounce` npm dep for one call-site |
| Skeleton card | Custom `<div className="animate-pulse">` blocks | `TemplateCardSkeleton` from design system | Already matches `TemplateCard` aspect ratio and rounded-card styling |
| Empty state layout | Custom `<div>` with icon + text + button | `EmptyState` from design system | Already handles 3 size variants, icon slot, action slot, a11y `role="status"` (see UI-SPEC Accessibility Notes) |
| Responsive grid | Custom CSS grid | `TemplateCardGrid columns={4}` | Already implements `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4` with `gap-4` |
| "New" badge styling | Hand-rolled `<span>` | `Badge variant="success"` (green-50/green-700) | UI-SPEC locks this; green conveys "fresh/new" without competing with brand orange |
| "Popular" badge styling | Hand-rolled `<span>` | `Badge variant="default"` (gray-100/gray-700) | UI-SPEC locks this — gray = informational, not promotional |
| Card hover overlay | Custom hover div | `TemplateCard` already ships this — pass `onSelect`, `onPreview` | `TemplateCard.jsx` lines 92-110 already render `bg-black/50 opacity-0 group-hover:opacity-100` overlay with secondary (Use) + ghost (Preview) buttons |
| Dropdown menu | shadcn/ui or headless-ui | Design system `Select` from `FormElements.jsx` | Native `<select>`-based; already styled to match the rest of the form controls; keyboard-accessible |

**Key insight:** This phase is **90% assembly**. Every UI primitive the spec requires is already in the design system barrel. The only new code is the page composition, the fuse.js index hook, the `useSearchParams` plumbing, and the localStorage "Recently Used" helper (~30 lines).

## Runtime State Inventory

*(Phase 171 deletes `SvgTemplateGalleryPage.jsx` per D-04 — this is effectively a rename/refactor of the user-facing route.)*

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None found related to gallery rendering.** The gallery page renders stateless from the VIEW. The one data-write users can do is via user-saved designs stored in `svg_templates` with `created_by = auth.uid()` — those keep working because the new page uses the same `gallery_templates` VIEW and the VIEW already filters `is_active = TRUE`. | None — VIEW is schema-stable (migration 167); no data migration needed |
| Live service config | **None.** No external service stores the string "SvgTemplateGalleryPage" or `svg-templates` route as live config. | None |
| OS-registered state | **None.** This is a pure in-browser SPA route change. No background jobs, no task scheduler entries, no pm2 process names reference the page. | None |
| Secrets/env vars | **None.** The page reads via `supabase` client (inherits anon key from `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` in `.env`); no gallery-specific env. | None |
| Build artifacts | **Potential: stale Vite/Rollup chunk cache if deploy happens while legacy component still dynamic-imported somewhere.** Verified: no other file imports `SvgTemplateGalleryPage` except `App.jsx` lines 128, 531, 558, 563. Deleting the file + updating `App.jsx` atomically should fully invalidate the chunk. | None — but verify `grep -r "SvgTemplateGalleryPage" src/` returns 0 hits after the rename commit |
| **Call-site audit (NEW category for UI rename)** | 4 existing callers of legacy route names: `App.jsx:531` (`'templates'`), `App.jsx:558` (`'template-marketplace'` alias), `App.jsx:563` (`'svg-templates'`), `App.jsx:128` (lazy import). Also: `SvgTemplateGalleryPage` internal call `sessionStorage.setItem('pendingTemplate', …)` + `onNavigate('svg-editor?templateId=…')` — legacy flow MUST NOT survive the port (Pitfall 4). | All four `App.jsx` references updated atomically in same commit; sessionStorage write removed entirely (Phase 172 will replace with URL-param flow, Phase 171 leaves `onSelect` as a no-op or simple logger). |
| **In-repo text/grep** | `grep -rn "SvgTemplateGalleryPage" src/` (expect 4 hits pre-change, 0 post-change). `grep -rn "pendingTemplate" src/` (expect the legacy page + SvgEditorPage receiver; the receiver stays during 171, only the gallery-side writer is removed — SvgEditorPage reading sessionStorage is fine if nothing writes it). | Verified against this codebase 2026-04-19 |
| **E2E test references** | `tests/e2e/template-gallery-rls.spec.js` references `/svg-templates` route. After Phase 171 that route must still resolve to the new page (alias kept). | Confirm test still passes after rename (should — it uses structural assertions, TQAL-05 style) |

## Common Pitfalls

### Pitfall 1: Stale pageMap alias after component rename (v20.0 Pitfall 5)
**What goes wrong:** `App.jsx` pageMap has three keys pointing to `SvgTemplateGalleryPage`: `'templates'` (line 531), `'template-marketplace'` (line 558), `'svg-templates'` (line 563). Missing one during the swap silently serves the deleted component → runtime error.
**Why:** The aliases exist for legacy in-app navigation and historical `onNavigate('template-marketplace')` callers.
**How to avoid:** Grep `onNavigate\|setCurrentPage` for all three strings in the first task of the plan. Replace the lazy import at line 128 AND all three pageMap entries in one atomic commit. Add a trivial unit test: `expect(pages['template-marketplace']).toBe(pages['templates'])`.
**Warning signs:** Post-deploy Sentry error "Cannot render undefined" from onboarding or scene-editor navigation paths.

### Pitfall 2: Hard-coded category/tag option list (legacy + v20.0 Tech Debt)
**What goes wrong:** Legacy page hard-codes `FILTER_CONFIG.categories/industries/tags` with 50+ values at module scope. New seeded templates with different categories won't auto-appear in dropdowns.
**Why:** Incrementally added when the DB-side category column was inconsistent.
**How to avoid:** Derive dropdown options from `allTemplates` via `useMemo`:
```javascript
const categoryOptions = useMemo(
  () => ['All', ...new Set(allTemplates.map(t => t.category).filter(Boolean))].sort(),
  [allTemplates]
);
const tagOptions = useMemo(
  () => ['All', ...new Set(allTemplates.flatMap(t => t.tags ?? []).filter(Boolean))].sort(),
  [allTemplates]
);
```
**Warning signs:** Admin adds a "Hospitality" template; it does not appear under any filter dropdown.

### Pitfall 3: Running fuse.js on every keystroke without debounce
**What goes wrong:** Fuse is fast at <500 rows (<5ms) but React re-render + stagger animation on every keystroke still adds jank on slow devices.
**Why:** UI-SPEC locks 150ms debounce — but easy to forget the debounce layer.
**How to avoid:** Debounce the search param update (not the render). Write `searchParams` 150ms after the last keystroke; the `useMemo` pipeline naturally stays stable in between.
**Warning signs:** Keystroke-to-paint latency > 50ms; stagger animation re-triggers mid-typing.

### Pitfall 4: `useSearchParams` inside a non-router subtree (sanity check)
**What goes wrong:** The page component is rendered from `App.jsx`'s manual `pageMap[currentPage]` mechanism (not `<Routes>`). If `useSearchParams` is called outside a `<Routes>` tree it throws.
**Why:** BizScreen has a hybrid: `AppRouter.jsx` mounts `<App />` at path `/app/*` inside a `<Routes>` tree, and `App` then uses internal `currentPage` state for sub-navigation. Page components (like `TemplatesPage.jsx`, `CampaignEditorPage.jsx`) DO successfully use `useNavigate()` — confirmed by `grep -l 'react-router-dom' src/pages/`. This proves the tree is router-wrapped.
**How to avoid:** Verify `useSearchParams` works by reading `TemplatesPage.jsx:8` (uses `useNavigate`) as existence proof, then write one integration test that mounts the page with `<BrowserRouter>` wrapper (the unit test pattern in `tests/unit/pages/DashboardPage.test.jsx:13` already uses `BrowserRouter`).
**Warning signs:** `useSearchParams() must be used within a <Router> component` error at page mount.

### Pitfall 5: URL state encoding edge cases
**What goes wrong:** `searchParams.set('tags', tags.join(','))` produces `?tags=Motion,Animated`. When tag values contain commas or URL-unsafe chars, parsing back via `.split(',')` corrupts them.
**Why:** Current tag taxonomy is simple words — but Phase 175 may introduce tags like `"Social, Media"`.
**How to avoid:** For v20.0 scope, document that tag values must be URL-safe single tokens; add a task in Phase 175 if tags get richer. Alternatively, use repeated params: `?tags=Motion&tags=Animated` via `searchParams.getAll('tags')` + `searchParams.append('tags', …)`. **Recommend: repeated params — natively supported by `URLSearchParams`, no ambiguity.**
**Warning signs:** Shared URL loads with only partial tag filter applied.

### Pitfall 6: Mobile density — keep at 1 column below sm
**What goes wrong:** Legacy page used `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` starting with 2 cols on mobile → cards become too small to see content.
**Why:** Signage templates have a lot of visual detail; shrinking them to 160px wide defeats browsing.
**How to avoid:** UI-SPEC locks `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4` (full width on mobile). Verify `TemplateCardGrid` default matches — confirmed in `TemplateCard.jsx:148-151`: `columns=4` → `'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'`. No code change needed; use `columns={4}`.
**Warning signs:** Mobile tap targets <44px; text truncation on names that should fit.

### Pitfall 7: `is_featured` vs. "New" badge conflation
**What goes wrong:** `TemplateCard` accepts a `featured` prop which renders a "Featured" warning-variant badge (line 84-90). Phase 171 wants "New" (success) + "Popular" (default) badges, NOT "Featured". Passing `featured={t.is_featured}` re-introduces a badge that was explicitly replaced.
**Why:** CONTEXT D-02 enumerates only orientation + New + Popular badges. `is_featured` is a DB column; the UI-SPEC simply doesn't render it.
**How to avoid:** Do NOT forward `is_featured` to `TemplateCard`'s `featured` prop for this phase. Build New/Popular badges as custom children inside `TemplateCard`'s overlay region — OR extend `TemplateCard` with a `badges` slot. Simpler: render Badge elements outside/on top of `TemplateCard`'s card div via absolute positioning (same pattern the component's internal "Featured" badge uses at line 83-90). **Recommend: extend `TemplateCard` with a `badges` array prop** (`badges={[{label:'New',variant:'success'}, {label:'Popular',variant:'default'}]}`) if needed — but for minimum diff, wrap `TemplateCard` in a parent div and position badges absolutely. Planner's discretion.
**Warning signs:** All templates show "Featured" badge because every template has `is_featured=false` by default but legacy loader sets it to true.

### Pitfall 8: Recently Used localStorage key namespace collision
**What goes wrong:** Using a generic key like `recentTemplates` collides across impersonation sessions (super_admin impersonating client uses the same browser localStorage).
**Why:** BizScreen has impersonation (`BrandingContext`, `stopImpersonation`).
**How to avoid:** Namespace the localStorage key by user ID: `bizscreen:recentTemplates:${userId}`. Guard reads against `user?.id === undefined`.
**Warning signs:** Super-admin sees their client's recently-used templates.

## Code Examples

### Full TemplateGalleryPage skeleton (for planner to decompose)

```javascript
// Source: synthesis of Pattern 1–4 above + CONTEXT.md + UI-SPEC.md
// File: src/pages/TemplateGalleryPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import { Monitor, Smartphone } from 'lucide-react';
import { fetchGalleryTemplates } from '../services/templateGalleryService';
import {
  PageLayout, PageHeader, PageContent,
  SearchBar, ToggleChips, FilterChips, Select,
  TemplateCard, TemplateCardGrid, TemplateCardSkeleton,
  EmptyState, SearchIllustration, TemplatesIllustration,
  Badge, Button,
  StaggeredPageTransition, StaggeredItem,
} from '../design-system';
import { useAuth } from '../contexts/AuthContext';

const NEW_BADGE_WINDOW_DAYS = 30;                     // TGAL-04 "configurable" — constant in phase 171
const RECENT_KEY = (uid) => `bizscreen:recentTemplates:${uid ?? 'anon'}`;

function readRecentlyUsed(userId) {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY(userId)) ?? '{}'); }
  catch { return {}; }
}

function isNew(createdAt) {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs < NEW_BADGE_WINDOW_DAYS * 86_400_000;
}

export default function TemplateGalleryPage({ showToast, onNavigate }) {
  const { user } = useAuth();
  const [allTemplates, setAllTemplates] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // ---------- derived filters from URL ----------
  const filters = {
    q:           searchParams.get('q')           ?? '',
    category:    searchParams.get('category')    ?? '',
    tags:        searchParams.getAll('tags'),               // repeated param pattern (Pitfall 5)
    orientation: searchParams.get('orientation') ?? '',
    sort:        searchParams.get('sort')        ?? 'newest',
  };
  const hasActiveFilters = !!(filters.q || filters.category || filters.tags.length || filters.orientation);

  const updateFilter = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete(key);
      if (Array.isArray(value)) value.forEach(v => v && next.append(key, v));
      else if (value) next.set(key, value);
      return next;
    }, { replace: true });
  };
  const clearAllFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  // ---------- fetch ----------
  const refetch = async () => {
    setIsFetching(true); setFetchError(null);
    const { data, error } = await fetchGalleryTemplates({ limit: 500 });
    if (error) setFetchError(error); else setAllTemplates(data);
    setIsFetching(false);
  };
  useEffect(() => { refetch(); }, []);

  // ---------- fuse index ----------
  const fuse = useMemo(() => new Fuse(allTemplates, {
    keys: [
      { name: 'name',        weight: 2 },
      { name: 'tags',        weight: 1.5 },
      { name: 'description', weight: 1 },
    ],
    threshold: 0.35, ignoreLocation: true, minMatchCharLength: 2,
  }), [allTemplates]);

  // ---------- derived option lists (Pitfall 2) ----------
  const categoryOptions = useMemo(
    () => [...new Set(allTemplates.map(t => t.category).filter(Boolean))].sort(),
    [allTemplates]
  );
  const tagOptions = useMemo(
    () => [...new Set(allTemplates.flatMap(t => t.tags ?? []).filter(Boolean))].sort(),
    [allTemplates]
  );

  // ---------- pipeline ----------
  const displayedTemplates = useMemo(() => {
    let rows = filters.q.length >= 2 ? fuse.search(filters.q).map(r => r.item) : allTemplates;
    if (filters.category) rows = rows.filter(t => t.category === filters.category);
    if (filters.tags.length) rows = rows.filter(t => (t.tags ?? []).some(tag => filters.tags.includes(tag)));
    if (filters.orientation) rows = rows.filter(t => t.orientation === filters.orientation);
    rows = [...rows];
    if (filters.sort === 'popular')   rows.sort((a, b) => (b.use_count ?? 0) - (a.use_count ?? 0));
    else if (filters.sort === 'alpha') rows.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    else if (filters.sort === 'recent') {
      const usage = readRecentlyUsed(user?.id);
      rows.sort((a, b) => {
        const at = usage[a.id] ?? 0, bt = usage[b.id] ?? 0;
        return bt - at || new Date(b.created_at) - new Date(a.created_at);
      });
    } else rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return rows;
  }, [allTemplates, fuse, filters, user?.id]);

  // ---------- popular threshold for badge ----------
  const popularityThreshold = useMemo(() => {
    const counts = allTemplates.map(t => t.use_count ?? 0).sort((a, b) => b - a);
    return counts[Math.floor(counts.length * 0.2)] ?? 0;   // top 20% is "Popular"
  }, [allTemplates]);

  // ---------- render branches ----------
  if (isFetching) return (
    <PageLayout maxWidth="wide">
      <PageHeader title="Templates" />
      <PageContent>
        <TemplateCardGrid columns={4}>
          {Array.from({ length: 12 }).map((_, i) => <TemplateCardSkeleton key={i} />)}
        </TemplateCardGrid>
      </PageContent>
    </PageLayout>
  );

  if (fetchError) return (
    <PageLayout maxWidth="wide">
      <PageHeader title="Templates" />
      <PageContent>
        <EmptyState
          icon={<TemplatesIllustration />}
          title="Couldn't load templates"
          description="Something went wrong. Check your connection and try again."
          action={<Button variant="primary" onClick={refetch}>Try again</Button>}
          size="lg"
        />
      </PageContent>
    </PageLayout>
  );

  return (
    <PageLayout maxWidth="wide">
      <PageHeader title="Templates" description={`${allTemplates.length} templates available`} />
      <PageContent>
        {/* Filter bar (UI-SPEC Layout Architecture) */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-4 mb-4 flex items-center gap-3 flex-wrap">
          <SearchBar value={filters.q} onChange={v => updateFilter('q', v)} placeholder="Search templates..." size="md" className="flex-grow min-w-[240px]" />
          <Select aria-label="Category" value={filters.category} onChange={e => updateFilter('category', e.target.value)}>
            <option value="">All Categories</option>
            {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select aria-label="Tags" value={filters.tags[0] ?? ''} onChange={e => updateFilter('tags', e.target.value ? [e.target.value] : [])}>
            <option value="">All Tags</option>
            {tagOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <ToggleChips
            variant="primary"
            selected={filters.orientation || 'all'}
            onChange={id => updateFilter('orientation', id === 'all' ? '' : id)}
            options={[
              { id: 'all',       label: 'All' },
              { id: 'landscape', label: 'Landscape', icon: Monitor },
              { id: 'portrait',  label: 'Portrait',  icon: Smartphone },
            ]}
          />
          <Select aria-label="Sort order" value={filters.sort} onChange={e => updateFilter('sort', e.target.value)}>
            <option value="newest">Newest</option>
            <option value="popular">Most Popular</option>
            <option value="alpha">Alphabetical</option>
            <option value="recent">Recently Used</option>
          </Select>
        </div>

        {/* Active filter chips + Clear all */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {filters.category && <Badge variant="default">Category: {filters.category}<button onClick={() => updateFilter('category', '')} aria-label="Remove Category filter">×</button></Badge>}
            {filters.tags.map(t => <Badge key={t} variant="default">Tag: {t}<button onClick={() => updateFilter('tags', filters.tags.filter(x => x !== t))} aria-label={`Remove ${t} tag filter`}>×</button></Badge>)}
            {filters.orientation && <Badge variant="default">Orientation: {filters.orientation}<button onClick={() => updateFilter('orientation', '')} aria-label="Remove orientation filter">×</button></Badge>}
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>Clear all</Button>
          </div>
        )}

        {/* Grid / empty states */}
        {allTemplates.length === 0 ? (
          <EmptyState icon={<TemplatesIllustration />} title="No templates yet" description="Templates will appear here once content is added to the library." size="lg" />
        ) : displayedTemplates.length === 0 ? (
          <EmptyState
            icon={<SearchIllustration />}
            title="No templates match your search"
            description="Try different keywords, fewer filters, or browse the full library."
            action={<Button variant="secondary" onClick={clearAllFilters}>Browse all templates</Button>}
            size="lg"
          />
        ) : (
          <StaggeredPageTransition>
            <TemplateCardGrid columns={4}>
              {displayedTemplates.map(t => (
                <StaggeredItem key={t.id}>
                  <div className="relative">
                    {isNew(t.created_at)       && <div className="absolute top-2 left-2 z-10"><Badge variant="success" size="sm">New</Badge></div>}
                    {(t.use_count ?? 0) >= popularityThreshold && popularityThreshold > 0 && <div className="absolute top-2 right-2 z-10"><Badge variant="default" size="sm">Popular</Badge></div>}
                    <TemplateCard
                      title={t.name}
                      description={t.description}
                      imageUrl={t.thumbnail}
                      orientation={t.orientation}
                      onSelect={() => {/* Phase 172 wires preview modal */}}
                    />
                  </div>
                </StaggeredItem>
              ))}
            </TemplateCardGrid>
          </StaggeredPageTransition>
        )}
      </PageContent>
    </PageLayout>
  );
}
```
*Source: project-internal synthesis of CONTEXT.md D-01…D-13 + UI-SPEC.md Layout/Interaction + `src/design-system/` component APIs + fuse.js v7 options docs.*

## State of the Art

| Old Approach (legacy `SvgTemplateGalleryPage`) | Current Approach (Phase 171) | Why Changed | Impact |
|------------------------------------------------|------------------------------|-------------|--------|
| Sidebar collapsible filters (categories, industries, tags) | Inline horizontal filter bar above grid | CONTEXT D-05 — "maximizes grid space" | More cards visible simultaneously; better mobile collapse story |
| Horizontal scroll sections (Featured / Popular / Recent) | Flat grid + sort dropdown | CONTEXT D-01 — sort options replace curated sections | Simpler mental model; sortable; shareable via URL |
| Hard-coded `FILTER_CONFIG` (50+ static values) | Derived from `allTemplates` distinct values | v20.0 Tech Debt — drift between UI and DB | New admin-uploaded categories auto-appear in dropdown |
| Client filter via `useState` | Client filter via `useSearchParams` | TDSC-04 — shareable URLs | Back button + bookmarking both work |
| `fetchSvgTemplates` 3-source JS merge | `fetchGalleryTemplates` (single VIEW) | Phase 170 delivered | No filter divergence (Pitfall 1) |
| `sessionStorage.pendingTemplate` handoff | `onSelect` stub for Phase 171, URL-param+DB fetch in Phase 172 | Pitfall 4 | No race conditions; multi-tab safe |
| Two search boxes (sidebar + header) | Single `SearchBar` in filter bar | UI-SPEC — unified search state | No user confusion |
| `FileType` icon fallback in thumbnail | `LayoutTemplate` icon via `TemplateCard` default | Already in design system | Consistency with rest of app |

**Deprecated/outdated:**
- `FILTER_CONFIG` hardcoded list → removed with legacy page
- `sessionStorage.pendingTemplate` write → removed with legacy page (read side remains in `SvgEditorPage` for Phase 172 to migrate)
- `showMoreFilters` / `expandedFilters` collapsible sidebar state → removed
- `activeView === 'your-designs'` user-designs view → removed from gallery (user designs are rendered in the gallery as regular rows via `created_by = auth.uid()` — no separate "Your Designs" section per CONTEXT boundary)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `useSearchParams` works inside `App.jsx`'s `pageMap[currentPage]` render path because `App.jsx` is mounted inside `AppRouter.jsx` `<Routes>` tree | Pitfall 4 | [VERIFIED via grep: `TemplatesPage.jsx:8`, `CampaignEditorPage.jsx:2`, `CampaignsPage.jsx:2`, and 5 others use `useNavigate` from `react-router-dom` successfully — same tree constraint. If `useNavigate` works, `useSearchParams` works.] — downgraded to VERIFIED |
| A2 | Popularity threshold of "top 20%" for "Popular" badge is the right heuristic | Pattern 5 code example | [ASSUMED] UI-SPEC says "Popular" but doesn't define the threshold. Alternative is fixed `use_count ≥ 10`. **Planner should surface this to user for a decision** — risk is wrong if the threshold is embarrassing (e.g., zero-use templates get "Popular" badge). |
| A3 | "New" badge window is 30 days | Pattern 5 code example + TGAL-04 | [CITED: v20.0 SUMMARY.md §Features "New badge (30-day auto-expiry)"] — but TGAL-04 says "configurable"; Phase 171 ships a constant. Planner may decide to add a config env var or `.planning/` constant. |
| A4 | Service's return shape is snake_case raw VIEW rows (not camelCased) | Anti-Patterns | [VERIFIED: `src/services/templateGalleryService.js` line 36 JSDoc: "D-08: Raw VIEW rows (snake_case from Postgres). Callers handle casing." + migration 167 lines 217-272 SELECT uses raw column names] |
| A5 | Repeated URL params (`?tags=a&tags=b`) is the safer encoding vs. comma-separated | Pitfall 5 | [CITED: `URLSearchParams.getAll()` / `.append()` WhatWG URL spec] — trade-off is slightly longer URLs but unambiguous parsing. Planner's discretion. |
| A6 | `TemplateCard` does NOT need extension to support "New"/"Popular" badges — absolute-positioned siblings in a wrapper `<div>` are sufficient | Pitfall 7 | [ASSUMED] Workaround via wrapper `<div className="relative">`. Alternative: extend `TemplateCard` with a `badges` prop. Minimum-diff path is wrapper. |
| A7 | Catalog will stay under 200 templates through end of v20.0 (so virtualization stays out of scope) | Don't Hand-Roll | [CITED: STATE.md Phase 175 goal is "at least 100 net-new SVG templates"; current seed is 12 → end-state ~112 well under 200 threshold] |
| A8 | User designs (`created_by = auth.uid()` rows in `svg_templates`) remain visible in the new gallery and are not a separate "Your Designs" section | State of the Art | [CITED: CONTEXT.md "Replace the legacy SvgTemplateGalleryPage with a modern TemplateGalleryPage that lets users browse..." — no mention of Your Designs carving. CONTEXT mentions `svgTemplateService.fetchUserSvgDesigns()` under "Integration Points: evaluate whether to include in new page" — this is Claude's discretion. **Recommend planner surface this decision: include user designs as regular cards OR hide them OR add a `?filter=mine` URL param.** Risk: losing current "Your Designs" discoverability for users who rely on it.] |

**If this table is empty:** *Not empty — A2, A3, A6, A8 should be surfaced to the user during planning for confirmation.*

## Open Questions (RESOLVED)

1. **"Popular" badge threshold** — UI-SPEC and CONTEXT say "high `use_count`" without a numeric cutoff.
   - What we know: `use_count` increment-on-apply is deferred to Phase 175; current seeded values may all be 0 or a fixed integer.
   - What's unclear: Is "top 20%" right? Or "use_count ≥ some fixed threshold"? Or "top N=5"?
   - Recommendation: **RESOLVED** — Use "top 20% with `use_count > 0`" in Phase 171; encoded in `171-02-PLAN.md` Task 1 as the `popularityThreshold` useMemo helper (`counts[Math.floor(counts.length * 0.2)]` with `Infinity` guard when all `use_count` values are 0). Revisit in Phase 175 when real usage data accumulates.

2. **"New" recency window** — TGAL-04 says "configurable recency window".
   - What we know: v20.0 SUMMARY suggests 30 days.
   - What's unclear: Where does the config live? Env var? Constant in page file? Admin UI setting?
   - Recommendation: **RESOLVED** — Plain JS module-scope constant `NEW_BADGE_WINDOW_DAYS = 30` at the top of `src/pages/TemplateGalleryPage.jsx`; encoded in `171-02-PLAN.md` Task 1 constants block and surfaced in must_haves.truths. "Configurable" in Phase 171 means "easy to change in source"; admin-UI exposure is explicitly deferred.

3. **User designs ("Your Designs" in legacy) inclusion** — CONTEXT lists `svgTemplateService.fetchUserSvgDesigns()` as an integration point to evaluate.
   - What we know: Legacy page has a separate "Your Designs" view via `activeView === 'your-designs'` state. `gallery_templates` VIEW already includes `svg_templates` rows where `created_by = auth.uid()` — so user designs ARE in the gallery fetch by default.
   - What's unclear: Should user designs mix into the main grid, be filtered out, or get their own chip filter ("My templates only")?
   - Recommendation: **RESOLVED** — User designs mix into the main grid naturally (VIEW already includes `svg_templates` rows where `created_by = auth.uid()`); encoded in `171-02-PLAN.md` Task 1 by NOT adding any `filter=mine` branch or separate "Your Designs" rendering path. A future `?mine=true` filter is deferred to Phase 173 alongside Favorites.

4. **"Tags" dropdown — single vs. multi-select** — UI-SPEC line 176 says "Multi-selection or single-selection. ... Default: 'All Tags'".
   - What we know: Design system `Select` is a standard HTML `<select>` (no native multi-select UI).
   - What's unclear: If multi-select is desired, a custom component is needed.
   - Recommendation: **RESOLVED** — Single-value dropdown UI in Phase 171 using the native design-system `<Select>`; URL wire format uses `searchParams.getAll('tags')` + `.append('tags', v)` so the multi-value URL contract is preserved for forward compatibility. Encoded in `171-02-PLAN.md` Task 1 filter-reader block (`tags: searchParams.getAll('tags')`) and surfaced in must_haves.truths. Multi-tag dismissible chip rendering is deferred to Phase 175 combobox work.

5. **Filter bar sticky behavior edge case** — UI-SPEC locks `sticky top-0 z-10`. The app's main content area at `App.jsx:947` is `<div className="flex-1 overflow-auto p-6">` — sticky works within that scroll container.
   - What we know: Confirmed by reading `App.jsx` main content wrapper.
   - What's unclear: Does `p-6` on the wrapper push the sticky bar 24px down instead of truly top-aligned?
   - Recommendation: **RESOLVED** — Accept the locked `sticky top-0 z-10` rule from UI-SPEC; visual verification is gated behind the human-verify checkpoint in `171-03-PLAN.md` Task 2 item (d). If `p-6` padding proves visually wrong, adjust with Tailwind negative-margin (`-mx-6 -mt-6 px-6 pt-6`) at implementation time without reopening UI-SPEC. Low-risk.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js + npm | Install fuse.js | ✓ | (project standard) | — |
| React 19 | UI render | ✓ | 19.1.1 (package.json) | — |
| react-router-dom v7 | `useSearchParams` (D-10) | ✓ | 7.9.5 (package.json) | — |
| framer-motion | Stagger + scaleHover animations | ✓ | 12.23.24 (package.json) | — |
| supabase-js client | VIEW read | ✓ | 2.80.0 | — |
| fuse.js | Client-side fuzzy search (D-06) | ✗ (NOT installed) | must install ^7.3.0 | None — required |
| Supabase VIEW `gallery_templates` | Data fetch | ✓ | migration 167 applied (git log) | — |
| `templateGalleryService.fetchGalleryTemplates` | Single gallery read path | ✓ | `src/services/templateGalleryService.js` | — |
| Playwright + Vitest | Testing | ✓ | 1.57.0 / 4.0.14 | — |
| `tests/e2e/fixtures/index.js` — `authenticatedPage` | E2E test login | ✓ | existing fixture | — |

**Missing dependencies with no fallback:**
- `fuse.js ^7.3.0` — single `npm install fuse.js` required in first task of plan.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.14 (unit/integration) + Playwright 1.57.0 (E2E) |
| Config file | `/Users/massimodamico/bizscreen/vitest.config.js`, `/Users/massimodamico/bizscreen/playwright.config.js` |
| Quick run command | `npm test -- tests/unit/pages/TemplateGalleryPage.test.jsx` |
| Full suite command | `npm run test:all` (unit + integration + E2E) |
| E2E quick | `npx playwright test tests/e2e/template-gallery.spec.js --project=chromium` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TGAL-01 | Grid renders template cards with orientation badges + hover states | E2E structural | `npx playwright test tests/e2e/template-gallery.spec.js -g "renders card grid"` | ❌ Wave 0 |
| TGAL-01 | Legacy `SvgTemplateGalleryPage` is deleted | Unit / filesystem | `test -f src/pages/SvgTemplateGalleryPage.jsx && exit 1 || exit 0` (assertion via grep or Vitest `expect(fs.existsSync(…)).toBe(false)`) | ❌ Wave 0 |
| TGAL-02 | Skeleton loading state renders before data arrives | Unit RTL | `npm test tests/unit/pages/TemplateGalleryPage.test.jsx -t "shows skeleton while fetching"` | ❌ Wave 0 |
| TGAL-02 | Error state renders with "Try again" when service returns error | Unit RTL | `npm test tests/unit/pages/TemplateGalleryPage.test.jsx -t "shows error state on fetch failure"` | ❌ Wave 0 |
| TGAL-03 | Sort reorders grid (Newest / Popular / Alpha / Recently Used) | Unit RTL | `npm test tests/unit/pages/TemplateGalleryPage.test.jsx -t "sort changes order"` | ❌ Wave 0 |
| TGAL-04 | "New" badge appears for templates with `created_at` within 30 days | Unit RTL | `npm test tests/unit/pages/TemplateGalleryPage.test.jsx -t "shows New badge on recent"` | ❌ Wave 0 |
| TGAL-05 | Responsive grid collapses to 1 col on mobile viewport | E2E viewport | `npx playwright test tests/e2e/template-gallery.spec.js -g "mobile single-column"` | ❌ Wave 0 |
| TDSC-01 | Search filters results within 500ms (sub-second) | E2E timing | `npx playwright test tests/e2e/template-gallery.spec.js -g "search filters instantly"` | ❌ Wave 0 |
| TDSC-02 | Category + tag + orientation filters narrow results | Unit RTL | `npm test tests/unit/pages/TemplateGalleryPage.test.jsx -t "filters narrow results"` | ❌ Wave 0 |
| TDSC-02 | Active filters render as dismissible chips | Unit RTL | `npm test tests/unit/pages/TemplateGalleryPage.test.jsx -t "active filters show as chips"` | ❌ Wave 0 |
| TDSC-03 | "Clear all" removes all filters + search in one click | Unit RTL | `npm test tests/unit/pages/TemplateGalleryPage.test.jsx -t "clear all resets"` | ❌ Wave 0 |
| TDSC-04 | URL reflects filter state; navigating to URL restores filters | E2E | `npx playwright test tests/e2e/template-gallery.spec.js -g "URL-synced filters"` | ❌ Wave 0 |
| TDSC-05 | Empty state with `SearchIllustration` shows when zero results | Unit RTL | `npm test tests/unit/pages/TemplateGalleryPage.test.jsx -t "shows no-results empty state"` | ❌ Wave 0 |
| pageMap alias safety (Pitfall 1) | `App.jsx pageMap['template-marketplace']` renders new component | Unit | `npm test tests/unit/pages/templateMarketplaceAlias.test.jsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- tests/unit/pages/TemplateGalleryPage.test.jsx` (runs in <5s)
- **Per wave merge:** `npm test && npx playwright test tests/e2e/template-gallery.spec.js --project=chromium` (unit suite + E2E for the new page)
- **Phase gate:** `npm run test:all` green before `/gsd-verify-work` — per-project convention

### Wave 0 Gaps
- [ ] `tests/unit/pages/TemplateGalleryPage.test.jsx` — covers TGAL-02, TGAL-03, TGAL-04, TDSC-02, TDSC-03, TDSC-05 + reads from mocked `templateGalleryService.fetchGalleryTemplates`. Uses `BrowserRouter` wrapper (see `tests/unit/pages/DashboardPage.test.jsx:13` pattern).
- [ ] `tests/unit/pages/templateMarketplaceAlias.test.jsx` — asserts `pages['template-marketplace'] === pages['templates']` OR both lazy-import the same module. Covers Pitfall 1.
- [ ] `tests/e2e/template-gallery.spec.js` — covers TGAL-01 (structural presence), TGAL-05 (mobile viewport), TDSC-01 (search timing), TDSC-04 (URL round-trip). Use existing `authenticatedPage` fixture + structural assertions only (TQAL-05 pattern — do NOT assert exact template counts since Phase 175 will add ~100 more).
- [ ] Unit test `tests/unit/services/templateGalleryService.test.js` — NOT created in Phase 170; NOT required for Phase 171 (service is Phase 170's responsibility); only add if filter/sort pipeline logic is extracted to a pure helper. Planner decides.

## Security Domain

`security_enforcement` is absent in `.planning/config.json` → treat as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Auth is handled upstream in `AppRouter.jsx RequireAuth`; page receives authenticated user only |
| V3 Session Management | no | Session is Supabase JWT; no new session surface |
| V4 Access Control | yes | RLS enforces tenant isolation at VIEW layer (Phase 170); page MUST NOT bypass via service-role key (it doesn't — uses standard supabase client from `src/supabase.js`) |
| V5 Input Validation | yes | Search query + URL params are user-controlled strings; must be URL-safe (already handled by `URLSearchParams`) and must not be injected into DOM via `dangerouslySetInnerHTML` (they aren't — all rendering is React text) |
| V6 Cryptography | no | No crypto in this phase |
| V7 Error Handling | yes | Fetch errors must not leak Supabase internals; `EmptyState` copy "Couldn't load templates" is user-appropriate; console.error is OK for debugging |
| V8 Data Protection | yes | localStorage "Recently Used" MUST be namespaced by `user.id` to prevent cross-tenant leakage during impersonation (Pitfall 8) |
| V13 API Communications | partial | `fetchGalleryTemplates()` inherits Supabase's HTTPS + RLS; no net-new API surface in this phase |
| V14 Config | no | No secrets, no new env vars |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via template name/description rendered from DB | Tampering / Elevation | React text interpolation (not `dangerouslySetInnerHTML`); thumbnails are `<img src>` not inline SVG (see v20.0 PITFALLS §Performance); DOMPurify not required for plain text fields |
| Cross-tenant `svg_templates` read | Information Disclosure | Already fixed in migration 167 RLS swap (Phase 170 TDAT-03); Phase 171 page inherits. Do NOT add a service-role client to this page |
| localStorage leak during super-admin impersonation | Information Disclosure | Namespace `recentTemplates` key by `user.id` (Pitfall 8) |
| URL param injection producing UI crash | DoS | `URLSearchParams` normalizes input; `fuse.search()` tolerates arbitrary strings; render never trusts params for anything beyond state |
| Open redirect via malicious share URL | Tampering | URL params stay within `/app#templates` — no redirect surface in Phase 171 |

## Sources

### Primary (HIGH confidence)
- **`.planning/phases/171-core-gallery-ui-redesign/171-CONTEXT.md`** — Locked decisions D-01…D-13
- **`.planning/phases/171-core-gallery-ui-redesign/171-UI-SPEC.md`** — Visual/interaction contract
- **`.planning/REQUIREMENTS.md`** — TGAL-01…05, TDSC-01…05 acceptance criteria
- **`.planning/milestones/v20.0-phases/170-data-layer-foundation/170-CONTEXT.md`** — Phase 170 decisions that constrain the VIEW shape (D-03 editor_type discriminator, D-08 snake_case, D-09 no caching)
- **`src/services/templateGalleryService.js`** (Phase 170 output) — service contract
- **`src/design-system/index.js` + component files** — full component inventory verified (TemplateCard, TemplateCardGrid, TemplateCardSkeleton, SearchBar, FilterChips, ToggleChips, EmptyState, Badge, PageLayout, StaggeredPageTransition, motion primitives)
- **`src/pages/SvgTemplateGalleryPage.jsx`** — legacy page (reference for feature parity, things to REMOVE)
- **`src/App.jsx`** lines 128, 531, 558, 563 — pageMap alias sites
- **`supabase/migrations/167_gallery_templates_view_and_rls.sql`** — VIEW column schema (21 cols, snake_case)
- **`package.json`** — verified installed versions: react-router-dom 7.9.5, framer-motion 12.23.24, react 19.1.1, NO fuse.js
- **`tests/e2e/fixtures/index.js`** + `tests/unit/pages/DashboardPage.test.jsx` — test patterns
- **`.planning/research/STACK.md`** and **`.planning/research/PITFALLS.md`** — pre-research for v20.0 (HIGH confidence, verified against codebase)

### Secondary (MEDIUM confidence)
- **fuse.js docs** via Context7 `/websites/fusejs_io` — options, weighted search, threshold semantics
- **React Router v7 docs** — `useSearchParams` behavior, `{ replace: true }` semantics
- **WhatWG URL spec** — `URLSearchParams.getAll()` / `.append()` for repeated params

### Tertiary (LOW confidence)
- None — all findings are verified against codebase or official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every lib verified via `package.json` and `npm view`
- Architecture: HIGH — every component verified in `src/design-system/` source
- Pitfalls: HIGH — pulled from direct codebase inspection + v20.0 pre-research which itself verified against this codebase
- Validation architecture: MEDIUM — test patterns confirmed via existing fixtures, but specific test files are Wave 0 (don't yet exist)

**Research date:** 2026-04-19
**Valid until:** 2026-05-19 (30 days — stable; all decisions are locked by CONTEXT + UI-SPEC)
