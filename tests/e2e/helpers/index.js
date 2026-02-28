/**
 * Unified E2E Helpers Barrel
 *
 * Single import point for all E2E test helpers.
 * New spec files should import from this barrel:
 *
 * @example
 * import { screenshotStep, loginAndPrepare, VIEWPORTS } from './helpers/index.js';
 *
 * @module e2e/helpers
 */

// Screenshot helpers
export {
  screenshotStep,
  VIEWPORTS,
  cleanScreenshots,
  detectViewport,
} from './screenshots.js';

// Existing test helpers (re-exported from the original helpers module)
export {
  loginAndPrepare,
  dismissAnyModals,
  waitForPageReady,
  navigateToSection,
  generateTestName,
  assertAppReady,
} from '../helpers.js';
