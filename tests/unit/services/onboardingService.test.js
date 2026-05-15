/**
 * Onboarding Service Unit Tests
 * Phase 7: Tests for onboarding progress tracking and utilities
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ONBOARDING_STEPS,
  getNextStep,
  getCompletedCount,
  getProgressPercent,
} from '../../../src/services/onboardingService';

// Mock supabase
vi.mock('../../../src/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

describe('onboardingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ONBOARDING_STEPS constant', () => {
    it('contains all 7 steps', () => {
      // Phase 174 TONB-01 — added starter_pack step (D-07)
      expect(ONBOARDING_STEPS).toHaveLength(7);
    });

    it('has correct step IDs', () => {
      const stepIds = ONBOARDING_STEPS.map((s) => s.id);
      expect(stepIds).toContain('welcome');
      expect(stepIds).toContain('logo');
      expect(stepIds).toContain('first_media');
      expect(stepIds).toContain('first_playlist');
      expect(stepIds).toContain('first_screen');
      expect(stepIds).toContain('screen_pairing');
    });

    it('has starter_pack step between logo and first_media (D-07)', () => {
      const ids = ONBOARDING_STEPS.map((s) => s.id);
      const logoIdx = ids.indexOf('logo');
      const packIdx = ids.indexOf('starter_pack');
      const mediaIdx = ids.indexOf('first_media');
      expect(packIdx).toBe(logoIdx + 1);
      expect(mediaIdx).toBe(packIdx + 1);
    });

    it('starter_pack step has no navigateTo (stays inside wizard per D-08)', () => {
      const step = ONBOARDING_STEPS.find((s) => s.id === 'starter_pack');
      expect(step).toBeDefined();
      expect(step.navigateTo).toBeUndefined();
    });

    it('has required properties for each step', () => {
      ONBOARDING_STEPS.forEach((step) => {
        expect(step).toHaveProperty('id');
        expect(step).toHaveProperty('title');
        expect(step).toHaveProperty('description');
        expect(step).toHaveProperty('icon');
        expect(typeof step.id).toBe('string');
        expect(typeof step.title).toBe('string');
        expect(typeof step.description).toBe('string');
        expect(typeof step.icon).toBe('string');
      });
    });

    it('has navigateTo for steps that need navigation', () => {
      const stepsWithNavigation = ONBOARDING_STEPS.filter((s) => s.navigateTo);
      expect(stepsWithNavigation.length).toBeGreaterThan(0);

      stepsWithNavigation.forEach((step) => {
        expect(typeof step.navigateTo).toBe('string');
      });
    });

    it('welcome step does not have navigateTo', () => {
      const welcomeStep = ONBOARDING_STEPS.find((s) => s.id === 'welcome');
      expect(welcomeStep.navigateTo).toBeUndefined();
    });
  });

  describe('getNextStep', () => {
    it('returns welcome step when nothing is complete', () => {
      const progress = {
        completedWelcome: false,
        completedLogo: false,
        completedFirstMedia: false,
        completedFirstPlaylist: false,
        completedFirstScreen: false,
        completedScreenPairing: false,
        isComplete: false,
        skippedAt: null,
      };

      const nextStep = getNextStep(progress);
      expect(nextStep.id).toBe('welcome');
    });

    it('returns logo step when welcome is complete', () => {
      const progress = {
        completedWelcome: true,
        completedLogo: false,
        completedFirstMedia: false,
        completedFirstPlaylist: false,
        completedFirstScreen: false,
        completedScreenPairing: false,
        isComplete: false,
        skippedAt: null,
      };

      const nextStep = getNextStep(progress);
      expect(nextStep.id).toBe('logo');
    });

    it('returns starter_pack step when welcome and logo are complete (Phase 174 D-07)', () => {
      const progress = {
        completedWelcome: true,
        completedLogo: true,
        completedStarterPack: false,
        completedFirstMedia: false,
        completedFirstPlaylist: false,
        completedFirstScreen: false,
        completedScreenPairing: false,
        isComplete: false,
        skippedAt: null,
      };

      const nextStep = getNextStep(progress);
      expect(nextStep.id).toBe('starter_pack');
    });

    it('returns first_media step when welcome, logo, and starter_pack are complete (Phase 174 D-07)', () => {
      const progress = {
        completedWelcome: true,
        completedLogo: true,
        completedStarterPack: true,
        completedFirstMedia: false,
        completedFirstPlaylist: false,
        completedFirstScreen: false,
        completedScreenPairing: false,
        isComplete: false,
        skippedAt: null,
      };

      const nextStep = getNextStep(progress);
      expect(nextStep.id).toBe('first_media');
    });

    it('returns null when all steps are complete', () => {
      const progress = {
        completedWelcome: true,
        completedLogo: true,
        completedFirstMedia: true,
        completedFirstPlaylist: true,
        completedFirstScreen: true,
        completedScreenPairing: true,
        isComplete: true,
        skippedAt: null,
      };

      const nextStep = getNextStep(progress);
      expect(nextStep).toBeNull();
    });

    it('returns null when onboarding is skipped', () => {
      const progress = {
        completedWelcome: false,
        completedLogo: false,
        completedFirstMedia: false,
        completedFirstPlaylist: false,
        completedFirstScreen: false,
        completedScreenPairing: false,
        isComplete: false,
        skippedAt: '2024-01-01T00:00:00Z',
      };

      const nextStep = getNextStep(progress);
      expect(nextStep).toBeNull();
    });

    it('returns null when isComplete is true', () => {
      const progress = {
        completedWelcome: false,
        completedLogo: false,
        completedFirstMedia: false,
        completedFirstPlaylist: false,
        completedFirstScreen: false,
        completedScreenPairing: false,
        isComplete: true,
        skippedAt: null,
      };

      const nextStep = getNextStep(progress);
      expect(nextStep).toBeNull();
    });
  });

  describe('getCompletedCount', () => {
    it('returns 0 when nothing is complete', () => {
      const progress = {
        completedWelcome: false,
        completedLogo: false,
        completedFirstMedia: false,
        completedFirstPlaylist: false,
        completedFirstScreen: false,
        completedScreenPairing: false,
      };

      expect(getCompletedCount(progress)).toBe(0);
    });

    it('returns 1 when one step is complete', () => {
      const progress = {
        completedWelcome: true,
        completedLogo: false,
        completedFirstMedia: false,
        completedFirstPlaylist: false,
        completedFirstScreen: false,
        completedScreenPairing: false,
      };

      expect(getCompletedCount(progress)).toBe(1);
    });

    it('returns 3 when three steps are complete', () => {
      const progress = {
        completedWelcome: true,
        completedLogo: true,
        completedFirstMedia: true,
        completedFirstPlaylist: false,
        completedFirstScreen: false,
        completedScreenPairing: false,
      };

      expect(getCompletedCount(progress)).toBe(3);
    });

    it('returns 6 when all steps are complete', () => {
      const progress = {
        completedWelcome: true,
        completedLogo: true,
        completedFirstMedia: true,
        completedFirstPlaylist: true,
        completedFirstScreen: true,
        completedScreenPairing: true,
      };

      expect(getCompletedCount(progress)).toBe(6);
    });

    it('counts non-sequential completions correctly', () => {
      const progress = {
        completedWelcome: true,
        completedLogo: false,
        completedFirstMedia: true,
        completedFirstPlaylist: false,
        completedFirstScreen: true,
        completedScreenPairing: false,
      };

      expect(getCompletedCount(progress)).toBe(3);
    });
  });

  describe('getProgressPercent', () => {
    it('returns 0 when nothing is complete', () => {
      const progress = {
        completedWelcome: false,
        completedLogo: false,
        completedFirstMedia: false,
        completedFirstPlaylist: false,
        completedFirstScreen: false,
        completedScreenPairing: false,
      };

      expect(getProgressPercent(progress)).toBe(0);
    });

    it('returns approximately 14% for 1 of 7 steps (Phase 174 — denominator now 7)', () => {
      const progress = {
        completedWelcome: true,
        completedLogo: false,
        completedStarterPack: false,
        completedFirstMedia: false,
        completedFirstPlaylist: false,
        completedFirstScreen: false,
        completedScreenPairing: false,
      };

      const percent = getProgressPercent(progress);
      expect(percent).toBe(14); // 1/7 = 14.29%, rounded to 14
    });

    it('returns approximately 43% for 3 of 7 steps (Phase 174 — denominator now 7)', () => {
      const progress = {
        completedWelcome: true,
        completedLogo: true,
        completedStarterPack: false,
        completedFirstMedia: true,
        completedFirstPlaylist: false,
        completedFirstScreen: false,
        completedScreenPairing: false,
      };

      expect(getProgressPercent(progress)).toBe(43); // 3/7 = 42.86%, rounded to 43
    });

    it('returns 100% when all 7 steps are complete (Phase 174 — denominator now 7)', () => {
      const progress = {
        completedWelcome: true,
        completedLogo: true,
        completedStarterPack: true,
        completedFirstMedia: true,
        completedFirstPlaylist: true,
        completedFirstScreen: true,
        completedScreenPairing: true,
      };

      expect(getProgressPercent(progress)).toBe(100);
    });
  });

  describe('API function exports', () => {
    it('exports all required onboarding functions', async () => {
      const onboardingService = await import('../../../src/services/onboardingService');

      expect(typeof onboardingService.checkIsFirstRun).toBe('function');
      expect(typeof onboardingService.getOnboardingProgress).toBe('function');
      expect(typeof onboardingService.updateOnboardingStep).toBe('function');
      expect(typeof onboardingService.skipOnboarding).toBe('function');
      expect(typeof onboardingService.needsOnboarding).toBe('function');
      expect(typeof onboardingService.getNextStep).toBe('function');
      expect(typeof onboardingService.getCompletedCount).toBe('function');
      expect(typeof onboardingService.getProgressPercent).toBe('function');
      expect(typeof onboardingService.syncOnboardingProgress).toBe('function');
    });

    it('exports ONBOARDING_STEPS constant', async () => {
      const onboardingService = await import('../../../src/services/onboardingService');
      expect(Array.isArray(onboardingService.ONBOARDING_STEPS)).toBe(true);
    });
  });
});
