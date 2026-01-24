# Phase 10: Analytics - Research

**Researched:** 2026-01-24
**Domain:** Content analytics, data visualization, dashboard UI
**Confidence:** HIGH

## Summary

Phase 10 builds on a **mature analytics foundation** already present in the codebase. The `playback_events` table (migrations 022, 079, 099) captures detailed playback data including scene_id, duration_seconds, and timestamps. Existing RPCs (`get_playback_summary_by_media`, `get_scene_playback_summary`, `get_scene_timeline`) provide most of the data aggregation needed. The `analyticsService.js` and `contentAnalyticsService.js` already expose date range presets, formatting helpers, and chart data formatters.

The primary implementation work is:
1. Adding new RPCs for content-specific metrics (view duration per content, completion rate calculations)
2. Creating a heatmap RPC for hour-of-day/day-of-week aggregation
3. Building the analytics dashboard UI with tabs (leveraging existing design-system components)
4. Adding inline analytics cards to content detail pages

**Primary recommendation:** Extend existing database RPCs with content-focused aggregations, add Recharts for the heatmap visualization, and use the existing `Tabs`, `Card`, and `StatCard` design-system components for the dashboard.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase RPC | - | Database aggregations | Already used for all analytics queries |
| React | 19.1.1 | UI framework | Project standard |
| Tailwind CSS | 3.4.18 | Styling | Project standard |
| Lucide React | 0.548.0 | Icons | Project standard |

### Supporting (Need to Add)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| recharts | ^2.15.x | Heatmap & charts | Heatmap visualization (requirement ANA-04) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| recharts | @uiw/react-heat-map | Simpler but GitHub-contribution style only, not grid heatmap |
| recharts | D3.js direct | More flexible but higher complexity, larger bundle |
| recharts | Custom SVG | Full control but significant dev time |

**Note:** The codebase already has `formatTopScenesForChart`, `formatTimelineForChart`, `formatDeviceUptimeForChart` functions that output Chart.js-compatible data. These can be adapted for Recharts with minimal changes.

**Installation:**
```bash
npm install recharts
```

## Architecture Patterns

### Existing Analytics Service Structure
```
src/services/
  analyticsService.js        # Legacy screen-focused analytics
  contentAnalyticsService.js # Scene-focused analytics (use this as base)
  playbackTrackingService.js # Player-side event tracking
  playerAnalyticsService.js  # Player-side batching
```

### Recommended Additions
```
src/services/
  contentAnalyticsService.js # EXTEND with:
    - getContentViewDuration(contentId, dateRange)
    - getContentCompletionRate(contentId, dateRange)
    - getContentPerformanceList(dateRange, sortBy)
    - getViewingHeatmap(dateRange)

src/pages/
  AnalyticsDashboardPage.jsx # NEW: Main analytics dashboard

src/components/analytics/   # NEW: Analytics-specific components
  OverviewCards.jsx         # Summary stat cards
  ContentPerformanceTable.jsx
  ViewingHeatmap.jsx
  ContentInlineMetrics.jsx  # Reusable inline stats for detail pages
```

### Pattern 1: Tab-Based Dashboard Layout
**What:** Use design-system `Tabs` component with content panels below
**When to use:** Analytics dashboard main navigation
**Example:**
```jsx
// Source: Existing design-system/components/Tabs.jsx
import { Tabs } from '../design-system';

const DASHBOARD_TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'content', label: 'Content', icon: Play },
  { id: 'patterns', label: 'Viewing Patterns', icon: Clock },
];

function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <PageLayout>
      <Tabs
        tabs={DASHBOARD_TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
      />
      {activeTab === 'overview' && <OverviewSection />}
      {activeTab === 'content' && <ContentSection />}
      {activeTab === 'patterns' && <PatternsSection />}
    </PageLayout>
  );
}
```

### Pattern 2: Inline Metrics Component
**What:** Reusable metrics display for content detail pages
**When to use:** Scene detail page, media detail, playlist detail
**Example:**
```jsx
// Inline summary with link to full analytics
function ContentInlineMetrics({ contentId, contentType }) {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    loadContentMetrics(contentId, contentType).then(setMetrics);
  }, [contentId]);

  if (!metrics) return <SkeletonCard />;

  return (
    <Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatItem label="View Duration" value={formatDuration(metrics.avgDuration)} />
        <StatItem label="Completion Rate" value={`${metrics.completionRate}%`} />
        <StatItem label="Total Views" value={metrics.totalViews} />
        <StatItem label="Last Viewed" value={formatRelativeTime(metrics.lastViewed)} />
      </div>
      <Link to={`/analytics/content/${contentId}`} className="text-sm text-blue-600">
        View full analytics
      </Link>
    </Card>
  );
}
```

### Pattern 3: Database RPC for Aggregations
**What:** Use Supabase RPC for server-side aggregation
**When to use:** All analytics queries (already established pattern)
**Example:**
```sql
-- Source: Pattern from existing migrations 022, 079
CREATE OR REPLACE FUNCTION public.get_content_metrics(
  p_tenant_id UUID,
  p_content_id UUID,
  p_content_type TEXT, -- 'scene', 'media', 'playlist'
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ
)
RETURNS TABLE (
  avg_view_duration_seconds NUMERIC,
  completion_rate NUMERIC,
  total_views BIGINT,
  last_viewed_at TIMESTAMPTZ
) ...
```

### Anti-Patterns to Avoid
- **Client-side aggregation:** Never fetch raw playback_events and aggregate in JS
- **Multiple API calls for dashboard:** Use single RPC that returns all dashboard data
- **Hardcoded colors for heatmap:** Use Tailwind color scale classes for consistency

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date range selection | Custom date picker | `DATE_RANGES` from contentAnalyticsService | Already handles 24h, 7d, 30d, 90d presets |
| Duration formatting | Custom formatter | `formatDuration`, `formatHours` | Handles edge cases, consistent across app |
| Uptime colors | Custom color logic | `getUptimeColor`, `getUptimeBgColor` | Consistent thresholds app-wide |
| Stat cards | Custom div layouts | `StatCard` from design-system | Consistent styling, responsive |
| Tabs | Custom tab implementation | `Tabs`, `PillTabs` from design-system | Accessible, consistent |
| Relative time | Custom calculation | `formatRelativeTime` | Handles all edge cases |

**Key insight:** The codebase already has robust analytics utilities. Extend them rather than rebuild.

## Common Pitfalls

### Pitfall 1: Completion Rate Calculation Complexity
**What goes wrong:** Calculating completion rate requires knowing the scheduled duration vs actual display time
**Why it happens:** playback_events.duration_seconds is actual time, but scheduled duration is in playlist_items.duration or scene settings
**How to avoid:** Join playback_events with playlist_items or scene scheduled duration in the RPC
**Warning signs:** Completion rates > 100% or always exactly 100%

### Pitfall 2: Heatmap Data Sparsity
**What goes wrong:** Heatmap shows blank cells for hours with no views
**Why it happens:** Query only returns rows where data exists
**How to avoid:** Generate full 7x24 grid in RPC, fill missing with zeros
**Warning signs:** Heatmap rendering breaks or shows gaps

### Pitfall 3: Timezone Handling
**What goes wrong:** Heatmap shows wrong hours, peak times appear shifted
**Why it happens:** All timestamps in DB are UTC, must convert for display
**How to avoid:** Use `AT TIME ZONE` in PostgreSQL, or convert client-side with user's timezone
**Warning signs:** "Peak hours" don't match business expectations

### Pitfall 4: Performance on Large Date Ranges
**What goes wrong:** Dashboard loads slowly for 90-day ranges
**Why it happens:** Aggregating thousands of playback_events
**How to avoid:**
  - Use indexes (already created in migration 022)
  - Consider materialized views for 90-day+ ranges
  - Pre-aggregate hourly summaries
**Warning signs:** Query time > 3 seconds

### Pitfall 5: Content Type Confusion
**What goes wrong:** Metrics mixed between scenes, media, playlists
**Why it happens:** playback_events tracks all three with different fields
**How to avoid:** Filter by item_type, use specific scene_id/media_id/playlist_id fields
**Warning signs:** Totals don't match when filtered by type

## Code Examples

### Viewing Heatmap RPC (New)
```sql
-- Source: Pattern from existing migrations
CREATE OR REPLACE FUNCTION public.get_viewing_heatmap(
  p_tenant_id UUID,
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ
)
RETURNS TABLE (
  day_of_week INT,      -- 0=Sunday, 6=Saturday
  hour_of_day INT,      -- 0-23
  view_count BIGINT,
  total_duration_seconds BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH hourly_stats AS (
    SELECT
      EXTRACT(DOW FROM pe.started_at AT TIME ZONE 'UTC')::INT as dow,
      EXTRACT(HOUR FROM pe.started_at AT TIME ZONE 'UTC')::INT as hour,
      COUNT(*)::BIGINT as views,
      COALESCE(SUM(pe.duration_seconds), 0)::BIGINT as duration
    FROM public.playback_events pe
    WHERE pe.tenant_id = p_tenant_id
      AND pe.started_at >= p_from_ts
      AND pe.started_at <= p_to_ts
      AND pe.duration_seconds > 0
    GROUP BY dow, hour
  )
  -- Generate full grid and left join to fill gaps
  SELECT
    d.dow as day_of_week,
    h.hour as hour_of_day,
    COALESCE(hs.views, 0)::BIGINT as view_count,
    COALESCE(hs.duration, 0)::BIGINT as total_duration_seconds
  FROM generate_series(0, 6) d(dow)
  CROSS JOIN generate_series(0, 23) h(hour)
  LEFT JOIN hourly_stats hs ON hs.dow = d.dow AND hs.hour = h.hour
  ORDER BY d.dow, h.hour;
END;
$$;
```

### Heatmap Component with Tailwind CSS
```jsx
// Source: Custom implementation using Tailwind (simpler than Recharts for grid heatmap)
function ViewingHeatmap({ data }) {
  // data is array of { day_of_week, hour_of_day, view_count, total_duration_seconds }
  const maxValue = Math.max(...data.map(d => d.view_count), 1);

  const getColor = (value) => {
    if (value === 0) return 'bg-gray-100';
    const intensity = value / maxValue;
    if (intensity > 0.75) return 'bg-blue-600';
    if (intensity > 0.5) return 'bg-blue-400';
    if (intensity > 0.25) return 'bg-blue-300';
    return 'bg-blue-200';
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Reshape data into grid
  const grid = days.map((_, dayIndex) =>
    hours.map(hour => {
      const cell = data.find(d => d.day_of_week === dayIndex && d.hour_of_day === hour);
      return cell?.view_count || 0;
    })
  );

  return (
    <div className="overflow-x-auto">
      <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: 'auto repeat(24, minmax(16px, 1fr))' }}>
        {/* Header row */}
        <div className="h-6" />
        {hours.map(h => (
          <div key={h} className="h-6 text-[10px] text-gray-500 text-center">
            {h % 3 === 0 ? `${h}` : ''}
          </div>
        ))}

        {/* Data rows */}
        {days.map((day, dayIndex) => (
          <React.Fragment key={day}>
            <div className="text-xs text-gray-500 pr-2 flex items-center">{day}</div>
            {grid[dayIndex].map((value, hour) => (
              <div
                key={`${dayIndex}-${hour}`}
                className={`h-5 rounded-sm ${getColor(value)} transition-colors`}
                title={`${day} ${hour}:00 - ${value} views`}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
```

### Content Analytics Service Extension
```javascript
// Source: Extend existing contentAnalyticsService.js

/**
 * Get view duration and completion rate for specific content
 * @param {string} contentId - Scene/media/playlist UUID
 * @param {string} contentType - 'scene' | 'media' | 'playlist'
 * @param {string} dateRange - Date range preset
 */
export async function getContentMetrics(contentId, contentType, dateRange = '7d') {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) throw new Error('No tenant context');

  const { fromTs, toTs } = getDateRange(dateRange);

  const { data, error } = await supabase.rpc('get_content_metrics', {
    p_tenant_id: tenantId,
    p_content_id: contentId,
    p_content_type: contentType,
    p_from_ts: fromTs,
    p_to_ts: toTs,
  });

  if (error) throw error;
  return data?.[0] || {
    avg_view_duration_seconds: 0,
    completion_rate: 0,
    total_views: 0,
    last_viewed_at: null,
  };
}

/**
 * Get viewing pattern heatmap data
 * @param {string} dateRange - Date range preset
 */
export async function getViewingHeatmap(dateRange = '7d') {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) throw new Error('No tenant context');

  const { fromTs, toTs } = getDateRange(dateRange);

  const { data, error } = await supabase.rpc('get_viewing_heatmap', {
    p_tenant_id: tenantId,
    p_from_ts: fromTs,
    p_to_ts: toTs,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Get content performance list sorted by total view time
 * @param {string} dateRange - Date range preset
 * @param {number} limit - Max items to return
 */
export async function getContentPerformanceList(dateRange = '7d', limit = 20) {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) throw new Error('No tenant context');

  const { fromTs, toTs } = getDateRange(dateRange);

  const { data, error } = await supabase.rpc('get_content_performance_list', {
    p_tenant_id: tenantId,
    p_from_ts: fromTs,
    p_to_ts: toTs,
    p_limit: limit,
  });

  if (error) throw error;
  return data || [];
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side aggregation | Server-side RPCs | Already in place | Better performance, consistent |
| Custom chart DIVs | Recharts | Adding in Phase 10 | Proper heatmap support |
| No inline metrics | Inline + dedicated page | Phase 10 | Better UX per CONTEXT.md |

**Already Current:**
- Supabase RPCs for aggregations
- Date range presets and formatting utilities
- Design-system components (Tabs, Card, StatCard)

## Open Questions

1. **Timezone for heatmap**
   - What we know: DB stores UTC, user likely wants local time
   - What's unclear: Should we detect browser timezone or let user choose?
   - Recommendation: Use browser timezone with option to change

2. **Data retention period**
   - What we know: playback_events will grow indefinitely
   - What's unclear: How long to keep detailed events vs aggregated data
   - Recommendation: Start with 90-day detail retention, no aggregation table for v1 (marked as Claude's discretion)

3. **Performance for large tenants**
   - What we know: Current indexes cover basic queries
   - What's unclear: Performance at scale (1M+ events)
   - Recommendation: Monitor query times, add materialized views if needed

## Sources

### Primary (HIGH confidence)
- `/Users/massimodamico/bizscreen/supabase/migrations/022_playback_analytics.sql` - Playback events schema and RPCs
- `/Users/massimodamico/bizscreen/supabase/migrations/079_playback_analytics.sql` - Scene tracking extension
- `/Users/massimodamico/bizscreen/supabase/migrations/099_enhanced_playback_analytics.sql` - Enhanced metrics
- `/Users/massimodamico/bizscreen/src/services/contentAnalyticsService.js` - Existing analytics service
- `/Users/massimodamico/bizscreen/src/services/playbackTrackingService.js` - Event tracking service
- `/Users/massimodamico/bizscreen/src/pages/AnalyticsPage.jsx` - Existing analytics UI patterns
- `/Users/massimodamico/bizscreen/src/pages/ContentPerformancePage.jsx` - Existing content analytics UI
- `/Users/massimodamico/bizscreen/src/design-system/` - UI components (Tabs, Card, StatCard)

### Secondary (MEDIUM confidence)
- [Recharts GitHub](https://github.com/recharts/recharts) - Chart library documentation
- [LogRocket React Heatmap Guide](https://blog.logrocket.com/best-heatmap-libraries-react/) - Heatmap library comparison

### Tertiary (LOW confidence)
- WebSearch results for React chart libraries 2026 - General ecosystem guidance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Already established in codebase
- Architecture: HIGH - Extending existing patterns
- Database: HIGH - Verified against existing migrations
- UI Components: HIGH - Design-system already has needed components
- Heatmap implementation: MEDIUM - Pure Tailwind CSS approach may be simpler than Recharts
- Performance: MEDIUM - Current approach works, scale untested

**Research date:** 2026-01-24
**Valid until:** 60 days (stable domain, existing patterns)
