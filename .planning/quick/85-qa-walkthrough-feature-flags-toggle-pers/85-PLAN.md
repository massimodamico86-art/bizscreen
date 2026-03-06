---
phase: quick-85
plan: 85
type: execute
wave: 1
depends_on: []
files_modified: [.planning/BUGS.md]
autonomous: true
requirements: [QA-FEATURE-FLAGS-CLIENTS]

must_haves:
  truths:
    - "Feature Flags page loads with 5 tabs (Feature Flags, Experiments, Feedback, Announcements, Debug) and all tabs switch without crash"
    - "Feature flag toggle buttons render and clicking them calls the toggle handler without JS crash"
    - "Clients page loads with table header columns (Client, Plan, Status, Screens, Media, Actions) or an empty state"
    - "Client action menu opens on three-dot button click and shows Impersonate, Edit, View Plan options"
    - "Create Client modal opens with form fields (Email, Contact Name, Business Name, Password, Create demo checkbox)"
  artifacts:
    - path: ".planning/BUGS.md"
      provides: "Appended QT-85 section with Feature Flags and Clients page QA findings"
  key_links:
    - from: "src/App.jsx"
      to: "src/pages/FeatureFlagsPage.jsx"
      via: "window.__setCurrentPage('feature-flags')"
      pattern: "'feature-flags'"
    - from: "src/App.jsx"
      to: "src/pages/ClientsPage.jsx"
      via: "window.__setCurrentPage('clients')"
      pattern: "'clients'"
---

<objective>
QA walkthrough of Feature Flags page (all 5 tabs, toggle persistence, flag modal, experiment controls) and Clients page (table rendering, action menu, impersonation flow, create/edit modals). Verify each page loads without crashes, interactive elements function, and modals open/close correctly. Collect console errors and append findings to BUGS.md.

Purpose: These two super-admin pages have not been individually QA tested. Feature Flags has complex tab state and toggle interactions; Clients page has impersonation flow and CRUD modals that need verification.
Output: QA findings appended to .planning/BUGS.md as QT-85 section.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/App.jsx
@src/pages/FeatureFlagsPage.jsx
@src/pages/ClientsPage.jsx
@src/pages/components/FeatureFlagsComponents.jsx
@src/pages/hooks/useFeatureFlags.js
@src/services/tenantService.js
@.planning/BUGS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Playwright walkthrough of Feature Flags page (5 tabs, toggles, modals) and Clients page (table, actions, impersonation, modals)</name>
  <files>.planning/BUGS.md</files>
  <action>
Write and execute a standalone Playwright script (`_tmp_qa_feature_flags_clients.cjs`) using `chromium.launch` against localhost:5173.

**Navigation pattern:** Go to `http://localhost:5173/app` first (DEV_AUTH_BYPASS will auto-authenticate). Then use `window.__setCurrentPage('pagename')` to navigate between pages (same pattern as quick-72 through quick-84).

**Collect all console errors throughout. Filter out known benign errors:**
- Supabase/fetch errors to 127.0.0.1:54321
- Scoped-logger App/BrandThemeService/useFeatureFlags/DemoService errors (known benign per quick-76, quick-83)
- Any `Failed to fetch` or `ECONNREFUSED` network errors
- React prop warnings (cosmetic)

**Feature Flags page (`window.__setCurrentPage('feature-flags')`):**

1. **Page load and access check:** Verify page renders with heading "Feature Flags & Experiments" (requires super_admin role -- if Access Denied renders instead, note it but this is expected for dev bypass user if role != super_admin; check the role gate behavior).

2. **Tab switching (5 tabs):** Click each tab button in sequence: Feature Flags, Experiments, Feedback, Announcements, Debug. For each:
   - Verify the tab button gets the active styling (bg-white class or similar)
   - Verify content area updates (look for tab-specific content: flag cards, experiment cards, feedback filters, announcement cards, debug panel)
   - Check no JS crash on tab switch

3. **Feature Flags tab interactions:**
   - If flags are present, locate a toggle button (ToggleLeft/ToggleRight icon) and click it -- verify no crash
   - Check for "Add Flag" button presence
   - Click "Add Flag" -- verify FlagModal opens (look for modal overlay with "Create Feature Flag" heading)
   - Close modal (click Cancel or X button)

4. **Experiments tab interactions:**
   - Click "New Experiment" button if present -- verify ExperimentModal opens
   - Close modal

5. **Announcements tab interactions:**
   - Click "New Announcement" button if present -- verify AnnouncementModal opens
   - Close modal

6. **Debug tab:** Verify FeatureFlagsDebug component renders without crash

**Clients page (`window.__setCurrentPage('clients')`):**

7. **Page load:** Verify page renders with "Clients" heading and "Add Client" button

8. **Empty state or table:** Check if client table renders (look for thead with column headers) or empty state message ("No clients yet")

9. **Search input:** Verify search input is present with placeholder text

10. **Add Client modal:** Click "Add Client" button, verify CreateClientModal opens with form fields (Email, Contact Name, Business Name, Temporary Password, Create demo checkbox). Close modal via Cancel.

11. **Client action menu (if clients exist):** If table has rows, click the three-dot MoreVertical button on first row. Verify dropdown shows Impersonate, Edit, View Plan & Limits options. Click elsewhere to dismiss.

12. **Edit Client modal (if clients exist):** If a client row exists, open action menu and click Edit. Verify EditClientModal opens with email (disabled), Contact Name, Business Name fields. Close modal.

**For each check point:**
- Wait for page/content to finish loading (wait for specific selectors or 3s fallback)
- Screenshot ONLY if the page crashes, renders blank, or shows unexpected error UI
- Record PASS/FAIL status with notes

**After execution:** Append findings to `.planning/BUGS.md` as QT-85 section. Include a results table with status for each check point, console error summary (genuine vs benign count), and any BUG entries if issues found. If all pass with 0 bugs, still append the PASS summary. Clean up `_tmp_qa_feature_flags_clients.cjs` after.
  </action>
  <verify>
    <automated>grep -c "QT-85" .planning/BUGS.md</automated>
  </verify>
  <done>QT-85 section appended to BUGS.md with PASS/FAIL for all Feature Flags tab interactions and Clients page CRUD/impersonation checks, console error summary, and any bugs documented</done>
</task>

</tasks>

<verification>
- BUGS.md contains QT-85 section with results for Feature Flags page (5 tabs, toggles, modals) and Clients page (table, actions, modals)
- Each check point has a clear PASS or BUG status
- Screenshots taken only for broken behavior
- Console errors filtered (benign Supabase errors excluded) and genuine errors reported
</verification>

<success_criteria>
- Feature Flags page loads without JavaScript crashes
- All 5 tabs switch correctly with content updates
- Flag toggle, Add Flag modal, New Experiment modal, New Announcement modal all function without crash
- Clients page loads with table or empty state
- Add Client modal opens with correct form fields
- Client action menu renders with Impersonate/Edit/View Plan options
- Findings documented in BUGS.md
</success_criteria>

<output>
After completion, create `.planning/quick/85-qa-walkthrough-feature-flags-toggle-pers/85-SUMMARY.md`
</output>
