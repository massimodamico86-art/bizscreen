# Alerts & Notifications System

This document explains how the alert and notification system works, including how to raise/resolve alerts from services and how notifications are dispatched to users.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Service Layer                                   │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐│
│  │deviceScreenshot  │ │screenshotService │ │dataFeedScheduler         ││
│  │Service           │ │                  │ │socialFeedSyncService     ││
│  └────────┬─────────┘ └────────┬─────────┘ └────────────┬─────────────┘│
│           │                    │                        │              │
│           └────────────────────┼────────────────────────┘              │
│                                ▼                                       │
│                    ┌───────────────────────┐                           │
│                    │  alertEngineService   │                           │
│                    │  - raiseAlert()       │                           │
│                    │  - autoResolveAlert() │                           │
│                    │  - coalesceAlert()    │                           │
│                    └───────────┬───────────┘                           │
│                                │                                       │
│                                ▼                                       │
│              ┌─────────────────────────────────────┐                   │
│              │  notificationDispatcherService      │                   │
│              │  - dispatchAlertNotifications()     │                   │
│              │  - dispatchResolvedNotification()   │                   │
│              └─────────────────┬───────────────────┘                   │
│                                │                                       │
└────────────────────────────────┼───────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Database Layer                                  │
│  ┌──────────────┐    ┌────────────────────┐    ┌────────────────────┐  │
│  │   alerts     │    │   notifications    │    │ notification_      │  │
│  │   table      │    │   table            │    │ preferences        │  │
│  └──────────────┘    └────────────────────┘    └────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         UI Layer                                        │
│  ┌──────────────┐    ┌────────────────────┐    ┌────────────────────┐  │
│  │NotificationBell│   │ AlertsCenterPage   │    │NotificationSettings│  │
│  │(dropdown)     │   │ (full alerts list) │    │Page                │  │
│  └──────────────┘    └────────────────────┘    └────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Alert Types

| Type | Description | Severity | Auto-resolve Trigger |
|------|-------------|----------|---------------------|
| `device_offline` | Device hasn't sent heartbeat | warning/critical | Device comes online |
| `device_screenshot_failed` | Screenshot capture failed | warning/critical | Successful screenshot |
| `device_cache_stale` | Device cache outdated | warning/critical | Cache refreshed |
| `device_error` | General device error | varies | Manual resolution |
| `schedule_missing_scene` | Schedule references missing scene | warning | Scene restored |
| `schedule_conflict` | Overlapping schedules | warning | Conflict resolved |
| `data_source_sync_failed` | Data source sync error | warning | Successful sync |
| `social_feed_sync_failed` | Social feed sync error | warning | Successful sync |
| `content_expired` | Content past expiration | info | Content updated |
| `storage_quota_warning` | Approaching storage limit | warning | Storage freed |
| `api_rate_limit` | API rate limit hit | warning | Cooldown ends |

## How to Raise Alerts from Services

### Using Helper Functions (Recommended)

```javascript
import {
  raiseDeviceOfflineAlert,
  raiseScreenshotFailedAlert,
  raiseDataSourceSyncFailedAlert,
  raiseSocialFeedSyncFailedAlert,
  autoResolveAlert,
  ALERT_TYPES,
} from './alertEngineService';

// Example: Device goes offline
await raiseDeviceOfflineAlert(
  { id: device.id, name: device.name, tenant_id: device.tenant_id },
  minutesOffline
);

// Example: Screenshot failed
await raiseScreenshotFailedAlert(
  { id: device.id, name: device.name, tenant_id: device.tenant_id },
  failureCount,
  error.message
);

// Example: Data source sync failed
await raiseDataSourceSyncFailedAlert(
  { id: source.id, name: source.name, tenant_id: source.tenant_id },
  error
);

// Example: Auto-resolve when condition clears
await autoResolveAlert({
  type: ALERT_TYPES.DEVICE_OFFLINE,
  deviceId: device.id,
  notes: 'Device is back online',
});
```

### Using Low-Level raiseAlert (Advanced)

```javascript
import { raiseAlert, ALERT_TYPES, ALERT_SEVERITIES } from './alertEngineService';

const result = await raiseAlert({
  type: ALERT_TYPES.DEVICE_OFFLINE,
  severity: ALERT_SEVERITIES.WARNING,
  title: 'Device "Living Room TV" is offline',
  message: 'Device has been offline for 15 minutes',
  tenantId: 'tenant-123',  // Optional, auto-detected if not provided
  deviceId: 'device-456',  // Optional, for device-related alerts
  meta: {                   // Optional, additional context
    device_name: 'Living Room TV',
    minutes_offline: 15,
  },
});

// result = { alertId: 'alert-789', isNew: true|false }
```

## Alert Coalescing (Deduplication)

The alert engine prevents notification spam by coalescing repeated alerts:

### How It Works

1. When `raiseAlert()` is called, it first checks for an **existing open alert** with the same:
   - `tenant_id`
   - `type`
   - `device_id` (if applicable)
   - `data_source_id` (if applicable)

2. **If an existing alert is found**: The alert is **coalesced**:
   - `occurrences` count is incremented
   - `last_occurred_at` timestamp is updated
   - Severity is escalated if the new severity is higher
   - Metadata is merged
   - In-app notifications are updated (no new email spam)

3. **If no existing alert is found**: A **new alert** is created:
   - Both in-app and email notifications are dispatched

### Example Flow

```
Time 0:00 - Device goes offline
  → New alert created (occurrences: 1)
  → Email + in-app notification sent

Time 0:05 - Heartbeat check, still offline
  → Existing alert coalesced (occurrences: 2)
  → In-app notification updated, NO new email

Time 0:10 - Still offline
  → Existing alert coalesced (occurrences: 3)
  → Severity escalated from warning → critical

Time 0:15 - Device comes back online
  → Alert auto-resolved
  → "Resolved" notification sent
```

## Notification Dispatch

### User Preferences

Users can configure:

| Preference | Description | Default |
|------------|-------------|---------|
| `channel_in_app` | Receive in-app notifications | `true` |
| `channel_email` | Receive email notifications | `true` |
| `min_severity` | Minimum severity to notify | `warning` |
| `types_whitelist` | Only these alert types (optional) | - |
| `types_blacklist` | Exclude these alert types | - |
| `quiet_hours_start` | Start of quiet hours (HH:MM) | - |
| `quiet_hours_end` | End of quiet hours (HH:MM) | - |

### Notification Flow

1. **Alert Raised** → `raiseAlert()` in alertEngineService
2. **Notifications Dispatched** → `dispatchAlertNotifications()` in notificationDispatcherService
3. **User Filtering** → Check each user's preferences
4. **In-App Created** → Row inserted in `notifications` table
5. **Email Queued** → Only for new alerts (not coalesced)

### Resolved Notifications

When an alert is auto-resolved:

1. `autoResolveAlert()` updates the alert status to `resolved`
2. `dispatchResolvedNotification()` sends a "✓ Resolved: ..." notification
3. Only sent for `critical` and `warning` severity alerts (not `info`)

## Testing

### Run Unit Tests

```bash
npm test
```

### Run E2E Tests

```bash
# All E2E tests
npm run test:e2e

# Alert-specific tests
npm run test:e2e -- alert-notification-flow.spec.js
npm run test:e2e -- alerts-center.spec.js
```

### Manual Testing

To manually trigger test alerts in development:

```javascript
// In browser console after login
import { raiseDeviceOfflineAlert } from '/src/services/alertEngineService';

await raiseDeviceOfflineAlert(
  { id: 'test-device', name: 'Test Device', tenant_id: 'your-tenant-id' },
  30 // minutes offline
);
```

Or use the Debug tab in Feature Flags page to simulate alerts.

## UI Components

### NotificationBell (`src/components/notifications/NotificationBell.jsx`)

- Shows in the top navigation bar
- Displays unread notification count badge
- Dropdown shows recent notifications
- Polls for new notifications every 30 seconds

### AlertsCenterPage (`src/pages/AlertsCenterPage.jsx`)

- Full alerts management page
- Filter by status (open/acknowledged/resolved)
- Filter by severity (critical/warning/info)
- Filter by type (device offline, sync failed, etc.)
- Bulk acknowledge/resolve actions

### NotificationSettingsPage (`src/pages/NotificationSettingsPage.jsx`)

- User preference configuration
- Channel toggles (in-app, email)
- Minimum severity threshold
- Alert type filtering
- Quiet hours configuration

## Database Tables

### `alerts`

```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  title TEXT NOT NULL,
  message TEXT,
  device_id UUID REFERENCES tv_devices(id),
  scene_id UUID REFERENCES scenes(id),
  schedule_id UUID REFERENCES schedules(id),
  data_source_id UUID REFERENCES data_sources(id),
  meta JSONB DEFAULT '{}',
  occurrences INTEGER DEFAULT 1,
  last_occurred_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `notifications`

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  alert_id UUID REFERENCES alerts(id),
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email')),
  title TEXT NOT NULL,
  message TEXT,
  severity TEXT NOT NULL,
  alert_type TEXT,
  action_url TEXT,
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `notification_preferences`

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  channel_in_app BOOLEAN DEFAULT TRUE,
  channel_email BOOLEAN DEFAULT TRUE,
  min_severity TEXT DEFAULT 'warning',
  types_whitelist TEXT[],
  types_blacklist TEXT[],
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_timezone TEXT DEFAULT 'UTC',
  UNIQUE (user_id, tenant_id)
);
```

## Troubleshooting

### Alerts not showing up

1. Check browser console for errors
2. Verify user has permission to view alerts (owner/admin/editor role)
3. Check `alerts` table in database for tenant_id match

### Notifications not dispatching

1. Check `notification_preferences` table for user preferences
2. Verify `min_severity` threshold allows the alert severity
3. Check if alert type is in `types_blacklist`

### Too many notifications

1. Coalescing should prevent spam - check if alerts have different keys
2. Verify device_id/data_source_id is correctly passed to raiseAlert()
3. Check `occurrences` count on alerts to confirm coalescing

### Email notifications not sending

1. Email notifications are queued but not actually sent in development
2. Check `notifications` table for `channel='email'` rows
3. Production requires email service integration (SendGrid, Postmark, etc.)

## Rate Limiting

The alert engine includes rate limiting to prevent alert spam from runaway services.

### Configuration

```javascript
import { configureRateLimit, getRateLimitConfig } from './alertEngineService';

// View current config
console.log(getRateLimitConfig());
// { maxAlertsPerWindow: 5, windowMs: 60000, enabled: true }

// Customize rate limiting
configureRateLimit({
  maxAlertsPerWindow: 10,  // Max alerts per source per window
  windowMs: 120000,        // 2 minute window
  enabled: true,           // Can disable for testing
});
```

### Behavior

- Rate limits are per alert type + source (device_id, data_source_id, or tenant_id)
- Default: 5 new alerts per minute per source
- Coalescing (updating existing alerts) is NOT rate limited
- Rate-limited alerts are logged with `rate_limit_key` for debugging

### Rate Limit Key Format

`{alert_type}:{device_id | data_source_id | tenant_id}`

Example: `device_offline:abc123-device-uuid`

## Severity Auto-Escalation

Alerts automatically escalate from warning to critical based on configured rules.

### Escalation Rules

| Alert Type | Escalation Trigger |
|------------|-------------------|
| `device_offline` | After 30 minutes offline |
| `device_screenshot_failed` | After 5 consecutive failures |
| `data_source_sync_failed` | After 3 failures in 24 hours |
| `social_feed_sync_failed` | After 5 failures in 24 hours |
| `device_cache_stale` | After 24 hours stale |

### How It Works

1. When an alert is coalesced (updated), the escalation rules are checked
2. If conditions are met, severity is automatically upgraded to `critical`
3. Escalation events are logged: `Alert auto-escalated: warning → critical`
4. Notifications are sent for escalated alerts

### Example

```
Time 0:00 - Device goes offline (15 min)
  → warning alert created

Time 0:15 - Still offline (30 min)
  → Alert coalesced, escalated to critical
  → Notification sent with updated severity
```

## Performance Metrics

The alert engine tracks performance metrics for monitoring and debugging.

### Getting Metrics

```javascript
import { getPerformanceMetrics } from './alertEngineService';

const metrics = getPerformanceMetrics();
console.log(metrics);
// {
//   counters: {
//     alertsRaised: 150,
//     alertsCoalesced: 89,
//     alertsResolved: 120,
//     alertsDroppedRateLimit: 5,
//     alertsDroppedValidation: 2,
//     notificationsSent: 145,
//     notificationsFailed: 3,
//   },
//   averageTimings: {
//     raiseAlert: { avg: 45, min: 12, max: 320, samples: 150 },
//     autoResolveAlert: { avg: 38, min: 8, max: 180, samples: 120 },
//   },
//   slowOperationThresholdMs: 300
// }
```

### Slow Operation Logging

Operations taking longer than 300ms are automatically logged as warnings:

```
[AlertEngine] Slow operation: raiseAlert took 450ms { "tenant_id": "...", "duration_ms": 450 }
```

### Configuring Threshold

```javascript
import { setSlowOperationThreshold } from './alertEngineService';

setSlowOperationThreshold(500);  // 500ms threshold
```

## Developer Testing

### Test Utility Script

A CLI script is available for triggering test alerts during development:

```bash
# Create a device offline alert
TENANT_ID=abc123 node scripts/dev/trigger-alerts.cjs device-offline --minutes=45

# Create all alert types at once
node scripts/dev/trigger-alerts.cjs all --tenant-id=abc123

# Create a screenshot failure alert with 5 failures
node scripts/dev/trigger-alerts.cjs screenshot-fail --tenant-id=abc123 --failures=5

# Clear all test alerts
node scripts/dev/trigger-alerts.cjs clear --tenant-id=abc123

# Show help
node scripts/dev/trigger-alerts.cjs help
```

### Available Commands

| Command | Description |
|---------|-------------|
| `device-offline` | Create a device offline alert |
| `screenshot-fail` | Create a screenshot failure alert |
| `data-sync-fail` | Create a data source sync failure alert |
| `social-sync-fail` | Create a social feed sync failure alert |
| `cache-stale` | Create a cache stale alert |
| `all` | Create one of each alert type |
| `clear` | Clear all test alerts (with `is_test_alert=true`) |

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--tenant-id=UUID` | Tenant ID (required) | `$TENANT_ID` env var |
| `--device-id=UUID` | Device ID for device alerts | auto-generated |
| `--severity=LEVEL` | info, warning, critical | warning |
| `--minutes=N` | Minutes offline for device alerts | 15 |
| `--failures=N` | Failure count for screenshot alerts | 3 |

## Structured Logging

All alert engine operations produce structured logs with consistent context:

### Log Format

```
[AlertEngine] {message} {"tenant_id": "...", "alert_type": "...", "severity": "...", "is_new": true}
```

### Log Context Fields

| Field | Description |
|-------|-------------|
| `tenant_id` | Tenant ID |
| `alert_type` | Alert type (device_offline, etc.) |
| `alert_id` | Alert UUID (when available) |
| `device_id` | Device ID (for device alerts) |
| `data_source_id` | Data source ID (for sync alerts) |
| `severity` | info, warning, critical |
| `is_new` | true if new alert, false if coalesced |
| `is_resolved` | true if being resolved |
| `occurrences` | Number of times alert occurred |

### Log Levels

- **info**: Normal operations (alert created, resolved)
- **warn**: Non-fatal issues (notification failed, rate limited)
- **error**: Failures (database errors)
- **debug**: Verbose debugging (only in development)
