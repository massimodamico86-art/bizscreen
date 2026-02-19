# Phase 64: Telemetry Pipeline & Offline Detection - Research

**Researched:** 2026-02-19
**Domain:** Device telemetry collection, server-side offline detection, diagnostics UI
**Confidence:** HIGH

## Summary

Phase 64 adds device health metrics to the existing heartbeat pipeline and builds automated offline detection with alert integration. The codebase already has a robust foundation: the player sends heartbeats every 30 seconds via `update_device_status` RPC, the `screen_health_events` table logs online/offline transitions, the `alerts` table with full coalescing/auto-resolve support exists, and the `ScreenDetailDrawer` displays diagnostics. The primary work is: (1) extending the player heartbeat to collect and send memory/storage/network metrics via browser APIs, (2) storing those metrics on the `tv_devices` row, (3) adding a pg_cron job to periodically evaluate heartbeat freshness and raise/resolve offline alerts, and (4) adding a diagnostics section to the ScreenDetailDrawer to display the latest metrics.

The existing `evaluate_all_screens_offline()` SQL function already implements offline detection logic (migration 019), but it is not scheduled -- it requires manual invocation. The existing `raiseDeviceOfflineAlert()` and `autoResolveAlert()` functions in `alertEngineService.js` already handle the alert lifecycle. The key gap is connecting these pieces: a scheduled evaluator that calls the SQL function, wiring the heartbeat to carry metrics, and a UI to display them.

**Primary recommendation:** Extend the existing `update_device_status` RPC to accept a JSONB `p_metrics` parameter, collect metrics client-side using `navigator.deviceMemory`, `navigator.storage.estimate()`, and `navigator.connection`, store them in a new `device_metrics` JSONB column on `tv_devices`, and schedule `evaluate_all_screens_offline()` via pg_cron every 2 minutes. Use the existing `alertEngineService.raiseDeviceOfflineAlert()` and `autoResolveAlert()` for alert lifecycle.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- When a device is offline, show a clear "Device Offline" banner PLUS last known metric values grayed out underneath
- Operators can see stale data is stale while still having the last known values for troubleshooting
- "Last seen" time displayed as relative time ("3 minutes ago"), not absolute timestamps
- Keeps the display human-friendly and scannable
- Standard set as defined in roadmap: memory, storage, network
- No specific fields to include or exclude beyond what the roadmap specifies
- No specific product reference -- clean and functional, matching existing design system

### Claude's Discretion
- **Placement**: Where diagnostics appear on screen detail page (dedicated tab vs inline section vs other)
- **Visual style**: How individual metrics are visualized (numbers, gauges, progress bars)
- **Historical data**: Whether to show latest snapshot only or include mini trend lines
- **List page indicator**: Whether screens list page shows a health status dot/badge per device
- **Network info**: What network details to show (IP, connection type, both, neither)
- **Content sync time**: Whether last content sync timestamp belongs in diagnostics or elsewhere
- **Auto-refresh**: Whether diagnostics auto-update while viewing or require manual refresh
- **Warning treatment**: How concerning metric values are visually flagged (color, tooltips, etc.)
- **Metric thresholds**: What levels constitute healthy/warning/critical for each metric
- **Offline detection sensitivity**: Heartbeat timeout thresholds and grace periods
- **Alert data model**: What information offline alerts carry for Phase 68 to consume

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TELM-01 | Player reports device metrics (memory, storage, network status) piggybacked on heartbeat | Browser APIs (`navigator.deviceMemory`, `navigator.storage.estimate()`, `navigator.connection`) collected in `usePlayerHeartbeat` hook, sent as JSONB via extended `update_device_status` RPC, stored in `tv_devices.device_metrics` column |
| TELM-02 | User can view latest device metrics on screen detail page | New "Device Health" section in existing `ScreenDetailDrawer` component, reading `device_metrics` from the diagnostics RPC response |
| ALRT-01 | Server automatically detects devices that stop sending heartbeats and raises offline alert | pg_cron job calling `evaluate_all_screens_offline()` every 2 minutes, wired to `alertEngineService.raiseDeviceOfflineAlert()` on the server or directly in the SQL function inserting into the `alerts` table |
| ALRT-02 | Server auto-resolves offline alert when device resumes heartbeats | Extended `update_device_status` RPC or `player_heartbeat_with_events` checks for open `device_offline` alerts and resolves them when heartbeat resumes, OR the pg_cron evaluator resolves alerts for devices that are now online |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase JS | ^2.x | Client SDK for RPC calls, real-time subscriptions | Already used throughout the project |
| pg_cron | 1.6.4 | Scheduled job execution in Postgres | Supabase built-in extension, no external scheduler needed |
| React | 18.x | UI components | Already the project framework |
| Lucide React | ^0.x | Icon library | Already used in ScreenDetailDrawer and design system |
| Tailwind CSS | 3.x | Styling | Already the project styling approach |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| alertEngineService | N/A (internal) | Alert lifecycle (raise, coalesce, auto-resolve) | For raising and resolving offline alerts |
| screenDiagnosticsService | N/A (internal) | Diagnostics data fetching for screen detail | For extending diagnostics with telemetry data |
| playerService | N/A (internal) | Heartbeat mechanism | For extending with metrics payload |
| usePlayerHeartbeat hook | N/A (internal) | Heartbeat interval management | For collecting and sending metrics |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pg_cron for offline check | Edge Function on schedule | pg_cron is simpler -- SQL function already exists, no HTTP overhead |
| JSONB column for metrics | Separate `device_metrics` table | JSONB on `tv_devices` avoids joins and is sufficient for latest-snapshot-only display |
| Polling for diagnostics display | Supabase real-time subscription | Polling (manual refresh button) is simpler and the drawer is not always open; auto-refresh with 30s setInterval is a good middle ground |

**Installation:**
No new packages needed. All dependencies are already in the project.

## Architecture Patterns

### Recommended Changes Structure
```
supabase/migrations/
  XXX_telemetry_metrics.sql          # Add device_metrics column, extend update_device_status RPC
  XXX_offline_detection_cron.sql     # pg_cron job + alert-raising SQL function

src/
  player/hooks/usePlayerHeartbeat.js  # MODIFY: Collect metrics, pass to heartbeat
  services/playerService.js           # MODIFY: Extend updateDeviceStatus to accept metrics
  services/screenDiagnosticsService.js # MODIFY: Add metrics to diagnostics response
  components/ScreenDetailDrawer.jsx   # MODIFY: Add Device Health section
  components/screens/PlayerStatusBadge.jsx # MODIFY (optional): Add health indicator
```

### Pattern 1: Metrics Collection on Player
**What:** Collect browser-available metrics and piggyback them on the existing heartbeat RPC call
**When to use:** Every heartbeat cycle (30 seconds)
**Example:**
```javascript
// Source: Browser APIs (MDN)
async function collectDeviceMetrics() {
  const metrics = {};

  // Memory: navigator.deviceMemory (approximate RAM in GB, power of 2)
  // Supported: Chrome, Edge, Opera, Android WebView
  if (navigator.deviceMemory) {
    metrics.memory_gb = navigator.deviceMemory;
  }

  // JS Heap: performance.memory (Chrome/Edge only, non-standard)
  if (performance.memory) {
    metrics.js_heap_used_mb = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
    metrics.js_heap_total_mb = Math.round(performance.memory.totalJSHeapSize / (1024 * 1024));
    metrics.js_heap_limit_mb = Math.round(performance.memory.jsHeapSizeLimit / (1024 * 1024));
  }

  // Storage: navigator.storage.estimate()
  // Supported: Chrome, Edge, Firefox, Safari 17+
  if (navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      metrics.storage_used_mb = Math.round((estimate.usage || 0) / (1024 * 1024));
      metrics.storage_quota_mb = Math.round((estimate.quota || 0) / (1024 * 1024));
      metrics.storage_percent = estimate.quota
        ? Math.round((estimate.usage / estimate.quota) * 100)
        : null;
    } catch {
      // Storage API not available or failed
    }
  }

  // Network: navigator.connection (Chrome, Edge, Opera, Android)
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) {
    metrics.network_type = conn.effectiveType; // '4g', '3g', '2g', 'slow-2g'
    metrics.network_downlink = conn.downlink;  // Mbps estimate
    metrics.network_rtt = conn.rtt;            // Round-trip time in ms
    metrics.network_save_data = conn.saveData; // Data saver mode
  }

  // Always available: online/offline
  metrics.online = navigator.onLine;

  // Timestamp
  metrics.collected_at = new Date().toISOString();

  return metrics;
}
```

### Pattern 2: Extended Heartbeat RPC
**What:** Modify the `update_device_status` SQL function to accept and store a metrics JSONB parameter
**When to use:** Server-side, called by player on every heartbeat
**Example:**
```sql
-- Extend update_device_status to accept metrics
CREATE OR REPLACE FUNCTION update_device_status(
  p_device_id UUID,
  p_player_version TEXT DEFAULT NULL,
  p_cached_content_hash TEXT DEFAULT NULL,
  p_metrics JSONB DEFAULT NULL  -- NEW parameter
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tv_devices
  SET last_seen = NOW(),
      is_online = true,
      player_version = COALESCE(p_player_version, player_version),
      cached_content_hash = COALESCE(p_cached_content_hash, cached_content_hash),
      device_metrics = COALESCE(p_metrics, device_metrics),  -- NEW
      metrics_updated_at = CASE WHEN p_metrics IS NOT NULL THEN NOW() ELSE metrics_updated_at END  -- NEW
  WHERE id = p_device_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Device not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'device_id', p_device_id, 'timestamp', NOW());
END;
$$;
```

### Pattern 3: pg_cron Offline Detection
**What:** Schedule a job to evaluate all screens and raise/resolve offline alerts
**When to use:** Runs every 2 minutes automatically
**Example:**
```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the evaluator function that raises alerts
CREATE OR REPLACE FUNCTION evaluate_and_alert_offline_devices(
  p_threshold_minutes INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_device RECORD;
  v_raised INTEGER := 0;
  v_resolved INTEGER := 0;
BEGIN
  -- 1. Find devices that SHOULD be offline (no heartbeat within threshold)
  --    but don't have an open device_offline alert yet
  FOR v_device IN
    SELECT d.id, d.device_name, d.tenant_id, d.last_seen,
           EXTRACT(EPOCH FROM (NOW() - d.last_seen)) / 60 AS minutes_offline
    FROM tv_devices d
    WHERE d.is_online = true
      AND d.last_seen < NOW() - (p_threshold_minutes || ' minutes')::INTERVAL
  LOOP
    -- Mark device offline
    UPDATE tv_devices SET is_online = false WHERE id = v_device.id;

    -- Insert alert directly (server-side, no auth context)
    INSERT INTO alerts (tenant_id, type, severity, title, message, device_id, meta)
    VALUES (
      v_device.tenant_id,
      'device_offline',
      CASE
        WHEN v_device.minutes_offline >= 60 THEN 'critical'
        WHEN v_device.minutes_offline >= 15 THEN 'warning'
        ELSE 'info'
      END,
      'Device "' || COALESCE(v_device.device_name, 'Unknown') || '" is offline',
      'No heartbeat for ' || ROUND(v_device.minutes_offline) || ' minutes',
      v_device.id,
      jsonb_build_object(
        'device_name', v_device.device_name,
        'minutes_offline', ROUND(v_device.minutes_offline),
        'last_heartbeat', v_device.last_seen
      )
    )
    ON CONFLICT ON CONSTRAINT idx_alerts_coalesce
    DO UPDATE SET
      occurrences = alerts.occurrences + 1,
      last_occurred_at = NOW(),
      severity = CASE
        WHEN EXCLUDED.severity = 'critical' THEN 'critical'
        WHEN alerts.severity = 'critical' THEN 'critical'
        ELSE EXCLUDED.severity
      END,
      meta = alerts.meta || EXCLUDED.meta;

    v_raised := v_raised + 1;
  END LOOP;

  -- 2. Auto-resolve alerts for devices that came back online
  UPDATE alerts
  SET status = 'resolved',
      resolved_at = NOW(),
      resolution_notes = 'Auto-resolved: device resumed heartbeats'
  WHERE type = 'device_offline'
    AND status IN ('open', 'acknowledged')
    AND device_id IN (
      SELECT id FROM tv_devices
      WHERE is_online = true
        AND last_seen >= NOW() - (p_threshold_minutes || ' minutes')::INTERVAL
    );

  GET DIAGNOSTICS v_resolved = ROW_COUNT;

  RETURN jsonb_build_object(
    'raised', v_raised,
    'resolved', v_resolved,
    'evaluated_at', NOW()
  );
END;
$$;

-- Schedule: every 2 minutes
SELECT cron.schedule(
  'evaluate-offline-devices',
  '*/2 * * * *',
  $$ SELECT evaluate_and_alert_offline_devices(5); $$
);
```

### Pattern 4: Diagnostics UI Section (Discretion Recommendation)
**What:** Add a "Device Health" section to the ScreenDetailDrawer
**When to use:** When diagnostics data includes `device_metrics`
**Recommendation:** Inline section within the existing drawer (not a separate tab), placed between "Overview" and "Content Source" sections. Uses the same `bg-gray-50 rounded-lg p-3` card pattern already in the drawer.
**Example structure:**
```jsx
{/* Section: Device Health */}
<div className="p-4 space-y-3">
  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
    Device Health
  </h3>

  {/* Offline Banner (when device is offline) */}
  {!screenInfo.is_online && (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
      <WifiOff size={16} className="text-red-500" />
      <span className="font-medium text-red-800">Device Offline</span>
      <span className="text-red-600 text-sm ml-auto">
        Last seen {formatLastSeen(screenInfo.last_seen)}
      </span>
    </div>
  )}

  {/* Metrics Grid (grayed out when offline) */}
  <div className={`grid grid-cols-2 gap-3 ${!screenInfo.is_online ? 'opacity-60' : ''}`}>
    {/* Memory */}
    <MetricCard label="Memory" value="2 GB" icon={Cpu} status="healthy" />
    {/* Storage */}
    <MetricCard label="Storage" value="45%" icon={HardDrive} status="healthy" />
    {/* Network */}
    <MetricCard label="Network" value="4G / 12 Mbps" icon={Wifi} status="healthy" />
    {/* JS Heap */}
    <MetricCard label="JS Heap" value="128 / 512 MB" icon={Activity} status="warning" />
  </div>
</div>
```

### Anti-Patterns to Avoid
- **Separate telemetry table for latest metrics:** Don't create a separate table with one row per heartbeat. The `tv_devices.device_metrics` JSONB column is sufficient for latest-snapshot display. Time-series data is explicitly out of scope (REQUIREMENTS.md: "Real-time streaming telemetry" is out of scope).
- **Client-side offline detection calling alerts:** Don't have the player try to call `raiseDeviceOfflineAlert()` -- by definition, if the player is offline, it can't make API calls. Offline detection must be server-side.
- **Blocking heartbeat on metrics collection:** `navigator.storage.estimate()` is async and may take time on some devices. Wrap it in a try-catch with a timeout so a slow storage API never delays the heartbeat.
- **Over-frequent cron schedule:** Running the offline evaluator more often than every 2 minutes creates unnecessary load. With a 5-minute offline threshold, checking every 2 minutes gives sufficient detection speed (worst case: 7 minutes to detect, typical: 5-6 minutes).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Alert lifecycle (raise/coalesce/resolve) | Custom alert insertion logic | `alertEngineService.raiseDeviceOfflineAlert()` and `autoResolveAlert()` | Already handles dedup, coalescing, severity escalation, notification dispatch |
| Relative time formatting | Custom time-ago function | `screenDiagnosticsService.formatLastSeen()` | Already exists and handles edge cases (just now, minutes, hours, days) |
| Online status determination | Custom threshold logic | `PlayerStatusBadge.getPlayerStatus()` and `screenDiagnosticsService.getOnlineStatusInfo()` | Already implements 5-minute threshold with color coding |
| Scheduled job execution | External cron / serverless timer | `pg_cron` via `cron.schedule()` | Built into Supabase, zero infrastructure, executes SQL directly |

**Key insight:** The codebase already has 80% of the infrastructure needed. The alert engine, health events table, offline evaluation SQL, and diagnostics service all exist. This phase is primarily about wiring these together and adding the metrics payload to the heartbeat.

## Common Pitfalls

### Pitfall 1: Browser API Availability on Smart TVs
**What goes wrong:** `navigator.deviceMemory`, `performance.memory`, `navigator.connection`, and `navigator.storage.estimate()` have varying support across browsers. Tizen (Samsung) and WebOS (LG) smart TV browsers are Chromium-based but may have restricted APIs.
**Why it happens:** Smart TV browsers lag behind desktop Chrome by years and may disable certain APIs for security/privacy.
**How to avoid:** Every metric collection call MUST be wrapped in a try-catch with a fallback to `null`. The metrics object should use optional fields -- any field that couldn't be collected is simply omitted. The server/UI must handle partial metrics gracefully (show "N/A" for unavailable metrics).
**Warning signs:** Metrics coming back as all-null from certain device types. Add the `user_agent` to the metrics payload so you can identify which platforms are reporting what.

### Pitfall 2: pg_cron Running Without Auth Context
**What goes wrong:** pg_cron jobs run as the database superuser, not as any specific authenticated user. Functions that check `auth.uid()` will fail.
**Why it happens:** pg_cron executes SQL directly in the database without going through the PostgREST/auth layer.
**How to avoid:** The offline evaluator SQL function must be `SECURITY DEFINER` and must NOT reference `auth.uid()`. It should insert alerts directly into the `alerts` table rather than calling the JavaScript `raiseAlert()` function. Use `tenant_id` from the `tv_devices` table, not from auth context.
**Warning signs:** "auth.uid() is null" errors in cron job logs.

### Pitfall 3: Duplicate Alerts on Race Conditions
**What goes wrong:** The cron job runs every 2 minutes. If a device goes offline and the cron fires twice before the device comes back, you get duplicate alerts.
**Why it happens:** Between the first evaluation and the second, the device is still offline, and without proper dedup, a second alert is inserted.
**How to avoid:** The `alerts` table already has a unique partial index (`idx_alerts_coalesce`) that prevents duplicate open alerts for the same type+device combination. Use `ON CONFLICT ... DO UPDATE` (upsert) to increment `occurrences` rather than create a new row. This is already the pattern in `alertEngineService.raiseAlert()`.
**Warning signs:** Multiple open `device_offline` alerts for the same device.

### Pitfall 4: Auto-Resolve Timing
**What goes wrong:** Device sends heartbeat (goes online), but the cron job hasn't run yet, so the alert stays open. Or: device sends heartbeat, cron resolves alert, but the UI still shows the old alert state.
**Why it happens:** The cron job runs on a schedule (every 2 minutes), not reactively.
**How to avoid:** Dual-path resolution: (1) The cron job resolves alerts for devices that are now online, AND (2) the `update_device_status` RPC (called on every heartbeat) also checks for and resolves open `device_offline` alerts for the device. This gives instant resolution when the device comes back, without waiting for the cron.
**Warning signs:** Alerts staying open for 2+ minutes after device reconnects.

### Pitfall 5: Metrics Payload Size
**What goes wrong:** If the metrics JSONB grows too large, it adds overhead to every heartbeat call.
**Why it happens:** Temptation to add more and more fields over time.
**How to avoid:** Keep the metrics payload small and flat. Target: under 500 bytes. Memory (3 fields), storage (3 fields), network (4 fields), online status, timestamp = ~15 fields max. No nested objects, no arrays.
**Warning signs:** Heartbeat latency increasing over time.

## Code Examples

### Collecting Metrics in usePlayerHeartbeat
```javascript
// In src/player/hooks/usePlayerHeartbeat.js
// Add to the sendBeat function, before calling updateDeviceStatus

async function collectDeviceMetrics() {
  const metrics = { collected_at: new Date().toISOString() };

  try {
    if (navigator.deviceMemory) {
      metrics.memory_gb = navigator.deviceMemory;
    }
  } catch { /* API not available */ }

  try {
    if (performance.memory) {
      metrics.js_heap_used_mb = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
      metrics.js_heap_total_mb = Math.round(performance.memory.totalJSHeapSize / (1024 * 1024));
      metrics.js_heap_limit_mb = Math.round(performance.memory.jsHeapSizeLimit / (1024 * 1024));
    }
  } catch { /* API not available */ }

  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      metrics.storage_used_mb = Math.round((est.usage || 0) / (1024 * 1024));
      metrics.storage_quota_mb = Math.round((est.quota || 0) / (1024 * 1024));
      metrics.storage_percent = est.quota ? Math.round((est.usage / est.quota) * 100) : null;
    }
  } catch { /* API not available */ }

  try {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      metrics.network_type = conn.effectiveType;
      metrics.network_downlink = conn.downlink;
      metrics.network_rtt = conn.rtt;
    }
  } catch { /* API not available */ }

  metrics.online = navigator.onLine;
  metrics.user_agent = navigator.userAgent?.substring(0, 200); // Truncate for size

  return metrics;
}
```

### Extending updateDeviceStatus in playerService
```javascript
// In src/services/playerService.js
// Modify updateDeviceStatus to accept and forward metrics

export async function updateDeviceStatus(screenId, playerVersion = null, cachedContentHash = null, metrics = null) {
  if (!screenId) return null;

  try {
    const { data, error } = await supabase.rpc('update_device_status', {
      p_device_id: screenId,
      p_player_version: playerVersion,
      p_cached_content_hash: cachedContentHash,
      p_metrics: metrics,  // NEW parameter
    });

    if (error) {
      logger.error('Failed to update device status', { error, screenId });
      return null;
    }

    return data;
  } catch (err) {
    logger.error('Device status update exception', { error: err, screenId });
    return null;
  }
}
```

### Migration: Add Metrics Column
```sql
-- Add device_metrics column and metrics_updated_at to tv_devices
ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS device_metrics JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS metrics_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tv_devices.device_metrics IS 'Latest device telemetry metrics (memory, storage, network) collected on heartbeat';
COMMENT ON COLUMN public.tv_devices.metrics_updated_at IS 'Timestamp when device_metrics was last updated';
```

### Extending get_screen_diagnostics to Include Metrics
```sql
-- The existing get_screen_diagnostics RPC should include device_metrics
-- in its response. The field will be available via the tv_devices row
-- that the function already queries.
-- Add to the SELECT in the existing function:
--   d.device_metrics,
--   d.metrics_updated_at
```

## Discretion Recommendations

Based on codebase analysis and the existing design patterns:

### Placement: Inline section in ScreenDetailDrawer
**Recommendation:** Add as a new section between "Overview" and "Content Source" in the existing `ScreenDetailDrawer`. Do NOT create a separate tab or page. The drawer already has a consistent section pattern with `h3` headers, `bg-gray-50 rounded-lg` cards, and a `divide-y divide-gray-100` separator.
**Rationale:** Diagnostics are always relevant when viewing screen details. A tab adds a click to reach them. The drawer pattern supports scrollable content well.

### Visual style: Compact metric cards with status color coding
**Recommendation:** Use the same `bg-gray-50 rounded-lg p-3` card pattern as the existing Overview section. Each metric gets a small card with: icon (12px, Lucide), label (text-xs, gray-500), value (text-sm, font-medium). Status colors via left border or icon color: green (healthy), yellow (warning), red (critical).
**Rationale:** Matches the existing design language. No gauges or progress bars -- they take up too much space in a side drawer.

### Historical data: Latest snapshot only
**Recommendation:** Show latest values only. No mini trend lines.
**Rationale:** The requirements explicitly exclude "Real-time streaming telemetry" and "Telemetry history chart" (TELM-04 is a future requirement). The JSONB snapshot approach only stores the latest values. Trend lines would require a time-series storage change.

### List page indicator: Yes -- enhance PlayerStatusBadge
**Recommendation:** The `PlayerStatusBadge` component already shows online/offline/unregistered status. No additional health badge needed for Phase 64 -- the existing online/offline indicator is sufficient since offline detection is the primary alert. A health dot could be added in a future phase when metric thresholds generate alerts (TELM-03).
**Rationale:** Adding too many indicators creates visual noise. The core Phase 64 deliverable is offline detection, which the existing badge already communicates.

### Network info: Show connection type and downlink speed
**Recommendation:** Display `effectiveType` (e.g., "4G") and `downlink` (e.g., "12 Mbps"). Do NOT show IP address (not available via browser API without a server lookup, and adds privacy concerns). Do NOT show RTT (too technical for operators).
**Rationale:** Connection type and speed are the most actionable metrics. "Your screen is on a 2G connection" is useful; "RTT is 450ms" is not.

### Content sync time: Show in the Overview section
**Recommendation:** Add "Last Sync" to the existing Overview grid (alongside Last Seen, Location, Group, Timezone). Use the `last_refresh_at` field from `tv_devices`. Not in the Device Health section.
**Rationale:** Content sync is about content delivery, not device health. The Overview section already shows "Last Seen"; "Last Sync" is a natural companion.

### Auto-refresh: 30-second auto-refresh while drawer is open
**Recommendation:** When the ScreenDetailDrawer is open, set up a 30-second polling interval to re-fetch diagnostics. Show a subtle "Updated Xs ago" indicator next to the refresh button. The existing manual refresh button stays as an immediate trigger.
**Rationale:** 30 seconds matches the heartbeat interval, so each refresh will have fresh data. Auto-refresh provides live monitoring without user action. The drawer already has a refresh button; auto-refresh complements it.

### Warning treatment: Color-coded left border + tooltip
**Recommendation:** Metric cards use a colored left border: `border-l-4 border-green-400` (healthy), `border-l-4 border-yellow-400` (warning), `border-l-4 border-red-400` (critical). On hover, show a tooltip with the threshold explanation (e.g., "JS Heap usage is above 80%").
**Rationale:** Left border is subtle but visible. Tooltips provide context without cluttering the display.

### Metric thresholds
**Recommendation:**
| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| JS Heap % (used/limit) | < 70% | 70-85% | > 85% |
| Storage % (used/quota) | < 70% | 70-90% | > 90% |
| Network type | 4g | 3g | 2g or slow-2g |
| Network downlink | > 5 Mbps | 1-5 Mbps | < 1 Mbps |

**Rationale:** These are reasonable defaults. JS Heap above 85% risks out-of-memory crashes. Storage above 90% may prevent caching. Network below 1 Mbps will struggle with media delivery.

### Offline detection sensitivity
**Recommendation:** 5-minute threshold with no grace period. This matches the existing `OFFLINE_THRESHOLD` constant in `playerService.js` (5 * 60 * 1000) and the existing `evaluate_screen_offline()` default parameter of 5 minutes.
**Rationale:** The heartbeat sends every 30 seconds. Missing 10 consecutive heartbeats (5 minutes) strongly indicates the device is offline, not just experiencing a brief network blip. The existing codebase already uses this threshold.

### Alert data model for Phase 68
**Recommendation:** The alert should carry in its `meta` JSONB:
```json
{
  "device_name": "Lobby Screen",
  "minutes_offline": 12,
  "last_heartbeat": "2026-02-19T15:30:00Z",
  "last_metrics": { /* last known device_metrics snapshot */ },
  "detected_at": "2026-02-19T15:35:00Z"
}
```
**Rationale:** Phase 68 needs the device name for notification text, minutes_offline for severity in email, and last_metrics for troubleshooting context. The `detected_at` timestamp distinguishes when the device actually went offline vs. when it was detected.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `performance.memory` (Chrome only) | `performance.measureUserAgentSpecificMemory()` (standardized) | Chrome 89+ (2021) | The new API requires cross-origin isolation; `performance.memory` is still available and more practical for this use case |
| Manual offline check by user | Automated pg_cron evaluation | Supabase Cron module (2024) | Eliminates need for external scheduler or edge function timer |
| Separate telemetry events table | JSONB snapshot on device row | Project decision (REQUIREMENTS.md) | Simpler, avoids time-series data bloat |

**Deprecated/outdated:**
- `performance.memory` is non-standard but still widely available in Chromium browsers. The standardized replacement `performance.measureUserAgentSpecificMemory()` requires cross-origin isolation headers which may not be set on all deployments. Stick with `performance.memory` for pragmatic reasons.
- `navigator.connection.type` (underlying connection type like 'wifi', 'cellular') was removed from the spec. Use `effectiveType` instead.

## Open Questions

1. **pg_cron on hosted Supabase**
   - What we know: pg_cron is available on all Supabase plans as of 2024. The extension must be enabled.
   - What's unclear: Whether `pg_cron` is already enabled on the project's Supabase instance, or if it needs to be enabled via migration.
   - Recommendation: Include `CREATE EXTENSION IF NOT EXISTS pg_cron;` in the migration. It's idempotent.

2. **Alert insertion from SQL vs. JavaScript**
   - What we know: The `alertEngineService.raiseDeviceOfflineAlert()` provides rate limiting, notification dispatch, and coalescing. The SQL approach (`INSERT INTO alerts ON CONFLICT`) handles basic dedup.
   - What's unclear: Whether the cron-based SQL approach needs notification dispatch (Phase 68 scope) or just alert creation (Phase 64 scope).
   - Recommendation: Phase 64 only needs to create the alert record. Notification dispatch (bell, email) is Phase 68. The SQL `ON CONFLICT` approach is sufficient. When Phase 68 adds notifications, it can consume these alerts.

3. **Auto-resolve in heartbeat vs. cron**
   - What we know: Dual-path is ideal (instant resolve on heartbeat + cron cleanup).
   - What's unclear: Whether the `update_device_status` RPC should also resolve alerts (adding an INSERT/UPDATE to every heartbeat call).
   - Recommendation: Implement both paths. The heartbeat-side resolve is a single `UPDATE alerts SET status='resolved' WHERE device_id = p_device_id AND type = 'device_offline' AND status IN ('open', 'acknowledged')`. This is cheap (indexed lookup) and provides instant resolution.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `supabase/migrations/019_screen_monitoring.sql` -- existing offline detection SQL functions
- Codebase analysis: `supabase/migrations/029_device_commands_and_offline_mode.sql` -- existing `update_device_status` RPC
- Codebase analysis: `supabase/migrations/072_device_heartbeat.sql` -- existing heartbeat/refresh mechanism
- Codebase analysis: `supabase/migrations/082_alerts_notifications.sql` -- existing alerts table schema
- Codebase analysis: `src/services/alertEngineService.js` -- alert lifecycle with coalescing, auto-resolve
- Codebase analysis: `src/services/playerService.js` -- heartbeat constants, `updateDeviceStatus()`
- Codebase analysis: `src/player/hooks/usePlayerHeartbeat.js` -- heartbeat hook
- Codebase analysis: `src/components/ScreenDetailDrawer.jsx` -- diagnostics display component
- Codebase analysis: `src/services/screenDiagnosticsService.js` -- diagnostics data fetching
- Codebase analysis: `src/components/screens/PlayerStatusBadge.jsx` -- status badge component

### Secondary (MEDIUM confidence)
- [MDN: Navigator.deviceMemory](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory)
- [MDN: Performance.memory](https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory)
- [MDN: StorageManager.estimate()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate)
- [MDN: NetworkInformation API](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation)
- [Supabase Cron Documentation](https://supabase.com/docs/guides/cron)
- [Supabase pg_cron Extension](https://supabase.com/docs/guides/database/extensions/pg_cron)

### Tertiary (LOW confidence)
- Smart TV browser API support is inferred from Chromium base but not verified on actual Tizen/WebOS devices. Mark metrics as optional/best-effort.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries are already in the project, no new dependencies
- Architecture: HIGH - extends existing patterns with minimal new code; all key interfaces (heartbeat RPC, alert engine, diagnostics service, ScreenDetailDrawer) are well-understood
- Pitfalls: HIGH - pitfalls identified from actual codebase patterns and documented API limitations
- Browser APIs: MEDIUM - API availability on smart TV browsers is unverified, but all collection is wrapped in try-catch with graceful degradation

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (stable domain, no fast-moving dependencies)
