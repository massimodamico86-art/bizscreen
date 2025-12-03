/**
 * SEO Tests
 *
 * Verifies that marketing and auth pages have proper SEO metadata.
 * Tests meta tags, Open Graph, Twitter Cards, and robots directives.
 */
import { test, expect } from '@playwright/test';

test.describe('SEO Meta Tags', () => {
  test.describe('Marketing Pages', () => {
    test('home page has correct meta tags', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Wait for React to hydrate and update meta tags
      await page.waitForTimeout(500);

      // Title
      await expect(page).toHaveTitle(/BizScreen/);

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
      await page.waitForTimeout(500);

      // Title
      await expect(page).toHaveTitle(/Pricing.*BizScreen/);

      // Meta description
      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute('content', /pricing|plans/i);
    });

    test('features page has correct meta tags', async ({ page }) => {
      await page.goto('/features');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Title
      await expect(page).toHaveTitle(/Features.*BizScreen/);

      // Meta description
      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute('content', /features|digital signage/i);
    });
  });

  test.describe('Auth Pages', () => {
    test('login page has noindex directive', async ({ page }) => {
      await page.goto('/auth/login');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Title
      await expect(page).toHaveTitle(/Sign In.*BizScreen/);

      // Robots should have noindex
      const robots = page.locator('meta[name="robots"]');
      await expect(robots).toHaveAttribute('content', /noindex/);
    });

    test('signup page has correct meta tags', async ({ page }) => {
      await page.goto('/auth/signup');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Title
      await expect(page).toHaveTitle(/Create Account.*BizScreen/);

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
    test('internal links use meaningful text', async ({ page }) => {
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

    test('skip to content link is present', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Skip link should exist (may be visually hidden)
      const skipLink = page.locator('a[href="#main-content"]');
      await expect(skipLink).toHaveCount(1);
    });
  });
});
