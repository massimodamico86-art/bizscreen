/**
 * Unified E2E Helpers Barrel
 */

// Screenshot helpers (restored from screenshots.js)
export {
  screenshotStep,
  VIEWPORTS,
  cleanScreenshots,
  detectViewport,
} from './screenshots.js';

// Existing test helpers (Phase 161 added assertAppReady)
export {
  loginAndPrepare,
  dismissAnyModals,
  waitForPageReady,
  navigateToSection,
  generateTestName,
  assertAppReady,
} from '../helpers.js';
