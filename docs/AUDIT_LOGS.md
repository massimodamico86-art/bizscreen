# Audit Logs & System Events

Phase 18: Comprehensive audit logging and system event tracking for BizScreen.

## Overview

BizScreen provides two types of event tracking:

1. **Audit Logs**: Tenant-scoped activity tracking for all sensitive user and system actions
2. **System Events**: Backend operation tracking visible only to super administrators

## Features

### Audit Logs

- Track all sensitive actions per tenant
- Automatic IP address and user agent capture
- Flexible filtering by event type, entity, user, and date range
- Pagination support for large datasets
- 90-day retention with automatic cleanup

### System Events

- Track backend operations (API, scheduler, workers)
- Severity levels (debug, info, warning, error, critical)
- Source categorization
- Super admin only access
- 30-day retention with automatic cleanup

## Database Schema

### audit_logs

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant reference |
| user_id | UUID | User who performed action (nullable) |
| event_type | TEXT | Type of event (e.g., `user.created`) |
| entity_type | TEXT | Type of entity affected (nullable) |
| entity_id | TEXT | ID of entity affected (nullable) |
| metadata | JSONB | Additional event data |
| ip_address | TEXT | Client IP address (nullable) |
| user_agent | TEXT | Client user agent (nullable) |
| created_at | TIMESTAMPTZ | Timestamp |

### system_events

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| source | TEXT | Event source (api, scheduler, system, admin, worker) |
| event_type | TEXT | Type of event |
| severity | TEXT | Severity level (debug, info, warning, error, critical) |
| details | JSONB | Event details |
| created_at | TIMESTAMPTZ | Timestamp |

## Event Types

### Authentication Events

- `auth.login` - User login
- `auth.logout` - User logout
- `auth.password_reset` - Password reset requested
- `auth.password_change` - Password changed
- `auth.mfa_enabled` - MFA enabled
- `auth.mfa_disabled` - MFA disabled

### User Management Events

- `user.created` - User created
- `user.updated` - User updated
- `user.deleted` - User deleted
- `user.disabled` - User disabled
- `user.enabled` - User enabled
- `user.role_changed` - User role changed
- `user.invited` - User invited

### Tenant Management Events

- `tenant.created` - Tenant created
- `tenant.updated` - Tenant updated
- `tenant.suspended` - Tenant suspended
- `tenant.unsuspended` - Tenant unsuspended
- `tenant.plan_changed` - Subscription plan changed

### Feature & Quota Events

- `feature.override_set` - Feature flag override set
- `feature.override_removed` - Feature flag override removed
- `quota.override_set` - Quota override set
- `quota.override_removed` - Quota override removed

### Screen Management Events

- `screen.created` - Screen created
- `screen.updated` - Screen updated
- `screen.deleted` - Screen deleted
- `screen.rebooted` - Screen rebooted remotely
- `screen.paired` - Screen paired
- `screen.unpaired` - Screen unpaired

### Content Management Events

- `media.uploaded` - Media file uploaded
- `media.deleted` - Media file deleted
- `playlist.created` - Playlist created
- `playlist.updated` - Playlist updated
- `playlist.deleted` - Playlist deleted
- `campaign.created` - Campaign created
- `campaign.updated` - Campaign updated
- `campaign.deleted` - Campaign deleted
- `campaign.published` - Campaign published

### AI Assistant Events

- `ai.query` - AI query made
- `ai.content_generated` - AI content generated

### Settings & Integration Events

- `settings.updated` - Settings updated
- `integration.connected` - Integration connected
- `integration.disconnected` - Integration disconnected

### Billing Events

- `subscription.created` - Subscription created
- `subscription.updated` - Subscription updated
- `subscription.cancelled` - Subscription cancelled
- `payment.succeeded` - Payment succeeded
- `payment.failed` - Payment failed

## API Endpoints

### List Audit Logs

```
GET /api/audit/list
```

Query Parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 100)
- `event_type` - Filter by event type
- `entity_type` - Filter by entity type
- `user_id` - Filter by user
- `start_date` - Filter from date (ISO format)
- `end_date` - Filter to date (ISO format)
- `tenant_id` - Tenant ID (super admin only)

### List System Events

```
GET /api/audit/system
```

Query Parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 100)
- `source` - Filter by source
- `event_type` - Filter by event type
- `severity` - Filter by severity
- `start_date` - Filter from date (ISO format)
- `end_date` - Filter to date (ISO format)

## Backend Usage

### Recording Audit Events

```javascript
import { logAudit, AUDIT_EVENT_TYPES } from '../lib/auditLogger.js';

// From an API handler with request context
await logAudit(req, {
  event_type: AUDIT_EVENT_TYPES.USER_CREATED,
  entity_type: 'user',
  entity_id: newUser.id,
  metadata: {
    email: newUser.email,
    role: newUser.role,
  },
});

// Direct logging without request context
import { logAuditDirect } from '../lib/auditLogger.js';

await logAuditDirect({
  tenant_id: tenantId,
  user_id: userId,
  event_type: AUDIT_EVENT_TYPES.SETTINGS_UPDATED,
  entity_type: 'settings',
  metadata: { changes: settingsDiff },
});
```

### Recording System Events

```javascript
import { logSystem, SYSTEM_EVENT_SOURCES, SEVERITY_LEVELS } from '../lib/auditLogger.js';

await logSystem({
  source: SYSTEM_EVENT_SOURCES.SCHEDULER,
  event_type: 'cleanup.completed',
  severity: SEVERITY_LEVELS.INFO,
  details: {
    deleted_count: 150,
    duration_ms: 1234,
  },
});
```

### Middleware Wrapper

```javascript
import { withAuditLogging, AUDIT_EVENT_TYPES } from '../lib/auditLogger.js';

export default withAuditLogging(
  {
    event_type: AUDIT_EVENT_TYPES.SCREEN_UPDATED,
    entity_type: 'screen',
    getEntityId: (req, result) => req.body.screenId,
    getMetadata: (req, result) => ({ changes: req.body }),
  },
  async (req, res) => {
    // Your handler logic
    res.json({ success: true, data: result });
  }
);
```

## Frontend Usage

### Using the useAuditLogs Hook

```jsx
import { useAuditLogs } from '../hooks/useAuditLogs';

function AuditLogsPage() {
  const {
    logs,
    pagination,
    loading,
    error,
    filters,
    filterOptions,
    updateFilters,
    clearFilters,
    goToPage,
    refresh,
  } = useAuditLogs();

  return (
    <AuditLogTable logs={logs} loading={loading} />
  );
}
```

### Using the useSystemEvents Hook

```jsx
import { useSystemEvents } from '../hooks/useAuditLogs';

function SystemEventsPage() {
  const {
    events,
    pagination,
    loading,
    error,
    filters,
    updateFilters,
    clearFilters,
    refresh,
    isSuperAdmin,
  } = useSystemEvents();

  return (
    <EventTimeline events={events} loading={loading} />
  );
}
```

## Row Level Security

- **audit_logs**: Accessible to tenant members (their own tenant's logs) and super admins (all logs)
- **system_events**: Accessible to super admins only

## Data Retention

- Audit logs are retained for 90 days by default
- System events are retained for 30 days by default
- Cleanup functions can be called via scheduler:
  - `cleanup_old_audit_logs(days_to_keep INTEGER)`
  - `cleanup_old_system_events(days_to_keep INTEGER)`

## UI Components

### AuditLogTable

A table component for displaying audit logs with expandable metadata rows.

```jsx
import AuditLogTable from '../components/AuditLogTable';

<AuditLogTable
  logs={logs}
  loading={loading}
  emptyMessage="No audit logs found"
/>
```

### EventTimeline

A timeline component for displaying system events with severity indicators.

```jsx
import EventTimeline from '../components/EventTimeline';

<EventTimeline
  events={events}
  loading={loading}
  emptyMessage="No system events"
/>
```

## Navigation

For super admins, audit features are available in the Admin navigation:

- **Audit Logs** - View tenant audit logs
- **System Events** - View system-wide events

## Best Practices

1. **Always include context**: Log relevant entity IDs and metadata
2. **Use standard event types**: Use the predefined `AUDIT_EVENT_TYPES` constants
3. **Don't log sensitive data**: Avoid logging passwords, tokens, or PII in metadata
4. **Include reason for admin actions**: When admins take action, include the reason
5. **Handle errors gracefully**: Audit logging failures should not block main operations
