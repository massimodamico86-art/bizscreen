/**
 * OnboardingBanner Component
 *
 * Dismissible banner shown on dashboard when onboarding was incomplete.
 * Appears once on next dashboard visit after skipping onboarding.
 * Dismissible per session using sessionStorage.
 *
 * @module components/onboarding/OnboardingBanner
 */

import PropTypes from 'prop-types';
import { Sparkles, X } from 'lucide-react';
import { Button } from '../../design-system/components/Button';

/**
 * Session storage key for tracking banner dismissal
 */
const BANNER_DISMISSED_KEY = 'onboarding_banner_dismissed';

/**
 * Check if banner was dismissed this session
 * @returns {boolean}
 */
export function isBannerDismissed() {
  try {
    return sessionStorage.getItem(BANNER_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark banner as dismissed for this session
 */
export function dismissBanner() {
  try {
    sessionStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  } catch {
    // sessionStorage not available
  }
}

/**
 * OnboardingBanner - Prompt to complete setup
 *
 * @param {Object} props
 * @param {Function} props.onResume - Called when user clicks "Complete Setup"
 * @param {Function} props.onDismiss - Called when user dismisses banner
 */
export function OnboardingBanner({ onResume, onDismiss }) {
  /**
   * Handle dismiss click
   */
  const handleDismiss = () => {
    dismissBanner();
    onDismiss?.();
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start sm:items-center gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-blue-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900">Complete your setup</p>
          <p className="text-sm text-gray-600 mt-0.5">
            Finish setting up your workspace with templates tailored for your business.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
          <Button
            size="sm"
            onClick={onResume}
          >
            Complete Setup
          </Button>
        </div>
      </div>
    </div>
  );
}

OnboardingBanner.propTypes = {
  onResume: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

export default OnboardingBanner;
