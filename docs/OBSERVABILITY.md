# Observability, SLAs, and Metrics Guide

This document covers the observability infrastructure for BizScreen, including distributed tracing, metrics collection, SLA monitoring, and alerting.

## Overview

The observability system provides:

- **Distributed Tracing** - End-to-end request correlation across services
- **Metrics Pipeline** - Collection and aggregation of performance metrics
- **SLA Engine** - Service-level monitoring with tier-based targets
- **Alerting** - Configurable alert rules with notifications
- **Player Analytics** - Network quality metrics from mobile/web players

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ metricsService│  │ slaService   │  │ usePlayerMetrics     │  │
│  │ (buffer+batch)│  │ (SLA queries)│  │ (network monitoring) │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼─────────────────┼─────────────────────┼───────────────┘
          │                 │                     │
          ▼                 ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ tracingService│  │ logger.js    │  │ Request Middleware   │  │
│  │ (correlation) │  │ (structured) │  │ (trace injection)    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼─────────────────┼─────────────────────┼───────────────┘
          │                 │                     │
          ▼                 ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Database                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ metric_events │  │ alert_events │  │ player_network_metrics│  │
│  │ (raw events)  │  │ (alerts)     │  │ (device health)      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ tenant_sla_  │  │ response_time│  │ api_usage_counters   │  │
│  │ snapshots    │  │ _histograms  │  │ (usage tracking)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Database Tables

### metric_events
Raw metric events for all types of operations.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | Tenant owning this metric |
| trace_id | text | Distributed trace ID |
| span_id | text | Span ID within trace |
| event_type | text | Type: request, error, api_call |
| event_name | text | Specific operation name |
| duration_ms | integer | Duration in milliseconds |
| status_code | integer | HTTP status code |
| error_class | text | Error classification |
| error_message | text | Error details |
| metadata | jsonb | Additional context |

### tenant_sla_snapshots
Periodic SLA status snapshots per tenant.

| Column | Type | Description |
|--------|------|-------------|
| tenant_id | uuid | Tenant ID |
| snapshot_time | timestamptz | Snapshot timestamp |
| uptime_percent | numeric | Calculated uptime % |
| avg_latency_ms | numeric | Average API latency |
| error_rate_percent | numeric | Error rate % |
| webhook_success_percent | numeric | Webhook delivery % |
| device_online_percent | numeric | Device online % |
| sla_met | boolean | Whether SLA targets met |

### player_network_metrics
Network quality from player devices.

| Column | Type | Description |
|--------|------|-------------|
| device_id | uuid | Device ID |
| tenant_id | uuid | Tenant ID |
| latency_ms | integer | Measured latency |
| latency_bucket | text | excellent/good/fair/poor/critical |
| jitter_ms | integer | Network jitter |
| packet_loss_percent | numeric | Packet loss % |
| retry_count | integer | Request retries |
| reconnect_count | integer | Connection reconnects |

### alert_events
Active and resolved alerts.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Alert ID |
| rule_id | uuid | Alert rule that triggered |
| tenant_id | uuid | Affected tenant |
| alert_type | text | Alert classification |
| severity | text | critical/warning/info |
| message | text | Alert message |
| status | text | active/acknowledged/resolved |
| metadata | jsonb | Additional context |

## Distributed Tracing

### Trace Context Headers

All requests propagate these headers:

```javascript
const TRACE_HEADERS = {
  TRACE_ID: 'x-trace-id',
  SPAN_ID: 'x-span-id',
  PARENT_SPAN_ID: 'x-parent-span-id',
  TENANT_ID: 'x-tenant-id',
  USER_ID: 'x-user-id',
  DEVICE_ID: 'x-device-id',
  REQUEST_ID: 'x-request-id',
};
```

### Creating Traces

```javascript
import { createTrace, withTrace } from '../api/lib/tracingService';

// Create a new trace for an operation
const trace = createTrace({
  tenantId: 'tenant-uuid',
  userId: 'user-uuid',
  operationName: 'process-webhook'
});

// Use withTrace for automatic cleanup
const result = await withTrace(trace, async () => {
  // Your operation here
  return someAsyncOperation();
});
```

### Request Tracing

```javascript
import { traceRequest } from '../api/lib/tracingService';
import logger from '../api/lib/logger';

export default async function handler(req, res) {
  // Initialize trace from request headers
  traceRequest(req, {
    tenantId: req.userId,
    operationName: 'api.someEndpoint'
  });

  // Create request-scoped logger
  const log = logger.forRequest(req);
  log.info('Processing request');

  // ... handler logic
}
```

## SLA Monitoring

### Tier Configuration

```javascript
const SLA_TIERS = {
  free: {
    uptimeTarget: null,        // No SLA guarantee
    latencyTarget: null,
    alertingEnabled: false
  },
  starter: {
    uptimeTarget: 99.0,
    latencyTarget: 1000,       // 1 second
    deviceOnlineTarget: 90.0,
    alertingEnabled: false
  },
  pro: {
    uptimeTarget: 99.5,
    latencyTarget: 500,
    deviceOnlineTarget: 95.0,
    webhookSuccessTarget: 95.0,
    alertingEnabled: true
  },
  enterprise: {
    uptimeTarget: 99.9,
    latencyTarget: 200,
    deviceOnlineTarget: 99.0,
    webhookSuccessTarget: 99.0,
    alertingEnabled: true,
    customAlerts: true
  }
};
```

### Fetching SLA Data

```javascript
import {
  getSlaBreakdown,
  getCurrentSlaStatus,
  checkSlaCompliance
} from '../services/slaService';

// Get SLA breakdown for past 24 hours
const breakdown = await getSlaBreakdown(tenantId, 24);

// Get current SLA status
const status = await getCurrentSlaStatus(tenantId);

// Check compliance against tier targets
const compliance = await checkSlaCompliance(tenantId, 'pro');
```

## Metrics Collection

### Recording Metrics

```javascript
import {
  recordMetric,
  recordApiMetric,
  recordErrorMetric
} from '../services/metricsService';

// Record a generic metric
recordMetric('request', 'page.dashboard', {
  durationMs: 150,
  metadata: { route: '/dashboard' }
});

// Record an API call metric
recordApiMetric('/api/playlists', 'GET', startTime, response);

// Record an error
recordErrorMetric('ValidationError', 'Invalid playlist format', {
  playlistId: 'uuid'
});
```

### Batch Processing

Metrics are buffered client-side and flushed:
- Every 30 seconds automatically
- When buffer reaches 100 events
- On page unload (using sendBeacon)

```javascript
import { flushMetrics } from '../services/metricsService';

// Force immediate flush
await flushMetrics();
```

## Player Network Monitoring

### Using the Hook

```javascript
import { usePlayerMetrics } from '../hooks/usePlayerMetrics';

function PlayerComponent({ deviceId, tenantId }) {
  const {
    metrics,
    connectionQuality,
    recordRetry,
    recordReconnect
  } = usePlayerMetrics({ deviceId, tenantId });

  // Record retries on failure
  const fetchWithRetry = async () => {
    try {
      await fetch('/api/content');
    } catch (error) {
      recordRetry();
      // retry logic
    }
  };

  return (
    <div>
      <span>Latency: {metrics.latencyMs}ms</span>
      <span>Quality: {connectionQuality}</span>
    </div>
  );
}
```

### Latency Buckets

| Bucket | Latency Range |
|--------|---------------|
| excellent | 0-50ms |
| good | 50-100ms |
| fair | 100-200ms |
| poor | 200-500ms |
| critical | 500ms+ |

## Alerting

### Alert Thresholds

```javascript
const ALERT_THRESHOLDS = {
  error_rate: {
    warning: 5,     // 5% error rate
    critical: 10    // 10% error rate
  },
  latency_p99: {
    warning: 2000,  // 2 seconds
    critical: 5000  // 5 seconds
  },
  device_offline: {
    warning: 10,    // 10% offline
    critical: 25    // 25% offline
  },
  webhook_backlog: {
    warning: 100,   // 100 pending
    critical: 500   // 500 pending
  }
};
```

### Managing Alerts

```javascript
import {
  getCriticalAlerts,
  acknowledgeAlert,
  resolveAlert
} from '../services/slaService';

// Get active alerts
const alerts = await getCriticalAlerts(tenantId);

// Acknowledge an alert
await acknowledgeAlert(alertId, userId);

// Resolve an alert
await resolveAlert(alertId, userId, 'Fixed the issue');
```

## Service Quality Page

Access: Admins, Super Admins, Enterprise tenants

Navigate to Settings > Service Quality to view:

- **SLA Gauges** - Uptime, latency, device online %, webhook success %
- **Alerts Feed** - Active alerts with acknowledge/resolve actions
- **Network Health** - Player connection quality summary
- **Latency Distribution** - API endpoint latency breakdown
- **Error Breakdown** - Errors grouped by class
- **Usage Trends** - Daily usage counters
- **SLA Components** - Detailed SLA breakdown

## Database Functions

### record_metric_event

Records a metric event with automatic tenant context.

```sql
SELECT record_metric_event(
  p_tenant_id := 'tenant-uuid',
  p_trace_id := 'trace-123',
  p_event_type := 'api_call',
  p_event_name := 'GET /api/playlists',
  p_duration_ms := 150,
  p_status_code := 200
);
```

### get_sla_breakdown

Returns SLA metrics for a tenant over a time period.

```sql
SELECT * FROM get_sla_breakdown(
  p_tenant_id := 'tenant-uuid',
  p_hours := 24
);
```

### get_metrics_dashboard

Returns aggregated metrics for dashboard display.

```sql
SELECT * FROM get_metrics_dashboard(
  p_tenant_id := 'tenant-uuid',
  p_hours := 24
);
```

### record_player_network_metrics

Records network quality from a player device.

```sql
SELECT record_player_network_metrics(
  p_device_id := 'device-uuid',
  p_tenant_id := 'tenant-uuid',
  p_latency_ms := 45,
  p_jitter_ms := 10,
  p_packet_loss_percent := 0.5,
  p_retry_count := 0,
  p_reconnect_count := 0
);
```

## Data Retention

| Table | Retention |
|-------|-----------|
| metric_events | 30 days |
| tenant_sla_snapshots | 90 days |
| player_network_metrics | 30 days |
| response_time_histograms | 90 days |
| api_usage_counters | 365 days |
| alert_events | 90 days (resolved) |

Cleanup is handled by the `cleanup_old_metrics()` function, run daily via cron.

## Best Practices

1. **Always include trace context** - Use `traceRequest()` at the start of every API handler
2. **Use structured logging** - Include relevant metadata with every log entry
3. **Monitor SLA compliance** - Review the Service Quality page regularly
4. **Set up alerts** - Configure alert rules for your critical thresholds
5. **Track player health** - Monitor device network quality trends
6. **Review error breakdown** - Investigate recurring error classes

## Troubleshooting

### Missing Metrics

1. Check that `metricsService` is imported and used
2. Verify `flushMetrics()` is being called
3. Check browser console for errors
4. Verify RLS policies allow metric recording

### Alerts Not Firing

1. Check `alertingEnabled` for the subscription tier
2. Verify alert rules are configured in `alert_rules` table
3. Check that `evaluateAlertRules()` is being called

### High Latency in Metrics

1. Check database indexes on `metric_events`
2. Verify cleanup job is running
3. Consider increasing batch flush interval
