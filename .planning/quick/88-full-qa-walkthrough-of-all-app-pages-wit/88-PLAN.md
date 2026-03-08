---
phase: 88-full-qa-walkthrough
plan: 88
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/88-full-qa-walkthrough-of-all-app-pages-wit/88-QA-REPORT.md
autonomous: true
requirements: [QA-FULL-WALKTHROUGH]

must_haves:
  truths:
    - "Every sidebar-accessible page loads without crash"
    - "Visual/layout bugs are documented with screenshots"
    - "Interactive elements (modals, dropdowns, forms) are tested"
    - "Responsive behavior checked at 375px and 768px for key pages"
    - "Console errors captured per page"
    - "Final report with severity ratings produced"
  artifacts:
    - path: ".planning/quick/88-full-qa-walkthrough-of-all-app-pages-wit/88-QA-REPORT.md"
      provides: "QA walkthrough summary with issues and severity ratings"
  key_links: []
---

<objective>
Full QA walkthrough of all app pages using Playwright browser automation. Navigate every major page at http://localhost:3000, take screenshots, check for visual bugs, interactive elements, responsive behavior, and console errors. Produce a severity-rated report.

Purpose: Identify visual, functional, and layout issues across the entire app before stability milestones.
Output: QA report with screenshots and severity-rated issue list.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

The app uses SPA navigation via `window.__setCurrentPage('pageId')`. The sidebar navigation items are:
- welcome, dashboard
- media (expandable): media-all, media-images, media-videos, media-audio, media-documents, media-webpages
- apps, playlists, templates, schedules, screens, video-walls, menu-boards, proof-of-play

Additional pages accessible via settings/admin:
- settings, account-plan, branding, activity, locations, team
- analytics, scenes, assistant, help-center
- admin pages: admin-tenants, admin-audit, admin-system-events, admin-templates, tenant-admin
- ops pages: status-page, ops-console, feature-flags, demo-tools, security-dashboard
- other: device-diagnostics, service-quality, alerts-center, notification-settings, clients
- data-sources, social-accounts, content-moderation, review-inbox, translation-dashboard
- usage-dashboard, enterprise-security, white-label, developer-settings
- campaigns, screen-groups, template-marketplace

Login: Use the app at http://localhost:3000. Navigate to /app to reach the authenticated area. If login is needed, use the credentials from the environment or fill demo credentials.

Navigation pattern: After reaching /app, use browser console `window.__setCurrentPage('pageId')` to navigate between pages. This is the established E2E pattern for this project.
</context>

<tasks>

<task type="auto">
  <name>Task 1: QA walkthrough - Core pages (sidebar navigation)</name>
  <files>.planning/quick/88-full-qa-walkthrough-of-all-app-pages-wit/88-QA-REPORT.md</files>
  <action>
Use the Playwright MCP browser to perform a full QA walkthrough of ALL app pages. The app runs at http://localhost:3000.

**Setup:**
1. Navigate to http://localhost:3000/app
2. If redirected to login, fill in demo credentials (test@example.com / password123 or whatever is accepted) and log in
3. Dismiss any modals that appear on first load
4. Open browser console to monitor for errors throughout

**For EACH page below, do the following:**
- Navigate using `window.__setCurrentPage('pageId')` in the console
- Wait for the page to fully load (no spinners)
- Take a full-page screenshot
- Check for visual bugs: overlapping elements, broken spacing, cut-off text, misaligned components, broken images
- Check interactive elements: click buttons, open modals/dropdowns if present, verify they work
- Check for console errors/warnings
- Note any issues with severity: critical (crash/unusable), major (broken feature), minor (visual glitch), cosmetic (polish)

**Pages to walk through (in order):**

Group 1 - Main sidebar pages:
welcome, dashboard, media-all, media-images, media-videos, media-audio, media-documents, media-webpages, apps, playlists, templates, schedules, screens, video-walls, menu-boards

Group 2 - Settings and account pages:
settings, account-plan, branding, activity, locations, team, notification-settings, developer-settings, white-label, usage-dashboard, enterprise-security

Group 3 - Feature pages:
analytics, scenes, assistant, help-center, campaigns, screen-groups, data-sources, social-accounts, content-moderation, review-inbox, translation-dashboard, template-marketplace, alerts-center

Group 4 - Admin/ops pages:
admin-tenants, admin-audit, admin-system-events, admin-templates, tenant-admin, status-page, ops-console, feature-flags, demo-tools, security-dashboard, device-diagnostics, service-quality, clients

**Responsive checks (do these for 5 key pages only: dashboard, media-all, playlists, screens, settings):**
- Resize viewport to 375px width, take screenshot, note mobile layout issues
- Resize viewport to 768px width, take screenshot, note tablet layout issues
- Resize back to 1280px

**For each issue found:**
- Note the page ID
- Describe the problem clearly
- Rate severity (critical/major/minor/cosmetic)
- Take a screenshot if the issue is visual

**At the end, write the QA report** to `.planning/quick/88-full-qa-walkthrough-of-all-app-pages-wit/88-QA-REPORT.md` with:
- Summary statistics (pages tested, issues found by severity)
- Table of all issues: page, description, severity, screenshot reference
- List of pages that loaded cleanly with no issues
- Console errors summary
- Responsive behavior summary for the 5 tested pages
  </action>
  <verify>
    <automated>test -f .planning/quick/88-full-qa-walkthrough-of-all-app-pages-wit/88-QA-REPORT.md && echo "QA report exists" && grep -c "critical\|major\|minor\|cosmetic" .planning/quick/88-full-qa-walkthrough-of-all-app-pages-wit/88-QA-REPORT.md</automated>
  </verify>
  <done>QA report exists with severity-rated issues for all pages. Every sidebar page and sub-page has been visited and screenshotted. Responsive checks completed for 5 key pages. Console errors documented.</done>
</task>

</tasks>

<verification>
- QA report file exists at the expected path
- Report contains entries for all page groups (main, settings, features, admin)
- Report includes severity ratings
- Screenshots taken for each page visited
- Responsive checks documented for dashboard, media-all, playlists, screens, settings
</verification>

<success_criteria>
- All ~50 app pages navigated and screenshotted without the walkthrough itself crashing
- Issues documented with clear descriptions and severity ratings
- Report is actionable: a developer can read it and fix issues in priority order
</success_criteria>

<output>
After completion, the QA report is at:
`.planning/quick/88-full-qa-walkthrough-of-all-app-pages-wit/88-QA-REPORT.md`
</output>
