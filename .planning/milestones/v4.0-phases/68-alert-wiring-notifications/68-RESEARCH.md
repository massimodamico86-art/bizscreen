# Phase 68: Alert Wiring & Notifications - Research

**Researched:** 2026-02-20
**Domain:** Alert engine wiring, notification dispatch, email delivery for recovery/offline events
**Confidence:** HIGH

## Summary

Phase 68 wires recovery events (crash detection, auto-reload, fallback activation from Phase 66) and content verification mismatches (Phase 67) into the existing alert engine so they generate alerts, ensures all device alerts flow to the notification bell with history, and adds email notifications for critical alerts. The infrastructure is almost entirely built: the alert engine (`alertEngineService.js`) handles raise/coalesce/auto-resolve/notification-dispatch, the notification dispatcher (`notificationDispatcherService.js`) creates in-app notifications and queues email records, the NotificationBell component polls for unread count and displays a dropdown, and the AlertsCenterPage provides full filter/bulk-action/detail-view functionality.

The primary gaps are: (1) **New alert types**: the `alerts` table CHECK constraint and `ALERT_TYPES` constant do not include recovery event types -- a migration is needed to add them. (2) **Recovery event detection**: the heartbeat already reports `recovery_crash_count` and `recovery_phase` in device metrics (Phase 66), but nothing on the server side reads these metrics to raise alerts. The heartbeat RPC (`update_device_status`) needs extension to detect recovery signals and call `raiseAlert`. (3) **Email sending gap**: the `queueEmailNotification` function creates a notification row with `channel: 'email'` but never actually calls `sendEmailNotification` / `sendAlertEmail`. The `sendEmailNotification` function exists but is dead code -- no caller invokes it. This must be wired. (4) **Email trigger rules**: currently email is queued for ALL new alerts regardless of severity. Phase 68 needs to restrict email to critical alerts only (device offline, recovery exhausted) per ALRT-05.

**Primary recommendation:** Add new alert types via migration, extend `update_device_status` to detect recovery metrics and raise recovery alerts at the SQL level (matching the offline detection pattern), wire `sendEmailNotification` into the email notification flow with severity filtering for critical-only, and add recovery alert type icons/labels to the NotificationBell and AlertsCenterPage UI.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None -- user delegated all implementation decisions.

### Claude's Discretion

User delegated all implementation decisions. Claude has full flexibility on:

**Recovery alert types & severity:**
- Which recovery events map to which alert types (crash detection, auto-reload, fallback activation, recovery exhausted)
- Severity assignment for each recovery event type
- Escalation rules (e.g., single crash vs repeated crashes)
- Whether to add new ALERT_TYPES constants or reuse existing ones

**Email notification rules:**
- Which alert severities/types trigger email
- Batching and throttle strategy (e.g., digest vs immediate for critical)
- Email content, formatting, and template approach
- Opt-in/opt-out mechanism if needed

**Notification bell updates:**
- Whether new icons or grouping are needed for recovery-type alerts
- Badge logic changes (if any) to accommodate new alert types
- Dropdown behavior for recovery alerts

**Alerts Center display:**
- How recovery alerts render on the Alerts page
- Filter categories for new alert types
- Detail view content for recovery events

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ALRT-03 | Recovery events (crash detection, auto-reload, fallback activation) generate alerts | New alert types (`device_recovery`, `device_recovery_exhausted`) added to `alerts` CHECK constraint and `ALERT_TYPES` constant. Server-side detection of `recovery_crash_count > 0` in heartbeat metrics triggers `raiseAlert()` with appropriate severity. Auto-resolve when crash count resets to 0. |
| ALRT-04 | User receives in-app notifications for all device alerts (bell icon with history) | Already working for existing alert types. Adding new recovery types to `TYPE_ICONS` and `TYPE_LABELS` maps in NotificationBell and AlertsCenterPage ensures they render properly. The notification dispatch pipeline (`dispatchAlertNotifications` -> `createInAppNotification`) works automatically for any alert type. |
| ALRT-05 | User receives email notification for critical alerts (device offline, recovery exhausted) | Wire `sendEmailNotification()` (currently dead code) into `queueEmailNotification()` for immediate send. Add severity gate: only send email for `critical` severity alerts. Existing `sendAlertEmail()` in emailService already handles HTML formatting with severity badge. |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase JS | ^2.x | Client SDK for RPC calls | Already used throughout |
| Resend | ^4.x | Email delivery API | Already configured in emailService.js with `sendAlertEmail()` |
| React | 18.x | UI components | Project framework |
| Lucide React | ^0.x | Icon library | Used in NotificationBell and AlertsCenterPage |
| Tailwind CSS | 3.x | Styling | Project styling approach |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| alertEngineService | N/A (internal) | Alert lifecycle (raise, coalesce, auto-resolve, notification dispatch) | Central orchestrator for all alert operations |
| notificationDispatcherService | N/A (internal) | In-app + email notification dispatch to users | Called by alertEngineService after raise/coalesce |
| emailService | N/A (internal) | Resend API wrapper for email delivery | Called by notificationDispatcherService for email sends |
| usePlayerHeartbeat | N/A (internal) | Player heartbeat with metrics collection | Already collects recovery state from localStorage |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side alert raising from heartbeat | Server-side (SQL) detection in `update_device_status` | SQL approach is more reliable -- player may be in recovery loop and unable to make extra RPC calls. Detect recovery_crash_count from p_metrics in the heartbeat RPC. |
| Supabase Edge Function for email | Direct Resend call from client-side service | Edge Function would be ideal for production but adds deployment complexity. The existing `sendAlertEmail` via Resend SDK from client-side works and is already tested. |
| Separate recovery alert types per event | Single `device_recovery` type with meta differentiation | Separate types would need many CHECK constraint additions. A single `device_recovery` type with `meta.recovery_phase` (soft_reload, hard_reload, cached_fallback) is simpler and more extensible. |

**Installation:**
No new packages needed. All dependencies are already in the project.

## Architecture Patterns

### Recommended Changes Structure
```
supabase/migrations/
  154_recovery_alert_types.sql       # Add device_recovery, device_recovery_exhausted to CHECK constraint
                                      # Extend update_device_status to detect recovery metrics

src/
  services/alertEngineService.js      # MODIFY: Add DEVICE_RECOVERY, DEVICE_RECOVERY_EXHAUSTED to ALERT_TYPES
                                      #         Add raiseRecoveryAlert() helper
                                      #         Add ESCALATION_RULES for recovery alerts
  services/notificationDispatcherService.js  # MODIFY: Wire sendEmailNotification into queueEmailNotification
                                              #         Add severity gate for email (critical only)
  components/notifications/NotificationBell.jsx  # MODIFY: Add recovery type icons
  pages/AlertsCenterPage.jsx          # MODIFY: Add recovery type labels/icons
```

### Pattern 1: Recovery Alert Detection in Heartbeat RPC (SQL)
**What:** Extend `update_device_status` to check `p_metrics->'recovery_crash_count'` and raise recovery alerts directly in SQL, matching the offline detection pattern from Phase 64.
**When to use:** Every heartbeat that carries recovery metrics (crash count > 0).
**Why SQL:** The player may be in a recovery loop doing hard reloads. It cannot reliably make a separate `raiseAlert()` JS call. The heartbeat RPC is the one reliable touchpoint.
**Example:**
```sql
-- Inside update_device_status, after the main UPDATE:
-- Check for recovery events in metrics
IF p_metrics IS NOT NULL AND (p_metrics->>'recovery_crash_count')::INTEGER > 0 THEN
  v_crash_count := (p_metrics->>'recovery_crash_count')::INTEGER;
  v_recovery_phase := p_metrics->>'recovery_phase';

  IF v_crash_count >= 6 THEN
    -- Recovery exhausted: critical alert
    INSERT INTO alerts (tenant_id, type, severity, title, message, device_id, meta)
    VALUES (
      v_tenant_id, 'device_recovery_exhausted', 'critical',
      'Device "' || v_device_name || '" recovery exhausted',
      'All 6 recovery attempts failed. Device showing static fallback.',
      p_device_id,
      jsonb_build_object(
        'device_name', v_device_name,
        'crash_count', v_crash_count,
        'recovery_phase', v_recovery_phase,
        'last_recovery_at', p_metrics->>'recovery_last_at'
      )
    )
    ON CONFLICT ON CONSTRAINT idx_alerts_coalesce
    DO UPDATE SET
      occurrences = alerts.occurrences + 1,
      last_occurred_at = NOW(),
      meta = alerts.meta || EXCLUDED.meta;
  ELSE
    -- Active recovery: warning alert
    INSERT INTO alerts (tenant_id, type, severity, title, message, device_id, meta)
    VALUES (
      v_tenant_id, 'device_recovery', 'warning',
      'Device "' || v_device_name || '" is in recovery',
      'Recovery attempt ' || v_crash_count || '/6 (' || v_recovery_phase || ')',
      p_device_id,
      jsonb_build_object(
        'device_name', v_device_name,
        'crash_count', v_crash_count,
        'recovery_phase', v_recovery_phase,
        'last_recovery_at', p_metrics->>'recovery_last_at'
      )
    )
    ON CONFLICT ON CONSTRAINT idx_alerts_coalesce
    DO UPDATE SET
      occurrences = alerts.occurrences + 1,
      last_occurred_at = NOW(),
      severity = CASE WHEN (EXCLUDED.meta->>'crash_count')::INTEGER >= 4 THEN 'warning' ELSE alerts.severity END,
      meta = alerts.meta || EXCLUDED.meta;
  END IF;
END IF;
```

### Pattern 2: Auto-Resolve Recovery Alerts on Counter Reset
**What:** When the heartbeat shows `recovery_crash_count = 0` (or no recovery metrics), auto-resolve any open `device_recovery` alerts for that device.
**When to use:** Every heartbeat where metrics show normal operation (no recovery state).
**Example:**
```sql
-- Inside update_device_status, after recovery detection:
-- Auto-resolve recovery alerts when device is healthy again
IF p_metrics IS NULL
   OR (p_metrics->>'recovery_crash_count') IS NULL
   OR (p_metrics->>'recovery_crash_count')::INTEGER = 0
THEN
  UPDATE alerts
  SET status = 'resolved',
      resolved_at = NOW(),
      resolution_notes = 'Auto-resolved: device recovered successfully',
      updated_at = NOW()
  WHERE device_id = p_device_id
    AND type IN ('device_recovery', 'device_recovery_exhausted')
    AND status IN ('open', 'acknowledged');
END IF;
```

### Pattern 3: Email Notification Wiring
**What:** Wire `sendEmailNotification()` into the email notification flow with severity gating.
**When to use:** When a new alert is created (isNewAlert=true) and alert severity is critical.
**Example:**
```javascript
// In notificationDispatcherService.js, modify queueEmailNotification:
async function queueEmailNotification(user, alert) {
  try {
    // Only send email for critical alerts (ALRT-05 requirement)
    if (alert.severity !== 'critical') {
      logger.info('Email skipped: severity not critical', {
        alertId: alert.id, severity: alert.severity
      });
      return false;
    }

    // Store email notification record
    const { data: notification, error } = await supabase.from('notifications').insert({
      user_id: user.user_id,
      tenant_id: alert.tenant_id,
      alert_id: alert.id,
      channel: NOTIFICATION_CHANNELS.EMAIL,
      title: alert.title,
      message: alert.message,
      severity: alert.severity,
      alert_type: alert.type,
      action_url: getAlertActionUrl(alert),
    }).select().single();

    if (error) {
      logger.error('Error queueing email notification', { error });
      return false;
    }

    // Actually send the email (was previously dead code)
    if (notification && user.email) {
      await sendEmailNotification({ ...notification, email: user.email });
    }

    return true;
  } catch (error) {
    logger.error('Error queueing email notification', { error });
    return false;
  }
}
```

### Anti-Patterns to Avoid
- **Raising alerts from the player JS code:** The player is in a recovery loop doing reloads. It cannot reliably make separate API calls to raise alerts. Detection MUST happen in the heartbeat RPC SQL function where the metrics are already received.
- **Sending email for every alert:** Only critical alerts should trigger email (ALRT-05). Sending email for info/warning alerts would spam users and is not in the requirements.
- **Creating separate alert types for each recovery phase:** Don't create `device_soft_reload`, `device_hard_reload`, `device_cached_fallback` as separate types. Use one `device_recovery` type with `meta.recovery_phase` to differentiate. Fewer CHECK constraint additions, cleaner filtering.
- **Breaking the existing notification dispatch pipeline:** The `raiseAlert` -> `dispatchAlertNotifications` -> `createInAppNotification` / `queueEmailNotification` chain already works. Don't create a parallel path. Wire recovery alerts through the same pipeline.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Alert lifecycle (raise/coalesce/resolve) | Custom INSERT INTO alerts | `alertEngineService.raiseAlert()` for JS-raised alerts, `ON CONFLICT ON CONSTRAINT idx_alerts_coalesce` for SQL-raised alerts | Both paths handle dedup, severity escalation, occurrence tracking |
| Notification dispatch to users | Custom user-fetching and notification creation | `dispatchAlertNotifications(alert, isNewAlert)` | Already handles user preference filtering, quiet hours, in-app creation, email queuing |
| Email HTML rendering | Custom email template builder | `sendAlertEmail()` in emailService.js | Already has severity-colored badge, responsive HTML, escape logic, CTA button |
| Alert type validation | Manual type checking | `ALERT_TYPES` constant + `alerts` table CHECK constraint | Single source of truth, validated at both JS and DB level |
| Relative time formatting | Custom time-ago function | Already exists in NotificationBell and AlertsCenterPage | Consistent formatting across the app |

**Key insight:** 90% of the notification infrastructure exists. Phase 68 is primarily wiring work: connecting recovery event signals (already in heartbeat metrics) to the alert engine (already built), and connecting the email queue (already records) to the email sender (already built).

## Common Pitfalls

### Pitfall 1: CHECK Constraint Prevents New Alert Types
**What goes wrong:** Inserting a `device_recovery` alert fails with a CHECK constraint violation because the `alerts.type` column only allows the 11 original types.
**Why it happens:** Migration 082 created a strict CHECK constraint on the `type` column.
**How to avoid:** A new migration MUST `ALTER TABLE alerts DROP CONSTRAINT` the old check and `ADD CONSTRAINT` with the expanded type list. Alternatively, use `ALTER TABLE alerts DROP CONSTRAINT alerts_type_check; ALTER TABLE alerts ADD CONSTRAINT alerts_type_check CHECK (type IN (...expanded list...));`.
**Warning signs:** `new row for relation "alerts" violates check constraint "alerts_type_check"` error.

### Pitfall 2: Coalescing Index Prevents Multiple Recovery Alert Types
**What goes wrong:** The `idx_alerts_coalesce` unique partial index prevents two different recovery alert types for the same device (e.g., `device_recovery` and `device_recovery_exhausted`).
**Why it happens:** The coalescing index includes the `type` column, so different types are different entries. This actually WORKS correctly -- one open `device_recovery` alert and one open `device_recovery_exhausted` alert can coexist for the same device.
**How to avoid:** This is actually fine. Just understand that escalation from `device_recovery` to `device_recovery_exhausted` means resolving the first and creating the second, NOT updating the type. Or: use a single type (`device_recovery`) and escalate severity only.
**Recommendation:** Use TWO types: `device_recovery` (warning, for active recovery) and `device_recovery_exhausted` (critical, when all 6 attempts fail). Resolve `device_recovery` when creating `device_recovery_exhausted`.

### Pitfall 3: Dead Email Code -- sendEmailNotification Never Called
**What goes wrong:** Email notification records are created in the `notifications` table with `channel: 'email'`, but no email is actually sent. Users see notification records but never receive email.
**Why it happens:** The `queueEmailNotification` function was designed as a queue-and-process-later pattern, but the "process" step (`sendEmailNotification`) was never wired. It was deferred to Phase 68.
**How to avoid:** Call `sendEmailNotification()` directly in `queueEmailNotification()` after inserting the notification record. The function is already tested and working -- it calls `sendAlertEmail()` which calls Resend API.
**Warning signs:** Email notification rows in `notifications` table with `channel: 'email'` but `email_sent_at` is NULL.

### Pitfall 4: Recovery Metrics Only Reported When crashCount > 0
**What goes wrong:** Server detects recovery state (crash count > 0) and raises an alert. But when the device recovers successfully, the next heartbeat sends NO recovery metrics (they are omitted when crashCount is 0). The server never knows to auto-resolve.
**Why it happens:** Phase 66 decided "Recovery metrics only in heartbeat when crashCount > 0 to avoid polluting normal telemetry."
**How to avoid:** The auto-resolve logic must check for the ABSENCE of recovery metrics (not the presence of a zero value). If `p_metrics` has no `recovery_crash_count` key, AND there are open recovery alerts for this device, resolve them.
**Warning signs:** Recovery alerts staying open after device successfully recovers and shows content normally.

### Pitfall 5: Resend API Key Not Configured
**What goes wrong:** Email appears to work (notification record created, no errors thrown) but no email is actually delivered.
**Why it happens:** The `sendAlertEmail` function silently returns `{ success: false, error: 'Email service not configured' }` when `VITE_RESEND_API_KEY` is not set. No exception is thrown.
**How to avoid:** Ensure `VITE_RESEND_API_KEY` is set in the environment. Log a warning at startup if it's missing. The current code already warns per-send, but a startup check would be more visible.
**Warning signs:** Email notification records with `email_sent_at` always NULL, "Email not sent - VITE_RESEND_API_KEY not configured" warnings in logs.

### Pitfall 6: SQL Alert Insertion Bypasses Notification Dispatch
**What goes wrong:** Recovery alerts raised in the SQL `update_device_status` function create alert rows, but no in-app notifications or emails are generated because `dispatchAlertNotifications()` is a JavaScript function not called from SQL.
**Why it happens:** The offline detection cron (Phase 64) also inserts alerts directly in SQL without going through the JS notification pipeline. This was acceptable for Phase 64 because notification delivery was deferred to Phase 68.
**How to avoid:** Two options:
  (a) **Preferred:** Detect new recovery alerts in the JS heartbeat handler and call `dispatchAlertNotifications()` after the RPC returns. Check the heartbeat response for a `recovery_alert_raised` flag.
  (b) **Alternative:** Use a Postgres trigger on the `alerts` table to insert into `notifications` directly. But this misses email sending and user preference filtering.
**Recommendation:** Option (a). After `updateDeviceStatus()` returns in `usePlayerHeartbeat` or `playerService`, check if the response includes a recovery alert flag. If so, call `dispatchAlertNotifications()` from the JS layer. However, this means the notification goes through the player's auth context, not a service role. Better approach: after `updateDeviceStatus` returns, check on the dashboard side. The dashboard's AlertsCenterPage already polls alerts. The NotificationBell already polls every 30 seconds.

**Best approach for Phase 68:** Since the SQL function inserts alerts directly, and the NotificationBell polls every 30 seconds, in-app notifications need to be created when alerts are inserted. The cleanest path:
1. Have the SQL heartbeat function raise the alert (already done in SQL)
2. Have the JS `alertEngineService.raiseAlert()` check for recovery conditions on the dashboard side (OR)
3. Use a Postgres trigger `AFTER INSERT ON alerts` to auto-create notification rows in the `notifications` table for all tenant users

Option 3 (Postgres trigger) is the most reliable approach because it works regardless of whether alerts are raised from SQL (heartbeat, cron) or JS (dashboard). It matches the existing `get_users_to_notify()` SQL function.

## Code Examples

### Migration: Add Recovery Alert Types
```sql
-- Drop the old CHECK constraint and add expanded list
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_type_check;
ALTER TABLE alerts ADD CONSTRAINT alerts_type_check CHECK (type IN (
    'device_offline',
    'device_screenshot_failed',
    'device_cache_stale',
    'device_error',
    'device_recovery',
    'device_recovery_exhausted',
    'schedule_missing_scene',
    'schedule_conflict',
    'data_source_sync_failed',
    'social_feed_sync_failed',
    'content_expired',
    'storage_quota_warning',
    'api_rate_limit'
));
```

### ALERT_TYPES Update in alertEngineService.js
```javascript
export const ALERT_TYPES = {
  // ... existing types ...
  DEVICE_RECOVERY: 'device_recovery',
  DEVICE_RECOVERY_EXHAUSTED: 'device_recovery_exhausted',
};
```

### NotificationBell TYPE_ICONS Update
```javascript
const TYPE_ICONS = {
  // ... existing icons ...
  [ALERT_TYPES.DEVICE_RECOVERY]: Monitor,  // Or RefreshCw for recovery
  [ALERT_TYPES.DEVICE_RECOVERY_EXHAUSTED]: AlertTriangle,
};
```

### AlertsCenterPage TYPE_LABELS Update
```javascript
const TYPE_LABELS = {
  // ... existing labels ...
  [ALERT_TYPES.DEVICE_RECOVERY]: 'Device Recovery',
  [ALERT_TYPES.DEVICE_RECOVERY_EXHAUSTED]: 'Recovery Exhausted',
};
```

### Recovery Alert Helper in alertEngineService.js
```javascript
/**
 * Raise a device recovery alert
 */
export async function raiseRecoveryAlert(device, crashCount, recoveryPhase) {
  const isExhausted = crashCount >= 6;

  return raiseAlert({
    type: isExhausted ? ALERT_TYPES.DEVICE_RECOVERY_EXHAUSTED : ALERT_TYPES.DEVICE_RECOVERY,
    severity: isExhausted ? ALERT_SEVERITIES.CRITICAL : ALERT_SEVERITIES.WARNING,
    title: isExhausted
      ? `Device "${device.name}" recovery exhausted`
      : `Device "${device.name}" is in recovery`,
    message: isExhausted
      ? 'All 6 recovery attempts failed. Device showing static fallback.'
      : `Recovery attempt ${crashCount}/6 (${recoveryPhase})`,
    tenantId: device.tenant_id,
    deviceId: device.id,
    meta: {
      device_name: device.name,
      crash_count: crashCount,
      recovery_phase: recoveryPhase,
    },
  });
}
```

## Discretion Recommendations

### Recovery Alert Type Design
**Recommendation:** Two alert types:
- `device_recovery` (severity: warning) -- Raised when `recovery_crash_count` is 1-5. Covers crash detection, auto-reload, and fallback activation.
- `device_recovery_exhausted` (severity: critical) -- Raised when `recovery_crash_count` >= 6. This is when the device has given up recovery and shows the static RecoveryFallbackScreen.

**Rationale:** Operators need to distinguish between "device is recovering (may self-heal)" and "device is stuck and needs manual intervention." The exhausted state is the critical one that needs email notification per ALRT-05.

### Recovery Alert Severity Escalation
**Recommendation:** No time-based escalation for `device_recovery`. Use count-based escalation:
- Count 1-2: `info` (soft reload is common and usually self-corrects)
- Count 3-5: `warning` (multiple reloads suggest a real problem)
- Count 6+: Automatically creates `device_recovery_exhausted` at `critical`

**Rationale:** Unlike offline alerts (which escalate based on duration), recovery events are count-based. Each crash count increment is a distinct recovery attempt. By count 3, the device has done hard reloads, which is abnormal.

### Email Notification Rules
**Recommendation:** Email only for `critical` severity alerts. This means:
- `device_offline` after 60 minutes (escalated to critical by existing cron logic)
- `device_recovery_exhausted` (always critical)

**Rationale:** ALRT-05 says "critical alerts (device offline, recovery exhausted)." Sending email for warning/info would cause alert fatigue.

### Email Throttling
**Recommendation:** Use the existing rate limiting in `alertEngineService.js` (5 alerts per source per minute). No additional email-specific throttle needed because:
1. Email is only sent for NEW alerts (not coalesced ones) -- `dispatchAlertNotifications(alert, isNewAlert=true)` gates this
2. The alert coalescing prevents duplicate alerts for the same device/type
3. Critical events (offline > 60min, recovery exhausted) are inherently infrequent

### Notification Bell Updates
**Recommendation:** Add `RefreshCw` icon for `device_recovery` and `AlertTriangle` (in red) for `device_recovery_exhausted`. No grouping changes needed -- the bell already shows newest-first and handles all alert types uniformly.

### Alerts Center Display
**Recommendation:** Add `device_recovery` and `device_recovery_exhausted` to the `TYPE_LABELS` and `TYPE_ICONS` maps. The detail modal already displays `alert.meta` as JSON. For a better UX, render recovery-specific fields from meta (crash count, recovery phase, last recovery timestamp) as structured fields instead of raw JSON.

### Alert-to-Notification Pipeline for SQL-Raised Alerts
**Recommendation:** Use a Postgres `AFTER INSERT` trigger on the `alerts` table to auto-create `notifications` rows. This ensures that alerts raised from ANY path (SQL heartbeat, SQL cron, JS alertEngineService) all generate in-app notifications without requiring the caller to explicitly dispatch.

```sql
CREATE OR REPLACE FUNCTION auto_create_alert_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Create in-app notification for each eligible user in the tenant
  FOR v_user IN
    SELECT p.id AS user_id
    FROM profiles p
    LEFT JOIN notification_preferences np ON np.user_id = p.id AND np.tenant_id = NEW.tenant_id
    WHERE p.tenant_id = NEW.tenant_id
      AND p.role IN ('owner', 'admin', 'editor')
      AND COALESCE(np.channel_in_app, true) = true
      AND (
        np.min_severity IS NULL
        OR CASE np.min_severity
            WHEN 'info' THEN TRUE
            WHEN 'warning' THEN NEW.severity IN ('warning', 'critical')
            WHEN 'critical' THEN NEW.severity = 'critical'
            ELSE TRUE
        END
      )
  LOOP
    INSERT INTO notifications (user_id, tenant_id, alert_id, channel, title, message, severity, alert_type, action_url)
    VALUES (
      v_user.user_id,
      NEW.tenant_id,
      NEW.id,
      'in_app',
      NEW.title,
      NEW.message,
      NEW.severity,
      NEW.type,
      CASE
        WHEN NEW.device_id IS NOT NULL THEN '/screens?highlight=' || NEW.device_id::TEXT
        WHEN NEW.scene_id IS NOT NULL THEN '/scenes/' || NEW.scene_id::TEXT
        WHEN NEW.schedule_id IS NOT NULL THEN '/schedules/' || NEW.schedule_id::TEXT
        ELSE '/alerts'
      END
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_alert_auto_notify
  AFTER INSERT ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_alert_notifications();
```

**Important:** If using this trigger approach, the JS `dispatchAlertNotifications()` in `alertEngineService.raiseAlert()` would create duplicate in-app notifications. Either:
- (a) Remove the `dispatchAlertNotifications()` call from `raiseAlert()` and let the trigger handle all in-app, OR
- (b) Keep the JS path for JS-raised alerts only, and use the trigger only for SQL-raised alerts (more complex, risk of duplicates)

**Recommendation:** Option (a) is cleaner. Have the trigger handle ALL in-app notifications. Keep the JS `sendEmailNotification()` call only in the JS path for email sending (since Resend API can only be called from JS, not SQL).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Email queued but never sent | Wire sendEmailNotification into the pipeline | Phase 68 | Completes the email notification feature |
| Only device_offline alerts from cron | Recovery alerts from heartbeat metrics | Phase 68 | New alert category for player health |
| JS-only notification dispatch | Postgres trigger for in-app + JS for email | Phase 68 | Reliable notifications regardless of alert origin |

**Deprecated/outdated:**
- None. All patterns are current and well-established in the codebase.

## Open Questions

1. **Postgres Trigger vs JS-only Notification Path**
   - What we know: SQL-raised alerts (cron offline detection, heartbeat recovery detection) bypass the JS `dispatchAlertNotifications()` function. In-app notifications are never created for SQL-raised alerts.
   - What's unclear: Whether a Postgres trigger on `alerts` is the right approach, or whether we should detect the alert in the JS layer after the heartbeat RPC returns and dispatch from there.
   - Recommendation: Use the Postgres trigger for in-app notifications (reliable for all alert paths). Use JS for email (requires Resend API call). This means refactoring `raiseAlert()` to NOT call `dispatchAlertNotifications()` for in-app, relying on the trigger instead.

2. **Email for Cron-Raised Offline Alerts**
   - What we know: The cron job raises `device_offline` alerts directly in SQL. These can escalate to critical after 60 minutes. ALRT-05 requires email for critical device_offline alerts.
   - What's unclear: How to trigger email sending from a SQL cron job. Resend API requires JS/HTTP.
   - Recommendation: Two options: (a) A separate cron/scheduled function that checks for critical alerts with no email record and sends them, or (b) Rely on the JS alertEngineService's coalescing path -- when the cron raises/coalesces an alert, the JS layer could detect severity changes on the next poll and send email. Option (a) is simpler: a periodic "email worker" function.

3. **Duplicate Notification Prevention**
   - What we know: If both the trigger and the JS `dispatchAlertNotifications()` create in-app notifications, users get duplicates.
   - Recommendation: Clean separation: trigger handles in-app, JS handles email. Remove in-app creation from `dispatchAlertNotifications()` when the trigger is active. OR: add a `notifications` unique constraint on `(user_id, alert_id, channel)` to prevent duplicates regardless of source.

## Sources

### Primary (HIGH confidence)
- Codebase: `src/services/alertEngineService.js` -- alert lifecycle, ALERT_TYPES, raise/coalesce/resolve, rate limiting, escalation
- Codebase: `src/services/notificationDispatcherService.js` -- notification dispatch, user preference filtering, email queuing (dead sendEmailNotification), in-app creation
- Codebase: `src/services/emailService.js` -- Resend API wrapper, sendAlertEmail with HTML template
- Codebase: `src/components/notifications/NotificationBell.jsx` -- bell UI, TYPE_ICONS, polling
- Codebase: `src/pages/AlertsCenterPage.jsx` -- alerts table, TYPE_LABELS, TYPE_ICONS, detail modal
- Codebase: `supabase/migrations/082_alerts_notifications.sql` -- alerts/notifications/preferences schema, CHECK constraints
- Codebase: `supabase/migrations/150_offline_detection_cron.sql` -- cron pattern, SQL alert insertion, auto-resolve
- Codebase: `supabase/migrations/153_content_verification.sql` -- content verification columns, latest update_device_status signature
- Codebase: `src/player/hooks/usePlayerHeartbeat.js` -- heartbeat with recovery metrics collection
- Codebase: `src/player/hooks/useAutoRecovery.js` -- crash counter, recovery phases, localStorage keys

### Secondary (MEDIUM confidence)
- Phase 64 summaries: offline detection pattern (SQL cron, dual-path resolution)
- Phase 66 summaries: recovery infrastructure (useAutoRecovery, localStorage crash counter, heartbeat telemetry)
- Phase 67 summaries: content verification (mismatch detection, Force Sync)
- STATE.md: blocker "Verify which notification_preferences columns are actively wired in notificationDispatcherService.js" -- VERIFIED: all columns (channel_email, channel_in_app, min_severity, types_whitelist, types_blacklist, quiet_hours_start/end/timezone) are actively used in `shouldNotifyUser()` and `getUsersToNotify()`

### Tertiary (LOW confidence)
- None. All findings are from direct codebase analysis.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project, no new dependencies
- Architecture: HIGH - extends existing patterns (SQL alert insertion from cron, JS notification dispatch), all interfaces well-understood
- Pitfalls: HIGH - identified from actual code analysis (dead email code, CHECK constraint, recovery metric absence pattern)
- Alert design: HIGH - follows established patterns from Phase 64 offline detection

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable domain, no fast-moving dependencies)
