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
    it('contains all 6 steps', () => {
      expect(ONBOARDING_STEPS).toHaveLength(6);
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

    it('returns first_media step when welcome and logo are complete', () => {
      const progress = {
        completedWelcome: true,
        completedLogo: true,
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

    it('returns approximately 17% for 1 of 6 steps', () => {
      const progress = {
        completedWelcome: true,
        completedLogo: false,
        completedFirstMedia: false,
        completedFirstPlaylist: false,
        completedFirstScreen: false,
        completedScreenPairing: false,
      };

      const percent = getProgressPercent(progress);
      expect(percent).toBe(17); // 1/6 = 16.67%, rounded to 17
    });

    it('returns 50% for 3 of 6 steps', () => {
      const progress = {
        completedWelcome: true,
        completedLogo: true,
        completedFirstMedia: true,
        completedFirstPlaylist: false,
        completedFirstScreen: false,
        completedScreenPairing: false,
      };

      expect(getProgressPercent(progress)).toBe(50);
    });

    it('returns 100% when all steps are complete', () => {
      const progress = {
        completedWelcome: true,
        completedLogo: true,
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
      expect(typeof onboardingService.getUnifiedOnboardingState).toBe('function');
      expect(typeof onboardingService.advanceOnboardingStep).toBe('function');
      expect(typeof onboardingService.completeUnifiedOnboarding).toBe('function');
    });

    it('exports ONBOARDING_STEPS constant', async () => {
      const onboardingService = await import('../../../src/services/onboardingService');
      expect(Array.isArray(onboardingService.ONBOARDING_STEPS)).toBe(true);
    });
  });

  describe('Unified Onboarding State (Phase 30)', () => {
    describe('getUnifiedOnboardingState', () => {
      it('returns default state on RPC error', async () => {
        const { supabase } = await import('../../../src/supabase');
        supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Network error' } });

        const { getUnifiedOnboardingState } = await import('../../../src/services/onboardingService');
        const state = await getUnifiedOnboardingState();

        expect(state.currentStep).toBe('welcome_tour');
        expect(state.canResume).toBe(true);
        expect(state.progressPercent).toBe(0);
        expect(state.isComplete).toBe(false);
        expect(state.skippedAt).toBeNull();
      });

      it('returns state from RPC response', async () => {
        const { supabase } = await import('../../../src/supabase');
        supabase.rpc.mockResolvedValueOnce({
          data: {
            current_step: 'industry_selection',
            can_resume: true,
            progress_percent: 25,
            is_complete: false,
            skipped_at: null
          },
          error: null
        });

        const { getUnifiedOnboardingState } = await import('../../../src/services/onboardingService');
        const state = await getUnifiedOnboardingState();

        expect(state.currentStep).toBe('industry_selection');
        expect(state.canResume).toBe(true);
        expect(state.progressPercent).toBe(25);
        expect(state.isComplete).toBe(false);
      });

      it('handles complete state correctly', async () => {
        const { supabase } = await import('../../../src/supabase');
        supabase.rpc.mockResolvedValueOnce({
          data: {
            current_step: 'complete',
            can_resume: false,
            progress_percent: 100,
            is_complete: true,
            skipped_at: null
          },
          error: null
        });

        const { getUnifiedOnboardingState } = await import('../../../src/services/onboardingService');
        const state = await getUnifiedOnboardingState();

        expect(state.currentStep).toBe('complete');
        expect(state.canResume).toBe(false);
        expect(state.progressPercent).toBe(100);
        expect(state.isComplete).toBe(true);
      });
    });

    describe('advanceOnboardingStep', () => {
      it('rejects invalid step names', async () => {
        const { advanceOnboardingStep } = await import('../../../src/services/onboardingService');
        const result = await advanceOnboardingStep('invalid_step');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid step');
      });

      it('calls RPC with valid step', async () => {
        const { supabase } = await import('../../../src/supabase');
        supabase.rpc.mockResolvedValueOnce({
          data: { success: true, current_step: 'industry_selection', next_step: 'starter_pack', is_complete: false },
          error: null
        });

        const { advanceOnboardingStep } = await import('../../../src/services/onboardingService');
        const result = await advanceOnboardingStep('welcome_tour');

        expect(result.success).toBe(true);
        expect(result.currentStep).toBe('industry_selection');
        expect(result.nextStep).toBe('starter_pack');
      });

      it('returns error on RPC failure', async () => {
        const { supabase } = await import('../../../src/supabase');
        supabase.rpc.mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error' }
        });

        const { advanceOnboardingStep } = await import('../../../src/services/onboardingService');
        const result = await advanceOnboardingStep('welcome_tour');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Database error');
      });
    });

    describe('completeUnifiedOnboarding', () => {
      it('calls RPC and returns success', async () => {
        const { supabase } = await import('../../../src/supabase');
        supabase.rpc.mockResolvedValueOnce({
          data: { success: true },
          error: null
        });

        const { completeUnifiedOnboarding } = await import('../../../src/services/onboardingService');
        const result = await completeUnifiedOnboarding();

        expect(result.success).toBe(true);
      });

      it('returns error on RPC failure', async () => {
        const { supabase } = await import('../../../src/supabase');
        supabase.rpc.mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error' }
        });

        const { completeUnifiedOnboarding } = await import('../../../src/services/onboardingService');
        const result = await completeUnifiedOnboarding();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Database error');
      });
    });
  });
});
