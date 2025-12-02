# Performance Tuning Guide

This document covers the performance optimization features in BizScreen, including database indexing, caching strategies, and frontend optimizations.

## Table of Contents

1. [Database Performance](#database-performance)
2. [Server-Side Caching](#server-side-caching)
3. [Frontend Caching](#frontend-caching)
4. [Code Splitting & Prefetching](#code-splitting--prefetching)
5. [Rate Limiting & Cost Controls](#rate-limiting--cost-controls)
6. [Monitoring & Metrics](#monitoring--metrics)
7. [Best Practices](#best-practices)

---

## Database Performance

### Index Strategy

Migration `038_performance_indexes_and_tuning.sql` creates composite and partial indexes for high-traffic query paths.

#### Key Indexes

| Index | Table | Use Case |
|-------|-------|----------|
| `idx_tv_devices_tenant_online_lastseen` | tv_devices | Dashboard screen counts, monitoring |
| `idx_playback_events_screen_occurred` | playback_events | Analytics, uptime calculations |
| `idx_campaigns_tenant_status_priority` | campaigns | Player content resolution |
| `idx_webhook_events_queue` | webhook_events | Background job processing |
| `idx_licenses_code_lookup` | licenses | License redemption (case-insensitive) |

#### Partial Indexes

Partial indexes reduce index size by only including relevant rows:

```sql
-- Only index active/scheduled campaigns
CREATE INDEX idx_campaigns_tenant_status_priority
  ON campaigns(tenant_id, status, priority DESC)
  WHERE status IN ('active', 'scheduled');

-- Only index recent playback events (30 days)
CREATE INDEX idx_playback_events_tenant_recent
  ON playback_events(tenant_id, created_at DESC)
  WHERE created_at > NOW() - INTERVAL '30 days';
```

### Query Optimization Tips

1. **Use EXPLAIN ANALYZE** to verify index usage:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM tv_devices
   WHERE tenant_id = 'xxx' AND is_online = true
   ORDER BY last_seen_at DESC;
   ```

2. **Monitor index usage** with pg_stat_user_indexes:
   ```sql
   SELECT indexrelname, idx_scan, idx_tup_read
   FROM pg_stat_user_indexes
   WHERE schemaname = 'public'
   ORDER BY idx_scan DESC;
   ```

3. **Run ANALYZE** after bulk operations:
   ```sql
   ANALYZE tv_devices;
   ```

---

## Server-Side Caching

### Location
`api/lib/dataCache.js`

### Basic Usage

```javascript
import { withCache, cacheKey, invalidate } from './dataCache.js';

// Simple caching
const data = await withCache(
  cacheKey('player', screenId),
  async () => fetchFromDatabase(),
  60 // TTL in seconds
);

// Invalidate by prefix
invalidate('player:'); // Invalidates all player cache entries
```

### Namespaced Caching

Pre-configured namespaces with appropriate TTLs:

```javascript
import { playerCache, dashboardCache, templatesCache } from './dataCache.js';

// Use namespace-specific cache
const content = await playerCache.getOrFetch(
  screenId,
  () => fetchPlayerContent(screenId)
);

// Invalidate namespace
playerCache.invalidateAll();
```

### Cache Namespaces

| Namespace | Default TTL | Use Case |
|-----------|-------------|----------|
| `player` | 60s | Player content resolution |
| `dashboard` | 120s | Dashboard statistics |
| `templates` | 600s | Template listings |
| `help` | 600s | Help topics |
| `analytics` | 180s | Analytics aggregations |
| `user` | 120s | User profile data |
| `tenant` | 120s | Tenant configuration |

### Tenant-Level Invalidation

When content changes, invalidate affected caches:

```javascript
import { invalidateTenant } from './dataCache.js';

// After playlist update
invalidateTenant(tenantId, ['player', 'dashboard']);

// After any content change
invalidateTenant(tenantId);
```

---

## Frontend Caching

### Location
`src/hooks/useDataCache.js`

### Stale-While-Revalidate Pattern

The `useDataCache` hook implements SWR for optimal perceived performance:

```javascript
import { useDataCache, cacheKeys } from '../hooks/useDataCache';

function DashboardStats({ tenantId }) {
  const { data, loading, error, refetch, isStale } = useDataCache(
    cacheKeys.dashboardStats(tenantId),
    () => fetchDashboardStats(tenantId),
    {
      ttlMs: 2 * 60 * 1000, // 2 minutes
      refreshOnFocus: true,
      refreshOnReconnect: true,
    }
  );

  // Shows cached data immediately, updates in background
  return loading && !data ? <Skeleton /> : <Stats data={data} />;
}
```

### Prefetching

```javascript
import { prefetch, cacheKeys } from '../hooks/useDataCache';

// Prefetch data before navigation
prefetch(cacheKeys.screensList(tenantId), () => fetchScreens(tenantId));
```

### Cache Invalidation

```javascript
import { invalidateCache, clearDataCache } from '../hooks/useDataCache';

// Invalidate by prefix
invalidateCache('dashboard:');

// Clear all cache (e.g., on logout)
clearDataCache();
```

---

## Code Splitting & Prefetching

### Location
`src/hooks/usePrefetch.js`

### Route-Level Code Splitting

Pages are lazy-loaded in `App.jsx`:

```javascript
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ScreensPage = lazy(() => import('./pages/ScreensPage'));
```

### Prefetching on Hover

```javascript
import { usePrefetch } from '../hooks/usePrefetch';

function NavItem({ pageName, tenantId, children }) {
  const { prefetchOnHover } = usePrefetch(tenantId);

  return (
    <button {...prefetchOnHover(pageName)}>
      {children}
    </button>
  );
}
```

### Critical Data Prefetching

```javascript
import { usePrefetchOnMount } from '../hooks/usePrefetch';

function Dashboard({ tenantId }) {
  // Prefetch likely next pages when dashboard loads
  usePrefetchOnMount(['screens', 'playlists', 'media'], tenantId);

  return <DashboardContent />;
}
```

---

## Rate Limiting & Cost Controls

### Location
`api/lib/rateLimit.js`

### Rate Limit Presets

| Preset | Window | Max Requests | Use Case |
|--------|--------|--------------|----------|
| `public` | 1 min | 60 | Pairing, heartbeat |
| `authenticated` | 1 min | 120 | Standard API calls |
| `telemetry` | 1 min | 300 | High-frequency events |
| `sensitive` | 15 min | 10 | Login, password reset |
| `aiAssistant` | 1 min | 10 | AI endpoints |
| `mediaUpload` | 1 min | 30 | File uploads |

### Applying Rate Limits

```javascript
import { rateLimit } from '../lib/rateLimit.js';

export default async function handler(req, res) {
  const { allowed, response } = await rateLimit(req, 'myEndpoint', 'authenticated');
  if (!allowed) return response;

  // Handle request...
}
```

### Tier-Based Limits

Higher subscription tiers get more generous limits:

| Tier | Multiplier | Example (authenticated) |
|------|------------|-------------------------|
| Free | 0.5x | 60 req/min |
| Starter | 1.0x | 120 req/min |
| Pro | 2.0x | 240 req/min |
| Enterprise | 5.0x | 600 req/min |

### Daily Usage Limits

```javascript
import { trackDailyUsage, getDailyUsageSummary } from '../lib/rateLimit.js';

// Track usage
const { allowed, remaining } = trackDailyUsage(tenantId, 'aiRequests', 1, 'pro');

// Get summary
const summary = getDailyUsageSummary(tenantId, 'pro');
// { apiCalls: { current: 150, limit: 100000, remaining: 99850 }, ... }
```

---

## Monitoring & Metrics

### Performance Metrics Table

The `performance_metrics` table stores aggregated metrics:

```javascript
// Record a metric
await supabase.rpc('record_performance_metric', {
  p_metric_type: 'api_latency',
  p_metric_name: 'player_content',
  p_metric_value: 45.5, // milliseconds
});

// Get summary
const { data } = await supabase.rpc('get_performance_summary', {
  p_hours: 24
});
```

### Status Page

Access the Status page (super_admin only) to view:
- System dependency health
- Screen online/offline status
- Cache statistics
- Performance metrics
- Webhook queue status

### Cache Statistics

```javascript
import { getCacheStats } from '../api/lib/dataCache.js';

const stats = getCacheStats();
// {
//   totalEntries: 150,
//   validEntries: 140,
//   expiredEntries: 10,
//   hits: 5000,
//   misses: 500,
//   hitRate: '90.9%',
//   byNamespace: { player: 50, dashboard: 30, ... }
// }
```

---

## Best Practices

### Do's

1. **Use appropriate cache TTLs**
   - Short TTL (60s) for frequently changing data (player content)
   - Long TTL (600s) for static data (templates, help)

2. **Invalidate caches when data changes**
   - Call `invalidateTenant()` after content updates
   - Use namespace-specific invalidation when possible

3. **Prefetch critical data**
   - Prefetch dashboard data on login
   - Prefetch likely next pages on hover

4. **Monitor cache hit rates**
   - Target >80% hit rate for hot paths
   - Investigate misses in high-traffic endpoints

5. **Use partial indexes**
   - Filter indexes to relevant subsets
   - Reduces index size and maintenance cost

### Don'ts

1. **Don't cache user-specific sensitive data** without proper invalidation

2. **Don't set TTLs too long** for data that changes frequently

3. **Don't skip cache invalidation** after write operations

4. **Don't prefetch everything** - focus on likely navigation paths

5. **Don't ignore rate limit errors** - implement proper backoff

### Performance Checklist

- [ ] Database indexes created for common queries
- [ ] Hot paths using server-side cache
- [ ] Frontend using useDataCache for API calls
- [ ] Pages lazy-loaded with React.lazy
- [ ] Critical data prefetched on dashboard load
- [ ] Rate limiting applied to all API endpoints
- [ ] Cache invalidation on content updates
- [ ] Performance metrics being recorded

---

## Troubleshooting

### Slow Queries

1. Check if indexes exist: `\di` in psql
2. Run `EXPLAIN ANALYZE` on slow queries
3. Look for sequential scans on large tables
4. Consider adding composite indexes

### Cache Misses

1. Check cache TTL settings
2. Verify cache keys are consistent
3. Look for unintended invalidations
4. Monitor hit rate in Status page

### High Latency

1. Check network latency to Supabase
2. Review query complexity
3. Consider adding caching layer
4. Monitor in Status page performance section

### Rate Limit Errors

1. Check subscription tier limits
2. Implement exponential backoff
3. Consider caching to reduce requests
4. Contact support for enterprise limits
