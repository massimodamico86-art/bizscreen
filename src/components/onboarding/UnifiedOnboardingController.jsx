/**
 * UnifiedOnboardingController Component
 *
 * Main orchestrator for the unified onboarding flow.
 * Renders the correct onboarding component based on current_unified_step
 * from the database, handles step transitions with AnimatePresence,
 * and manages resume/skip flows.
 *
 * Step sequence:
 * welcome_tour -> industry_selection -> starter_pack -> screen_pairing -> complete
 *
 * @module components/onboarding/UnifiedOnboardingController
 */

import { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

import { useUnifiedOnboarding } from '../../hooks/useUnifiedOnboarding';
import { OnboardingProgressBar } from './OnboardingProgressBar';
import { ResumePrompt } from './ResumePrompt';
import { WelcomeTour } from './WelcomeTour';
import { IndustrySelectionModal } from './IndustrySelectionModal';
import { StarterPackOnboarding } from './StarterPackOnboarding';
import { ScreenPairingStep } from './ScreenPairingStep';
import { SuccessStep } from './SuccessStep';
import { fadeInScale } from '../../design-system/motion';
import { Button } from '../../design-system';

// Step to component mapping
const STEP_COMPONENTS = {
  welcome_tour: WelcomeTour,
  industry_selection: IndustrySelectionModal,
  starter_pack: StarterPackOnboarding,
  screen_pairing: ScreenPairingStep,
  complete: SuccessStep,
};

// Step sequence for progress and back navigation
const _STEP_SEQUENCE = ['welcome_tour', 'industry_selection', 'starter_pack', 'screen_pairing', 'complete'];

// Progress percentages for each step
const STEP_PROGRESS = {
  welcome_tour: 0,
  industry_selection: 25,
  starter_pack: 50,
  screen_pairing: 75,
  complete: 100,
};

/**
 * Unified onboarding controller - orchestrates step components
 *
 * @param {Object} props
 * @param {Function} [props.onComplete] - Called when onboarding finishes (complete or skipped)
 */
export function UnifiedOnboardingController({ onComplete }) {
  const { state, loading, advance, skip } = useUnifiedOnboarding();
  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState(null);

  // Check for resume state on mount - show prompt if user returns mid-onboarding
  useEffect(() => {
    if (!loading && state?.canResume && state?.currentStep !== 'welcome_tour' && !state?.isComplete) {
      setShowResumePrompt(true);
    }
  }, [loading, state]);

  /**
   * Handle step completion - advance to next step
   */
  const handleStepComplete = useCallback(async () => {
    if (advancing || !state?.currentStep) return;

    setAdvancing(true);
    setAdvanceError(null);

    try {
      const result = await advance(state.currentStep);
      if (result.success) {
        if (result.isComplete) {
          onComplete?.();
        }
      } else {
        setAdvanceError(result.error || 'Failed to advance');
      }
    } catch (err) {
      setAdvanceError(err.message || 'Something went wrong');
    } finally {
      setAdvancing(false);
    }
  }, [state?.currentStep, advance, advancing, onComplete]);

  /**
   * Handle skip - mark onboarding as skipped and exit
   */
  const handleSkip = useCallback(async () => {
    const result = await skip();
    if (result.success) {
      onComplete?.();
    }
  }, [skip, onComplete]);

  /**
   * Handle resume prompt - continue from current step
   */
  const handleResume = useCallback(() => {
    setShowResumePrompt(false);
  }, []);

  /**
   * Handle restart from resume prompt
   * Note: For now, just closes prompt and shows current step
   * Full restart functionality would require additional RPC
   */
  const handleRestart = useCallback(() => {
    setShowResumePrompt(false);
  }, []);

  /**
   * Handle industry selection - store locally and advance
   */
  const handleIndustrySelect = useCallback((industry) => {
    setSelectedIndustry(industry);
    handleStepComplete();
  }, [handleStepComplete]);

  /**
   * Retry after error - clear error and allow retry
   */
  const handleRetry = useCallback(() => {
    setAdvanceError(null);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
          <OnboardingProgressBar progress={0} loading={true} />
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        </div>
      </div>
    );
  }

  // Complete state - render nothing
  if (state?.isComplete) {
    return null;
  }

  // Resume prompt for returning users
  if (showResumePrompt) {
    return (
      <ResumePrompt
        isOpen={true}
        currentStep={state?.currentStep}
        onResume={handleResume}
        onRestart={handleRestart}
        onSkip={handleSkip}
      />
    );
  }

  // Error state with retry option
  if (advanceError) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h3>
          <p className="text-gray-500 mb-6">{advanceError}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={handleSkip}>
              Skip Setup
            </Button>
            <Button variant="primary" onClick={handleRetry}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Get current step component
  const CurrentComponent = STEP_COMPONENTS[state?.currentStep];
  if (!CurrentComponent) {
    // Unknown step or complete - exit
    return null;
  }

  // Calculate progress percentage
  const progress = STEP_PROGRESS[state?.currentStep] || 0;

  // Build props for current component based on step type
  const componentProps = {
    isOpen: true,
    onClose: handleSkip,
  };

  // Step-specific props based on component API
  if (state?.currentStep === 'welcome_tour') {
    componentProps.onComplete = handleStepComplete;
    componentProps.onGetStarted = handleStepComplete;
  } else if (state?.currentStep === 'industry_selection') {
    componentProps.onSelect = handleIndustrySelect;
    componentProps.currentIndustry = selectedIndustry;
  } else if (state?.currentStep === 'starter_pack') {
    componentProps.onComplete = handleStepComplete;
    componentProps.industry = selectedIndustry;
  } else if (state?.currentStep === 'screen_pairing') {
    componentProps.onComplete = handleStepComplete;
  } else if (state?.currentStep === 'complete') {
    componentProps.onComplete = handleStepComplete;
    componentProps.screenPaired = state?.screenPairingCompletedAt != null;
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Content wrapper with progress bar */}
      <div className="relative flex items-center justify-center min-h-screen p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={state?.currentStep}
            initial={fadeInScale.initial}
            animate={fadeInScale.animate}
            exit={fadeInScale.exit}
            transition={fadeInScale.transition}
            className="w-full max-w-2xl"
          >
            {/* Progress bar above modal */}
            <div className="mb-4 px-4">
              <OnboardingProgressBar progress={progress} />
            </div>

            {/* Current step component */}
            <CurrentComponent {...componentProps} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

UnifiedOnboardingController.propTypes = {
  onComplete: PropTypes.func,
};

export default UnifiedOnboardingController;
