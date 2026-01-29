/**
 * OnboardingProgressBar Component
 *
 * Thin progress bar showing onboarding completion percentage.
 * Uses Framer Motion for smooth width animations.
 * Shows skeleton state during loading to avoid 0% flash.
 *
 * @module components/onboarding/OnboardingProgressBar
 */
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

import { duration, easing } from '../../design-system/motion';

/**
 * Thin progress bar for onboarding visual feedback
 *
 * @param {Object} props
 * @param {number} props.progress - Percentage complete (0-100)
 * @param {boolean} [props.loading] - Show skeleton state instead of progress
 * @returns {JSX.Element}
 *
 * @example
 * // Normal usage
 * <OnboardingProgressBar progress={33} />
 *
 * @example
 * // Loading state
 * <OnboardingProgressBar progress={0} loading />
 */
export function OnboardingProgressBar({ progress, loading = false }) {
  if (loading) {
    // Skeleton state - subtle pulse animation
    return (
      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full w-1/3 bg-gray-300 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-blue-500"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: duration.slow, ease: easing.easeOut }}
      />
    </div>
  );
}

OnboardingProgressBar.propTypes = {
  progress: PropTypes.number.isRequired,
  loading: PropTypes.bool,
};

export default OnboardingProgressBar;
