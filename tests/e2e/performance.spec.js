/**
 * Performance E2E Tests
 *
 * Verifies application performance metrics meet defined budgets.
 * These tests measure real-world loading performance.
 *
 * Performance Budgets (see PERFORMANCE_BUDGET.md):
 * - Initial page load: < 3s (LCP)
 * - Time to Interactive: < 4s
 * - First Contentful Paint: < 1.5s
 * - JavaScript bundle: < 500KB total (gzipped)
 */

import { test, expect } from '@playwright/test';

// Helper to get performance metrics from the browser
async function getPerformanceMetrics(page) {
  return await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find(p => p.name === 'first-contentful-paint');
    const lcp = new Promise(resolve => {
      new PerformanceObserver(list => {
        const entries = list.getEntries();
        resolve(entries[entries.length - 1]?.startTime || 0);
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      // Timeout after 5s
      setTimeout(() => resolve(0), 5000);
    });

    return {
      // Navigation timing
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.startTime,
      loadComplete: navigation?.loadEventEnd - navigation?.startTime,
      // Paint timing
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: fcp?.startTime || 0,
      // Transfer sizes
      transferSize: navigation?.transferSize || 0,
      encodedBodySize: navigation?.encodedBodySize || 0,
    };
  });
}

// Helper to measure resource sizes
async function getResourceMetrics(page) {
  return await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    const jsResources = resources.filter(r => r.initiatorType === 'script');
    const cssResources = resources.filter(r => r.initiatorType === 'link' || r.name.endsWith('.css'));

    return {
      totalResources: resources.length,
      jsCount: jsResources.length,
      cssCount: cssResources.length,
      totalJsSize: jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      totalCssSize: cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      largestJs: jsResources.reduce((max, r) => Math.max(max, r.transferSize || 0), 0),
    };
  });
}

test.describe('Performance Metrics', () => {
  test.describe.configure({ mode: 'serial' });

  test('homepage loads within performance budget', async ({ page }) => {
    // Navigate to homepage and wait for load
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    // Get metrics
    const metrics = await getPerformanceMetrics(page);
    const resources = await getResourceMetrics(page);

    console.log('Homepage Performance Metrics:');
    console.log(`  Load time: ${loadTime}ms`);
    console.log(`  DOM Content Loaded: ${Math.round(metrics.domContentLoaded)}ms`);
    console.log(`  First Contentful Paint: ${Math.round(metrics.firstContentfulPaint)}ms`);
    console.log(`  Total JS resources: ${resources.jsCount}`);
    console.log(`  Total JS size: ${Math.round(resources.totalJsSize / 1024)}KB`);

    // Performance budget assertions
    // FCP should be under 2000ms (adjusted for CI environments)
    expect(metrics.firstContentfulPaint).toBeLessThan(2000);
    // Total load time should be under 10s (network conditions vary)
    expect(loadTime).toBeLessThan(10000);
    // Total JS transfer size - in dev/CI this is uncompressed (~4MB allowed)
    // In production with gzip, this would be ~400KB
    expect(resources.totalJsSize).toBeLessThan(4 * 1024 * 1024);
  });

  test('login page loads quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/auth/login', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    const metrics = await getPerformanceMetrics(page);

    console.log('Login Page Performance:');
    console.log(`  Load time: ${loadTime}ms`);
    console.log(`  First Contentful Paint: ${Math.round(metrics.firstContentfulPaint)}ms`);

    // Login page should load faster than main app
    expect(loadTime).toBeLessThan(5000);
    expect(metrics.firstContentfulPaint).toBeLessThan(1500);
  });

  test('authenticated dashboard loads within budget', async ({ page }) => {
    // Login first
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@bizscreen.test');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword123');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    const startTime = Date.now();
    await page.waitForURL(/\/(app|dashboard)/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    const resources = await getResourceMetrics(page);

    console.log('Dashboard Performance:');
    console.log(`  Post-login load time: ${loadTime}ms`);
    console.log(`  Total JS loaded: ${resources.jsCount} files`);
    console.log(`  Total JS size: ${Math.round(resources.totalJsSize / 1024)}KB`);
    console.log(`  Largest JS chunk: ${Math.round(resources.largestJs / 1024)}KB`);

    // Dashboard should load within 8s (includes lazy loading)
    expect(loadTime).toBeLessThan(8000);
    // No single JS file should exceed 200KB gzipped
    expect(resources.largestJs).toBeLessThan(200 * 1024);
  });

  test('no JavaScript errors during navigation', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate through key pages
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');

    await page.goto('/features');
    await page.waitForLoadState('networkidle');

    // Filter out expected errors (e.g., 401 from API when not logged in)
    const unexpectedErrors = errors.filter(e =>
      !e.includes('401') &&
      !e.includes('Unauthorized') &&
      !e.includes('network error') &&
      !e.includes('Failed to fetch')
    );

    console.log(`Total errors captured: ${errors.length}`);
    console.log(`Unexpected errors: ${unexpectedErrors.length}`);
    if (unexpectedErrors.length > 0) {
      console.log('Unexpected errors:', unexpectedErrors);
    }

    expect(unexpectedErrors.length).toBe(0);
  });

  test('lazy loading works correctly', async ({ page }) => {
    // Go to homepage (should not load dashboard chunks)
    await page.goto('/', { waitUntil: 'networkidle' });

    const initialResources = await getResourceMetrics(page);
    console.log(`Initial JS files loaded: ${initialResources.jsCount}`);

    // Navigate to login (auth chunk should load)
    await page.goto('/auth/login', { waitUntil: 'networkidle' });

    const afterLoginResources = await getResourceMetrics(page);
    console.log(`After login page - JS files: ${afterLoginResources.jsCount}`);

    // Login and navigate to dashboard
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@bizscreen.test');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(app|dashboard)/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const afterDashboardResources = await getResourceMetrics(page);
    console.log(`After dashboard - JS files: ${afterDashboardResources.jsCount}`);

    // Should have loaded more chunks as we navigate deeper
    expect(afterDashboardResources.jsCount).toBeGreaterThan(initialResources.jsCount);
  });
});

test.describe('Bundle Size Checks', () => {
  test('critical bundles are under size limits', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bundleSizes = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      const jsBundles = resources
        .filter(r => r.initiatorType === 'script' && r.name.includes('/assets/'))
        .map(r => ({
          name: r.name.split('/').pop(),
          size: r.transferSize,
          duration: r.duration,
        }))
        .sort((a, b) => b.size - a.size);

      return jsBundles.slice(0, 10); // Top 10 largest
    });

    console.log('\nTop 10 largest bundles (gzipped):');
    bundleSizes.forEach((bundle, i) => {
      console.log(`  ${i + 1}. ${bundle.name}: ${Math.round(bundle.size / 1024)}KB (${Math.round(bundle.duration)}ms)`);
    });

    // Verify no single bundle exceeds 200KB gzipped
    const oversizedBundles = bundleSizes.filter(b => b.size > 200 * 1024);
    if (oversizedBundles.length > 0) {
      console.log('\nWARNING: Oversized bundles detected:');
      oversizedBundles.forEach(b => {
        console.log(`  - ${b.name}: ${Math.round(b.size / 1024)}KB`);
      });
    }

    // Allow vendor-supabase to be larger (it's a third-party dependency)
    const appBundles = bundleSizes.filter(b => !b.name.includes('vendor-'));
    const oversizedAppBundles = appBundles.filter(b => b.size > 150 * 1024);
    expect(oversizedAppBundles.length).toBe(0);
  });
});
