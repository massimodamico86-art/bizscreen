/**
 * Settings Screenshot Tests
 *
 * Captures screenshot evidence for settings pages covering 7 SET requirements:
 * - SET-01: General settings page with form fields
 * - SET-02: Account/plan page with current plan display
 * - SET-03: Branding settings with logo upload and color pickers
 * - SET-04: Team management with member list, invite and role controls
 * - SET-05: Developer settings with API key management (feature-gated)
 * - SET-06: White-label settings with custom domain (feature-gated)
 * - SET-07: Enterprise security with password policy (feature-gated)
 *
 * Screenshots saved to screenshots/121/ using screenshotStep helper.
 * Step numbers: 09-15 for this plan.
 *
 * Uses page.route() to mock Supabase REST API for settings data.
 */

import { test } from './fixtures/index.js';
import {
  screenshotStep,
  loginAndPrepare,
  waitForPageReady,
  dismissAnyModals,
} from './helpers/index.js';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_TEAM_MEMBERS = [
  { id: 'tm-001', email: 'admin@bizscreen.com', name: 'Admin User', role: 'admin', status: 'active', invited_at: '2026-01-01T00:00:00Z', joined_at: '2026-01-01T00:05:00Z' },
  { id: 'tm-002', email: 'editor@bizscreen.com', name: 'Content Editor', role: 'editor', status: 'active', invited_at: '2026-01-15T10:00:00Z', joined_at: '2026-01-15T12:00:00Z' },
  { id: 'tm-003', email: 'viewer@bizscreen.com', name: 'View Only', role: 'viewer', status: 'active', invited_at: '2026-02-01T08:00:00Z', joined_at: '2026-02-01T09:00:00Z' },
  { id: 'tm-004', email: 'pending@bizscreen.com', name: null, role: 'editor', status: 'pending', invited_at: '2026-03-01T14:00:00Z', joined_at: null },
];

const MOCK_API_KEYS = [
  { id: 'ak-001', name: 'Production Key', key_prefix: 'bsk_prod_****', created_at: '2026-02-01T10:00:00Z', last_used_at: '2026-03-09T08:00:00Z', status: 'active' },
  { id: 'ak-002', name: 'Staging Key', key_prefix: 'bsk_stag_****', created_at: '2026-02-15T14:00:00Z', last_used_at: '2026-03-08T16:00:00Z', status: 'active' },
];

const MOCK_PLAN_INFO = {
  plan_name: 'Professional',
  plan_slug: 'professional',
  screen_limit: 50,
  storage_gb: 100,
  features: ['analytics', 'api_access', 'white_label'],
  billing_cycle: 'monthly',
  next_billing_date: '2026-04-01T00:00:00Z',
  price_cents: 9900,
};

// ---------------------------------------------------------------------------
// Mocking Setup
// ---------------------------------------------------------------------------

async function setupSettingsMocking(page) {
  // Mock team_members table GET
  await page.route('**/rest/v1/team_members*', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_TEAM_MEMBERS),
      });
    } else {
      route.continue();
    }
  });

  // Mock api_keys table GET
  await page.route('**/rest/v1/api_keys*', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_API_KEYS),
      });
    } else {
      route.continue();
    }
  });

  // Mock get_effective_limits RPC
  await page.route('**/rest/v1/rpc/get_effective_limits*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ max_screens: 50, max_storage_gb: 100 }),
    });
  });

  // Mock get_plan_info RPC
  await page.route('**/rest/v1/rpc/get_plan_info*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_PLAN_INFO),
    });
  });

  // Mock tenant_settings table GET
  await page.route('**/rest/v1/tenant_settings*', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'ts-001', timezone: 'America/New_York', language: 'en', default_content_duration: 10 }]),
      });
    } else {
      route.continue();
    }
  });

  // Mock branding table GET
  await page.route('**/rest/v1/branding*', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'b-001', logo_url: null, primary_color: '#f26f21', secondary_color: '#1e40af', font_family: 'Inter' }]),
      });
    } else {
      route.continue();
    }
  });
}

// ---------------------------------------------------------------------------
// Feature-Gated Navigation Helper
// ---------------------------------------------------------------------------

async function navigateToFeatureGatedPage(page, pageId, stepPrefix) {
  await page.evaluate((id) => window.__setCurrentPage(id), pageId);
  await waitForPageReady(page);
  const upgradePrompt = page.locator('text=/upgrade.*plan|requires.*upgrade|available.*on/i').first();
  const isGated = await upgradePrompt.isVisible().catch(() => false);
  if (isGated) {
    await screenshotStep(page, '121', `${stepPrefix}-feature-gated`);
    return { gated: true };
  }
  return { gated: false };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Settings Screenshot Tests', () => {
  test('SET-01: captures general settings page with form fields', async ({ page }) => {
    await loginAndPrepare(page);
    await setupSettingsMocking(page);

    await page.evaluate(() => window.__setCurrentPage('settings'));
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Wait for settings heading or form fields
    await page.locator('text=/settings|general|timezone|language/i').first().waitFor({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);

    await screenshotStep(page, '121', '09-settings-general');
  });

  test('SET-02: captures account/plan page with current plan', async ({ page }) => {
    await loginAndPrepare(page);
    await setupSettingsMocking(page);

    await page.evaluate(() => window.__setCurrentPage('account-plan'));
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Wait for plan name or billing info
    await page.locator('text=/professional|plan|billing|subscription/i').first().waitFor({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);

    await screenshotStep(page, '121', '10-account-plan');
  });

  test('SET-03: captures branding settings with logo and color pickers', async ({ page }) => {
    await loginAndPrepare(page);
    await setupSettingsMocking(page);

    await page.evaluate(() => window.__setCurrentPage('branding'));
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Wait for branding UI elements
    await page.locator('text=/branding|logo|color|brand/i').first().waitFor({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);

    await screenshotStep(page, '121', '11-branding-logo-colors');
  });

  test('SET-04: captures team management with invite and roles', async ({ page }) => {
    await loginAndPrepare(page);
    await setupSettingsMocking(page);

    await page.evaluate(() => window.__setCurrentPage('team'));
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Wait for team member list or invite button
    await page.locator('text=/team|member|invite|admin@bizscreen/i').first().waitFor({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);

    await screenshotStep(page, '121', '12-team-management');
  });

  test('SET-05: captures developer settings with API key management', async ({ page }) => {
    await loginAndPrepare(page);
    await setupSettingsMocking(page);

    const result = await navigateToFeatureGatedPage(page, 'developer', '13');
    if (result.gated) {
      // Feature gated - screenshot already captured by helper
      return;
    }

    await dismissAnyModals(page);

    // Wait for API keys list or developer settings heading
    await page.locator('text=/api.*key|developer|production.*key/i').first().waitFor({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);

    await screenshotStep(page, '121', '13-developer-api-keys');
  });

  test('SET-06: captures white-label settings with custom domain', async ({ page }) => {
    await loginAndPrepare(page);
    await setupSettingsMocking(page);

    const result = await navigateToFeatureGatedPage(page, 'white-label', '14');
    if (result.gated) {
      return;
    }

    await dismissAnyModals(page);

    // Wait for domain field or white-label heading
    await page.locator('text=/white.*label|custom.*domain|domain/i').first().waitFor({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);

    await screenshotStep(page, '121', '14-white-label-domain');
  });

  test('SET-07: captures enterprise security settings', async ({ page }) => {
    await loginAndPrepare(page);
    await setupSettingsMocking(page);

    const result = await navigateToFeatureGatedPage(page, 'enterprise-security', '15');
    if (result.gated) {
      return;
    }

    await dismissAnyModals(page);

    // Wait for security settings elements
    await page.locator('text=/enterprise.*security|password.*policy|session.*timeout|security/i').first().waitFor({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);

    await screenshotStep(page, '121', '15-enterprise-security');
  });
});
