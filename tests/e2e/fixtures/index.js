/* eslint-disable react-hooks/rules-of-hooks */
/**
 * Custom Playwright Test Fixtures
 *
 * Extends base Playwright test with custom fixtures for test isolation.
 * - authenticatedPage: Uses existing storage state and prepares the page
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
   * Uses the page from context (which already has storage state from project config)
   * and calls loginAndPrepare to ensure the page is ready for testing.
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
