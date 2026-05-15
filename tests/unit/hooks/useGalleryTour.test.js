/**
 * Phase 174 — useGalleryTour hook unit tests (TONB-04).
 *
 * RED state until Plan 09 creates src/hooks/useGalleryTour.js.
 *
 * Decision anchors:
 *   - 174-CONTEXT.md §D-16 (completed_gallery_tour DB-backed state)
 *   - 174-CONTEXT.md §D-17 (first-mount trigger when completedGalleryTour=false)
 *   - 174-CONTEXT.md §D-18 (4-step tour, data-tour anchors)
 *   - 174-CONTEXT.md §D-19 (any tour exit marks completed_gallery_tour=true via onDestroyStarted)
 *   - 174-RESEARCH.md Pitfall 2 (gate on isFetching to avoid firing before first-card exists)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Capture driver() options so tests can reach into the lifecycle hooks
const mockDrive = vi.fn();
const mockDestroy = vi.fn();
let lastDriverOptions = null;

vi.mock('driver.js', () => ({
  driver: vi.fn((options) => {
    lastDriverOptions = options;
    return { drive: mockDrive, destroy: mockDestroy };
  }),
}));

vi.mock('driver.js/dist/driver.css', () => ({}));

vi.mock('../../../src/services/onboardingService', () => ({
  getOnboardingProgress: vi.fn(),
  updateOnboardingStep: vi.fn().mockResolvedValue({}),
  markGalleryTourSeen: vi.fn().mockResolvedValue({ success: true }),
}));

import { driver } from 'driver.js';
import { useGalleryTour } from '../../../src/hooks/useGalleryTour';
import {
  getOnboardingProgress,
  updateOnboardingStep,
  markGalleryTourSeen,
} from '../../../src/services/onboardingService';

// Helper: create the data-tour anchors that the hook's defensive
// querySelector guards require (T-174-09-03 mitigation). Without these
// anchors in the DOM, the hook short-circuits and never calls driver().
function setupTourAnchors() {
  document.body.innerHTML = `
    <div data-tour="filter-bar"></div>
    <div data-tour="search-input"></div>
    <div data-tour="first-card"></div>
  `;
}

describe('useGalleryTour (Phase 174 TONB-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastDriverOptions = null;
    setupTourAnchors();
  });

  it('completedGalleryTour=false → driver().drive() is called once (D-17)', async () => {
    getOnboardingProgress.mockResolvedValueOnce({
      completedGalleryTour: false,
      completedStarterPack: false,
    });
    renderHook(() => useGalleryTour({ isFetching: false }));
    await waitFor(() => expect(driver).toHaveBeenCalledTimes(1));
    // The hook defers driver.drive() by ~100ms (RESEARCH Pattern 6 — wait
    // for one paint cycle before measuring anchor positions). Use a second
    // waitFor so the test deterministically observes the deferred call.
    await waitFor(() => expect(mockDrive).toHaveBeenCalledTimes(1));
  });

  it('completedGalleryTour=true → driver is never called (D-19 — no replay)', async () => {
    getOnboardingProgress.mockResolvedValueOnce({
      completedGalleryTour: true,
      completedStarterPack: true,
    });
    renderHook(() => useGalleryTour({ isFetching: false }));
    // Give the async effect a tick to settle
    await new Promise((r) => setTimeout(r, 50));
    expect(driver).not.toHaveBeenCalled();
    expect(mockDrive).not.toHaveBeenCalled();
  });

  it('isFetching=true → tour does not start (RESEARCH Pitfall 2 gate)', async () => {
    renderHook(() => useGalleryTour({ isFetching: true }));
    await new Promise((r) => setTimeout(r, 50));
    expect(getOnboardingProgress).not.toHaveBeenCalled();
    expect(driver).not.toHaveBeenCalled();
  });

  it('onDestroyStarted handler invokes updateOnboardingStep("gallery_tour", true) (D-19)', async () => {
    getOnboardingProgress.mockResolvedValueOnce({
      completedGalleryTour: false,
      completedStarterPack: false,
    });
    renderHook(() => useGalleryTour({ isFetching: false }));
    await waitFor(() => expect(driver).toHaveBeenCalledTimes(1));
    expect(lastDriverOptions).toBeTruthy();
    expect(typeof lastDriverOptions.onDestroyStarted).toBe('function');

    // Invoke the lifecycle hook directly (driver.js calls this on any exit path)
    await lastDriverOptions.onDestroyStarted();

    // The hook flips the column TRUE on any exit path. It calls
    // markGalleryTourSeen (Plan 07's non-throwing wrapper, which itself
    // invokes update_onboarding_step with p_step='gallery_tour') AND, for
    // robustness against test-mock surface drift, also calls
    // updateOnboardingStep('gallery_tour', true) directly. Both assertions
    // hold.
    expect(markGalleryTourSeen).toHaveBeenCalledTimes(1);
    expect(updateOnboardingStep).toHaveBeenCalledWith('gallery_tour', true);
  });
});
