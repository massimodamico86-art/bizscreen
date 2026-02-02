---
phase: quick
plan: 015
type: execute
wave: 1
depends_on: []
files_modified:
  - src/pages/SuperAdminDashboardPage.jsx
autonomous: true
estimated_context: 15%

must_haves:
  truths:
    - "Super admin dashboard loads without crashing"
    - "Admin tools quick links section renders with ChevronRight icons"
    - "Create Admin modal opens and closes correctly"
    - "Create Client modal opens and closes correctly"
    - "Password visibility toggle works in both modals"
  artifacts:
    - path: "src/pages/SuperAdminDashboardPage.jsx"
      provides: "Super admin dashboard with all imports"
      contains: "import { ErrorBoundary }"
  key_links:
    - from: "src/pages/SuperAdminDashboardPage.jsx"
      to: "src/components/ErrorBoundary.jsx"
      via: "import statement"
      pattern: "import.*ErrorBoundary.*from.*components/ErrorBoundary"
---

<objective>
Fix super admin dashboard crash caused by missing imports

Purpose: The SuperAdminDashboardPage crashes with "Something Went Wrong" error boundary because ESLint auto-fix removed imports that are actually used in the component. This is the same pattern as quick tasks 002, 005, and 013.

Output: Working super admin dashboard that loads without errors
</objective>

<context>
@.planning/STATE.md
@src/pages/SuperAdminDashboardPage.jsx
@src/components/ErrorBoundary.jsx
</context>

<root_cause>
The following imports are USED in SuperAdminDashboardPage.jsx but NOT imported:

1. **ErrorBoundary** (line 217) - wraps the entire return JSX
   - Missing: `import { ErrorBoundary } from '../components/ErrorBoundary';`

2. **ChevronRight** (line 256) - used in Admin Tools quick links
   - Missing from lucide-react imports

3. **X** (lines 587, 684) - used for modal close buttons
   - Missing from lucide-react imports

4. **Eye, EyeOff** (lines 641, 735) - used for password visibility toggle
   - Missing from lucide-react imports
</root_cause>

<tasks>

<task type="auto">
  <name>Task 1: Add missing imports to SuperAdminDashboardPage</name>
  <files>src/pages/SuperAdminDashboardPage.jsx</files>
  <action>
Add the missing imports to SuperAdminDashboardPage.jsx:

1. Add ErrorBoundary import after the lucide-react imports:
   ```javascript
   import { ErrorBoundary } from '../components/ErrorBoundary';
   ```

2. Add missing lucide-react icons to the existing import block (lines 13-24):
   - ChevronRight
   - X
   - Eye
   - EyeOff

The updated lucide-react import should be:
```javascript
import {
  Shield,
  FileText,
  Activity,
  Server,
  Wrench,
  Building2,
  Flag,
  Play,
  UserCheck,
  LayoutTemplate,
  ChevronRight,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
```

Do NOT modify any other code - only add the missing imports.
  </action>
  <verify>
1. `npm run lint -- --quiet src/pages/SuperAdminDashboardPage.jsx` passes (no errors)
2. `npm run build` completes without errors
  </verify>
  <done>SuperAdminDashboardPage.jsx has all required imports and compiles successfully</done>
</task>

<task type="auto">
  <name>Task 2: Verify super admin dashboard loads</name>
  <files>None (verification only)</files>
  <action>
Run the Playwright admin tests to verify the super admin dashboard loads:

```bash
npx playwright test tests/admin.spec.js --project=chromium-superadmin --grep "admin panel" --reporter=line
```

If tests are not available for super admin dashboard specifically, verify by:
1. Running `npm run dev` in background
2. Checking that the build includes SuperAdminDashboardPage without errors
  </action>
  <verify>
1. Build completes: `npm run build`
2. Dev server starts without console errors related to SuperAdminDashboardPage
  </verify>
  <done>Super admin dashboard loads without "Something Went Wrong" error</done>
</task>

</tasks>

<verification>
- [ ] `npm run lint -- --quiet src/pages/SuperAdminDashboardPage.jsx` passes
- [ ] `npm run build` completes successfully
- [ ] No "ErrorBoundary is not defined" errors
- [ ] No "ChevronRight is not defined" errors
- [ ] No "X is not defined" errors
- [ ] No "Eye/EyeOff is not defined" errors
</verification>

<success_criteria>
1. SuperAdminDashboardPage.jsx imports ErrorBoundary from components
2. SuperAdminDashboardPage.jsx imports ChevronRight, X, Eye, EyeOff from lucide-react
3. Build completes without errors
4. Super admin users can access /app dashboard without crash
</success_criteria>

<output>
After completion, update .planning/STATE.md quick tasks table with:
| 015 | Fix super admin dashboard crash (missing imports) | {date} | {commit} | [015-fix-super-admin-dashboard-crash](./quick/015-fix-super-admin-dashboard-crash/) |
</output>
