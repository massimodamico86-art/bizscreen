---
phase: quick-58
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - tests/e2e/device-registration-flow.spec.js
  - .planning/quick/58-review-device-registration-flow-test-via/BUGS.md
  - .planning/quick/58-review-device-registration-flow-test-via/58-SUMMARY.md
autonomous: true
requirements: [QUICK-58]
must_haves:
  truths:
    - "Device registration flow is tested end-to-end via Playwright"
    - "All bugs found during review are documented in BUGS.md"
    - "Screens page, AddScreenModal, Player/PairPage, and PairDevicePage are all exercised"
  artifacts:
    - path: "tests/e2e/device-registration-flow.spec.js"
      provides: "Playwright E2E tests covering the full device registration flow"
    - path: ".planning/quick/58-review-device-registration-flow-test-via/BUGS.md"
      provides: "Bug report documenting any issues found"
  key_links:
    - from: "tests/e2e/device-registration-flow.spec.js"
      to: "src/pages/ScreensPage.jsx"
      via: "navigateToSection screens"
    - from: "tests/e2e/device-registration-flow.spec.js"
      to: "src/player/components/PairPage.jsx"
      via: "page.goto /player"
---

<objective>
Review the complete device registration flow in the BizScreen app, test it thoroughly via Playwright E2E tests, and document any bugs found in a BUGS.md file.

Purpose: Ensure the device registration/pairing flow works correctly end-to-end -- from creating a screen in the dashboard, through the player pairing page (QR + OTP modes), to the admin pair-device page.

Output: New Playwright test file covering the registration flow, plus BUGS.md documenting any issues discovered.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/pages/ScreensPage.jsx
@src/pages/components/ScreensComponents.jsx (AddScreenModal at line 525)
@src/player/components/PairPage.jsx
@src/player/components/PairingScreen.jsx
@src/pages/PairDevicePage.jsx
@src/pages/hooks/useScreensData.js
@src/services/screenService.js
@tests/e2e/screens.spec.js (existing screen tests for reference)
@tests/e2e/helpers.js (loginAndPrepare, navigateToSection helpers)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Review device registration flow and write comprehensive Playwright E2E tests</name>
  <files>tests/e2e/device-registration-flow.spec.js</files>
  <action>
Review the complete device registration flow by reading all relevant source files, then write a comprehensive Playwright E2E test file that exercises the full flow.

The device registration flow has 3 main paths to test:

**Path A: Dashboard -- Add Screen Modal**
1. Navigate to Screens page (authenticated)
2. Click "Add Screen" button
3. Verify the AddScreenModal opens with name input and "What happens next" instructions
4. Submit with a screen name
5. Verify success state shows pairing code (OTP), copy button, and connection instructions
6. Verify "Done - View Screen" button closes modal
7. Test validation: submitting with empty name should not work (button disabled)

**Path B: Player Pairing Page (public, no auth)**
1. Navigate to /player (no auth required)
2. Verify QR pairing screen loads by default with "Pair This Screen" text and QR code
3. Verify "How to Pair" instructions are shown
4. Click "Enter Pairing Code Manually" to switch to OTP mode
5. Verify OTP input appears with placeholder "ABC123"
6. Verify Connect button is disabled until 6 chars entered
7. Type lowercase -- verify auto-uppercase conversion
8. Enter invalid code "XXXXXX" and submit -- verify error message appears
9. Verify "Use QR code instead" link switches back to QR mode
10. Verify "Powered by BizScreen" branding is visible
11. Verify "Need help?" toggle shows help content

**Path C: Admin Pair Device Page (authenticated)**
1. Navigate to /pair/test-device-id-12345 (authenticated)
2. Verify loading state appears initially
3. Verify page shows "Pair Device" header with truncated device ID
4. Verify "Select Existing Screen" card with list of unpaired screens (or empty state)
5. Verify "or" divider between sections
6. Verify "Create New Screen" card with button to expand form
7. Click "Create New Screen" to expand -- verify name input appears
8. Verify "Optional: Set Kiosk PIN" card with checkbox and PIN input
9. Test PIN input: check checkbox, verify 4-digit input appears, type non-digits (should be filtered)

**Path D: Screens Page -- Master PIN Modal**
1. Navigate to Screens page
2. Click "Master PIN" button in header
3. Verify Master Kiosk PIN modal opens
4. Test validation: PIN must be 4 digits, PINs must match
5. Verify Cancel closes modal and resets fields

Use existing test patterns from tests/e2e/screens.spec.js:
- Import { loginAndPrepare, navigateToSection } from './helpers.js'
- Use test.skip for project filtering (chromium only for authenticated, public for player)
- Use reasonable timeouts (5-10s for visibility checks)
- Use .or() pattern for conditional states (table vs empty state)

Structure the test file with describe blocks for each path. Take screenshots at key points using the naming convention: `screenshots/58-NN-description.png` where NN is sequential.
  </action>
  <verify>
    <automated>npx playwright test tests/e2e/device-registration-flow.spec.js --project=chromium --reporter=list 2>&1 | tail -30</automated>
  </verify>
  <done>
All test scenarios pass or fail with documented reasons. Each path (A-D) has at least 2 test cases. Screenshots captured at key flow points.
  </done>
</task>

<task type="auto">
  <name>Task 2: Document bugs found during review and testing in BUGS.md</name>
  <files>.planning/quick/58-review-device-registration-flow-test-via/BUGS.md</files>
  <action>
Based on the code review and Playwright test results from Task 1, create a BUGS.md file documenting all issues found in the device registration flow.

For each bug, document:
- **BUG-ID**: Sequential ID (e.g., REG-01, REG-02)
- **Severity**: critical / major / minor / cosmetic
- **Component**: Which file/component is affected
- **Description**: What is wrong
- **Expected**: What should happen
- **Actual**: What actually happens
- **Screenshot**: Reference to screenshot if captured
- **Status**: open / fixed

Review these specific areas for potential issues:
1. AddScreenModal: Does the form reset properly when reopened? Is the OTP code displayed clearly?
2. PairPage: Does the QR polling work? Does error handling cover all cases? Is the OTP input accessible?
3. PairDevicePage: Does it handle missing/invalid deviceId gracefully? Does PIN validation work correctly?
4. Master PIN Modal: Does it validate correctly? Does the inline modal (not using design-system Modal) look consistent?
5. Cross-cutting: Are loading states shown? Do error messages make sense? Are there accessibility issues?

If NO bugs are found, still create BUGS.md stating "No bugs found" with a summary of what was tested.

Also note any code quality observations (not bugs) as "NOTES" at the bottom -- e.g., the Master PIN modal is hand-built instead of using the design-system Modal component, inline styles in PairPage vs Tailwind elsewhere.
  </action>
  <verify>
    <automated>test -f .planning/quick/58-review-device-registration-flow-test-via/BUGS.md && echo "BUGS.md exists" || echo "MISSING"</automated>
  </verify>
  <done>
BUGS.md exists with structured bug reports (or "no bugs found" statement). Each bug has severity, component, description, and expected/actual behavior. Code quality notes are documented separately from bugs.
  </done>
</task>

</tasks>

<verification>
- Playwright tests run without crashes (individual test failures due to mock data are acceptable and should be noted)
- BUGS.md is complete with all findings from both code review and test execution
- Screenshots directory has new 58-* prefixed screenshots from the test run
</verification>

<success_criteria>
- New E2E test file covers all 4 paths of the device registration flow (dashboard add, player pair, admin pair, master PIN)
- BUGS.md documents all issues found with proper severity ratings
- Test results are analyzed and any failures are explained (expected failures due to test environment vs actual bugs)
</success_criteria>

<output>
After completion, create `.planning/quick/58-review-device-registration-flow-test-via/58-SUMMARY.md`
</output>
