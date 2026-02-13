# Domain Pitfalls: Display Toolkit Features

**Domain:** Adding weather, video playback, screen groups/tags, portrait mode, clock/date, QR code, and menu board widgets to existing digital signage platform
**Researched:** 2026-02-13
**Scope:** BizScreen -- React 19, Supabase, S3/CloudFront, 5-device-type player with offline/IndexedDB support

---

## Critical Pitfalls

Mistakes that cause rewrites, player crashes on deployed devices, or data leaks.

---

### Pitfall 1: Weather API Key Exposed on Player Devices

**What goes wrong:** The current `weatherService.js` reads `VITE_OPENWEATHER_API_KEY` from `import.meta.env`, which means the key is bundled into the client JavaScript. On a web/Android/iOS player, anyone can open DevTools or decompile and extract the key. For a multi-tenant SaaS, one compromised player leaks the key for all tenants.

**Why it happens:** The weather widget was initially built for the CMS editor preview (where tenant users are authenticated). When the same code runs on anonymous player devices, the key ships in the bundle.

**Consequences:**
- API key abuse: third parties can exhaust your OpenWeatherMap quota, causing all weather widgets across all tenants to fail.
- Key revocation forces all deployed players to go offline for weather until a new build is pushed.
- Violates OpenWeatherMap ToS (keys must not be exposed in client code).

**Prevention:**
- Create a `weather-proxy` Supabase Edge Function following the exact pattern already established by `rss-proxy/index.ts`. The edge function holds the API key server-side, caches responses in a `weather_cache` table (just like `rss_feed_cache`), and returns sanitized JSON.
- The existing `WeatherWidget.jsx` already fetches via `getWeather()` -- swap the direct OpenWeatherMap call for an edge function invocation. Player devices call the proxy with their screen JWT.
- Cache weather data server-side with 15-30 minute TTL (weather does not change more frequently than this). This also reduces API calls from N-devices-per-location to 1-call-per-location.

**Detection:**
- Grep for `VITE_OPENWEATHER_API_KEY` in the built bundle. If present, the key is exposed.
- Monitor OpenWeatherMap dashboard for unexpected call volume.

**Phase assignment:** Must be addressed in the Weather Widget phase, before any player deployment.

---

### Pitfall 2: Video Autoplay Blocked on WebOS/Tizen/iOS Differently

**What goes wrong:** The current `ZonePlayer.jsx` uses `<video autoPlay muted playsInline>`, which works in Chrome desktop and Android WebView. But WebOS (LG signage), Tizen (Samsung), and iOS each have different autoplay policies:
- **iOS Safari/WKWebView**: Requires `muted` AND `playsInline` AND a user gesture (first video only) in some contexts. Low-power mode throttles video playback entirely.
- **Tizen**: Some Samsung SSSP models require videos to be under specific resolutions/codecs (H.264 Main Profile only, no B-frames) or the decoder silently fails.
- **WebOS**: LG signage panels sometimes require `webOS.mediaCapabilities` API to check codec support before attempting playback. HTML5 video may freeze after 24-48 hours due to memory leaks in the built-in browser.

**Why it happens:** Developers test on Chrome, where autoplay is lenient. They never test on actual signage hardware. The `onError` handler in `ZonePlayer.jsx` calls `advanceToNext`, but `error` events do not always fire -- sometimes the video just silently stalls.

**Consequences:**
- Black screen on deployed signage hardware. The worst UX possible for a signage product.
- Customer reports "screen is blank" but the player thinks it is playing.
- The existing `useStuckDetection.js` checks `videoRef.current.currentTime` but only triggers after 30 seconds of stall, which is too slow for customer perception.

**Prevention:**
- Implement a codec compatibility check at player startup: detect device type from user agent, maintain a codec support map, and transcode or warn at upload time.
- Add a `canplaythrough` event listener. If the event does not fire within 5 seconds, treat it as a playback failure and advance to next content.
- For WebOS and Tizen, implement a periodic memory cleanup: destroy and recreate video elements between plays instead of reusing `src` attribute changes. This prevents the 24-48 hour memory leak.
- Set the stuck detection threshold to 10 seconds (down from 30) for video content specifically.
- Add a fallback poster: if video fails to play, show the thumbnail image for the video's duration, then advance.

**Detection:**
- The existing `useStuckDetection.js` hook with `maxVideoStallMs: 30000` is the detection mechanism. Lower it and add `canplaythrough` timeout.
- Player diagnostics should report `videoElement.error?.code` and `videoElement.readyState` to the heartbeat.

**Phase assignment:** Video Playback phase. Must test on at least one WebOS and one Tizen device.

---

### Pitfall 3: Portrait Mode Breaks All Existing Layouts

**What goes wrong:** The existing `EditorCanvas.jsx` hardcodes `aspect-video` (16:9) via `className="relative aspect-video w-full"`. The `SceneRenderer.jsx` assumes blocks use percentage-based positioning within a 16:9 frame. Adding portrait mode (9:16) requires every component that touches canvas rendering to understand orientation -- but there is no `orientation` field in the scene/design JSON schema.

**Why it happens:** Portrait mode is not just a CSS transform. The block positioning system uses percentage coordinates (x, y, width, height as 0-1 values relative to canvas), which are orientation-agnostic in theory. But visual proportions break: a block at position (0.1, 0.1) with size (0.3, 0.1) looks very different in 9:16 vs 16:9 because the canvas physical dimensions flip.

**Consequences:**
- Existing scenes created in 16:9 look stretched or compressed when displayed in portrait.
- Users design in the editor (which is always 16:9 currently) but the player renders in portrait, causing layout mismatch.
- Template library designed for 16:9 becomes useless for portrait screens without redesign.

**Prevention:**
- Add an `orientation` field to the scene/design JSON schema: `{ orientation: '16:9' | '9:16' | '4:3' | '1:1' }` with default `'16:9'` for backward compatibility.
- The `EditorCanvas` must dynamically set its aspect ratio based on `design.orientation || '16:9'`.
- Do NOT apply CSS `transform: rotate(90deg)` to make portrait work. This approach causes mouse hit-testing to break in the editor and font rendering to degrade on low-powered signage hardware. Instead, change the canvas container's `aspectRatio` CSS property.
- In the player, `LayoutRenderer.jsx` uses `position: absolute` with percentage-based zones. Portrait layouts need the container to be 9:16, and zones should be recomputed for the new dimensions. Do not rotate the entire player output.
- Create separate portrait templates rather than auto-converting landscape ones.

**Detection:**
- If `design.orientation` is undefined, the system must default to landscape. Log a warning when a scene is displayed on a portrait-configured screen without an orientation field.
- On the screen management page, show a mismatch warning when a landscape-designed scene is assigned to a portrait-configured screen.

**Phase assignment:** Portrait Mode phase. Must come AFTER basic layout/scene changes are stable, as it touches EditorCanvas, SceneRenderer, LayoutRenderer, and LayoutEditorCanvas.

---

### Pitfall 4: Missing tenant_id on New Database Tables

**What goes wrong:** New tables for widget configurations, screen group tags, or menu board items are created without `tenant_id` or without proper RLS policies. In a multi-tenant system with Row Level Security, this means:
- Data leaks: one tenant can see another tenant's menu items or weather locations.
- Write failures: INSERT operations fail silently because RLS blocks them.
- Orphaned data: if tenant_id is a FK but the cascade is wrong, deleting a tenant leaves orphaned rows.

**Why it happens:** The developer focuses on the feature logic and copies a table structure from a tutorial or template that does not assume multi-tenancy. The existing codebase is consistent (every table has `tenant_id` with `REFERENCES public.profiles(id) ON DELETE CASCADE`), but a new developer or AI generating SQL might miss this.

**Consequences:**
- Security breach: GDPR/CCPA violation if one tenant's data is exposed to another.
- Silent data corruption: operations succeed in dev (where RLS is sometimes disabled) but fail in production.
- The existing RLS pattern (`tenant_id = auth.uid() OR is_super_admin() OR (is_admin() AND tenant_id IN (SELECT client_id FROM get_my_client_ids()))`) must be applied consistently.

**Prevention:**
- Create a migration template/checklist for every new table:
  1. `tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
  2. `ENABLE ROW LEVEL SECURITY`
  3. Four policies: SELECT, INSERT (WITH CHECK), UPDATE (USING), DELETE (USING) -- all using the standard tenant check pattern from `026_screen_groups_and_campaigns.sql`.
  4. `GRANT SELECT, INSERT, UPDATE, DELETE ON [table] TO authenticated`
  5. Index on `tenant_id`
- Run a pre-deploy verification query: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN (SELECT tablename FROM pg_catalog.pg_policies WHERE schemaname = 'public')` -- any table without policies is a red flag.
- For tables that are accessed by the player (anonymous context), use `SECURITY DEFINER` functions with explicit tenant validation inside the function, following the pattern in `get_player_content`.

**Detection:**
- Migration review must check for `tenant_id` and RLS policies.
- E2E test: create data as Tenant A, verify Tenant B cannot see it.

**Phase assignment:** Every phase that creates new tables. This is a cross-cutting concern.

---

### Pitfall 5: QR Code Widget Missing Import on Player Bundle

**What goes wrong:** The `QRCodeWidget.jsx` at line 75 references `<QRCodeSVG>` but does NOT have an `import { QRCodeSVG } from 'qrcode.react'` statement at the top of the file. The component will throw a ReferenceError at runtime when a QR code widget with a URL is rendered in the player.

**Why it happens:** The widget was extracted from inline rendering in `EditorCanvas.jsx` where `QRCodeSVG` was available in scope (or assumed to be a global). During extraction, the import was missed.

**Consequences:**
- Player crashes with `ReferenceError: QRCodeSVG is not defined` when displaying any QR code widget with a URL value.
- The fallback `QRPlaceholder` renders for empty URLs, masking the bug in editor testing (where URLs are often empty during design).
- This is a runtime error on deployed signage hardware with no developer console.

**Prevention:**
- Add the missing import: `import { QRCodeSVG } from 'qrcode.react';` to `QRCodeWidget.jsx`.
- The editor's `EditorCanvas.jsx` has the same issue at line 550 -- `QRCodeSVG` is referenced but never imported.
- Add a build-time lint rule or test that renders each widget type with non-empty props to catch undefined component references.

**Detection:**
- Unit test: render `<QRCodeWidget props={{ url: 'https://example.com' }} />` -- it will throw immediately.
- The current test mocks (`vi.mock('qrcode.react', () => ({ QRCodeSVG: () => null }))`) mask this bug.

**Phase assignment:** QR Code Widget phase. Fix immediately as part of widget hardening.

---

### Pitfall 6: Clock/Date Widget Shows Wrong Timezone on Player

**What goes wrong:** The current `ClockWidget.jsx` uses `new Date().toLocaleTimeString('en-US', ...)` which renders the clock in the browser's local timezone. But signage player hardware may be configured in UTC, or the business wants the clock to show the screen's assigned timezone (e.g., a New York restaurant's screen deployed with a media player whose OS timezone is set to UTC).

**Why it happens:** `toLocaleTimeString()` without a `timeZone` option uses the system's local timezone. The player already receives `timezone` from the server (`screen.timezone` in `getPlayerContent`), but the `ClockWidget` and `DateWidget` components do not accept or use this parameter.

**Consequences:**
- Clock shows wrong time. For a restaurant or hotel lobby, this is immediately visible and destroys credibility.
- The editor preview (running on the user's laptop) shows the correct time, so the bug is invisible until deployment.

**Prevention:**
- Thread the screen's `timezone` value through to widget props: `SceneRenderer -> SceneWidgetRenderer -> ClockWidget`. The timezone is already available in the player content payload.
- Use `toLocaleTimeString('en-US', { timeZone: props.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, ... })` to respect the configured timezone.
- Add a "Timezone" selector in the widget PropertiesPanel controls, defaulting to "Screen timezone" (which resolves at player runtime).
- The `DateWidget` has the identical issue and needs the same fix.

**Detection:**
- Deploy a player on hardware with UTC timezone, assign a scene with a clock widget. If the time is wrong, the bug is confirmed.
- The `SyncStatusIndicator` already shows last refresh time -- compare it to the clock widget output.

**Phase assignment:** Clock/Date Widget phase. Low effort to fix but high impact.

---

## Moderate Pitfalls

### Pitfall 7: Weather Widget Offline Behavior is Stale-Forever

**What goes wrong:** The `WeatherWidget.jsx` registers with the orchestrator using a 10-minute interval (`10 * 60 * 1000`). When the player goes offline, the orchestrator's fetch fails, the error is caught, and the widget displays the last successfully fetched data. But the widget shows no indication of staleness. After hours offline, the weather display shows yesterday's temperature with no visual indicator.

**Prevention:**
- The `SyncStatusIndicator` component already exists and is rendered by `WeatherWidget`. However, it should visually distinguish between "refreshed 5 minutes ago" (normal) and "refreshed 6 hours ago" (stale). Add a threshold: if `lastFetchedAt` is more than 30 minutes old, show an amber/red indicator.
- When offline AND cached data is older than the configured interval, the widget should fall back to an intentionally vague display: "Weather: --" or show the last-known temp with a "Last updated" timestamp.
- Use the orchestrator's `cacheFn` parameter (already supported but not used by WeatherWidget) to persist weather data to IndexedDB via `cacheContent()` from `playerService.js`, so even after a player restart offline, weather data survives.

**Phase assignment:** Weather Widget phase.

---

### Pitfall 8: Screen Groups/Tags Cascade Deletes Can Orphan Content Assignments

**What goes wrong:** The existing `screen_groups` table uses `ON DELETE SET NULL` for `tv_devices.screen_group_id`. But campaigns target screen groups via `campaign_targets.target_id`. If a screen group is deleted while a campaign references it, the campaign target becomes orphaned (pointing to a UUID that no longer exists, since `campaign_targets.target_id` has no FK constraint on `screen_groups.id` -- the FK is polymorphic based on `target_type`).

**Prevention:**
- Add a `BEFORE DELETE` trigger on `screen_groups` that either:
  a) Prevents deletion if active campaigns reference the group, or
  b) Cascades the deletion to remove `campaign_targets` rows where `target_type = 'screen_group' AND target_id = OLD.id`.
- The UI should warn before deleting a screen group: "This group is targeted by N active campaigns. Removing it will affect those campaigns."
- When adding tags/filter-based targeting (dynamic groups), consider that tags are ephemeral -- a screen can be un-tagged at any time, which changes campaign targeting without any explicit action.

**Phase assignment:** Screen Groups/Tags phase.

---

### Pitfall 9: Menu Board Widget Data Schema is Deceptively Complex

**What goes wrong:** A menu board seems simple (items + prices + categories), but real-world menu boards need:
- Multiple price columns (sizes: S/M/L, or meal vs. a la carte)
- Item availability toggling (86'd items in restaurant lingo)
- Category ordering and sub-categories
- Dietary icons/labels (vegan, gluten-free, allergens)
- Currency formatting per tenant locale
- Item images (optional, thumbnail-sized)
- Time-based pricing (happy hour, lunch specials)

Building a simple `{name, price, category}` schema leads to an immediate rewrite when the first restaurant tenant needs sizes or allergen labels.

**Prevention:**
- Design the `menu_board_items` table with:
  ```sql
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  menu_board_id UUID NOT NULL REFERENCES menu_boards(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  category_order INT DEFAULT 0,
  name TEXT NOT NULL,
  description TEXT,
  prices JSONB DEFAULT '[]', -- [{label: 'Regular', amount: 9.99}, {label: 'Large', amount: 12.99}]
  tags TEXT[] DEFAULT '{}', -- ['vegan', 'gluten-free', 'spicy']
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  ```
- Use JSONB for prices to handle variable price columns without schema changes.
- The widget renderer should gracefully handle items with 0, 1, or multiple prices.
- Currency formatting should use the tenant's locale or an explicit currency setting on the menu board, not hardcode `$`.

**Phase assignment:** Menu Board Widget phase. Needs research into what competitors (Yodeck, Rise Vision, ScreenCloud) offer for menu boards.

---

### Pitfall 10: Widget Type Switching Loses Configuration

**What goes wrong:** In `WidgetControls` within `PropertiesPanel.jsx`, changing the `widgetType` via `handleTypeChange(newType)` calls `onUpdate({ widgetType: newType })`. This preserves the old widget's props. When switching from "weather" (which has `location`, `units`, `style`) to "clock" (which has `size`, `textColor`), the stale weather props remain in the block JSON. This causes:
- Bloated scene JSON with irrelevant properties.
- Potential confusion when switching back (old values reappear unexpectedly).
- For widgets that share prop names with different semantics (e.g., `style` means 'minimal'|'card' for weather but could mean something else for a future widget), cross-contamination occurs.

**Prevention:**
- When `handleTypeChange` is called, reset props to the new widget type's defaults:
  ```js
  function handleTypeChange(newType) {
    const defaults = WIDGET_DEFAULTS[newType] || {};
    onUpdate({ widgetType: newType, props: { textColor: block.props?.textColor, ...defaults } });
  }
  ```
- Preserve only universal props (textColor, size) and clear type-specific props.
- Define `WIDGET_DEFAULTS` as a const map for each widget type.

**Phase assignment:** Any widget phase. Should be fixed early as it affects the editor experience for all new widgets.

---

### Pitfall 11: Multiple Widgets of Same Type Create Redundant Fetches

**What goes wrong:** The `useWidgetData` hook registers with the orchestrator using `sourceKey`. The `WeatherWidget` constructs its key as `weather:${location}:${units}`. If two weather widgets on the same slide have the same location and units, the orchestrator correctly deduplicates (subscriber count increments). But if they have DIFFERENT locations (e.g., "Miami, FL" and "New York, NY"), the orchestrator treats them as separate sources -- which is correct, but the 10-second tick loop will fire both fetches in the same tick, potentially hitting API rate limits.

**Prevention:**
- The orchestrator already has `JITTER_MAX_MS = 30_000` for initial stagger. This helps, but when N different-location weather widgets exist, they can all fire simultaneously after the jitter period.
- Add a `maxConcurrentFetches` limit to the orchestrator (e.g., 2 at a time). The existing tick loop iterates over all entries; change it to queue fetches and limit concurrent execution.
- For weather specifically, the server-side proxy (when implemented per Pitfall 1) can batch multiple locations in a single request.

**Phase assignment:** Weather Widget phase (immediate) and Orchestrator Enhancement (if needed based on widget count).

---

### Pitfall 12: Video in Scene Blocks Does Not Exist Yet

**What goes wrong:** The existing scene editor supports block types: `text`, `image`, `shape`, `widget`. There is no `video` block type. Video playback currently only exists as a playlist item in `ZonePlayer.jsx` and `ViewPage.jsx`. Adding video as a scene block (e.g., a background video or a video element within a designed scene) requires adding an entirely new block type with its own:
- PropertiesPanel controls (source URL, autoplay, loop, muted, fit mode)
- EditorCanvas preview (thumbnail or first frame, not autoplay in editor)
- LivePreviewWindow rendering (actual video playback)
- SceneRenderer player rendering (with offline caching considerations)
- Stuck detection integration

Developers might try to reuse the playlist video code, but scene block video has fundamentally different requirements (positioned within a layout, potentially with other elements overlaid, looping as background).

**Prevention:**
- Define `video` as a new block type alongside `text`, `image`, `shape`, `widget`.
- In the editor, show a thumbnail/poster frame with a play button overlay (do NOT autoplay video in the editor -- it kills performance when editing).
- In the player (`SceneBlock`), render `<video>` with `autoPlay muted loop playsInline` for background videos, and `autoPlay muted playsInline` (no loop) for timed videos that should advance the slide.
- Video blocks need a `loop` prop: `true` = loop continuously (background video), `false` = play once then show last frame or advance slide.
- Cache the video blob to IndexedDB via `offlineService.js` for offline playback. Videos are large -- implement size limits (e.g., max 100MB per video in cache).

**Phase assignment:** Video Playback phase. Consider if video is a new block type or handled through the existing playlist/zone system.

---

### Pitfall 13: EditorCanvas and SceneRenderer Are Diverging Renderers

**What goes wrong:** The codebase has THREE places where scene blocks are rendered:
1. `EditorCanvas.jsx` (`renderBlockContent` function) -- mock/interactive preview in the editor
2. `LivePreviewWindow.jsx` (`PreviewBlock` and `PreviewWidget` functions) -- pixel-accurate preview
3. `SceneRenderer.jsx` (`SceneBlock` and `SceneWidgetRenderer` functions) -- actual player rendering

Each has its own switch statement for widget types. When a new widget is added, it must be added to ALL THREE renderers. Currently, the widget lists are already slightly out of sync (e.g., `CountdownWidget` was added to all three, but the rendering code varies). Each addition risks drift.

**Prevention:**
- Create a shared `WIDGET_REGISTRY` constant that maps widget types to their components:
  ```js
  export const WIDGET_REGISTRY = {
    clock: { editor: ClockEditorPreview, player: ClockWidget, icon: Clock, label: 'Clock' },
    weather: { editor: WeatherEditorPreview, player: WeatherWidget, icon: CloudSun, label: 'Weather' },
    // ...
  };
  ```
- Each renderer imports the registry and looks up the component by type, eliminating the switch statement duplication.
- New widgets are added in one place (the registry), and all three renderers automatically pick them up.
- The `WidgetControls` in `PropertiesPanel.jsx` already has a `widgetTypes` array at line 648 -- this should also derive from the registry.

**Phase assignment:** Should be done BEFORE adding any new widget types. First phase that adds a widget should refactor to registry pattern.

---

### Pitfall 14: Menu Board Widget Font Sizing for TV Display

**What goes wrong:** Menu board content is viewed on TVs from 10-30 feet away. If the widget uses standard web font sizes or responsive `clamp()` values designed for desktop/tablet viewing, the text will be unreadable on a 55" TV mounted 15 feet away. The existing widgets use `clamp(0.3rem, 0.7vw, 0.5rem)` which is appropriate for scene block widgets that are small overlay elements, but a menu board is often full-screen.

**Prevention:**
- Menu board text minimum size should be 24px (item names) and 18px (descriptions) at 1920x1080 resolution. This translates to roughly 1.25rem and 0.94rem at 16px root.
- Category headers should be at least 32px.
- Prices should be the most prominent text on the board (at least 28px).
- The widget should have explicit font size controls in PropertiesPanel rather than relying on the generic "size: small/medium/large" pattern.
- Test readability at 1920x1080 displayed on a monitor from 10+ feet away.

**Phase assignment:** Menu Board Widget phase.

---

## Minor Pitfalls

### Pitfall 15: QR Code Widget Minimum Size for Scannability

**What goes wrong:** QR codes have a minimum physical size to be scannable by phone cameras. At 1920x1080, a QR code widget block sized at 10% width (192px) might be too small to scan reliably, especially with high error correction levels that make the QR pattern denser. The editor does not warn about this.

**Prevention:**
- Add a minimum size warning in the PropertiesPanel when the QR code block is smaller than 15% of canvas width/height.
- Set error correction to 'M' by default (not 'H') -- high error correction makes the QR denser and harder to scan at small sizes.
- The `qrScale` prop (currently 0.5-2.0 range) should default to 1.0 and the editor should show a "may be too small to scan" warning below 0.7.

**Phase assignment:** QR Code Widget phase.

---

### Pitfall 16: Screen Group Tag Queries Without Indexes

**What goes wrong:** The existing `screen_groups` table has a `tags TEXT[] DEFAULT '{}'` column. If filtering screens by tag (e.g., "show all screens tagged 'lobby'"), the query `WHERE 'lobby' = ANY(tags)` does not use the standard B-tree index on the `tags` column. PostgreSQL requires a GIN index for array containment operators.

**Prevention:**
- Add a GIN index on the tags column: `CREATE INDEX idx_screen_groups_tags ON screen_groups USING GIN (tags);`
- Similarly, if tags are added to `tv_devices` for dynamic grouping: `CREATE INDEX idx_tv_devices_tags ON tv_devices USING GIN (tags);`
- Use the `@>` operator for tag matching (which uses GIN indexes): `WHERE tags @> ARRAY['lobby']` instead of `WHERE 'lobby' = ANY(tags)`.

**Phase assignment:** Screen Groups/Tags phase.

---

### Pitfall 17: Clock Widget Interval Leak on Slide Transitions

**What goes wrong:** `ClockWidget.jsx` creates a `setInterval(..., 1000)` in a `useEffect`. When the scene advances to the next slide and the clock widget unmounts, the cleanup function clears the interval. But during the slide transition animation (which can last 700-1500ms per `SlideTransitionControls`), both the old and new slide may be mounted simultaneously (for crossfade/overlap transitions). This means two clock intervals run in parallel during transitions.

**Prevention:**
- This is a minor issue (intervals are cleaned up correctly by React's effect cleanup, and two 1-second intervals for 1.5 seconds is negligible).
- However, for widgets that do heavier work on their interval (weather fetches, RSS re-renders), this overlap during transitions can cause visible flickering as data refreshes mid-transition.
- Solution: Use `requestAnimationFrame` for visual-only updates (clock display) and debounce data fetches to ignore fetches that occur during the transition window.

**Phase assignment:** Clock/Date Widget phase. Low priority.

---

### Pitfall 18: Portrait Mode Content in Landscape Canvas During Scheduling

**What goes wrong:** The scheduling system (`schedule_entries`) assigns content to screens without awareness of orientation. A portrait-designed scene can be scheduled to a landscape screen (and vice versa). The player will render it but it will look wrong (stretched, letterboxed, or cropped depending on implementation).

**Prevention:**
- Add an `orientation` column to `scenes`, `layouts`, and `tv_devices` tables.
- When creating a schedule entry or campaign target, validate that the content orientation matches the target screen orientation. Show a warning in the UI if mismatched.
- The player should handle mismatches gracefully: letterbox (add black bars) rather than stretch.

**Phase assignment:** Portrait Mode phase. Depends on orientation being a first-class field in the schema.

---

### Pitfall 19: Menu Board Price Updates Without Realtime Push

**What goes wrong:** Menu board items stored in the database are fetched by the player periodically. If a restaurant changes a price at 11:30 AM, the player might not reflect the change until the next poll (which could be 5-10 minutes later via the orchestrator). For a menu board, stale pricing is a legal/compliance issue in some jurisdictions.

**Prevention:**
- Use the existing Supabase Realtime subscription pattern (already in `SceneRenderer.jsx` via `subscribeToDataSource`) to push menu board changes immediately.
- The menu board widget should register with the orchestrator for periodic refresh (as backup) AND subscribe to Realtime for instant updates.
- The `DataRefreshContext` already supports this dual approach: the orchestrator handles scheduled refreshes while Realtime triggers immediate re-fetches.

**Phase assignment:** Menu Board Widget phase.

---

### Pitfall 20: Weather Widget Location Geocoding Ambiguity

**What goes wrong:** The current `getWeather()` function accepts a free-text city name (e.g., "Springfield"). OpenWeatherMap's geocoding returns the most popular match, which may not be the user's intended city (there are 34 Springfields in the US). The user types "Springfield" expecting Springfield, IL but gets Springfield, MA.

**Prevention:**
- Use OpenWeatherMap's Geocoding API to show an autocomplete/disambiguation dropdown in the PropertiesPanel when the user types a location.
- Store the resolved `lat,lon` coordinates in the widget props, not just the city name string. This eliminates ambiguity at display time.
- The existing `getWeatherByCoords()` function already supports coordinate-based lookups.

**Phase assignment:** Weather Widget phase. Can be deferred to a polish pass if initial implementation uses unambiguous city names (e.g., "Springfield, IL, US").

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Severity |
|---|---|---|---|
| Weather Widget | API key exposure (P1) | Build weather-proxy Edge Function first | CRITICAL |
| Weather Widget | Offline staleness (P7) | Add cacheFn to orchestrator registration, stale indicator | MODERATE |
| Weather Widget | Location ambiguity (P20) | Store lat/lon, not city name | MINOR |
| Weather Widget | Concurrent fetch rate limits (P11) | Server-side proxy batching, orchestrator concurrency limit | MODERATE |
| Video Playback | Cross-platform autoplay (P2) | Codec checks, canplaythrough timeout, poster fallback | CRITICAL |
| Video Playback | Scene block type missing (P12) | Define video block type, editor vs player rendering | MODERATE |
| Screen Groups/Tags | Cascade delete orphans (P8) | Before-delete trigger, UI warning | MODERATE |
| Screen Groups/Tags | Tag query performance (P16) | GIN index on TEXT[] columns | MINOR |
| Portrait Mode | Breaks existing layouts (P3) | Add orientation to schema, change canvas aspect ratio | CRITICAL |
| Portrait Mode | Scheduling mismatch (P18) | Orientation validation on assignment | MODERATE |
| Clock/Date Widget | Wrong timezone (P6) | Thread screen timezone to widget props | CRITICAL |
| Clock/Date Widget | Interval leak during transitions (P17) | Use requestAnimationFrame for visual updates | MINOR |
| QR Code Widget | Missing import crashes player (P5) | Add qrcode.react import, add render test | CRITICAL |
| QR Code Widget | Too small to scan (P15) | Minimum size warning in editor | MINOR |
| Menu Board Widget | Schema complexity (P9) | JSONB prices, tags array, availability toggle | MODERATE |
| Menu Board Widget | Font sizing for TV (P14) | Explicit size controls, test at viewing distance | MODERATE |
| Menu Board Widget | Stale pricing (P19) | Realtime subscription for instant updates | MODERATE |
| All Widget Phases | Missing tenant_id (P4) | Migration checklist, pre-deploy RLS verification | CRITICAL |
| All Widget Phases | Renderer divergence (P13) | Widget registry pattern before adding new types | MODERATE |
| All Widget Phases | Widget type switching (P10) | Reset props to defaults on type change | MINOR |

## Integration Risks Specific to BizScreen

### Risk: Orchestrator Tick Loop Overload with 7 New Widget Types

The current `useDataRefreshOrchestrator` ticks every 10 seconds and iterates all registered sources. With existing widgets (RSS, social feed, data table, weather) plus 7 new sources (potentially 15-20 active registrations per scene), the tick loop becomes a performance concern on low-powered signage hardware.

**Mitigation:** The tick loop is O(n) with n = registered sources, and each iteration is a simple timestamp comparison (no I/O). This is fine for 20-50 sources. The real concern is concurrent fetches triggered by the tick -- add a `maxConcurrentFetches` guard.

### Risk: IndexedDB Storage Quota on Low-End Devices

Adding video caching, weather caching, and menu board caching to IndexedDB pushes storage requirements. WebOS devices typically allow 50-100MB for IndexedDB. Android WebView allows more (based on device storage), but some embedded signage players have very limited storage.

**Mitigation:** Implement a cache eviction strategy based on content priority: video caches are evicted first (they are largest and can be re-fetched), followed by weather (small, refreshes frequently), followed by menu boards (small, critical for display).

### Risk: Design JSON Schema Growth

Each new widget type adds props to the `design_json` JSONB column on scenes. The column is not validated server-side. Malformed or oversized JSON can cause player rendering errors.

**Mitigation:** Add a JSON schema validation function (or at minimum a max size check) in the scene save flow. The design JSON for a single slide should not exceed 100KB. Log a warning if it exceeds 50KB.

## Sources

- BizScreen codebase analysis (primary source, all findings verified against actual code):
  - `/Users/massimodamico/bizscreen/src/services/weatherService.js` -- API key exposure pattern
  - `/Users/massimodamico/bizscreen/src/player/components/widgets/QRCodeWidget.jsx` -- missing import
  - `/Users/massimodamico/bizscreen/src/player/components/widgets/ClockWidget.jsx` -- timezone handling
  - `/Users/massimodamico/bizscreen/src/player/components/widgets/WeatherWidget.jsx` -- orchestrator integration
  - `/Users/massimodamico/bizscreen/src/player/hooks/useDataRefreshOrchestrator.js` -- tick loop architecture
  - `/Users/massimodamico/bizscreen/src/components/scene-editor/EditorCanvas.jsx` -- 16:9 hardcoding
  - `/Users/massimodamico/bizscreen/src/player/components/SceneRenderer.jsx` -- renderer pattern
  - `/Users/massimodamico/bizscreen/src/player/components/ZonePlayer.jsx` -- video playback pattern
  - `/Users/massimodamico/bizscreen/supabase/migrations/026_screen_groups_and_campaigns.sql` -- RLS pattern
  - `/Users/massimodamico/bizscreen/supabase/functions/rss-proxy/index.ts` -- Edge Function proxy pattern
  - `/Users/massimodamico/bizscreen/src/player/offlineService.js` -- offline caching architecture

- Confidence levels:
  - Pitfalls 1, 3, 4, 5, 6, 10, 13: HIGH -- verified directly in code
  - Pitfalls 2, 7, 8, 9, 11, 12, 14: MEDIUM -- based on code patterns and digital signage domain knowledge
  - Pitfalls 15, 16, 17, 18, 19, 20: MEDIUM -- based on domain experience, not verified with external sources (WebSearch unavailable)
