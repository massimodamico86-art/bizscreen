---
phase: quick-83
plan: 83
type: execute
wave: 1
depends_on: []
files_modified: [.planning/BUGS.md]
autonomous: true
requirements: [QA-ADMIN-PAGES]

must_haves:
  truths:
    - "Clients page loads and renders content without crash"
    - "Admin Templates page loads and renders template list or empty state"
    - "Device Diagnostics page loads and renders diagnostic UI"
    - "Status page loads and renders system status content"
    - "Ops Console page loads and renders operations UI"
    - "Tenant Admin page loads and renders tenant management UI"
    - "Feature Flags page loads and renders flag toggles or list"
    - "Demo Tools page loads and renders demo utilities"
    - "Service Quality page loads and renders quality metrics grid"
  artifacts:
    - path: ".planning/BUGS.md"
      provides: "Appended QA findings for all admin-level pages"
  key_links:
    - from: "src/App.jsx"
      to: "src/pages/ClientsPage.jsx"
      via: "window.__setCurrentPage('clients')"
      pattern: "'clients'"
    - from: "src/App.jsx"
      to: "src/pages/Admin/AdminTemplatesPage.jsx"
      via: "window.__setCurrentPage('admin-templates')"
      pattern: "'admin-templates'"
    - from: "src/App.jsx"
      to: "src/pages/ServiceQualityPage.jsx"
      via: "window.__setCurrentPage('service-quality')"
      pattern: "'service-quality'"
---

<objective>
QA walkthrough of all admin-level pages via Playwright. Navigate to each admin page using `window.__setCurrentPage()`, verify it loads without errors and renders content. Collect console errors, screenshot only on broken behavior, and append findings to BUGS.md.

Purpose: Validate all admin/operations pages render correctly and are free of JavaScript errors.
Output: QA findings appended to .planning/BUGS.md
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/App.jsx
@.planning/BUGS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Playwright walkthrough of all 9 admin-level pages with console error collection</name>
  <files>.planning/BUGS.md</files>
  <action>
Write and execute a standalone Playwright script (`_tmp_qa_admin_pages.cjs`) using `chromium.launch` against localhost:5173.

**Navigation pattern:** Go to `http://localhost:5173/app` first (DEV_AUTH_BYPASS will auto-authenticate). Then use `window.__setCurrentPage('pagename')` to navigate between pages (same pattern as quick-72 through quick-82).

**Collect all console errors throughout. Filter out known benign errors:**
- Supabase/fetch errors to 127.0.0.1:54321
- Scoped-logger App/BrandThemeService errors (known benign per quick-76)
- Any `Failed to fetch` or `ECONNREFUSED` network errors

**Pages to visit (9 total):**

1. **Clients** (`window.__setCurrentPage('clients')`):
   - Verify page renders with a heading or client list/empty state
   - Check for any crash or blank render

2. **Admin Templates** (`window.__setCurrentPage('admin-templates')`):
   - Verify page renders with template list, grid, or empty state
   - Check for template management UI elements (add/edit controls)

3. **Device Diagnostics** (`window.__setCurrentPage('device-diagnostics')`):
   - Verify page renders with diagnostic UI (device list, health indicators, or empty state)

4. **Status** (`window.__setCurrentPage('status')`):
   - Verify page renders with system status indicators or service health cards

5. **Ops Console** (`window.__setCurrentPage('ops-console')`):
   - Verify page renders with operations management UI (metrics, controls, or dashboard)

6. **Tenant Admin** (`window.__setCurrentPage('tenant-admin')`):
   - Verify page renders with tenant management UI (tenant list or configuration)

7. **Feature Flags** (`window.__setCurrentPage('feature-flags')`):
   - Verify page renders with feature flag list/toggles

8. **Demo Tools** (`window.__setCurrentPage('demo-tools')`):
   - Verify page renders with demo utilities (data generators, sample content tools)

9. **Service Quality** (`window.__setCurrentPage('service-quality')`):
   - Verify page renders with quality metrics grid layout (BUG-01 fix was applied in quick-50)
   - Confirm grid layout is not broken

**For each page:**
- Wait for page to finish loading (wait for main content selector or 3 seconds)
- Check that the page is not blank (has visible text content beyond just the sidebar)
- Screenshot ONLY if the page crashes, renders blank, or shows unexpected error UI
- Record PASS/FAIL status

**After execution:** Append findings to `.planning/BUGS.md` as QT-83 section. Include a results table with status for each of the 9 pages, console error summary (genuine vs benign count), and any BUG entries if issues found. If all pass with 0 bugs, still append the PASS summary. Clean up `_tmp_qa_admin_pages.cjs` after.
  </action>
  <verify>
    <automated>grep -c "QT-83" .planning/BUGS.md</automated>
  </verify>
  <done>QT-83 section appended to BUGS.md with PASS/FAIL for all 9 admin pages (Clients, Admin Templates, Device Diagnostics, Status, Ops Console, Tenant Admin, Feature Flags, Demo Tools, Service Quality), console error summary, and any bugs documented</done>
</task>

</tasks>

<verification>
- BUGS.md contains QT-83 section with results for all 9 admin pages
- Each page has a clear PASS or BUG status in the results table
- Screenshots taken only for broken behavior
- Console errors filtered (benign Supabase errors excluded) and genuine errors reported
</verification>

<success_criteria>
- All 9 admin pages load without JavaScript crashes
- Each page renders meaningful content (not blank)
- Service Quality grid layout confirmed intact
- Findings documented in BUGS.md
</success_criteria>

<output>
After completion, create `.planning/quick/83-qa-walkthrough-of-admin-level-pages-via-/83-SUMMARY.md`
</output>
