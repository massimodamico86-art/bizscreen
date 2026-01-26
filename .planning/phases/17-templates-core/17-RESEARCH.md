# Phase 17: Templates Core - Research

**Researched:** 2026-01-25
**Domain:** Template Marketplace UI with Browse/Search/Preview/Apply workflow
**Confidence:** HIGH

## Summary

Phase 17 implements the user-facing template marketplace for browsing, searching, previewing, and applying scene templates. The database infrastructure already exists (`template_library`, `template_library_slides`, `template_categories`) with RPC functions for access control and template cloning. A basic `TemplateMarketplacePage.jsx` and `TemplatePreviewModal.jsx` already exist but need enhancement to match the CONTEXT decisions.

The existing codebase provides strong foundations:
- **Database layer**: Complete with `get_marketplace_templates` RPC, `clone_template_to_scene` function, license tier checking
- **Service layer**: `marketplaceService.js` with all needed API calls
- **UI components**: Design system has `TemplateCard`, `SearchBar`, `FilterChips`, drawer animation patterns
- **Motion**: Framer Motion with `drawer.right` animation preset

**Primary recommendation:** Enhance the existing `TemplateMarketplacePage.jsx` with: (1) persistent left sidebar for category navigation, (2) live debounced search, (3) larger grid cards with hover overlays, (4) right slide-in panel for preview instead of modal, (5) featured templates row at top.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.1.1 | UI framework | Already in use |
| react-router-dom | 7.9.5 | URL params for filters | Already in use, supports `useSearchParams` |
| framer-motion | 12.23.24 | Animations | Already in use, `drawer.right` preset exists |
| Supabase JS | 2.80.0 | Backend API | Already in use for all data |
| lucide-react | 0.548.0 | Icons | Project standard |

### Supporting (Already in Design System)
| Library | Component | Purpose | When to Use |
|---------|-----------|---------|-------------|
| design-system | SearchBar | Search input with debounce | Top of marketplace |
| design-system | FilterChips | Category/orientation filters | Sidebar checkboxes |
| design-system | TemplateCard | Template display | Grid items |
| design-system | EmptyState | No results | Search empty state |
| design-system/motion | drawer.right | Slide-in panel | Preview panel |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom sidebar | Radix Sidebar | Overkill for simple list |
| Custom debounce | lodash debounce | Project already has useDebounce hook |
| Modal preview | Drawer panel | CONTEXT specifies side panel (drawer) |

**No additional packages needed** - all functionality can be built with existing dependencies.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── pages/
│   └── TemplateMarketplacePage.jsx    # ENHANCE existing (main page)
├── components/
│   └── templates/
│       ├── TemplatePreviewPanel.jsx   # NEW - right slide-in panel
│       ├── TemplateSidebar.jsx        # NEW - left category sidebar
│       ├── TemplateGrid.jsx           # NEW - grid with hover overlays
│       ├── FeaturedTemplatesRow.jsx   # NEW - featured section at top
│       └── index.js                   # UPDATE exports
├── services/
│   └── marketplaceService.js          # EXISTS - already complete
└── design-system/
    └── components/
        └── TemplateCard.jsx           # EXISTS - may need minor tweaks
```

### Pattern 1: URL-Driven Filter State
**What:** Store all filter state (category, orientation, search) in URL params
**When to use:** Always for marketplace pages - enables bookmarking, sharing, browser back
**Example:**
```javascript
// From existing TemplateMarketplacePage.jsx
const [searchParams, setSearchParams] = useSearchParams();
const categoryId = searchParams.get('category') || '';
const orientation = searchParams.get('orientation') || '';
const search = searchParams.get('q') || '';

const updateFilters = (updates) => {
  const newParams = new URLSearchParams(searchParams);
  Object.entries(updates).forEach(([key, value]) => {
    if (value) newParams.set(key, value);
    else newParams.delete(key);
  });
  setSearchParams(newParams);
};
```

### Pattern 2: Debounced Search with Live Filtering
**What:** Debounce user input, update URL after delay, grid reacts to URL
**When to use:** Search inputs that trigger API calls
**Example:**
```javascript
// From existing codebase pattern
const [searchInput, setSearchInput] = useState(search);

useEffect(() => {
  const timer = setTimeout(() => {
    if (searchInput !== search) {
      updateFilters({ q: searchInput || null });
    }
  }, 300); // 300ms debounce per CONTEXT
  return () => clearTimeout(timer);
}, [searchInput]);
```

### Pattern 3: Right Slide-In Panel (Not Modal)
**What:** Preview panel slides from right, grid remains visible behind
**When to use:** When context preservation matters (comparing templates)
**Example:**
```javascript
// Based on motion.js drawer.right preset
import { motion, AnimatePresence } from 'framer-motion';
import { drawer } from '../design-system/motion';

// Panel component
<AnimatePresence>
  {selectedTemplate && (
    <motion.div
      className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-xl z-40"
      {...drawer.right}
    >
      {/* Panel content */}
    </motion.div>
  )}
</AnimatePresence>
```

### Pattern 4: Template Apply with Auto-Redirect
**What:** Clone template to scene via RPC, redirect to editor immediately
**When to use:** One-click apply flow
**Example:**
```javascript
// From existing marketplaceService.js
import { installTemplateAsScene } from '../services/marketplaceService';
import { format } from 'date-fns';

const handleApply = async (template) => {
  const sceneName = `${template.name} - ${format(new Date(), 'MMM d, yyyy')}`;
  const sceneId = await installTemplateAsScene(template.id, sceneName);
  navigate(`/scene-editor/${sceneId}`);
};
```

### Anti-Patterns to Avoid
- **Loading all templates at once:** Use pagination or limit; marketplace could have hundreds
- **Client-side filtering:** Always filter via RPC for performance and consistency
- **Modal for preview:** CONTEXT specifies side panel to preserve browsing context
- **Blocking UI during apply:** Show loading state but keep grid visible

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Search debouncing | Custom setTimeout | `useDebounce` hook in `/src/legacy/hooks/` | Already handles cleanup |
| Template access check | Client-side plan check | `can_access_template` RPC | Server-authoritative |
| Template cloning | Manual insert + copy | `clone_template_to_scene` RPC | Handles slides, permissions |
| Category fetching | Direct table query | `fetchCategories()` in marketplaceService | Already cached pattern |
| Slide-in animation | CSS @keyframes | `drawer.right` from motion.js | Consistent timing |
| Loading skeletons | Custom divs | `TemplateCardSkeleton` from design-system | Already styled |
| Empty state | Custom message | `EmptyState` from design-system | Consistent styling |

**Key insight:** The backend RPC functions handle all complexity - access checks, tenant scoping, slide copying, install count tracking. Frontend just calls and displays.

## Common Pitfalls

### Pitfall 1: Forgetting Orientation Filter
**What goes wrong:** Only filtering by category, ignoring landscape/portrait
**Why it happens:** Orientation is in template metadata, not a top-level field
**How to avoid:** Pass `p_industry` or filter client-side from `metadata.orientation`
**Warning signs:** Users can't find portrait templates

### Pitfall 2: Preview Panel Blocking Interaction
**What goes wrong:** Panel covers entire page, can't browse while previewing
**Why it happens:** Using modal instead of side panel
**How to avoid:** Use fixed right panel (max 480px), grid shifts or stays visible
**Warning signs:** Users close preview to change selection

### Pitfall 3: Race Conditions in Search
**What goes wrong:** Fast typing shows stale results
**Why it happens:** Later request returns before earlier request
**How to avoid:** Use request ID or AbortController, only show latest result
**Warning signs:** Results don't match search input

### Pitfall 4: Broken Apply Flow
**What goes wrong:** Apply fails silently or user left on marketplace
**Why it happens:** Not handling RPC errors, not waiting for redirect
**How to avoid:** Show loading overlay on card, handle error with toast, await navigation
**Warning signs:** Users don't see their new scene

### Pitfall 5: Featured Templates Lost in Grid
**What goes wrong:** Featured templates mixed into regular grid
**Why it happens:** Not separating featured section
**How to avoid:** Dedicated row at top with `is_featured = true` filter
**Warning signs:** Users miss premium content

## Code Examples

Verified patterns from existing codebase:

### Fetching Templates with Filters
```javascript
// From marketplaceService.js - already implemented
export async function fetchMarketplaceTemplates(filters = {}) {
  const { data, error } = await supabase.rpc('get_marketplace_templates', {
    p_category_id: filters.categoryId || null,
    p_template_type: filters.templateType || null,
    p_license: filters.license || null,
    p_industry: filters.industry || null,
    p_search: filters.search || null,
    p_featured_only: filters.featuredOnly || false,
    p_limit: filters.limit || 50,
    p_offset: filters.offset || 0,
  });
  if (error) throw error;
  return data || [];
}
```

### Category Sidebar Pattern
```javascript
// Based on existing TemplateMarketplacePage sidebar
<aside className="w-64 flex-shrink-0">
  <div className="sticky top-4 space-y-6">
    {/* Categories */}
    <div className="space-y-1">
      <button
        onClick={() => updateFilters({ category: null })}
        className={`w-full text-left px-3 py-2 rounded-md text-sm ${
          !categoryId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        All Templates
      </button>
      {categories.map((cat) => (
        <button key={cat.id} onClick={() => updateFilters({ category: cat.id })} ...>
          {cat.name}
        </button>
      ))}
    </div>

    {/* Orientation checkboxes */}
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Orientation</h4>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={orientation === 'landscape'} onChange={...} />
        Landscape
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={orientation === 'portrait'} onChange={...} />
        Portrait
      </label>
    </div>
  </div>
</aside>
```

### Template Card with Hover Overlay
```javascript
// Based on existing TemplateCard.jsx pattern
<div className="group relative bg-white rounded-lg overflow-hidden border border-gray-200">
  {/* Large thumbnail */}
  <div className="aspect-video bg-gray-100 relative">
    <img src={template.thumbnail_url} className="w-full h-full object-cover" />

    {/* Hover overlay with title + Quick Apply */}
    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
      <h3 className="text-white font-medium text-sm">{template.name}</h3>
      <button
        onClick={(e) => { e.stopPropagation(); handleQuickApply(template); }}
        className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium"
      >
        Quick Apply
      </button>
    </div>
  </div>
</div>
```

### Right Slide-In Preview Panel
```javascript
// Based on ScreenDetailDrawer.jsx and motion.js drawer preset
import { motion, AnimatePresence } from 'framer-motion';
import { drawer } from '../design-system/motion';

function TemplatePreviewPanel({ template, onClose, onApply }) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/30 z-30"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Panel */}
      <motion.div
        className="fixed inset-y-0 right-0 w-[480px] max-w-full bg-white shadow-xl z-40 flex flex-col"
        {...drawer.right}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{template.name}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        {/* Large preview image */}
        <div className="aspect-video bg-gray-100">
          <img src={template.preview_url || template.thumbnail_url} className="w-full h-full object-contain" />
        </div>

        {/* Details */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-gray-600">{template.description}</p>
          <div className="mt-4 text-sm text-gray-500">
            <p>Category: {template.category_name}</p>
            <p>Slides: {template.slide_count}</p>
          </div>
        </div>

        {/* Apply button */}
        <div className="p-4 border-t">
          <button
            onClick={() => onApply(template)}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium"
          >
            Apply Template
          </button>
        </div>
      </motion.div>
    </>
  );
}
```

### Auto-Named Scene Creation
```javascript
// Per CONTEXT: "Template Name - Jan 25, 2026" format
import { format } from 'date-fns';

const handleApply = async (template) => {
  setApplying(template.id);
  try {
    const sceneName = `${template.name} - ${format(new Date(), 'MMM d, yyyy')}`;
    const sceneId = await installTemplateAsScene(template.id, sceneName);
    navigate(`/scene-editor/${sceneId}`);
  } catch (error) {
    showToast('Failed to apply template', 'error');
  } finally {
    setApplying(null);
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Modal preview | Side panel preview | CONTEXT decision | Grid stays visible |
| Category dropdown | Persistent sidebar | CONTEXT decision | E-commerce style UX |
| Always-visible title | Title on hover | CONTEXT decision | Cleaner visual |
| 3 columns grid | 4 columns desktop | CONTEXT decision | More visible at once |

**Deprecated/outdated:**
- `TemplatePreviewModal.jsx`: Will be replaced by `TemplatePreviewPanel.jsx` (slide-in panel)
- Existing `TemplateMarketplacePage.jsx` grid structure: Needs reorganization for 4 columns + featured row

## Open Questions

Things that couldn't be fully resolved (Claude's Discretion per CONTEXT):

1. **Subcategories**
   - What we know: Categories exist (Restaurant, Retail, etc.)
   - What's unclear: Whether to add subcategories (e.g., Restaurant > Menu Boards)
   - Recommendation: Start without subcategories; add later if template count grows

2. **Sorting Options**
   - What we know: RPC orders by `is_featured DESC, install_count DESC, created_at DESC`
   - What's unclear: Whether to expose sorting to users
   - Recommendation: Add "Popular" (default) and "Newest" dropdown

3. **Side Panel Behavior**
   - What we know: Panel slides in from right
   - What's unclear: What happens when clicking another template while panel open
   - Recommendation: Swap content in place (no close/reopen animation)

4. **Responsive Breakpoints**
   - What we know: 4 columns on desktop
   - What's unclear: Exact breakpoints for 3, 2, 1 column
   - Recommendation: Use existing grid classes - `lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 grid-cols-1`

## Sources

### Primary (HIGH confidence)
- `/Users/massimodamico/bizscreen/src/services/marketplaceService.js` - Complete API layer
- `/Users/massimodamico/bizscreen/src/pages/TemplateMarketplacePage.jsx` - Existing implementation
- `/Users/massimodamico/bizscreen/supabase/migrations/080_template_marketplace.sql` - Database schema and RPCs
- `/Users/massimodamico/bizscreen/src/design-system/motion.js` - Animation presets including `drawer.right`
- `/Users/massimodamico/bizscreen/src/components/ScreenDetailDrawer.jsx` - Slide-in panel pattern

### Secondary (MEDIUM confidence)
- `/Users/massimodamico/bizscreen/src/design-system/components/TemplateCard.jsx` - Card component
- `/Users/massimodamico/bizscreen/src/design-system/components/SearchBar.jsx` - Search input
- `/Users/massimodamico/bizscreen/src/design-system/components/FilterChips.jsx` - Filter UI
- `/Users/massimodamico/bizscreen/src/components/TemplatePreviewModal.jsx` - Preview logic (to adapt)

### Tertiary (LOW confidence)
- None - all findings verified from codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages already installed and in use
- Architecture: HIGH - Patterns verified from existing codebase
- Pitfalls: HIGH - Based on existing code patterns and CONTEXT decisions

**Research date:** 2026-01-25
**Valid until:** 60 days (stable infrastructure, no expected changes)
