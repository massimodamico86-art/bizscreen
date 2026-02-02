---
type: quick
id: 013-fix-medialibrarypage-imports
wave: 1
autonomous: true
files_modified:
  - src/pages/MediaLibraryPage.jsx
  - src/pages/components/MediaLibraryComponents.jsx
---

<objective>
Fix missing imports in MediaLibraryPage.jsx causing "ReferenceError: PageLayout is not defined".

Purpose: ESLint auto-fix incorrectly removed imports that are used in JSX (a known issue documented in STATE.md). This prevents the Media Library page from rendering.

Output: Working Media Library page with all required imports restored.
</objective>

<context>
@src/pages/MediaLibraryPage.jsx - Main file with missing imports
@src/pages/components/MediaLibraryComponents.jsx - Sub-components also missing imports
@src/design-system/index.js - Available design system exports
</context>

<root_cause>
ESLint auto-fix removed "unused" imports that are actually used in JSX. The file uses these components without importing them:

**MediaLibraryPage.jsx missing:**
- Design system: PageLayout, PageContent, Stack, Inline, Grid, Card, Button, Banner, EmptyState, Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter
- Lucide icons: Plus, Filter, List, AlertTriangle, Search, X, Folder, Home, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, Loader2
- Sub-components from MediaLibraryComponents: StorageUsageInline, LimitWarningBanner, FolderBreadcrumbs, YodeckEmptyState, MediaListRow, FolderGridCard, MediaGridCard, YodeckAddMediaModal, DeleteConfirmModal, LimitReachedModal, FolderCreateModal, MoveToFolderModal, AddToPlaylistModal, SetToScreenModal, MediaDetailModal, BulkActionBar, DropZoneOverlay, MediaPreviewPopover, EmergencyDurationModal

**MediaLibraryComponents.jsx missing:**
- Design system: Banner, Button, Inline, Card, Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter, Badge, Stack, Grid, EmptyState, Input
- Lucide icons: AlertTriangle, Zap, MoreVertical, Pencil, Copy, Trash2, FolderInput, Send, ChevronRight, Folder, Check, X, Play, Image, Download, ExternalLink, Loader2, Plus, Clock
</root_cause>

<tasks>

<task type="auto">
  <name>Task 1: Restore missing imports in MediaLibraryPage.jsx</name>
  <files>src/pages/MediaLibraryPage.jsx</files>
  <action>
Add the missing imports to MediaLibraryPage.jsx after the existing imports.

1. Add lucide-react icons (extend existing import):
```javascript
import {
  Grid3X3,
  Image,
  Video,
  Music,
  FileText,
  Globe,
  Plus,
  Filter,
  List,
  AlertTriangle,
  Search,
  X,
  Folder,
  Home,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react';
```

2. Add design system imports:
```javascript
import {
  PageLayout,
  PageContent,
  Stack,
  Inline,
  Grid,
  Card,
  Button,
  Banner,
  EmptyState,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
} from '../design-system';
```

3. Add sub-component imports from MediaLibraryComponents:
```javascript
import {
  MEDIA_TYPE_LABELS,
  StorageUsageInline,
  LimitWarningBanner,
  FolderBreadcrumbs,
  YodeckEmptyState,
  MediaListRow,
  FolderGridCard,
  MediaGridCard,
  YodeckAddMediaModal,
  DeleteConfirmModal,
  LimitReachedModal,
  FolderCreateModal,
  MoveToFolderModal,
  AddToPlaylistModal,
  SetToScreenModal,
  MediaDetailModal,
  BulkActionBar,
  DropZoneOverlay,
  MediaPreviewPopover,
  EmergencyDurationModal,
} from './components/MediaLibraryComponents';
```

Note: Some sub-components may not exist in MediaLibraryComponents.jsx - verify which are actually exported and only import those that exist. Check exports at end of file.
  </action>
  <verify>
Run ESLint to check for undefined variables:
```bash
npx eslint src/pages/MediaLibraryPage.jsx --no-ignore 2>&1 | head -50
```
  </verify>
  <done>MediaLibraryPage.jsx has all required imports and no undefined variable errors.</done>
</task>

<task type="auto">
  <name>Task 2: Restore missing imports in MediaLibraryComponents.jsx</name>
  <files>src/pages/components/MediaLibraryComponents.jsx</files>
  <action>
Add the missing imports to MediaLibraryComponents.jsx after the existing imports.

1. Add lucide-react icons (extend existing import):
```javascript
import {
  Image,
  Video,
  Music,
  FileText,
  Globe,
  Grid3X3,
  AlertTriangle,
  Zap,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  FolderInput,
  Send,
  ChevronRight,
  Folder,
  Check,
  X,
  Play,
  Download,
  ExternalLink,
  Loader2,
  Plus,
  Clock,
} from 'lucide-react';
```

2. Add design system imports:
```javascript
import {
  Banner,
  Button,
  Inline,
  Card,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  Badge,
  Stack,
  Grid,
  EmptyState,
  Input,
} from '../../design-system';
```

Read the full MediaLibraryComponents.jsx file to identify all components actually used and add only those imports.
  </action>
  <verify>
Run ESLint to check for undefined variables:
```bash
npx eslint src/pages/components/MediaLibraryComponents.jsx --no-ignore 2>&1 | head -50
```
  </verify>
  <done>MediaLibraryComponents.jsx has all required imports and no undefined variable errors.</done>
</task>

<task type="auto">
  <name>Task 3: Verify Media Library page loads</name>
  <files>None (verification only)</files>
  <action>
1. Run build check to catch any remaining issues:
```bash
npm run build 2>&1 | grep -i "error\|MediaLibrary" | head -20
```

2. Start dev server and verify page loads:
```bash
npm run dev
```

3. Navigate to /media-library and confirm no console errors about undefined components.
  </action>
  <verify>
- Build completes without errors related to MediaLibrary files
- Dev server starts successfully
- /media-library page renders without "X is not defined" errors
  </verify>
  <done>Media Library page loads and renders without component reference errors.</done>
</task>

</tasks>

<verification>
- [ ] `npx eslint src/pages/MediaLibraryPage.jsx --no-ignore` shows no "undefined" errors (warnings OK)
- [ ] `npx eslint src/pages/components/MediaLibraryComponents.jsx --no-ignore` shows no "undefined" errors
- [ ] `npm run build` completes without MediaLibrary-related errors
- [ ] Media Library page loads in browser without console errors
</verification>

<success_criteria>
- MediaLibraryPage.jsx has all required imports restored
- MediaLibraryComponents.jsx has all required imports restored
- Media Library page renders without "X is not defined" errors
- No regression in existing functionality
</success_criteria>

<output>
After completion, update STATE.md quick tasks table with this fix.
</output>
