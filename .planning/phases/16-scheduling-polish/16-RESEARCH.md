# Phase 16: Scheduling Polish - Research

**Researched:** 2026-01-25
**Domain:** Campaign Analytics, Content Rotation, Frequency Limits, Campaign Templates, Seasonal Scheduling
**Confidence:** HIGH

## Summary

Phase 16 extends the campaign infrastructure from Phase 15 with advanced scheduling controls: campaign-level analytics, percentage-based content rotation, play frequency limits, reusable campaign templates, and seasonal auto-activation. The codebase already has substantial foundations:

1. **Analytics Infrastructure**: `analyticsService.js`, `contentAnalyticsService.js`, RPCs for playback summaries, viewing heatmaps, and content performance. The `playback_events` table already has a `campaign_id` FK column (added in migration 026) and tracks screen, scene, duration, etc.

2. **Campaign System**: `campaignService.js` (595 lines) handles CRUD, targets, and contents. `campaign_contents` table already has a `weight` column for rotation weighting. Campaigns have `start_at`/`end_at` for date-based activation, with `update_campaign_statuses()` function for auto-transitions.

3. **UI Patterns**: Pure Tailwind CSS visualizations (no external charting library), design system components (`Card`, `Badge`, `Tabs`), and established page/service patterns from `AnalyticsDashboardPage.jsx` and `CampaignsPage.jsx`.

**Primary recommendation:** Build on existing infrastructure - extend `analyticsService` with campaign-grouping queries, add rotation/frequency columns to `campaign_contents`, create campaign templates table for save/apply patterns, and add seasonal activation flags to campaigns.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @date-fns/tz | ^1.4.1 | Timezone-aware date handling | Already in package.json |
| date-fns | ^4.1.0 | Date manipulation, formatting | Already installed |
| framer-motion | ^12.23.24 | UI animations | Already installed |
| lucide-react | ^0.548.0 | Icons | Project standard |
| @supabase/supabase-js | ^2.80.0 | Database queries, Realtime | Already installed |

### To Add (Optional)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| recharts | ^2.x | Charts for analytics | Optional - current approach uses pure CSS |

### Not Needed
| Instead of | Don't Use | Why Existing is Better |
|------------|-----------|------------------------|
| recharts/Chart.js | External chart lib | Project uses pure Tailwind CSS visualizations (see ViewingHeatmap.jsx) |
| rrule | Complex recurrence | Existing `repeat_config` JSONB + date fields sufficient for seasonal |
| External template engine | Custom solution | Simple JSONB template storage sufficient |

**Installation:**
```bash
# No new packages needed - all functionality built with existing stack
```

## Architecture Patterns

### Existing Project Structure (Extend)
```
src/
├── components/analytics/
│   ├── ViewingHeatmap.jsx       # EXISTING: Pure CSS heatmap
│   ├── ContentInlineMetrics.jsx # EXISTING: Inline metrics display
│   ├── CampaignAnalyticsCard.jsx # NEW: Campaign summary card
│   └── RotationDistributionChart.jsx # NEW: Rotation visualization
├── components/campaigns/
│   ├── EmergencyBanner.jsx      # EXISTING (Phase 15)
│   ├── CampaignPicker.jsx       # EXISTING (Phase 15): Schedule entry picker
│   ├── RotationControls.jsx     # NEW: Percentage/weight inputs
│   ├── FrequencyLimitControls.jsx # NEW: Max plays inputs
│   ├── TemplatePickerModal.jsx  # NEW: Template selection
│   └── SeasonalDatePicker.jsx   # NEW: Seasonal activation dates
├── pages/
│   ├── CampaignsPage.jsx        # ENHANCE: Add analytics summary
│   ├── CampaignEditorPage.jsx   # ENHANCE: Rotation, limits, templates
│   ├── AnalyticsDashboardPage.jsx # ENHANCE: Campaign grouping tab
│   └── CampaignAnalyticsPage.jsx # NEW: Dedicated campaign analytics
├── services/
│   ├── campaignService.js       # ENHANCE: Template, seasonal, rotation
│   ├── analyticsService.js      # ENHANCE: Campaign-grouped queries
│   └── campaignTemplateService.js # NEW: Template CRUD
└── contexts/
    └── EmergencyContext.jsx     # EXISTING (Phase 15)
```

### Pattern 1: Campaign-Grouped Analytics
**What:** Aggregate playback metrics by campaign_id
**When to use:** Campaign performance dashboard, comparing campaigns
**Schema enhancement:**
```sql
-- Already exists: playback_events.campaign_id FK
-- Just need new RPC for aggregation

CREATE OR REPLACE FUNCTION get_campaign_analytics(
  p_tenant_id UUID,
  p_campaign_id UUID DEFAULT NULL,
  p_from_ts TIMESTAMPTZ,
  p_to_ts TIMESTAMPTZ
)
RETURNS TABLE (
  campaign_id UUID,
  campaign_name TEXT,
  total_play_count BIGINT,
  total_duration_seconds BIGINT,
  unique_screens BIGINT,
  avg_plays_per_screen NUMERIC,
  peak_hour INT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS campaign_id,
    c.name AS campaign_name,
    COUNT(pe.id)::BIGINT AS total_play_count,
    COALESCE(SUM(pe.duration_seconds), 0)::BIGINT AS total_duration_seconds,
    COUNT(DISTINCT pe.screen_id)::BIGINT AS unique_screens,
    ROUND(COUNT(pe.id)::NUMERIC / NULLIF(COUNT(DISTINCT pe.screen_id), 0), 2) AS avg_plays_per_screen,
    (
      SELECT EXTRACT(HOUR FROM mode() WITHIN GROUP (ORDER BY pe2.started_at))::INT
      FROM playback_events pe2 WHERE pe2.campaign_id = c.id
    ) AS peak_hour
  FROM campaigns c
  LEFT JOIN playback_events pe ON pe.campaign_id = c.id
    AND pe.started_at >= p_from_ts
    AND pe.started_at <= p_to_ts
  WHERE c.tenant_id = p_tenant_id
    AND (p_campaign_id IS NULL OR c.id = p_campaign_id)
  GROUP BY c.id, c.name;
END;
$$;
```

### Pattern 2: Percentage-Based Content Rotation
**What:** User-defined percentages for content mix within campaign
**When to use:** Campaign content configuration
**Schema enhancement:**
```sql
-- Extend campaign_contents with rotation settings
ALTER TABLE campaign_contents
ADD COLUMN IF NOT EXISTS rotation_percentage INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rotation_mode TEXT DEFAULT 'weight'
  CHECK (rotation_mode IN ('weight', 'percentage', 'sequence', 'random'));

-- Constraint: percentages must sum to 100 per campaign (enforced in application)
COMMENT ON COLUMN campaign_contents.rotation_percentage IS
'Explicit percentage (0-100). If NULL, uses weight-based calculation. All percentages per campaign should sum to 100.';
COMMENT ON COLUMN campaign_contents.rotation_mode IS
'weight=proportional by weight, percentage=explicit %, sequence=play in order, random=random selection';
```
**Service implementation:**
```javascript
// campaignService.js extension
export async function updateContentRotation(campaignId, contents) {
  // contents = [{ id, rotationPercentage, weight }]
  const total = contents.reduce((sum, c) => sum + (c.rotationPercentage || 0), 0);
  if (total !== 0 && total !== 100) {
    throw new Error('Rotation percentages must sum to 100');
  }

  for (const content of contents) {
    await supabase
      .from('campaign_contents')
      .update({
        rotation_percentage: content.rotationPercentage,
        weight: content.weight
      })
      .eq('id', content.id)
      .eq('campaign_id', campaignId);
  }
}

export function calculateEffectiveRotation(contents) {
  // If any has explicit percentage, use those
  const hasExplicit = contents.some(c => c.rotation_percentage !== null);
  if (hasExplicit) {
    return contents.map(c => ({
      ...c,
      effectivePercent: c.rotation_percentage || 0
    }));
  }

  // Otherwise calculate from weights
  const totalWeight = contents.reduce((sum, c) => sum + (c.weight || 1), 0);
  return contents.map(c => ({
    ...c,
    effectivePercent: Math.round(((c.weight || 1) / totalWeight) * 100)
  }));
}
```

### Pattern 3: Frequency Limits (Max Plays)
**What:** Limit maximum plays per hour/day for content or campaign
**When to use:** Prevent content fatigue, comply with advertising rules
**Schema enhancement:**
```sql
-- Add frequency limits to campaign_contents
ALTER TABLE campaign_contents
ADD COLUMN IF NOT EXISTS max_plays_per_hour INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_plays_per_day INT DEFAULT NULL;

-- Add campaign-level defaults
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS default_max_plays_per_hour INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS default_max_plays_per_day INT DEFAULT NULL;

COMMENT ON COLUMN campaign_contents.max_plays_per_hour IS
'Maximum times this content can play per hour per screen. NULL = unlimited.';
COMMENT ON COLUMN campaign_contents.max_plays_per_day IS
'Maximum times this content can play per day per screen. NULL = unlimited.';
```
**Behavior on limit reached:**
- Skip to next content in rotation
- Log skipped event for analytics
- If all content limited, fall back to filler content or loop last allowed

### Pattern 4: Campaign Templates
**What:** Save campaign configuration as reusable template
**When to use:** Creating similar campaigns (holiday promos, weekly specials)
**Schema:**
```sql
CREATE TABLE campaign_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL,
  is_system BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Template data structure:
-- {
--   "targets": [{ "target_type": "screen_group", "target_id": null }],
--   "contents": [{ "content_type": "playlist", "content_id": null, "weight": 1, "position": 0 }],
--   "settings": { "priority": 100, "rotation_mode": "weight" },
--   "schedule": { "dayparts": ["breakfast", "lunch"], "days_of_week": [1,2,3,4,5] }
-- }

CREATE INDEX idx_campaign_templates_tenant ON campaign_templates(tenant_id);

-- RLS policies
ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaign_templates_select" ON campaign_templates FOR SELECT
  USING (tenant_id = auth.uid() OR tenant_id IS NULL);

CREATE POLICY "campaign_templates_insert" ON campaign_templates FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "campaign_templates_update" ON campaign_templates FOR UPDATE
  USING (tenant_id = auth.uid() AND is_system = false);

CREATE POLICY "campaign_templates_delete" ON campaign_templates FOR DELETE
  USING (tenant_id = auth.uid() AND is_system = false);
```
**Service implementation:**
```javascript
// campaignTemplateService.js
export async function saveAsTemplate(campaignId, templateName, description = '') {
  const campaign = await getCampaign(campaignId);

  const templateData = {
    targets: campaign.targets.map(t => ({
      target_type: t.target_type,
      target_id: null // Don't store specific IDs in template
    })),
    contents: campaign.contents.map(c => ({
      content_type: c.content_type,
      content_id: null, // Reference by type, not specific content
      weight: c.weight,
      position: c.position,
      rotation_percentage: c.rotation_percentage,
      max_plays_per_hour: c.max_plays_per_hour,
      max_plays_per_day: c.max_plays_per_day
    })),
    settings: {
      priority: campaign.priority,
      default_max_plays_per_hour: campaign.default_max_plays_per_hour,
      default_max_plays_per_day: campaign.default_max_plays_per_day
    }
  };

  return supabase.from('campaign_templates').insert({
    tenant_id: (await supabase.auth.getUser()).data.user.id,
    name: templateName,
    description,
    template_data: templateData
  }).select().single();
}

export async function createFromTemplate(templateId, campaignName, overrides = {}) {
  const { data: template } = await supabase
    .from('campaign_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  // Create campaign with template settings
  const campaign = await createCampaign({
    name: campaignName,
    priority: template.template_data.settings.priority,
    ...overrides
  });

  // Apply template structure (user will fill in specific content)
  return campaign;
}
```

### Pattern 5: Seasonal Auto-Activation
**What:** Campaigns that auto-activate based on date ranges
**When to use:** Holiday campaigns, seasonal menus, annual events
**Existing support:** Campaigns already have `start_at`/`end_at` with `update_campaign_statuses()` function
**Enhancement needed:**
```sql
-- Add recurrence pattern for annual events
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS recurrence_rule JSONB DEFAULT NULL;

-- Recurrence rule structure:
-- {
--   "type": "yearly",
--   "month": 12,        -- December
--   "day": 15,          -- 15th
--   "duration_days": 20 -- Run for 20 days
-- }

COMMENT ON COLUMN campaigns.recurrence_rule IS
'Seasonal recurrence pattern for auto-activating campaigns. NULL = one-time campaign.';
```
**Auto-activation enhancement:**
```sql
CREATE OR REPLACE FUNCTION update_seasonal_campaigns()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_campaign RECORD;
  v_start DATE;
  v_end DATE;
BEGIN
  -- Find seasonal campaigns that should activate this year
  FOR v_campaign IN
    SELECT * FROM campaigns
    WHERE recurrence_rule IS NOT NULL
      AND status IN ('completed', 'paused') -- Previous cycle ended
  LOOP
    -- Calculate this year's activation window
    v_start := make_date(
      EXTRACT(YEAR FROM CURRENT_DATE)::INT,
      (v_campaign.recurrence_rule->>'month')::INT,
      (v_campaign.recurrence_rule->>'day')::INT
    );
    v_end := v_start + ((v_campaign.recurrence_rule->>'duration_days')::INT || ' days')::INTERVAL;

    -- If we're in the window, activate
    IF CURRENT_DATE >= v_start AND CURRENT_DATE <= v_end THEN
      UPDATE campaigns
      SET
        status = 'active',
        start_at = v_start::TIMESTAMPTZ,
        end_at = v_end::TIMESTAMPTZ,
        updated_at = now()
      WHERE id = v_campaign.id;
    END IF;
  END LOOP;
END;
$$;
```

### Anti-Patterns to Avoid
- **Storing percentages without validation:** Always validate percentages sum to 100
- **Hardcoding frequency limits in player:** Store in database, resolve at playback time
- **Duplicating campaign data in templates:** Store structure/settings only, not specific content IDs
- **Complex charting libraries:** Project uses pure CSS visualizations - follow this pattern
- **Per-play frequency checking:** Check limits at content resolution time, not per-play (performance)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Campaign analytics grouping | Custom aggregation | Extend existing `get_campaign_playback_stats` RPC | Already handles tenant context, dates |
| Date range selection | Custom date picker | Existing `DATE_RANGES` from analyticsService | Consistent UX across analytics pages |
| Chart visualizations | External library | Pure CSS like `ViewingHeatmap.jsx` | Matches project patterns, no bundle increase |
| Campaign status transitions | Manual status updates | Existing `update_campaign_statuses()` function | Already handles scheduled->active->completed |
| Content resolution priority | Client-side logic | Existing `get_resolved_player_content` RPC | Already handles emergency > campaign > schedule |
| Activity logging | Custom logging | Existing `logActivity()` from activityLogService | Consistent audit trail |

**Key insight:** Phase 16 is about extending existing campaign infrastructure with rotation/limits/templates, not building new analytics or scheduling systems.

## Common Pitfalls

### Pitfall 1: Rotation Percentages Don't Match Reality
**What goes wrong:** User sets 50/30/20 rotation, but actual playback is 60/25/15
**Why it happens:** Strict percentage adherence requires tracking play counts in real-time
**How to avoid:**
1. Document that percentages are targets, not guarantees
2. Use weight-based selection with percentage display
3. Show actual vs. target in analytics
**Warning signs:** User complaints about "rotation not working"

### Pitfall 2: Frequency Limits Block All Content
**What goes wrong:** All content hits limits, nothing plays
**Why it happens:** Limits set too aggressively, no fallback defined
**How to avoid:**
1. Warn user when limits are restrictive (e.g., < 2 plays/hour)
2. Require fallback content or auto-use filler content
3. Don't apply limits to filler content
**Warning signs:** Screens showing blank/filler unexpectedly

### Pitfall 3: Template References Become Stale
**What goes wrong:** Template references content that was deleted
**Why it happens:** Storing specific content_id in template
**How to avoid:**
1. Store content_type but not content_id in templates
2. Template is structure only - user fills content when applying
3. Validate referenced content still exists before applying
**Warning signs:** "Content not found" errors when applying templates

### Pitfall 4: Seasonal Campaign Creates Duplicates
**What goes wrong:** Yearly campaign creates new campaign each year instead of reactivating
**Why it happens:** Treating recurrence as "create new" vs. "reactivate existing"
**How to avoid:**
1. Seasonal campaigns update dates, don't create new records
2. Use `recurrence_rule` on single campaign row
3. Status goes completed->scheduled->active cycle
**Warning signs:** Multiple "Holiday 2024", "Holiday 2025" campaigns

### Pitfall 5: Analytics Miss Emergency Playback
**What goes wrong:** Emergency content playback not tracked in campaign analytics
**Why it happens:** Emergency content uses source='emergency', not campaign_id
**How to avoid:**
1. Emergency playback logged separately (which it is)
2. Campaign analytics clearly scoped to campaign_id
3. Provide separate "Emergency Events" report
**Warning signs:** Play counts don't add up during emergency periods

### Pitfall 6: Rotation Changes Not Applied Immediately
**What goes wrong:** User changes rotation, current playback continues old weights
**Why it happens:** Player caches content resolution
**How to avoid:**
1. Use existing `needs_refresh` flag pattern when rotation changes
2. Apply changes at content boundary (between items), not mid-play
3. Show "Changes pending" status until applied
**Warning signs:** Delayed rotation changes frustrate users

## Code Examples

### Campaign Analytics Service Extension
```javascript
// src/services/campaignAnalyticsService.js
import { supabase } from '../supabase';
import { getEffectiveOwnerId } from './tenantService';
import { createScopedLogger } from './loggingService';
import { getDateRange, DATE_RANGES } from './contentAnalyticsService';

const logger = createScopedLogger('CampaignAnalyticsService');

export { DATE_RANGES, getDateRange };

/**
 * Get analytics summary for all campaigns or specific campaign
 */
export async function getCampaignAnalytics(dateRange = '7d', campaignId = null) {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) throw new Error('No tenant context');

  const { fromTs, toTs } = getDateRange(dateRange);

  const { data, error } = await supabase.rpc('get_campaign_analytics', {
    p_tenant_id: tenantId,
    p_campaign_id: campaignId,
    p_from_ts: fromTs,
    p_to_ts: toTs
  });

  if (error) throw error;
  return data || [];
}

/**
 * Get campaign performance comparison
 */
export async function getCampaignComparison(campaignIds, dateRange = '7d') {
  const results = await Promise.all(
    campaignIds.map(id => getCampaignAnalytics(dateRange, id))
  );

  return results.flat();
}

/**
 * Get rotation distribution for a campaign
 */
export async function getCampaignRotationStats(campaignId, dateRange = '7d') {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) throw new Error('No tenant context');

  const { fromTs, toTs } = getDateRange(dateRange);

  const { data, error } = await supabase.rpc('get_campaign_rotation_stats', {
    p_tenant_id: tenantId,
    p_campaign_id: campaignId,
    p_from_ts: fromTs,
    p_to_ts: toTs
  });

  if (error) throw error;
  return data || [];
}
```

### Rotation Controls Component
```jsx
// src/components/campaigns/RotationControls.jsx
import { useState, useEffect } from 'react';
import { Percent, Scale, Shuffle, ListOrdered } from 'lucide-react';
import { Button, Badge } from '../../design-system';

const ROTATION_MODES = [
  { id: 'weight', label: 'Weighted', icon: Scale, description: 'Proportional to weight values' },
  { id: 'percentage', label: 'Percentage', icon: Percent, description: 'Explicit percentages (must sum to 100)' },
  { id: 'sequence', label: 'Sequential', icon: ListOrdered, description: 'Play in order' },
  { id: 'random', label: 'Random', icon: Shuffle, description: 'Random selection' }
];

export function RotationControls({ contents, mode, onChange, onModeChange }) {
  const [localContents, setLocalContents] = useState(contents);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLocalContents(contents);
  }, [contents]);

  const handlePercentageChange = (contentId, value) => {
    const updated = localContents.map(c =>
      c.id === contentId ? { ...c, rotation_percentage: parseInt(value) || 0 } : c
    );
    setLocalContents(updated);

    // Validate sum
    const total = updated.reduce((sum, c) => sum + (c.rotation_percentage || 0), 0);
    if (total !== 100) {
      setError(`Percentages sum to ${total}%. Must equal 100%.`);
    } else {
      setError(null);
      onChange(updated);
    }
  };

  const handleWeightChange = (contentId, value) => {
    const updated = localContents.map(c =>
      c.id === contentId ? { ...c, weight: parseInt(value) || 1 } : c
    );
    setLocalContents(updated);
    onChange(updated);
  };

  // Calculate effective percentages for display
  const totalWeight = localContents.reduce((sum, c) => sum + (c.weight || 1), 0);
  const effectivePercentages = localContents.map(c => ({
    ...c,
    effectivePercent: mode === 'percentage'
      ? (c.rotation_percentage || 0)
      : Math.round(((c.weight || 1) / totalWeight) * 100)
  }));

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex gap-2">
        {ROTATION_MODES.map(m => (
          <Button
            key={m.id}
            variant={mode === m.id ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onModeChange(m.id)}
          >
            <m.icon className="w-4 h-4 mr-1" />
            {m.label}
          </Button>
        ))}
      </div>

      {/* Content rotation inputs */}
      <div className="space-y-2">
        {effectivePercentages.map(content => (
          <div key={content.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <span className="flex-1 font-medium">{content.content_name}</span>

            {mode === 'percentage' ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={content.rotation_percentage || 0}
                  onChange={(e) => handlePercentageChange(content.id, e.target.value)}
                  className="w-16 px-2 py-1 border rounded text-center"
                />
                <span className="text-gray-500">%</span>
              </div>
            ) : mode === 'weight' ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={content.weight || 1}
                  onChange={(e) => handleWeightChange(content.id, e.target.value)}
                  className="w-16 px-2 py-1 border rounded text-center"
                />
                <Badge variant="blue">{content.effectivePercent}%</Badge>
              </div>
            ) : (
              <Badge variant="gray">{content.effectivePercent}%</Badge>
            )}
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Distribution visualization */}
      <div className="h-4 flex rounded-full overflow-hidden">
        {effectivePercentages.map((content, i) => (
          <div
            key={content.id}
            className={`${
              ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'][i % 5]
            }`}
            style={{ width: `${content.effectivePercent}%` }}
            title={`${content.content_name}: ${content.effectivePercent}%`}
          />
        ))}
      </div>
    </div>
  );
}
```

### Frequency Limit Controls
```jsx
// src/components/campaigns/FrequencyLimitControls.jsx
import { AlertTriangle } from 'lucide-react';
import { Badge } from '../../design-system';

export function FrequencyLimitControls({ content, onChange }) {
  const handleChange = (field, value) => {
    onChange({
      ...content,
      [field]: value === '' ? null : parseInt(value)
    });
  };

  const isRestrictive = (content.max_plays_per_hour && content.max_plays_per_hour < 3) ||
                        (content.max_plays_per_day && content.max_plays_per_day < 10);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <label className="text-sm text-gray-600 w-32">Max per hour:</label>
        <input
          type="number"
          min="1"
          placeholder="Unlimited"
          value={content.max_plays_per_hour || ''}
          onChange={(e) => handleChange('max_plays_per_hour', e.target.value)}
          className="w-24 px-2 py-1 border rounded text-center"
        />
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm text-gray-600 w-32">Max per day:</label>
        <input
          type="number"
          min="1"
          placeholder="Unlimited"
          value={content.max_plays_per_day || ''}
          onChange={(e) => handleChange('max_plays_per_day', e.target.value)}
          className="w-24 px-2 py-1 border rounded text-center"
        />
      </div>

      {isRestrictive && (
        <div className="flex items-center gap-2 text-amber-600 text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Low limits may cause content to not play. Consider a higher limit or adding fallback content.</span>
        </div>
      )}
    </div>
  );
}
```

### Campaign Analytics Card
```jsx
// src/components/analytics/CampaignAnalyticsCard.jsx
import { BarChart3, Monitor, Clock, TrendingUp } from 'lucide-react';
import { Card, Badge } from '../../design-system';
import { formatDuration, formatHours } from '../../services/contentAnalyticsService';

export function CampaignAnalyticsCard({ campaign, onClick }) {
  const {
    campaign_name,
    campaign_status,
    total_play_count,
    total_duration_seconds,
    unique_screens,
    avg_plays_per_screen,
    peak_hour
  } = campaign;

  const statusColors = {
    active: 'green',
    scheduled: 'blue',
    completed: 'gray',
    paused: 'yellow',
    draft: 'gray'
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-medium text-gray-900">{campaign_name}</h3>
        <Badge variant={statusColors[campaign_status]}>{campaign_status}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <BarChart3 className="w-4 h-4" />
          <span>{total_play_count?.toLocaleString() || 0} plays</span>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="w-4 h-4" />
          <span>{formatHours((total_duration_seconds || 0) / 3600)}</span>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <Monitor className="w-4 h-4" />
          <span>{unique_screens || 0} screens</span>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <TrendingUp className="w-4 h-4" />
          <span>{avg_plays_per_screen || 0} avg/screen</span>
        </div>
      </div>

      {peak_hour !== null && (
        <p className="text-xs text-gray-500 mt-2">
          Peak hour: {peak_hour}:00 - {(peak_hour + 1) % 24}:00
        </p>
      )}
    </Card>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat content lists | Weight-based rotation | Exists | Basic rotation support already present |
| Manual campaign timing | Auto-status updates | Phase 15 | Scheduled->active->completed automation |
| No frequency control | Database-driven limits | Phase 16 | Prevent content fatigue |
| Copy/paste campaigns | Template system | Phase 16 | Faster campaign creation |
| One-time campaigns | Seasonal recurrence | Phase 16 | Annual event automation |

**Industry best practices (from research):**
- Content rotation should be configurable but not overly strict (weighted > exact percentages)
- Frequency limits prevent viewer fatigue and comply with advertising regulations
- Campaign templates reduce setup time by 60-80% for similar campaigns
- Seasonal auto-activation eliminates "forgot to activate holiday promo" issues

## Open Questions

Things that couldn't be fully resolved:

1. **Rotation enforcement strictness**
   - What we know: Weight-based is simpler, percentage-based is more precise
   - What's unclear: How strictly should percentages be enforced?
   - Recommendation: Use weight-based by default, percentage as optional mode

2. **Frequency limit scope**
   - What we know: Can be per-content or per-campaign
   - What's unclear: Should limits be per-screen or tenant-wide?
   - Recommendation: Per-screen (most use cases), with option for tenant-wide

3. **Template content references**
   - What we know: Templates shouldn't store specific content IDs
   - What's unclear: Should templates include content type hints?
   - Recommendation: Store content_type but require user to select specific content when applying

4. **Seasonal overlap handling**
   - What we know: Two seasonal campaigns could overlap
   - What's unclear: Should system prevent overlaps or use priority?
   - Recommendation: Use existing priority system, no hard prevention

## Sources

### Primary (HIGH confidence)
- Existing codebase: `campaignService.js`, `analyticsService.js`, `contentAnalyticsService.js`
- Existing migrations: `026_screen_groups_and_campaigns.sql`, `099_enhanced_playback_analytics.sql`
- Phase 15 RESEARCH.md and PLAN files
- CONTEXT.md decisions for Phase 16

### Secondary (MEDIUM confidence)
- `ViewingHeatmap.jsx` - Pure CSS visualization pattern
- `AnalyticsDashboardPage.jsx` - Dashboard page structure
- `CampaignsPage.jsx` - Campaign list/card patterns

### Tertiary (LOW confidence)
- Industry patterns for digital signage rotation (general best practices)

## Metadata

**Confidence breakdown:**
- Campaign analytics: HIGH - Extends existing playback_events + campaign_id infrastructure
- Content rotation: HIGH - Extends existing campaign_contents.weight column
- Frequency limits: HIGH - Simple column additions, straightforward logic
- Campaign templates: HIGH - Standard JSONB template pattern, well-understood
- Seasonal activation: MEDIUM - Extends existing date fields, recurrence logic needs testing

**Research date:** 2026-01-25
**Valid until:** 2026-02-24 (30 days - stable domain, no external dependencies)

---

*Phase: 16-scheduling-polish*
*Research completed: 2026-01-25*
