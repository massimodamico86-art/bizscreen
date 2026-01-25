# Architecture Research: BizScreen v2 Features

**Project:** BizScreen v2 Features
**Researched:** 2026-01-24
**Focus:** Templates marketplace, multi-language content, advanced scheduling

## Summary

This research analyzes how three new features integrate with BizScreen's existing architecture. The existing codebase provides strong foundations: a template marketplace schema already exists (migration 080), basic i18n for UI exists but not for content, and the scheduling system supports scene-based scheduling. The key architectural decisions center on:

1. **Templates Marketplace:** Extend existing `template_library` tables with community features, ratings, and enhanced discovery
2. **Multi-Language Content:** Add translation layer to scenes/slides without duplicating content, using a translation table pattern
3. **Advanced Scheduling:** Extend schedule_entries with campaigns, date ranges, and priority-based content rotation

**Recommended build order:** Advanced Scheduling first (extends existing), then Templates Marketplace (enhances existing), then Multi-Language (new pattern requiring more testing).

---

## Templates Marketplace Architecture

### Current State

The codebase already has substantial template infrastructure:

**Existing Database Tables:**
- `template_library` - Global templates with license tiers (free/pro/enterprise)
- `template_library_slides` - Slide designs for templates
- `template_enterprise_access` - Whitelist for enterprise templates
- `template_categories` - Categories (retail, restaurant, corporate, etc.)
- `content_templates` / `content_template_blueprints` - Older template system for packs

**Existing Functions:**
- `clone_template_to_scene()` - Installs template as user's scene
- `can_access_template()` - License-based access check
- `get_marketplace_templates()` - Filtered template listing

**Existing Service:**
- `marketplaceService.js` - Full CRUD, install, admin functions

### New Components Needed

**Frontend:**
| Component | Location | Purpose |
|-----------|----------|---------|
| `MarketplacePage.jsx` | `src/pages/` | Template browsing with filters |
| `TemplateDetailModal.jsx` | `src/components/marketplace/` | Preview, install, rating |
| `TemplateCard.jsx` | `src/components/marketplace/` | Card in grid view |
| `CategorySidebar.jsx` | `src/components/marketplace/` | Category navigation |
| `TemplatePreviewPlayer.jsx` | `src/components/marketplace/` | Live preview of template |
| `RatingStars.jsx` | `src/components/ui/` | Rating display/input |
| `SubmitTemplateModal.jsx` | `src/components/marketplace/` | User template submission |

**Services:**
| Service | Changes | Purpose |
|---------|---------|---------|
| `marketplaceService.js` | Extend | Add ratings, reviews, submission |
| `templateSubmissionService.js` | New | Handle user-submitted templates |

### Database Schema Additions

```sql
-- Template ratings and reviews
CREATE TABLE template_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES template_library(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  is_verified_install boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, user_id) -- One review per user per template
);

-- User template submissions (pending approval)
CREATE TABLE template_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES template_categories(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_notes text,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add average rating to template_library
ALTER TABLE template_library
ADD COLUMN IF NOT EXISTS avg_rating numeric(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;
```

### Integration Points

| Existing Component | Integration |
|-------------------|-------------|
| `scenes` table | Source for user template submissions |
| `scene_slides` table | Copied to `template_library_slides` on approval |
| Scene Editor | "Save as Template" button triggers submission |
| Dashboard | "Popular Templates" widget |
| Navigation | New "Templates" menu item |

### Data Flow

**Template Discovery:**
```
User -> MarketplacePage -> marketplaceService.fetchMarketplaceTemplates()
     -> Supabase RPC get_marketplace_templates() -> template_library + joins
     <- Templates with can_access, rating, category
```

**Template Installation:**
```
User clicks Install -> marketplaceService.installTemplateAsScene()
     -> Supabase RPC clone_template_to_scene()
     <- New scene_id
     -> Navigate to /scenes/{scene_id}/edit
```

**Template Submission:**
```
User in Scene Editor -> "Submit as Template" -> SubmitTemplateModal
     -> templateSubmissionService.submitScene()
     -> INSERT template_submissions (status: pending)
     <- Await admin review
```

**Admin Approval:**
```
Admin reviews submission -> approveSubmission()
     -> Copy scene/slides to template_library/template_library_slides
     -> UPDATE template_submissions (status: approved)
     <- Template live in marketplace
```

---

## Multi-Language Architecture

### Current State

**UI Internationalization:**
- `src/i18n/` with `I18nContext`, `useTranslation` hook
- 6 locales: en, es, pt, it, fr, de
- JSON translation files for UI strings

**Database:**
- `profiles.preferred_locale` - User UI preference
- `profiles.tenant_default_locale` - Tenant default
- `get_user_effective_locale()` RPC

**Gap:** No content translation infrastructure. Scenes, slides, playlists have hardcoded text with no multi-language support.

### Pattern Decision

**Recommended: Translation Table Pattern**

Rather than duplicating entire scenes for each language, store translations separately:

```
scene_slides (original content)
    |
scene_slide_translations (per-locale overrides)
```

This pattern:
- Avoids content duplication
- Allows partial translation (fallback to default)
- Enables translation workflow (pending, approved)
- Works with existing scene editing workflow

### New Components Needed

**Frontend:**
| Component | Location | Purpose |
|-----------|----------|---------|
| `TranslationPanel.jsx` | `src/components/scene-editor/` | Side panel for locale switching |
| `LocaleSwitcher.jsx` | `src/components/ui/` | Dropdown to select editing locale |
| `TranslationBadge.jsx` | `src/components/ui/` | Shows translation status |
| `DeviceLanguageSettings.jsx` | `src/components/screens/` | Set device display language |
| `TranslationWorkflowModal.jsx` | `src/components/translation/` | Submit/review translations |

**Services:**
| Service | Purpose |
|---------|---------|
| `translationService.js` | CRUD for content translations |
| `localeService.js` | Locale resolution for devices |

### Database Schema Additions

```sql
-- Scene slide translations
CREATE TABLE scene_slide_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_id uuid NOT NULL REFERENCES scene_slides(id) ON DELETE CASCADE,
  locale text NOT NULL,
  design_json_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Only translated text properties, not full design
  -- e.g., {"blocks.0.props.text": "Bienvenido", "blocks.1.props.text": "Menu"}
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved')),
  translated_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(slide_id, locale)
);

-- Playlist item translations (for text overlays)
CREATE TABLE playlist_item_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES playlist_items(id) ON DELETE CASCADE,
  locale text NOT NULL,
  text_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(item_id, locale)
);

-- Device language preference
ALTER TABLE tv_devices
ADD COLUMN IF NOT EXISTS display_locale text DEFAULT 'en';

-- Screen group language preference (for groups)
ALTER TABLE screen_groups
ADD COLUMN IF NOT EXISTS display_locale text DEFAULT 'en';
```

### Integration Points

| Existing Component | Integration |
|-------------------|-------------|
| Scene Editor | Add locale switcher in toolbar |
| `scene_slides.design_json` | Base design, translations override text only |
| Player content resolution | Merge translations based on device locale |
| `get_scene_with_slides()` | Return translations for device locale |
| Device settings | Add language selection |

### Data Flow

**Content Creation (default language):**
```
User edits slide -> design_json saved normally (no change)
```

**Translation Creation:**
```
User selects locale in editor -> TranslationPanel appears
User edits text blocks -> translationService.saveTranslation()
     -> INSERT/UPDATE scene_slide_translations
     <- Translation saved, badge shows "es: translated"
```

**Player Content Resolution:**
```
Player requests content -> get_resolved_player_content(device_id)
     -> Get device.display_locale or group.display_locale
     -> Fetch scene_slides
     -> Fetch scene_slide_translations WHERE locale = device_locale
     -> Merge: apply translation overrides to design_json
     <- Return merged content
```

**Merge Strategy (Player):**
```javascript
function mergeTranslations(designJson, translations) {
  if (!translations) return designJson;

  const merged = JSON.parse(JSON.stringify(designJson));
  for (const [path, value] of Object.entries(translations)) {
    // path like "blocks.0.props.text"
    setNestedValue(merged, path, value);
  }
  return merged;
}
```

### Offline Considerations

The player's offline cache must include translations:
- Cache all relevant locales when caching scene
- Or cache only device's configured locale
- Recommendation: Cache device locale + fallback (en)

---

## Advanced Scheduling Architecture

### Current State

**Existing Tables:**
- `schedules` - Named schedule containers
- `schedule_entries` - Time/day rules with target_type (playlist/layout/media/scene)
- `tv_devices.assigned_schedule_id` - Device schedule assignment
- `screen_groups.assigned_schedule_id` - Group schedule assignment

**Existing Functions:**
- `resolve_scene_schedule()` - Get active scene for device
- `get_schedule_preview()` - Hour-by-hour preview
- `assign_schedule_to_device()` / `assign_schedule_to_group()`
- `get_resolved_player_content()` - Priority-based content resolution

**Gap:** No campaigns (date ranges), no content rotation, limited priority handling.

### New Components Needed

**Frontend:**
| Component | Location | Purpose |
|-----------|----------|---------|
| `CampaignManager.jsx` | `src/pages/` | Campaign CRUD |
| `CampaignCalendar.jsx` | `src/components/scheduling/` | Visual calendar view |
| `ContentRotationSettings.jsx` | `src/components/scheduling/` | Rotation config UI |
| `ScheduleConflictResolver.jsx` | `src/components/scheduling/` | Handle overlaps |
| `PriorityEditor.jsx` | `src/components/scheduling/` | Drag-to-reorder priorities |
| `DaypartingGrid.jsx` | `src/components/scheduling/` | 7x24 hour grid editor |

**Services:**
| Service | Changes | Purpose |
|---------|---------|---------|
| `scheduleService.js` | Extend | Add campaign support |
| `campaignService.js` | Extend | Add rotation, date range logic |
| `contentRotationService.js` | New | Rotation algorithms |

### Database Schema Additions

```sql
-- Campaigns (date-bounded content pushes)
CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  priority integer DEFAULT 50, -- Higher = takes precedence
  is_active boolean DEFAULT true,
  target_devices uuid[] DEFAULT '{}', -- Specific devices or empty for all
  target_groups uuid[] DEFAULT '{}', -- Specific groups or empty for all
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

-- Campaign entries (content for campaign)
CREATE TABLE campaign_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('scene', 'playlist', 'layout', 'media')),
  target_id uuid NOT NULL,
  -- Time-of-day rules (optional)
  start_time time,
  end_time time,
  days_of_week integer[] DEFAULT '{0,1,2,3,4,5,6}',
  -- Rotation settings
  rotation_weight integer DEFAULT 1, -- For weighted rotation
  rotation_order integer, -- For sequential rotation
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Content rotation state (for sequential rotation)
CREATE TABLE rotation_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES tv_devices(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  last_entry_id uuid REFERENCES campaign_entries(id),
  last_rotated_at timestamptz DEFAULT now(),
  UNIQUE(device_id, campaign_id)
);

-- Add date range to schedule_entries (extend existing)
ALTER TABLE schedule_entries
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date,
ADD COLUMN IF NOT EXISTS rotation_mode text DEFAULT 'none'
  CHECK (rotation_mode IN ('none', 'sequential', 'weighted', 'random'));
```

### Priority Resolution Logic

**Extended Priority Order (in get_resolved_player_content):**

1. **Device manual override** (device.active_scene_id) - Highest
2. **Active campaign** (priority-sorted, date-range checked)
3. **Group active scene** (group.active_scene_id)
4. **Device schedule** (schedule_entries by time/day)
5. **Group schedule**
6. **Device fallback** (assigned_layout_id or assigned_playlist_id)

```sql
-- Updated content resolution pseudo-logic
WITH active_campaigns AS (
  SELECT ce.*, c.priority
  FROM campaigns c
  JOIN campaign_entries ce ON ce.campaign_id = c.id
  WHERE c.is_active = true
    AND CURRENT_DATE BETWEEN c.start_date AND c.end_date
    AND (c.target_devices = '{}' OR p_device_id = ANY(c.target_devices))
    AND (c.target_groups = '{}' OR device.screen_group_id = ANY(c.target_groups))
    AND (ce.days_of_week IS NULL OR current_dow = ANY(ce.days_of_week))
    AND (ce.start_time IS NULL OR CURRENT_TIME BETWEEN ce.start_time AND ce.end_time)
  ORDER BY c.priority DESC
)
SELECT * FROM active_campaigns LIMIT 1;
```

### Content Rotation Algorithms

**Sequential Rotation:**
```javascript
function getNextSequentialEntry(deviceId, campaignId, entries) {
  const state = await getRotationState(deviceId, campaignId);
  const currentIndex = state?.lastEntryId
    ? entries.findIndex(e => e.id === state.lastEntryId)
    : -1;
  const nextIndex = (currentIndex + 1) % entries.length;

  await updateRotationState(deviceId, campaignId, entries[nextIndex].id);
  return entries[nextIndex];
}
```

**Weighted Random:**
```javascript
function getWeightedRandomEntry(entries) {
  const totalWeight = entries.reduce((sum, e) => sum + e.rotation_weight, 0);
  let random = Math.random() * totalWeight;

  for (const entry of entries) {
    random -= entry.rotation_weight;
    if (random <= 0) return entry;
  }
  return entries[entries.length - 1];
}
```

### Integration Points

| Existing Component | Integration |
|-------------------|-------------|
| `schedule_entries` | Add date range columns |
| `get_resolved_player_content()` | Insert campaign check before schedule check |
| Schedule Editor UI | Add campaign management tab |
| Dashboard | Show active campaigns widget |
| Device detail | Show active campaign if any |

### Data Flow

**Campaign Content Resolution:**
```
Player polls content -> get_resolved_player_content()
     -> Check device override (skip if none)
     -> Check active campaigns for device/group
        -> Filter by date range, time, day
        -> Sort by priority
        -> Apply rotation if multiple entries
     <- Return campaign content OR continue to schedule
     -> Check schedule (existing logic)
     <- Return content
```

**Campaign Creation:**
```
Admin creates campaign -> campaignService.createCampaign()
     -> INSERT campaigns
     -> INSERT campaign_entries (for each content item)
     <- Campaign ID
     -> Real-time subscription notifies affected devices
```

---

## Build Order

Based on dependencies and existing infrastructure:

### Phase 1: Advanced Scheduling (Lowest Risk)

**Rationale:**
- Extends existing schedule_entries table
- No new patterns, just more fields
- get_resolved_player_content() already has priority logic
- Player already handles schedule-based content

**Sequence:**
1. Add date range columns to schedule_entries
2. Create campaigns and campaign_entries tables
3. Update get_resolved_player_content() with campaign logic
4. Build CampaignManager UI
5. Add rotation algorithms
6. Update player content polling

### Phase 2: Templates Marketplace (Medium Risk)

**Rationale:**
- Core infrastructure exists (template_library, marketplaceService)
- Extends rather than replaces
- Independent of other v2 features

**Sequence:**
1. Add review/rating tables
2. Add submission workflow tables
3. Build MarketplacePage with existing templates
4. Add rating/review UI
5. Build submission workflow
6. Admin approval UI

### Phase 3: Multi-Language Content (Highest Risk)

**Rationale:**
- New architectural pattern (translation overrides)
- Affects core content resolution
- Player offline cache complexity
- Requires most testing

**Sequence:**
1. Add translation tables
2. Build translationService
3. Add device locale settings
4. Update scene editor with locale switching
5. Update get_resolved_player_content() with merge logic
6. Update player offline cache to include translations
7. Extensive testing across locales

---

## Component Boundaries

### Services Layer

```
src/services/
  marketplaceService.js      # Extend with reviews, submissions
  templateSubmissionService.js  # New - submission workflow
  translationService.js      # New - content translation CRUD
  localeService.js           # New - device locale resolution
  scheduleService.js         # Extend with campaign support
  campaignService.js         # Extend with rotation logic
  contentRotationService.js  # New - rotation algorithms
```

### Component Layer

```
src/components/
  marketplace/
    MarketplacePage.jsx
    TemplateCard.jsx
    TemplateDetailModal.jsx
    CategorySidebar.jsx
    TemplatePreviewPlayer.jsx
    SubmitTemplateModal.jsx
    ReviewCard.jsx

  translation/
    TranslationPanel.jsx
    LocaleSwitcher.jsx
    TranslationBadge.jsx
    TranslationWorkflowModal.jsx

  scheduling/
    CampaignManager.jsx
    CampaignCalendar.jsx
    CampaignCard.jsx
    ContentRotationSettings.jsx
    ScheduleConflictResolver.jsx
    PriorityEditor.jsx
    DaypartingGrid.jsx
```

### Database Layer

```
New Tables:
  template_reviews
  template_submissions
  scene_slide_translations
  playlist_item_translations
  campaigns
  campaign_entries
  rotation_state

Modified Tables:
  template_library (avg_rating, review_count)
  tv_devices (display_locale)
  screen_groups (display_locale)
  schedule_entries (start_date, end_date, rotation_mode)
```

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Templates Marketplace | HIGH | Existing infrastructure, clear extension path |
| Multi-Language Content | MEDIUM | New pattern, but follows industry standards. Player merge logic needs careful testing |
| Advanced Scheduling | HIGH | Extends existing schedule system, clear priority model |
| Build Order | HIGH | Based on dependency analysis and risk assessment |
| Database Schema | HIGH | Follows existing patterns (RLS, tenant isolation) |
| Player Integration | MEDIUM | Offline caching for translations needs validation |

---

## Sources

**Industry Research:**
- [MetroClick - Multi-Language Support in Digital Signage](https://www.metroclick.com/digital-signage/software/implementing-multi-language-support-in-digital-signage-software/)
- [NENTO - Digital Signage Scheduling Guide](https://nento.com/a-comprehensive-guide-to-digital-signage-scheduling/)
- [Digital Signage Today - Dayparting](https://www.digitalsignagetoday.com/blogs/keys-to-dayparting-and-digital-signage/)
- [AIScreen - Scheduled Content](https://www.aiscreen.io/digital-signage/scheduled-content/)
- [Contentful - React Localization](https://www.contentful.com/blog/react-localization-internationalization-i18n/)
- [Payload CMS - Localization](https://payloadcms.com/docs/configuration/localization)

**Codebase Analysis:**
- `/Users/massimodamico/bizscreen/supabase/migrations/080_template_marketplace.sql`
- `/Users/massimodamico/bizscreen/supabase/migrations/074_scene_scheduling.sql`
- `/Users/massimodamico/bizscreen/supabase/migrations/041_internationalization_locale_preferences.sql`
- `/Users/massimodamico/bizscreen/src/services/marketplaceService.js`
- `/Users/massimodamico/bizscreen/src/services/scheduleService.js`
- `/Users/massimodamico/bizscreen/src/i18n/i18nConfig.js`
