---
status: resolved
trigger: "SVG editor freezes on Loading editor... + template thumbnails show as broken scalloped shapes"
created: 2026-02-23T00:00:00Z
updated: 2026-02-23T00:10:00Z
---

## Current Focus

hypothesis: Two independent bugs confirmed. Applying fixes.
test: Code review complete, root causes identified with certainty
expecting: Both fixes resolve the issues
next_action: Apply fixes to loggingService.js, SvgEditorPage.jsx, design-system/components/TemplateCard.jsx

## Symptoms

expected: SVG editor loads content, template thumbnails display properly
actual:
  1. SVG editor stuck on "Loading editor..." spinner forever
  2. Templates page shows many black scalloped circle shapes instead of template thumbnails
errors:
  - "Uncaught (in promise) TypeError: Cannot destructure property 'error' of 'data' as it is null" at loggingService.js:108
  - "Failed to load resource: 406 (Not Acceptable)" from Supabase REST endpoint
  - "Error: <svg> attribute width: Expected length, 'sm'" (112x) and same for height
reproduction: Navigate to SVG editor via template gallery, or view Templates page
started: Current working directory state

## Eliminated

- hypothesis: TypeIcon import in TemplatePreviewPopover causes scalloped shapes
  evidence: TypeIcon is properly shadowed by local variable at line 103, renders correct concrete icon
  timestamp: 2026-02-23

- hypothesis: Icon import in TemplateLivePreview causes scalloped shapes
  evidence: Icon is properly shadowed by local variable at line 173 in PackPreview, renders concrete icon
  timestamp: 2026-02-23

- hypothesis: EmptyState receiving icon={Star} (component fn) causes scalloped shapes
  evidence: EmptyState only shown in edge cases (favorites empty, no templates found) - not the 112x error
  timestamp: 2026-02-23

- hypothesis: 406 Supabase error is the root cause of thumbnails
  evidence: Would cause templates to not load at all, showing fallback icons (Package/Layout/List) - not scalloped shapes
  timestamp: 2026-02-23

## Evidence

- timestamp: 2026-02-23
  checked: src/services/loggingService.js:107-108
  found: "function createLogEntry(level, message, data = {})" - default {} only applies when data is undefined, NOT null
  implication: Passing null as data causes destructure crash

- timestamp: 2026-02-23
  checked: src/pages/SvgEditorPage.jsx:76
  found: "logger.debug('SvgEditorPage loadContent - designId:', urlDesignId, 'templateId:', urlTemplateId)"
  implication: urlDesignId (null from params.get()) is passed as the data argument to createScopedLogger.debug

- timestamp: 2026-02-23
  checked: SvgEditorPage.jsx:78 vs line 76
  found: logger.debug call at line 76 is BEFORE the try block at line 78
  implication: TypeError thrown before try block means finally { setLoading(false) } never runs → page stuck forever

- timestamp: 2026-02-23
  checked: src/design-system/components/TemplateCard.jsx:22-28
  found: "import { Badge, LayoutTemplate, Loader2, Plus, Sparkles } from 'lucide-react'"
  implication: Badge is imported from lucide-react (the Lucide Badge SVG icon) NOT from the design system

- timestamp: 2026-02-23
  checked: design-system/components/TemplateCard.jsx:102,116,122,141,144
  found: <Badge variant="warning" size="sm">, <Badge variant="neutral" size="sm">, <Badge variant="outline" size="sm">
  implication: Lucide Badge icon receives size="sm" → SVG width="sm" height="sm" → "Expected length, 'sm'" error (112x)

- timestamp: 2026-02-23
  checked: Lucide Badge icon appearance
  found: displayName "Badge" confirmed via node inspection - it's the Lucide shield/medal icon with scalloped edges
  implication: Renders as black scalloped shape (SVG stroke default) instead of pill-shaped text badge

## Resolution

root_cause:
  bug1: loggingService.createLogEntry() destructures data with "const { error, ...rest } = data" - fails when data
        is null (default value {} only applies for undefined). SvgEditorPage.jsx passes null (urlDesignId) as the
        data argument at line 76 which is BEFORE the try block. TypeError thrown prevents setLoading(false) in
        finally block → page stuck on "Loading editor..." forever.
  bug2: design-system/components/TemplateCard.jsx imports Badge from 'lucide-react' instead of the design system.
        Badge from lucide-react is the Lucide "Badge" SVG icon (shield shape with scalloped edges). When rendered
        with size="sm", the SVG gets invalid width/height attributes → 112 "Expected length, 'sm'" console errors.
        The icon renders as a black scalloped shape instead of the intended text badge pill.

fix:
  bug1a: loggingService.js:108 - change "const { error, ...rest } = data" to "const { error, ...rest } = data || {}"
  bug1b: SvgEditorPage.jsx:76 - fix logger.debug call to pass proper object AND move inside try block
  bug2: design-system/components/TemplateCard.jsx - fix Badge import to come from design system, not lucide-react

verification: |
  Bug 1: loggingService now uses data || {} - null safe. logger.debug call moved inside try block
  with proper object argument {designId, templateId}. setLoading(false) in finally will now run.
  Bug 2: Badge is now imported from './Badge' (design system) instead of 'lucide-react'.
  The Lucide Badge SVG icon will no longer be rendered with size="sm" - correct pill badge renders.
files_changed:
  - src/services/loggingService.js (line 108: data || {} null guard)
  - src/pages/SvgEditorPage.jsx (line 76-77: moved logger inside try, fixed argument to object)
  - src/design-system/components/TemplateCard.jsx (line 22: Badge import fixed from lucide-react to ./Badge)
