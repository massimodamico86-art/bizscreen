---
task: 023
type: quick
title: Fix all known issues (MediaLibraryPage, AppsPage, PlaylistsPage, TemplatesPage)
completed: 2026-02-02
duration: ~2 minutes
subsystem: ui-pages
tags: [imports, lucide-react, design-system, components]

key-files:
  modified:
    - src/pages/AppsPage.jsx
    - src/pages/PlaylistsPage.jsx
    - src/pages/TemplatesPage.jsx
    - src/components/apps/index.js

commits:
  - hash: 940d395
    message: "fix(quick-023): add missing imports to AppsPage"
  - hash: eaf2b1e
    message: "fix(quick-023): add missing X import to PlaylistsPage"
  - hash: a5668ee
    message: "fix(quick-023): add missing imports to TemplatesPage"
---

# Quick Task 023: Fix all known issues (AppsPage, PlaylistsPage, TemplatesPage) Summary

Fixed missing import errors in 3 pages discovered by task 022's comprehensive UI tests.

## What Was Done

### Task 1: AppsPage.jsx (940d395)

Added missing imports:
- **lucide-react**: Search, MoreVertical, Edit, Trash2, Loader2, X, Link as LinkIcon
- **design-system**: Card, Button
- **components/apps**: AppCard, AppDetailModal, WeatherWallConfigModal

Also exported `WeatherWallConfigModal` from `src/components/apps/index.js` barrel file.

### Task 2: PlaylistsPage.jsx (eaf2b1e)

Added missing `X` import from lucide-react (used in SetToScreenModal close button at line 571).

### Task 3: TemplatesPage.jsx (a5668ee)

Added missing imports:
- **lucide-react**: Search, X, Clock, Package, List, Layout, Heart, Sparkles, ChevronLeft, ChevronRight, Loader2, Check, Info, ExternalLink
- **design-system**: PageLayout, PageHeader, PageContent, Card, Badge, Button, EmptyState, Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter
- **components/templates**: TemplatePreviewPopover, TemplateLivePreview, TemplateCustomizeModal

## Verification

All 3 pages pass ESLint without import errors:
- `npm run lint -- src/pages/AppsPage.jsx` - pass
- `npm run lint -- src/pages/PlaylistsPage.jsx` - pass
- `npm run lint -- src/pages/TemplatesPage.jsx` - pass

## Deviations from Plan

None - plan executed exactly as written.

## Notes

- MediaLibraryPage was listed in the plan title but noted as "appears OK after review" in the context, so no changes were needed for it
- All pages now have complete imports for all components and icons they use
