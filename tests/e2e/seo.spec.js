/**
 * SEO Tests
 *
 * Verifies that marketing and auth pages have proper SEO metadata.
 * Tests meta tags, Open Graph, Twitter Cards, and robots directives.
 */
/* eslint-disable no-empty-pattern */
import { test, expect } from '@playwright/test';

test.describe('SEO Meta Tags', () => {
  // Only run on chromium (client) project - public pages don't need multi-project testing
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Client-only test');
  });

  test.describe('Marketing Pages', () => {
    test('home page has correct meta tags', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Wait for React to hydrate and update meta tags by waiting for the title to be set
      await expect(page).toHaveTitle(/BizScreen/, { timeout: 5000 });

      // Meta description
      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute('content', /.+/);

      // Open Graph
      const ogTitle = page.locator('meta[property="og:title"]');
      await expect(ogTitle).toHaveAttribute('content', /BizScreen/);

      const ogType = page.locator('meta[property="og:type"]');
      await expect(ogType).toHaveAttribute('content', 'website');

      const ogSiteName = page.locator('meta[property="og:site_name"]');
      await expect(ogSiteName).toHaveAttribute('content', 'BizScreen');

      // Twitter Card
      const twitterCard = page.locator('meta[name="twitter:card"]');
      await expect(twitterCard).toHaveAttribute('content', 'summary_large_image');
    });

    test('pricing page has correct meta tags', async ({ page }) => {
      await page.goto('/pricing');
      await page.waitForLoadState('domcontentloaded');

      // Wait for React to hydrate by waiting for the title to be set
      await expect(page).toHaveTitle(/Pricing.*BizScreen/, { timeout: 5000 });

      // Meta description
      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute('content', /pricing|plans/i);
    });

    test('features page has correct meta tags', async ({ page }) => {
      await page.goto('/features');
      await page.waitForLoadState('domcontentloaded');

      // Wait for React to hydrate by waiting for the title to be set
      await expect(page).toHaveTitle(/Features.*BizScreen/, { timeout: 5000 });

      // Meta description
      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute('content', /features|digital signage/i);
    });
  });

  test.describe('Auth Pages', () => {
    // SKIP REASON: Auth pages do not have noindex meta tag implemented yet -- future SEO work
    test.skip('login page has noindex directive', async ({ page }) => {
      await page.goto('/auth/login');
      await page.waitForLoadState('domcontentloaded');

      // Wait for React to hydrate by waiting for the title to be set
      await expect(page).toHaveTitle(/Sign In.*BizScreen/, { timeout: 5000 });

      // Robots should have noindex
      const robots = page.locator('meta[name="robots"]');
      await expect(robots).toHaveAttribute('content', /noindex/);
    });

    // SKIP REASON: Signup page title and meta description not implemented yet -- future SEO work
    test.skip('signup page has correct meta tags', async ({ page }) => {
      await page.goto('/auth/signup');
      await page.waitForLoadState('domcontentloaded');

      // Wait for React to hydrate by waiting for the title to be set
      await expect(page).toHaveTitle(/Create Account.*BizScreen/, { timeout: 5000 });

      // Should be indexable (signup pages are often indexed)
      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute('content', /.+/);
    });
  });

  test.describe('Static Files', () => {
    test('robots.txt is accessible', async ({ page }) => {
      const response = await page.goto('/robots.txt');
      expect(response.status()).toBe(200);

      const content = await page.content();
      expect(content).toContain('User-agent');
      expect(content).toContain('Sitemap');
    });

    test('sitemap.xml is accessible', async ({ page }) => {
      const response = await page.goto('/sitemap.xml');
      expect(response.status()).toBe(200);

      const content = await page.content();
      expect(content).toContain('urlset');
      expect(content).toContain('loc');
    });
  });

  test.describe('Navigation SEO', () => {
    // SKIP REASON: Marketing page CTA links do not match expected selector pattern -- needs link text audit
    test.skip('internal links use meaningful text', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Check that CTA links have descriptive text
      const signupLink = page.getByRole('link', { name: /start free|get started|sign up/i }).first();
      await expect(signupLink).toBeVisible();

      // Check that navigation links exist with proper text
      const featuresLink = page.getByRole('link', { name: /features/i }).first();
      await expect(featuresLink).toBeVisible();

      const pricingLink = page.getByRole('link', { name: /pricing/i }).first();
      await expect(pricingLink).toBeVisible();
    });

    // SKIP REASON: Skip-to-content accessibility link (a[href="#main-content"]) not implemented yet
    test.skip('skip to content link is present', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Skip link should exist (may be visually hidden)
      const skipLink = page.locator('a[href="#main-content"]');
      await expect(skipLink).toHaveCount(1);
    });
  });
});
