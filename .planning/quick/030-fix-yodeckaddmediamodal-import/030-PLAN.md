---
task: 030
type: quick
description: Fix YodeckAddMediaModal missing X import
files_modified:
  - src/components/media/YodeckAddMediaModal.jsx
autonomous: true
---

<objective>
Fix ReferenceError "X is not defined" in YodeckAddMediaModal.jsx

The file uses the `X` icon from lucide-react at line 1410 for the close button,
but it is not included in the import statement.

Purpose: Eliminate runtime error when rendering the YodeckAddMediaModal component
Output: Working component with all imports present
</objective>

<context>
@.planning/STATE.md - Issue documented in E2E Test Baseline section
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add X to lucide-react imports</name>
  <files>src/components/media/YodeckAddMediaModal.jsx</files>
  <action>
Add `X` to the lucide-react import statement at lines 8-25.

Current import (partial):
```javascript
import {
  Upload,
  Image,
  Video,
  Music,
  FileText,
  Globe,
  Laptop,
  Youtube,
  Radio,
  Grid3X3,
  FileSpreadsheet,
  Presentation,
  File,
  Layers,
  Tv,
  CloudUpload,
} from 'lucide-react';
```

Add `X` to the list (alphabetically between `Upload` and end, or just append before closing brace).

The X icon is used at line 1410 as the close button icon.
  </action>
  <verify>
grep -n "X," src/components/media/YodeckAddMediaModal.jsx | head -5
npm run build -- --filter=YodeckAddMediaModal 2>&1 | grep -i error || echo "No errors"
  </verify>
  <done>X is imported from lucide-react and file compiles without ReferenceError</done>
</task>

</tasks>

<verification>
- grep confirms X is in the import statement
- npm run build completes without "X is not defined" error
- Component renders close button without runtime error
</verification>

<success_criteria>
- YodeckAddMediaModal.jsx has X imported from lucide-react
- No ReferenceError when component mounts
- Build passes
</success_criteria>

<output>
After completion, update STATE.md:
- Add entry to Quick Tasks Completed table
- Remove "YodeckAddMediaModal.jsx X is not defined" from Blockers/Concerns
</output>
