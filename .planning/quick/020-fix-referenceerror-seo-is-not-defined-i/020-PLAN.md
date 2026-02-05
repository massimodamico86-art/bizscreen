---
phase: quick
plan: 020
type: execute
wave: 1
depends_on: []
files_modified:
  - src/marketing/HomePage.jsx
autonomous: true

must_haves:
  truths:
    - "HomePage renders without ReferenceError"
    - "SEO meta tags are set when visiting home page"
    - "Navigation links work correctly"
  artifacts:
    - path: "src/marketing/HomePage.jsx"
      provides: "Marketing home page with SEO"
      contains: "import Seo"
  key_links:
    - from: "src/marketing/HomePage.jsx"
      to: "src/components/Seo.jsx"
      via: "import statement"
      pattern: "import Seo from"
---

<objective>
Fix ReferenceError: Seo is not defined in HomePage.jsx

Purpose: The browser console shows a ReferenceError at HomePage.jsx:46:18 because the Seo component is used but not imported. Additionally, Link, ArrowRight, Play, and CheckCircle are also used without imports.

Output: HomePage.jsx renders without errors
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/marketing/HomePage.jsx
@src/components/Seo.jsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add missing imports to HomePage.jsx</name>
  <files>src/marketing/HomePage.jsx</files>
  <action>
Add the following missing imports to src/marketing/HomePage.jsx:

1. Add Seo component import:
   ```javascript
   import Seo from '../components/Seo';
   ```

2. Add Link from react-router-dom:
   ```javascript
   import { Link } from 'react-router-dom';
   ```

3. Add missing lucide-react icons to the existing import (ArrowRight, Play, CheckCircle are used but not imported):
   - ArrowRight (used in CTA buttons at lines 68, 205, 219, 263)
   - Play (used at line 74)
   - CheckCircle (used at lines 80, 84, 194)

The final lucide-react import should be:
```javascript
import {
  Monitor,
  Upload,
  ListVideo,
  Zap,
  Building2,
  UtensilsCrossed,
  Dumbbell,
  Scissors,
  GraduationCap,
  Hotel,
  ArrowRight,
  Play,
  CheckCircle
} from 'lucide-react';
```

Place imports in this order at the top of the file:
1. React imports (none currently needed)
2. react-router-dom imports (Link)
3. lucide-react imports (existing + new icons)
4. Component imports (Seo)
  </action>
  <verify>
Run: `cd /Users/massimodamico/bizscreen && npm run lint -- --no-warn --max-warnings=0 src/marketing/HomePage.jsx 2>&1 | head -20`
Expected: No errors about undefined variables (Seo, Link, ArrowRight, Play, CheckCircle)
  </verify>
  <done>HomePage.jsx has all required imports and no ReferenceErrors</done>
</task>

<task type="auto">
  <name>Task 2: Verify page renders in browser</name>
  <files>none</files>
  <action>
The server is already running at http://localhost:5176/

Use curl to verify the home page returns a successful response without server-side errors:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5176/
```

If the server is not running, start it with:
```bash
cd /Users/massimodamico/bizscreen && npm run dev &
```
Wait 5 seconds, then test.
  </action>
  <verify>
Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5176/`
Expected: HTTP 200 response
  </verify>
  <done>Home page returns 200 OK and renders without console errors</done>
</task>

</tasks>

<verification>
1. ESLint passes for HomePage.jsx without undefined variable errors
2. Server responds with 200 at http://localhost:5176/
3. No ReferenceError in browser console when visiting home page
</verification>

<success_criteria>
- HomePage.jsx imports Seo from '../components/Seo'
- HomePage.jsx imports Link from 'react-router-dom'
- HomePage.jsx imports ArrowRight, Play, CheckCircle from lucide-react
- Page renders without ReferenceError
</success_criteria>

<output>
After completion, create `.planning/quick/020-fix-referenceerror-seo-is-not-defined-i/020-SUMMARY.md`
</output>
