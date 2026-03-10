/**
 * Admin, Reseller & Feature Flags Screenshot Tests
 *
 * Captures screenshot evidence covering ADMIN-01 through ADMIN-08:
 * - ADMIN-01: Admin tenant list with search input and tenant entries
 * - ADMIN-02: Admin tenant detail page with usage stats
 * - ADMIN-03: Admin audit log with filterable events
 * - ADMIN-04: Admin system events page
 * - ADMIN-05: Admin template management page
 * - ADMIN-06: Reseller dashboard with client overview (or feature gate)
 * - ADMIN-07: Reseller billing page (or feature gate)
 * - ADMIN-08: Feature flags page with toggle switches
 *
 * Screenshots saved to screenshots/121/ using screenshotStep helper.
 * Step numbers use 16-23 range for this plan.
 *
 * Uses page.route() to mock Supabase REST API for admin data.
 */

import { test } from './fixtures/index.js';
import {
  screenshotStep,
  loginAndPrepare,
  waitForPageReady,
  dismissAnyModals,
} from './helpers/index.js';

// ---------------------------------------------------------------------------
// Mock data constants
// ---------------------------------------------------------------------------

const MOCK_TENANTS = [
  { id: 'tenant-001', business_name: 'Acme Restaurants', plan: 'professional', screen_count: 12, status: 'active', created_at: '2025-06-15T10:00:00Z', owner_email: 'owner@acme.com' },
  { id: 'tenant-002', business_name: 'RetailCo Displays', plan: 'enterprise', screen_count: 48, status: 'active', created_at: '2025-08-20T14:00:00Z', owner_email: 'admin@retailco.com' },
  { id: 'tenant-003', business_name: 'CoffeeShop Chain', plan: 'starter', screen_count: 3, status: 'active', created_at: '2025-11-01T09:00:00Z', owner_email: 'hello@coffeeshop.com' },
  { id: 'tenant-004', business_name: 'Gym Network', plan: 'professional', screen_count: 8, status: 'suspended', created_at: '2025-09-10T16:00:00Z', owner_email: 'tech@gymnet.com' },
  { id: 'tenant-005', business_name: 'Hotel Group', plan: 'enterprise', screen_count: 32, status: 'active', created_at: '2025-07-22T11:00:00Z', owner_email: 'it@hotelgroup.com' },
];

const MOCK_TENANT_DETAIL = {
  id: 'tenant-001', business_name: 'Acme Restaurants', plan: 'professional',
  screen_count: 12, media_count: 245, playlist_count: 8, layout_count: 5,
  storage_used_gb: 12.5, storage_limit_gb: 100,
  status: 'active', created_at: '2025-06-15T10:00:00Z',
  owner_email: 'owner@acme.com', owner_name: 'John Smith',
  last_activity_at: '2026-03-09T16:00:00Z',
  monthly_plays: 52400, active_screens: 11,
};

const MOCK_AUDIT_EVENTS = [
  { id: 'ae-001', event_type: 'tenant_created', actor_email: 'superadmin@bizscreen.com', target: 'Acme Restaurants', details: 'New tenant provisioned', created_at: '2026-03-09T16:00:00Z' },
  { id: 'ae-002', event_type: 'plan_changed', actor_email: 'superadmin@bizscreen.com', target: 'RetailCo Displays', details: 'Upgraded from professional to enterprise', created_at: '2026-03-09T14:00:00Z' },
  { id: 'ae-003', event_type: 'user_suspended', actor_email: 'admin@bizscreen.com', target: 'tech@gymnet.com', details: 'Account suspended for non-payment', created_at: '2026-03-08T10:00:00Z' },
  { id: 'ae-004', event_type: 'template_published', actor_email: 'content@bizscreen.com', target: 'Holiday Sale Template', details: 'Template published to marketplace', created_at: '2026-03-07T12:00:00Z' },
];

const MOCK_SYSTEM_EVENTS = [
  { id: 'se-001', event_type: 'deployment', message: 'Version 13.0.1 deployed successfully', severity: 'info', created_at: '2026-03-09T08:00:00Z' },
  { id: 'se-002', event_type: 'database_migration', message: 'Migration 20260309 completed', severity: 'info', created_at: '2026-03-09T06:00:00Z' },
  { id: 'se-003', event_type: 'high_load', message: 'API response times elevated (p95 > 2s)', severity: 'warning', created_at: '2026-03-08T22:00:00Z' },
  { id: 'se-004', event_type: 'service_restart', message: 'Content delivery service restarted', severity: 'warning', created_at: '2026-03-08T20:00:00Z' },
];

const MOCK_ADMIN_TEMPLATES = [
  { id: 'at-001', name: 'Restaurant Menu', category: 'food', status: 'published', usage_count: 145, created_at: '2025-12-01T10:00:00Z' },
  { id: 'at-002', name: 'Retail Promo', category: 'retail', status: 'published', usage_count: 230, created_at: '2025-11-15T14:00:00Z' },
  { id: 'at-003', name: 'Corporate Lobby', category: 'corporate', status: 'draft', usage_count: 0, created_at: '2026-03-01T09:00:00Z' },
];

const MOCK_RESELLER_CLIENTS = [
  { id: 'rc-001', business_name: 'Client Alpha', screens: 15, plan: 'professional', status: 'active', revenue_monthly: 14900 },
  { id: 'rc-002', business_name: 'Client Beta', screens: 8, plan: 'starter', status: 'active', revenue_monthly: 4900 },
  { id: 'rc-003', business_name: 'Client Gamma', screens: 25, plan: 'enterprise', status: 'active', revenue_monthly: 24900 },
];

const MOCK_RESELLER_BILLING = {
  total_revenue: 44700, commission_rate: 0.20, commission_earned: 8940,
  payout_status: 'pending', next_payout_date: '2026-04-01T00:00:00Z',
  invoices: [
    { id: 'inv-001', amount: 8940, status: 'paid', date: '2026-03-01T00:00:00Z' },
    { id: 'inv-002', amount: 7500, status: 'paid', date: '2026-02-01T00:00:00Z' },
  ],
};

const MOCK_FEATURE_FLAGS = [
  { id: 'ff-001', key: 'new_dashboard_v2', name: 'New Dashboard V2', enabled: true, description: 'Redesigned dashboard with analytics widgets' },
  { id: 'ff-002', key: 'ai_content_gen', name: 'AI Content Generation', enabled: false, description: 'Generate content using AI prompts' },
  { id: 'ff-003', key: 'batch_upload', name: 'Batch Upload', enabled: true, description: 'Upload multiple files simultaneously' },
  { id: 'ff-004', key: 'advanced_scheduling', name: 'Advanced Scheduling', enabled: false, description: 'Priority-based schedule conflict resolution' },
];

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

async function setupAdminMocking(page) {
  // Mock tenants list
  await page.route('**/rest/v1/tenants*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TENANTS),
    });
  });

  // Mock tenant detail RPC
  await page.route('**/rest/v1/rpc/get_tenant_detail*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TENANT_DETAIL),
    });
  });

  // Mock list_tenants RPC
  await page.route('**/rest/v1/rpc/list_tenants*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TENANTS),
    });
  });

  // Mock audit events
  await page.route('**/rest/v1/audit_events*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_AUDIT_EVENTS),
    });
  });

  // Mock system events
  await page.route('**/rest/v1/system_events*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SYSTEM_EVENTS),
    });
  });

  // Mock admin templates
  await page.route('**/rest/v1/admin_templates*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ADMIN_TEMPLATES),
    });
  });

  // Mock reseller clients
  await page.route('**/rest/v1/reseller_clients*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_RESELLER_CLIENTS),
    });
  });

  // Mock reseller billing RPC
  await page.route('**/rest/v1/rpc/get_reseller_billing*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_RESELLER_BILLING),
    });
  });

  // Mock feature flags
  await page.route('**/rest/v1/feature_flags*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_FEATURE_FLAGS),
    });
  });

  // Mock effective limits
  await page.route('**/rest/v1/rpc/get_effective_limits*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ max_screens: 50 }),
    });
  });
}

// ---------------------------------------------------------------------------
// Helper for feature-gated page navigation
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

test.describe('Admin & Reseller Screenshot Tests', () => {

  test('ADMIN-01: captures admin tenant list with search and pagination', async ({ page }) => {
    await loginAndPrepare(page);
    await setupAdminMocking(page);

    await page.evaluate(() => window.__setCurrentPage('admin-tenants'));
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Wait for tenant list or search input to render
    await Promise.race([
      page.getByText('Acme Restaurants').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      page.locator('input[type="search"], input[placeholder*="earch"]').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      page.waitForTimeout(3000),
    ]);

    await screenshotStep(page, '121', '16-admin-tenants-list');
  });

  test('ADMIN-02: captures admin tenant detail with usage stats', async ({ page }) => {
    await loginAndPrepare(page);
    await setupAdminMocking(page);

    await page.evaluate(() => window.__setCurrentPage('admin-tenant-tenant-001'));
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Wait for tenant detail content
    await Promise.race([
      page.getByText('Acme Restaurants').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      page.getByText('owner@acme.com').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      page.waitForTimeout(3000),
    ]);

    await screenshotStep(page, '121', '17-admin-tenant-detail');
  });

  test('ADMIN-03: captures admin audit log with filterable events', async ({ page }) => {
    await loginAndPrepare(page);
    await setupAdminMocking(page);

    await page.evaluate(() => window.__setCurrentPage('admin-audit-logs'));
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Wait for audit event entries or heading
    await Promise.race([
      page.getByText('tenant_created').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      page.getByText(/audit/i).first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      page.waitForTimeout(3000),
    ]);

    await screenshotStep(page, '121', '18-admin-audit-log');
  });

  test('ADMIN-04: captures admin system events page', async ({ page }) => {
    await loginAndPrepare(page);
    await setupAdminMocking(page);

    await page.evaluate(() => window.__setCurrentPage('admin-system-events'));
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Wait for system event entries or heading
    await Promise.race([
      page.getByText('deployment').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      page.getByText(/system.*event/i).first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      page.waitForTimeout(3000),
    ]);

    await screenshotStep(page, '121', '19-admin-system-events');
  });

  test('ADMIN-05: captures admin template management', async ({ page }) => {
    await loginAndPrepare(page);
    await setupAdminMocking(page);

    await page.evaluate(() => window.__setCurrentPage('admin-templates'));
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Wait for template list or management heading
    await Promise.race([
      page.getByText('Restaurant Menu').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      page.getByText(/template/i).first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      page.waitForTimeout(3000),
    ]);

    await screenshotStep(page, '121', '20-admin-templates');
  });

  test('ADMIN-06: captures reseller dashboard with client overview', async ({ page }) => {
    await loginAndPrepare(page);
    await setupAdminMocking(page);

    const result = await navigateToFeatureGatedPage(page, 'reseller-dashboard', '21');
    if (result.gated) {
      // Feature gated -- screenshot already taken by helper
      return;
    }

    await dismissAnyModals(page);

    // Wait for client list or dashboard heading
    await Promise.race([
      page.getByText('Client Alpha').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      page.getByText(/reseller/i).first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      page.waitForTimeout(3000),
    ]);

    await screenshotStep(page, '121', '21-reseller-dashboard');
  });

  test('ADMIN-07: captures reseller billing page', async ({ page }) => {
    await loginAndPrepare(page);
    await setupAdminMocking(page);

    const result = await navigateToFeatureGatedPage(page, 'reseller-billing', '22');
    if (result.gated) {
      // Feature gated -- screenshot already taken by helper
      return;
    }

    await dismissAnyModals(page);

    // Wait for billing info or invoice list
    await Promise.race([
      page.getByText(/commission/i).first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      page.getByText(/billing/i).first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      page.waitForTimeout(3000),
    ]);

    await screenshotStep(page, '121', '22-reseller-billing');
  });

  test('ADMIN-08: captures feature flags page with toggle switches', async ({ page }) => {
    await loginAndPrepare(page);
    await setupAdminMocking(page);

    await page.evaluate(() => window.__setCurrentPage('feature-flags'));
    await waitForPageReady(page);
    await dismissAnyModals(page);

    // Wait for feature flag list with toggle switches
    await Promise.race([
      page.getByText('New Dashboard V2').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      page.getByText(/feature.*flag/i).first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      page.waitForTimeout(3000),
    ]);

    await screenshotStep(page, '121', '23-feature-flags');
  });
});
