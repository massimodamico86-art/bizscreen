/* eslint-disable react-hooks/rules-of-hooks */
/**
 * E2E Test Fixtures
 *
 * Custom Playwright fixtures for test isolation.
 *
 * NOTE: New test specs should import helpers from the unified barrel:
 *   import { screenshotStep, loginAndPrepare, VIEWPORTS } from '../helpers/index.js';
 * This provides both screenshot helpers and all existing test utilities.
 *
 * USAGE PATTERNS:
 *
 * 1. For authenticated tests (most common):
 *    ```javascript
 *    import { test, expect } from './fixtures/index.js';
 *
 *    test('my authenticated test', async ({ authenticatedPage }) => {
 *      // authenticatedPage already called loginAndPrepare() before the test body
 *    });
 *    ```
 *
 * 2. For unauthenticated tests (login flows, public pages):
 *    ```javascript
 *    import { test, expect } from './fixtures/index.js';
 *
 *    test.describe('Login Flow', () => {
 *      test.use({ storageState: { cookies: [], origins: [] } });
 *
 *      test('shows login page', async ({ page }) => {
 *        // page has clean state, no auth
 *      });
 *    });
 *    ```
 *
 * 3. For single tests needing fresh context:
 *    ```javascript
 *    import { test, expect } from './fixtures/index.js';
 *
 *    test('isolated test', async ({ freshPage }) => {
 *      // freshPage is a completely new context
 *    });
 *    ```
 *
 * 4. For tests needing explicit login:
 *    ```javascript
 *    import { test, expect } from './fixtures/index.js';
 *
 *    test('with manual login', async ({ authenticatedPage }) => {
 *      // authenticatedPage already called loginAndPrepare()
 *    });
 *    ```
 *
 * FIXTURES PROVIDED:
 * - authenticatedPage: Logs in via loginAndPrepare() and prepares the page
 * - freshPage: Creates a completely clean browser context (no cookies/storage)
 *
 * Note: ESLint rule disabled because Playwright's `use` fixture callback
 * is incorrectly flagged as a React Hook by eslint-plugin-react-hooks.
 */

import { test as base, expect } from '@playwright/test';
import { loginAndPrepare } from '../helpers.js';

export const test = base.extend({
  /**
   * Authenticated page fixture
   *
   * Calls loginAndPrepare() on the per-test page (no storageState in project config)
   * so the page is logged in and ready for testing. Credentials come from
   * TEST_USER_EMAIL / TEST_USER_PASSWORD env vars.
   *
   * @example
   * test('authenticated test', async ({ authenticatedPage }) => {
   *   await authenticatedPage.goto('/app/dashboard');
   * });
   */
  authenticatedPage: async ({ page }, use) => {
    await loginAndPrepare(page);
    await use(page);
  },

  /**
   * Fresh page fixture for unauthenticated tests
   *
   * Creates a new browser context with empty storage state, providing
   * complete isolation from any cached authentication or session data.
   * The context is automatically closed after the test.
   *
   * @example
   * test('unauthenticated test', async ({ freshPage }) => {
   *   await freshPage.goto('/auth/login');
   *   // Test login flow with no pre-existing session
   * });
   */
  freshPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] }
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };

// Phase 161 additions — required by layouts-screenshots.spec.js
export const LAYOUT_PRESETS = ['Full Screen', 'Two Columns', 'Three Columns', 'Main + Sidebar', 'Header + Content', 'L-Shape', 'Quadrant'];
export const WIDGET_TYPES = ['Clock', 'Weather', 'RSS Feed', 'Web Page', 'QR Code', 'Countdown', 'Google Sheets', 'YouTube', 'Social Feed'];
export const TEST_LAYOUT_PREFIX = 'E2E-Layout';
