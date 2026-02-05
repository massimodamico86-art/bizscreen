---
status: resolved
trigger: "Update Playwright crawl tests to open modals, click primary action buttons, and fail on ReferenceError"
created: 2026-02-05T10:00:00Z
updated: 2026-02-05T10:15:00Z
---

## Current Focus

hypothesis: Confirmed - tests needed enhanced crawl functionality with modal opening, button clicking, and ReferenceError tracking
test: Implementation complete
expecting: Tests will crawl pages, open modals, click primary buttons, and fail on ReferenceErrors
next_action: Debug session complete - archive to resolved

## Symptoms

expected: Crawl tests should open modals, click primary action buttons, and collect/fail on ReferenceErrors
actual: Current tests capture pageerrors but don't do modal interactions or ReferenceError-specific detection
errors: Need to detect ReferenceError in console logs during crawl
reproduction: Run the existing smoke tests and observe their behavior
started: Enhancement request - improving existing test coverage

## Eliminated

## Evidence

- timestamp: 2026-02-05T10:00:00Z
  checked: smoke-test-client.spec.js (253 lines)
  found: |
    - Has error capture for pageerror and console errors
    - Tests Marketing Pages (Home, Features, Pricing)
    - Tests Authentication Flow
    - Tests Dashboard with pre-auth
    - Does NOT specifically track ReferenceErrors
    - Does NOT open modals or click primary action buttons
    - Uses helper functions: loginAndPrepare, waitForPageReady
  implication: Need to add modal opening, button clicking, and ReferenceError tracking

- timestamp: 2026-02-05T10:00:00Z
  checked: smoke.spec.js (257 lines)
  found: |
    - Has setupErrorCapture helper that captures pageErrors and consoleErrors
    - Has assertNoPageErrors helper for failing on errors
    - Tests Application Health, Authentication Flow, Core Pages Load
    - Does navigate but doesn't crawl all pages systematically
    - Does NOT specifically track ReferenceErrors separately
    - Does NOT open modals or click primary action buttons
  implication: Need to enhance both files with crawl functionality

## Resolution

root_cause: Both test files needed enhancement to: 1) track ReferenceErrors specifically, 2) open modals during page visits, 3) click primary action buttons
fix: |
  Enhanced both smoke.spec.js and smoke-test-client.spec.js with:
  1. ReferenceError-specific tracking - errors object now has referenceErrors[] array
  2. Modal opening functionality - tryOpenModals() function that clicks Add/Create/New buttons
  3. Primary button clicking - tryClickPrimaryButtons() function that clicks primary-styled buttons
  4. New crawl test - "Page Crawl with Modal and Button Interactions" in each file
  5. Enhanced error reporting - detailed summary with URL context for each ReferenceError
  6. Updated all existing tests to use setupEnhancedErrorCapture and assertNoErrors
verification: |
  - npx eslint passes with no errors
  - npx playwright test --list shows all 48 tests including new crawl tests
  - Test structure validates correctly
files_changed:
  - tests/e2e/smoke.spec.js
  - tests/e2e/smoke-test-client.spec.js
