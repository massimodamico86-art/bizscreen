# Phase 58: Weather Security + Enhancement - Research

**Researched:** 2026-02-17
**Domain:** API key security (Edge Function proxying), weather forecast display, timezone formatting, offline caching (IndexedDB)
**Confidence:** HIGH

## Summary

Phase 58 secures the weather API key by moving it server-side into a Supabase Edge Function proxy (following the established `rss-proxy` and `unsplash-proxy` patterns), adds multi-day forecast display to the weather widget, applies screen-timezone-aware formatting, and caches weather data in IndexedDB for offline player resilience.

The codebase already has every building block needed. Two proven Edge Function proxies exist (`supabase/functions/rss-proxy/index.ts` and `supabase/functions/unsplash-proxy/index.ts`), each with shared CORS headers, JWT auth, database-backed caching, and error handling. The RSS widgets in `src/player/components/widgets/` demonstrate the exact client-side pattern: call via `supabase.functions.invoke()`, cache to IndexedDB via `cacheService.js`, fall back to cached data when offline, and show a `SyncStatusIndicator`. The weather service (`src/services/weatherService.js`) already implements forecast fetching (`getWeatherForecast`) and forecast data formatting (`formatForecastData`), though it currently calls OpenWeatherMap directly with the exposed API key. The clock/date widgets demonstrate the timezone pattern: a per-widget `resolveTimezone()` function that prioritizes widget timezone override > screen timezone > browser fallback, using `Intl.DateTimeFormat` for all formatting.

**Primary recommendation:** Follow the rss-proxy/unsplash-proxy Edge Function pattern exactly for weather-proxy. Follow the RssCardWidget pattern exactly for offline caching. Follow the ClockWidget pattern exactly for timezone formatting. No new libraries needed.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WTHR-01 | Weather API key is proxied through server-side Edge Function (not exposed in client bundle) | Create `supabase/functions/weather-proxy/index.ts` following `rss-proxy` pattern. Create `weatherProxyService.js` client following `unsplashProxyService.js` pattern. Migrate `weatherService.js` to call proxy instead of OpenWeatherMap directly. Remove `VITE_OPENWEATHER_API_KEY` from client code. |
| WTHR-02 | Weather widget displays forecast mode (multi-day forecast in zone widget, not just current conditions) | `weatherService.js` already has `getWeatherForecast()` and `formatForecastData()`. Weather proxy must support `action: 'forecast'` in addition to `action: 'current'`. Add `mode` prop to WeatherWidget: 'current' (default) or 'forecast'. Update registry defaultProps. Update editor controls. |
| WTHR-03 | Weather widget uses screen's timezone for display formatting | Follow `ClockWidget.jsx` pattern: duplicate `resolveTimezone()` in WeatherWidget, accept `timezone` prop from SceneWidgetRenderer, format times with `Intl.DateTimeFormat({ timeZone: resolvedTz })`. WeatherWidget signature already receives `timezone` from parent but doesn't use it. |
| WTHR-04 | Weather widget caches data to IndexedDB for offline display with "last updated" indicator | Follow `RssCardWidget.jsx` pattern: add `WEATHER` store to `cacheService.js` (bump DB_VERSION to 4), create `cacheWeatherData`/`getCachedWeatherData` functions, pass `cacheFn` to `useWidgetData`, add offline fallback `useEffect`, show `SyncStatusIndicator` (already present). |
</phase_requirements>

## Standard Stack

### Core (No New Libraries)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Edge Functions (Deno) | N/A | Server-side weather API proxy | Established pattern: 2 proxies already deployed |
| `@supabase/supabase-js` | ^2.80.0 | Client-side Edge Function invocation | `supabase.functions.invoke()` handles auth headers automatically |
| `idb` | ^8.0.3 | IndexedDB wrapper for offline caching | Already used by `cacheService.js` |
| `Intl.DateTimeFormat` | Built-in | Timezone-aware formatting | Established pattern in ClockWidget, DateWidget, ClockDateWidget |
| OpenWeatherMap API | v2.5 | Weather data (current + forecast) | Already in use; `/weather` and `/forecast` endpoints |

### Supporting (No New Libraries)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | Existing | Icons for editor controls | Forecast mode toggle, weather style picker |
| React | ^19.1.1 | Component rendering | Existing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OpenWeatherMap 2.5 `/forecast` | OWM One Call API 3.0 | One Call gives 8-day forecast + hourly, but requires separate subscription. Free tier 2.5 forecast (5-day/3-hour) is sufficient for WTHR-02. |
| Server-side DB cache | In-memory cache in Edge Function | Edge Functions are stateless (Deno isolates), so in-memory cache is lost between invocations. DB cache is the established pattern. |
| Shared `resolveTimezone` util | Per-widget duplicate | Phase 56 decision: duplicate ~5-line helper per widget to avoid cross-component coupling. Follow precedent. |

**Installation:**
```bash
# No new packages needed. All dependencies are already installed.
```

## Architecture Patterns

### Recommended File Structure
```
supabase/functions/
  weather-proxy/
    index.ts              # NEW - Edge Function handler
  _shared/
    cors.ts               # EXISTING - shared CORS headers

supabase/migrations/
  XXX_create_weather_cache.sql  # NEW - server-side cache table

src/services/
  weatherProxyService.js  # NEW - client-side proxy service
  weatherService.js       # MODIFIED - swap direct API calls for proxy calls
  geolocationService.js   # MODIFIED - swap direct API calls for proxy calls

src/player/
  cacheService.js         # MODIFIED - add WEATHER store (DB_VERSION 4)
  components/widgets/
    WeatherWidget.jsx     # MODIFIED - add forecast mode, timezone, offline cache

src/widgets/
  registry.js             # MODIFIED - add mode, timezone to weather defaultProps

src/components/
  layout-editor/
    LayoutPropertiesPanel.jsx  # MODIFIED - add forecast mode toggle
  scene-editor/
    PropertiesPanel.jsx        # MODIFIED - add forecast mode toggle
```

### Pattern 1: Edge Function Proxy (WTHR-01)
**What:** Server-side proxy that hides the API key, caches responses in Supabase, and returns sanitized data.
**When to use:** Any external API call that requires a secret key.
**Example:** (Derived from `rss-proxy/index.ts` and `unsplash-proxy/index.ts`)
```typescript
// supabase/functions/weather-proxy/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const CACHE_TTL_MINUTES = 15;
const OWM_BASE = 'https://api.openweathermap.org/data/2.5';

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Auth: verify JWT OR accept anon key (player devices are unauthenticated)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ ok: false, error: { code: 'UNAUTHORIZED' } }, 401);
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Try user auth first; fall back to verifying the anon key
  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  // If no user and token !== anon key, reject
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!user && token !== anonKey) {
    return jsonResponse({ ok: false, error: { code: 'UNAUTHORIZED' } }, 401);
  }

  const body = await req.json();
  const { action, ...params } = body;

  switch (action) {
    case 'current': return handleCurrentWeather(supabaseAdmin, params);
    case 'forecast': return handleForecast(supabaseAdmin, params);
    case 'geocode': return handleGeocode(supabaseAdmin, params);
    default: return jsonResponse({ ok: false, error: { code: 'BAD_REQUEST' } }, 400);
  }
});
```

### Pattern 2: Client-Side Proxy Service (WTHR-01)
**What:** Thin client service that calls the Edge Function via `supabase.functions.invoke()`.
**When to use:** All weather data fetching from client code.
**Example:** (Derived from `rssFeedService.js` and `unsplashProxyService.js`)
```javascript
// src/services/weatherProxyService.js
import { supabase } from '../supabase.js';

export async function fetchCurrentWeather(city, options = {}) {
  const { data, error } = await supabase.functions.invoke('weather-proxy', {
    body: { action: 'current', city, units: options.units || 'imperial' },
  });
  if (error) throw new Error(`Weather fetch failed: ${error.message}`);
  if (!data?.ok) throw new Error(data?.error?.message || 'Weather proxy error');
  return data.data;
}

export async function fetchWeatherForecast(city, options = {}) {
  const { data, error } = await supabase.functions.invoke('weather-proxy', {
    body: { action: 'forecast', city, units: options.units || 'imperial' },
  });
  if (error) throw new Error(`Forecast fetch failed: ${error.message}`);
  if (!data?.ok) throw new Error(data?.error?.message || 'Forecast proxy error');
  return data.data;
}
```

### Pattern 3: Offline Cache Fallback (WTHR-04)
**What:** Widget loads cached data from IndexedDB when network fetch fails or hasn't completed yet.
**When to use:** All data-fetching widgets on player screens.
**Example:** (Directly from `RssCardWidget.jsx` -- this is the exact pattern to replicate)
```javascript
// In WeatherWidget.jsx
const cacheFnCb = useCallback(async (_key, data) => {
  await cacheWeatherData(sourceKey, data);
}, [sourceKey]);
const { data: weatherData, lastFetchedAt } = useWidgetData(
  sourceKey, fetchFnCb, 10 * 60 * 1000, cacheFnCb
);

// Offline cache fallback
useEffect(() => {
  if (weatherData) return; // Already have data
  getCachedWeatherData(sourceKey).then(cached => {
    if (cached) setOfflineData(cached);
  }).catch(() => {});
}, [sourceKey, weatherData]);
```

### Pattern 4: Timezone Resolution (WTHR-03)
**What:** Per-widget helper that resolves which timezone to use for formatting.
**When to use:** Any widget displaying time-dependent information.
**Example:** (From `ClockWidget.jsx` -- duplicate in WeatherWidget)
```javascript
function resolveTimezone(widgetTimezone, screenTimezone) {
  if (widgetTimezone && widgetTimezone !== 'screen') return widgetTimezone;
  if (screenTimezone) return screenTimezone;
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
```

### Anti-Patterns to Avoid
- **Shared resolveTimezone import:** Phase 56 decision explicitly chose per-widget duplication over shared imports to avoid cross-component coupling. Do NOT create a shared utility.
- **Client-side API key fallback:** Do NOT keep `VITE_OPENWEATHER_API_KEY` as a fallback. The whole point is to remove it from the bundle. Mock data is the fallback when the proxy is unavailable.
- **In-memory Edge Function caching:** Deno isolates are stateless. Cache MUST be in the database table, not in a module-level variable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Weather API proxying | Custom fetch endpoint | Supabase Edge Function + `supabase.functions.invoke()` | Auth, CORS, deployment, secrets management are handled automatically |
| Server-side response caching | In-memory Map in Edge Function | Supabase `weather_cache` table with TTL | Edge Function isolates are stateless; in-memory cache is lost between invocations |
| Client-side offline caching | Custom localStorage wrapper | `idb` via existing `cacheService.js` | LRU eviction, structured storage, async API already implemented |
| Timezone formatting | Manual UTC offset calculation | `Intl.DateTimeFormat` with `timeZone` option | Handles DST transitions, IANA zones, locale-aware formatting automatically |
| Forecast data grouping | Custom date grouping logic | Existing `formatForecastData()` in `weatherService.js` | Already handles day grouping, hi/lo calculation, icon selection, condition aggregation |

**Key insight:** Every piece of this phase has a direct precedent in the codebase. The rss-proxy Edge Function is the template for weather-proxy. The RssCardWidget is the template for offline caching. The ClockWidget is the template for timezone handling. The `formatForecastData()` in weatherService.js already does forecast processing.

## Common Pitfalls

### Pitfall 1: Player Auth for Edge Functions
**What goes wrong:** The weather-proxy Edge Function verifies JWT auth (like rss-proxy), but player devices are NOT authenticated users -- they use the anon key. If the Edge Function strictly requires a user JWT, all player weather requests fail with 401.
**Why it happens:** The CMS editor has an authenticated user session, but the player's supabase client only has the anon key.
**How to avoid:** The weather-proxy must accept both authenticated user JWTs AND the anon key. Check `supabase.auth.getUser(token)` first; if that fails, verify the token matches `SUPABASE_ANON_KEY`. This provides security (only valid app clients can call) without blocking unauthenticated players.
**Warning signs:** Weather works in editor preview but shows fallback/mock data on actual player screens.

### Pitfall 2: Removing VITE_OPENWEATHER_API_KEY Too Early
**What goes wrong:** Removing the env var from the client before the proxy is deployed and all call sites are migrated breaks weather functionality during development/staging.
**Why it happens:** Multiple files reference `VITE_OPENWEATHER_API_KEY`: `weatherService.js`, `geolocationService.js`, `supabase.js` (optional check).
**How to avoid:** Migration sequence: (1) Deploy weather-proxy Edge Function with the key as a Supabase secret, (2) Create `weatherProxyService.js` client, (3) Migrate `weatherService.js` to use proxy calls, (4) Migrate `geolocationService.js` geocode calls to proxy, (5) Remove `VITE_OPENWEATHER_API_KEY` references from client code, (6) Remove the env var from `.env.example`, deployment docs, etc.
**Warning signs:** Grep for `VITE_OPENWEATHER_API_KEY` in the built bundle; if present after migration, the key is still exposed.

### Pitfall 3: Timezone Not Passed to WeatherWidget
**What goes wrong:** The `SceneWidgetRenderer` passes `timezone` to widgets, but the current `WeatherWidget` signature is `{ props = {} }` without a `timezone` parameter. The timezone prop is silently dropped.
**Why it happens:** The WeatherWidget was built before the timezone pattern was established in Phase 56. Other widgets (`ClockWidget`, `DateWidget`, `ClockDateWidget`) accept `{ props, timezone }`.
**How to avoid:** Update `WeatherWidget` signature to `{ props = {}, timezone }` and implement `resolveTimezone()`. The registry already flows the timezone prop through the SceneWidgetRenderer.
**Warning signs:** Weather widget shows times in browser-local timezone instead of screen's assigned timezone on player devices in different timezones.

### Pitfall 4: Forecast Mode Layout in Small Widget Zones
**What goes wrong:** Multi-day forecast with 5 day columns doesn't fit in small layout zones. Text overflows or becomes unreadable.
**Why it happens:** The weather widget is often placed in small header/footer zones in layout editor. A forecast widget needs more horizontal or vertical space than current conditions.
**How to avoid:** Forecast mode should adaptively reduce the number of displayed days based on container width. Use `ResizeObserver` or CSS container queries if available, or simply limit to 3 days for small containers. Alternatively, make `forecastDays` a configurable prop (default 5, min 3).
**Warning signs:** Overlapping text, truncated day names, unreadable temperatures in narrow zones.

### Pitfall 5: IndexedDB Version Mismatch on Active Players
**What goes wrong:** Bumping `DB_VERSION` from 3 to 4 triggers IndexedDB's `onupgradeneeded`. If a player device has an active transaction when the upgrade runs, the upgrade blocks. On embedded WebOS/Tizen browsers, this can cause a visible hang.
**Why it happens:** IndexedDB upgrades are blocking operations. The `idb` library handles this via the `upgrade` callback, but if the old DB is in use, the upgrade waits.
**How to avoid:** The existing `cacheService.js` `initDB()` handles upgrades correctly with the `upgrade(db, oldVersion, newVersion)` callback. Just add the new store creation behind `if (oldVersion < 4)` guard, consistent with the existing v2 and v3 upgrade paths. This is already the established pattern.
**Warning signs:** Player screen freezes momentarily on first load after update.

## Code Examples

### Server-Side Cache Table (weather_cache)
```sql
-- Following rss_feed_cache pattern (migration 144)
CREATE TABLE IF NOT EXISTS weather_cache (
  cache_key TEXT PRIMARY KEY,       -- e.g., "current:Miami,FL:imperial" or "forecast:Miami,FL:metric"
  action TEXT NOT NULL,             -- 'current' or 'forecast'
  location TEXT NOT NULL,           -- city name or "lat,lon"
  units TEXT NOT NULL DEFAULT 'imperial',
  response_data JSONB NOT NULL,     -- formatted weather/forecast data
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);

CREATE INDEX IF NOT EXISTS idx_weather_cache_expires ON weather_cache (expires_at);

ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;
-- No RLS policies needed -- only service role accesses this table
```

### IndexedDB Store Addition (cacheService.js)
```javascript
// In cacheService.js -- bump DB_VERSION to 4, add WEATHER store
const DB_VERSION = 4;

const STORES = {
  // ... existing stores
  WEATHER: 'weather',
};

// In upgrade callback:
if (oldVersion < 4) {
  if (!db.objectStoreNames.contains(STORES.WEATHER)) {
    db.createObjectStore(STORES.WEATHER, { keyPath: 'cacheKey' });
  }
}

// New functions:
export async function cacheWeatherData(cacheKey, data) {
  const db = await getDB();
  await db.put(STORES.WEATHER, {
    cacheKey,
    ...data,
    cachedAt: Date.now(),
  });
}

export async function getCachedWeatherData(cacheKey) {
  const db = await getDB();
  return db.get(STORES.WEATHER, cacheKey) || null;
}
```

### Forecast Mode UI in WeatherWidget
```jsx
// Forecast day column (within WeatherWidget when mode='forecast')
{forecastData.map((day) => (
  <div key={day.day} style={{ textAlign: 'center', flex: 1 }}>
    <div style={{ fontSize: secondarySize, opacity: 0.7 }}>{day.day}</div>
    <img src={day.iconUrl} alt={day.condition} style={{ width: 32, height: 32 }} />
    <div style={{ fontSize: tempSize, fontWeight: '600' }}>
      {day.high}{day.tempUnit}
    </div>
    <div style={{ fontSize: secondarySize, opacity: 0.5 }}>
      {day.low}{day.tempUnit}
    </div>
  </div>
))}
```

### Registry Update
```javascript
// In registry.js -- add mode, timezone to weather defaultProps
weather: {
  component: WeatherWidget,
  icon: CloudSun,
  label: 'Weather',
  defaultProps: {
    textColor: '#ffffff',
    location: 'Miami, FL',
    units: 'imperial',
    style: 'minimal',
    mode: 'current',      // NEW: 'current' | 'forecast'
    timezone: 'screen',   // NEW: follows clock/date pattern
    size: 'medium',
  },
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side API key in env var | Server-side proxy via Edge Function | Established in Phase 55 (Unsplash), Phase 55 (RSS) | Weather is the last remaining client-side key exposure |
| Standalone widget data fetching | `useWidgetData` orchestrator + IndexedDB | Phase 56 | Multiple widgets sharing same data source only fetch once |
| Widget-specific timezone logic | Duplicated `resolveTimezone` per widget | Phase 56 decision | Consistent pattern across clock, date, clock-date widgets |

**Deprecated/outdated:**
- `VITE_OPENWEATHER_API_KEY` in client bundle: This is the security issue being fixed. After Phase 58, this env var should NOT exist in client-side code.

## Open Questions

1. **Player Auth for Edge Functions**
   - What we know: Player devices use the supabase anon key, not a user JWT. The rss-proxy and unsplash-proxy Edge Functions verify user JWTs. RSS widgets are imported by the player but may only work when the user is also logged into the CMS in the same browser session.
   - What's unclear: Whether the anon key is sufficient for `supabase.functions.invoke()` to succeed, or if the Edge Function needs to explicitly accept the anon key.
   - Recommendation: The weather-proxy should accept both user JWTs and the anon key. Verify `auth.getUser()` first; if that fails, check if `token === Deno.env.get('SUPABASE_ANON_KEY')`. This matches the security model: only valid app clients can call the proxy.

2. **geolocationService.js Migration**
   - What we know: `geolocationService.js` also uses `VITE_OPENWEATHER_API_KEY` for reverse geocoding and location search (OpenWeatherMap Geocoding API). These calls also need proxying.
   - What's unclear: Whether to add geocoding as a third action in weather-proxy or create a separate proxy.
   - Recommendation: Add `action: 'geocode'` and `action: 'reverse-geocode'` to weather-proxy since they use the same API key. This keeps the proxy cohesive (all OpenWeatherMap calls in one function).

3. **WeatherWall App Migration**
   - What we know: `WeatherWall/index.jsx` calls `getWeatherWallData()` which internally calls `getWeather()` and `getWeatherForecast()`. It needs to be migrated too.
   - What's unclear: Whether WeatherWall should also get IndexedDB caching (it's a full-screen app, not a zone widget).
   - Recommendation: Migrate WeatherWall to use the proxy service. IndexedDB caching for WeatherWall is nice-to-have but not required by WTHR-04 (which specifies "weather widget"). If time permits, reuse the same cache functions.

## Sources

### Primary (HIGH confidence)
- **Codebase: `supabase/functions/rss-proxy/index.ts`** - Complete Edge Function proxy pattern with JWT auth, DB caching, CORS, error handling
- **Codebase: `supabase/functions/unsplash-proxy/index.ts`** - Edge Function pattern with tenant rate limiting and API key management via `Deno.env.get()`
- **Codebase: `supabase/functions/_shared/cors.ts`** - Shared CORS headers for all Edge Functions
- **Codebase: `src/services/weatherService.js`** - Current weather service with `getWeather()`, `getWeatherForecast()`, `getWeatherWallData()`, `formatForecastData()`
- **Codebase: `src/player/components/widgets/WeatherWidget.jsx`** - Current widget with `useWidgetData` orchestrator integration and `SyncStatusIndicator`
- **Codebase: `src/player/components/widgets/RssCardWidget.jsx`** - Reference pattern for offline cache fallback with `cacheRssFeed`/`getCachedRssFeed`
- **Codebase: `src/player/components/widgets/ClockWidget.jsx`** - Reference pattern for `resolveTimezone()` and `Intl.DateTimeFormat` usage
- **Codebase: `src/player/cacheService.js`** - IndexedDB cache with `idb`, LRU eviction, versioned upgrades (v1->v2->v3)
- **Codebase: `src/services/unsplashProxyService.js`** - Client-side proxy service pattern (`supabase.functions.invoke()`)
- **Codebase: `src/services/rssFeedService.js`** - Client-side proxy service pattern (simpler)
- **Codebase: `src/widgets/registry.js`** - Widget registry with defaultProps, component mapping
- **Codebase: `supabase/migrations/144_create_rss_feed_cache.sql`** - Cache table schema pattern with TTL
- **Codebase: `.planning/research/PITFALLS.md`** - Pitfall 1 documents the weather API key exposure problem

### Secondary (MEDIUM confidence)
- **Codebase: `.planning/research/STACK.md`** - Documents the weather-proxy Edge Function as planned work, OpenWeatherMap v2.5 as the API version
- **Codebase: `.planning/codebase/CONCERNS.md`** - Documents the `VITE_OPENWEATHER_API_KEY` security concern
- **Codebase: `src/services/geolocationService.js`** - Also uses the exposed API key for geocoding (must be migrated)

### Tertiary (LOW confidence)
- **OpenWeatherMap API v2.5** - Training knowledge about `/weather` and `/forecast` endpoints. The existing `weatherService.js` code confirms API structure matches training knowledge.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed; every pattern exists in the codebase
- Architecture: HIGH - Direct replication of rss-proxy + RssCardWidget + ClockWidget patterns
- Pitfalls: HIGH - Most pitfalls are derived from direct codebase analysis (auth model, migration order, timezone prop signature)

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable domain, all patterns are established in the codebase)
