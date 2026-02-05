---
quick: 019
type: execute
description: Fix ReferenceError Link is not defined in MarketingLayout.jsx
files_modified:
  - src/marketing/MarketingLayout.jsx
autonomous: true
---

<objective>
Fix ReferenceError: Link is not defined in MarketingLayout.jsx

Purpose: The marketing layout crashes because it uses Link, Monitor, X, and Menu components without importing them.
Output: Working MarketingLayout with all required imports.
</objective>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add missing imports to MarketingLayout.jsx</name>
  <files>src/marketing/MarketingLayout.jsx</files>
  <action>
    Add the missing imports to MarketingLayout.jsx:

    1. Add `Link` to the existing react-router-dom import:
       Change: `import { useLocation } from 'react-router-dom';`
       To: `import { useLocation, Link } from 'react-router-dom';`

    2. Add lucide-react import for icons used in the file:
       Add: `import { Monitor, Menu, X } from 'lucide-react';`

    The file uses these undefined references:
    - Link (lines 34, 44, 60, 66, 92, 106, 115, 152, 153) - from react-router-dom
    - Monitor (lines 36, 139) - from lucide-react
    - Menu (line 82) - from lucide-react
    - X (line 80) - from lucide-react
  </action>
  <verify>
    Run: `npm run lint -- --no-error-on-unmatched-pattern src/marketing/MarketingLayout.jsx 2>&1 | grep -E "(Link|Monitor|Menu|X).*not defined" || echo "No undefined reference errors"`

    Manual: Navigate to marketing page at http://localhost:5176/ and verify no ReferenceError in console
  </verify>
  <done>
    MarketingLayout.jsx loads without ReferenceError, all Link and icon components render correctly
  </done>
</task>

</tasks>

<verification>
- Browser console shows no ReferenceError for Link, Monitor, Menu, or X
- Marketing page renders with navigation links and icons
- ESLint reports no undefined variable errors for these components
</verification>

<success_criteria>
- MarketingLayout.jsx has all required imports
- No ReferenceError in browser console
- Marketing site navigation works correctly
</success_criteria>

<output>
After completion, update `.planning/STATE.md` Quick Tasks Completed table.
</output>
