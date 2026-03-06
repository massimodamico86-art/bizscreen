---
phase: quick-87
plan: 87
type: execute
wave: 1
depends_on: []
files_modified: [.planning/BUGS.md]
autonomous: true
requirements: [QA-RESELLER-PAGES]

must_haves:
  truths:
    - "Reseller Dashboard page loads without JS crashes or blank screens -- shows either dashboard content (stats grid, revenue summary, tenants list, licenses list) or FeatureUpgradePrompt or EmptyState"
    - "Reseller Billing page loads without JS crashes or blank screens -- shows either billing content (summary cards, earnings table, commission events, payout settings) or FeatureUpgradePrompt or EmptyState"
    - "Generate Licenses modal opens and contains form fields (License Type, Plan Level, Max Screens, Duration, Quantity, Notes)"
    - "Add Tenant modal opens and contains the generate-license-for-client CTA"
    - "Console has no genuine errors (Supabase/scoped-logger errors are benign)"
  artifacts:
    - path: ".planning/BUGS.md"
      provides: "Appended QT-87 section with Reseller Dashboard and Billing QA findings"
  key_links:
    - from: "src/App.jsx"
      to: "src/pages/ResellerDashboardPage.jsx"
      via: "FeatureGate feature=RESELLER_PORTAL wraps reseller-dashboard route"
      pattern: "reseller-dashboard"
    - from: "src/App.jsx"
      to: "src/pages/ResellerBillingPage.jsx"
      via: "FeatureGate feature=RESELLER_PORTAL wraps reseller-billing route"
      pattern: "reseller-billing"
---

<objective>
QA walkthrough of Reseller Dashboard and Reseller Billing pages via Playwright. Navigate to both reseller routes, verify page rendering (content, upgrade prompt, or empty state), test modal interactions (Generate Licenses, Add Tenant), and confirm no JS crashes or genuine console errors.

Purpose: These are feature-gated pages (RESELLER_PORTAL) that include complex UI: stats grids, revenue charts, tenant/license lists, modals with forms. Need to verify everything renders cleanly under DEV_AUTH_BYPASS (no Supabase backend).
Output: QA findings appended to .planning/BUGS.md as QT-87 section.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/App.jsx
@src/pages/ResellerDashboardPage.jsx
@src/pages/ResellerBillingPage.jsx
@src/services/resellerService.js
@src/services/licenseService.js
@.planning/BUGS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Playwright walkthrough of Reseller Dashboard and Billing pages with modal interactions</name>
  <files>.planning/BUGS.md</files>
  <action>
Write and execute a standalone Playwright script (`_tmp_qa_reseller.cjs`) using `chromium.launch` against localhost:5173.

**Navigation pattern:** Go to `http://localhost:5173/app` first (DEV_AUTH_BYPASS auto-authenticates). Then use `window.__setCurrentPage('pagename')` to navigate between pages (same pattern as quick-72 through quick-86).

**Collect all console errors throughout. Filter out known benign errors:**
- Supabase/fetch errors to 127.0.0.1:54321
- Scoped-logger App/BrandThemeService/useFeatureFlags/DemoService errors (known benign per quick-76, quick-83, quick-86)
- Any `Failed to fetch` or `ECONNREFUSED` network errors
- React prop warnings (cosmetic)

**Pages and interactions to test:**

**1. Reseller Dashboard (`reseller-dashboard`)**
Navigate via `window.__setCurrentPage('reseller-dashboard')`. Wait up to 5 seconds. Check what rendered:
- **If FeatureUpgradePrompt**: Look for Lock icon and "View Plans" or "Upgrade Now" -- record as PASS (feature-gated)
- **If EmptyState** ("Become a Reseller Partner"): PASS -- not a reseller account
- **If pending/suspended card**: PASS -- status guard working
- **If full dashboard**: Verify presence of:
  - Stats grid (Active Tenants, Total Screens, Available Licenses, Pending Commission)
  - Revenue summary gradient card
  - Recent Tenants list/empty state
  - Recent Licenses list/empty state
- Screenshot the page state.
- **If blank screen or JS crash**: BUG

**2. Generate Licenses Modal (if dashboard rendered)**
If the dashboard rendered (not upgrade prompt), click "Generate Licenses" button. Verify modal opens with:
- License Type dropdown
- Plan Level dropdown
- Max Screens input
- Duration input
- Quantity input
- Notes input
- Cancel and Generate buttons
Close modal. Screenshot if issues found.

**3. Add Tenant Modal (if dashboard rendered)**
If the dashboard rendered, click "Add Tenant" button. Verify modal opens with:
- Description text about generating licenses
- "Generate License for New Client" button
Close modal. Screenshot if issues found.

**4. Reseller Billing (`reseller-billing`)**
Navigate via `window.__setCurrentPage('reseller-billing')`. Wait up to 5 seconds. Check what rendered:
- **If FeatureUpgradePrompt**: PASS (feature-gated)
- **If EmptyState** ("Billing Not Available"): PASS -- no active reseller account
- **If full billing page**: Verify presence of:
  - Summary cards (Total Revenue, Total Commission, Pending Payout, Total Paid)
  - Earnings by Month section with period filter buttons (All Time, 1 Year, 90 Days, 30 Days)
  - Commission Events table with status filter dropdown
  - Payout Settings section
- Screenshot the page state.
- **If blank screen or JS crash**: BUG

**After execution:** Append findings to `.planning/BUGS.md` as QT-87 section. Include:
- Results table with PASS/FAIL for each check point (4 main items above)
- What rendered for each page (upgrade prompt vs empty state vs full content)
- Modal interaction results (if applicable)
- Console error summary (genuine vs benign count)
- Any BUG entries if issues found
- If all pass with 0 bugs, still append the PASS summary

Clean up `_tmp_qa_reseller.cjs` after execution.
  </action>
  <verify>
    <automated>grep -c "QT-87" .planning/BUGS.md</automated>
  </verify>
  <done>QT-87 section appended to BUGS.md with PASS/FAIL for Reseller Dashboard page, Generate Licenses modal, Add Tenant modal, and Reseller Billing page, with console error summary and any bugs documented</done>
</task>

</tasks>

<verification>
- BUGS.md contains QT-87 section with results for both reseller pages
- Each check point has a clear PASS or BUG status with description of what rendered
- Modal interactions tested if dashboard content was accessible
- Console errors filtered (benign Supabase/scoped-logger errors excluded) and genuine errors reported
</verification>

<success_criteria>
- Both reseller pages render without blank screens or JS crashes (content, upgrade prompt, or empty state all valid)
- Generate Licenses and Add Tenant modals open cleanly if dashboard is accessible
- Console has 0 genuine errors (benign Supabase errors excluded)
- Findings documented in BUGS.md as QT-87
</success_criteria>

<output>
After completion, create `.planning/quick/87-qa-walkthrough-of-reseller-dashboard-and/87-SUMMARY.md`
</output>
