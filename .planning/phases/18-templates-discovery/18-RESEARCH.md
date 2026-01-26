# Phase 18: Templates Discovery - Research

**Researched:** 2026-01-26
**Domain:** Template Discovery UX (recents, favorites, starter packs, customization wizard)
**Confidence:** HIGH

## Summary

Phase 18 builds on Phase 17's marketplace foundation to add user-centric discovery features: recently used templates, favorites, starter packs, and a guided customization wizard. The codebase already has significant infrastructure in place:

- **Database tables** for favorites and history already exist (`user_template_favorites`, `user_template_history`) but reference `content_templates`, not `template_library`
- **Service functions** for favorites/recents exist in `templateService.js` but need adaptation for marketplace templates
- **Starter packs** exist in `content_templates` (type='pack') but the CONTEXT specifies packs as groups of marketplace templates, not the existing blueprint system
- **TemplateCustomizeModal** exists but is basic (renaming only); CONTEXT requires a guided wizard with live preview for logo/colors/text

**Primary recommendation:** Create new database infrastructure for marketplace template favorites/history, build sidebar sections for Recents/Favorites, implement starter packs as curated template groups displayed inline, and build a new customization wizard with side-by-side form + live preview.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.1.1 | UI framework | Already in use |
| framer-motion | 12.23.24 | Animations (collapse, heart) | Already in use, has all needed presets |
| lucide-react | 0.548.0 | Icons (Heart, Clock, Package) | Project standard |
| Supabase JS | 2.80.0 | Backend API | Already in use |
| date-fns | 4.1.0 | Date formatting for recents | Already in use |

### Supporting (Already Exists)
| Library/Component | Purpose | When to Use |
|-------------------|---------|-------------|
| TemplateSidebar | Category navigation | Extend for Recents/Favorites sections |
| TemplateCard | Template display | Reuse with heart icon overlay |
| TemplateGrid | Grid display | Reuse for pack expansion |
| FeaturedTemplatesRow | Row display pattern | Adapt for Starter Packs row |
| motion.js drawer | Slide animations | Pack inline expansion |
| TemplatePreviewPanel | Template details | Wizard preview adaptation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sidebar sections | Tabs | CONTEXT specifies sidebar sections |
| Inline expansion | Modal | CONTEXT specifies inline grid expansion |
| Side-by-side wizard | Multi-step wizard | CONTEXT specifies single-screen form |

**No additional packages needed** - all functionality can be built with existing dependencies.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── templates/
│       ├── TemplateSidebar.jsx           # EXTEND with Recents/Favorites
│       ├── SidebarRecentsSection.jsx     # NEW - compact recent templates list
│       ├── SidebarFavoritesSection.jsx   # NEW - compact favorites list
│       ├── StarterPacksRow.jsx           # NEW - starter packs above Featured
│       ├── StarterPackCard.jsx           # NEW - expandable pack card
│       ├── TemplateCustomizationWizard.jsx # NEW - guided wizard with preview
│       ├── TemplateCard.jsx              # EXTEND with favorite heart icon
│       └── index.js                      # UPDATE exports
├── services/
│   └── marketplaceService.js             # EXTEND with favorites/history
└── supabase/
    └── migrations/
        └── XXX_marketplace_favorites.sql # NEW - favorites/history for template_library
```

### Pattern 1: Favorites Heart Icon on Card
**What:** Heart icon in top-right corner of TemplateCard, filled when favorited
**When to use:** All template cards in marketplace grid
**Example:**
```javascript
// Based on existing TemplateCard pattern
import { Heart } from 'lucide-react';

function TemplateCard({ template, isFavorited, onToggleFavorite, ...props }) {
  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    onToggleFavorite(template.id, !isFavorited);
  };

  return (
    <div className="group relative">
      {/* Heart icon - always visible, fills when favorited */}
      <button
        onClick={handleFavoriteClick}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white transition-colors"
        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart
          size={18}
          className={isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-400'}
        />
      </button>
      {/* ... rest of card */}
    </div>
  );
}
```

### Pattern 2: Sidebar Sections for Recents/Favorites
**What:** Collapsible sections in TemplateSidebar showing recent and favorite templates
**When to use:** Per CONTEXT - Recents and Favorites in sidebar, not main grid
**Example:**
```javascript
// Compact sidebar section pattern
function SidebarRecentsSection({ templates, onTemplateClick, maxItems = 5 }) {
  const [expanded, setExpanded] = useState(true);

  if (templates.length === 0) return null;

  return (
    <div className="border-b border-gray-200 pb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-3 py-2"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase">
          <Clock size={14} /> Recent
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-1 px-2"
          >
            {templates.slice(0, maxItems).map((t) => (
              <button
                key={t.id}
                onClick={() => onTemplateClick(t)}
                className="w-full flex items-center gap-2 p-2 rounded hover:bg-gray-50 text-left"
              >
                <img src={t.thumbnail_url} className="w-10 h-6 object-cover rounded" />
                <span className="text-sm text-gray-700 truncate">{t.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### Pattern 3: Starter Packs Inline Expansion
**What:** Pack card expands downward to show template grid, no page navigation
**When to use:** Per CONTEXT - clicking pack expands inline
**Example:**
```javascript
// Inline expansion pattern
function StarterPackCard({ pack, isExpanded, onToggleExpand, onTemplateSelect }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Pack header - clickable to expand */}
      <button
        onClick={() => onToggleExpand(pack.id)}
        className="w-full flex items-center gap-4 p-4 hover:bg-gray-50"
      >
        <Package size={24} className="text-blue-600" />
        <div className="flex-1 text-left">
          <h3 className="font-medium">{pack.name}</h3>
          <p className="text-sm text-gray-500">{pack.templates.length} templates</p>
        </div>
        <ChevronDown className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded template grid */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="border-t bg-gray-50 p-4"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {pack.templates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onClick={() => onTemplateSelect(t)}
                  compact
                />
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => onApplySelected()}>
                Apply Selected
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### Pattern 4: Customization Wizard with Live Preview
**What:** Side-by-side layout: form on left, live preview on right
**When to use:** Per CONTEXT - triggers after Quick Apply, single-screen form
**Example:**
```javascript
// Based on existing TemplatePreviewPanel pattern
function TemplateCustomizationWizard({ template, scene, onComplete, onClose }) {
  const [customization, setCustomization] = useState({
    logo: null,
    primaryColor: '#3B82F6',
    texts: {}, // key -> replacement value
  });

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Left: Form */}
      <div className="w-[400px] bg-white border-r p-6 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Customize Template</h2>

        {/* Logo Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Logo</label>
          <LogoUploader
            value={customization.logo}
            onChange={(logo) => setCustomization(prev => ({ ...prev, logo }))}
          />
        </div>

        {/* Color Picker */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Primary Color</label>
          <ColorPicker
            value={customization.primaryColor}
            onChange={(color) => setCustomization(prev => ({ ...prev, primaryColor: color }))}
          />
        </div>

        {/* Text Replacements */}
        {template.customizableFields?.texts?.map((field) => (
          <div key={field.key} className="mb-4">
            <label className="block text-sm font-medium mb-1">{field.label}</label>
            <input
              type="text"
              value={customization.texts[field.key] || ''}
              onChange={(e) => setCustomization(prev => ({
                ...prev,
                texts: { ...prev.texts, [field.key]: e.target.value }
              }))}
              placeholder={field.placeholder}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        ))}

        <div className="mt-8 flex gap-3">
          <Button variant="secondary" onClick={onClose}>Skip</Button>
          <Button onClick={() => onComplete(customization)}>Apply Changes</Button>
        </div>
      </div>

      {/* Right: Live Preview */}
      <div className="flex-1 bg-gray-100 p-6 flex items-center justify-center">
        <div className="aspect-video w-full max-w-3xl bg-white rounded-lg shadow-lg overflow-hidden">
          <ScenePreview scene={scene} customization={customization} />
        </div>
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Separate page for recents/favorites:** CONTEXT specifies sidebar sections
- **Modal for pack templates:** CONTEXT specifies inline expansion
- **Multi-step wizard:** CONTEXT specifies single-screen form
- **Wizard before scene creation:** CONTEXT specifies wizard triggers AFTER Quick Apply

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Heart animation | CSS pulse | framer-motion scale | Consistent with design system |
| Collapse animation | CSS height transition | framer-motion AnimatePresence | Handles unmount |
| Color picker | Custom HSL slider | Native `<input type="color">` or existing library | Complex state management |
| Logo upload | Custom dropzone | Existing media upload patterns | Already handles validation |
| Live preview | Manual render | Existing SceneRenderer/preview components | Already handles scene rendering |
| Favorite state | Local state only | React Query or context | Needs to sync across views |
| Recent tracking | Manual timestamp | Existing `recordTemplateUsage()` | Already implemented |

**Key insight:** The core service functions exist in `templateService.js` but work with `content_templates`. Need to create parallel functions in `marketplaceService.js` for `template_library` or update existing functions to handle both.

## Common Pitfalls

### Pitfall 1: Wrong Template Table
**What goes wrong:** Using `content_templates` favorites/history for marketplace templates
**Why it happens:** Tables reference `content_templates`, but Phase 17 uses `template_library`
**How to avoid:** Create new tables/functions for `template_library` favorites/history OR use a unified approach
**Warning signs:** Favorites don't persist, wrong templates appear in recents

### Pitfall 2: Sidebar Scroll Conflict
**What goes wrong:** Recents/Favorites sections cause sidebar to overflow awkwardly
**Why it happens:** Too many items, categories + recents + favorites exceed viewport
**How to avoid:** Limit displayed items (5-8 per section), add "See all" link, use collapsible sections
**Warning signs:** Sidebar needs scroll, categories pushed below fold

### Pitfall 3: Pack Expansion Layout Break
**What goes wrong:** Inline expansion breaks grid layout of surrounding content
**Why it happens:** Expanded content doesn't fit within grid cell
**How to avoid:** Pack row should be full-width, separate from featured/main grid
**Warning signs:** Grid columns misalign when pack expands

### Pitfall 4: Wizard Blocking Navigation
**What goes wrong:** User applies template, wizard opens, but scene wasn't created
**Why it happens:** Wizard opens before async clone completes
**How to avoid:** Wait for `installTemplateAsScene` to complete, pass sceneId to wizard
**Warning signs:** Wizard shows but no scene exists to customize

### Pitfall 5: Preview Not Updating
**What goes wrong:** Live preview doesn't reflect customization changes
**Why it happens:** Preview component doesn't re-render on customization state change
**How to avoid:** Pass customization as prop, use useEffect to apply changes
**Warning signs:** User changes color, preview stays same

### Pitfall 6: Favorite Toggle Race Condition
**What goes wrong:** Rapid clicking causes inconsistent favorite state
**Why it happens:** Multiple async requests in flight
**How to avoid:** Optimistic UI update + debounce, use loading state on icon
**Warning signs:** Heart flickers, ends up in wrong state

## Code Examples

Verified patterns from existing codebase:

### Extending marketplaceService for Favorites
```javascript
// Add to src/services/marketplaceService.js

// Track favorites for marketplace templates
export async function addMarketplaceFavorite(templateId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('marketplace_template_favorites')  // NEW table
    .insert({ user_id: user.id, template_id: templateId })
    .select()
    .single();

  if (error && error.code !== '23505') throw error; // Ignore duplicate
  return true;
}

export async function removeMarketplaceFavorite(templateId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('marketplace_template_favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('template_id', templateId);

  if (error) throw error;
  return true;
}

export async function fetchMarketplaceFavorites() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('marketplace_template_favorites')
    .select(`
      template_id,
      created_at,
      template:template_library(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(f => f.template).filter(Boolean);
}

// Track recent usage for marketplace templates
export async function recordMarketplaceUsage(templateId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('marketplace_template_history')
    .insert({ user_id: user.id, template_id: templateId });

  if (error) throw error;
}

export async function fetchRecentMarketplaceTemplates(limit = 5) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Use RPC for efficient deduplication
  const { data, error } = await supabase
    .rpc('get_recent_marketplace_templates', { p_limit: limit });

  if (error) throw error;
  return data || [];
}
```

### Starter Packs Data Structure
```javascript
// Starter pack structure (stored in template_library or separate table)
const starterPack = {
  id: 'uuid',
  name: 'Restaurant Starter',
  description: 'Everything you need for a restaurant display',
  thumbnail_url: '/packs/restaurant.jpg',
  template_ids: ['uuid1', 'uuid2', 'uuid3'], // References to template_library
  industry: 'restaurant',
  sort_order: 1,
  is_featured: true,
};

// Fetching packs with their templates
export async function fetchStarterPacks() {
  const { data, error } = await supabase
    .from('starter_packs')
    .select(`
      *,
      templates:starter_pack_templates(
        template:template_library(*)
      )
    `)
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw error;
  return (data || []).map(pack => ({
    ...pack,
    templates: pack.templates.map(t => t.template).filter(Boolean)
  }));
}
```

### Customization Wizard Flow
```javascript
// Flow: Quick Apply -> Create Scene -> Open Wizard

const handleQuickApply = async (template) => {
  setApplyingId(template.id);
  try {
    // 1. Create scene first
    const sceneName = `${template.name} - ${format(new Date(), 'MMM d, yyyy')}`;
    const sceneId = await installTemplateAsScene(template.id, sceneName);

    // 2. Record usage for recents
    await recordMarketplaceUsage(template.id);

    // 3. Check if template has customizable fields
    if (template.metadata?.customizable) {
      // Open wizard with scene and template
      setWizardState({ open: true, sceneId, template });
    } else {
      // No customization needed, go to editor
      navigate(`/scene-editor/${sceneId}`);
    }
  } catch (error) {
    console.error('Failed to apply template:', error);
    setApplyingId(null);
  }
};

// Wizard completion handler
const handleWizardComplete = async (customization) => {
  try {
    // Apply customization to scene
    await applyCustomizationToScene(wizardState.sceneId, customization);
    navigate(`/scene-editor/${wizardState.sceneId}`);
  } catch (error) {
    console.error('Failed to apply customization:', error);
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| content_templates favorites | marketplace_template_favorites | Phase 18 | Separate tracking per system |
| TemplateCustomizeModal (rename only) | Full wizard with live preview | Phase 18 | Much richer customization |
| Packs as blueprints | Packs as template collections | Phase 18 | Simpler, more flexible |
| Favorites in grid | Favorites in sidebar | CONTEXT decision | Cleaner marketplace grid |

**Deprecated/outdated:**
- `user_template_favorites` for marketplace: Will create new table
- `TemplateCustomizeModal` for customization: Will be replaced by wizard (keep for legacy)

## Open Questions

Things that couldn't be fully resolved (Claude's Discretion per CONTEXT):

1. **Number of Recent Templates in Sidebar**
   - What we know: Needs to fit in sidebar without overflow
   - What's unclear: Exact count
   - Recommendation: 5 items, with "View all" expanding to modal/page

2. **Sidebar Section Ordering**
   - What we know: Recents, Favorites, Categories all need to fit
   - What's unclear: Best order
   - Recommendation: Recents first (most actionable), then Favorites, then Categories

3. **What's Customizable in Wizard**
   - What we know: Logo, colors, text per CONTEXT
   - What's unclear: Which templates support which customizations
   - Recommendation: Store `customizable_fields` in template metadata, wizard adapts

4. **Filter Behavior with Special Sections**
   - What we know: Recents/Favorites are in sidebar
   - What's unclear: Show/hide when search/filters active
   - Recommendation: Keep visible but grayed if no matches, or always show

5. **Styling for Pack Expansion**
   - What we know: Expands inline with template grid
   - What's unclear: Visual treatment
   - Recommendation: Subtle background (gray-50), border, clear "collapse" affordance

## Sources

### Primary (HIGH confidence)
- `/Users/massimodamico/bizscreen/src/services/templateService.js` - Existing favorites/history functions
- `/Users/massimodamico/bizscreen/supabase/migrations/112_template_favorites_history.sql` - Existing tables
- `/Users/massimodamico/bizscreen/supabase/migrations/080_template_marketplace.sql` - Marketplace schema
- `/Users/massimodamico/bizscreen/src/components/templates/TemplateSidebar.jsx` - Current sidebar
- `/Users/massimodamico/bizscreen/src/components/templates/TemplateCard.jsx` - Current card (via TemplateGrid)
- `/Users/massimodamico/bizscreen/src/components/templates/FeaturedTemplatesRow.jsx` - Row pattern
- `/Users/massimodamico/bizscreen/.planning/phases/18-templates-discovery/18-CONTEXT.md` - User decisions

### Secondary (MEDIUM confidence)
- `/Users/massimodamico/bizscreen/src/components/templates/TemplateCustomizeModal.jsx` - Existing customize modal
- `/Users/massimodamico/bizscreen/src/design-system/motion.js` - Animation patterns
- `/Users/massimodamico/bizscreen/src/services/marketplaceService.js` - Marketplace API

### Tertiary (LOW confidence)
- None - all findings verified from codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages already installed
- Architecture: HIGH - Patterns verified from existing codebase, CONTEXT provides clear direction
- Pitfalls: HIGH - Based on existing code patterns and identified gaps

**Research date:** 2026-01-26
**Valid until:** 60 days (stable infrastructure, clear CONTEXT decisions)
