---
task: 023
type: quick
title: Fix all known issues (MediaLibraryPage, AppsPage, PlaylistsPage, TemplatesPage)
files_modified:
  - src/pages/AppsPage.jsx
  - src/pages/PlaylistsPage.jsx
  - src/pages/TemplatesPage.jsx
  - src/components/apps/index.js
---

<objective>
Fix import and component errors in 4 pages discovered by task 022's comprehensive UI tests.

Purpose: Ensure all client-facing pages render without console errors
Output: All 4 pages load successfully with proper imports
</objective>

<context>
Task 022 identified console errors when navigating to these pages:
- MediaLibraryPage - (appears OK after review)
- AppsPage - Missing imports: Search, MoreVertical, Edit, Trash2, Loader2, X, LinkIcon from lucide-react; Card, Button from design-system; AppCard, AppDetailModal, WeatherWallConfigModal from components/apps
- PlaylistsPage - Missing X import from lucide-react (used in SetToScreenModal)
- TemplatesPage - Missing many lucide icons and design-system components; missing template component imports

Server running at: http://localhost:5176/
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix AppsPage missing imports</name>
  <files>
    src/pages/AppsPage.jsx
    src/components/apps/index.js
  </files>
  <action>
    1. Add missing lucide-react imports to AppsPage.jsx:
       - Search, MoreVertical, Edit, Trash2, Loader2, X, Link as LinkIcon

    2. Add missing design-system imports to AppsPage.jsx:
       - Card, Button

    3. Add missing component imports to AppsPage.jsx:
       - AppCard, AppDetailModal from '../components/apps'
       - WeatherWallConfigModal from '../components/apps/WeatherWallConfigModal'

    4. Update src/components/apps/index.js to export WeatherWallConfigModal:
       - export { default as WeatherWallConfigModal } from './WeatherWallConfigModal';
  </action>
  <verify>
    Navigate to http://localhost:5176/#apps in browser - page loads without console errors
  </verify>
  <done>
    AppsPage renders fully with all app cards, modals, and icons working
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix PlaylistsPage missing X import</name>
  <files>
    src/pages/PlaylistsPage.jsx
  </files>
  <action>
    Add X to the lucide-react import statement at the top of PlaylistsPage.jsx.

    The file already imports many icons from lucide-react - just add X to that list.
    X is used in SetToScreenModal (line 571) for the close button.
  </action>
  <verify>
    Navigate to http://localhost:5176/#playlists in browser - page loads without console errors
  </verify>
  <done>
    PlaylistsPage renders fully, SetToScreenModal close button works
  </done>
</task>

<task type="auto">
  <name>Task 3: Fix TemplatesPage missing imports</name>
  <files>
    src/pages/TemplatesPage.jsx
  </files>
  <action>
    1. Add missing lucide-react imports:
       - Search, X, Clock, Package, List, Layout, Heart, Sparkles, ChevronLeft, ChevronRight, Loader2, Check, Info, ExternalLink

    2. Add missing design-system imports:
       - PageLayout, PageHeader, PageContent, Card, Badge, Button, EmptyState, Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter

    3. Add missing template component imports from '../components/templates':
       - TemplatePreviewPopover (already importing useTemplatePreview)
       - TemplateLivePreview
       - TemplateCustomizeModal

    Update the existing import statement:
    ```javascript
    import {
      useTemplatePreview,
      TemplatePreviewPopover,
      TemplateLivePreview,
      TemplateCustomizeModal,
    } from '../components/templates';
    ```
  </action>
  <verify>
    Navigate to http://localhost:5176/#templates in browser - page loads without console errors
  </verify>
  <done>
    TemplatesPage renders fully with all template cards, modals, and preview functionality
  </done>
</task>

</tasks>

<verification>
After all fixes:
1. Run `npm run lint -- --max-warnings=10000 src/pages/AppsPage.jsx src/pages/PlaylistsPage.jsx src/pages/TemplatesPage.jsx` - no import errors
2. Visit each page in browser:
   - http://localhost:5176/#media-images - no console errors
   - http://localhost:5176/#apps - no console errors
   - http://localhost:5176/#playlists - no console errors
   - http://localhost:5176/#templates - no console errors
</verification>

<success_criteria>
- All 4 pages render without "X is not defined" console errors
- No missing import/component errors in browser console
- Pages are fully functional with all UI elements visible
</success_criteria>

<output>
After completion, update .planning/STATE.md with quick task 023 in the completed table.
</output>
