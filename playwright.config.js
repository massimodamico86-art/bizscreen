import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

/**
 * Playwright E2E Test Configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Test file patterns
  testMatch: '**/*.spec.{js,ts}',

  // Global test timeout (60 seconds, up from 30s default)
  timeout: 60_000,

  // Expect timeout for assertions (10 seconds, up from 5s default)
  expect: {
    timeout: 10_000,
  },

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
  ],

  // Shared settings for all projects
  use: {
    // Base URL
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',

    // Action timeout (click, fill, etc) - 15 seconds
    actionTimeout: 15_000,

    // Navigation timeout - 30 seconds
    navigationTimeout: 30_000,

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshots on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry'
  },

  // Configure projects for browsers
  projects: [
    // Setup project runs first to authenticate and save session
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
    },
    // Client role (default) - standard tenant user
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use saved auth state from setup project
        storageState: 'playwright/.auth/client.json',
      },
      // Run setup project before chromium tests
      dependencies: ['setup'],
    },
    // Admin role - elevated permissions
    {
      name: 'chromium-admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/admin.json',
      },
      dependencies: ['setup'],
    },
    // Superadmin role - full platform access
    {
      name: 'chromium-superadmin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/superadmin.json',
      },
      dependencies: ['setup'],
    },
    // Viewport presets for responsive testing (Phase 92+)
    // Tests opt-in to these by using --project flag or test.describe config
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 667 },
        storageState: 'playwright/.auth/client.json',
      },
      dependencies: ['setup'],
      testMatch: /.*responsive.*\.spec\.js/,
    },
    {
      name: 'tablet',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        storageState: 'playwright/.auth/client.json',
      },
      dependencies: ['setup'],
      testMatch: /.*responsive.*\.spec\.js/,
    },
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        storageState: 'playwright/.auth/client.json',
      },
      dependencies: ['setup'],
      testMatch: /.*responsive.*\.spec\.js/,
    },
    // Uncomment for additional browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] }
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] }
    // }
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120 * 1000
  }
});
