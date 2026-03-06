---
phase: quick-80
plan: 80
type: execute
wave: 1
depends_on: []
files_modified: [.planning/BUGS.md]
autonomous: true
requirements: [QA-SETTINGS-BRANDING-TEAM]

must_haves:
  truths:
    - "Settings page loads with tab navigation (Notifications, Display, Security, Brand Themes, Onboarding)"
    - "Branding page loads with logo upload, color pickers, business name field, and preview section"
    - "Changing a color on Branding page enables the Save button and shows unsaved changes indicator"
    - "Team page loads with member list table and invite-by-email UI"
    - "Console errors are collected and filtered for genuine bugs vs benign Supabase connection failures"
  artifacts:
    - path: ".planning/BUGS.md"
      provides: "Appended QA findings for Settings, Branding, and Team walkthrough"
  key_links:
    - from: "src/pages/SettingsPage.jsx"
      to: "src/services/userSettingsService.js"
      via: "getUserSettings, updateUserSettings"
      pattern: "getUserSettings|updateUserSettings"
    - from: "src/pages/BrandingSettingsPage.jsx"
      to: "src/services/brandingService.js"
      via: "getBranding, updateBranding, uploadLogo"
      pattern: "getBranding|updateBranding|uploadLogo"
    - from: "src/pages/TeamPage.jsx"
      to: "src/services/teamService.js"
      via: "fetchTeamMembers, inviteMember"
      pattern: "fetchTeamMembers|inviteMember"
---

<objective>
QA walkthrough of Settings, Branding, and Team pages via Playwright. Verify each page loads correctly, test branding color change persistence after reload, verify team member list and invite UI, and collect console errors. Append findings to BUGS.md.

Purpose: Validate settings/branding/team management pages render correctly and key interactions work.
Output: QA findings appended to .planning/BUGS.md
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/pages/SettingsPage.jsx
@src/pages/BrandingSettingsPage.jsx
@src/pages/TeamPage.jsx
@src/services/brandingService.js
@src/services/teamService.js
@src/services/userSettingsService.js
@src/contexts/BrandingContext.jsx
@.planning/BUGS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Playwright walkthrough of Settings, Branding, and Team pages with branding persistence and team invite verification</name>
  <files>.planning/BUGS.md</files>
  <action>
Write and execute a standalone Playwright script (`_tmp_qa_settings_branding_team.cjs`) using `chromium.launch` against localhost:5173.

**Navigation pattern:** Use `window.__setCurrentPage('pagename')` to navigate between pages (same pattern as quick-72 through quick-79).

**Collect all console errors throughout. Filter out known benign errors:**
- Supabase/fetch errors to 127.0.0.1:54321
- Scoped-logger App/BrandThemeService errors (known benign per quick-76)

**Walkthrough steps:**

1. **Settings page** (`window.__setCurrentPage('settings')`):
   - Verify page loads with tab navigation bar
   - Click through each tab (Notifications, Display, Security, Brand Themes, Onboarding) and verify each tab panel renders content (not blank/crash)
   - Screenshot ONLY if a tab panel is blank or crashes

2. **Branding page** (`window.__setCurrentPage('branding')`):
   - Verify page loads with: logo upload area, business name input, primary color picker, secondary color picker, dark theme toggle, preview section
   - Test color change: modify the primary color input value (type a new hex color like #FF5733)
   - Verify the "Save" button becomes enabled / unsaved changes indicator appears
   - Verify the preview section updates to reflect the new color
   - Screenshot ONLY if color change does not reflect in preview or save button stays disabled

3. **Branding persistence check:**
   - After changing the color, click Save (if enabled)
   - Reload the page (`page.reload()`)
   - Navigate back to branding page
   - Check if the color value persisted (note: without real Supabase backend, the save may fail gracefully -- document whether it shows an error toast or silently fails)
   - Screenshot ONLY if unexpected behavior (crash, blank page after reload)

4. **Team page** (`window.__setCurrentPage('team')`):
   - Verify page loads with: member list (table or card layout), invite section
   - Check that the invite-by-email UI is present: email input field, role selector dropdown, and invite/send button
   - Try typing an email address into the invite field
   - Try clicking the invite button (expect it to attempt the invite -- may fail gracefully without backend)
   - Screenshot ONLY if page crashes, member list is missing, or invite UI elements are absent

5. **Console error summary:**
   - Collect all console errors from all three pages
   - Filter benign Supabase/fetch/scoped-logger errors
   - Report any genuine JavaScript errors as bugs

**After execution:** Append findings to `.planning/BUGS.md` in the same format as previous QT entries (QT-80 header, status summary, individual BUG entries if any, review results table). If all checks pass with 0 bugs, still append the PASS summary. Clean up `_tmp_qa_settings_branding_team.cjs` after.
  </action>
  <verify>
    <automated>cat .planning/BUGS.md | grep -c "QT-80"</automated>
  </verify>
  <done>QT-80 section appended to BUGS.md with pass/fail status for all three pages (Settings tabs, Branding color change + persistence, Team member list + invite UI) and any bugs documented with component, issue description, and fix suggestion</done>
</task>

</tasks>

<verification>
- BUGS.md contains QT-80 section with results for Settings, Branding, and Team pages
- Each page walkthrough has a clear PASS or BUG status
- Any screenshots taken are only for broken behavior
- Console errors are filtered and genuine errors reported
</verification>

<success_criteria>
- Settings page all tabs render without crash
- Branding page color picker interaction works and unsaved state detected
- Team page member list and invite UI present and functional
- Findings documented in BUGS.md
</success_criteria>

<output>
After completion, create `.planning/quick/80-qa-walkthrough-of-settings-branding-and-/80-SUMMARY.md`
</output>
