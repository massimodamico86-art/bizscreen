# Dashboard QA Audit Report

**Audit Date:** January 21, 2026
**Auditor:** Senior QA Engineer
**Scope:** Client dashboard (`src/pages/DashboardPage.jsx`, `src/pages/dashboard/*`, `src/services/dashboardService.js`)
**Standard:** Production-ready SaaS

---

## Executive Summary

| Category | Status | Issues Found |
|----------|--------|--------------|
| **Security (RLS)** | PASS | 0 Critical, 0 Medium |
| **Resilience** | PARTIAL | 0 Critical, 2 Medium |
| **Performance** | NEEDS WORK | 1 Critical, 2 Medium |
| **UX (Loading States)** | NEEDS WORK | 0 Critical, 3 Medium |

**Overall Assessment:** The dashboard has solid foundations but requires optimization for production scale.

---

## 1. Security Audit: Row Level Security (RLS)

### Status: PASS

All tables queried by the dashboard have RLS enabled with appropriate policies.

| Table | RLS Enabled | SELECT Policy | Tenant Isolation |
|-------|-------------|---------------|------------------|
| `tv_devices` | Yes | `tv_devices_select_policy` | Yes (via tenant_id) |
| `playlists` | Yes | `playlists_select_policy` | Yes (via tenant_id) |
| `media_assets` | Yes | `media_assets_select_policy` | Yes (via tenant_id) |
| `layouts` | Yes | `layouts_select_policy` | Yes (via tenant_id) |

### Verified Migrations
- `011_rbac_tv_qr_pms_activity.sql` - tv_devices RLS
- `014_yodeck_phase1_media_playlists.sql` - media_assets, playlists, layouts RLS
- `012_finalize_rls_rbac.sql` - RLS finalization

### No Issues Found

The dashboard service correctly relies on Supabase RLS. All queries go through the authenticated client, ensuring users can only see their tenant's data.

---

## 2. Resilience Audit: Error Boundaries & Empty States

### Status: PARTIAL PASS

#### What's Working

| Feature | Location | Status |
|---------|----------|--------|
| Global ErrorBoundary | `DashboardPage.jsx:266` | Implemented |
| Dashboard Error State | `DashboardSections.jsx:52-91` | Implemented |
| Retry Functionality | `DashboardErrorState` component | Implemented |
| Empty Screens State | `DashboardPage.jsx:374-389` | Implemented |
| Empty Workspace Hint | `StatsGrid` component | Implemented |
| Empty Activity State | `RecentActivityWidget:352-365` | Implemented |
| Empty Alerts State | `AlertsWidget:481-486` | Implemented |

#### Issues Found

##### MEDIUM: Silent Failure for Secondary Widgets
**Location:** `DashboardPage.jsx:132-140`

```javascript
getRecentActivity(5)
  .then(data => setRecentActivity(data))
  .catch(err => console.warn('Failed to fetch recent activity:', err))
  .finally(() => setActivityLoading(false));
```

**Problem:** Activity and Alerts widget failures are logged to console but users see empty state without explanation.

**Recommendation:** Show inline error state with retry option for each widget:
```javascript
// Add error state per widget
const [activityError, setActivityError] = useState(null);

// In catch block:
.catch(err => {
  console.warn('Failed to fetch recent activity:', err);
  setActivityError('Failed to load activity');
})
```

##### MEDIUM: No Per-Widget Retry
**Location:** `RecentActivityWidget`, `AlertsWidget`

**Problem:** Users cannot retry loading individual widgets that failed.

**Recommendation:** Add retry button to each widget's error state.

---

## 3. Performance Audit: Data Fetching & Pagination

### Status: NEEDS WORK

#### Critical Issues

##### CRITICAL: Unbounded Queries for Statistics
**Location:** `dashboardService.js:28-43`

```javascript
const [screensResult, playlistsResult, mediaResult] = await Promise.all([
  supabase.from('tv_devices').select('id, is_online, last_seen'),  // NO LIMIT
  supabase.from('playlists').select('id'),                          // NO LIMIT
  supabase.from('media_assets').select('id, type')                  // NO LIMIT
]);
```

**Problem:** These queries fetch ALL records just to count them. For a tenant with:
- 1,000 screens: ~100KB transferred
- 10,000 media assets: ~500KB transferred
- 5,000 playlists: ~200KB transferred

This will cause:
1. Slow dashboard load times
2. Excessive Supabase bandwidth usage
3. Memory pressure on client devices

**Recommendation:** Use Supabase `count` feature:
```javascript
const [screensResult, playlistsResult, mediaResult] = await Promise.all([
  supabase.from('tv_devices').select('*', { count: 'exact', head: true }),
  supabase.from('playlists').select('*', { count: 'exact', head: true }),
  supabase.from('media_assets').select('type', { count: 'exact' })
    .then(/* aggregate by type */)
]);
```

For online/offline breakdown, use a database function:
```sql
CREATE FUNCTION get_screen_stats()
RETURNS TABLE (total INT, online INT, offline INT) AS $$
  SELECT
    COUNT(*)::INT as total,
    COUNT(*) FILTER (WHERE last_seen > NOW() - INTERVAL '2 minutes')::INT as online,
    COUNT(*) FILTER (WHERE last_seen <= NOW() - INTERVAL '2 minutes' OR last_seen IS NULL)::INT as offline
  FROM tv_devices
  WHERE tenant_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;
```

#### Medium Issues

##### MEDIUM: No Pagination for Screens Overview
**Location:** `dashboardService.js:89-110`

**Current:** `getTopScreens(5)` - Hardcoded limit of 5

**Problem:** Users with many screens have no way to see beyond top 5 on dashboard.

**Recommendation:** While limit is appropriate for dashboard summary, add a "View All" link that navigates to full screens page with pagination.

##### MEDIUM: Device Health Issues Query Unbounded
**Location:** `dashboardService.js:194-248`

```javascript
const { data, error } = await supabase
  .from('tv_devices')
  .select('id, device_name, last_seen, is_online, created_at')
  .order('last_seen', { ascending: true, nullsFirst: true });
  // NO LIMIT
```

**Problem:** Fetches ALL devices for health check. Same scaling issue as stats.

**Recommendation:** Limit to devices with issues only:
```javascript
const { data, error } = await supabase
  .from('tv_devices')
  .select('id, device_name, last_seen, is_online, created_at')
  .or(`last_seen.is.null,last_seen.lt.${oneHourAgo.toISOString()}`)
  .order('last_seen', { ascending: true, nullsFirst: true })
  .limit(50);
```

---

## 4. UX Audit: Loading Skeletons

### Status: NEEDS WORK

#### What's Working

| Feature | Status |
|---------|--------|
| Initial loading spinner | Implemented |
| Activity widget loading | Implemented (spinner) |
| Alerts widget loading | Implemented (spinner) |
| Skeleton component library | Available but unused |

#### Issues Found

##### MEDIUM: Dashboard Uses Spinner Instead of Skeleton
**Location:** `DashboardPage.jsx:233-242`

```javascript
if (loading) {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
      <p className="text-gray-500">Loading...</p>
    </div>
  );
}
```

**Problem:** Centered spinner causes layout shift when content loads. Users don't see the page structure during load.

**Recommendation:** Use skeleton loaders from existing `Skeleton.jsx`:
```javascript
import { SkeletonDashboardStats, SkeletonList, SkeletonChart } from '../components/Skeleton';

if (loading) {
  return (
    <PageLayout maxWidth="wide">
      <SkeletonPageHeader />
      <PageContent>
        <Stack gap="lg">
          <SkeletonDashboardStats count={4} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonList count={5} />
            <SkeletonList count={4} />
          </div>
        </Stack>
      </PageContent>
    </PageLayout>
  );
}
```

##### MEDIUM: Widget Loaders Use Spinners
**Location:** `DashboardSections.jsx:336-350`, `439-452`

**Problem:** Activity and Alerts widgets show centered spinners instead of content-shaped skeletons.

**Recommendation:** Create widget-specific skeletons:
```javascript
function SkeletonActivityItem() {
  return (
    <div className="flex items-center gap-3 p-2">
      <Skeleton className="w-8 h-8 rounded-lg" />
      <div className="flex-1">
        <SkeletonText width="w-32" height="h-4" className="mb-1" />
        <SkeletonText width="w-20" height="h-3" />
      </div>
    </div>
  );
}
```

##### MEDIUM: No Progressive Loading
**Location:** `DashboardPage.jsx:106-146`

**Problem:** Dashboard waits for core data before showing anything. Secondary data loads in parallel but UI blocks on main data.

**Recommendation:** Implement progressive disclosure:
1. Show page structure immediately with skeletons
2. Load stats first (fastest)
3. Load screens next
4. Load activity/alerts last

---

## 5. Test Coverage

### Status: GOOD

The dashboard has comprehensive test coverage in `tests/unit/pages/DashboardPage.test.jsx`:

| Test Category | Coverage |
|---------------|----------|
| Happy path rendering | Yes |
| Loading state | Yes |
| Error state with retry | Yes |
| Empty workspace | Yes |
| Navigation | Yes |
| Edge cases (null user, partial data) | Yes |

**Note:** Tests mock the service layer correctly and don't test actual Supabase queries.

---

## Recommendations Summary

### Priority 1: Critical (Fix Before Production)

| Issue | Impact | Effort | Location |
|-------|--------|--------|----------|
| Unbounded stats queries | Performance degradation at scale | Medium | `dashboardService.js:28-43` |

### Priority 2: High (Fix Soon)

| Issue | Impact | Effort | Location |
|-------|--------|--------|----------|
| Use skeleton loaders | Better perceived performance | Low | `DashboardPage.jsx:233-242` |
| Unbounded health issues query | Performance | Low | `dashboardService.js:194-248` |

### Priority 3: Medium (Backlog)

| Issue | Impact | Effort | Location |
|-------|--------|--------|----------|
| Per-widget error states | Better error recovery UX | Medium | `DashboardSections.jsx` |
| Per-widget retry buttons | Better error recovery UX | Low | `RecentActivityWidget`, `AlertsWidget` |
| Progressive loading | Perceived performance | Medium | `DashboardPage.jsx` |

---

## Appendix: Files Reviewed

1. `src/pages/DashboardPage.jsx` - Main dashboard component
2. `src/pages/dashboard/DashboardSections.jsx` - Stats, screens, widgets
3. `src/pages/dashboard/OnboardingCards.jsx` - First-run cards
4. `src/pages/dashboard/WelcomeModal.jsx` - Welcome modal
5. `src/services/dashboardService.js` - Data fetching
6. `src/components/ErrorBoundary.jsx` - Error handling
7. `src/components/Skeleton.jsx` - Loading skeletons (unused)
8. `src/design-system/components/EmptyState.jsx` - Empty states
9. `supabase/migrations/*` - RLS policies
10. `tests/unit/pages/DashboardPage.test.jsx` - Unit tests

---

*Report generated by QA audit process*
