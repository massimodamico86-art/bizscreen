/**
 * OnboardingSkipLink Component
 *
 * Subtle skip link with confirmation dialog for onboarding steps.
 * Shows confirmation before skipping: "Skip onboarding? You can complete it later"
 *
 * @module components/onboarding/OnboardingSkipLink
 */

import { useState } from 'react';
import PropTypes from 'prop-types';
import { ConfirmDialog } from '../../design-system';

/**
 * Skip link with confirmation for onboarding steps
 * @param {Object} props
 * @param {Function} props.onSkip - Called after user confirms skip
 * @param {boolean} [props.loading] - Whether skip action is in progress
 * @param {string} [props.text] - Custom link text (default: "Skip for now")
 */
export function OnboardingSkipLink({ onSkip, loading = false, text = 'Skip for now' }) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = async () => {
    setShowConfirm(false);
    await onSkip?.();
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
      >
        {loading ? 'Skipping...' : text}
      </button>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        title="Skip onboarding?"
        description="You can complete it later from your dashboard settings."
        confirmText="Yes, skip"
        cancelText="Continue setup"
        variant="default"
      />
    </>
  );
}

OnboardingSkipLink.propTypes = {
  onSkip: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  text: PropTypes.string,
};

export default OnboardingSkipLink;
