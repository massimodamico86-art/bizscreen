/**
 * Screenshot Helpers for E2E Tests
 *
 * Provides consistent screenshot capture at every test step.
 * Screenshots are saved to screenshots/{area}/{area}-{step}-{viewport}.png
 *
 * @module e2e/helpers/screenshots
 */

import fs from 'fs';
import path from 'path';

/**
 * Viewport presets for screenshot labeling.
 *
 * These match the common device breakpoints used in the app.
 */
export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

/**
 * Detect the current viewport label by matching page dimensions against VIEWPORTS.
 *
 * Compares the current page viewport width against known presets and returns
 * the closest matching key. Falls back to 'desktop' if no match is found.
 *
 * @param {import('@playwright/test').Page} page - Playwright Page object
 * @returns {string} Viewport label: 'desktop', 'tablet', or 'mobile'
 */
export function detectViewport(page) {
  const size = page.viewportSize();
  if (!size) {
    return 'desktop';
  }

  // Try exact width match first
  for (const [label, dimensions] of Object.entries(VIEWPORTS)) {
    if (size.width === dimensions.width) {
      return label;
    }
  }

  // Find closest match by width
  let closestLabel = 'desktop';
  let closestDiff = Infinity;
  for (const [label, dimensions] of Object.entries(VIEWPORTS)) {
    const diff = Math.abs(size.width - dimensions.width);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestLabel = label;
    }
  }

  return closestLabel;
}

/**
 * Clean (delete and recreate) the screenshot directory for an area.
 *
 * If no area is provided, cleans the entire screenshots/ directory.
 *
 * @param {string} [area] - Feature area subdirectory to clean, or undefined to clean all
 */
export function cleanScreenshots(area) {
  const base = path.resolve(process.cwd(), 'screenshots');
  const target = area ? path.join(base, area) : base;

  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
}

/**
 * Capture a screenshot at a specific test step with consistent naming.
 *
 * Screenshots are saved to: screenshots/{area}/{area}-{step}-{viewport}.png
 *
 * This function does NOT change the page viewport size. It labels the screenshot
 * based on the current viewport (or an explicit viewport option).
 *
 * @param {import('@playwright/test').Page} page - Playwright Page object
 * @param {string} area - Feature area (e.g., 'auth', 'dashboard', 'media'). Used as subdirectory.
 * @param {string|number} step - Step identifier (e.g., '01-login-page', '02-filled-form').
 * @param {Object} [options={}] - Optional settings
 * @param {string} [options.viewport] - Explicit viewport label ('desktop', 'tablet', 'mobile'). Auto-detected if omitted.
 * @param {boolean} [options.fullPage=false] - Whether to capture the full scrollable page.
 * @returns {Promise<string>} Full path to the saved screenshot file.
 */
export async function screenshotStep(page, area, step, options = {}) {
  // Determine viewport label
  const viewportLabel = options.viewport || detectViewport(page);

  // Build filename and directory
  const filename = `${area}-${step}-${viewportLabel}.png`;
  const dir = path.resolve(process.cwd(), 'screenshots', area);

  // Ensure directory exists
  fs.mkdirSync(dir, { recursive: true });

  // Capture screenshot
  const fullPath = path.join(dir, filename);
  await page.screenshot({
    path: fullPath,
    fullPage: options.fullPage || false,
  });

  return fullPath;
}
