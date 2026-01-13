/**
 * Dashboard module index
 *
 * Re-exports all dashboard-related components for cleaner imports.
 * Import from 'pages/dashboard' rather than individual files.
 */

// Core sections
export {
  DashboardErrorState,
  StatsGrid,
  ScreenRow,
  QuickActionButton,
} from './DashboardSections';

// Onboarding cards
export {
  GettingStartedCard,
  StepCard,
  DemoResultCard,
  GettingStartedTips,
} from './OnboardingCards';

// Welcome modal flow
export {
  WelcomeModal,
  ChoiceStep,
  BusinessTypeStep,
  CreatingStep,
  BUSINESS_TYPES,
} from './WelcomeModal';
