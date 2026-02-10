# E2E Test Skip Audit Report

**Generated:** 2026-02-10
**Phase:** 43 - E2E Test Triage
**Source data:** Playwright test run (1218 total entries, 917 skipped)
**Files audited:** 38 spec files in `tests/e2e/`

## Summary

| Category | Skip Count | Action |
|----------|-----------|--------|
| 1. Intentional project-specific skips | ~800 | No action -- correct behavior |
| 2. Fixable -- selector mismatch (test.fixme) | 8 | Plan 43-02: update selectors |
| 3. Fixable -- auth pattern | 5 | Plan 43-02: fix auth race conditions |
| 4. Obsolete -- feature not implemented (describe.skip) | 44 | Plan 43-03: document or remove |
| 5. Obsolete -- diagnostic/debug | 10 | Deleted now (3 files) |
| 6. Blocked -- feature not accessible | 30 | Plan 43-03: document as blocked |
| 7. Blocked -- missing features (SEO/accessibility) | 4 | Plan 43-03: document as future work |
| 8. Blocked -- external dependencies | 1 | Plan 43-03: document as blocked |
| 9. Blocked -- credentials/environment | ~15 | Plan 43-03: document credential requirements |
| **Total** | **~917** | |

**Note:** Exact total varies slightly because some skips interact (e.g., a describe.skip file also has project-specific skips that never trigger). The 917 number comes from the actual Playwright run where skips are counted per-project.

---

## Category 1: Intentional Project-Specific Skips (~800)

**Mechanism:** `test.skip(testInfo.project.name !== 'chromium', '...')` in `beforeEach`

**Explanation:** The Playwright config defines 3 projects (chromium, chromium-admin, chromium-superadmin) with different storage states. Each spec file is designed for one project but Playwright runs all files across all 3 projects. The `beforeEach` skip ensures tests only execute on their intended project.

This is correct, expected behavior. Each test file contributes 2 skips per test (skipped in the 2 non-target projects).

**Action:** No action needed. This is the standard Playwright multi-project pattern.

| File | Target Project | Tests | Skips Generated |
|------|---------------|-------|-----------------|
| admin.spec.js | chromium-superadmin | 40 | ~80 |
| alert-notification-flow.spec.js | chromium-admin | 4 (active) | ~8 |
| alerts-center.spec.js | chromium-admin | 24 | ~48 |
| audit.spec.js | chromium-superadmin | 20 | ~40 |
| auth.spec.js | chromium | 38 | ~76 |
| billing.spec.js | chromium | 0 (all in describe.skip) | 0 |
| brand-theme.spec.js | chromium | 0 (all in describe.skip) | 0 |
| client-flows.spec.js | chromium | 6 | ~12 |
| client-interactions.spec.js | chromium | 15 | ~30 |
| content-performance.spec.js | chromium | 23 | ~46 |
| content-pipeline.spec.js | chromium | 11 | ~22 |
| dashboard.spec.js | chromium | 13 | ~26 |
| industry-wizards.spec.js | chromium | 24 | ~48 |
| media.spec.js | chromium | 15 | ~30 |
| onboarding.spec.js | chromium | 7 | ~14 |
| performance.spec.js | chromium | 8 | ~16 |
| playlist-screen-persistence.spec.js | chromium | 4 | ~8 |
| playlist-template.spec.js | chromium | 4 | ~8 |
| playlists.spec.js | chromium | 11 | ~22 |
| polotno-editor.spec.js | chromium | 0 (all in describe.skip) | 0 |
| schedules.spec.js | chromium | 12 | ~24 |
| screen-assignments.spec.js | chromium | 12 | ~24 |
| screens.spec.js | chromium | 19 | ~38 |
| seo.spec.js | chromium | 10 | ~20 |
| settings.spec.js | chromium | 18 | ~36 |
| smoke-test-client.spec.js | chromium | 12 | ~24 |
| smoke.spec.js | chromium | 13 | ~26 |
| social.spec.js | chromium | 19 | ~38 |
| template-marketplace.spec.js | chromium | 0 (all in describe.skip) | 0 |
| template-packs.spec.js | chromium | 9 | ~18 |
| enterprise.spec.js | chromium-superadmin | 9 | ~18 |

Files without project filter (run in all 3 projects): debug.spec.js, feature-diagnostic.spec.js, location-diagnostic.spec.js, reseller.spec.js, scene-editor.spec.js, scenes.spec.js, usage.spec.js

---

## Category 2: Fixable -- Selector Mismatch (8 tests)

**Mechanism:** `test.fixme('test name', async ...)` in audit.spec.js

These tests have valid test logic but their button/element selectors don't match the current UI. Updating selectors will make them pass.

**Action:** Plan 43-02 will update selectors.

| # | File | Line | Test Name | Skip Reason |
|---|------|------|-----------|-------------|
| 1 | audit.spec.js | 29 | `audit logs page has refresh button` | Refresh button selector doesn't match current UI |
| 2 | audit.spec.js | 35 | `audit logs page has filters button` | Filters button selector doesn't match current UI |
| 3 | audit.spec.js | 41 | `clicking filters shows filter panel` | Depends on filters button (cascading) |
| 4 | audit.spec.js | 49 | `filter panel has date range inputs` | Depends on filters button (cascading) |
| 5 | audit.spec.js | 57 | `filter panel has apply and clear buttons` | Depends on filters button (cascading) |
| 6 | audit.spec.js | 88 | `system events page has refresh button` | Refresh button selector doesn't match current UI |
| 7 | audit.spec.js | 101 | `system events page has filters button` | Filters button selector doesn't match current UI |
| 8 | audit.spec.js | 107 | `clicking filters shows filter panel with source and severity` | Depends on filters button (cascading) |

---

## Category 3: Fixable -- Auth Pattern Issues (5 tests)

**Mechanism:** Tests fail intermittently because `loginAndPrepare` helper conflicts with storage state pre-authentication.

These tests use a legacy `loginAndPrepare` function that tries to fill login credentials, but the browser is already authenticated via Playwright storage state. This creates a race condition.

**Action:** Plan 43-02 will replace `loginAndPrepare` with storage-state-compatible navigation.

| # | File | Line | Test Name | Root Cause |
|---|------|------|-----------|------------|
| 1 | media.spec.js | ~101 | `can close Add Media modal` | loginAndPrepare hits auth timeout |
| 2 | media.spec.js | ~152 | `Web Page form validates URL format` | Same auth race condition |
| 3 | screens.spec.js | ~247 | `Add Screen button is clickable` | loginAndPrepare intermittent failure |
| 4 | settings.spec.js | ~145 | `plan page handles loading state` | loginAndPrepare intermittent failure |
| 5 | social.spec.js | ~182 | `social widget layout options` | loginAndPrepare intermittent failure |

**Note:** These 5 tests are identified from the Phase 38 COVERAGE-REPORT.md as persistent failures due to auth pattern issues. They are not marked with `test.skip` but fail consistently in the non-target project scenarios and sometimes in the target project.

---

## Category 4: Obsolete -- Feature Not Implemented (44 tests in 10 describe.skip blocks)

**Mechanism:** `test.describe.skip('Block Name', () => { ... })` -- entire test blocks disabled

These tests cover UI features that do not exist in the current application. The features were either removed, never fully implemented, or have significantly different UIs than what the tests expect.

**Action:** Plan 43-03 will either remove these blocks or document them as "pending feature" with clear activation criteria.

### 4a. billing.spec.js -- "Billing & Plans" (5 tests)

| Line | Describe Block | Tests | Skip Reason |
|------|---------------|-------|-------------|
| 10 | `Billing & Plans` | 5 | "Plan & Limits" sidebar button not present in current UI |

Tests inside:
- `can access Plan & Limits page` (L25)
- `shows current plan information` (L35)
- `shows usage limits` (L46)
- `shows upgrade options if on free plan` (L57)
- `displays plan comparison` (L69)

### 4b. brand-theme.spec.js -- "Brand Theme" (15 tests in 2 blocks)

| Line | Describe Block | Tests | Skip Reason |
|------|---------------|-------|-------------|
| 8 | `Brand Theme Management` | 12 | Branding tab not present in settings UI |
| 205 | `Brand Theme Service Integration` | 3 | Same -- branding tab not in settings |

Tests inside Brand Theme Management:
- `shows branding tab in settings` (L24)
- `can click branding tab to view brand themes` (L33)
- `shows empty state when no themes exist` (L45)
- `shows Import Brand button` (L70)
- `opens brand importer modal when clicking Import Brand` (L83)
- `shows step indicator in modal` (L120)
- `can close modal with close button or cancel` (L132)
- `shows file upload area` (L144)
- `modal has color customization step` (L155)
- `scene editor page loads without errors` (L180)
- Plus 2 more in Color Extraction/Theme Integration

Tests inside Brand Theme Service Integration:
- `brand theme data persists across page reloads` (L220)
- Plus 2 more

### 4c. polotno-editor.spec.js -- "Polotno Editor" (23 tests in 4 blocks)

| Line | Describe Block | Tests | Skip Reason |
|------|---------------|-------|-------------|
| 14 | `Polotno Editor - Modal Opening` | 3 | Template cards not found on layouts page |
| 103 | `Polotno Editor - Mobile Warning` | 3 | Depends on Modal Opening flow |
| 189 | `Polotno Editor - Close Behavior` | 2 | Depends on Modal Opening flow |
| 288 | `Phase 35 Success Criteria` | 5 | Depends on Modal Opening flow |

Additional non-describe.skip tests in polotno-editor.spec.js:
- Error Handling block (L80): 2 tests with `test.skip()` inside body
- Unsaved Changes block (L250): 1 test with `test.skip()` inside body
- Post-Save Dialog block (L271): 1 test with `test.skip()` inside body

Total polotno-editor disabled tests: ~17 (in describe.skip) + ~4 (test.skip in body) + ~6 (credential-gated and active tests)

### 4d. template-marketplace.spec.js -- "Template Marketplace" (25 tests in 3 blocks)

| Line | Describe Block | Tests | Skip Reason |
|------|---------------|-------|-------------|
| 31 | `Template Marketplace - Client User` | 8 | Template marketplace headings/search selectors don't match current UI |
| 196 | `Admin Template Management` | 11 | "Template Library" nav button doesn't match superadmin UI |
| 297 | `Template Picker Modal` | 1 | Scenes button selector doesn't match current nav |

Additional active tests:
- Template Preview Modal (L132): 2 tests (active, not in describe.skip)
- License-Based Access Control (L332): 2 tests (active, not in describe.skip)

### 4e. alert-notification-flow.spec.js -- "Alert Notification Flow" (8 tests)

| Line | Describe Block | Tests | Skip Reason |
|------|---------------|-------|-------------|
| 21 | `Alert Notification Flow` | 8 | Tests require pre-existing database state (alerts, notifications); uses manual login pattern incompatible with storage state |

Tests inside:
- `shows device offline alert in alerts center` (L37)
- `notification bell shows unread count for device alerts` (L54)
- `displays screenshot failure alerts` (L71)
- `displays data source sync failure alerts` (L90)
- `displays social feed sync failure alerts` (L108)
- `resolved alerts show in resolved status filter` (L126)
- `notification dropdown shows recent alerts` (L152)
- `can mark notifications as read` (L174)

---

## Category 5: Obsolete -- Diagnostic/Debug Files (10 tests in 3 files)

**Mechanism:** Files created as one-off development helpers, not real tests.

**Action:** Delete all 3 files immediately (done in this plan).

### 5a. debug.spec.js (2 tests)

- **Line 9:** `test.describe.skip('Debug Tests', () => {})` -- empty describe block
- **Line 11:** `test.skip('check supabase config in browser', ...)` -- manual debug test with no assertions
- **Comment on L8:** "To use, temporarily change test.skip to test and run manually"
- **Purpose:** Manual debugging helper for checking Supabase config in browser console
- **Why obsolete:** No assertions, requires manual activation, provides no automated test value

### 5b. feature-diagnostic.spec.js (7 tests)

- **Line 35:** `test.describe.skip('Feature Diagnostics', ...)` -- 7 tests
- **Tests:** Media Library access, Playlists list/create, Layouts list/create, Schedules list/create, Screens list/add, Dashboard quick actions, Sidebar navigation items
- **Uses hardcoded credentials:** `CLIENT_EMAIL = 'client@bizscreen.test'` (L6)
- **Purpose:** One-off diagnostic tool that logs console output for debugging feature access
- **Why obsolete:** Hardcoded credentials, incompatible with storage state auth pattern, purely diagnostic (console.log output), no real assertions

### 5c. location-diagnostic.spec.js (1 test)

- **Line 10:** `test.skip('Diagnose Locations page error', ...)` -- single diagnostic test
- **Uses legacy login pattern:** Manual `page.fill` for email/password (incompatible with storage state)
- **Purpose:** One-off diagnostic for investigating a specific Locations page error
- **Why obsolete:** Legacy login pattern, single-purpose diagnostic, the issue it was investigating has been resolved

---

## Category 6: Blocked -- Feature Not Accessible (30 tests in 2 files)

**Mechanism:** `test.describe.skip` -- features exist in codebase but are not exposed in sidebar navigation.

**Action:** Plan 43-03 will document these as blocked pending navigation changes.

### 6a. scenes.spec.js (12 tests)

| Line | Describe Block | Tests | Skip Reason |
|------|---------------|-------|-------------|
| 14 | `Scenes` | 12 | "Scenes feature not in sidebar navigation" |

Tests inside:
- Scenes List Page: `can navigate to Scenes page` (L26), `shows scenes list or empty state` (L34), `scenes page shows business type badges` (L53)
- Scene Detail Page: `can open scene detail from list` (L73), `scene detail shows preview area` (L90), `scene detail shows linked content` (L106)
- Publish to Screen: `can open publish modal from scene detail` (L125), `publish modal shows device selection` (L146), `can close publish modal` (L174)
- AI Onboarding: `AutoBuild modal appears for new users without scenes` (L205)
- Plus 2 additional tests

### 6b. scene-editor.spec.js (18 tests)

| Line | Describe Block | Tests | Skip Reason |
|------|---------------|-------|-------------|
| 15 | `Scene Editor` | 18 | "Scenes feature not in sidebar navigation" |

Tests inside:
- Editor Navigation: `can navigate to scene editor from scene detail` (L64), `shows back button to return to scene detail` (L74)
- Canvas Rendering: `displays 16:9 canvas area` (L86), `canvas has background color` (L96)
- Slide Strip: `shows slide thumbnails on left panel` (L114), `can add new slide` (L124), `can select different slides` (L148)
- Block Toolbar: `shows toolbar with block type buttons` (L172), `can add text block` (L190), `can add shape block` (L210)
- Properties Panel: `shows properties panel on right side` (L231), `shows background settings` (L241), `shows "select a block" message` (L251)
- AI Suggestions Panel: `can toggle AI suggestions panel` (L268), `shows industry presets in templates tab` (L288)
- Save Status: `shows save status indicator` (L320)
- Undo/Redo: `shows undo/redo buttons` (L332)
- Plus 1 additional test

---

## Category 7: Blocked -- Missing Features (4 tests)

**Mechanism:** `test.skip('test name', ...)` -- features not yet implemented in the application.

**Action:** Plan 43-03 will document as future feature work.

| # | File | Line | Test Name | Missing Feature |
|---|------|------|-----------|----------------|
| 1 | seo.spec.js | 70 | `login page has noindex directive` | Meta tag not implemented |
| 2 | seo.spec.js | 83 | `signup page has correct meta tags` | Meta tags not implemented |
| 3 | seo.spec.js | 118 | `internal links use meaningful text` | Link text audit not done |
| 4 | seo.spec.js | 135 | `skip to content link is present` | Accessibility feature not implemented |

---

## Category 8: Blocked -- External Dependencies (1 test)

**Mechanism:** `test.skip('test name', ...)` -- requires third-party widget not available in test environment.

**Action:** Plan 43-03 will document as external dependency.

| # | File | Line | Test Name | Dependency |
|---|------|------|-----------|------------|
| 1 | media.spec.js | 217 | `can upload a media file` | Cloudinary upload widget -- requires Cloudinary API credentials and widget loading in test environment |

---

## Category 9: Blocked -- Credentials/Environment (15+ tests)

**Mechanism:** `test.skip(() => !process.env.TEST_*_EMAIL, '...')` -- tests gated on environment variables not set in CI.

**Action:** Plan 43-03 will document credential requirements and gating pattern.

### 9a. Enterprise features (7 tests)

| File | Line | Gate | Tests Affected |
|------|------|------|---------------|
| enterprise.spec.js | 8 | `TEST_ENTERPRISE_EMAIL` | 7 tests (SSO config, SCIM provisioning, compliance, SSO form fields, super admin enterprise access) |

### 9b. Reseller features (10 tests)

| File | Line | Gate | Tests Affected |
|------|------|------|---------------|
| reseller.spec.js | 8 | `TEST_RESELLER_EMAIL` | 8 tests (portal nav, dashboard, statistics, tenant list, license modal, billing tab) |
| reseller.spec.js | 74 | `TEST_RESELLER_EMAIL` | 2 tests (license generation modal fields, license type selection) |

### 9c. Usage Dashboard (11 tests)

| File | Line | Gate | Tests Affected |
|------|------|------|---------------|
| usage.spec.js | 16 | `test.describe.skip` (no credential gate, route not wired up) | 9 tests (dashboard page, billing period, quota cards, usage bars, refresh, color coding, upgrade CTA, plan navigation, tooltips) |
| usage.spec.js | 130 | `test.describe.skip` | 2 tests (loading spinner, error retry button) |

**Note:** usage.spec.js uses `test.describe.skip` rather than credential gating because the `/app/usage` route is not wired up in the application router. This is categorized here (rather than Category 4) because the feature is planned but the route/page connection is missing.

### 9d. Additional credential-gated skips

Several files have `test.skip(() => !process.env.TEST_USER_EMAIL, ...)` or `test.skip(() => !process.env.TEST_CLIENT_EMAIL, ...)` at the describe level. In the current CI, `TEST_USER_EMAIL` IS set (storage state auth works), so these skips do not actually trigger. They are defensive guards that only activate when running tests without the test environment configured.

Files with defensive credential guards (not currently triggering):
- auth.spec.js (L259, L311): `TEST_USER_EMAIL`
- media.spec.js (L20): `TEST_USER_EMAIL`
- smoke.spec.js (L367): `TEST_USER_EMAIL`
- smoke-test-client.spec.js (L441, L503, L550): `TEST_USER_EMAIL`
- content-performance.spec.js (L13): `TEST_USER_EMAIL`
- content-pipeline.spec.js (L13): `TEST_CLIENT_EMAIL`
- industry-wizards.spec.js (L18): `TEST_USER_EMAIL`
- billing.spec.js (L14): `TEST_CLIENT_EMAIL` (inside describe.skip, never triggers)
- brand-theme.spec.js (L12, L210): `TEST_CLIENT_EMAIL` (inside describe.skip, never triggers)
- template-marketplace.spec.js (L38, L136, L302, L336): `TEST_CLIENT_EMAIL` (some inside describe.skip)

---

## Additional Skipped Tests (Conditional test.skip inside test bodies)

These are tests that pass in some conditions but skip themselves when detecting missing UI elements. They use the pattern:
```javascript
test('test name', async ({ page }) => {
  if (!await element.isVisible()) {
    test.skip(true, 'Element not visible');
    return;
  }
  // ... rest of test
});
```

### admin.spec.js -- Conditional skips for Tenant Management button

| Line | Test Name | Skip Condition |
|------|-----------|---------------|
| 41 | `can navigate to Admin Panel page` | "Tenant Management button not visible in superadmin sidebar" |
| 53 | `admin panel shows tenant list` | "Tenant Management button not visible in superadmin sidebar" |
| 86 | `admin panel has refresh button` | "Tenant Management button not visible in superadmin sidebar" |
| 195 | `non-super-admin cannot access admin panel` | Unconditional `test.skip()` |
| 204 | (test in Access Control) | Unconditional `test.skip()` |
| 226 | `tenant list API returns valid structure` | Unconditional `test.skip()` |
| 231 | `tenant detail API returns valid structure` | Unconditional `test.skip()` |

### alerts-center.spec.js -- Manual login pattern tests

All 9 non-project-skip tests in this file use manual login in `beforeEach` and then skip via conditional checks during test execution. These are active tests but may experience auth race conditions.

### content-performance.spec.js -- Feature-gated skips

| Line | Test Name | Skip Condition |
|------|-----------|---------------|
| 33 | (within Page Access) | "Content Performance page not accessible - may be feature-gated" |
| 48 | (within Page Access) | "Content Performance page not accessible" |
| 63 | (within Dashboard Components) | "Content Performance page not accessible" |
| 146 | (within Date Range Filtering) | "Content Performance page not accessible" |
| 200 | (within Top Scenes Section) | "Content Performance page not accessible" |
| 252 | (within Device Uptime Section) | "Content Performance page not accessible" |
| 297 | (within Error Handling) | "Content Performance page not accessible" |
| 317 | (within Error Handling) | "Content Performance page not accessible" |

### content-pipeline.spec.js -- Layouts navigation skip

| Line | Test Name | Skip Condition |
|------|-----------|---------------|
| 67 | `can access layouts page` | "Layouts button not visible in sidebar navigation" |
| 80 | `can create a new layout` | "Layouts button not visible in sidebar navigation" |

### industry-wizards.spec.js -- Service import and feature skips

| Line | Test Name | Skip Condition |
|------|-----------|---------------|
| 48 | (Service Functions) | "Service import not available in test context" |
| 60 | `wizard button is visible in scene editor toolbar` | Feature not visible |
| 69 | `wizard modal opens with industry options` | Feature not visible |
| 76 | `wizard modal shows form fields for selected wizard` | Feature not visible |
| 81 | `wizard modal shows preview in confirmation step` | Feature not visible |
| 88 | `industry quick start card appears for new users` | Feature not visible |
| 93 | `clicking industry in quick start opens wizard` | Feature not visible |
| 116-265 | 7 service logic tests | "Service not available in test context" |

### auth.spec.js -- Loading state tests

| Line | Test Name | Skip Condition |
|------|-----------|---------------|
| 90 | `shows loading state during login attempt` | Loading state too transient to test reliably |
| 181 | `shows loading state during signup attempt` | Loading state too transient to test reliably |

### smoke.spec.js and smoke-test-client.spec.js -- Conditional navigation skips

These files contain tests that skip based on runtime conditions (navigation elements not found, auth state issues). They are active tests with defensive skip guards.

---

## Action Summary

### Immediate (This Plan -- 43-01)
- [x] Delete `tests/e2e/debug.spec.js` (2 tests)
- [x] Delete `tests/e2e/feature-diagnostic.spec.js` (7 tests)
- [x] Delete `tests/e2e/location-diagnostic.spec.js` (1 test)

### Plan 43-02: Fix Skipped Tests
- Fix 8 `test.fixme` tests in audit.spec.js (update refresh/filter button selectors)
- Fix 5 auth pattern tests (replace loginAndPrepare with storage-state-compatible navigation)
- Re-enable polotno-editor.spec.js describe blocks if template cards are now accessible
- Update admin.spec.js conditional skips if Tenant Management button is now visible

### Plan 43-03: Document Remaining Skips
- Document 44 describe.skip tests for unimplemented features (billing, brand-theme, template-marketplace, alert-notification-flow)
- Document 30 blocked scene/scene-editor tests (pending sidebar navigation)
- Document 4 SEO/accessibility feature gaps
- Document 1 external dependency (Cloudinary)
- Document credential requirements (TEST_ENTERPRISE_EMAIL, TEST_RESELLER_EMAIL)
- Document usage dashboard as pending route wiring
- Add skip reason comments where missing

### No Action Required
- ~800 project-specific skips are correct behavior and need no changes
