# Phase 47: Template Browse Premium - Research

**Researched:** 2026-02-10
**Domain:** UI/UX - Template browsing page with premium visual polish, responsive grid, animations, skeleton loading, and instant search
**Confidence:** HIGH

## Summary

Phase 47 is a visual polish and UX upgrade to the existing template browsing experience. The codebase already has **three separate template browsing surfaces** with overlapping but inconsistent implementations: `TemplatesPage.jsx` (content templates, currently unused/prefixed with `_`), `TemplateMarketplacePage.jsx` (scene templates), and `SvgTemplateGalleryPage.jsx` (SVG templates, currently the active `/templates` route). The goal is to make one of these (or a refactored version) deliver a "premium first impression" with large thumbnails, hover micro-interactions, skeleton loading, instant search, and responsive grid layout.

The project already has **all required dependencies** installed: Framer Motion 12.x for animations, Tailwind CSS 3.4.x for responsive grids, a comprehensive design system with motion primitives (`src/design-system/motion.js`), reusable skeleton components (`src/components/Skeleton.jsx`), a design-system `TemplateCard` with skeleton variant (`src/design-system/components/TemplateCard.jsx`), and an `OptimizedImage` component with lazy loading and placeholder states. The search debounce pattern (300ms) is already implemented in `TemplatesPage.jsx`. **Zero new npm dependencies are needed.**

**Primary recommendation:** Enhance the existing `TemplateGrid` and design-system `TemplateCard`/`TemplateCardSkeleton` components to meet the premium requirements (larger thumbnails, Framer Motion hover effects, skeleton grids), then integrate them into whichever template browsing page is the active route. Use the existing design system motion primitives (`scaleHover`, `cssTransitions.cardHover`, `staggerContainer`/`staggerItem`) rather than creating new animation code. Use the existing `TemplateCardGrid` responsive breakpoint pattern (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`) which already satisfies BROWSE-05.

## Standard Stack

### Core (Already Installed - Zero New Dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.1.1 | UI framework | Project foundation |
| Framer Motion | ^12.23.24 | Hover/enter animations, AnimatePresence | Already used in 13+ files for modals, drawers, panels, stagger animations |
| Tailwind CSS | ^3.4.18 | Responsive grid, utility classes, hover states | Project standard, all existing templates use it |
| Lucide React | ^0.548.0 | Icons | Project standard |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/design-system/motion.js` | N/A | Motion primitives (scaleHover, staggerContainer, cssTransitions) | All animation needs for this phase |
| `src/components/Skeleton.jsx` | N/A | Skeleton loading components (SkeletonImage, SkeletonCardGrid) | Loading state for template grid |
| `src/design-system/components/TemplateCard.jsx` | N/A | TemplateCard, TemplateCardGrid, TemplateCardSkeleton | Base components to enhance |
| `src/components/OptimizedImage.jsx` | N/A | Lazy loading images with blur placeholder | Thumbnail loading |
| `src/design-system/components/SearchBar.jsx` | N/A | Reusable search input with clear button | Template search UI |
| `src/design-system/components/FilterChips.jsx` | N/A | Category filter chips | Category filtering UI |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS `animate-pulse` for skeleton | Framer Motion shimmer | CSS pulse is simpler and already used across 34 files; Framer Motion adds complexity for no visual benefit here |
| Tailwind CSS grid | CSS Grid with custom breakpoints | Tailwind is the project standard; custom CSS would diverge from patterns |
| Custom debounce | lodash debounce | Codebase already has `useDebounce` hook in TemplatesPage; reuse it or extract to shared hooks |

**Installation:**
```bash
# No installation needed - all dependencies already present
```

## Architecture Patterns

### Current File Structure (Relevant)
```
src/
├── pages/
│   ├── TemplatesPage.jsx              # Content templates page (currently prefixed _ / unused)
│   ├── TemplateMarketplacePage.jsx     # Scene template marketplace
│   ├── SvgTemplateGalleryPage.jsx      # SVG templates (CURRENTLY ACTIVE on /templates route)
│   └── LayoutTemplates/
│       └── LayoutTemplatesPage.jsx     # Layout templates gallery
├── components/
│   ├── templates/
│   │   ├── TemplateGrid.jsx            # Grid + card with hover overlay (marketplace)
│   │   ├── TemplatePreviewPopover.jsx  # Hover preview popover with delay
│   │   ├── TemplatePreviewPanel.jsx    # Slide-in panel (uses Framer Motion drawer)
│   │   ├── FeaturedTemplatesRow.jsx    # Featured templates horizontal section
│   │   └── index.js                    # Barrel exports
│   ├── Skeleton.jsx                    # Comprehensive skeleton components
│   └── OptimizedImage.jsx              # Lazy loading image with placeholder
├── design-system/
│   ├── components/
│   │   ├── TemplateCard.jsx            # Design system template card + skeleton + grid
│   │   ├── Card.jsx                    # Base card with interactive hover states
│   │   ├── SearchBar.jsx               # Reusable search input
│   │   ├── FilterChips.jsx             # Category filter chips
│   │   └── EmptyState.jsx              # Empty state + Placeholder skeleton
│   ├── motion.js                       # Motion primitives (scaleHover, stagger, etc.)
│   ├── tokens.css                      # Design tokens (shadows, transitions, radii)
│   └── index.js                        # Barrel exports
├── services/
│   ├── templateService.js              # Content template CRUD + search + pagination
│   ├── svgTemplateService.js           # SVG template fetch
│   └── marketplaceService.js           # Marketplace template operations
└── hooks/
    └── useLayoutTemplates.js           # Layout template hook
```

### Pattern 1: Motion-Enhanced Card with Framer Motion
**What:** Wrap template cards in `motion.div` with `whileHover` for lift/shadow effect
**When to use:** Template card hover interactions (BROWSE-02)
**Example:**
```jsx
// Use existing design-system motion primitives
import { motion } from 'framer-motion';
import { scaleHover, duration, easing } from '../design-system/motion';

// Template card with premium hover effect
<motion.div
  whileHover={{
    scale: 1.02,
    y: -4,
    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  }}
  transition={{ duration: duration.fast, ease: easing.smooth }}
  className="rounded-xl overflow-hidden bg-white border border-gray-200"
>
  {/* card content */}
</motion.div>
```

### Pattern 2: Staggered Grid Entry Animation
**What:** Cards animate in sequentially when grid first loads or search results change
**When to use:** Initial page load and search result transitions
**Example:**
```jsx
// Use existing staggerContainer + staggerItem from motion.js
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '../design-system/motion';

<motion.div
  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
  variants={staggerContainer.animate.transition}
  initial="initial"
  animate="animate"
>
  {templates.map((template) => (
    <motion.div key={template.id} variants={staggerItem}>
      <TemplateCard template={template} />
    </motion.div>
  ))}
</motion.div>
```

### Pattern 3: Skeleton Grid Matching Final Layout
**What:** Skeleton placeholders that exactly match the card dimensions (including 240px+ thumbnail height)
**When to use:** While templates are loading (BROWSE-03)
**Example:**
```jsx
// Extend existing TemplateCardSkeleton from design-system
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
  {Array.from({ length: 8 }).map((_, i) => (
    <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="h-60 bg-gray-200 animate-pulse" /> {/* Matches 240px min thumbnail height */}
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
      </div>
    </div>
  ))}
</div>
```

### Pattern 4: Debounced Search with URL Sync
**What:** Search input debounced at 300ms, synced to URL params for bookmarkability
**When to use:** Template search (BROWSE-04)
**Example:**
```jsx
// Pattern already exists in TemplatesPage.jsx (lines 98-107, 124-126)
const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
const debouncedSearch = useDebounce(searchInput, 300);

// useDebounce hook (already in TemplatesPage, extract to shared hook)
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}
```

### Pattern 5: Responsive 4-Column Grid
**What:** Grid that adapts from 4 columns on desktop to 1 on mobile
**When to use:** Main template grid (BROWSE-05)
**Example:**
```jsx
// Already exists in TemplateCardGrid (design-system) and TemplateGrid (components)
// Standard pattern used across 20+ grid instances in codebase:
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
  {/* cards */}
</div>
```

### Anti-Patterns to Avoid
- **Don't create a fourth template page:** Enhance one of the existing three (most likely enhance `SvgTemplateGalleryPage` or switch back to `TemplatesPage` since it already has the richest feature set)
- **Don't use `aspect-video` for 240px+ thumbnails:** The current `aspect-video` on `TemplateCard` produces ~180px height at typical card widths; use explicit `min-h-[240px]` or `h-60` (240px) instead
- **Don't use `Loader2` spinner for initial load:** Replace with skeleton grid (BROWSE-03 explicitly says "not spinners")
- **Don't add hover animations to overlay buttons:** Only the card itself should lift/scale; inner buttons should have their own subtle transitions
- **Don't use `transition-all` on cards with images:** It can cause layout thrash; use `transition-shadow transition-transform` specifically

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Skeleton loading | Custom shimmer CSS | `animate-pulse` + existing `Skeleton` / `TemplateCardSkeleton` components | Already battle-tested across 34 files |
| Hover animations | Manual CSS transitions | Framer Motion `whileHover` + design-system `scaleHover` primitive | Consistent with existing pattern, hardware-accelerated |
| Debounced search | Custom debounce function | Extract existing `useDebounce` from TemplatesPage to shared hook | Already proven in production |
| Responsive grid | Custom media queries | Tailwind `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4` | Standard pattern used 20+ times in codebase |
| Image lazy loading | Custom IntersectionObserver | `loading="lazy"` HTML attribute + `OptimizedImage` component | Browser-native, existing component handles error/placeholder |
| Category filter chips | Custom filter buttons | Design-system `FilterChips` component | Already has active state, overflow handling, clear button |
| Search bar | Custom input | Design-system `SearchBar` component | Already has clear button, size variants, pill variant |

**Key insight:** Every UI piece needed for this phase already exists as a building block in the codebase. The work is enhancement and assembly, not creation from scratch.

## Common Pitfalls

### Pitfall 1: Layout Shift During Image Load (CLS)
**What goes wrong:** Template thumbnails load asynchronously; without reserved space, the grid jumps as images appear.
**Why it happens:** Images without explicit dimensions or aspect-ratio containers cause reflow.
**How to avoid:** Always wrap thumbnails in a container with fixed height (`h-60` = 240px) or `aspect-ratio`. Use the `OptimizedImage` pattern that shows `animate-pulse` placeholder until `onLoad` fires.
**Warning signs:** Cards visibly jump/reflow after page appears to be loaded.

### Pitfall 2: Jittery Hover Animations
**What goes wrong:** Scale + translate on hover causes visible jitter, especially with borders/shadows.
**Why it happens:** Using `transition-all` animates properties that shouldn't animate (border, padding). Or using CSS transitions instead of Framer Motion's hardware-accelerated transforms.
**How to avoid:** Use Framer Motion `whileHover` for transform/shadow (GPU-accelerated). Only animate `transform` and `box-shadow`. Don't animate border-color as part of the hover lift.
**Warning signs:** Cards flicker or shift neighboring cards during hover.

### Pitfall 3: Search Debounce Causing Stale Closures
**What goes wrong:** Debounced search fires with stale filter state, producing wrong results.
**Why it happens:** The debounce callback captures old state values.
**How to avoid:** Use `useCallback` with correct dependency arrays. The existing pattern in `TemplatesPage` already handles this correctly with `useEffect` + `setTimeout` (not `useCallback`-based debounce).
**Warning signs:** Search results don't match when rapidly changing both search text and category filters.

### Pitfall 4: Skeleton Dimensions Don't Match Final Cards
**What goes wrong:** Skeleton placeholders are a different height than loaded cards, causing a visible "jump" when data arrives.
**Why it happens:** Skeleton was built with `aspect-video` (16:9 ratio) but final cards use a taller thumbnail.
**How to avoid:** Ensure skeleton thumbnail placeholder uses the exact same height class (`h-60`) as the loaded card thumbnail. Test side-by-side.
**Warning signs:** Page visibly shifts when loading completes.

### Pitfall 5: Filter State Not URL-Synced
**What goes wrong:** User applies category filter + search, refreshes page, loses filter state.
**Why it happens:** Filters stored only in React state, not URL search params.
**How to avoid:** Follow the existing pattern from `TemplatesPage` which syncs category, type, search, and page to URL search params via `useSearchParams`.
**Warning signs:** Browser back button doesn't undo filter changes.

### Pitfall 6: Missing Grid Column for md Breakpoint
**What goes wrong:** Grid jumps from 2 columns directly to 4 columns, skipping 3-column layout.
**Why it happens:** Using `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` without `md:grid-cols-3`.
**How to avoid:** Always include all four breakpoints: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`. This is already the pattern in `TemplateGrid.jsx` and `TemplateCardGrid`.
**Warning signs:** Awkward layout on tablet-sized screens (~768-1024px).

## Code Examples

### Large Thumbnail Card with Hover Lift (BROWSE-01 + BROWSE-02)
```jsx
// Enhance existing TemplateCard or create PremiumTemplateCard
import { motion } from 'framer-motion';
import { duration, easing } from '../../design-system/motion';

function PremiumTemplateCard({ template, onClick, onQuickApply }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <motion.div
      whileHover={{
        y: -4,
        boxShadow: 'var(--shadow-xl)',
      }}
      transition={{ duration: duration.fast, ease: easing.smooth }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer"
      onClick={() => onClick?.(template)}
    >
      {/* Thumbnail - 240px minimum height */}
      <div className="relative h-60 bg-gray-100 overflow-hidden">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}
        {template.thumbnail_url && (
          <img
            src={template.thumbnail_url}
            alt={template.name}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
        {/* Badges overlay */}
        <div className="absolute top-3 right-3">
          <Badge variant={getBadgeVariant(template.type)}>
            {getTypeLabel(template.type)}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm truncate">{template.name}</h3>
        {template.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{template.description}</p>
        )}
        <div className="flex items-center gap-2 mt-3">
          {template.category && (
            <Badge variant="neutral" size="sm">{template.category}</Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
}
```

### Skeleton Grid (BROWSE-03)
```jsx
function TemplateSkeletonGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-gray-200 rounded-xl overflow-hidden"
        >
          {/* Thumbnail skeleton - matches h-60 of real card */}
          <div className="h-60 bg-gray-200 animate-pulse" />
          {/* Content skeleton */}
          <div className="p-4 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
            <div className="flex gap-2 mt-3">
              <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Responsive Grid with Stagger Animation (BROWSE-05)
```jsx
import { motion } from 'framer-motion';

const gridContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const gridItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  },
};

<motion.div
  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
  variants={gridContainerVariants}
  initial="hidden"
  animate="visible"
>
  {templates.map((template) => (
    <motion.div key={template.id} variants={gridItemVariants}>
      <PremiumTemplateCard template={template} />
    </motion.div>
  ))}
</motion.div>
```

## State of the Art

| Old Approach (Current) | New Approach (Phase 47) | Impact |
|------------------------|------------------------|--------|
| `h-40` / `h-44` thumbnail height | `h-60` (240px) thumbnail height | Larger, more impactful thumbnails (BROWSE-01) |
| CSS `hover:shadow-md` + `transition-shadow` | Framer Motion `whileHover` with y-translate + shadow | Smoother, GPU-accelerated lift effect (BROWSE-02) |
| `<Loader2>` spinner for initial load | Skeleton grid matching card dimensions | No raw spinners, smooth perceived loading (BROWSE-03) |
| `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` (TemplatesPage) | `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4` | Full 4-column desktop + proper breakpoints (BROWSE-05) |
| No image load transition | `OptimizedImage`-style fade-in on load | No layout shift, progressive reveal |
| Spinner + bare page while loading | Skeleton-to-content transition | Premium perceived performance |

**Deprecated/outdated patterns in current code:**
- `TemplatesPage.jsx`: Prefixed with `_` and unused; has rich feature set but uses `Loader2` spinner and `h-40` thumbnails
- `SvgTemplateGalleryPage.jsx`: Currently active but uses inline `TemplateCard` component (not design-system), has `hover:scale-[1.02]` CSS rather than Framer Motion, and uses `Loader2` spinner for loading

## Existing Components Inventory (Decision Required)

The codebase has **three overlapping template card implementations** that need consolidation:

| Component | Location | Thumbnail Height | Hover Effect | Grid Columns | Loading State |
|-----------|----------|-------------------|--------------|--------------|---------------|
| Design-system `TemplateCard` | `src/design-system/components/TemplateCard.jsx` | `aspect-video` (~180px) | CSS `hover:shadow-elevated` | 4-col via `TemplateCardGrid` | `TemplateCardSkeleton` with `animate-pulse` |
| Templates `TemplateCard` | `src/components/templates/TemplateGrid.jsx` | `aspect-video` | CSS `hover:shadow-md` + overlay | 4-col | None built-in |
| SvgGallery `TemplateCard` | `src/pages/SvgTemplateGalleryPage.jsx` (inline) | `h-44` / `h-64` | CSS `hover:scale-[1.02] hover:-translate-y-1` | 4-col | `Loader2` spinner |

**Recommendation:** Enhance the **design-system `TemplateCard`** (which already has a skeleton variant) to meet premium requirements, then use it across whichever page is active. This avoids creating a fourth implementation.

## Open Questions

1. **Which template page to enhance?**
   - What we know: `/templates` route currently renders `SvgTemplateGalleryPage`. The old `TemplatesPage` (content templates) is unused but has the richest feature set (favorites, search, pagination, categories). `TemplateMarketplacePage` is on a separate route.
   - What's unclear: Does Phase 47 target the SVG template gallery, the content templates page, or a new unified page?
   - Recommendation: The planner should target whichever page is currently active on the `/templates` route (`SvgTemplateGalleryPage`), or restore `TemplatesPage` as the active route since it already has search, categories, and pagination built in. The requirements don't mention SVG-specific features, so enhancing the general `TemplatesPage` seems most aligned.

2. **Should the inline TemplateCard in SvgTemplateGalleryPage be replaced?**
   - What we know: It's defined inline in the page component (not reusable). The design-system already has `TemplateCard`.
   - What's unclear: Whether Phase 47 is scoped to also clean up the SVG gallery or just polish one page.
   - Recommendation: If enhancing `SvgTemplateGalleryPage`, replace its inline card with the enhanced design-system `TemplateCard`. If switching to `TemplatesPage`, that page already uses a Card-based structure.

3. **Category data source**
   - What we know: `templateService.fetchTemplateCategories()` returns from `template_categories` table. `SvgTemplateGalleryPage` uses hardcoded `FILTER_CONFIG` categories.
   - What's unclear: Which category system to use for filters.
   - Recommendation: Use the database-backed `fetchTemplateCategories()` from `templateService` for dynamic, maintainable categories.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/design-system/motion.js` - Verified motion primitives (scaleHover, staggerContainer, staggerItem, cssTransitions.cardHover)
- Codebase inspection: `src/design-system/components/TemplateCard.jsx` - Verified TemplateCardSkeleton, TemplateCardGrid, aspect-ratio handling
- Codebase inspection: `src/components/Skeleton.jsx` - Verified comprehensive skeleton component library
- Codebase inspection: `src/components/OptimizedImage.jsx` - Verified lazy loading pattern with blur placeholder
- Codebase inspection: `src/pages/TemplatesPage.jsx` - Verified search debounce, category filters, URL param sync
- Codebase inspection: `src/pages/SvgTemplateGalleryPage.jsx` - Verified current active template page, inline card, hover patterns
- Codebase inspection: `src/design-system/tokens.css` - Verified shadow tokens (--shadow-elevated, --shadow-xl, --shadow-2xl)
- Codebase inspection: `tailwind.config.js` - Verified custom shadows (card, elevated, focus-brand), border-radius (card: 12px), shimmer animation
- Codebase inspection: `package.json` - Verified framer-motion ^12.23.24, tailwindcss ^3.4.18, react ^19.1.1, lucide-react ^0.548.0
- Codebase inspection: `src/App.jsx` - Verified `/templates` route renders `SvgTemplateGalleryPage`, `_TemplatesPage` is unused

### Secondary (MEDIUM confidence)
- Framer Motion `whileHover` API: Based on existing usage in `src/design-system/motion.js` (`scaleHover` preset uses `whileHover: { scale: 1.02 }`)
- Tailwind responsive grid pattern: Verified across 20+ grid instances in codebase using `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified in package.json, all dependencies already installed
- Architecture: HIGH - All patterns verified through direct codebase inspection of existing implementations
- Pitfalls: HIGH - Based on observed inconsistencies in current code (three card implementations, mismatched skeleton heights, spinner vs skeleton loading)

**Research date:** 2026-02-10
**Valid until:** 2026-03-12 (stable - no dependency changes expected)
