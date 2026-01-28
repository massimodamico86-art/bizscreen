# Phase 27: Bundle Baseline

**Generated:** 2026-01-28
**Build tool:** Vite 7.1.7
**Build time:** 10.31s

## Summary

| Metric | Value |
|--------|-------|
| Total JS chunks | 145 files |
| Total size (raw) | 4.3 MB |
| Total size (gzip) | ~1.2 MB (estimated from chunks) |
| Initial load (gzip) | ~175 KB (index + vendor-react + vendor-supabase + vendor-icons) |

## Initial Load Chunks

These chunks are loaded on initial page render (entry point + preloaded vendors):

| Chunk | Raw Size | Gzip Size | Notes |
|-------|----------|-----------|-------|
| index-gwukpPOC.js | 272.61 KB | 87.26 KB | Main entry point |
| vendor-react-DaEGSLnA.js | 44.27 KB | 15.56 KB | React + ReactDOM + Router |
| vendor-supabase-9Ef1stAS.js | 168.07 KB | 41.89 KB | Supabase client |
| vendor-icons-BObnNB0g.js | 61.20 KB | 18.83 KB | lucide-react icons |
| vendor-motion-D2nlPmxw.js | 115.84 KB | 37.17 KB | framer-motion (preloaded) |
| **Initial Total** | **662 KB** | **200.71 KB** | |

**Note:** vendor-motion is preloaded but may not be needed on all initial routes. Worth investigating if this can be deferred.

## Route Chunks

Major route-specific chunks (>50KB raw):

| Chunk | Raw Size | Gzip Size | Route |
|-------|----------|-----------|-------|
| SvgEditorPage-D6iniMlU.js | 422.56 KB | 118.36 KB | /scenes/svg/edit |
| Player-CvnNTSgf.js | 280.82 KB | 68.88 KB | /player/* |
| App-ObWYZtWV.js | 187.57 KB | 48.42 KB | Dashboard shell |
| alertEngineService-tYDLqnZU.js | 177.68 KB | 35.33 KB | Alert system |
| SceneEditorPage-N8HaW_q-.js | 161.70 KB | 35.12 KB | /scenes/edit |
| ScheduleEditorPage-BTs7usnp.js | 108.70 KB | 30.69 KB | /schedules/edit |
| MediaLibraryPage-CydQ9M2t.js | 107.55 KB | 25.21 KB | /media |
| SettingsPage-DGm4hAoO.js | 75.03 KB | 17.12 KB | /settings |
| ListingsPage-CxA2ttMz.js | 76.11 KB | 18.24 KB | /listings |
| DashboardPage-D1tIMR6S.js | 65.67 KB | 16.66 KB | /dashboard |
| ScreensPage-Ck2eGLTi.js | 64.22 KB | 15.65 KB | /screens |
| YodeckLayoutEditorPage-D9tqF4oZ.js | 62.85 KB | 15.08 KB | Yodeck editor |
| CampaignEditorPage-BQF07ET6.js | 52.94 KB | 12.04 KB | /campaigns/edit |

## Medium Chunks (25-50KB)

| Chunk | Raw Size | Gzip Size |
|-------|----------|-----------|
| AppsPage-DGBmCTXA.js | 47.14 KB | 9.10 KB |
| CreateLayoutModal-Dbdgmm93.js | 45.10 KB | 10.83 KB |
| PlaylistEditorPage-X_d_ksyw.js | 44.74 KB | 11.49 KB |
| FeatureFlagsPage-DiBp9jDX.js | 39.75 KB | 8.76 KB |
| TemplatesPage-Dp8G1HQW.js | 32.67 KB | 8.47 KB |
| HelpCenterPage-Cmmhh5qs.js | 32.53 KB | 11.67 KB |
| TemplateCustomizationWizard-DYjhhm7m.js | 32.02 KB | 9.85 KB |
| vendor-qrcode-DA2KNt05.js | 24.73 KB | 9.31 KB |

## Vendor Chunks

| Chunk | Raw Size | Gzip Size | Contents |
|-------|----------|-----------|----------|
| vendor-react-DaEGSLnA.js | 44.27 KB | 15.56 KB | react, react-dom, react-router-dom |
| vendor-supabase-9Ef1stAS.js | 168.07 KB | 41.89 KB | @supabase/supabase-js |
| vendor-icons-BObnNB0g.js | 61.20 KB | 18.83 KB | lucide-react |
| vendor-motion-D2nlPmxw.js | 115.84 KB | 37.17 KB | framer-motion |
| vendor-qrcode-DA2KNt05.js | 24.73 KB | 9.31 KB | qrcode |
| **Vendor Total** | **414.11 KB** | **122.76 KB** | |

## Observations

### Size Concerns

1. **Player chunk (280.82 KB / 68.88 KB gzip):** Significantly larger than expected given Player.jsx is only 23 lines of routing code. This chunk likely contains many dependencies that need investigation.

2. **Index entry (272.61 KB / 87.26 KB gzip):** Large entry chunk suggests shared code could be better split.

3. **App chunk (187.57 KB / 48.42 KB gzip):** Dashboard shell is substantial - may include code that could be lazy loaded.

4. **alertEngineService (177.68 KB / 35.33 KB gzip):** Large service file, worth checking if it's only loaded when needed.

5. **SvgEditorPage (422.56 KB / 118.36 KB gzip):** Largest chunk, but acceptable for an editor that likely includes Fabric.js.

### Potential Optimizations

1. **Preload Review:** vendor-motion (37.17 KB gzip) is preloaded but animations may not be needed on every initial load

2. **Player Route:** Needs investigation - why is it 280KB when the component is 23 lines?

3. **sideEffects: false:** Not currently in package.json, could improve tree shaking

4. **Dynamic Import Warnings:** Build shows 3 warnings about modules that are both statically and dynamically imported - these reduce code splitting effectiveness

## Build Warnings

The build produced 3 dynamic import warnings:

1. `experimentService.js` - static and dynamic import by FeatureFlags components
2. `deviceScreenshotService.js` - static and dynamic import by DeviceDiagnosticsPage
3. `screenshotService.js` - static and dynamic import by player components

These indicate potential tree-shaking issues where modules could be in separate chunks but are prevented due to mixed import patterns.

## Optimization Opportunities

### Player Route Analysis

**Current state:** Player chunk is 280.82 KB raw / 68.88 KB gzip despite Player.jsx being only 23 lines of routing code.

**Player chunk contents (imports traced):**

From `Player.jsx`:
- `PairPage` (player/components/PairPage.jsx) - ~410 lines
- `ViewPage` (player/pages/ViewPage.jsx) - ~1203 lines

From `ViewPage.jsx`:
- `sceneDesignService` - 1,598 lines (ANIMATION_KEYFRAMES, block animations, slide transitions)
- `dataSourceService` - 1,285 lines (data source management, real-time subscriptions)
- `dataBindingResolver` - 397 lines (resolving bindings, prefetch)
- `mediaPreloader` - 543 lines (preloading media assets)
- `playerService` - 868 lines (command polling, offline cache, heartbeat)
- `playbackTrackingService` - 722 lines (scene tracking, analytics)
- `playerAnalyticsService` - 226 lines (playback events)
- `realtimeService` - 332 lines (WebSocket subscriptions)
- `deviceSyncService` - 398 lines (scene updates, refresh flags)
- `screenshotService` - 259 lines (capture and upload)
- `loggingService` - logging infrastructure
- `offlineService` - service worker registration

From `SceneRenderer.jsx`:
- Widgets: ClockWidget, DateWidget, WeatherWidget, QRCodeWidget

**Key finding:** The Player chunk bundles all player-related services and utilities because they're directly imported. This is correct behavior - these services ARE needed by the Player route.

**Why 280KB is reasonable:**
- Player route is a complete TV playback application
- Requires offline support, real-time sync, analytics, scene rendering
- Cannot lazy-load core player functionality (content must play immediately)
- Services (2,800+ lines for player, 3,800+ lines for scene rendering) explain the size

### Potential Optimizations

**1. Defer vendor-motion preload (High Impact)**
- Current: vendor-motion (37.17 KB gzip) is preloaded on initial page load
- Issue: Not all routes need framer-motion immediately
- Potential savings: 37 KB from initial load
- Action: Review if motion preload is necessary for initial routes

**2. sideEffects: false (Medium Impact)**
- Current: Not configured in package.json
- Impact: May allow better tree-shaking of barrel exports
- Action: Add `"sideEffects": false` or specify sideEffectful files
- Risk: Could break imports with side effects

**3. Fix mixed import patterns (Low-Medium Impact)**
- Current: 3 modules have static + dynamic imports causing them to stay in main chunk
- Modules: experimentService, deviceScreenshotService, screenshotService
- Action: Consolidate to either static OR dynamic imports

**4. Index entry chunk reduction (Medium Impact)**
- Current: 272.61 KB / 87.26 KB gzip
- Contains: Shared utilities, contexts, router code
- Action: Review if any code can be moved to route-specific chunks

### Tree Shaking Candidates

| Module | Current State | Recommendation |
|--------|---------------|----------------|
| player/components/index.js | Barrel export | Individual imports already used, OK |
| player/hooks/index.js | Barrel export | Individual imports already used, OK |
| services/* | Individual files | Most already split into chunks |

### Preload Review

| Asset | Size (gzip) | Currently | Recommendation |
|-------|-------------|-----------|----------------|
| vendor-motion | 37.17 KB | Preloaded | Consider deferring |
| vendor-react | 15.56 KB | Preloaded | Keep (required everywhere) |
| vendor-supabase | 41.89 KB | Preloaded | Keep (auth on load) |
| vendor-icons | 18.83 KB | Preloaded | Keep (UI icons needed) |

### Summary of Actionable Optimizations

1. **PERF-02: Defer vendor-motion preload** - ~37 KB savings on initial load
2. **PERF-03: Add sideEffects: false** - Potentially improve tree-shaking
3. **PERF-04: Fix mixed import patterns** - Clean up build warnings

**Note:** The Player chunk size (68.88 KB gzip) is justified by its functionality. Further reduction would require architectural changes like:
- Splitting scene rendering into a separate lazy chunk (only if scene mode used)
- Moving analytics to a deferred module
- These are not recommended for v2.1 due to complexity vs benefit
