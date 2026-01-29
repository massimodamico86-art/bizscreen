/**
 * Onboarding Components
 *
 * Components for user onboarding flows including:
 * - Welcome tour for new users
 * - Industry selection for template filtering
 * - Starter pack selection during onboarding
 * - Banner for incomplete onboarding
 * - Auto-build onboarding for quick setup
 * - Resume prompt for returning users
 * - Screen pairing step (placeholder for Phase 32)
 * - Skip link with confirmation dialog
 *
 * @module components/onboarding
 */

export { WelcomeTour, TOUR_STEPS } from './WelcomeTour';
export { WelcomeTourStep } from './WelcomeTourStep';
export { IndustrySelectionModal, INDUSTRIES } from './IndustrySelectionModal';
export { StarterPackOnboarding } from './StarterPackOnboarding';
export { OnboardingBanner } from './OnboardingBanner';
export { default as AutoBuildOnboardingModal } from './AutoBuildOnboardingModal';
export { ResumePrompt } from './ResumePrompt';
export { ScreenPairingStep } from './ScreenPairingStep';
export { OnboardingSkipLink } from './OnboardingSkipLink';
