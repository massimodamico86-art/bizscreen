---
phase: quick-84
plan: 84
type: execute
wave: 1
depends_on: []
files_modified: [.planning/BUGS.md]
autonomous: true
requirements: [QA-SUPER-ADMIN-PAGES]

must_haves:
  truths:
    - "Admin Tenants list page loads and renders tenant rows or empty state"
    - "Admin Audit Logs page loads, renders log entries, and date/search filters are present"
    - "Admin System Events page loads and renders event entries or empty state"
  artifacts:
    - path: ".planning/BUGS.md"
      provides: "Appended QT-84 section with super admin page QA findings"
  key_links:
    - from: "src/App.jsx"
      to: "src/pages/Admin/AdminTenantsListPage.jsx"
      via: "window.__setCurrentPage('admin-tenants')"
      pattern: "'admin-tenants'"
    - from: "src/App.jsx"
      to: "src/pages/Admin/AdminAuditLogsPage.jsx"
      via: "window.__setCurrentPage('admin-audit-logs')"
      pattern: "'admin-audit-logs'"
    - from: "src/App.jsx"
      to: "src/pages/Admin/AdminSystemEventsPage.jsx"
      via: "window.__setCurrentPage('admin-system-events')"
      pattern: "'admin-system-events'"
---

<objective>
QA walkthrough of super admin pages via Playwright: Admin Tenants list, Audit Logs, and System Events. Verify each page loads without crashes, renders meaningful content, and has functional UI elements (filters, search, tables). Collect console errors, screenshot only on broken behavior, and append findings to BUGS.md.

Purpose: Validate the 3 super admin pages that were not individually tested in quick-83 (which covered 9 admin-level pages but grouped admin-tenants under "Tenant Admin" without deep inspection of audit logs and system events).
Output: QA findings appended to .planning/BUGS.md as QT-84 section.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/App.jsx
@src/pages/Admin/AdminTenantsListPage.jsx
@src/pages/Admin/AdminAuditLogsPage.jsx
@src/pages/Admin/AdminSystemEventsPage.jsx
@.planning/BUGS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Playwright walkthrough of 3 super admin pages with console error collection</name>
  <files>.planning/BUGS.md</files>
  <action>
Write and execute a standalone Playwright script (`_tmp_qa_super_admin.cjs`) using `chromium.launch` against localhost:5173.

**Navigation pattern:** Go to `http://localhost:5173/app` first (DEV_AUTH_BYPASS will auto-authenticate). Then use `window.__setCurrentPage('pagename')` to navigate between pages (same pattern as quick-72 through quick-83).

**Collect all console errors throughout. Filter out known benign errors:**
- Supabase/fetch errors to 127.0.0.1:54321
- Scoped-logger App/BrandThemeService/useFeatureFlags/DemoService errors (known benign per quick-76, quick-83)
- Any `Failed to fetch` or `ECONNREFUSED` network errors
- React prop warnings (cosmetic, per quick-83)

**Pages to visit (3 total):**

1. **Admin Tenants List** (`window.__setCurrentPage('admin-tenants')`):
   - Verify page renders with a heading containing "Tenants" or similar
   - Check for a table or list of tenants, or an empty state message
   - Look for search/filter controls if present
   - Note: quick-83 saw "Access Denied" for dev bypass user -- check if this is still the case and whether the page itself renders correctly behind the access gate

2. **Admin Audit Logs** (`window.__setCurrentPage('admin-audit-logs')`):
   - Verify page renders with "Audit" heading or similar
   - Check for log entries table or empty state
   - Look for date range filters, search input, or category filters
   - Verify the page is queryable (filter controls are present and not broken)

3. **Admin System Events** (`window.__setCurrentPage('admin-system-events')`):
   - Verify page renders with "System Events" heading or similar
   - Check for event entries list/table or empty state
   - Look for severity/type filters if present
   - Verify events render with timestamps and descriptions

**For each page:**
- Wait for page to finish loading (wait for main content selector or 3 seconds)
- Check that the page is not blank (has visible text content beyond just the sidebar)
- Screenshot ONLY if the page crashes, renders blank, or shows unexpected error UI
- Record PASS/FAIL status with notes on what rendered

**After execution:** Append findings to `.planning/BUGS.md` as QT-84 section. Include a results table with status for each of the 3 pages, console error summary (genuine vs benign count), and any BUG entries if issues found. If all pass with 0 bugs, still append the PASS summary. Clean up `_tmp_qa_super_admin.cjs` after.
  </action>
  <verify>
    <automated>grep -c "QT-84" .planning/BUGS.md</automated>
  </verify>
  <done>QT-84 section appended to BUGS.md with PASS/FAIL for all 3 super admin pages (Admin Tenants, Audit Logs, System Events), console error summary, and any bugs documented</done>
</task>

</tasks>

<verification>
- BUGS.md contains QT-84 section with results for all 3 super admin pages
- Each page has a clear PASS or BUG status in the results table
- Screenshots taken only for broken behavior
- Console errors filtered (benign Supabase errors excluded) and genuine errors reported
</verification>

<success_criteria>
- All 3 super admin pages load without JavaScript crashes
- Each page renders meaningful content (not blank)
- Audit Logs page has queryable filter controls
- Findings documented in BUGS.md
</success_criteria>

<output>
After completion, create `.planning/quick/84-qa-walkthrough-of-super-admin-pages-via-/84-SUMMARY.md`
</output>
