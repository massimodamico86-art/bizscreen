---
phase: 21
plan: 01
subsystem: multi-language
tags: [database, translation, workflow, services]

dependency_graph:
  requires:
    - 20-01 (scene_language_groups table, language_code column)
    - 20-04 (get_scene_for_device_language RPC)
  provides:
    - translation_status column on scenes
    - display_language and location on screen_groups
    - get_translation_dashboard RPC
    - bulk_update_translation_status RPC
    - translationService.js
    - LOCATION_LANGUAGE_MAP in languageService
  affects:
    - 21-02 (dashboard UI will use these services)
    - 21-03 (group language inheritance uses display_language)
    - 21-04 (settings UI uses location mapping)

tech_stack:
  added: []
  patterns:
    - SECURITY DEFINER RPCs with auth.uid() for tenant filtering
    - Service layer with scoped logging pattern
    - Constant exports for UI color mapping

key_files:
  created:
    - supabase/migrations/134_translation_workflow.sql
    - src/services/translationService.js
  modified:
    - src/services/languageService.js

decisions:
  - name: Standalone scenes in dashboard
    choice: Include with empty variants array when no language filter
    rationale: Users need to see all content, not just multi-language scenes
  - name: Status validation in RPC
    choice: RAISE EXCEPTION for invalid status
    rationale: Fail fast, clear error message for debugging
  - name: Location map coverage
    choice: 20+ countries with English fallback
    rationale: Cover major markets, default to English for unmapped regions

metrics:
  tasks: 3
  duration: 3min
  completed: 2026-01-26
---

# Phase 21 Plan 01: Translation Workflow Schema Summary

Database schema and service layer for translation workflow tracking, group-level language assignment, and dashboard operations with SECURITY DEFINER RPCs.

## What Was Built

### 1. Database Migration (134_translation_workflow.sql)

**Scenes Table:**
- `translation_status` column with CHECK constraint (draft/review/approved)
- Partial index on tenant_id + status for dashboard queries

**Screen Groups Table:**
- `display_language` column for group-level language override
- `location` column for region-based auto-assignment

**RPCs:**
- `get_translation_dashboard(p_status_filter, p_language_filter)` - Returns scenes with aggregated variant info
- `bulk_update_translation_status(p_scene_ids, p_new_status)` - Atomic batch updates

### 2. Translation Service (translationService.js)

```javascript
// Dashboard queries
fetchTranslationDashboard({ status, languageCode })

// Bulk operations
bulkUpdateStatus(sceneIds, newStatus)

// Single scene
updateSceneStatus(sceneId, newStatus)

// Constants
TRANSLATION_STATUSES, STATUS_LABELS, STATUS_COLORS
```

### 3. Language Service Extensions

```javascript
// Location mapping
LOCATION_LANGUAGE_MAP  // 20+ country codes to language codes
getLanguageForLocation(locationCode)  // Returns language or 'en' default
getAvailableLocations()  // Returns [{code, name}] with localized names
```

## Key Implementation Details

### Dashboard RPC Logic

1. Groups scenes by `language_group_id` using CTE
2. Aggregates variants into JSONB array with id, code, status, name
3. Calculates `has_incomplete` using `bool_or(status != 'approved')`
4. Includes standalone scenes (no language group) with empty variants array
5. Filters by status match in any variant, or language code match

### Location Mapping

Countries mapped to their primary language:
- English: US, GB, CA, AU, NZ, IE
- Spanish: ES, MX, AR, CO, CL, PE
- French: FR, BE
- German: DE, AT, CH
- Portuguese: PT, BR
- Other: IT, JP, CN, TW, HK, KR, NL, PL, RU

Default fallback: English (en)

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| 77b979c | feat(21-01): add translation workflow schema |
| b822dd3 | feat(21-01): create translationService with dashboard methods |
| 7902892 | feat(21-01): add location-to-language mapping to languageService |

## Next Phase Readiness

**21-02 (Translation Dashboard UI):**
- Services ready: fetchTranslationDashboard, bulkUpdateStatus
- Status colors available: STATUS_COLORS constant

**21-03 (Group Language Inheritance):**
- Schema ready: display_language on screen_groups
- Location mapping: getLanguageForLocation for auto-assignment

**21-04 (Group Settings UI):**
- Location dropdown: getAvailableLocations with localized names
- Language dropdown: Uses existing getSupportedLanguages
