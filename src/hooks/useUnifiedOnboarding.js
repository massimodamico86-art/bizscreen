/**
 * useUnifiedOnboarding Hook
 *
 * Custom React hook that wraps the Phase 30 unified onboarding API
 * with React state management. Provides single source of truth for
 * onboarding state with automatic sync on tab visibility changes.
 *
 * @module hooks/useUnifiedOnboarding
 */
import { useState, useEffect, useCallback } from 'react';

import {
  getUnifiedOnboardingState,
  advanceOnboardingStep,
  skipOnboarding,
} from '../services/onboardingService';

/**
 * @typedef {Object} UnifiedOnboardingState
 * @property {string} currentStep - Current step: welcome_tour, industry_selection, starter_pack, screen_pairing, complete
 * @property {boolean} canResume - Whether user can resume onboarding (not complete, not skipped)
 * @property {number} progressPercent - Completion percentage (0-100)
 * @property {boolean} isComplete - Whether onboarding is fully complete
 * @property {string|null} skippedAt - When onboarding was skipped, if applicable
 */

/**
 * @typedef {Object} UseUnifiedOnboardingReturn
 * @property {UnifiedOnboardingState|null} state - Current onboarding state (null while loading)
 * @property {boolean} loading - True during initial fetch
 * @property {Error|null} error - Error object if fetch failed
 * @property {function(string): Promise<Object>} advance - Advance to next step after completing given step
 * @property {function(): Promise<Object>} skip - Skip the entire onboarding flow
 * @property {function(): Promise<void>} refresh - Manually refresh state from database
 */

/**
 * Hook for managing unified onboarding state
 *
 * Features:
 * - Loads initial state on mount
 * - Refreshes state when user returns to tab (multi-tab sync)
 * - Provides advance/skip functions that auto-refresh after success
 *
 * @returns {UseUnifiedOnboardingReturn}
 *
 * @example
 * const { state, loading, error, advance, skip, refresh } = useUnifiedOnboarding();
 *
 * if (loading) return <Skeleton />;
 * if (state?.isComplete) return null;
 *
 * return (
 *   <OnboardingController
 *     currentStep={state.currentStep}
 *     progress={state.progressPercent}
 *     onAdvance={advance}
 *     onSkip={skip}
 *   />
 * );
 */
export function useUnifiedOnboarding() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getUnifiedOnboardingState();
      setState(data);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    async function init() {
      setLoading(true);
      await refresh();
      setLoading(false);
    }
    init();
  }, [refresh]);

  // Visibility change listener - sync state when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refresh]);

  const advance = useCallback(
    async (step) => {
      const result = await advanceOnboardingStep(step);
      if (result.success) {
        await refresh();
      }
      return result;
    },
    [refresh]
  );

  const skip = useCallback(async () => {
    const result = await skipOnboarding();
    if (result.success) {
      await refresh();
    }
    return result;
  }, [refresh]);

  return { state, loading, error, advance, skip, refresh };
}

export default useUnifiedOnboarding;
