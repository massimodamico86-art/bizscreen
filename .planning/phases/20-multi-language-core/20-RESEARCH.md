# Phase 20: Multi-Language Core - Research

**Researched:** 2026-01-26
**Domain:** Content localization, multi-language database design, device language assignment
**Confidence:** HIGH

## Summary

This phase implements multi-language support for digital signage content. The core requirement is enabling language variants of scenes (not translations of UI text - that's already handled by i18n). Users create language-specific versions of their content, devices are assigned a display language, and the system gracefully falls back to English when translations are missing.

The codebase already has robust internationalization infrastructure for UI text (i18n config, locale service, language switcher), but content localization (scenes displayed on TVs) requires a different architecture. The standard approach for content localization uses a "linked variants via group ID" pattern - separate records connected by a common identifier, rather than embedded translations within a single record.

**Primary recommendation:** Use a `scene_language_groups` table to link scene variants, add a `language_code` column to scenes, and add a `display_language` column to `tv_devices`. The player content resolution function handles fallback logic server-side.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL | 15+ | Database with JSONB, CTEs | Already in use, excellent for relational + JSON hybrid |
| Supabase | Current | API, RLS, RPC functions | Already in use, SECURITY DEFINER for resolution logic |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @/i18n | Local | Language codes/names | Already exists, reuse `SUPPORTED_LOCALES` |
| date-fns | 3.x | Date formatting by locale | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Linked variants | JSONB embedded translations | Embedded = harder to query, can't share slides, doesn't scale for complex content |
| Separate variant table | Column-per-language | Requires schema changes per language, poor scaling |

**No new dependencies required.** This phase leverages existing database and i18n infrastructure.

## Architecture Patterns

### Recommended Data Model: Linked Variants

The "separate scenes linked by group ID" approach is recommended (per CONTEXT.md Claude's Discretion). This pattern:
- Creates a new scene record for each language variant
- Links them via a `language_group_id` foreign key to `scene_language_groups`
- Each scene has a `language_code` column
- Slides, layouts, playlists remain attached to each scene independently

```
scene_language_groups (NEW)
├── id (uuid PK)
├── tenant_id (FK -> profiles)
├── default_language (text, e.g., 'en')
├── created_at
└── updated_at

scenes (EXISTING - add columns)
├── language_group_id (FK -> scene_language_groups, nullable)
├── language_code (text, e.g., 'en', 'es', nullable)
└── ... existing columns

tv_devices (EXISTING - add column)
└── display_language (text, default 'en')
```

### Pattern: Language-Aware Content Resolution

```sql
-- Pseudocode for player content resolution with language
1. Get device display_language
2. Get scene's language_group_id
3. If scene has language_group_id:
   a. Look for variant matching device language
   b. If not found, get default_language variant
   c. If not found, use original scene
4. Return scene data
```

### Pattern: Variant Creation Flow

```javascript
// Create language variant
async function createLanguageVariant(originalSceneId, languageCode) {
  // 1. Get original scene
  const original = await fetchScene(originalSceneId);

  // 2. Ensure language group exists
  let groupId = original.language_group_id;
  if (!groupId) {
    // Create group, set original as default
    groupId = await createLanguageGroup(original.tenant_id, original.language_code || 'en');
    await updateScene(originalSceneId, { language_group_id: groupId });
  }

  // 3. Create new scene with same group
  const variant = await createScene({
    ...original,
    id: undefined, // new ID
    name: `${original.name} (${languageCode.toUpperCase()})`,
    language_group_id: groupId,
    language_code: languageCode,
    // Per CONTEXT.md - copy original content as starting point
    settings: original.settings,
  });

  // 4. Copy slides (start with same content, user edits)
  await copySlides(originalSceneId, variant.id);

  return variant;
}
```

### Recommended Project Structure

```
src/
├── services/
│   ├── sceneService.js         # Add variant methods
│   └── languageService.js      # NEW: language variant logic
├── components/
│   ├── scenes/
│   │   └── LanguageBadges.jsx  # NEW: [EN] [ES] chips
│   └── scene-editor/
│       └── LanguageSwitcher.jsx # NEW: dropdown in editor
└── pages/
    └── SceneEditorPage.jsx     # Add language dropdown
```

### Anti-Patterns to Avoid
- **Embedding translations in JSONB:** Harder to query, manage, and scale. Each language variant should be a first-class scene record.
- **Per-language columns on scenes:** Schema changes for each language addition is unmaintainable.
- **Client-side language resolution:** Always resolve on server via RPC to ensure fallback logic is consistent and performant.
- **Blocking saves for missing translations:** Per requirements, fallback to default - never show blank screens.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Language code validation | Custom regex | `is_valid_locale` from migration 041 | Already validates en/es/pt/it/fr/de |
| Supported languages list | Hardcoded array | `SUPPORTED_LOCALES` from i18nConfig | Single source of truth, has names/native names |
| Badge/chip styling | Custom CSS | Design system `<Badge>` | Consistent with existing UI |
| Dropdown component | Custom select | Design system `<Select>` or existing pattern | Already used in LanguageSwitcher.jsx |

**Key insight:** The existing i18nConfig.js has the language list, localeService.js has validation - reuse these for content language selection too.

## Common Pitfalls

### Pitfall 1: Orphaned Variants
**What goes wrong:** Deleting a scene without cleaning up its language group or sibling variants
**Why it happens:** No cascade delete for language group relationships
**How to avoid:** Use ON DELETE SET NULL for language_group_id, provide "Delete all variants" option
**Warning signs:** Language groups with no scenes, variants referencing deleted originals

### Pitfall 2: Device Language Not Propagating
**What goes wrong:** Device shows default language even after setting display_language
**Why it happens:** Player caches content, doesn't refresh on language change
**How to avoid:** Set `needs_refresh=true` when display_language changes (same pattern as emergency push)
**Warning signs:** Language change takes minutes to appear, inconsistent across devices

### Pitfall 3: Fallback Loop
**What goes wrong:** Infinite recursion when resolving language variants
**Why it happens:** Malformed data - scene references group but group's default scene is missing
**How to avoid:** Validate group integrity on creation, use COALESCE to always return something
**Warning signs:** Timeout errors on player content resolution

### Pitfall 4: Badge Clutter
**What goes wrong:** Cards show 6+ language badges overwhelming the UI
**Why it happens:** Showing all available languages on every card
**How to avoid:** Per CONTEXT.md - show language chips only for available translations on THAT scene
**Warning signs:** Card layout breaks, badges wrap to multiple lines

### Pitfall 5: Unsaved Changes Lost on Language Switch
**What goes wrong:** User edits slide, switches language, loses work
**Why it happens:** Language switch loads different scene without save prompt
**How to avoid:** Check for unsaved changes before switching, prompt to save or discard
**Warning signs:** User reports losing work after switching languages

## Code Examples

### Database Migration: Language Support

```sql
-- Create language groups table
CREATE TABLE IF NOT EXISTS scene_language_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  default_language text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns to scenes
ALTER TABLE scenes
ADD COLUMN IF NOT EXISTS language_group_id uuid REFERENCES scene_language_groups(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS language_code text DEFAULT NULL;

-- Add display_language to devices
ALTER TABLE tv_devices
ADD COLUMN IF NOT EXISTS display_language text NOT NULL DEFAULT 'en';

-- Add constraint for valid language codes (reuse existing function)
ALTER TABLE scenes
ADD CONSTRAINT scenes_language_code_valid
CHECK (language_code IS NULL OR is_valid_locale(language_code));

ALTER TABLE tv_devices
ADD CONSTRAINT tv_devices_display_language_valid
CHECK (is_valid_locale(display_language));

-- Index for efficient variant lookups
CREATE INDEX IF NOT EXISTS idx_scenes_language_group ON scenes(language_group_id) WHERE language_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scenes_language_code ON scenes(language_code) WHERE language_code IS NOT NULL;
```

### RPC: Get Scene with Language Resolution

```sql
CREATE OR REPLACE FUNCTION get_scene_for_device_language(
  p_scene_id uuid,
  p_device_language text DEFAULT 'en'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scene RECORD;
  v_variant_id uuid;
BEGIN
  -- Get the requested scene
  SELECT id, language_group_id, language_code
  INTO v_scene
  FROM scenes
  WHERE id = p_scene_id;

  -- If no language group, return as-is
  IF v_scene.language_group_id IS NULL THEN
    RETURN p_scene_id;
  END IF;

  -- Try to find variant matching device language
  SELECT id INTO v_variant_id
  FROM scenes
  WHERE language_group_id = v_scene.language_group_id
    AND language_code = p_device_language
  LIMIT 1;

  IF v_variant_id IS NOT NULL THEN
    RETURN v_variant_id;
  END IF;

  -- Fallback: get default language variant
  SELECT s.id INTO v_variant_id
  FROM scenes s
  JOIN scene_language_groups g ON s.language_group_id = g.id
  WHERE s.language_group_id = v_scene.language_group_id
    AND s.language_code = g.default_language
  LIMIT 1;

  -- Ultimate fallback: return original scene
  RETURN COALESCE(v_variant_id, p_scene_id);
END;
$$;
```

### UI: Language Badge Component

```jsx
// LanguageBadges.jsx
import { Badge } from '../../design-system';

const LANGUAGE_COLORS = {
  en: 'bg-blue-50 text-blue-700',
  es: 'bg-orange-50 text-orange-700',
  fr: 'bg-purple-50 text-purple-700',
  de: 'bg-green-50 text-green-700',
  pt: 'bg-amber-50 text-amber-700',
  it: 'bg-red-50 text-red-700',
};

export function LanguageBadges({ languages, showDefault = true }) {
  if (!languages || languages.length === 0) return null;

  // Per CONTEXT.md: hide badge when only default language exists
  if (languages.length === 1 && languages[0] === 'en' && !showDefault) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {languages.map((code) => (
        <span
          key={code}
          className={`
            inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded
            ${LANGUAGE_COLORS[code] || 'bg-gray-100 text-gray-700'}
          `}
        >
          {code.toUpperCase()}
        </span>
      ))}
    </div>
  );
}
```

### UI: Editor Language Dropdown

```jsx
// In SceneEditorPage.jsx - top bar
function EditorLanguageSelector({
  currentLanguage,
  availableLanguages,
  onLanguageChange,
  hasUnsavedChanges,
  onSaveRequest
}) {
  const handleChange = async (newLang) => {
    if (hasUnsavedChanges) {
      const proceed = await confirmDiscard();
      if (!proceed) return;
    }
    onLanguageChange(newLang);
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-gray-400" />
      <select
        value={currentLanguage}
        onChange={(e) => handleChange(e.target.value)}
        className="text-sm border-gray-300 rounded-md"
      >
        {availableLanguages.map(({ code, nativeName }) => (
          <option key={code} value={code}>
            {nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### Service: Fetch Variants for Scene

```javascript
// languageService.js
import { supabase } from '../supabase';
import { SUPPORTED_LOCALES } from '../i18n/i18nConfig';

export async function fetchLanguageVariants(sceneId) {
  // Get scene with its language group
  const { data: scene, error } = await supabase
    .from('scenes')
    .select('id, language_group_id, language_code')
    .eq('id', sceneId)
    .single();

  if (error || !scene.language_group_id) {
    return [{
      id: sceneId,
      language_code: scene?.language_code || 'en',
      is_default: true
    }];
  }

  // Get all variants in the group
  const { data: variants } = await supabase
    .from('scenes')
    .select('id, name, language_code')
    .eq('language_group_id', scene.language_group_id)
    .order('language_code');

  return variants || [];
}

export async function getAvailableLanguagesForScene(sceneId) {
  const variants = await fetchLanguageVariants(sceneId);
  return variants.map(v => v.language_code);
}

export function getLanguageDisplayName(code) {
  const locale = SUPPORTED_LOCALES.find(l => l.code === code);
  return locale?.nativeName || code.toUpperCase();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Column-per-language | Separate records with group link | 2020+ | Scales to unlimited languages |
| Client-side fallback | Server-side RPC resolution | Best practice | Consistent behavior, single source |
| Embedded JSON translations | First-class language variants | Best practice | Queryable, manageable, independent |

**Deprecated/outdated:**
- **Column-per-language (title_en, title_es):** Requires schema changes, doesn't scale
- **Client picks language:** Inconsistent fallback, player complexity

## Open Questions

1. **Initial variant content - Copy or Blank?**
   - Per CONTEXT.md: Claude's discretion
   - Recommendation: **Copy original** - users expect to start with existing content and translate, not rebuild from scratch
   - This matches typical translation workflows

2. **Dropdown display format**
   - Per CONTEXT.md: Claude's discretion between flag+name, code+name, or name only
   - Recommendation: **Native name only** (e.g., "Espanol", "Deutsch") - most compact, self-evident
   - Follows existing LanguageSwitcher.jsx pattern

3. **Badge visibility for single-language scenes**
   - Per CONTEXT.md: Claude's discretion
   - Recommendation: **Hide badge when only default language** - reduces visual clutter
   - Show badges only when scene has 2+ language variants

## Sources

### Primary (HIGH confidence)
- Existing codebase: `supabase/migrations/041_internationalization_locale_preferences.sql` - locale validation
- Existing codebase: `src/i18n/i18nConfig.js` - SUPPORTED_LOCALES list
- Existing codebase: `src/services/sceneService.js` - scene CRUD patterns
- Existing codebase: `src/services/localeService.js` - locale preference management
- Existing codebase: `supabase/migrations/069_scene_slides_and_design_json.sql` - scene/slides data model

### Secondary (MEDIUM confidence)
- [Vertabelo/Redgate Multi-Language Database Design](https://www.red-gate.com/blog/multi-language-database-design/) - Universal translation subschema pattern
- [GeeksforGeeks Multi-Language Database Design](https://www.geeksforgeeks.org/dbms/how-to-design-a-database-for-multi-language-data/) - Design approaches comparison
- [Medium: Best Database Design for Multi-Language](https://medium.com/kocsistem/what-is-the-best-database-design-for-multi-language-data-b21982dd7265) - Pros/cons analysis

### Tertiary (LOW confidence)
- General digital signage multi-language patterns from WebSearch - validated against codebase patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing PostgreSQL/Supabase, no new dependencies
- Architecture: HIGH - Linked variants is industry standard, matches existing scene patterns
- Pitfalls: HIGH - Based on common i18n issues and codebase-specific patterns (needs_refresh, etc.)
- Code examples: HIGH - Follows existing service/migration patterns exactly

**Research date:** 2026-01-26
**Valid until:** 60 days (stable patterns, no fast-moving dependencies)
