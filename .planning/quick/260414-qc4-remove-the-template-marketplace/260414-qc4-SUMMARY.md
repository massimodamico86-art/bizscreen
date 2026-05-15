---
phase: 260414-qc4
plan: 01
status: complete
subsystem: frontend/navigation
tags: [cleanup, marketplace, nav, routing]
dependency_graph:
  requires: []
  provides: [single-templates-nav-entry, clean-marketplace-removal]
  affects: [src/App.jsx]
tech_stack:
  added: []
  patterns: [pageMap-alias-for-legacy-page-ids]
key_files:
  created: []
  modified:
    - src/App.jsx
  deleted:
    - src/pages/TemplateMarketplacePage.jsx
    - src/components/TemplatePreviewModal.jsx
    - src/components/QuickCustomizePanel.jsx
    - src/components/TemplatePickerModal.jsx
    - tests/e2e/template-marketplace.spec.js
decisions:
  - pageMap alias instead of React Router Navigate because the app uses page-id state machine not URL routing
  - Store icon removed from lucide-react import (sole consumer was the deleted nav entry)
  - marketplaceService.js preserved — admin tooling (AdminTemplatesPage, AdminEditTemplatePage, BulkTemplateUpload) all import it
  - svgCustomizeService.js preserved — kept per CONTEXT.md "delete only if provably unused"
metrics:
  duration: ~8 minutes
  completed: 2026-04-14
  tasks_completed: 3
  files_changed: 6
---

# Quick Task 260414-qc4: Remove the Template Marketplace — Summary

**One-liner:** Removed Template Marketplace page, nav entry, and 4 frontend-only components; aliased the page-id to SvgTemplateGalleryPage so legacy navigation calls land on the SVG gallery instead of a blank screen.

## What Was Done

The dual-templates UX (sidebar showing both "Templates" and "Template Marketplace") was eliminated. Frontend-only removal per CONTEXT.md — backend RPCs, tables, and migrations are untouched.

## Files Deleted

| File | Justification |
|------|---------------|
| `src/pages/TemplateMarketplacePage.jsx` | Sole purpose was the marketplace page; only imported by App.jsx pageMap |
| `src/components/TemplatePreviewModal.jsx` | Only consumer was TemplateMarketplacePage |
| `src/components/QuickCustomizePanel.jsx` | Only consumer was TemplatePreviewModal |
| `src/components/TemplatePickerModal.jsx` | Orphan — the modal used by PlaylistsPage.jsx is a locally-defined component with the same name, not this file |
| `tests/e2e/template-marketplace.spec.js` | Targeted the deleted page; no longer valid |

## Files Preserved Despite "Marketplace" Name

| File | Reason Kept |
|------|-------------|
| `src/services/marketplaceService.js` | Imported by 3 admin pages: AdminTemplatesPage, AdminEditTemplatePage, BulkTemplateUpload. Deleting it would break admin template tooling. |
| `tests/unit/services/marketplaceService.test.js` | Covers the kept service; 24 tests all pass. |
| `src/services/svgCustomizeService.js` | Kept per CONTEXT.md "delete only if provably unused" — a thin SVG utility that future code may need. |

## The Page-ID Alias Decision

CONTEXT.md states: "Replace the route with a redirect to `/app/templates`… old bookmarks and any in-app links land somewhere sensible without adding a 404."

This codebase does **not** use React Router URL paths for app pages — navigation is driven by a `currentPage` string and a `pageMap` object in `src/App.jsx`. There is no `/app/template-marketplace` URL route to redirect. The equivalent is aliasing the page-id key in `pageMap`:

```js
// Legacy alias: 'template-marketplace' was removed in qc4 (260414)
'template-marketplace': <Suspense fallback={<PageLoader />}><SvgTemplateGalleryPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
```

The key is deliberately kept (not deleted) so any `setCurrentPage('template-marketplace')` call in saved state, deep-links, or programmatic nav renders the SVG gallery rather than a blank screen.

## Changes to App.jsx

- Removed: `const TemplateMarketplacePage = lazy(() => import('./pages/TemplateMarketplacePage'));`
- Removed: `{ id: 'template-marketplace', label: t('nav.templateMarketplace', 'Template Marketplace'), icon: Store }` from nav array
- Removed: `Store,` from lucide-react import (sole usage was that nav entry)
- Replaced: pageMap `'template-marketplace'` entry with alias to SvgTemplateGalleryPage

## Build Verification

```
npm run build
✓ built in 10.21s
```

- No "Could not resolve" errors
- No unresolved imports
- 24/24 marketplaceService unit tests pass
- pageMap alias verified: `'template-marketplace'` resolves to `SvgTemplateGalleryPage`

## Commits

| Hash | Description |
|------|-------------|
| `899fccf1` | feat(260414-qc4): remove template-marketplace nav entry and alias pageMap to SVG gallery |
| `2c2d736f` | feat(260414-qc4): delete marketplace-only frontend files and e2e test suite |

## Deviations from Plan

None — plan executed exactly as written. The `Store` import removal was explicitly called out in Task 1 step 3 as conditional on no other uses, and confirmed correct.

## Known Stubs

None.

## Threat Flags

None — this is a pure deletion with no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- `src/App.jsx` modified: confirmed (no lazy import, no nav entry, Store removed, alias present)
- `src/pages/TemplateMarketplacePage.jsx` deleted: confirmed
- `src/components/TemplatePreviewModal.jsx` deleted: confirmed
- `src/components/QuickCustomizePanel.jsx` deleted: confirmed
- `src/components/TemplatePickerModal.jsx` deleted: confirmed
- `tests/e2e/template-marketplace.spec.js` deleted: confirmed
- `src/services/marketplaceService.js` preserved: confirmed
- Commits `899fccf1` and `2c2d736f` exist: confirmed
- Build passes: confirmed (10.21s, no errors)
