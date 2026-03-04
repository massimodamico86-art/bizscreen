---
phase: 100-core-feature-walkthrough-crud-operations
plan: 05
subsystem: ui
tags: [interactive-controls, toggles, dropdowns, tabs, modals, action-menus, screenshots, playwright]

key-files:
  created:
    - screenshots/100-120-screens-populated-list.png
    - screenshots/100-121-screens-group-filter-floor1.png
    - screenshots/100-122-screens-action-menu-full.png
    - screenshots/100-123-screens-detail-drawer.png
    - screenshots/100-124-screens-analytics-modal.png
    - screenshots/100-125-screens-kiosk-modal.png
    - screenshots/100-126-screens-master-pin-modal.png
    - screenshots/100-127-screens-content-click.png
    - screenshots/100-128-screens-bulk-selection.png
    - screenshots/100-129-playlists-list-with-data.png
    - screenshots/100-130-playlists-bulk-actions.png
    - screenshots/100-131-playlists-editor-page.png
    - screenshots/100-132-schedules-list-with-data.png
    - screenshots/100-133-schedules-editor.png
    - screenshots/100-134-schedules-action-menu.png
    - screenshots/100-135-campaigns-page.png
    - screenshots/100-136-scenes-page.png
    - screenshots/100-137-media-page-with-items.png
    - screenshots/100-138-media-tab-images.png
    - screenshots/100-139-media-list-view.png
    - screenshots/100-140-datasources-page.png
    - screenshots/100-141-apps-page-initial.png
    - screenshots/100-142-apps-weather-filter.png
    - screenshots/100-143-menuboards-page.png
    - screenshots/100-144-templates-page.png
    - screenshots/100-145-templates-portrait-filter.png
    - screenshots/100-146-templates-your-designs.png
    - screenshots/100-147-schedules-editor-content-dropdown.png
    - screenshots/100-148-apps-sort-changed.png
    - screenshots/100-149-templates-industries-expanded.png
    - screenshots/100-150-templates-tags-expanded.png
  modified: []

key-decisions:
  - "Playwright route interception for local Supabase (127.0.0.1:54321/rest/v1/) to mock entity data in bypass-auth mode"
  - "Screens data comes from tv_devices table with nested PostgREST joins"
  - "Playlists page has no row-level action menus -- bulk action bar captured via checkbox selection instead"
  - "Fresh browser instances per interactive control group to avoid overlay state contamination"

requirements-completed: [CRUD-05]

duration: 18min
completed: 2026-03-04
---

# Plan 100-05: Interactive Controls Exerciser Summary

**31 screenshots exercising toggles, dropdowns, tabs, modals and action menus across all major entity pages**

## Task Commits

1. **Task 1: Screens and Playlists controls** - `d3e43ca`
2. **Task 2: Remaining entity page controls** - `61d2b31`

## Screenshots Created

- **Screens** (9): populated list, group filter, action menu, detail drawer, analytics/kiosk/master PIN modals, content assignment, bulk selection
- **Playlists** (3): list with data, bulk action bar, editor page
- **Schedules** (4): list with data, editor, action menu, content dropdown
- **Campaigns** (1): feature gate page
- **Scenes** (1): page with cards
- **Media** (3): populated page, Images tab, list view
- **Data Sources** (1): populated page
- **Apps** (3): marketplace, weather filter, sort control
- **Menu Boards** (1): populated page
- **Templates** (5): page, portrait filter, Your Designs, industries expanded, tags expanded

## Deviations

2 auto-fixed issues: Supabase route URL pattern mismatch (fixed via request monitoring), playlists row action menus not present (captured bulk actions instead).
