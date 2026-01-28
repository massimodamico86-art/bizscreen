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
