# Phase 51: Data Source Widget Pipeline - Research

**Researched:** 2026-02-11
**Domain:** Data source connectivity (Google Sheets, CSV), table rendering for digital signage, field binding, offline caching
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Two entry points: a dedicated top-level "Data Sources" page AND inline add from the scene editor
- Google Sheets: user pastes a public URL (sheet shared as "Anyone with the link") -- no OAuth
- CSV: file upload only -- no hosted URLs, no paste-raw-text
- After connecting/uploading, show a full preview table (scrollable, with headers and rows) so user can confirm data looks right before using it
- User can select which columns to show/hide and reorder them (column picker)
- When data has more rows than fit in the zone, auto-paginate on a timer (cycle through pages)
- No scrolling or truncation -- auto-pagination is the overflow strategy
- Bind via properties panel: select a text element, pick "Data Source" in properties, choose a field from dropdown
- Editor canvas shows the live data value (actual current value from the source), not a placeholder tag
- Multi-row sources: show first row's value by default, user can optionally pick a specific row number
- On player error/failure (wrong URL, deleted sheet): keep showing last known data silently -- no error messages on screen
- Offline: show cached data, resume updating when connectivity returns

### Claude's Discretion
- Table visual style (card vs full-bleed vs other) -- pick what fits existing screen component patterns
- Table theming approach (inherit brand theme vs per-widget overrides) -- pick what fits existing theming system
- Refresh interval config location (on data source vs per widget) -- pick simplest approach
- Offline/stale indicator on player screen -- decide based on digital signage context (viewers are usually not staff)
- Admin data sources page status display -- decide what's practical for first pass
- Whether text elements support mixed template text (static + data fields) or single field only -- decide based on scene editor architecture

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Summary

This phase has an extraordinarily strong existing foundation. The codebase already contains a complete data source infrastructure spanning the database layer, service layer, scheduling system, data binding resolution, scene editor integration, and player rendering. The majority of the "pipeline" is already built. What remains is: (1) enhancing the Data Sources page with a full preview table and column picker, (2) creating a new `DataTableWidget` for the player that renders data as a styled table with auto-pagination, (3) extending the IndexedDB cache to store data source snapshots for offline playback, and (4) wiring refresh interval configuration into the existing `dataFeedScheduler`.

The existing services (`dataSourceService.js`, `googleSheetsService.js`, `dataBindingResolver.js`, `dataFeedScheduler.js`) handle CRUD, Google Sheets fetching via API v4, CSV parsing, sync scheduling, real-time Supabase subscriptions, and binding resolution. The scene editor `PropertiesPanel.jsx` already has a `DataBindingSection` component with data source selection, field selection, row selection, and live preview. The `SceneRenderer.jsx` in the player already resolves bindings, subscribes to real-time updates, and renders resolved content in text blocks.

**Primary recommendation:** Focus implementation on the 4 net-new deliverables -- preview table UI, `DataTableWidget` player component, IndexedDB data caching, and refresh interval wiring -- rather than rebuilding any existing infrastructure.

## Existing Codebase Analysis (CRITICAL -- what's already built)

### Already Built -- DO NOT rebuild

| Component | File | What It Does |
|-----------|------|-------------|
| Data Source CRUD | `src/services/dataSourceService.js` | Full CRUD for sources, fields, rows. CSV parsing, import, binding resolution, real-time subscriptions, value formatting |
| Google Sheets fetching | `src/services/googleSheetsService.js` | Sheet URL parsing, API v4 fetch with `VITE_GOOGLE_API_KEY`, row/header extraction, change detection, sync execution, field type inference |
| Data binding resolver | `src/services/dataBindingResolver.js` | Cached binding resolution, block/slide binding resolution, preloading, stale detection, player prefetch utilities |
| Data feed scheduler | `src/services/dataFeedScheduler.js` | Periodic sync check, max concurrent syncs, retry with backoff, event emission, visibility-aware pause/resume, alert integration |
| useDataCache hook | `src/hooks/useDataCache.js` | SWR pattern, in-memory cache with TTL, background refresh, focus/reconnect refresh |
| Data Sources page | `src/pages/DataSourcesPage.jsx` | Full CRUD UI, CSV upload, Google Sheets linking/unlinking, manual sync, sync history, field editor, row editor |
| Scene editor binding UI | `src/components/scene-editor/PropertiesPanel.jsx` | `DataBindingSection` with source picker, field picker, row index selector, live preview |
| Data-bound wizard | `src/components/scene-editor/DataBoundWizardModal.jsx` | Multi-step wizard for creating data-bound slides from data sources |
| Scene renderer + bindings | `src/player/components/SceneRenderer.jsx` | Resolves bindings on mount, subscribes to real-time updates, renders resolved text content |
| Player offline/cache | `src/player/cacheService.js` + `offlineService.js` | IndexedDB with `idb` library, LRU eviction, scene/media caching, offline queue, service worker registration |
| Database schema | Migrations `077` + `078` | `data_sources`, `data_source_fields`, `data_source_rows`, `data_source_sync_logs` tables with RLS, RPC functions for CRUD, sync, binding resolution |
| Brand theme service | `src/services/brandThemeService.js` | `DEFAULT_THEME` with primary/secondary/accent/neutral/background/text colors, font pairings, widget_style config |
| Branding context | `src/contexts/BrandingContext.jsx` | App-wide branding via context with CSS custom properties |

### What Needs to Be Built (net-new)

| Component | Purpose | Depends On |
|-----------|---------|-----------|
| **DataTableWidget** (player) | Renders data as a styled table with headers, alternating rows, auto-pagination | Brand theme, data source rows/fields |
| **Table preview component** (admin) | Full scrollable preview table shown after connecting a source | Existing data source detail view |
| **Column picker** (admin) | Select which columns to show/hide and reorder for table display | Data source fields |
| **Refresh interval selector** (admin) | Configure 5/15/30/60 min interval per data source | Existing `integration_config.pollIntervalMinutes` |
| **IndexedDB data source cache** (player) | Cache data source snapshots in IndexedDB for offline | Existing `cacheService.js` pattern |
| **Data table widget type** in scene editor | Add "Data Table" as a widget type in the scene editor | Existing widget infrastructure |

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| React | ^19.1.1 | UI framework | Installed |
| Supabase JS | ^2.80.0 | Database, auth, realtime | Installed |
| idb | ^8.0.3 | IndexedDB wrapper for offline caching | Installed |
| Tailwind CSS | ^3.4.18 | Styling | Installed |
| lucide-react | ^0.548.0 | Icons | Installed |
| date-fns | ^4.1.0 | Date formatting | Installed |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| framer-motion | ^12.23.24 | Animation (page transitions, etc.) | Optional for table pagination animation |
| isomorphic-dompurify | ^2.35.0 | HTML sanitization | Sanitize any user-provided data in table cells |

### No New Dependencies Needed
All required functionality can be built with existing dependencies. CSV parsing is already hand-rolled in `dataSourceService.js` (handles quoted fields, custom delimiters). Google Sheets fetch uses native `fetch` with the Google Sheets API v4. IndexedDB caching uses the `idb` library already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
  services/
    dataSourceService.js           # EXISTS - CRUD, CSV, bindings (extend for column config)
    googleSheetsService.js         # EXISTS - Sheets API fetch/sync
    dataBindingResolver.js         # EXISTS - Binding resolution
    dataFeedScheduler.js           # EXISTS - Sync scheduling
  hooks/
    useDataCache.js                # EXISTS - SWR caching hook
  pages/
    DataSourcesPage.jsx            # EXISTS - Enhance with preview table + column picker
  components/
    scene-editor/
      PropertiesPanel.jsx          # EXISTS - Already has DataBindingSection
      DataBoundWizardModal.jsx     # EXISTS - Data-bound slide wizard
    data-sources/
      DataPreviewTable.jsx         # NEW - Full scrollable preview table after connecting
      ColumnPicker.jsx             # NEW - Column visibility and reorder controls
  player/
    components/
      widgets/
        DataTableWidget.jsx        # NEW - Table rendering for player screens
      SceneRenderer.jsx            # EXISTS - Extend to handle 'data-table' widget type
    cacheService.js                # EXISTS - Extend with data source cache store
```

### Pattern 1: Data Table Widget as Scene Block
**What:** The data table is a new widget type (`widgetType: 'data-table'`) within the existing scene editor block system. It lives alongside `clock`, `date`, `weather`, and `qr` widgets.
**When to use:** Whenever user wants to display tabular data on a screen zone.
**Example (block structure):**
```javascript
{
  id: 'table-1',
  type: 'widget',
  widgetType: 'data-table',
  x: 0.05, y: 0.1, width: 0.9, height: 0.8,
  props: {
    dataSourceId: 'uuid-here',
    visibleColumns: ['name', 'price', 'category'],
    columnOrder: ['name', 'category', 'price'],
    refreshIntervalMinutes: 15,
    pageIntervalSeconds: 10,
    rowsPerPage: 8,
    showHeader: true,
    alternateRowColors: true,
    headerBgColor: null,    // null = inherit from brand theme
    headerTextColor: null,
    evenRowBgColor: null,
    oddRowBgColor: null,
    textColor: null,
  }
}
```

### Pattern 2: Auto-Pagination Timer
**What:** When table has more rows than fit on screen, cycle through pages on a timer. No scrolling, no truncation.
**When to use:** Always -- this is the locked overflow strategy.
**Example:**
```javascript
// Inside DataTableWidget
const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
const [currentPage, setCurrentPage] = useState(0);

useEffect(() => {
  if (totalPages <= 1) return;
  const timer = setInterval(() => {
    setCurrentPage(prev => (prev + 1) % totalPages);
  }, pageIntervalSeconds * 1000);
  return () => clearInterval(timer);
}, [totalPages, pageIntervalSeconds]);

const visibleRows = filteredRows.slice(
  currentPage * rowsPerPage,
  (currentPage + 1) * rowsPerPage
);
```

### Pattern 3: IndexedDB Data Source Caching (extend existing cacheService.js)
**What:** Add a `dataSources` store to the existing IndexedDB database used by the player.
**When to use:** Player startup and periodic refresh -- cache data for offline playback.
**Example:**
```javascript
// Extend DB_VERSION and upgrade handler in cacheService.js
// Add STORES.DATA_SOURCES = 'dataSources'

export async function cacheDataSource(dataSourceId, data) {
  const db = await getDB();
  await db.put(STORES.DATA_SOURCES, {
    id: dataSourceId,
    fields: data.fields,
    rows: data.rows,
    cachedAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
  });
}

export async function getCachedDataSource(dataSourceId) {
  const db = await getDB();
  const entry = await db.get(STORES.DATA_SOURCES, dataSourceId);
  if (entry) {
    touchEntry(STORES.DATA_SOURCES, dataSourceId);
  }
  return entry || null;
}
```

### Pattern 4: Fail-Silent with Last Known Data
**What:** Player shows last known data on errors. No error messages on screen. Silently retries.
**When to use:** All player-side data operations.
**Example:**
```javascript
// In DataTableWidget fetch logic
async function fetchData() {
  try {
    const fresh = await getDataSource(dataSourceId);
    if (fresh) {
      setData(fresh);
      await cacheDataSource(dataSourceId, fresh); // persist to IndexedDB
    }
  } catch (error) {
    // Silently fall back to cached data
    const cached = await getCachedDataSource(dataSourceId);
    if (cached) {
      setData(cached);
    }
    // else: keep showing whatever we have, never show error to viewer
  }
}
```

### Anti-Patterns to Avoid
- **DO NOT rebuild CSV parsing** -- `dataSourceService.parseCSV()` already handles quoted fields, custom delimiters
- **DO NOT add OAuth flow** -- User decision locks this to public URLs only with API key
- **DO NOT add scrolling to tables** -- User decision locks overflow to auto-pagination
- **DO NOT show error messages on player screens** -- User decision requires silent fail-over to cached data
- **DO NOT create a new page component for data sources** -- `DataSourcesPage.jsx` already exists with full CRUD UI
- **DO NOT create new database tables** -- All needed tables exist in migrations 077 and 078

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom parser | `dataSourceService.parseCSV()` | Already handles edge cases (quoted commas, escaped quotes) |
| Google Sheets fetch | Raw API calls | `googleSheetsService.fetchSheetData()` | Already handles URL parsing, error codes, header normalization |
| IndexedDB operations | Raw IndexedDB API | `idb` library (already installed) + existing `cacheService.js` patterns | Proper async/await, upgrading, error handling |
| Data binding resolution | Custom resolution | `dataBindingResolver.resolveSlideBindings()` | Already handles caching, preloading, multiple row selectors |
| Realtime subscriptions | Custom WebSocket | `dataSourceService.subscribeToDataSource()` | Already uses Supabase Realtime channels |
| Sync scheduling | Custom cron/timer | `dataFeedScheduler` | Already handles concurrent limits, retry, visibility awareness |
| Form components | Custom inputs | Design system `Input`, `Select`, `Modal`, etc. | Consistent styling, accessibility |

**Key insight:** ~80% of the pipeline already exists. The main engineering work is: (1) a new table rendering widget for the player, (2) enhancing the existing admin UI with preview/column-picker, and (3) extending the existing cache service for data source offline storage.

## Common Pitfalls

### Pitfall 1: Google API Key Exposure in Player Bundle (INFRA-04)
**What goes wrong:** The `VITE_GOOGLE_API_KEY` is already used in `googleSheetsService.js` via `import.meta.env`. If the player bundle includes this service, the key would be in the client bundle.
**Why it happens:** Vite inlines env vars at build time. The player currently imports data binding resolution which eventually reaches the data source service.
**How to avoid:** The player should NOT directly call the Google Sheets API. Instead: (1) The admin app fetches Google Sheets data and writes it to Supabase via the sync pipeline, (2) The player reads only from Supabase (cached data). The existing architecture already does this -- `dataFeedScheduler` runs in the admin app and syncs to the database. The player's `SceneRenderer` reads from `dataSourceService.getDataSource()` (Supabase RPC), not from Google directly. Ensure the player's `DataTableWidget` follows the same pattern: read from Supabase, cache in IndexedDB.
**Warning signs:** If you see `fetchSheetData()` called from any player component, that's wrong.

### Pitfall 2: IndexedDB Version Bump Breaking Existing Caches
**What goes wrong:** Adding a new object store to IndexedDB requires incrementing `DB_VERSION`, which triggers the `upgrade` callback. If not handled carefully, existing cached data could be lost.
**Why it happens:** IndexedDB `upgrade` runs when version changes. The existing code handles this but it must be extended, not rewritten.
**How to avoid:** In `cacheService.js`, increment `DB_VERSION` to 2 and add the new store in the `upgrade` handler with a version check: `if (oldVersion < 2) { db.createObjectStore('dataSources', ...) }`. Keep all existing store creation logic unchanged.
**Warning signs:** Player losing cached scenes/media after upgrade.

### Pitfall 3: Auto-Pagination Timer Not Synced with Refresh
**What goes wrong:** If the data refreshes while the user is mid-page, the page content shifts or goes blank.
**Why it happens:** Independent timers for pagination and data refresh can collide.
**How to avoid:** On data refresh, reset pagination to page 0 (or keep current page if still valid). Use a ref for row data and let the pagination timer read the current ref value.
**Warning signs:** Table flickering or showing empty pages after a refresh cycle.

### Pitfall 4: Column Picker State Not Persisted
**What goes wrong:** User configures visible columns, but the selection is lost when they navigate away.
**Why it happens:** Column visibility stored only in component state.
**How to avoid:** Store column configuration in the widget block's `props` (in the scene's `design_json`), which is already persisted to Supabase. The column picker UI writes to `props.visibleColumns` and `props.columnOrder`.
**Warning signs:** Columns resetting to show-all every time the page is loaded.

### Pitfall 5: Large Data Source Causing Player OOM
**What goes wrong:** A Google Sheet with thousands of rows gets fully loaded into the player, consuming excessive memory.
**Why it happens:** No limit on rows fetched from data source.
**How to avoid:** Implement a practical row limit (e.g., 500 rows for table display). The Google Sheets service already fetches `A1:Z1000` by default. For table display, paginate through rows but don't try to render them all at once. The auto-pagination already handles this naturally.
**Warning signs:** Player becoming sluggish on large datasets.

## Code Examples

### Example 1: DataTableWidget Component Structure
```jsx
// src/player/components/widgets/DataTableWidget.jsx
import { useState, useEffect, useRef } from 'react';
import { getDataSource, formatValue } from '../../../services/dataSourceService';
import { getCachedDataSource, cacheDataSource } from '../../cacheService';

export function DataTableWidget({ props = {} }) {
  const {
    dataSourceId,
    visibleColumns,
    columnOrder,
    pageIntervalSeconds = 10,
    rowsPerPage = 8,
    showHeader = true,
    alternateRowColors = true,
    // Theme colors (null = inherit from brand)
    headerBgColor,
    headerTextColor,
    evenRowBgColor,
    oddRowBgColor,
    textColor,
  } = props;

  const [data, setData] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const dataRef = useRef(null);

  // Fetch data (with offline fallback)
  useEffect(() => {
    if (!dataSourceId) return;

    async function loadData() {
      try {
        const fresh = await getDataSource(dataSourceId);
        if (fresh) {
          setData(fresh);
          dataRef.current = fresh;
          await cacheDataSource(dataSourceId, fresh);
        }
      } catch {
        const cached = await getCachedDataSource(dataSourceId);
        if (cached) {
          setData(cached);
          dataRef.current = cached;
        }
      }
    }
    loadData();
  }, [dataSourceId]);

  // Filter and order columns
  const fields = data?.fields || [];
  const visibleFields = (columnOrder || fields.map(f => f.name))
    .filter(name => !visibleColumns || visibleColumns.includes(name))
    .map(name => fields.find(f => f.name === name))
    .filter(Boolean);

  // Pagination
  const rows = data?.rows || [];
  const totalPages = Math.ceil(rows.length / rowsPerPage);

  useEffect(() => {
    if (totalPages <= 1) return;
    const timer = setInterval(() => {
      setCurrentPage(prev => (prev + 1) % totalPages);
    }, pageIntervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [totalPages, pageIntervalSeconds]);

  const pageRows = rows.slice(
    currentPage * rowsPerPage,
    (currentPage + 1) * rowsPerPage
  );

  if (!data || visibleFields.length === 0) {
    return null; // Silent -- no error display
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header row */}
      {showHeader && (
        <div style={{
          display: 'flex',
          backgroundColor: headerBgColor || 'rgba(59,130,246,0.15)',
          color: headerTextColor || '#ffffff',
          fontWeight: 'bold',
          fontSize: 'clamp(0.7rem, 2vw, 1rem)',
          padding: '0.5rem 0',
        }}>
          {visibleFields.map(field => (
            <div key={field.name} style={{ flex: 1, padding: '0 0.5rem' }}>
              {field.label || field.name}
            </div>
          ))}
        </div>
      )}

      {/* Data rows */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {pageRows.map((row, i) => (
          <div key={row.id || i} style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            backgroundColor: alternateRowColors && i % 2 === 0
              ? (evenRowBgColor || 'rgba(255,255,255,0.03)')
              : (oddRowBgColor || 'transparent'),
            color: textColor || '#ffffff',
            fontSize: 'clamp(0.6rem, 1.8vw, 0.9rem)',
          }}>
            {visibleFields.map(field => (
              <div key={field.name} style={{ flex: 1, padding: '0 0.5rem' }}>
                {formatValue(row.values?.[field.name], field.dataType, field.formatOptions)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Page indicator (subtle) */}
      {totalPages > 1 && (
        <div style={{
          textAlign: 'center',
          padding: '0.25rem',
          fontSize: '0.6rem',
          color: 'rgba(255,255,255,0.3)',
        }}>
          {currentPage + 1} / {totalPages}
        </div>
      )}
    </div>
  );
}
```

### Example 2: Extending IndexedDB Cache for Data Sources
```javascript
// In cacheService.js, modify DB_VERSION and upgrade handler

const DB_VERSION = 2; // Bump from 1

// In initDB upgrade handler:
if (oldVersion < 2) {
  if (!db.objectStoreNames.contains('dataSources')) {
    const dsStore = db.createObjectStore('dataSources', { keyPath: 'id' });
    dsStore.createIndex('cachedAt', 'cachedAt');
  }
}
```

### Example 3: Column Picker in Widget Props
```javascript
// Scene editor widget props for data table configuration
{
  widgetType: 'data-table',
  props: {
    dataSourceId: '...',
    visibleColumns: ['name', 'price'],  // User configures via column picker
    columnOrder: ['name', 'price'],      // User can reorder
    refreshIntervalMinutes: 15,
    pageIntervalSeconds: 10,
    rowsPerPage: 8,
  }
}
```

## Claude's Discretion Recommendations

### Table Visual Style: Full-bleed within zone
**Recommendation:** Use a full-bleed table that fills the entire zone/block area with no card wrapper. This matches digital signage best practices (maximize content density on screen) and is consistent with how the existing `SceneBlock` component renders blocks at 100% of their zone dimensions. The card style makes sense for admin dashboards but wastes space on signage.

### Table Theming: Inherit brand theme with per-widget color overrides
**Recommendation:** Default table colors (header background, text color, alternating row tints) should derive from the brand theme's `primary_color`, `text_primary_color`, and `background_color`. Allow optional per-widget color overrides in the widget props for users who want a different look on specific tables. This follows the existing pattern in `DataBoundWizardModal.jsx` which already reads from `brandThemeService.getBrandTheme()` and uses `primary_color`, `background_color`, and `text_color` as defaults.

### Refresh Interval: On the data source (already exists)
**Recommendation:** Keep refresh interval configuration on the data source itself (in `integration_config.pollIntervalMinutes`). This is already implemented in the database schema and the DataSourcesPage UI. The `dataFeedScheduler` already reads this value. No per-widget override needed for first pass. The allowed values (5, 15, 30, 60 minutes) are already available in the existing "Link to Google Sheets" modal select dropdown.

### Offline/Stale Indicator: No indicator on player screen
**Recommendation:** Do NOT show any offline or stale data indicator on the player screen. In digital signage, viewers are typically customers, not staff. A "data may be stale" indicator would look unprofessional and confuse viewers. The admin Data Sources page already shows sync status, last sync time, and sync history -- that is sufficient for operators to monitor freshness.

### Admin Data Sources Page Status Display: Enhance existing sync status section
**Recommendation:** The existing DataSourcesPage already shows integration type, last sync time, sync status badge, sync error messages, and sync history log. For first pass, this is sufficient. Enhancement opportunity: add a colored status dot on the source card in the left sidebar list (green=ok, yellow=no_change, red=error) to give quick visibility without clicking into each source.

### Text Elements: Single field binding only
**Recommendation:** Text elements should support single field binding only (not mixed static + data template strings). The existing `DataBindingSection` in `PropertiesPanel.jsx` already implements this as single-field selection with a dropdown. The `SceneBlock` renderer already uses `resolvedContent || props?.text` as a simple override. Mixed templates (e.g., "Price: {{price}}") would require a template parser, which adds complexity without clear user demand. Users who want "Price: $12.99" can use two text blocks side by side.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Google Sheets API v3 | Google Sheets API v4 | 2020 | v4 is already used in the codebase. Simpler URL structure, better error messages |
| `localStorage` for offline cache | IndexedDB via `idb` | Standard practice | Already implemented in `cacheService.js`. IndexedDB supports much larger storage quotas |
| Polling only for data refresh | Supabase Realtime + polling | Already implemented | `subscribeToDataSource()` provides instant push updates. Polling via `dataFeedScheduler` provides backup |

**Deprecated/outdated:**
- Google Sheets API v3: v4 is already used
- `localForage`: The project uses `idb` directly, which is lower-level but already proven in the codebase

## Open Questions

1. **Google API Key Rate Limits**
   - What we know: Google Sheets API v4 has a default quota of 300 requests per minute per project. The `dataFeedScheduler` has `MAX_CONCURRENT_SYNCS = 3` to limit concurrency.
   - What's unclear: With many tenants syncing simultaneously, could rate limits be hit?
   - Recommendation: For first pass, the existing concurrent limit is sufficient. Monitor in production. If needed, add per-tenant rate limiting or a server-side sync proxy later.

2. **`data_sources.tenant_id` vs `client_id` naming**
   - What we know: The database uses `tenant_id` column. The service layer function `createDataSource` accepts `clientId` parameter but inserts as `client_id`. However, migration 077 shows the column is actually `tenant_id`.
   - What's unclear: There may be a mismatch between the service layer and the actual database column name.
   - Recommendation: Verify that `createDataSource` correctly maps `clientId` to the `tenant_id` column. The RPC functions use `tenant_id` internally and handle access control.

3. **DB_VERSION bump coordination**
   - What we know: Current `cacheService.js` uses `DB_VERSION = 1`. Adding a data sources store requires version 2.
   - What's unclear: Whether any other pending changes also need version bumps.
   - Recommendation: Bump to version 2 with proper migration handling. Only add the `dataSources` store if `oldVersion < 2`.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/services/dataSourceService.js` -- Full data source CRUD, CSV parsing, binding resolution, real-time subscriptions (1286 lines)
- Codebase inspection: `src/services/googleSheetsService.js` -- Google Sheets API v4 integration, sync operations (517 lines)
- Codebase inspection: `src/services/dataBindingResolver.js` -- Binding resolution with caching, preloading, player utilities (398 lines)
- Codebase inspection: `src/services/dataFeedScheduler.js` -- Sync scheduling with concurrency limits, retry, events (431 lines)
- Codebase inspection: `src/player/cacheService.js` -- IndexedDB caching with `idb`, LRU eviction, offline queue (746 lines)
- Codebase inspection: `src/player/offlineService.js` -- Offline detection, scene caching, sync operations (697 lines)
- Codebase inspection: `src/player/components/SceneRenderer.jsx` -- Scene rendering with data binding resolution (427 lines)
- Codebase inspection: `src/components/scene-editor/PropertiesPanel.jsx` -- DataBindingSection with full binding UI (1210 lines)
- Codebase inspection: `src/pages/DataSourcesPage.jsx` -- Complete data sources admin page (1273 lines)
- Codebase inspection: `supabase/migrations/077_dynamic_data_sources.sql` -- Database schema, RPC functions
- Codebase inspection: `supabase/migrations/078_realtime_data_feeds.sql` -- Integration columns, sync logs, broadcast triggers

### Secondary (MEDIUM confidence)
- Codebase inspection: `src/services/brandThemeService.js` -- Brand theme structure with DEFAULT_THEME
- Codebase inspection: `src/contexts/BrandingContext.jsx` -- App-wide branding via context
- Codebase inspection: `src/player/components/widgets/ClockWidget.jsx` -- Widget component pattern reference
- Codebase inspection: `package.json` -- Confirmed `idb@^8.0.3` installed, no CSV library needed

### Tertiary (LOW confidence)
- Google Sheets API v4 rate limits -- Based on training data knowledge, not verified against current documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries already in project, no new dependencies
- Architecture: HIGH -- 80%+ of the pipeline is already built and verified by code inspection
- Pitfalls: HIGH -- Identified from actual code patterns and known constraints
- Discretion items: HIGH -- Recommendations based on existing code patterns and conventions

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (stable -- existing codebase, no fast-moving external deps)
