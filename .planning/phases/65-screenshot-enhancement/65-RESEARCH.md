# Phase 65: Screenshot Enhancement - Research

**Researched:** 2026-02-19
**Domain:** Player screenshot capture, Supabase Storage blob management, on-demand signaling, alert-triggered capture
**Confidence:** HIGH

## Summary

Phase 65 enhances the existing screenshot infrastructure to provide operators with automatic, periodic, and event-driven visual confirmation of what their screens are displaying. The codebase already has roughly 90% of the building blocks in place: `screenshotService.js` handles capture via html2canvas + upload to Supabase Storage + URL persistence via RPC; `deviceScreenshotService.js` provides dashboard functions for requesting screenshots and fetching device info; `usePlayerHeartbeat.js` already processes the `needs_screenshot_update` flag from the heartbeat response; and migration 075 established the DB columns (`last_screenshot_url`, `last_screenshot_at`, `needs_screenshot_update`) and RPCs (`request_device_screenshot`, `store_device_screenshot`).

The primary gaps are: (1) **no periodic auto-capture timer** -- screenshots currently only fire when the server sets the `needs_screenshot_update` flag via an on-demand request, (2) **the `ScreenDetailDrawer` does not display screenshots** -- the existing `DeviceDiagnosticsPage` does, but the primary screen detail view operators use does not, (3) **the on-demand request button is missing from `ScreenDetailDrawer`**, and (4) **no alert-triggered capture** -- when a device recovers from offline, the player does not automatically take a screenshot to confirm content is playing again. All four gaps map cleanly to the four phase requirements (SCRN-01 through SCRN-04).

**Primary recommendation:** Add a 5-minute auto-capture interval in `usePlayerHeartbeat.js`, extend `get_screen_diagnostics` to include screenshot fields, add a screenshot section to `ScreenDetailDrawer` with an on-demand capture button, and wire the heartbeat's auto-resolve path (offline recovery) to trigger a screenshot capture. No new libraries needed.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCRN-01 | Player auto-captures screenshot every 5 minutes while content is playing | Add a 5-minute interval timer in `usePlayerHeartbeat.js` that calls existing `captureAndUploadScreenshot()`. Independent of heartbeat cycle. Use `lastScreenshotRef` to track timing. |
| SCRN-02 | User can view latest screenshot on screen detail page | Extend `get_screen_diagnostics` RPC to return `last_screenshot_url`, `last_screenshot_at`, `needs_screenshot_update`. Add screenshot preview section to `ScreenDetailDrawer.jsx`. |
| SCRN-03 | User can request on-demand screenshot capture from screen detail page | Wire existing `requestDeviceScreenshot()` from `deviceScreenshotService.js` into `ScreenDetailDrawer`. Add "Capture Screenshot" button. Player already processes `needs_screenshot_update` flag on next heartbeat (within 30s). |
| SCRN-04 | Player auto-captures screenshot when an alert event fires (offline recovery, crash detection) | In `usePlayerHeartbeat.js`, detect when heartbeat response indicates the device was previously offline (alert auto-resolved). Trigger `captureAndUploadScreenshot()` on recovery. Also capture on initial content load. |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| html2canvas | ^1.4.1 | DOM-to-canvas screenshot capture | Already installed and used in `screenshotService.js` |
| Supabase JS | ^2.x | Storage upload, RPC calls, realtime | Already used throughout the project |
| React | 18.x | UI components | Already the project framework |
| Lucide React | ^0.x | Icon library (Camera, Image icons) | Already used in design system |
| Tailwind CSS | 3.x | Styling | Already the project styling approach |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| screenshotService | N/A (internal) | Capture + upload + store screenshot pipeline | For all screenshot operations on the player side |
| deviceScreenshotService | N/A (internal) | Dashboard functions for requesting/viewing screenshots | For on-demand capture requests from the dashboard |
| screenDiagnosticsService | N/A (internal) | Diagnostics data fetching for screen detail drawer | For displaying screenshot in ScreenDetailDrawer |
| usePlayerHeartbeat | N/A (internal) | Player heartbeat with screenshot trigger | For periodic capture and alert-triggered capture |
| alertEngineService | N/A (internal) | Alert lifecycle (screenshot failed alert) | For raising alerts on consecutive capture failures |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| html2canvas | dom-to-image | html2canvas is already installed and tested; dom-to-image has known issues with some CSS properties |
| html2canvas | Canvas API directly | Only works for canvas-rendered content; html2canvas handles full DOM including CSS, layout zones, widgets |
| 5-min interval on player | Server-driven periodic requests via flag | Player-side timer is simpler, doesn't require server scheduling; server can't guarantee 5-min cadence when heartbeat is 30s |
| Supabase Storage | S3 direct upload | Supabase Storage is already configured and the pipeline is built |

**Installation:**
No new packages needed. All dependencies are already in the project.

## Architecture Patterns

### Existing Infrastructure Map
```
Player Side (already exists):
  src/player/hooks/usePlayerHeartbeat.js     -- heartbeat + screenshot trigger on flag
  src/services/screenshotService.js          -- captureAndUploadScreenshot(), html2canvas
  src/services/playerService.js              -- updateDeviceStatus() returns needs_screenshot_update
  src/player/cacheService.js                 -- queueOfflineEvent() for offline screenshot queuing

Dashboard Side (already exists):
  src/services/deviceScreenshotService.js    -- requestDeviceScreenshot(), getDeviceScreenshotInfo()
  src/pages/DeviceDiagnosticsPage.jsx        -- full diagnostics page with screenshot display
  src/components/ScreenDetailDrawer.jsx      -- screen detail drawer (NO screenshots yet)
  src/services/screenDiagnosticsService.js   -- getScreenDiagnostics() RPC wrapper

Database (already exists):
  supabase/migrations/075_device_screenshots.sql -- columns, RPCs, indexes
  supabase/migrations/150_offline_detection_cron.sql -- auto-resolve alerts on heartbeat
  supabase/migrations/151_diagnostics_metrics.sql -- get_screen_diagnostics RPC

Storage (already exists):
  Bucket: device-screenshots (configured in screenshotService.js)
  Path pattern: {deviceId}/{timestamp}.jpg
```

### Recommended Changes Structure
```
supabase/migrations/
  152_diagnostics_screenshots.sql   # Extend get_screen_diagnostics to include screenshot fields

src/
  player/hooks/usePlayerHeartbeat.js    # MODIFY: Add 5-min auto-capture interval (SCRN-01)
                                        #          Add capture-on-recovery logic (SCRN-04)
  components/ScreenDetailDrawer.jsx     # MODIFY: Add screenshot section with preview + on-demand button (SCRN-02, SCRN-03)
  services/screenDiagnosticsService.js  # MODIFY: Add screenshot formatting helpers if needed
```

### Pattern 1: Periodic Auto-Capture (SCRN-01)
**What:** Add a 5-minute interval timer in the player heartbeat hook that captures a screenshot independently of the heartbeat cycle
**When to use:** Whenever the player is actively displaying content
**Example:**
```javascript
// In usePlayerHeartbeat.js - add alongside the heartbeat interval
const SCREENSHOT_INTERVAL = 5 * 60 * 1000; // 5 minutes
const lastScreenshotTimeRef = useRef(0);

// Inside sendBeat, after successful heartbeat:
const now = Date.now();
const timeSinceLastScreenshot = now - lastScreenshotTimeRef.current;

if (timeSinceLastScreenshot >= SCREENSHOT_INTERVAL && !screenshotInProgressRef.current) {
  logger.info('Periodic screenshot capture (5-min interval)');
  screenshotInProgressRef.current = true;
  try {
    const container = contentContainerRef?.current || document.body;
    await captureAndUploadScreenshot(screenId, container);
    lastScreenshotTimeRef.current = Date.now();
    await cleanupOldScreenshots(screenId, 5);
  } catch (err) {
    logger.error('Periodic screenshot failed', { error: err });
  } finally {
    screenshotInProgressRef.current = false;
  }
}
```

### Pattern 2: Alert-Triggered Capture (SCRN-04)
**What:** Detect offline recovery in the heartbeat response and trigger a screenshot
**When to use:** When the device was previously offline and just resumed heartbeats
**Example:**
```javascript
// Track previous online state
const wasOfflineRef = useRef(false);

// In sendBeat, check the heartbeat response for recovery:
// The update_device_status RPC auto-resolves device_offline alerts (migration 150).
// If the device was not getting heartbeat responses (offline), the first successful
// heartbeat after recovery should trigger a screenshot.
if (statusResult?.success) {
  if (wasOfflineRef.current) {
    // Device just recovered from offline - capture recovery screenshot
    logger.info('Device recovered from offline, capturing screenshot');
    wasOfflineRef.current = false;
    // Capture screenshot (reuse the existing capture logic)
    if (!screenshotInProgressRef.current) {
      screenshotInProgressRef.current = true;
      try {
        const container = contentContainerRef?.current || document.body;
        await captureAndUploadScreenshot(screenId, container);
        lastScreenshotTimeRef.current = Date.now();
      } catch (err) {
        logger.error('Recovery screenshot failed', { error: err });
      } finally {
        screenshotInProgressRef.current = false;
      }
    }
  }
} else {
  // Heartbeat failed - device may be going offline
  wasOfflineRef.current = true;
}
```

### Pattern 3: Screenshot Section in ScreenDetailDrawer (SCRN-02, SCRN-03)
**What:** Add a new "Latest Screenshot" section between Device Health and Content Source in the drawer
**When to use:** When screen diagnostics include screenshot data
**Example:**
```jsx
{/* Section: Latest Screenshot */}
<div className="p-4 space-y-3">
  <div className="flex items-center justify-between">
    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
      Latest Screenshot
    </h3>
    <button
      onClick={handleRequestScreenshot}
      disabled={screenshotRequesting || screenInfo.needs_screenshot_update}
      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
    >
      {screenshotRequesting ? (
        <><Loader2 size={12} className="animate-spin" /> Requesting...</>
      ) : (
        <><Camera size={12} /> Capture Now</>
      )}
    </button>
  </div>

  {screenInfo.last_screenshot_url ? (
    <div className="rounded-lg overflow-hidden border border-gray-200">
      <img
        src={screenInfo.last_screenshot_url}
        alt="Latest screenshot"
        className="w-full aspect-video object-contain bg-gray-900"
      />
      <div className="p-2 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
        <span>Captured {formatLastSeen(screenInfo.last_screenshot_at)}</span>
        <a href={screenInfo.last_screenshot_url} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  ) : (
    <div className="bg-gray-100 rounded-lg p-6 text-center">
      <Image size={32} className="mx-auto text-gray-400 mb-2" />
      <p className="text-gray-500 text-sm">No screenshot available</p>
      <p className="text-gray-400 text-xs mt-1">Click "Capture Now" to take one</p>
    </div>
  )}
</div>
```

### Pattern 4: Extended Diagnostics RPC (SCRN-02)
**What:** Add `last_screenshot_url`, `last_screenshot_at`, and `needs_screenshot_update` to `get_screen_diagnostics` response
**When to use:** Migration extending the existing RPC
**Example:**
```sql
-- In the SELECT for v_screen, add:
d.last_screenshot_url,
d.last_screenshot_at,
d.needs_screenshot_update

-- In the 'screen' JSONB object, add:
'last_screenshot_url', v_screen.last_screenshot_url,
'last_screenshot_at', v_screen.last_screenshot_at,
'needs_screenshot_update', COALESCE(v_screen.needs_screenshot_update, false)
```

### Anti-Patterns to Avoid
- **Separate screenshot interval timer:** Don't create a separate `setInterval` for screenshots outside the heartbeat hook. Keep all player timing in `usePlayerHeartbeat.js` to avoid race conditions and duplicate captures. Use a ref to track time-since-last-screenshot within the heartbeat cycle.
- **Capturing during loading/error states:** Don't capture screenshots when content is loading or in error state. The `contentContainerRef` may not be attached to meaningful content. Check that content is actually playing before capturing.
- **Blocking heartbeat on screenshot:** The `captureAndUploadScreenshot` is async and can take seconds. Use `screenshotInProgressRef` guard (already exists) to prevent concurrent captures, and never await the screenshot in the critical heartbeat path -- fire-and-forget with error logging.
- **Storing screenshots indefinitely:** The `cleanupOldScreenshots()` function already keeps only the last 5. Always call cleanup after successful capture.
- **Server-driven 5-minute capture:** Don't use pg_cron or server logic to set `needs_screenshot_update` every 5 minutes for all devices. This creates unnecessary DB writes for thousands of devices. Player-side timing is simpler and more efficient.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DOM screenshot capture | Custom canvas rendering | `html2canvas` via `screenshotService.captureScreenshot()` | Already handles CORS, element ignoring, quality settings, blob conversion |
| Screenshot upload pipeline | Custom upload logic | `screenshotService.captureAndUploadScreenshot()` | Already handles capture + upload + DB URL store + offline queuing + alert integration |
| On-demand screenshot request | Custom flag-setting logic | `deviceScreenshotService.requestDeviceScreenshot()` | Already handles RPC call to set `needs_screenshot_update` flag |
| Screenshot URL persistence | Custom DB update | `screenshotService.storeScreenshotUrl()` via `store_device_screenshot` RPC | Already clears the `needs_screenshot_update` flag atomically |
| Screenshot age formatting | Custom time-ago function | `deviceScreenshotService.formatScreenshotAge()` | Already handles all time ranges (just now, minutes, hours, days) |
| Old screenshot cleanup | Custom file management | `screenshotService.cleanupOldScreenshots()` | Already lists + sorts + deletes files beyond keepCount |
| Screenshot failure alerting | Custom error handling | `alertEngineService.raiseScreenshotFailedAlert()` | Already tracks consecutive failures, escalates severity, integrates with alert system |

**Key insight:** The entire screenshot pipeline already exists end-to-end. This phase is primarily about adding triggers (periodic timer, alert-triggered) and wiring the existing pipeline into the ScreenDetailDrawer UI. No new services or RPCs need to be created -- only modifications to existing code.

## Common Pitfalls

### Pitfall 1: html2canvas Performance on Complex Layouts
**What goes wrong:** html2canvas can take 1-3 seconds to render a complex multi-zone layout with videos, iframes, and widgets. If this blocks the heartbeat or runs too frequently, it degrades player performance.
**Why it happens:** html2canvas re-renders the entire DOM tree into a canvas, which is CPU-intensive on low-powered devices (smart TVs, media sticks).
**How to avoid:** (1) Use the existing `SCREENSHOT_CONFIG.scale: 0.5` which halves the rendering work. (2) Use `screenshotInProgressRef` to prevent concurrent captures. (3) The 5-minute interval is long enough that even slow captures don't impact playback. (4) Consider adding a small delay (100ms) after content transitions before capturing to avoid capturing mid-transition.
**Warning signs:** Player FPS dropping during screenshot capture; heartbeat latency spikes.

### Pitfall 2: Cross-Origin Content in Screenshots
**What goes wrong:** html2canvas with `useCORS: true` attempts to load cross-origin images. If the remote server doesn't send CORS headers, the capture may fail or produce a tainted canvas.
**Why it happens:** Content often includes images from CDNs, Unsplash, or user-uploaded URLs that may not have CORS headers.
**How to avoid:** The existing config uses `allowTaint: true` which allows tainted images in the capture (they'll appear but the canvas becomes tainted). Since we convert to blob via `canvas.toBlob()` which works with tainted canvases, this is fine. For videos and iframes, html2canvas renders them as blank rectangles -- this is expected behavior and acceptable for diagnostic purposes.
**Warning signs:** Screenshots showing blank areas where media should be.

### Pitfall 3: Storage Bucket Not Created
**What goes wrong:** The `device-screenshots` storage bucket is referenced in `screenshotService.js` but migration 075 has the bucket creation SQL commented out (noted as "typically done via Supabase dashboard or CLI").
**Why it happens:** Supabase Storage buckets often need to be created via dashboard, not pure SQL migration.
**How to avoid:** Verify the bucket exists in the Supabase dashboard. If not, create it with: public=true, no file size limit (or reasonable limit like 5MB for JPEG screenshots). The migration should include `INSERT INTO storage.buckets` as a safety net.
**Warning signs:** `screenshotService.uploadScreenshot()` throwing "bucket not found" errors.

### Pitfall 4: Screenshot Capture During Offline State
**What goes wrong:** The player captures a screenshot but can't upload it because the device is offline.
**Why it happens:** Periodic capture fires on schedule regardless of connectivity.
**How to avoid:** The existing `captureAndUploadScreenshot()` already handles this -- it checks `navigator.onLine` and queues the screenshot via `queueOfflineEvent()` for later sync. No additional handling needed. The recovery screenshot (SCRN-04) fires AFTER the heartbeat succeeds, so the device is confirmed online.
**Warning signs:** None -- already handled by existing code.

### Pitfall 5: Race Between On-Demand Request and Periodic Capture
**What goes wrong:** An operator clicks "Capture Now" right before the 5-minute periodic capture fires. Two screenshots are taken within seconds of each other.
**Why it happens:** The `needs_screenshot_update` flag and the periodic timer are independent triggers.
**How to avoid:** After any successful screenshot (whether periodic, on-demand, or alert-triggered), reset `lastScreenshotTimeRef.current` to `Date.now()`. This effectively resets the 5-minute timer so the next periodic capture won't fire for another 5 minutes.
**Warning signs:** Two screenshots with timestamps seconds apart in the storage bucket.

### Pitfall 6: Missing `device-screenshots` Bucket RLS Policies
**What goes wrong:** Player (anon role) can't upload screenshots; dashboard users can't view screenshot URLs.
**Why it happens:** Storage bucket has no RLS policies, or policies are too restrictive.
**How to avoid:** The bucket should be public (read) so dashboard users can view screenshots. Upload should be allowed for anon (player) and authenticated roles. The bucket was noted as `public: true` in the commented-out migration, which handles read access. Upload policies need to be created for anon+authenticated.
**Warning signs:** 403 errors on upload or broken image links in the dashboard.

## Code Examples

### Existing captureAndUploadScreenshot flow (already built)
```javascript
// Source: src/services/screenshotService.js (existing)
// This is the complete pipeline that already exists:
export async function captureAndUploadScreenshot(deviceId, element, deviceInfo = null) {
  // 1. Capture DOM to canvas via html2canvas
  const blob = await captureScreenshot(element);

  // 2. Check if online (queue for offline sync if not)
  if (!navigator.onLine) {
    await queueOfflineEvent('screenshot', { deviceId, imageData, ... });
    return null;
  }

  // 3. Upload to Supabase Storage (device-screenshots/{deviceId}/{timestamp}.jpg)
  const url = await uploadScreenshot(deviceId, blob);

  // 4. Store URL in database via store_device_screenshot RPC
  await storeScreenshotUrl(deviceId, url);

  // 5. Auto-resolve any open screenshot-failed alerts
  await autoResolveAlert({ type: ALERT_TYPES.DEVICE_SCREENSHOT_FAILED, deviceId });

  return url;
}
```

### Existing on-demand request flow (already built)
```javascript
// Source: src/services/deviceScreenshotService.js (existing)
// Dashboard calls this when user clicks "Capture Now":
export async function requestDeviceScreenshot(deviceId) {
  // Sets needs_screenshot_update = true on the device via RPC
  const { data, error } = await supabase.rpc('request_device_screenshot', {
    p_device_id: deviceId
  });
  return data === true;
}

// Source: src/player/hooks/usePlayerHeartbeat.js (existing)
// Player checks the flag on every heartbeat (30s):
const statusResult = await updateDeviceStatus(screenId, PLAYER_VERSION, contentHash, metrics);
if (statusResult?.needs_screenshot_update && !screenshotInProgressRef.current) {
  await captureAndUploadScreenshot(screenId, container);
}
```

### Migration: Extend get_screen_diagnostics
```sql
-- Add screenshot fields to the screen object in get_screen_diagnostics
-- In the SELECT, add: d.last_screenshot_url, d.last_screenshot_at, d.needs_screenshot_update
-- In the 'screen' JSONB, add:
--   'last_screenshot_url', v_screen.last_screenshot_url,
--   'last_screenshot_at', v_screen.last_screenshot_at,
--   'needs_screenshot_update', COALESCE(v_screen.needs_screenshot_update, false)
```

### Storage Bucket Creation (safety net)
```sql
-- Ensure device-screenshots bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('device-screenshots', 'device-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anon (player) to upload screenshots
CREATE POLICY "Players can upload screenshots"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'device-screenshots');

-- Allow authenticated users to upload screenshots
CREATE POLICY "Authenticated users can upload screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'device-screenshots');

-- Public read access for viewing screenshots
CREATE POLICY "Public read access to screenshots"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'device-screenshots');
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-driven screenshot request only | Periodic auto-capture + server-driven + alert-triggered (Phase 65) | This phase | Operators always see a recent screenshot (< 5 min) instead of needing to manually request one |
| html2canvas only | html2canvas with `allowTaint: true` + offline queuing | Already in codebase | Screenshots work even with cross-origin content and during intermittent connectivity |
| No screenshot display in screen detail | Screenshot section in ScreenDetailDrawer | This phase | Operators see screenshots in the same view where they manage the screen |

**Deprecated/outdated:**
- The `DeviceDiagnosticsPage.jsx` is a standalone page that duplicates some of the screen detail functionality. With the screenshot section added to `ScreenDetailDrawer`, the diagnostics page becomes less central. It should remain as an advanced view but the primary interaction moves to the drawer.

## Open Questions

1. **Storage bucket existence**
   - What we know: Migration 075 has the bucket creation commented out. `screenshotService.js` references `device-screenshots` bucket. The service has error handling for "bucket not found".
   - What's unclear: Whether the bucket was manually created in the Supabase dashboard or is missing entirely.
   - Recommendation: Include `INSERT INTO storage.buckets` in the migration as a safety net. It's idempotent with `ON CONFLICT DO NOTHING`.

2. **Screenshot capture quality vs. size tradeoff**
   - What we know: Current config is `quality: 0.8, scale: 0.5, format: image/jpeg`. This produces screenshots around 50-150KB.
   - What's unclear: Whether this quality is sufficient for operators to actually diagnose display issues.
   - Recommendation: Keep current settings for periodic captures. For on-demand captures requested by the operator, consider using `quality: 0.9, scale: 0.75` for better detail. This is a minor enhancement that could be added later.

3. **Video frame capture limitation**
   - What we know: html2canvas cannot capture the current frame of a playing video element. Videos appear as black rectangles in screenshots.
   - What's unclear: How significant this is for operators -- most content may be images, layouts, and widgets.
   - Recommendation: Document this as a known limitation. A future enhancement could use `video.captureStream()` or draw the video frame to a canvas manually before the html2canvas capture. This is out of scope for Phase 65.

4. **Initial screenshot on content load**
   - What we know: When a device first loads content, there's no screenshot until either the 5-minute timer fires or an operator requests one.
   - What's unclear: Whether operators expect to see a screenshot immediately after content assignment.
   - Recommendation: Capture a screenshot shortly after initial content load (with a 10-second delay to let content render). This serves double duty as the "first available screenshot" and handles the SCRN-04 case of crash recovery (player restarts = new content load).

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/services/screenshotService.js` -- complete capture + upload + store pipeline with html2canvas
- Codebase analysis: `src/services/deviceScreenshotService.js` -- dashboard functions for screenshot requests and device info
- Codebase analysis: `src/player/hooks/usePlayerHeartbeat.js` -- heartbeat hook with `needs_screenshot_update` handling
- Codebase analysis: `src/components/ScreenDetailDrawer.jsx` -- screen detail drawer (target for screenshot section)
- Codebase analysis: `src/pages/DeviceDiagnosticsPage.jsx` -- existing diagnostics page with screenshot display patterns
- Codebase analysis: `supabase/migrations/075_device_screenshots.sql` -- DB columns, RPCs, indexes for screenshots
- Codebase analysis: `supabase/migrations/150_offline_detection_cron.sql` -- auto-resolve alerts on heartbeat resume
- Codebase analysis: `supabase/migrations/151_diagnostics_metrics.sql` -- get_screen_diagnostics RPC (needs screenshot fields)
- Codebase analysis: `src/services/alertEngineService.js` -- `raiseScreenshotFailedAlert()`, `ALERT_TYPES.DEVICE_SCREENSHOT_FAILED`
- Codebase analysis: `src/player/cacheService.js` -- `queueOfflineEvent()` for offline screenshot queuing
- Codebase analysis: `tests/unit/services/screenshotService.test.js` -- existing unit tests for screenshot service
- Codebase analysis: `tests/unit/services/deviceScreenshotService.test.js` -- existing unit tests for device screenshot service

### Secondary (MEDIUM confidence)
- [html2canvas GitHub](https://github.com/niklasvh/html2canvas) -- confirmed `allowTaint`, `useCORS`, `scale` options; version 1.4.1 is latest stable
- [MDN: HTMLCanvasElement.toBlob()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob) -- blob conversion API used by screenshotService
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage) -- bucket creation, upload, public URL generation

### Tertiary (LOW confidence)
- Video frame capture via html2canvas is a known limitation documented in html2canvas issues. The workaround (canvas drawImage from video element) is well-known but not verified in this codebase's player context.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, no new dependencies
- Architecture: HIGH -- extends existing patterns with minimal new code; all key interfaces are well-understood and have existing tests
- Pitfalls: HIGH -- pitfalls identified from actual codebase patterns, existing error handling, and known html2canvas limitations
- Integration points: HIGH -- Phase 64 heartbeat infrastructure, alert auto-resolve, and diagnostics RPC are fully implemented and verified

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (stable domain, no fast-moving dependencies)
