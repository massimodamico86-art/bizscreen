# Phase 55: Player Data Orchestrator & Polish - Research

**Researched:** 2026-02-12
**Domain:** Player-side data refresh coordination, CSS transitions, image rendering, sync status UI
**Confidence:** HIGH

## Summary

Phase 55 addresses five distinct but related concerns in the player's dynamic widget ecosystem: (1) centralizing the per-widget refresh timers that currently proliferate independently across DataTableWidget, RssTickerWidget, RssCardWidget, SocialFeedRenderer, and WeatherWidget; (2) adding smooth CSS transitions to data table pagination and data refreshes; (3) rendering IMAGE_URL fields as actual `<img>` elements instead of raw text; (4) displaying a "last updated" sync status indicator; and (5) preventing polling multiplication when multiple widgets on the same screen share a data source or refresh schedule.

The existing codebase already has strong foundations for each concern. DataTableWidget already has auto-pagination with `pageIntervalSeconds` and `rowsPerPage`. The `data_sources` table already stores `last_sync_at` and `last_sync_status` columns. The `FIELD_DATA_TYPES.IMAGE_URL` type is already defined but currently falls through to `String(value)` in `formatValue()`. Each widget independently manages its own `setInterval` for refresh -- the orchestrator's job is to consolidate these into a single coordinating service that widgets subscribe to rather than poll independently.

**Primary recommendation:** Build a `useDataRefreshOrchestrator` hook at the SceneRenderer level that manages a single timer loop, deduplicates data source fetches, and provides refresh timestamps to child widgets via React context. Keep CSS transitions simple (opacity fade for page changes, CSS transition property for data swaps) -- do NOT import framer-motion into the player bundle.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.1.1 | Component rendering, hooks, context | Already in use |
| CSS transitions | N/A | Smooth fade/slide animations | Zero bundle cost, GPU-accelerated, already used in player |
| @supabase/supabase-js | 2.80.0 | Data fetching, real-time subscriptions | Already in use |
| idb | 8.0.3 | IndexedDB caching for offline | Already in use via cacheService |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.548.0 | Icons for sync status indicator | Already in bundle |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS transitions | framer-motion | framer-motion is in the app bundle but NOT in player -- adding it would bloat the player. CSS transitions are sufficient for fade/opacity |
| React Context for orchestrator | Pub/sub EventEmitter | Context is simpler, fits React patterns, no extra dependency |
| Individual widget timers | Single orchestrator | Orchestrator prevents N timers for N widgets hitting the same data source simultaneously |

**Installation:**
No new packages required. All dependencies already installed.

## Architecture Patterns

### Current Widget Refresh Architecture (PROBLEM)
```
SceneRenderer
  -> DataTableWidget (own setInterval for refresh + own setInterval for pagination)
  -> RssTickerWidget (own setInterval for refresh)
  -> RssCardWidget (own setInterval for refresh + own setInterval for carousel)
  -> SocialFeedRenderer (fetches from Supabase directly, no periodic refresh)
  -> WeatherWidget (own setInterval 10min)
  -> CountdownWidget (own setInterval 1s for ticking -- NOT data refresh, keep as-is)
```

**Problem:** If a screen has 3 DataTableWidgets pointing at the same data source with 15-minute refresh, that is 3 independent API calls every 15 minutes hitting the same endpoint. With 5 different RSS feeds across widgets, that is 5 independent timers. Each widget also independently manages cache fallback logic.

### Recommended Architecture (SOLUTION)
```
SceneRenderer
  -> DataRefreshProvider (context)
       -> useDataRefreshOrchestrator (single hook managing all timers)
            -> dataSourceRegistry: Map<sourceKey, {fetchFn, interval, lastFetched, subscribers}>
            -> Single master tick loop (checks what needs refresh)
            -> Deduplicates: same dataSourceId or feedUrl = one fetch
            -> Provides: { data, lastRefreshedAt, isRefreshing } per source key
       -> Widgets subscribe via useWidgetData(sourceKey) hook
            -> Receives data + lastRefreshedAt from context
            -> Handles own display concerns (pagination, animation, layout)
```

### Recommended Project Structure
```
src/player/
  components/
    widgets/
      DataTableWidget.jsx       # MODIFY: use orchestrator, add transitions + image rendering
      RssTickerWidget.jsx        # MODIFY: use orchestrator for refresh (keep animation as-is)
      RssCardWidget.jsx          # MODIFY: use orchestrator for refresh
      SocialFeedWidget.jsx       # MODIFY: use orchestrator for refresh
      WeatherWidget.jsx          # MODIFY: use orchestrator for refresh
      CountdownWidget.jsx        # NO CHANGE: ticking is display, not data refresh
      SyncStatusIndicator.jsx    # NEW: "Last updated X min ago" overlay
    SceneRenderer.jsx            # MODIFY: wrap with DataRefreshProvider
  hooks/
    useDataRefreshOrchestrator.js  # NEW: central refresh coordinator
    useWidgetData.js               # NEW: consumer hook for widgets
  contexts/
    DataRefreshContext.js           # NEW: React context for orchestrator
```

### Pattern 1: Orchestrator with Registry
**What:** A single service that maintains a registry of data sources, their refresh intervals, and subscribers. One master loop (setInterval) checks what needs refreshing at each tick.
**When to use:** When multiple independent consumers need the same data at different or same intervals.
**Example:**
```javascript
// src/player/hooks/useDataRefreshOrchestrator.js
// Pseudocode for the core pattern

const TICK_INTERVAL_MS = 10_000; // Check every 10 seconds what needs refresh

function useDataRefreshOrchestrator() {
  const registryRef = useRef(new Map());
  const dataStoreRef = useRef(new Map()); // sourceKey -> { data, lastFetchedAt, isLoading }

  // Master tick: check registry, refresh stale sources
  useEffect(() => {
    const tick = async () => {
      const now = Date.now();
      for (const [key, entry] of registryRef.current) {
        const timeSinceLastFetch = now - (entry.lastFetchedAt || 0);
        if (timeSinceLastFetch >= entry.intervalMs && !entry.isLoading) {
          entry.isLoading = true;
          try {
            const data = await entry.fetchFn();
            dataStoreRef.current.set(key, {
              data,
              lastFetchedAt: now,
              isLoading: false,
            });
            // Cache for offline
            entry.cacheFn?.(key, data);
          } catch (err) {
            entry.isLoading = false;
            // Keep existing data, log warning
          }
          // Notify subscribers (trigger re-render via state update)
        }
      }
    };

    const interval = setInterval(tick, TICK_INTERVAL_MS);
    // Also tick immediately on mount
    tick();
    return () => clearInterval(interval);
  }, []);

  // register(sourceKey, fetchFn, intervalMs, cacheFn) -> unregister callback
  // getData(sourceKey) -> { data, lastFetchedAt, isLoading }
}
```

### Pattern 2: CSS Transition for Page Changes (DataTable)
**What:** Use CSS opacity transition to fade between pages instead of instant swap.
**When to use:** DataTable pagination, RSS card carousel, any content swap on the player.
**Example:**
```jsx
// Dual-buffer approach: render current and next page, fade between them
function AnimatedPageTransition({ currentContent, transitionKey }) {
  const [displayed, setDisplayed] = useState(currentContent);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    // Fade out
    setOpacity(0);
    const timer = setTimeout(() => {
      setDisplayed(currentContent);
      setOpacity(1);
    }, 300); // Match CSS transition duration
    return () => clearTimeout(timer);
  }, [transitionKey]);

  return (
    <div style={{
      opacity,
      transition: 'opacity 0.3s ease-in-out',
    }}>
      {displayed}
    </div>
  );
}
```

### Pattern 3: Image URL Field Rendering
**What:** When a field has `data_type === 'image_url'`, render an `<img>` tag instead of text.
**When to use:** DataTableWidget cell rendering for IMAGE_URL fields.
**Example:**
```jsx
// Inside DataTableWidget row rendering
{visibleFields.map((field) => {
  const rawValue = row.values?.[field.name];
  const dataType = field.data_type || field.dataType;

  if (dataType === 'image_url' && rawValue) {
    return (
      <div key={field.name} style={{ flex: 1, padding: '0 0.5rem', overflow: 'hidden' }}>
        <img
          src={rawValue}
          alt=""
          style={{
            maxHeight: '100%',
            maxWidth: '100%',
            objectFit: 'contain',
            display: 'block',
            margin: '0 auto',
          }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>
    );
  }

  const displayValue = formatValue(rawValue, dataType, field.format_options || field.formatOptions);
  return (
    <div key={field.name} style={{ /* existing styles */ }}>
      {displayValue}
    </div>
  );
})}
```

### Pattern 4: Sync Status Indicator
**What:** Small overlay/badge showing "Updated X min ago" on dynamic widgets.
**When to use:** Any widget that receives data from the orchestrator.
**Example:**
```jsx
// SyncStatusIndicator.jsx
function SyncStatusIndicator({ lastRefreshedAt, position = 'bottom-right' }) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!lastRefreshedAt) return;

    const update = () => {
      const seconds = Math.floor((Date.now() - lastRefreshedAt) / 1000);
      if (seconds < 60) setLabel('Just now');
      else if (seconds < 3600) setLabel(`${Math.floor(seconds / 60)}m ago`);
      else setLabel(`${Math.floor(seconds / 3600)}h ago`);
    };

    update();
    const interval = setInterval(update, 30_000); // Update label every 30s
    return () => clearInterval(interval);
  }, [lastRefreshedAt]);

  if (!label) return null;

  return (
    <div style={{
      position: 'absolute',
      [position.includes('bottom') ? 'bottom' : 'top']: '0.25rem',
      [position.includes('right') ? 'right' : 'left']: '0.25rem',
      fontSize: '0.5rem',
      color: 'rgba(255,255,255,0.4)',
      background: 'rgba(0,0,0,0.3)',
      padding: '0.1rem 0.3rem',
      borderRadius: '0.15rem',
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      {label}
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Importing framer-motion in player:** The player bundle must stay lean. CSS transitions handle all needed animations (fade, slide). framer-motion adds ~30KB+ min+gzip.
- **Moving pagination logic to orchestrator:** Pagination (page cycling) is a DISPLAY concern, not a DATA concern. Keep pagination timers inside widgets. The orchestrator only handles DATA refresh.
- **Using Supabase Realtime for all refresh:** Realtime channels have a 100-channel-per-connection limit. Each `subscribeToDataSource` creates 2 channels (rows + meta). With 10 data sources, that is 20 channels. Use Realtime for push notifications of changes, but keep the orchestrator's polling as the primary refresh mechanism.
- **Resetting page to 0 on every refresh:** Only reset pagination when the row count changes. If the same data comes back, keep the user on their current page.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative time formatting | Custom "X min ago" math | Simple helper function (already shown above) | Only need "just now", "Xm ago", "Xh ago" -- Intl.RelativeTimeFormat is overkill for player |
| CSS keyframe animations | JavaScript-based animation library | CSS `transition` property + `opacity`/`transform` | GPU-accelerated, no JS overhead, already proven in RssCardWidget carousel |
| Image loading/error handling | Complex image preloader | `<img>` with `onError` handler | Existing pattern from RssCardWidget's `failedImages` Set approach |
| Data deduplication | Complex normalization | Simple Map keyed by sourceKey (dataSourceId or feedUrl) | The orchestrator registry naturally deduplicates |

**Key insight:** The player runs on potentially resource-constrained hardware (TVs, Raspberry Pi, low-end Android). Every additional JavaScript execution, timer, and memory allocation matters. CSS transitions are nearly free compared to JS animation.

## Common Pitfalls

### Pitfall 1: Timer Drift and Thundering Herd
**What goes wrong:** Multiple widgets register with identical refresh intervals (e.g., 15 min). The orchestrator fires all refreshes simultaneously, creating a burst of API calls.
**Why it happens:** Naive interval checking without staggering.
**How to avoid:** Add jitter to the initial registration. When a widget registers at 15min interval, add random(0, 30s) offset so not all 15min sources fire at the exact same moment.
**Warning signs:** Network tab shows burst of simultaneous API calls at regular intervals.

### Pitfall 2: Stale Closure in setInterval Callbacks
**What goes wrong:** The orchestrator's tick function captures stale refs or state, leading to duplicate fetches or missed updates.
**Why it happens:** React hooks + setInterval is notoriously tricky. The interval callback captures the values at registration time.
**How to avoid:** Use `useRef` for the registry and data store, not `useState`. The tick function reads from refs, which always have the latest value. Only use `useState` for the version counter that triggers re-renders.
**Warning signs:** Widget shows stale data even after orchestrator fetched fresh data.

### Pitfall 3: Memory Leak from Unregistered Sources
**What goes wrong:** Widget unmounts but its data source entry remains in the orchestrator registry, continuing to poll.
**Why it happens:** Widget's `useEffect` cleanup doesn't call `unregister()`.
**How to avoid:** Every `register()` returns an `unregister` function. The `useWidgetData` hook calls unregister in its cleanup. Also add a subscriber count -- when a source has 0 subscribers, stop polling it.
**Warning signs:** Network requests continue for data sources no longer displayed.

### Pitfall 4: Transition Flicker on First Load
**What goes wrong:** Widget shows a flash of empty content, then fades in data, creating an unsightly flicker.
**Why it happens:** The transition animation plays even on initial data load (not just on page changes).
**How to avoid:** Only apply transition animation when `previousData !== null`. On first load (previousData === null), render immediately without transition.
**Warning signs:** Widgets flicker or appear transparent briefly when scene first loads.

### Pitfall 5: Image URL Blocking Table Row Height
**What goes wrong:** An `<img>` tag in a table cell takes time to load, causing layout shift. Or the image is very tall, pushing rows off screen.
**Why it happens:** Images have unknown dimensions until loaded.
**How to avoid:** Constrain images with `maxHeight` based on row height. Use `objectFit: 'contain'` to prevent stretching. Add a loading placeholder or keep the text fallback visible until image loads.
**Warning signs:** Table rows jump in height after images load.

### Pitfall 6: Supabase Realtime Channel Exhaustion
**What goes wrong:** The current `subscribeToDataSource` in SceneRenderer creates 2 channels per data source. With 50 data sources active on a screen, that is 100 channels (the limit).
**Why it happens:** Current SceneRenderer subscribes individually per data source ID.
**How to avoid:** Use `subscribeToClientDataSources` (single channel for all client data) instead of per-source subscriptions. Or, for the orchestrator approach, rely primarily on polling and use a single Realtime channel for "data changed" push notifications.
**Warning signs:** Supabase console shows channel join failures, widgets stop receiving updates.

## Code Examples

### Current Widget Refresh Pattern (to be replaced)
```javascript
// Source: src/player/components/widgets/DataTableWidget.jsx lines 96-128
// Each widget has its own independent refresh timer
useEffect(() => {
  if (!dataSourceId || !refreshIntervalMinutes) return;
  const intervalMs = refreshIntervalMinutes * 60 * 1000;
  const interval = setInterval(async () => {
    try {
      const result = await getDataSource(dataSourceId);
      if (result) {
        setData(result);
        setCurrentPage(0);
        cacheDataSource(dataSourceId, result).catch(/*...*/);
      }
    } catch (err) {
      // fallback to cache...
    }
  }, intervalMs);
  return () => clearInterval(interval);
}, [dataSourceId, refreshIntervalMinutes]);
```

### Existing Supabase Subscription Pattern (channel concern)
```javascript
// Source: src/services/dataSourceService.js lines 1156-1213
// Creates TWO channels per data source subscription
export function subscribeToDataSource(dataSourceId, onUpdate) {
  const rowSubscription = supabase
    .channel(`data_source_rows:${dataSourceId}`)  // Channel 1
    .on('postgres_changes', { /* row changes */ })
    .subscribe();

  const metaSubscription = supabase
    .channel(`data_source_meta:${dataSourceId}`)  // Channel 2
    .on('postgres_changes', { /* metadata changes */ })
    .subscribe();

  return { unsubscribe: async () => { /* remove both channels */ } };
}
```

### Existing CSS Transition in Player (proven pattern)
```jsx
// Source: src/player/components/widgets/RssCardWidget.jsx lines 260-273
// Carousel uses opacity fade -- already proven to work
{visibleItems.map((item, index) => (
  renderCard(item, index, {
    position: 'absolute',
    opacity: index === safeIndex ? 1 : 0,
    transition: 'opacity 0.5s ease-in-out',  // CSS transition, no JS animation
    pointerEvents: index === safeIndex ? 'auto' : 'none',
  })
))}
```

### IMAGE_URL Type Already Defined (not yet rendered)
```javascript
// Source: src/services/dataSourceService.js lines 38-45
export const FIELD_DATA_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  CURRENCY: 'currency',
  IMAGE_URL: 'image_url',  // <-- Defined but formatValue just returns String(value)
  BOOLEAN: 'boolean',
  DATE: 'date',
};
```

### Database Already Has Sync Metadata
```sql
-- Source: supabase/migrations/078_realtime_data_feeds.sql lines 18-27
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_sync_status TEXT
  CHECK (last_sync_status IS NULL OR last_sync_status IN ('ok', 'error', 'no_change', 'pending')),
ADD COLUMN IF NOT EXISTS last_sync_error TEXT;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-widget setInterval | Centralized orchestrator | Phase 55 (this phase) | Eliminates polling multiplication |
| Raw URL text for image_url fields | `<img>` rendering with error fallback | Phase 55 (this phase) | Visual polish for data tables |
| Instant page swap | CSS fade transition | Phase 55 (this phase) | Smooth, professional appearance |
| No sync status visible | "Last updated" indicator | Phase 55 (this phase) | User confidence in data freshness |
| Per-data-source Realtime channels | Single client-level channel or polling | Phase 55 (this phase) | Avoids 100-channel limit |

**Current state across widgets:**
- DataTableWidget: Has pagination, has independent refresh timer, NO transitions, NO image rendering
- RssTickerWidget: Has CSS animation (translateX), has independent refresh timer
- RssCardWidget: Has CSS fade transition (carousel), has independent refresh timer, has failedImages tracking
- SocialFeedRenderer: Fetches from Supabase directly, NO periodic refresh timer, has carousel rotation
- WeatherWidget: Has independent 10-min refresh timer
- CountdownWidget: Has 1s tick (display-only, NOT data refresh -- leave unchanged)
- ClockWidget/DateWidget: Has 1s tick (display-only -- leave unchanged)

## Open Questions

1. **Should the sync status indicator be configurable per-widget?**
   - What we know: WIDGET-05 requires a visible indicator. Some widgets (clock, date) don't fetch data.
   - What's unclear: Should the user be able to turn the indicator on/off per widget in the editor?
   - Recommendation: Show by default on all data-fetching widgets. Can be a future enhancement to make it configurable.

2. **Should SocialFeedRenderer get periodic refresh?**
   - What we know: Currently SocialFeedRenderer fetches once on mount but never refreshes. Other widgets refresh every 15 min.
   - What's unclear: Social feed data changes less frequently (posts are synced server-side).
   - Recommendation: Add to the orchestrator with a longer default interval (30 min). Data is already in Supabase.

3. **How many widgets can realistically be on a single screen?**
   - What we know: Supabase Realtime has 100-channel limit per connection. Current code creates 2 channels per data source.
   - What's unclear: Maximum realistic widget count per screen.
   - Recommendation: Design for up to 20 data-fetching widgets per screen. Use polling-primary approach with optional single Realtime channel for push notifications. Do NOT create per-data-source Realtime channels in the orchestrator.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/player/components/widgets/` -- all 9 widget files read in full
- Codebase analysis: `src/player/components/SceneRenderer.jsx` -- current rendering and subscription architecture
- Codebase analysis: `src/services/dataSourceService.js` -- FIELD_DATA_TYPES, subscribeToDataSource, formatValue
- Codebase analysis: `src/services/dataBindingResolver.js` -- cache layer, prefetch utilities
- Codebase analysis: `src/player/cacheService.js` -- IndexedDB caching architecture
- Codebase analysis: `supabase/migrations/078_realtime_data_feeds.sql` -- last_sync_at, last_sync_status schema
- [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits) -- 100 channels per connection confirmed

### Secondary (MEDIUM confidence)
- Prior phase decisions from phases 51-54 -- documented in phase context above
- `package.json` analysis -- confirmed framer-motion in deps but NOT used in player

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All existing libraries, no new dependencies
- Architecture: HIGH - Orchestrator pattern is well-understood; existing codebase provides clear integration points
- Pitfalls: HIGH - Based on direct codebase analysis of current timer proliferation and Realtime channel usage
- Image rendering: HIGH - `FIELD_DATA_TYPES.IMAGE_URL` already exists, just needs rendering in DataTableWidget
- Transitions: HIGH - CSS transition pattern already proven in RssCardWidget carousel
- Sync status: HIGH - `last_sync_at` column already in database, just needs player-side display

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (stable domain, no fast-moving external dependencies)
