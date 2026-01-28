# Phase 26: Analytics Completion - Research

**Researched:** 2026-01-28
**Domain:** Analytics tracking for template usage and campaign rotation weights
**Confidence:** HIGH

## Summary

This phase closes two specific analytics gaps: (1) recording template usage when starter pack templates are applied during onboarding, and (2) enforcing campaign rotation weights in the player content resolution RPC.

The codebase already has established patterns for both concerns. Template usage tracking exists via `recordTemplateUsage` in `templateService.js` which inserts into `user_template_history`. The `installTemplateAsScene` function in `marketplaceService.js` already calls `recordMarketplaceUsage` (line 221), but `StarterPackOnboarding` doesn't call this. Campaign rotation weights exist in `campaign_contents.weight` (migration 026) and `campaign_contents.rotation_mode` (migration 128), but `get_resolved_player_content` doesn't implement weighted selection.

**Primary recommendation:** Wire existing tracking to StarterPackOnboarding, add weighted random selection logic to get_resolved_player_content RPC.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase RPC | - | Server-side weighted selection | Already used for content resolution |
| PostgreSQL random() | - | Weighted random selection | Native, no dependencies |
| user_template_history table | - | Template usage storage | Existing table (migration 112) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| marketplaceService.js | - | recordMarketplaceUsage function | For marketplace template tracking |
| templateService.js | - | recordTemplateUsage function | For content_templates tracking |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| user_template_history | New dedicated starter_pack_usage table | Reuse existing table - simpler |
| PostgreSQL random() | Application-level selection | Server-side is authoritative, offline-safe |
| Weighted random per request | Pre-computed sequence | Simpler, stateless, proven pattern |

**Installation:**
No new packages required - all infrastructure exists.

## Architecture Patterns

### Recommended Approach

```
ANLY-01: Template Usage Tracking
├── StarterPackOnboarding.jsx
│   └── handleApplySelected() - ADD tracking call after installTemplateAsScene
│       └── Call recordMarketplaceUsage(templateId) for each template
│
ANLY-02: Campaign Rotation Weights
└── get_resolved_player_content RPC (migration 135+)
    └── Add campaign content resolution step
        ├── Query campaign_contents with weights
        ├── Implement weighted random selection
        └── Return selected content
```

### Pattern 1: Template Usage Recording (Existing Pattern)

**What:** Record template application in user_template_history table
**When to use:** Every time a template is applied (marketplace or starter pack)
**Example:**
```javascript
// Source: /src/services/marketplaceService.js:220-226
export async function installTemplateAsScene(templateId, sceneName = null) {
  const { data, error } = await supabase.rpc('clone_template_to_scene', { ... });
  if (error) throw error;

  // Record usage for recents tracking (non-blocking)
  recordMarketplaceUsage(templateId).catch((err) => {
    logger.warn('Failed to record template usage', { templateId, error: err.message });
  });

  return data;
}
```

### Pattern 2: Weighted Random Selection in PostgreSQL

**What:** Select content item based on weight probability
**When to use:** Campaign has multiple content items with weights
**Example:**
```sql
-- Weighted random selection algorithm
-- Given items with weights [A:3, B:1, C:1], total=5
-- A has 60% chance, B has 20% chance, C has 20% chance

WITH weighted AS (
  SELECT
    content_type,
    content_id,
    weight,
    SUM(weight) OVER (ORDER BY position) as cumulative_weight,
    SUM(weight) OVER () as total_weight
  FROM campaign_contents
  WHERE campaign_id = p_campaign_id
),
random_point AS (
  SELECT random() * (SELECT total_weight FROM weighted LIMIT 1) as point
)
SELECT content_type, content_id
FROM weighted, random_point
WHERE cumulative_weight > point
ORDER BY cumulative_weight
LIMIT 1;
```

### Anti-Patterns to Avoid

- **Client-side weighted selection:** Weight enforcement must be server-side in RPC for offline player consistency
- **Blocking analytics calls:** Template usage recording should be non-blocking (fire-and-forget with error logging)
- **Storing selection state:** Stateless weighted random per request - don't track "last selected"
- **Modifying existing user_template_history schema:** Extend with new columns if needed, don't create parallel tables

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Template usage tracking | Custom analytics table | user_template_history + marketplace_template_history | Already exists, has RLS, has dedup RPC |
| Weighted random | JS Math.random() in player | PostgreSQL random() in RPC | Server-side authority, offline consistency |
| Usage aggregation | Custom SQL | Existing get_template_usage_counts RPC | Already handles multi-template queries |

**Key insight:** The analytics infrastructure exists. This phase is about wiring existing systems together, not building new ones.

## Common Pitfalls

### Pitfall 1: Template ID Mismatch

**What goes wrong:** StarterPackOnboarding uses `template_library` templates, but `recordTemplateUsage` in templateService.js expects `content_templates` IDs
**Why it happens:** Two template systems exist - marketplace (template_library) and content templates (content_templates)
**How to avoid:** Use `recordMarketplaceUsage` from marketplaceService.js, not `recordTemplateUsage` from templateService.js
**Warning signs:** Foreign key violations, template not found errors

### Pitfall 2: Blocking the Apply Flow

**What goes wrong:** Analytics failure blocks template application
**Why it happens:** Awaiting analytics call without error handling
**How to avoid:** Use fire-and-forget pattern: `.catch(err => logger.warn(...))`
**Warning signs:** User sees error modal when analytics DB is slow/down

### Pitfall 3: Campaign Resolution Priority

**What goes wrong:** Campaign content returned when scene/schedule should take priority
**Why it happens:** Inserting campaign resolution in wrong position in priority chain
**How to avoid:** Current resolution order: Emergency > Device Scene > Group Scene > Scheduled Scene > Legacy Schedule > Layout > Playlist. Campaign should fit within existing schedule/scene resolution, not as a new top-level step
**Warning signs:** Content unexpectedly overridden by campaigns

### Pitfall 4: Zero/Null Weight Handling

**What goes wrong:** Division by zero or null weight breaks selection
**Why it happens:** campaign_contents.weight defaults to 1, but could be explicitly set to 0 or null
**How to avoid:** COALESCE(weight, 1) and filter WHERE weight > 0
**Warning signs:** SQL errors or infinite loops in selection

### Pitfall 5: Single Item Optimization

**What goes wrong:** Running weighted selection on single-item campaigns
**Why it happens:** Overhead of weighted selection when only one option exists
**How to avoid:** If COUNT(*) = 1, return that item directly without random selection
**Warning signs:** Unnecessary computation, slower response times

## Code Examples

### ANLY-01: Wire Template Usage in StarterPackOnboarding

```javascript
// Source: Pattern from marketplaceService.js
// Location: src/components/onboarding/StarterPackOnboarding.jsx

import { recordMarketplaceUsage } from '../../services/marketplaceService';

// In handleApplySelected, after installTemplateAsScene:
const handleApplySelected = async (pack, selectedTemplates) => {
  // ... existing code ...

  for (const template of selectedTemplates) {
    await installTemplateAsScene(template.id);

    // Record template usage (non-blocking, fire-and-forget)
    recordMarketplaceUsage(template.id).catch((err) => {
      console.warn('Failed to record template usage:', template.id, err.message);
    });
  }

  // ... existing code ...
};
```

### ANLY-02: Weighted Selection in get_resolved_player_content

```sql
-- Add to get_resolved_player_content RPC
-- Insert this logic where campaign content needs resolution

-- Helper function for weighted random selection
CREATE OR REPLACE FUNCTION public.select_weighted_campaign_content(p_campaign_id UUID)
RETURNS TABLE(content_type TEXT, content_id UUID) AS $$
DECLARE
  v_count INTEGER;
  v_selected_id UUID;
  v_selected_type TEXT;
BEGIN
  -- Count items
  SELECT COUNT(*) INTO v_count
  FROM campaign_contents
  WHERE campaign_id = p_campaign_id
    AND COALESCE(weight, 1) > 0;

  -- Single item: return directly
  IF v_count = 1 THEN
    SELECT cc.content_type, cc.content_id
    INTO v_selected_type, v_selected_id
    FROM campaign_contents cc
    WHERE cc.campaign_id = p_campaign_id
      AND COALESCE(cc.weight, 1) > 0
    LIMIT 1;

    RETURN QUERY SELECT v_selected_type, v_selected_id;
    RETURN;
  END IF;

  -- Multiple items: weighted random selection
  RETURN QUERY
  WITH weighted AS (
    SELECT
      cc.content_type,
      cc.content_id,
      COALESCE(cc.weight, 1) as weight,
      SUM(COALESCE(cc.weight, 1)) OVER (ORDER BY cc.position) as cumulative,
      SUM(COALESCE(cc.weight, 1)) OVER () as total
    FROM campaign_contents cc
    WHERE cc.campaign_id = p_campaign_id
      AND COALESCE(cc.weight, 1) > 0
  ),
  rnd AS (
    SELECT random() * (SELECT MAX(total) FROM weighted) as point
  )
  SELECT w.content_type, w.content_id
  FROM weighted w, rnd r
  WHERE w.cumulative > r.point
  ORDER BY w.cumulative
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;
```

### Usage Tracking Data Model (Existing)

```sql
-- From migration 112
-- user_template_history - for content_templates
CREATE TABLE IF NOT EXISTS public.user_template_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.content_templates(id) ON DELETE CASCADE NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- marketplace_template_history - for template_library
-- (Similar structure, different FK target)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No starter pack tracking | Reuse marketplace_template_history | Phase 26 | Unified analytics |
| Client-side content selection | Server-side weighted RPC | Phase 26 | Offline consistency |

**Deprecated/outdated:**
- None - this is new functionality

## Open Questions

1. **Where does campaign resolution fit in priority chain?**
   - What we know: Current chain is Emergency > Scene > Schedule > Layout > Playlist
   - What's unclear: Whether campaigns are a new resolution step or modify existing schedule behavior
   - Recommendation: Review how campaigns are currently triggered (via schedule entries or direct assignment). Based on migration 026, campaigns have campaign_targets that map to screens/groups. The resolution may need to check if a campaign is active for this screen before the playlist fallback.

2. **Should customization extent (modified yes/no) be tracked?**
   - What we know: CONTEXT.md mentions capturing customization extent as boolean
   - What's unclear: Whether marketplace_template_history needs schema update
   - Recommendation: Check if existing schema supports this or if new column needed. Can defer to future if not critical.

3. **Rotation mode interaction with weighted selection**
   - What we know: campaign_contents has rotation_mode (weight, percentage, sequence, random)
   - What's unclear: Full implementation of all four modes
   - Recommendation: Start with 'weight' mode (default). Other modes can be added incrementally.

## Sources

### Primary (HIGH confidence)
- `/Users/massimodamico/bizscreen/src/services/marketplaceService.js` - recordMarketplaceUsage pattern
- `/Users/massimodamico/bizscreen/src/services/templateService.js` - recordTemplateUsage pattern
- `/Users/massimodamico/bizscreen/supabase/migrations/112_template_favorites_history.sql` - user_template_history schema
- `/Users/massimodamico/bizscreen/supabase/migrations/026_screen_groups_and_campaigns.sql` - campaign_contents schema with weight
- `/Users/massimodamico/bizscreen/supabase/migrations/128_rotation_frequency_limits.sql` - rotation_mode column
- `/Users/massimodamico/bizscreen/supabase/migrations/135_group_language_inheritance.sql` - current get_resolved_player_content

### Secondary (MEDIUM confidence)
- `/Users/massimodamico/bizscreen/src/components/onboarding/StarterPackOnboarding.jsx` - current onboarding flow
- `/Users/massimodamico/bizscreen/.planning/phases/26-analytics-completion/26-CONTEXT.md` - user decisions

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - codebase examination shows existing patterns
- Architecture: HIGH - clear pattern from marketplaceService.js
- Pitfalls: HIGH - identified from code review and schema analysis

**Research date:** 2026-01-28
**Valid until:** 2026-02-27 (30 days - stable domain)

## Implementation Notes

### ANLY-01 Tasks
1. Import `recordMarketplaceUsage` in StarterPackOnboarding.jsx
2. Add non-blocking call after each `installTemplateAsScene` in handleApplySelected
3. Test that template_library templates are recorded correctly

### ANLY-02 Tasks
1. Create `select_weighted_campaign_content` helper function
2. Modify `get_resolved_player_content` to call weighted selection when campaign content is involved
3. Handle edge cases: single item, zero weight, null weight
4. Test weighted distribution matches expected probabilities
5. Ensure offline player caches work correctly with weighted content

### Verification Approach
- ANLY-01: Apply starter pack, query marketplace_template_history for new rows
- ANLY-02: Create campaign with weighted content, call RPC multiple times, verify distribution approximates weights
