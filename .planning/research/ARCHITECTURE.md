# Architecture Patterns: Data-Driven Signage Widgets

**Domain:** Digital signage platform - dynamic data widget integration
**Researched:** 2026-02-11
**Confidence:** HIGH (based on comprehensive codebase analysis)

## Executive Summary

BizScreen already has a robust foundation for data-driven content. The data source pipeline (data_sources -> data_source_fields -> data_source_rows) with Google Sheets sync, the social feed system (social_accounts -> social_feeds with SocialFeedRenderer), and the weather service (OpenWeatherMap with in-memory cache) all exist as working services. The scene editor supports widget blocks (clock, date, weather, qr, data) with a data binding resolver that connects blocks to data sources.

**The gap is not in plumbing -- it is in the last mile.** The player does not consume data sources at render time. The scene editor's widget palette is limited. RSS feeds have no fetching/caching backend. Countdown/timer widgets do not exist. Configurable polling intervals exist in the DB schema but no player-side polling loop connects them. This milestone is about wiring existing infrastructure through to actual screen rendering, and filling the few missing pieces (RSS proxy, countdown widget, data table renderer, refresh orchestration on the player).

---

## Current Architecture (As-Is)

### Content Resolution Pipeline

```
Schedule --> Campaign --> Playlist --> Scene --> Slide --> Blocks
                                                           |
                                                    design_json: {
                                                      background: {...},
                                                      blocks: [
                                                        { type: 'text', props: {...}, dataBinding: {...} },
                                                        { type: 'image', props: {...} },
                                                        { type: 'widget', widgetType: 'clock', props: {...} },
                                                        { type: 'widget', widgetType: 'weather', props: {...} },
                                                        { type: 'widget', widgetType: 'data', props: {...} },
                                                        { type: 'shape', props: {...} }
                                                      ]
                                                    }
```

### Existing Data Flow (Admin Side)

```
Google Sheets API                                Admin UI (DataSourcesPage)
       |                                                |
       v                                                v
googleSheetsService.js  <--- dataFeedScheduler.js ---> dataSourceService.js
       |                     (1-min check interval)           |
       v                                                      v
   Supabase DB: data_sources + data_source_fields + data_source_rows
       |
       v
   Real-time subscriptions (postgres_changes on data_source_rows)
```

### Existing Data Flow (Player Side) - INCOMPLETE

```
playerService.getPlayerContent(screenId) --> RPC get_player_content
    Returns: { device, playlist, items: [{ type, url, duration }] }

    PROBLEM: items are media/app references only.
    Data sources, social feeds, weather are NOT part of the player content payload.
    The player has no mechanism to resolve data bindings at render time.
```

### Existing Widget Renderer Capabilities

**LayoutElementRenderer.jsx** currently renders these widget types:
| Widget Type | Status | Renders |
|-------------|--------|---------|
| `clock` | WORKING | Static time display |
| `date` | WORKING | Static date display |
| `weather` | PARTIAL | Mock temperature in editor; no live API call |
| `qr` | WORKING | QR code from URL prop |
| `data` | PLACEHOLDER | Shows `{{field}}` template string |

**SocialFeedRenderer.jsx** exists as standalone component:
- Fetches cached posts from `social_feeds` table directly via Supabase
- Supports carousel, grid, list, single, masonry layouts
- Auto-rotation with configurable speed
- BUT: not wired into the widget block system in the scene editor

### Existing Service Capabilities

| Service | What It Does | What Is Missing |
|---------|-------------|-----------------|
| `dataSourceService.js` | Full CRUD for data sources, fields, rows. Google Sheets linking. Real-time subscriptions. | Nothing - complete for admin side |
| `dataBindingResolver.js` | Resolves bindings to values with caching, preloading, stale detection. Player-specific prefetch utilities. | Not called by player at render time |
| `dataFeedScheduler.js` | Client-side scheduler for Google Sheets sync. Checks every 60s, max 3 concurrent, retry with 5-min backoff. | Only runs in admin tab, not on player |
| `googleSheetsService.js` | Fetches sheet data, detects changes, syncs to DB, broadcasts updates. | Nothing - complete |
| `weatherService.js` | OpenWeatherMap current + 5-day forecast. 30-min in-memory cache. Supports city name and coords. | No server-side caching; no player refresh loop |
| `socialFeedSyncService.js` | Syncs Instagram, Facebook, TikTok, Google Reviews. Rate limiting, cooldowns. | No RSS support (RSS is a different feed type) |
| `realtimeService.js` | Supabase subscriptions for device commands, device refresh, content updates. | No subscription for data_source_rows changes on player |
| `playerService.js` | Content fetching, IndexedDB offline cache, command polling, heartbeat, backoff retry. | Content payload does not include data source bindings |

### Database Schema (Existing)

```
data_sources
  - id, tenant_id, name, description, type
  - integration_type ('none'|'google_sheets')
  - integration_config (JSONB: {sheetId, range, pollIntervalMinutes})
  - last_sync_at, last_sync_status, last_sync_error

data_source_fields
  - id, data_source_id, name, label, data_type, order_index
  - default_value, format_options (JSONB)

data_source_rows
  - id, data_source_id, values (JSONB), order_index, is_active

data_source_sync_logs
  - id, data_source_id, status, message, changed_rows, sync_duration_ms

social_accounts
  - id, tenant_id, provider, account_name, access_token, etc.

social_feeds
  - id, tenant_id, account_id, provider, post_id, content_text, media_url
  - likes_count, comments_count, rating, posted_at

social_feed_settings
  - id, tenant_id, widget_id, provider, account_id
  - filter_mode, hashtags, max_items, auto_refresh_minutes
  - layout, show_caption, show_likes, rotation_speed
```

---

## Recommended Architecture (To-Be)

### Core Design Principle: Server-Cached, Player-Polled

All dynamic data resolves through Supabase as the single source of truth. External APIs (Google Sheets, RSS, weather, social) are fetched server-side (Edge Functions or admin-side scheduler) and cached in DB tables. The player never calls external APIs directly. This enables offline mode and avoids CORS/rate-limit issues on constrained player devices.

```
External APIs                 Supabase Edge Functions / Admin Scheduler
  Google Sheets   ----------->   dataFeedScheduler (existing)
  RSS Feeds       ----------->   rssFeedSyncService (NEW)
  Weather API     ----------->   weatherCacheService (NEW Edge Function)
  Social APIs     ----------->   socialFeedSyncService (existing)
                                        |
                                        v
                                   Supabase DB
                                   (cached data)
                                        |
                        +-----------+---+---+-----------+
                        |           |       |           |
                        v           v       v           v
                  data_source   rss_feed  weather   social_feeds
                  _rows         _items    _cache    (existing)
                  (existing)    (NEW)     (NEW)
                                        |
                                        v
                              Supabase Realtime
                              (postgres_changes)
                                        |
                        +-------+-------+-------+
                        |       |       |       |
                        v       v       v       v
                    Player 1  Player 2  ...   Player N
                    (poll + subscribe for changes)
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Data Source Widgets** (scene editor) | Configure data source binding on text/table blocks | dataSourceService, dataBindingResolver |
| **RSS Feed Service** (NEW) | Fetch/parse RSS and Atom feeds, cache entries in DB | Supabase DB, Edge Function for CORS proxy |
| **RSS Feed Widget** (NEW renderer) | Render RSS items as ticker/list/card in player | rss_feed_items table via Supabase |
| **Weather Cache** (Edge Function) | Periodic weather fetch per location, cache in DB | OpenWeatherMap API, Supabase DB |
| **Weather Widget** (enhanced renderer) | Render live weather from cached DB data | weather_cache table or existing weatherService |
| **Countdown Widget** (NEW) | Client-side countdown to target datetime | None (pure client-side computation) |
| **Social Feed Widget** (existing, needs wiring) | Render social posts from cached data | social_feeds table (existing) |
| **Data Table Renderer** (NEW) | Render data source as styled table/list | dataBindingResolver (existing) |
| **Player Data Refresh Orchestrator** (NEW) | Poll for stale data, manage refresh intervals | dataBindingResolver.refreshStaleDataSources, Supabase subscriptions |
| **Widget Palette** (scene editor enhancement) | Add new widget types to editor sidebar | sceneDesignService.createWidgetBlock |

### New Widget Types for Scene Editor

Extend the existing `createWidgetBlock` pattern with these new `widgetType` values:

```javascript
// Existing widget types (already in LayoutElementRenderer):
// 'clock', 'date', 'weather', 'qr', 'data'

// NEW widget types to add:
'social_feed'   // Social media feed display (wraps SocialFeedRenderer)
'rss_feed'      // RSS/Atom feed ticker or list
'countdown'     // Countdown timer to target date/time
'data_table'    // Data source rendered as formatted table
'time_weather'  // Combined time + weather composite widget
```

Each widget type stores its config in `block.props`:

```javascript
// RSS Feed widget block
{
  id: 'blk_xxx',
  type: 'widget',
  widgetType: 'rss_feed',
  x: 0, y: 0.9, width: 1, height: 0.1,
  props: {
    feedUrl: 'https://feeds.bbci.co.uk/news/rss.xml',
    layout: 'ticker',        // 'ticker' | 'list' | 'cards'
    maxItems: 10,
    refreshMinutes: 15,
    showImages: true,
    scrollSpeed: 30,          // pixels per second for ticker
    style: { backgroundColor: '#000', textColor: '#fff' }
  }
}

// Countdown widget block
{
  id: 'blk_xxx',
  type: 'widget',
  widgetType: 'countdown',
  x: 0.3, y: 0.3, width: 0.4, height: 0.3,
  props: {
    targetDate: '2026-03-15T09:00:00',
    label: 'Grand Opening',
    showDays: true,
    showHours: true,
    showMinutes: true,
    showSeconds: true,
    completedMessage: 'Event Started!',
    style: { textColor: '#fff', fontSize: 48 }
  }
}

// Data Table widget block
{
  id: 'blk_xxx',
  type: 'widget',
  widgetType: 'data_table',
  x: 0.05, y: 0.15, width: 0.9, height: 0.7,
  props: {
    dataSourceId: 'uuid-of-data-source',
    visibleFields: ['name', 'price', 'description'],
    rowLimit: 10,
    theme: 'dark',            // 'dark' | 'light' | 'branded'
    showHeaders: true,
    alternateRows: true,
    refreshMinutes: 5,
    pagination: 'scroll',     // 'scroll' | 'rotate' | 'none'
    rotationSpeed: 10,        // seconds per page if pagination='rotate'
    style: { headerColor: '#3B82F6', fontSize: 16 }
  }
}

// Social Feed widget block
{
  id: 'blk_xxx',
  type: 'widget',
  widgetType: 'social_feed',
  x: 0, y: 0, width: 0.3, height: 1,
  props: {
    widgetId: 'uuid-from-social-feed-settings',
    accountId: 'uuid-of-social-account',
    provider: 'instagram',
    layout: 'carousel',
    maxItems: 6,
    showCaption: true,
    showLikes: true,
    rotationSpeed: 5
  }
}
```

---

## Data Flow: Source to Screen (Detailed)

### Flow 1: Data Source Widget (Google Sheets / CSV)

```
1. ADMIN: User creates data source on DataSourcesPage
   - Uploads CSV or links Google Sheet
   - Data stored in: data_sources + data_source_fields + data_source_rows

2. ADMIN: User adds data_table or data-bound text block in Scene Editor
   - Block gets { dataBinding: { sourceId, field, rowSelector } }
   - Or for data_table widget: { props: { dataSourceId } }

3. SYNC: dataFeedScheduler checks every 60s for sources needing sync
   - Calls list_data_sources_needing_sync RPC
   - For Google Sheets: fetches via Sheets API, detects changes, updates rows
   - Broadcasts update via Supabase realtime

4. PLAYER: On scene load, player prefetches data sources
   - dataBindingResolver.prefetchSceneDataSources(designJson)
   - Resolves all bindings to values
   - Stores in in-memory cache (5-min TTL for editor, 30-min for player)

5. PLAYER: Refresh loop
   - OPTION A (existing): dataBindingResolver.refreshStaleDataSources(designJson, maxAge)
   - OPTION B (better): Subscribe to data_source_rows changes via Supabase realtime
   - On change: re-resolve bindings, re-render affected blocks

6. PLAYER: Offline fallback
   - Cache resolved data in IndexedDB alongside content
   - Show stale data with optional "Last updated" indicator
```

### Flow 2: RSS Feed Widget

```
1. ADMIN: User adds RSS feed widget in Scene Editor
   - Enters feed URL, selects layout (ticker/list/cards)
   - Config stored in block.props

2. BACKEND: RSS feed proxy (NEW Supabase Edge Function)
   - Fetches RSS/Atom feed XML
   - Parses to JSON (title, link, description, pubDate, image)
   - Caches in rss_feed_items table (NEW)
   - Runs on schedule OR on-demand when player requests

3. PLAYER: Fetches cached feed items from rss_feed_items table
   - No direct RSS fetch (avoids CORS, works offline)
   - Polls on refreshMinutes interval from widget config
   - Renders via RssFeedRenderer component (NEW)

4. PLAYER: Offline fallback
   - IndexedDB cache of last-known feed items
```

### Flow 3: Weather Widget (Enhanced)

```
1. ADMIN: User adds weather widget in Scene Editor
   - Selects location, units, style
   - Config stored in block.props

2. CURRENT APPROACH (sufficient for v1):
   - weatherService.js fetches from OpenWeatherMap directly
   - 30-min in-memory cache prevents excessive API calls
   - Works on player (browser-based, no CORS issues with OWM)

3. ENHANCED APPROACH (for v2 if needed):
   - Edge Function fetches weather per tenant's configured locations
   - Caches in weather_cache table
   - Player reads from cache, never calls external API
   - Better for constrained devices (WebOS, Tizen)

4. PLAYER: Renders via enhanced WeatherWidget component
   - Shows live temp, conditions, optional forecast
   - Refreshes on 30-min interval
```

### Flow 4: Countdown Widget

```
1. ADMIN: User adds countdown widget in Scene Editor
   - Sets target date/time, display format, label

2. PLAYER: Pure client-side rendering
   - No backend needed -- just calculates time remaining
   - requestAnimationFrame or 1-second interval for live countdown
   - Shows "completed" message when target reached

3. OFFLINE: Works perfectly offline
   - Only needs device clock (which is the one dependency)
   - Consider timezone: store target in UTC, convert to device timezone
```

### Flow 5: Social Feed Widget

```
1. ADMIN: User connects social account (existing OAuth flow)
   - socialFeedSyncService syncs posts every 20 minutes
   - Posts cached in social_feeds table

2. ADMIN: User adds social_feed widget in Scene Editor
   - Selects account, layout, display options
   - Creates social_feed_settings entry

3. PLAYER: SocialFeedRenderer (existing) fetches from social_feeds table
   - Already works with cached data only
   - Just needs to be wired into WidgetElement switch statement

4. PLAYER: Refresh
   - social_feed_settings.auto_refresh_minutes controls poll interval
   - Supabase subscription on social_feeds table for push updates
```

---

## Player Refresh Orchestrator (NEW - Critical Component)

The player needs a unified refresh mechanism for all dynamic content. Currently `dataFeedScheduler` only runs in the admin browser tab.

### Design: PlayerDataOrchestrator

```javascript
// src/services/playerDataOrchestrator.js

class PlayerDataOrchestrator {
  constructor(screenId, designJson) {
    this.screenId = screenId;
    this.designJson = designJson;
    this.refreshTimers = new Map();    // widgetId -> intervalId
    this.subscriptions = [];            // Supabase channel unsubscribers
    this.cache = new Map();             // widgetId -> { data, fetchedAt }
    this.listeners = new Set();         // onChange callbacks
  }

  // Start all refresh loops based on widget configs in designJson
  start() {
    const widgets = this.extractDynamicWidgets(this.designJson);

    for (const widget of widgets) {
      // Set up polling based on widget type
      const interval = this.getRefreshInterval(widget);
      if (interval > 0) {
        this.refreshTimers.set(widget.id, setInterval(
          () => this.refreshWidget(widget),
          interval
        ));
      }

      // Set up realtime subscription for push updates
      this.setupRealtimeSubscription(widget);
    }
  }

  getRefreshInterval(widget) {
    switch (widget.widgetType) {
      case 'data_table':
      case 'data':
        return (widget.props.refreshMinutes || 5) * 60 * 1000;
      case 'rss_feed':
        return (widget.props.refreshMinutes || 15) * 60 * 1000;
      case 'weather':
        return 30 * 60 * 1000; // 30 minutes
      case 'social_feed':
        return (widget.props.autoRefreshMinutes || 20) * 60 * 1000;
      case 'countdown':
        return 0; // Client-side only, no server refresh
      case 'clock':
      case 'date':
        return 0; // Client-side only
      default:
        return 0;
    }
  }

  setupRealtimeSubscription(widget) {
    if (widget.widgetType === 'data_table' || widget.widgetType === 'data') {
      const unsub = subscribeToDataSource(widget.props.dataSourceId, () => {
        this.refreshWidget(widget);
      });
      this.subscriptions.push(unsub);
    }
  }

  stop() {
    this.refreshTimers.forEach(timer => clearInterval(timer));
    this.subscriptions.forEach(unsub => unsub());
  }
}
```

### Refresh Strategy by Widget Type

| Widget Type | Refresh Method | Default Interval | Push Updates? |
|-------------|---------------|------------------|---------------|
| `data_table` | Poll DB + Realtime subscription | 5 min | YES (data_source_rows changes) |
| `data` (bound text) | Poll DB + Realtime subscription | 5 min | YES (data_source_rows changes) |
| `rss_feed` | Poll DB (Edge Function refreshes cache) | 15 min | NO (poll only) |
| `weather` | Direct API call with cache | 30 min | NO (poll only) |
| `social_feed` | Poll DB + Realtime subscription | 20 min | YES (social_feeds changes) |
| `countdown` | Client-side timer | N/A (1s tick) | NO |
| `clock` | Client-side timer | N/A (1s tick) | NO |
| `date` | Client-side timer | N/A (1min tick) | NO |

---

## New Components Needed

### New Services

| Service | File | Purpose |
|---------|------|---------|
| RSS Feed Service | `src/services/rssFeedService.js` | Fetch, parse, cache RSS/Atom feeds |
| Player Data Orchestrator | `src/services/playerDataOrchestrator.js` | Unified refresh management for all dynamic widgets on player |

### New Supabase Edge Function

| Function | Purpose |
|----------|---------|
| `rss-feed-proxy` | CORS-safe RSS/Atom fetching and caching |

### New DB Migration

| Table | Purpose |
|-------|---------|
| `rss_feed_configs` | Feed URL, poll interval, max items per tenant |
| `rss_feed_items` | Cached parsed RSS items (title, link, description, image, pubDate) |

### New UI Components

| Component | File | Purpose |
|-----------|------|---------|
| RssFeedRenderer | `src/components/player/RssFeedRenderer.jsx` | Render RSS as ticker/list/cards |
| CountdownRenderer | `src/components/player/CountdownRenderer.jsx` | Countdown timer display |
| DataTableRenderer | `src/components/player/DataTableRenderer.jsx` | Render data source as styled table |
| EnhancedWeatherRenderer | `src/components/player/WeatherRenderer.jsx` | Full weather widget (not just mock) |

### Modified Components

| Component | File | Changes |
|-----------|------|---------|
| LayoutElementRenderer | `src/components/layout-editor/LayoutElementRenderer.jsx` | Add `social_feed`, `rss_feed`, `countdown`, `data_table` cases to WidgetElement switch |
| EditorCanvas | `src/components/scene-editor/EditorCanvas.jsx` | Wire up data refresh for preview |
| PropertiesPanel | `src/components/scene-editor/PropertiesPanel.jsx` | Add widget-specific config panels for each new type |
| sceneDesignService | `src/services/sceneDesignService.js` | Add factory functions for new widget types |
| realtimeService | `src/services/realtimeService.js` | Add `subscribeToDataSourceUpdates` for player |
| playerService | `src/services/playerService.js` | Include data source IDs in player content payload |

---

## Patterns to Follow

### Pattern 1: Widget Block Extension

Follow the existing `createWidgetBlock` pattern. All widget blocks use `type: 'widget'` with a `widgetType` discriminator. Config goes in `props`.

```javascript
// sceneDesignService.js - add new factory functions
export function createRssFeedBlock(options = {}) {
  return {
    id: generateBlockId(),
    type: 'widget',
    widgetType: 'rss_feed',
    x: options.x ?? 0,
    y: options.y ?? 0.9,
    width: options.width ?? 1,
    height: options.height ?? 0.1,
    layer: options.layer ?? 10,
    props: {
      feedUrl: options.feedUrl || '',
      layout: options.layout || 'ticker',
      maxItems: options.maxItems || 10,
      refreshMinutes: options.refreshMinutes || 15,
      ...options.props,
    },
  };
}
```

**Why:** Consistent with existing widget infrastructure. Editor, renderer, and properties panel all dispatch on `widgetType`.

### Pattern 2: Server-Cached External Data

For any external API data (RSS, weather, social), the flow should be:

1. Server/Edge Function fetches external data
2. Data cached in Supabase table with timestamp
3. Player reads from Supabase table (never external API directly)
4. Realtime subscription or polling for freshness

```javascript
// Edge Function: supabase/functions/rss-feed-proxy/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const { feedUrl, feedConfigId } = await req.json();

  // Fetch and parse RSS
  const response = await fetch(feedUrl);
  const xml = await response.text();
  const items = parseRSS(xml); // XML -> JSON

  // Cache in DB
  const supabase = createClient(/* ... */);
  await supabase.from('rss_feed_items')
    .upsert(items.map(item => ({
      feed_config_id: feedConfigId,
      guid: item.guid,
      title: item.title,
      link: item.link,
      description: item.description,
      image_url: item.imageUrl,
      published_at: item.pubDate,
    })), { onConflict: 'feed_config_id,guid' });

  return new Response(JSON.stringify({ count: items.length }));
});
```

**Why:** Avoids CORS issues on player devices (WebOS/Tizen browsers may block cross-origin requests). Enables offline mode. Centralizes rate limiting. One fetch serves all players showing the same feed.

### Pattern 3: Stale-While-Revalidate on Player

The player should always show the last-known data immediately, then refresh in the background.

```javascript
// In player widget renderer
const [data, setData] = useState(null);

useEffect(() => {
  // 1. Show cached data immediately
  const cached = getCachedContent(`widget-${widgetId}`);
  if (cached) setData(cached);

  // 2. Fetch fresh data in background
  fetchFreshData(widgetId).then(fresh => {
    setData(fresh);
    cacheContent(`widget-${widgetId}`, fresh);
  });
}, [widgetId]);
```

**Why:** Digital signage screens should never show loading spinners. Stale data is better than no data. The `dataBindingResolver` already implements this pattern (returns stale cache on fetch error).

### Pattern 4: Composition Over New Block Types

Do NOT create new top-level block types. Use `type: 'widget'` with `widgetType` variants. This keeps the editor's drag-drop, resize, layering, and snapping logic unchanged.

**Why:** The EditorCanvas, PropertiesPanel, and LayoutElementRenderer all dispatch on `block.type`. Adding a new `type` would require changes in 10+ places. Adding a new `widgetType` requires changes in exactly 3 places: WidgetElement switch, PropertiesPanel widget section, and the widget palette.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Player Calling External APIs Directly

**What:** Player fetches RSS/weather/social data directly from external APIs.
**Why bad:** CORS failures on WebOS/Tizen. Rate limit hits from N players. No offline support. API keys exposed to client.
**Instead:** All external data goes through server-side caching. Player reads only from Supabase.

### Anti-Pattern 2: Separate Content Pipelines Per Widget Type

**What:** Each widget type has its own page, service, DB schema, and rendering pipeline.
**Why bad:** Duplicated infrastructure. Inconsistent behavior. Hard to add new widget types later.
**Instead:** Use the existing block/widget pattern. All widgets live in scene `design_json` blocks. All server-cached data flows through standardized tables. The renderer dispatches on `widgetType`.

### Anti-Pattern 3: Global Polling Intervals

**What:** One global refresh interval for all dynamic content on a screen.
**Why bad:** Weather needs 30-min refresh, RSS needs 15-min, data tables might need 1-min. A single interval either wastes bandwidth or shows stale data.
**Instead:** Per-widget `refreshMinutes` in props. The PlayerDataOrchestrator manages independent timers per widget.

### Anti-Pattern 4: Storing Widget Data in design_json

**What:** Embedding actual RSS items or weather data inside the slide's `design_json`.
**Why bad:** `design_json` bloats. Every refresh requires updating the scene. Breaks real-time subscriptions (scene update != data update). Violates separation of config vs data.
**Instead:** `design_json` stores widget CONFIG (feed URL, data source ID, location). Actual DATA lives in purpose-built tables. Player fetches data at render time.

### Anti-Pattern 5: Real-Time for Everything

**What:** Using Supabase realtime subscriptions for weather and RSS updates.
**Why bad:** Weather and RSS updates are infrequent and don't benefit from sub-second latency. Each subscription consumes a WebSocket channel. Players already use several channels.
**Instead:** Use realtime only for data_source_rows and social_feeds (where user edits should reflect immediately). Use polling for weather and RSS (which update on fixed server-side intervals anyway).

---

## Scalability Considerations

| Concern | At 100 screens | At 10K screens | At 100K screens |
|---------|---------------|----------------|-----------------|
| Weather API calls | Direct API OK (100 locations, 30-min cache) | Need server-side cache (deduplicate by location) | Must use Edge Function cache; batch by location |
| RSS feed fetching | Direct via Edge Function per feed | Deduplicate: one fetch per unique URL regardless of screen count | Rate limit external RSS servers; aggressive cache TTLs |
| Data source polling | Supabase realtime works fine | Channel fan-out concern; consider broadcast channel | Move to pg_notify with fan-out service |
| Social feed sync | socialFeedSyncService handles well | Needs server-side scheduler (not browser-based) | Dedicated worker process for sync |
| Offline cache size | ~1MB per screen in IndexedDB | Same per screen | Same; add cache eviction policies |

### Key Scaling Decision: Where Does Sync Run?

Currently `dataFeedScheduler` and `socialFeedSyncService` run in the admin's browser tab. This works for small deployments but fails when:
- Admin tab is closed
- Multiple admin tabs create duplicate syncs
- Need guaranteed sync timing

**Recommendation for this milestone:** Keep browser-based sync for now. Add the RSS Edge Function as the first server-side sync. Plan migration of all sync to Supabase Edge Functions or pg_cron in a future milestone.

---

## Integration Map: New vs Modified

```
NEW FILES:
  src/services/rssFeedService.js          -- RSS fetch, parse, cache
  src/services/playerDataOrchestrator.js  -- Player refresh management
  src/components/player/RssFeedRenderer.jsx
  src/components/player/CountdownRenderer.jsx
  src/components/player/DataTableRenderer.jsx
  src/components/player/WeatherRenderer.jsx
  supabase/functions/rss-feed-proxy/index.ts
  supabase/migrations/XXX_rss_feed_tables.sql

MODIFIED FILES:
  src/components/layout-editor/LayoutElementRenderer.jsx  -- Add widget cases
  src/components/scene-editor/EditorCanvas.jsx            -- Wire data preview
  src/components/scene-editor/PropertiesPanel.jsx         -- Widget config panels
  src/services/sceneDesignService.js                      -- Widget factory fns
  src/services/realtimeService.js                         -- Data source subs
  src/services/playerService.js                           -- Include data refs
  src/config/appCatalog.js                                -- New app entries

UNCHANGED (already complete):
  src/services/dataSourceService.js       -- Fully functional
  src/services/dataBindingResolver.js     -- Fully functional
  src/services/dataFeedScheduler.js       -- Fully functional
  src/services/googleSheetsService.js     -- Fully functional
  src/services/weatherService.js          -- Functional (enhance later)
  src/services/socialFeedSyncService.js   -- Fully functional
  src/components/player/SocialFeedRenderer.jsx -- Fully functional
  src/pages/DataSourcesPage.jsx           -- Fully functional
```

---

## Suggested Build Order

Based on dependency analysis:

1. **Data Table Widget** (lowest risk, highest existing foundation)
   - Depends on: dataSourceService (done), dataBindingResolver (done)
   - New: DataTableRenderer, widget factory, editor panel, WidgetElement case
   - Why first: Most infrastructure already exists. Validates the widget extension pattern.

2. **Countdown Widget** (zero backend dependencies)
   - Depends on: nothing external
   - New: CountdownRenderer, widget factory, editor panel
   - Why second: Pure client-side. Quick win. No backend work.

3. **Enhanced Weather Widget** (small enhancement)
   - Depends on: weatherService (done)
   - New: WeatherRenderer with live API calls, widget config panel
   - Why third: Service exists, just needs proper rendering.

4. **Social Feed Widget Integration** (wiring only)
   - Depends on: SocialFeedRenderer (done), socialFeedSyncService (done)
   - New: Wire into WidgetElement, add config panel
   - Why fourth: All infrastructure exists. Just connecting pieces.

5. **RSS Feed Widget** (most new infrastructure)
   - Depends on: NEW Edge Function, NEW DB tables, NEW service
   - New: Everything from proxy to renderer
   - Why fifth: Most greenfield work. Riskiest. Needs the most testing.

6. **Player Data Orchestrator** (integration layer)
   - Depends on: All widgets above being functional
   - New: Unified refresh management, realtime subscriptions
   - Why last: This is the glue. Build it after individual widgets work.

---

## Sources

- **Codebase analysis:** All findings come from reading the actual BizScreen source code
  - `src/services/dataSourceService.js` - 1286 lines, complete CRUD + bindings + realtime
  - `src/services/dataBindingResolver.js` - 398 lines, caching + resolution + player utilities
  - `src/services/dataFeedScheduler.js` - 431 lines, scheduler with events + retry
  - `src/services/googleSheetsService.js` - 517 lines, fetch + sync + change detection
  - `src/services/weatherService.js` - 479 lines, OWM API + forecast + cache
  - `src/services/socialFeedSyncService.js` - 445 lines, multi-provider sync
  - `src/services/playerService.js` - 869 lines, offline cache + commands + backoff
  - `src/services/realtimeService.js` - 333 lines, device + content subscriptions
  - `src/components/player/SocialFeedRenderer.jsx` - 427 lines, 5 layout modes
  - `src/components/layout-editor/LayoutElementRenderer.jsx` - 247 lines, widget dispatch
  - `src/services/sceneDesignService.js` - block model with widget blocks
  - `supabase/migrations/077_dynamic_data_sources.sql` - data source schema
  - `supabase/migrations/078_realtime_data_feeds.sql` - sync infrastructure
  - `supabase/migrations/081_social_media_feeds.sql` - social feed schema
- **Confidence:** HIGH - all claims verified against actual source code, not assumptions
