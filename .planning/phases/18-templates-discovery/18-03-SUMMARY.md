---
phase: 18
plan: 03
subsystem: templates-marketplace
tags: [starter-packs, templates, marketplace, rpc, ui-components]

dependency-graph:
  requires:
    - "Phase 17: Template marketplace infrastructure"
    - "080_template_marketplace.sql: template_library table"
  provides:
    - "Starter packs database schema"
    - "Curated pack browsing and multi-template install"
    - "Expandable pack card with inline template selection"
  affects:
    - "Phase 18-04: Search improvements may filter packs"
    - "Admin: Pack management interface needed"

tech-stack:
  added:
    - None (uses existing framer-motion)
  patterns:
    - "Junction table for pack-template association"
    - "RPC returning aggregated JSON for templates"
    - "Expandable card with inline grid"
    - "Parent callback pattern for template installation"

key-files:
  created:
    - "supabase/migrations/130_starter_packs.sql"
    - "src/components/templates/StarterPackCard.jsx"
    - "src/components/templates/StarterPacksRow.jsx"
  modified:
    - "src/services/marketplaceService.js"
    - "src/components/templates/index.js"
    - "src/pages/TemplateMarketplacePage.jsx"

decisions:
  - id: "18-03-01"
    desc: "Packs use junction table with position for ordering"
  - id: "18-03-02"
    desc: "RPC returns templates as JSONB array within pack row"
  - id: "18-03-03"
    desc: "Expand/collapse via framer-motion AnimatePresence"
  - id: "18-03-04"
    desc: "Sequential template install (not parallel) for simplicity"

metrics:
  duration: "3min"
  completed: "2026-01-26"
---

# Phase 18 Plan 03: Starter Packs Feature Summary

Curated template packs with expandable card UI and multi-select installation.

## What Was Built

### Database Layer (130_starter_packs.sql)
- **starter_packs table**: name, description, thumbnail_url, industry, sort_order, is_active, is_featured
- **starter_pack_templates junction**: pack_id, template_id, position for ordering
- **get_starter_packs RPC**: Returns packs with embedded templates array via JSONB aggregation
- **RLS policies**: Public select for active packs, admin policies for management
- **Sample seed data**: Restaurant Starter and Retail Essentials packs

### Service Layer (marketplaceService.js)
- **fetchStarterPacks()**: Calls get_starter_packs RPC, normalizes templates array

### UI Components
- **StarterPackCard.jsx** (211 lines):
  - Collapsible card header with pack thumbnail/icon, name, description, template count
  - Expand/collapse animation via framer-motion
  - Template grid with checkbox overlays for multi-select
  - Select All / Deselect All toggle
  - "Apply Selected (N)" button with loading state

- **StarterPacksRow.jsx** (56 lines):
  - Section wrapper with "Starter Packs" heading
  - Maps packs to StarterPackCard components
  - Passes applyingPackId for loading state management

### Page Integration (TemplateMarketplacePage.jsx)
- Load starter packs on mount
- StarterPacksRow rendered above FeaturedTemplatesRow
- Both rows hidden when any filter is active
- handleApplyPackTemplates: Sequential install with navigation to last scene

## Key Implementation Details

### Data Flow
```
TemplateMarketplacePage
  -> fetchStarterPacks() on mount
  -> starterPacks state
  -> StarterPacksRow (packs, onApplySelected, applyingPackId)
    -> StarterPackCard (pack, onApplySelected, isApplying)
      -> User expands pack
      -> User selects templates via checkboxes
      -> User clicks "Apply Selected"
      -> onApplySelected(pack, selectedTemplates)
  -> handleApplyPackTemplates
    -> Sequential installTemplateAsScene for each template
    -> Navigate to last created scene
```

### RPC Design
The get_starter_packs function returns:
- Pack metadata (id, name, description, thumbnail_url, industry)
- template_count (computed from junction table)
- templates JSONB array (ordered by position, filtered to active)

This single RPC call avoids N+1 queries when displaying packs.

## Verification Results

All success criteria met:
- [x] starter_packs table created with RLS
- [x] starter_pack_templates junction table created
- [x] get_starter_packs RPC returns packs with templates
- [x] fetchStarterPacks service function works
- [x] StarterPackCard expands/collapses with animation
- [x] Template selection with checkboxes works
- [x] Apply Selected creates multiple scenes
- [x] StarterPacksRow appears above Featured row
- [x] Row hidden when filters active

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| edf27f5 | feat | Create starter packs database tables |
| 5e2a538 | feat | Add starter packs service and UI components |
| 3865dd8 | feat | Integrate starter packs into marketplace page |

## Next Phase Readiness

**Ready for 18-04 (Search Improvements)**
- Starter packs data available for potential search integration
- No blockers identified

**Future Admin Work**
- Pack management UI not included (out of scope for discovery phase)
- Consider admin interface for creating/editing packs and assigning templates
