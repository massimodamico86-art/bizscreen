/**
 * Onboarding Components
 *
 * Components for user onboarding flows including:
 * - Unified onboarding controller (state machine orchestrator)
 * - Welcome tour for new users
 * - Industry selection for template filtering
 * - Starter pack selection during onboarding
 * - Screen pairing reminder card
 * - Auto-build onboarding for quick setup
 * - Resume prompt for returning users
 * - Screen pairing step (placeholder for Phase 32)
 * - Skip link with confirmation dialog
 * - Progress bar for visual feedback
 *
 * @module components/onboarding
 */

export { WelcomeTour, TOUR_STEPS } from './WelcomeTour';
export { WelcomeTourStep } from './WelcomeTourStep';
export { IndustrySelectionModal, INDUSTRIES } from './IndustrySelectionModal';
export { StarterPackOnboarding } from './StarterPackOnboarding';
export { default as AutoBuildOnboardingModal } from './AutoBuildOnboardingModal';
export { ResumePrompt } from './ResumePrompt';
export { ScreenPairingStep } from './ScreenPairingStep';
export { SuccessStep } from './SuccessStep';
export { OnboardingSkipLink } from './OnboardingSkipLink';
export { OnboardingProgressBar } from './OnboardingProgressBar';
export { UnifiedOnboardingController } from './UnifiedOnboardingController';
