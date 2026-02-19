# Phase 62: Menu Board Widget - Research

**Researched:** 2026-02-18
**Domain:** Structured data widget (menu boards) with CRUD editor, player rendering, realtime updates
**Confidence:** HIGH

## Summary

Phase 62 adds a menu board widget that allows users to create structured menus with categories, items, prices, dietary tags, and images -- then render them beautifully on TV screens with auto-pagination and realtime updates.

The codebase already has all the foundational infrastructure needed. The **dynamic data sources system** (migration 077, `dataSourceService.js`) provides a battle-tested pattern for structured data with categories/items, CRUD operations, ordering, `is_active` toggling, and Supabase Realtime subscriptions. The **widget registry** (Phase 56) provides the plug-and-play pattern for adding new widgets. The **DataTableWidget** demonstrates auto-pagination with fade transitions, the `useWidgetData` hook for orchestrated data fetching, and offline caching. The **i18n system** already has `CURRENCY_FORMATS` per locale with `Intl.NumberFormat` support.

The key architectural decision is whether to store menu board data in the existing `data_sources` / `data_source_rows` / `data_source_fields` tables (reusing the entire data source infrastructure) or to create dedicated `menu_boards` / `menu_categories` / `menu_items` tables. The recommendation is **dedicated tables** because menu boards have domain-specific semantics (categories containing items, multiple price columns, dietary tags, item images, availability toggling) that don't map cleanly to the generic data source model. However, the CRUD patterns, realtime subscriptions, and service architecture from `dataSourceService.js` should be replicated faithfully.

**Primary recommendation:** Create dedicated `menu_boards`, `menu_categories`, and `menu_items` tables with a `menuBoardService.js` following `dataSourceService.js` patterns. Register a `menu-board` widget type in the widget registry. Build a `MenuBoardEditorModal` for CRUD with `@dnd-kit/sortable` (new dependency) for drag-and-drop reordering. Build a `MenuBoardWidget` player component with auto-pagination following `DataTableWidget` patterns.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MENU-01 | User can create a menu board with structured categories and items (name, description, price, image) | Dedicated DB tables (`menu_boards`, `menu_categories`, `menu_items`) with `menuBoardService.js` CRUD following `dataSourceService.js` patterns. Editor modal using design system components. |
| MENU-02 | User can reorder menu categories and items via drag-and-drop | `@dnd-kit/sortable` (new dep, `@dnd-kit/core` already installed). `order_index` columns on categories and items. Reorder functions following `reorderRows`/`reorderFields` patterns. |
| MENU-03 | Menu board renders as themed widget in player with category sections, item names, prices, and descriptions | `MenuBoardWidget` component in `src/player/components/widgets/`. Registered in `WIDGET_REGISTRY`. Rendered via `getWidgetComponent()` in SceneRenderer and LayoutElementRenderer. |
| MENU-04 | Menu board supports multiple price columns (e.g., Small/Medium/Large) | `price_columns` JSONB field on `menu_boards` table (e.g., `[{label: "Small", key: "small"}, {label: "Large", key: "large"}]`). Items store `prices` as JSONB keyed by column key. |
| MENU-05 | Menu board auto-paginates for long menus with smooth page transitions | Follow `DataTableWidget` pagination pattern: `rowsPerPage`, `pageIntervalSeconds`, fade-in/fade-out transitions with opacity. Calculate items per page based on container height. |
| MENU-06 | User can toggle item availability (show/hide items without deleting) | `is_available` boolean column on `menu_items` (default true). Toggle in editor UI. Player filters out `is_available = false` items. Follows `is_active` pattern from `data_source_rows`. |
| MENU-07 | Menu board widget updates in near-real-time via Supabase Realtime subscription | Subscribe to `menu_items` and `menu_categories` changes via `supabase.channel().on('postgres_changes')`. Follow `subscribeToDataSource()` pattern from `dataSourceService.js`. |
| MENU-08 | User can add dietary/allergen tags to menu items (rendered as icons/badges) | `dietary_tags` TEXT[] column on `menu_items`. Predefined tag set (vegetarian, vegan, gluten-free, dairy-free, nut-free, spicy, halal, kosher). Rendered as small icon badges in both editor and player. |
| MENU-09 | Menu board respects tenant locale for currency formatting | Use `Intl.NumberFormat` with `CURRENCY_FORMATS` from `i18nConfig.js`. Menu board stores `currency_code` (default from tenant locale). Player-side formatting uses `getEffectiveLocaleSync()`. |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.80.0 | Database CRUD, Realtime subscriptions | Already used for all data operations |
| `react` | ^19.1.1 | UI components | Project framework |
| `lucide-react` | ^0.548.0 | Icons for dietary tags, UI elements | Project icon library |
| `framer-motion` | ^12.23.24 | Page transition animations | Already used in design system modals |
| `@dnd-kit/core` | ^6.3.1 | Drag-and-drop foundation | Already installed |

### New Dependencies Required
| Library | Version | Purpose | Why Needed |
|---------|---------|---------|------------|
| `@dnd-kit/sortable` | ^10.0.0 | Sortable lists for category/item reordering | `@dnd-kit/core` is already installed but sortable utilities are needed for MENU-02. The `DraggableTimeBlock` uses `useDraggable` directly but sortable provides `useSortable` + `SortableContext` which is the standard pattern for reorderable lists. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dedicated menu tables | Existing `data_sources` tables | Data sources lack category hierarchy, multiple price columns, dietary tags. Would require overloading `values` JSONB with menu-specific semantics, making queries complex and losing type safety. |
| `@dnd-kit/sortable` | Manual drag ordering with `@dnd-kit/core` | Sortable handles the complex reorder logic, animation, and accessibility automatically. Hand-rolling is error-prone. |
| `Intl.NumberFormat` | Custom currency formatting in `formatValue()` | `formatValue()` in dataSourceService already handles currency but with a simple `${symbol}${num.toFixed(decimals)}` pattern. `Intl.NumberFormat` handles locale-specific decimal separators, currency symbol placement (prefix vs suffix), and thousand separators correctly. |

**Installation:**
```bash
npm install @dnd-kit/sortable
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   └── menuBoardService.js          # CRUD, reorder, realtime subscriptions
├── player/components/widgets/
│   └── MenuBoardWidget.jsx          # Player rendering with auto-pagination
├── components/menu-boards/
│   ├── MenuBoardEditorModal.jsx     # Full CRUD editor (create/edit)
│   ├── CategorySection.jsx          # Sortable category with items
│   ├── MenuItemRow.jsx              # Single item row in editor
│   └── DietaryTagPicker.jsx         # Tag selection UI
├── widgets/
│   └── registry.js                  # Add 'menu-board' entry (existing file)
└── pages/
    └── (integrated into existing pages like AppsPage or new MenuBoardsPage)

supabase/migrations/
└── 148_menu_boards.sql              # Schema: menu_boards, menu_categories, menu_items
```

### Pattern 1: Widget Registry Integration
**What:** Add `menu-board` to `WIDGET_REGISTRY` so all rendering paths pick it up automatically.
**When to use:** This is the standard pattern established in Phase 56.
**Example:**
```javascript
// In src/widgets/registry.js
import { MenuBoardWidget } from '../player/components/widgets/MenuBoardWidget.jsx';
import { UtensilsCrossed } from 'lucide-react';

// Add to WIDGET_REGISTRY:
'menu-board': {
  component: MenuBoardWidget,
  icon: UtensilsCrossed,
  label: 'Menu Board',
  defaultProps: {
    menuBoardId: '',
    theme: 'dark',
    textColor: '#ffffff',
    accentColor: '#f59e0b',
    showImages: true,
    showDescriptions: true,
    pageIntervalSeconds: 10,
    currencyCode: 'USD',
  },
},
```

### Pattern 2: Supabase Realtime for Menu Updates (MENU-07)
**What:** Subscribe to menu board changes for near-real-time player updates.
**When to use:** Player-side, when rendering the MenuBoardWidget.
**Example:**
```javascript
// Following subscribeToDataSource() pattern from dataSourceService.js
export function subscribeToMenuBoard(menuBoardId, onUpdate) {
  const itemChannel = supabase
    .channel(`menu_items:${menuBoardId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'menu_items',
      filter: `menu_board_id=eq.${menuBoardId}`,
    }, (payload) => {
      onUpdate({ type: 'item_change', event: payload.eventType, item: payload.new || payload.old });
    })
    .subscribe();

  const categoryChannel = supabase
    .channel(`menu_categories:${menuBoardId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'menu_categories',
      filter: `menu_board_id=eq.${menuBoardId}`,
    }, (payload) => {
      onUpdate({ type: 'category_change', event: payload.eventType, category: payload.new || payload.old });
    })
    .subscribe();

  return {
    unsubscribe: async () => {
      await supabase.removeChannel(itemChannel);
      await supabase.removeChannel(categoryChannel);
    },
  };
}
```

### Pattern 3: Auto-Pagination (MENU-05)
**What:** Paginate long menus with smooth fade transitions, following DataTableWidget.
**When to use:** When the menu has more items than fit on one screen page.
**Example:**
```javascript
// From DataTableWidget -- same pattern applies to MenuBoardWidget
const [currentPage, setCurrentPage] = useState(0);
const [displayedPage, setDisplayedPage] = useState(0);
const [opacity, setOpacity] = useState(1);

// Pagination timer
useEffect(() => {
  if (totalPages <= 1 || !pageIntervalSeconds) return;
  const interval = setInterval(() => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  }, pageIntervalSeconds * 1000);
  return () => clearInterval(interval);
}, [totalPages, pageIntervalSeconds]);

// Fade transition
useEffect(() => {
  setOpacity(0);
  const timeout = setTimeout(() => {
    setDisplayedPage(currentPage);
    setOpacity(1);
  }, 300);
  return () => clearTimeout(timeout);
}, [currentPage]);
```

### Pattern 4: Locale-Aware Currency Formatting (MENU-09)
**What:** Format prices using tenant locale settings.
**When to use:** Both editor (preview) and player rendering.
**Example:**
```javascript
// Using existing i18n infrastructure
import { CURRENCY_FORMATS } from '../i18n/i18nConfig';
import { getEffectiveLocaleSync } from '../services/localeService';

function formatMenuPrice(amount, currencyCode, locale) {
  if (amount === null || amount === undefined) return '';
  const effectiveLocale = locale || getEffectiveLocaleSync();
  try {
    return new Intl.NumberFormat(effectiveLocale, {
      style: 'currency',
      currency: currencyCode || CURRENCY_FORMATS[effectiveLocale]?.currency || 'USD',
    }).format(amount);
  } catch {
    return `$${Number(amount).toFixed(2)}`;
  }
}
```

### Pattern 5: Database Schema Design
**What:** Dedicated tables for menu boards with proper relationships.
**Example:**
```sql
-- menu_boards: top-level entity per tenant
CREATE TABLE menu_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'custom')),
  currency_code TEXT DEFAULT 'USD',
  price_columns JSONB DEFAULT '[{"label": "Price", "key": "default"}]',
  accent_color TEXT DEFAULT '#f59e0b',
  font_family TEXT DEFAULT 'system-ui',
  show_images BOOLEAN DEFAULT true,
  show_descriptions BOOLEAN DEFAULT true,
  page_interval_seconds INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- menu_categories: groups of items
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_board_id UUID NOT NULL REFERENCES menu_boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- menu_items: individual menu items
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  menu_board_id UUID NOT NULL REFERENCES menu_boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  prices JSONB DEFAULT '{"default": null}',   -- keyed by price_column key
  image_url TEXT,
  dietary_tags TEXT[] DEFAULT '{}',
  is_available BOOLEAN DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Anti-Patterns to Avoid
- **Overloading data_sources for menus:** The generic data source model lacks category hierarchy, multiple price columns, and dietary tags. Trying to fit menu semantics into the generic model leads to complex JSONB queries and a poor editor UX.
- **Polling for menu updates:** The codebase uses Supabase Realtime everywhere. Polling would be inconsistent and wasteful. Use `postgres_changes` subscriptions.
- **Inline widget rendering in SceneRenderer:** Phase 56 explicitly moved all widgets to the registry pattern. Do NOT add menu board rendering inline in SceneRenderer or LayoutElementRenderer.
- **Custom currency formatting:** Do NOT hand-roll currency formatting with string concatenation. Use `Intl.NumberFormat` which handles locale-specific decimal separators, symbol placement, and grouping.
- **Separate drag-and-drop library:** Do NOT add react-beautiful-dnd or another DnD library. The project uses `@dnd-kit/core`; add `@dnd-kit/sortable` as the companion package.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sortable lists | Manual drag index swapping | `@dnd-kit/sortable` with `SortableContext` | Handles animation, accessibility, keyboard reordering, collision detection |
| Currency formatting | `${symbol}${num.toFixed(2)}` | `Intl.NumberFormat` with locale | Handles 1.000,50 vs 1,000.50, symbol placement (US$ vs $), etc. |
| Realtime subscriptions | Polling with `setInterval` | Supabase `channel().on('postgres_changes')` | Project standard, lower latency, less server load |
| Auto-pagination | Custom timer logic | Follow `DataTableWidget` pattern exactly | Already handles edge cases: page reset on data change, fade transitions, page indicator |
| Widget rendering pipeline | Inline rendering in player components | Widget registry `WIDGET_REGISTRY` entry | One entry = all rendering paths (SceneRenderer, LayoutElementRenderer, EditorCanvas, LivePreviewWindow) |

**Key insight:** The codebase already solves most of the infrastructure problems this phase needs. The DataTableWidget is essentially a menu board without domain-specific semantics. The work is primarily about creating a domain-specific data model, a dedicated editor UI, and a themed rendering component.

## Common Pitfalls

### Pitfall 1: Realtime Filter Mismatch
**What goes wrong:** Supabase Realtime `filter` parameter must match a single column value. If you filter on `category_id` for items, you won't get updates for items in other categories of the same menu board.
**Why it happens:** Menu items belong to categories which belong to a menu board. Filtering on `category_id` is too narrow.
**How to avoid:** Add a `menu_board_id` foreign key directly on `menu_items` (denormalized) so you can filter Realtime subscriptions with `menu_board_id=eq.${id}`. This is the same pattern as `data_source_rows` having a direct `data_source_id` reference.
**Warning signs:** Updates only appearing for items in the first category; missed updates.

### Pitfall 2: Pagination Reset on Data Change
**What goes wrong:** When items are added/removed/toggled, the pagination can jump to an invalid page or show stale data.
**Why it happens:** Total page count changes but current page index stays the same.
**How to avoid:** Reset `currentPage` to 0 whenever the item count changes significantly (DataTableWidget already handles this). Clamp the page index to `Math.min(currentPage, totalPages - 1)`.
**Warning signs:** Blank pages, page counter showing "3/2".

### Pitfall 3: Price Column Schema Drift
**What goes wrong:** `price_columns` on the menu board gets out of sync with `prices` JSONB on individual items.
**Why it happens:** User adds a new price column but existing items don't have that key. Or user removes a column but items still have the old key.
**How to avoid:** The editor should initialize missing price keys to `null` when rendering. When saving, only include keys that exist in the current `price_columns`. The player should gracefully handle missing keys with fallback to empty.
**Warning signs:** "undefined" showing in price cells, extra columns appearing.

### Pitfall 4: DnD Not Working in Modals
**What goes wrong:** `@dnd-kit` drag events can be intercepted by modal overlays.
**Why it happens:** Modal portals and z-index stacking can interfere with pointer events.
**How to avoid:** Use `DndContext` inside the modal content area, not wrapping the modal. The drag overlay should render within the modal's DOM tree.
**Warning signs:** Drag starts but items snap back, drag shadow appears behind modal.

### Pitfall 5: Currency Code Missing from Player Context
**What goes wrong:** Player renders prices with wrong currency because it doesn't know the tenant's locale.
**Why it happens:** The player's `getEffectiveLocaleSync()` might return the default 'en' if locale hasn't been fetched yet.
**How to avoid:** Store `currency_code` directly on the `menu_boards` table (explicit, not derived). The player uses this field rather than trying to infer from locale. The editor sets it from the tenant's locale setting as a default.
**Warning signs:** All prices showing as USD regardless of tenant locale.

## Code Examples

### Menu Board Service CRUD Pattern
```javascript
// Following dataSourceService.js patterns exactly
import { supabase } from '../supabase';

export async function fetchMenuBoards() {
  const { data, error } = await supabase
    .from('menu_boards')
    .select('*, menu_categories(count), menu_items(count)')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function getMenuBoard(id) {
  // Fetch board with categories and items in one query
  const { data, error } = await supabase
    .from('menu_boards')
    .select(`
      *,
      menu_categories(
        *,
        menu_items(*)
      )
    `)
    .eq('id', id)
    .order('order_index', { referencedTable: 'menu_categories' })
    .order('order_index', { referencedTable: 'menu_categories.menu_items' })
    .single();
  if (error) throw error;
  return data;
}

export async function toggleItemAvailability(itemId, isAvailable) {
  const { data, error } = await supabase
    .from('menu_items')
    .update({ is_available: isAvailable })
    .eq('id', itemId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

### Widget Registration
```javascript
// Add to src/widgets/registry.js
import { MenuBoardWidget } from '../player/components/widgets/MenuBoardWidget.jsx';
import { UtensilsCrossed } from 'lucide-react';

// In WIDGET_REGISTRY object:
'menu-board': {
  component: MenuBoardWidget,
  icon: UtensilsCrossed,
  label: 'Menu Board',
  defaultProps: {
    menuBoardId: '',
    theme: 'dark',
    textColor: '#ffffff',
    accentColor: '#f59e0b',
    showImages: true,
    showDescriptions: true,
    pageIntervalSeconds: 10,
  },
},
```

### Dietary Tag Constants and Rendering
```javascript
// Predefined dietary tags with icons
export const DIETARY_TAGS = [
  { key: 'vegetarian', label: 'Vegetarian', emoji: 'V', color: '#22c55e' },
  { key: 'vegan', label: 'Vegan', emoji: 'VG', color: '#16a34a' },
  { key: 'gluten-free', label: 'Gluten-Free', emoji: 'GF', color: '#eab308' },
  { key: 'dairy-free', label: 'Dairy-Free', emoji: 'DF', color: '#3b82f6' },
  { key: 'nut-free', label: 'Nut-Free', emoji: 'NF', color: '#f97316' },
  { key: 'spicy', label: 'Spicy', emoji: 'S', color: '#ef4444' },
  { key: 'halal', label: 'Halal', emoji: 'H', color: '#8b5cf6' },
  { key: 'kosher', label: 'Kosher', emoji: 'K', color: '#6366f1' },
];

// Render as small badges in player
function DietaryBadge({ tag }) {
  const info = DIETARY_TAGS.find(t => t.key === tag);
  if (!info) return null;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 'clamp(0.45rem, 1vw, 0.6rem)',
      fontWeight: 700,
      color: '#fff',
      backgroundColor: info.color,
      borderRadius: '2px',
      padding: '0 3px',
      lineHeight: 1.4,
      marginLeft: '3px',
    }}>
      {info.emoji}
    </span>
  );
}
```

### DnD Sortable Category/Item Reorder
```javascript
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableCategoryList({ categories, onReorder }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event) {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = categories.findIndex(c => c.id === active.id);
      const newIndex = categories.findIndex(c => c.id === over.id);
      const reordered = arrayMove(categories, oldIndex, newIndex);
      onReorder(reordered.map((c, i) => ({ id: c.id, orderIndex: i })));
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
        {categories.map(cat => <SortableCategory key={cat.id} category={cat} />)}
      </SortableContext>
    </DndContext>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static menu images (Polotno template, migration 092) | Structured menu board widget with live data | Phase 62 | Users can edit menu items without redesigning layouts |
| `formatValue()` with `${symbol}${num.toFixed(2)}` | `Intl.NumberFormat` with locale-aware formatting | Phase 62 | Correct currency formatting for international tenants |
| Inline widget rendering | Widget registry lookup (`WIDGET_REGISTRY`) | Phase 56 | Single registration point for all rendering paths |
| Polling for data updates | Supabase Realtime subscriptions | Phase 6+ | Near-instant updates, lower server load |

**Deprecated/outdated:**
- The existing "Restaurant Menu - Elegant" Polotno template (migration 092) is a static layout template, NOT a dynamic menu board. It will continue to exist as a design template. Phase 62 creates a separate structured widget.

## Open Questions

1. **Menu Board as standalone page or integrated into Apps/Data Sources?**
   - What we know: The app catalog already has a `dsmenu` entry with `configType: 'menu'`. Data Sources page exists for managing structured data.
   - What's unclear: Whether menu boards should have their own top-level page or be accessed via the Apps page.
   - Recommendation: Create a dedicated `/menu-boards` page linked from the sidebar navigation. The `dsmenu` app catalog entry can link to this page. This keeps the UI focused and avoids cluttering the generic Data Sources page.

2. **Menu board theming scope?**
   - What we know: Requirements specify "themed widget." The widget registry supports `defaultProps` for theming.
   - What's unclear: Whether themes should be simple presets (dark/light) or fully customizable (colors, fonts, spacing).
   - Recommendation: Start with `theme: 'dark' | 'light' | 'custom'` presets plus `accentColor` and `textColor` overrides. This matches the existing widget prop pattern without over-engineering.

3. **Image storage for menu item photos?**
   - What we know: The project has S3 upload infrastructure (`useS3Upload` hook) and a `media_assets` table. Migration 095 creates a `media-storage` bucket.
   - What's unclear: Whether menu item images should reference `media_assets` or use direct URL strings.
   - Recommendation: Store as `image_url TEXT` on `menu_items` (direct URL). Users can upload via the existing media upload infrastructure and paste the URL, or use a simplified inline upload. This avoids coupling menu items to the media library's lifecycle (deletion, etc.).

4. **How does the menu board widget get configured in layouts/scenes?**
   - What we know: Widgets are placed as blocks in the scene editor or as elements in the layout editor. Props include a reference ID (like `dataSourceId` for DataTableWidget).
   - What's unclear: Exactly which editor surface is primary for menu board placement.
   - Recommendation: Follow `DataTableWidget` pattern: the widget's primary prop is `menuBoardId`. A properties panel dropdown lists the user's menu boards. The widget renders wherever a widget block is placed (scene, layout zone, etc.).

## Sources

### Primary (HIGH confidence)
- **Codebase: `src/widgets/registry.js`** - Widget registry pattern, confirmed 10 widget types registered
- **Codebase: `src/services/dataSourceService.js`** - CRUD, reorder, realtime subscription patterns (1287 lines)
- **Codebase: `src/player/components/widgets/DataTableWidget.jsx`** - Auto-pagination, fade transitions, useWidgetData hook
- **Codebase: `src/services/realtimeService.js`** - Supabase Realtime subscription pattern with reconnection
- **Codebase: `supabase/migrations/077_dynamic_data_sources.sql`** - Schema pattern for structured data tables
- **Codebase: `supabase/migrations/147_portrait_mode.sql`** - Portrait orientation support in player content resolution
- **Codebase: `src/i18n/i18nConfig.js`** - `CURRENCY_FORMATS` per locale, `Intl.NumberFormat` support
- **Codebase: `src/services/localeService.js`** - Tenant locale resolution with cache
- **Codebase: `package.json`** - `@dnd-kit/core` ^6.3.1, `framer-motion` ^12.23.24, `@supabase/supabase-js` ^2.80.0

### Secondary (MEDIUM confidence)
- **Codebase: `src/config/appCatalog.js`** - Existing `dsmenu` app entry with `configType: 'menu'`
- **Codebase: `supabase/migrations/092_add_restaurant_menu_template.sql`** - Static Polotno restaurant menu template (NOT a widget)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All core libraries already in project; only `@dnd-kit/sortable` is new and it's a companion to the already-installed `@dnd-kit/core`
- Architecture: HIGH - All patterns (widget registry, data service, realtime, pagination) are established and verified in codebase
- Pitfalls: HIGH - Identified from direct codebase analysis of similar features (DataTableWidget, dataSourceService)

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable -- no external dependency changes expected)
