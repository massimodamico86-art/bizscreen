# Phase 19: Templates Intelligence - Research

**Researched:** 2026-01-26
**Domain:** Template suggestions, ratings, and usage analytics
**Confidence:** HIGH

## Summary

Phase 19 adds intelligent features to the template marketplace: personalized suggestions based on user's industry/usage patterns, star ratings for templates, and personal usage analytics displayed as badges. The infrastructure from Phase 18 provides strong foundations:

- **Database infrastructure**: `marketplace_template_favorites`, `marketplace_template_history` tables already track user engagement
- **Service layer**: `marketplaceService.js` has favorites/history functions, `recordMarketplaceUsage()` already called on Quick Apply
- **UI components**: `TemplateSidebar` already has Recents/Favorites sections, `TemplateCard` has heart icon pattern

Key findings:
1. **Industry for suggestions**: No explicit `industry` field on profiles. Must infer from user's scenes (`business_type` column) or fallback to popular templates
2. **Star ratings**: Need to install `@smastrom/react-rating` (1.5.0) - not yet in dependencies despite being planned in STACK.md
3. **Usage analytics**: `marketplace_template_history` already tracks each application - need aggregation RPC for counts

**Primary recommendation:** Add new database tables/RPCs for ratings and suggestion logic, install `@smastrom/react-rating`, extend TemplateSidebar with "Suggested for You" section, add rating UI to TemplatePreviewPanel, display usage badges on TemplateCard.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.1.1 | UI framework | Already in use |
| framer-motion | 12.23.24 | Animations | Already in use for sidebar sections |
| lucide-react | 0.548.0 | Icons (Sparkles, Star) | Project standard |
| Supabase JS | 2.80.0 | Backend API | Already in use |

### New Dependency Required
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @smastrom/react-rating | 1.5.0 | Star rating component | Zero dependencies, 7k+ weekly downloads, ARIA accessible, keyboard navigation |

### Supporting (Already Exists)
| Library/Component | Purpose | When to Use |
|-------------------|---------|-------------|
| TemplateSidebar | Sidebar with sections | Add "Suggested for You" section |
| SidebarRecentsSection | Compact sidebar list | Pattern for suggestions section |
| TemplateCard | Card with heart icon | Add usage badge |
| TemplatePreviewPanel | Template details panel | Add rating interaction |
| marketplaceService | API functions | Extend with ratings/suggestions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @smastrom/react-rating | Custom Lucide stars | Rating library provides accessibility, half-stars, keyboard nav |
| RPC for suggestions | Client-side filtering | RPC is more efficient, keeps logic in DB |
| Usage badge on card | Analytics page | CONTEXT specifies badge on card for lightweight experience |

**Installation:**
```bash
npm install @smastrom/react-rating
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── templates/
│       ├── TemplateSidebar.jsx           # EXTEND with Suggested section
│       ├── SidebarSuggestedSection.jsx   # NEW - suggested templates list
│       ├── TemplateRating.jsx            # NEW - star rating component
│       ├── TemplateCard.jsx              # EXTEND with usage badge
│       ├── TemplatePreviewPanel.jsx      # EXTEND with rating interaction
│       ├── SimilarTemplatesRow.jsx       # NEW - post-apply suggestions
│       └── index.js                      # UPDATE exports
├── services/
│   └── marketplaceService.js             # EXTEND with ratings/suggestions
└── supabase/
    └── migrations/
        └── 131_template_ratings_suggestions.sql # NEW
```

### Pattern 1: Star Rating in Preview Panel
**What:** 5-star rating displayed in TemplatePreviewPanel, user can click to rate
**When to use:** Per CONTEXT - rate from preview panel only
**Example:**
```javascript
// Source: @smastrom/react-rating official documentation
import { Rating } from '@smastrom/react-rating';
import '@smastrom/react-rating/style.css';

function TemplateRating({ templateId, initialRating = 0, averageRating, totalRatings, onRate }) {
  const [userRating, setUserRating] = useState(initialRating);

  const handleChange = async (value) => {
    setUserRating(value);
    await onRate(templateId, value);
  };

  return (
    <div className="space-y-2">
      {/* User's rating (interactive) */}
      <div className="flex items-center gap-2">
        <Rating
          style={{ maxWidth: 120 }}
          value={userRating}
          onChange={handleChange}
          items={5}
        />
        <span className="text-sm text-gray-500">
          {userRating > 0 ? 'Your rating' : 'Rate this template'}
        </span>
      </div>

      {/* Average rating (read-only) */}
      {totalRatings > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Rating
            style={{ maxWidth: 80 }}
            value={averageRating}
            readOnly
          />
          <span>{averageRating.toFixed(1)} ({totalRatings})</span>
        </div>
      )}
    </div>
  );
}
```

### Pattern 2: Suggestion Logic (Industry-Based)
**What:** RPC that suggests templates based on user's scenes' business_type
**When to use:** "Suggested for You" sidebar section, post-apply "Similar Templates"
**Example:**
```sql
-- Source: Custom RPC following existing marketplace patterns
CREATE OR REPLACE FUNCTION get_suggested_templates(p_limit integer DEFAULT 6)
RETURNS TABLE (
  id uuid,
  name text,
  thumbnail_url text,
  industry text,
  suggestion_reason text
)
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_dominant_industry text;
BEGIN
  -- Find user's most common scene business_type
  SELECT business_type INTO v_dominant_industry
  FROM scenes
  WHERE tenant_id = v_user_id AND business_type IS NOT NULL
  GROUP BY business_type
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  RETURN QUERY
  SELECT
    tl.id, tl.name, tl.thumbnail_url, tl.industry,
    CASE
      WHEN tl.industry = v_dominant_industry THEN 'Based on your ' || v_dominant_industry || ' scenes'
      ELSE 'Popular template'
    END as suggestion_reason
  FROM template_library tl
  WHERE tl.is_active = true
    AND (
      v_dominant_industry IS NOT NULL AND tl.industry = v_dominant_industry
      OR v_dominant_industry IS NULL  -- Fallback to popular
    )
    -- Exclude already-applied templates
    AND NOT EXISTS (
      SELECT 1 FROM marketplace_template_history h
      WHERE h.user_id = v_user_id AND h.template_id = tl.id
    )
  ORDER BY
    CASE WHEN tl.industry = v_dominant_industry THEN 0 ELSE 1 END,
    tl.install_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Pattern 3: Usage Badge on TemplateCard
**What:** Small badge showing "Used 5x" on templates the user has applied
**When to use:** Per CONTEXT - display as badge on template card
**Example:**
```javascript
// Extended TemplateCard pattern
function TemplateCard({ template, usageCount = 0, ...props }) {
  return (
    <div className="group relative ...">
      {/* Thumbnail with overlays */}
      <div className="aspect-video relative">
        {/* Usage badge - bottom-left, only show if used */}
        {usageCount > 0 && (
          <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-full bg-gray-900/70 text-white text-xs">
            Used {usageCount}x
          </div>
        )}
        {/* ... rest of card */}
      </div>
    </div>
  );
}
```

### Pattern 4: Post-Apply Similar Templates
**What:** Row of similar templates shown after Quick Apply succeeds
**When to use:** Per CONTEXT - "Similar templates" after Quick Apply action
**Example:**
```javascript
// Show in wizard or as toast-like section after apply
function SimilarTemplatesRow({ categoryId, excludeTemplateId, onTemplateClick }) {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    fetchSimilarTemplates(categoryId, excludeTemplateId)
      .then(setTemplates);
  }, [categoryId, excludeTemplateId]);

  if (templates.length === 0) return null;

  return (
    <div className="mt-4 border-t pt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">
        You might also like
      </h4>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {templates.map(t => (
          <button
            key={t.id}
            onClick={() => onTemplateClick(t)}
            className="flex-shrink-0 w-32"
          >
            <img src={t.thumbnail_url} className="w-full aspect-video object-cover rounded" />
            <p className="text-xs text-gray-600 mt-1 truncate">{t.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Rating prompt after apply:** CONTEXT specifies rate from preview panel only
- **Global popularity data display:** CONTEXT specifies personal usage stats only
- **Blocking suggestions fetch:** Suggestions should not delay marketplace load
- **Complex recommendation algorithm:** Keep it simple - industry match + popularity fallback

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Star rating UI | Custom SVG stars | @smastrom/react-rating | Accessibility, keyboard nav, half-stars |
| Rating storage | JSON in template metadata | Separate ratings table | Indexing, aggregation, per-user tracking |
| Average calculation | Client-side | PostgreSQL aggregate | Efficient, consistent |
| Industry inference | Complex ML | Simple scene business_type query | Good enough, no overhead |
| Usage counting | Client-side counting | RPC with COUNT | Accurate, deduplicated |

**Key insight:** The existing `marketplace_template_history` table already tracks every template application. Usage analytics is an aggregation query, not a new tracking system.

## Common Pitfalls

### Pitfall 1: Rating Without Authentication
**What goes wrong:** Anonymous users try to rate, causing errors or inconsistent state
**Why it happens:** Rating UI shown without checking auth state
**How to avoid:** Check `auth.uid()` in RPC, hide rating UI for unauthenticated users
**Warning signs:** Console errors on rating click, ratings not persisting

### Pitfall 2: Stale Suggestions After Apply
**What goes wrong:** User applies a template but it still shows in suggestions
**Why it happens:** Suggestions not refreshed after template application
**How to avoid:** Either refetch suggestions after apply or filter client-side
**Warning signs:** Same template appearing in suggestions after being used

### Pitfall 3: Rating Race Condition
**What goes wrong:** User clicks stars rapidly, multiple ratings saved
**Why it happens:** No debounce on rating change
**How to avoid:** Debounce rating changes (300ms), optimistic UI update
**Warning signs:** Multiple database rows for same user+template, flickering stars

### Pitfall 4: Missing Industry Fallback
**What goes wrong:** New users with no scenes get empty suggestions
**Why it happens:** No fallback when user has no scenes to infer industry from
**How to avoid:** Per CONTEXT - fallback to popular templates when no industry
**Warning signs:** Empty "Suggested for You" section for new users

### Pitfall 5: Usage Count N+1 Query
**What goes wrong:** Fetching usage counts individually for each template in grid
**Why it happens:** Not batching the usage count query
**How to avoid:** RPC that returns templates with usage counts, or batch query
**Warning signs:** Slow grid load, many database queries per page

### Pitfall 6: CSS Not Imported for Rating
**What goes wrong:** Rating component renders but looks broken (unstyled)
**Why it happens:** Forgot to import `@smastrom/react-rating/style.css`
**How to avoid:** Import CSS once in main.jsx or App.jsx
**Warning signs:** Stars don't show, component is invisible or misaligned

## Code Examples

Verified patterns from official sources:

### @smastrom/react-rating Basic Usage
```javascript
// Source: https://github.com/smastrom/react-rating
import { Rating } from '@smastrom/react-rating';
import '@smastrom/react-rating/style.css'; // Import once in main.jsx

// Interactive rating
function InteractiveRating() {
  const [rating, setRating] = useState(0);
  return (
    <Rating
      style={{ maxWidth: 150 }}
      value={rating}
      onChange={setRating}
      items={5}
    />
  );
}

// Read-only rating display
function DisplayRating({ value }) {
  return (
    <Rating
      style={{ maxWidth: 100 }}
      value={value}
      readOnly
    />
  );
}
```

### Database Tables for Ratings
```sql
-- Template ratings table
CREATE TABLE IF NOT EXISTS marketplace_template_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES template_library(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_template_ratings_unique UNIQUE (user_id, template_id)
);

-- RLS
ALTER TABLE marketplace_template_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ratings_select" ON marketplace_template_ratings
  FOR SELECT USING (true);  -- Everyone can see ratings

CREATE POLICY "ratings_insert" ON marketplace_template_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ratings_update" ON marketplace_template_ratings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "ratings_delete" ON marketplace_template_ratings
  FOR DELETE USING (auth.uid() = user_id);
```

### RPC: Upsert Rating
```sql
-- Upsert rating (create or update)
CREATE OR REPLACE FUNCTION upsert_template_rating(
  p_template_id uuid,
  p_rating integer
)
RETURNS TABLE (
  average_rating numeric,
  total_ratings bigint,
  user_rating integer
)
AS $$
BEGIN
  -- Validate rating
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  -- Upsert the rating
  INSERT INTO marketplace_template_ratings (user_id, template_id, rating)
  VALUES (auth.uid(), p_template_id, p_rating)
  ON CONFLICT (user_id, template_id) DO UPDATE
    SET rating = p_rating, updated_at = now();

  -- Return updated stats
  RETURN QUERY
  SELECT
    ROUND(AVG(r.rating)::numeric, 1) as average_rating,
    COUNT(*)::bigint as total_ratings,
    (SELECT rating FROM marketplace_template_ratings WHERE user_id = auth.uid() AND template_id = p_template_id) as user_rating
  FROM marketplace_template_ratings r
  WHERE r.template_id = p_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### RPC: Get Template Rating Stats
```sql
-- Get rating stats for a template (including user's rating if exists)
CREATE OR REPLACE FUNCTION get_template_rating_stats(p_template_id uuid)
RETURNS TABLE (
  average_rating numeric,
  total_ratings bigint,
  user_rating integer
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) as average_rating,
    COUNT(r.id)::bigint as total_ratings,
    (
      SELECT rating FROM marketplace_template_ratings
      WHERE user_id = auth.uid() AND template_id = p_template_id
    ) as user_rating
  FROM marketplace_template_ratings r
  WHERE r.template_id = p_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### RPC: Get Usage Counts for Templates
```sql
-- Get personal usage counts for a list of templates
CREATE OR REPLACE FUNCTION get_template_usage_counts(p_template_ids uuid[])
RETURNS TABLE (
  template_id uuid,
  usage_count bigint
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.template_id,
    COUNT(*)::bigint as usage_count
  FROM marketplace_template_history h
  WHERE h.user_id = auth.uid()
    AND h.template_id = ANY(p_template_ids)
  GROUP BY h.template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Service Layer Extensions
```javascript
// Add to marketplaceService.js

/**
 * Submit or update a template rating
 * @param {string} templateId - Template UUID
 * @param {number} rating - Rating 1-5
 * @returns {Promise<{averageRating: number, totalRatings: number, userRating: number}>}
 */
export async function rateTemplate(templateId, rating) {
  const { data, error } = await supabase.rpc('upsert_template_rating', {
    p_template_id: templateId,
    p_rating: rating,
  });
  if (error) throw error;
  return data?.[0] || { averageRating: 0, totalRatings: 0, userRating: rating };
}

/**
 * Get rating stats for a template
 * @param {string} templateId - Template UUID
 * @returns {Promise<{averageRating: number, totalRatings: number, userRating: number|null}>}
 */
export async function getTemplateRatingStats(templateId) {
  const { data, error } = await supabase.rpc('get_template_rating_stats', {
    p_template_id: templateId,
  });
  if (error) throw error;
  return data?.[0] || { averageRating: 0, totalRatings: 0, userRating: null };
}

/**
 * Fetch suggested templates for current user
 * @param {number} [limit=6] - Max results
 * @returns {Promise<Array>} Suggested templates with reason
 */
export async function fetchSuggestedTemplates(limit = 6) {
  const { data, error } = await supabase.rpc('get_suggested_templates', {
    p_limit: limit,
  });
  if (error) throw error;
  return data || [];
}

/**
 * Fetch similar templates (same category)
 * @param {string} categoryId - Category UUID
 * @param {string} excludeTemplateId - Template to exclude
 * @param {number} [limit=4] - Max results
 * @returns {Promise<Array>} Similar templates
 */
export async function fetchSimilarTemplates(categoryId, excludeTemplateId, limit = 4) {
  const { data, error } = await supabase
    .from('template_library')
    .select('id, name, thumbnail_url, category_id')
    .eq('category_id', categoryId)
    .neq('id', excludeTemplateId)
    .eq('is_active', true)
    .order('install_count', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/**
 * Batch get usage counts for templates
 * @param {string[]} templateIds - Array of template UUIDs
 * @returns {Promise<Map<string, number>>} Map of templateId -> usageCount
 */
export async function getTemplateUsageCounts(templateIds) {
  if (!templateIds.length) return new Map();

  const { data, error } = await supabase.rpc('get_template_usage_counts', {
    p_template_ids: templateIds,
  });
  if (error) throw error;

  const counts = new Map();
  (data || []).forEach(row => counts.set(row.template_id, row.usage_count));
  return counts;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No suggestions | Industry-based suggestions | Phase 19 | Personalized discovery |
| No ratings | Star ratings with @smastrom/react-rating | Phase 19 | Community feedback |
| No usage tracking display | Usage badges on cards | Phase 19 | Personal analytics |
| History table exists | Aggregate usage counts | Phase 19 | Leverage existing data |

**Existing infrastructure to leverage:**
- `marketplace_template_history`: Already tracks every application
- `recordMarketplaceUsage()`: Already called on Quick Apply
- `template_library.industry`: Already indexed, matches scene `business_type`
- `template_library.install_count`: Global popularity for fallback

## Open Questions

Things that couldn't be fully resolved (Claude's Discretion per CONTEXT):

1. **Number of templates to suggest**
   - What we know: Sidebar should be compact, post-apply is secondary
   - What's unclear: Exact count for sidebar vs post-apply
   - Recommendation: 6 in sidebar section, 4 in post-apply row

2. **Suggestion refresh behavior**
   - What we know: Suggestions should update after template application
   - What's unclear: Auto vs on-demand refresh
   - Recommendation: Refetch on marketplace mount, filter client-side after apply

3. **Rating visibility**
   - What we know: User can rate and see average
   - What's unclear: Show individual raters?
   - Recommendation: Anonymous aggregate only (no "John rated 5 stars")

4. **Whether usage badge appears on unused templates**
   - What we know: Shows "Used 5x" on applied templates
   - What's unclear: Show nothing or "New" on unused?
   - Recommendation: Only show badge when usage > 0, no "New" badge

5. **Exclude already-applied from suggestions**
   - What we know: Makes suggestions more useful
   - What's unclear: Always exclude or sometimes include?
   - Recommendation: Exclude from sidebar suggestions, include in "Similar" post-apply

## Sources

### Primary (HIGH confidence)
- [@smastrom/react-rating npm](https://www.npmjs.com/package/@smastrom/react-rating) - Installation, CSS import
- [@smastrom/react-rating GitHub](https://github.com/smastrom/react-rating) - API reference, accessibility
- `/Users/massimodamico/bizscreen/supabase/migrations/129_marketplace_favorites_history.sql` - Existing history table
- `/Users/massimodamico/bizscreen/supabase/migrations/080_template_marketplace.sql` - Template library schema
- `/Users/massimodamico/bizscreen/src/services/marketplaceService.js` - Existing service functions
- `/Users/massimodamico/bizscreen/src/components/templates/TemplateCard.jsx` - Card pattern
- `/Users/massimodamico/bizscreen/src/components/templates/TemplateSidebar.jsx` - Sidebar pattern
- `/Users/massimodamico/bizscreen/src/components/templates/TemplatePreviewPanel.jsx` - Panel pattern
- `/Users/massimodamico/bizscreen/.planning/phases/19-templates-intelligence/19-CONTEXT.md` - User decisions

### Secondary (MEDIUM confidence)
- `/Users/massimodamico/bizscreen/.planning/research/STACK.md` - Pre-planned @smastrom/react-rating
- `/Users/massimodamico/bizscreen/src/components/templates/SidebarRecentsSection.jsx` - Section pattern

### Tertiary (LOW confidence)
- None - all findings verified from codebase or official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - @smastrom/react-rating verified from npm/GitHub, existing patterns from codebase
- Architecture: HIGH - Clear patterns from existing sidebar/card components, CONTEXT provides direction
- Pitfalls: HIGH - Based on existing code patterns and rating library docs

**Research date:** 2026-01-26
**Valid until:** 60 days (stable infrastructure, clear CONTEXT decisions)
