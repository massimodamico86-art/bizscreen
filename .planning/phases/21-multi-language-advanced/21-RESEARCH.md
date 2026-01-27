# Phase 21: Multi-Language Advanced - Research

**Researched:** 2026-01-26
**Domain:** Translation workflow management, bulk content dashboards, group language assignment, AI translation
**Confidence:** HIGH

## Summary

This phase builds advanced multi-language features on top of Phase 20's core infrastructure (scene language groups, language variants, device display language, language-aware content resolution). The focus areas are:

1. **Translation Dashboard** - A bulk management interface showing all scenes with their translation status across languages. Users can filter, select, and perform bulk actions like creating variants or changing workflow status.

2. **Group Language Assignment** - Adding a `display_language` column to screen_groups table so devices inherit their language from their group. Language is configured in a dedicated settings tab on the screen group detail page.

3. **Translation Workflow** - A 3-state workflow (draft/review/approved) tracked on scene language variants, with status visible only in the translation dashboard.

4. **AI Translation Suggestions** - On-demand AI translation triggered via button, displaying suggestions in a side panel for user review and application.

**Primary recommendation:** Extend the existing `scenes` table with a `translation_status` column for workflow tracking. Create a `TranslationDashboardPage` following existing dashboard patterns (ScreenGroupsPage, UsageDashboardPage). Use Anthropic Claude via existing API pattern for translation suggestions.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL | 15+ | Database with workflow status enum | Already in use, CHECK constraints for status values |
| Supabase | Current | RPC, RLS, real-time | Already in use, SECURITY DEFINER for bulk operations |
| React | 18.x | UI components | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Anthropic SDK | @anthropic-ai/sdk | AI translation API | Claude API for translation suggestions |
| @/i18n | Local | Language codes/names | Reuse SUPPORTED_LOCALES from i18nConfig |
| @/design-system | Local | UI components | Card, Modal, Button, PageLayout |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom dashboard | DataGrid library | Extra dependency, existing table patterns work fine |
| Anthropic | OpenAI | Anthropic already integrated in codebase, consistent with existing AI features |
| Separate workflow table | Column on scenes | Column simpler, workflow is scene-specific |

**No new dependencies required beyond Anthropic SDK which is already set up.** The existing patterns and infrastructure handle all requirements.

## Architecture Patterns

### Recommended Database Changes

```
scenes (ADD column)
└── translation_status text DEFAULT 'draft' CHECK IN ('draft', 'review', 'approved')

screen_groups (ADD column)
└── display_language text DEFAULT NULL (nullable - NULL means no group-level language)

tv_devices (MODIFY logic)
└── display_language resolution: device.display_language || group.display_language || 'en'
```

### Pattern 1: Translation Dashboard Query
**What:** Aggregate scenes with language variant status
**When to use:** TranslationDashboardPage data loading
**Example:**
```sql
-- Get all scenes with their translation status per language
SELECT
  s.id as original_scene_id,
  s.name,
  g.id as language_group_id,
  array_agg(
    json_build_object(
      'code', v.language_code,
      'status', v.translation_status,
      'variant_id', v.id
    )
  ) as variants,
  COUNT(v.id) as variant_count
FROM scenes s
LEFT JOIN scene_language_groups g ON s.language_group_id = g.id
LEFT JOIN scenes v ON v.language_group_id = g.id AND v.id != s.id
WHERE s.tenant_id = p_tenant_id
  AND (s.language_code IS NULL OR s.language_code = g.default_language)
GROUP BY s.id, s.name, g.id
ORDER BY s.name;
```

### Pattern 2: Group Language Inheritance
**What:** Device language resolution with group fallback
**When to use:** Modify get_resolved_player_content
**Example:**
```sql
-- In get_resolved_player_content, update language resolution:
v_device_language := COALESCE(
  v_device.display_language,
  (SELECT sg.display_language FROM screen_groups sg WHERE sg.id = v_device.screen_group_id),
  'en'
);
```

### Pattern 3: Bulk Status Update RPC
**What:** Update translation_status for multiple variants
**When to use:** Bulk actions from dashboard
**Example:**
```sql
CREATE OR REPLACE FUNCTION bulk_update_translation_status(
  p_scene_ids uuid[],
  p_new_status text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Validate status
  IF p_new_status NOT IN ('draft', 'review', 'approved') THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status;
  END IF;

  UPDATE scenes
  SET translation_status = p_new_status,
      updated_at = now()
  WHERE id = ANY(p_scene_ids)
    AND tenant_id = auth.uid();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
```

### Recommended Project Structure

```
src/
├── pages/
│   └── TranslationDashboardPage.jsx    # NEW: Main dashboard page
├── services/
│   ├── languageService.js              # MODIFY: Add workflow methods
│   └── translationService.js           # NEW: Dashboard-specific queries + AI
├── components/
│   └── translations/
│       ├── TranslationRow.jsx          # NEW: Row component with status columns
│       ├── TranslationFilters.jsx      # NEW: Status + language filters
│       ├── BulkActionsBar.jsx          # NEW: Bulk action toolbar
│       └── AiSuggestionPanel.jsx       # NEW: Side panel for AI suggestions
```

### Anti-Patterns to Avoid
- **Storing status in language_groups:** Status is per-variant, not per-group
- **Auto-generating AI translations:** Per CONTEXT.md, AI is on-demand only
- **Showing workflow status everywhere:** Per CONTEXT.md, only in translation dashboard
- **Device-level language override when in group:** Per CONTEXT.md, strict inheritance

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table UI with selection | Custom table component | ScreenGroupsPage pattern with checkbox labels | Already proven pattern |
| Filter chips | Custom filter UI | Design system FilterChips | Existing component |
| AI API calls | Direct fetch to Claude | assistantService.js pattern with /api route | Auth, error handling, rate limits |
| Status badges | Custom colored spans | Design system Badge or existing pattern | Consistency |
| Bulk selection state | Complex custom state | Simple useState with array of IDs | ScreenGroupsPage pattern works |

**Key insight:** The existing ScreenGroupsPage `AssignScreensModal` has checkbox selection + bulk action pattern that can be adapted for the translation dashboard.

## Common Pitfalls

### Pitfall 1: N+1 Query for Language Variants
**What goes wrong:** Fetching scene list then fetching variants separately for each scene
**Why it happens:** Not aggregating in SQL
**How to avoid:** Use single query with json_agg to get all variants per scene
**Warning signs:** Slow dashboard load, many DB round-trips

### Pitfall 2: Race Condition on Bulk Status Update
**What goes wrong:** User updates status while another operation is in progress
**Why it happens:** No optimistic locking
**How to avoid:** Use transactions, disable UI during save, refresh after bulk operation
**Warning signs:** Stale data displayed, inconsistent statuses

### Pitfall 3: AI Translation Token Limits
**What goes wrong:** Long scene text exceeds AI context window
**Why it happens:** Not chunking or summarizing large content
**How to avoid:** Extract only translatable text elements, limit input size
**Warning signs:** AI API errors, truncated responses

### Pitfall 4: Group Language Not Propagating to Player
**What goes wrong:** Devices in group still use their device-level language
**Why it happens:** COALESCE order wrong in player resolution
**How to avoid:** Test with devices that have NULL display_language and devices in groups
**Warning signs:** Inconsistent language across devices in same group

### Pitfall 5: Orphan Variants on Dashboard
**What goes wrong:** Dashboard shows variants without valid language groups
**Why it happens:** ON DELETE SET NULL from Phase 20 allows orphaned variants
**How to avoid:** Filter for scenes with valid language_group_id, handle edge case in UI
**Warning signs:** Rows with missing group info, null reference errors

## Code Examples

### Database Migration: Add Workflow Status

```sql
-- Add translation_status to scenes
ALTER TABLE scenes
ADD COLUMN IF NOT EXISTS translation_status text NOT NULL DEFAULT 'draft'
CHECK (translation_status IN ('draft', 'review', 'approved'));

-- Add index for dashboard filtering
CREATE INDEX IF NOT EXISTS idx_scenes_translation_status
ON scenes(tenant_id, translation_status)
WHERE language_group_id IS NOT NULL;

-- Add display_language to screen_groups (nullable = no group language)
ALTER TABLE screen_groups
ADD COLUMN IF NOT EXISTS display_language text DEFAULT NULL;

-- Add constraint for valid language
ALTER TABLE screen_groups
ADD CONSTRAINT screen_groups_display_language_valid
CHECK (display_language IS NULL OR is_valid_locale(display_language));

COMMENT ON COLUMN scenes.translation_status IS
'Workflow status for translation variants: draft (editing), review (needs approval), approved (ready for publish)';
COMMENT ON COLUMN screen_groups.display_language IS
'Display language for all devices in this group. NULL means devices use their own language.';
```

### Translation Dashboard Service

```javascript
// translationService.js
import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('TranslationService');

/**
 * Fetch all scenes with their translation variants for dashboard
 * @param {Object} filters - { status, languageCode }
 * @returns {Promise<Array>} Dashboard rows
 */
export async function fetchTranslationDashboard(filters = {}) {
  const { data, error } = await supabase.rpc('get_translation_dashboard', {
    p_status_filter: filters.status || null,
    p_language_filter: filters.languageCode || null,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Bulk update translation status
 * @param {string[]} sceneIds - Array of scene IDs
 * @param {string} newStatus - 'draft' | 'review' | 'approved'
 * @returns {Promise<number>} Count of updated scenes
 */
export async function bulkUpdateStatus(sceneIds, newStatus) {
  logger.debug('Bulk updating translation status', { count: sceneIds.length, newStatus });

  const { data, error } = await supabase.rpc('bulk_update_translation_status', {
    p_scene_ids: sceneIds,
    p_new_status: newStatus,
  });

  if (error) throw error;
  return data;
}

/**
 * Get AI translation suggestion for a scene variant
 * @param {string} sourceSceneId - Scene to translate from
 * @param {string} targetLanguage - Language code to translate to
 * @returns {Promise<Object>} Translation suggestions
 */
export async function getAiTranslationSuggestion(sourceSceneId, targetLanguage) {
  const token = await getAuthToken();

  const response = await fetch('/api/translations/suggest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      sourceSceneId,
      targetLanguage,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get translation suggestion');
  }

  return response.json();
}
```

### RPC: Get Translation Dashboard Data

```sql
CREATE OR REPLACE FUNCTION get_translation_dashboard(
  p_status_filter text DEFAULT NULL,
  p_language_filter text DEFAULT NULL
)
RETURNS TABLE (
  scene_id uuid,
  scene_name text,
  language_group_id uuid,
  default_language text,
  variants jsonb,
  variant_count integer,
  has_incomplete boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH default_scenes AS (
    -- Get scenes that are either standalone or are the default language of their group
    SELECT s.id, s.name, s.language_group_id, s.tenant_id,
           COALESCE(g.default_language, 'en') as default_language
    FROM scenes s
    LEFT JOIN scene_language_groups g ON s.language_group_id = g.id
    WHERE s.tenant_id = auth.uid()
      AND (
        s.language_group_id IS NULL -- Standalone scene
        OR s.language_code = g.default_language -- Default language variant
      )
  ),
  scene_variants AS (
    SELECT
      ds.id as original_id,
      jsonb_agg(
        jsonb_build_object(
          'id', v.id,
          'code', v.language_code,
          'status', v.translation_status,
          'name', v.name
        ) ORDER BY v.language_code
      ) FILTER (WHERE v.id IS NOT NULL) as variants,
      COUNT(v.id)::integer as variant_count,
      bool_or(v.translation_status != 'approved') as has_incomplete
    FROM default_scenes ds
    LEFT JOIN scenes v ON v.language_group_id = ds.language_group_id
    GROUP BY ds.id
  )
  SELECT
    ds.id as scene_id,
    ds.name as scene_name,
    ds.language_group_id,
    ds.default_language,
    COALESCE(sv.variants, '[]'::jsonb) as variants,
    COALESCE(sv.variant_count, 0) as variant_count,
    COALESCE(sv.has_incomplete, false) as has_incomplete
  FROM default_scenes ds
  LEFT JOIN scene_variants sv ON sv.original_id = ds.id
  WHERE (p_status_filter IS NULL OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(sv.variants) v
    WHERE v->>'status' = p_status_filter
  ))
  AND (p_language_filter IS NULL OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(sv.variants) v
    WHERE v->>'code' = p_language_filter
  ))
  ORDER BY ds.name;
END;
$$;
```

### UI: Translation Dashboard Page (Skeleton)

```jsx
// TranslationDashboardPage.jsx
import React, { useState, useEffect } from 'react';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  Button,
  Modal,
} from '../design-system';
import { Globe, Check, Clock, AlertCircle } from 'lucide-react';
import { fetchTranslationDashboard, bulkUpdateStatus } from '../services/translationService';
import { getSupportedLanguages, LANGUAGE_COLORS } from '../services/languageService';
import { useTranslation } from '../i18n';

const STATUS_CONFIG = {
  draft: { label: 'Draft', icon: Clock, color: 'text-gray-500 bg-gray-100' },
  review: { label: 'In Review', icon: AlertCircle, color: 'text-yellow-600 bg-yellow-50' },
  approved: { label: 'Approved', icon: Check, color: 'text-green-600 bg-green-50' },
};

export default function TranslationDashboardPage({ showToast }) {
  const { t } = useTranslation();
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [filters, setFilters] = useState({ status: '', languageCode: '' });
  const [showAiPanel, setShowAiPanel] = useState(false);

  // ... implementation following ScreenGroupsPage patterns
}
```

### AI Translation API Route

```javascript
// api/translations/suggest.js
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sourceSceneId, targetLanguage } = req.body;

  // Get source scene content
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: scene } = await supabase
    .from('scenes')
    .select('name, settings')
    .eq('id', sourceSceneId)
    .single();

  if (!scene) {
    return res.status(404).json({ error: 'Scene not found' });
  }

  // Extract translatable text from scene
  const textsToTranslate = extractTranslatableTexts(scene);

  // Call Claude for translations
  const message = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Translate the following digital signage content to ${targetLanguage}.
Keep the same JSON structure. Preserve any placeholder variables like {{name}}.
Return only valid JSON.

${JSON.stringify(textsToTranslate, null, 2)}`
    }],
  });

  const responseText = message.content[0]?.text || '';
  const translations = JSON.parse(responseText.match(/\{[\s\S]*\}/)?.[0] || '{}');

  return res.status(200).json({
    sourceLanguage: 'en',
    targetLanguage,
    translations,
  });
}

function extractTranslatableTexts(scene) {
  // Extract text blocks, headlines, etc. from scene settings
  // Implementation depends on scene structure
  return {
    name: scene.name,
    // ... other translatable fields
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual translation tracking | Workflow status on variants | Current | Clear visibility of translation progress |
| Device-only language | Group inheritance with device fallback | Current | Easier management at scale |
| No AI assistance | On-demand AI suggestions | Current | Faster translation workflows |

**Deprecated/outdated:**
- No specific deprecated patterns; this is new functionality building on Phase 20

## Open Questions

1. **Text extraction from scenes**
   - What we know: Scenes have settings JSONB with design blocks
   - What's unclear: Exact structure of text elements across different scene types
   - Recommendation: Create extractTranslatableTexts helper based on scene design schema from sceneDesignService.js

2. **Location-to-language mapping**
   - What we know: Per CONTEXT.md, admin sets device location, language auto-maps
   - What's unclear: What mapping to use (country to language? custom lookup table?)
   - Recommendation: Create simple lookup function, can be enhanced later. Default: device location country -> primary language of that country

3. **Permission model for workflow transitions**
   - What we know: Per CONTEXT.md, Claude's discretion based on existing permissions
   - What's unclear: Exact role requirements
   - Recommendation: Follow approval workflow pattern from migration 027 - editors can submit, managers+ can approve

## Sources

### Primary (HIGH confidence)
- Existing codebase: `supabase/migrations/132_multi_language_scenes.sql` - Phase 20 schema
- Existing codebase: `supabase/migrations/133_language_player_integration.sql` - Player resolution
- Existing codebase: `supabase/migrations/027_content_approvals_and_previews.sql` - Workflow pattern
- Existing codebase: `supabase/migrations/026_screen_groups_and_campaigns.sql` - Screen groups schema
- Existing codebase: `src/pages/ScreenGroupsPage.jsx` - Checkbox selection + bulk action pattern
- Existing codebase: `src/services/languageService.js` - Language variant operations
- Existing codebase: `src/services/assistantService.js` - AI API call pattern
- Existing codebase: `_api-disabled/ai/generate-tags.js` - Anthropic SDK usage

### Secondary (MEDIUM confidence)
- Phase 20 decisions: Separate scenes linked by group ID, server-side RPC resolution
- Design system: Card, Modal, Button, PageLayout components available

### Tertiary (LOW confidence)
- Location-to-language mapping specifics need validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing PostgreSQL/Supabase, existing Anthropic integration
- Architecture: HIGH - Extends proven Phase 20 patterns, follows existing dashboard patterns
- Pitfalls: HIGH - Based on common bulk operation issues and codebase-specific patterns
- Code examples: HIGH - Follows existing service/migration patterns exactly

**Research date:** 2026-01-26
**Valid until:** 60 days (stable patterns, no fast-moving dependencies)
