---
phase: quick
plan: 027
type: execute
wave: 1
depends_on: []
files_modified:
  - src/pages/AdminDashboardPage.jsx
autonomous: true

must_haves:
  truths:
    - "AdminDashboardPage renders without ReferenceError"
    - "Admin E2E tests that hit AdminDashboardPage pass"
  artifacts:
    - path: "src/pages/AdminDashboardPage.jsx"
      provides: "Admin dashboard with proper imports"
      contains: "from '../design-system'"
  key_links:
    - from: "src/pages/AdminDashboardPage.jsx"
      to: "../design-system"
      via: "import statement"
      pattern: "import.*from.*design-system"
---

<objective>
Fix AdminDashboardPage.jsx missing imports that cause ~549 E2E test failures.

Purpose: The component uses PageLayout, PageContent, PageHeader, Alert, StatCard, Card components from design-system, lucide-react icons, and ErrorBoundary - but none are imported.
Output: Working AdminDashboardPage.jsx with all required imports.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/pages/AdminDashboardPage.jsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add missing imports to AdminDashboardPage.jsx</name>
  <files>src/pages/AdminDashboardPage.jsx</files>
  <action>
Add the following imports to the top of the file after existing imports:

1. Design system components (add after line 5):
```javascript
import {
  PageLayout,
  PageContent,
  PageHeader,
  Alert,
  StatCard,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  EmptyState,
  Badge,
  Button,
  Modal,
} from '../design-system';
```

2. lucide-react icons:
```javascript
import {
  Users,
  Building2,
  UserCheck,
  ExternalLink,
  Plus,
  Upload,
  FileText,
  Download,
} from 'lucide-react';
```

3. ErrorBoundary (use named import pattern for consistency):
```javascript
import { ErrorBoundary } from '../components/ErrorBoundary';
```

Keep existing imports (useState, useEffect, useAuth, supabase, useTranslation, useLogger).
  </action>
  <verify>
Run: `node --check src/pages/AdminDashboardPage.jsx` (syntax check)
Then: `npm run lint -- src/pages/AdminDashboardPage.jsx --quiet` (no undefined errors)
  </verify>
  <done>File has all required imports and passes lint without ReferenceError</done>
</task>

<task type="auto">
  <name>Task 2: Verify fix with E2E test</name>
  <files>-</files>
  <action>
Run a quick E2E test that hits the admin dashboard to confirm the fix works.

Use: `npx playwright test tests/e2e/admin.spec.js --grep "navigate to Admin" --project=chromium`

This should pass now that imports are fixed. If it still fails, check for additional missing imports.
  </action>
  <verify>At least one admin test passes (no ReferenceError crash)</verify>
  <done>Admin dashboard page loads without import-related crashes</done>
</task>

</tasks>

<verification>
- `npm run lint -- src/pages/AdminDashboardPage.jsx --quiet` passes
- `npx playwright test tests/e2e/admin.spec.js --grep "navigate" --project=chromium` passes (no crash)
</verification>

<success_criteria>
- AdminDashboardPage.jsx has all required imports
- No ReferenceError when component renders
- At least one admin E2E test passes
</success_criteria>

<output>
After completion, create `.planning/quick/027-fix-admindashboardpage-jsx-missing-pagel/027-SUMMARY.md`
</output>
