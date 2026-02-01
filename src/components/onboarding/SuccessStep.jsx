/**
 * SuccessStep Component
 *
 * Final step in unified onboarding flow showing completion celebration.
 * Displays confetti animation, success message, and CTAs for next actions.
 * Marks onboarding as complete when user exits via any CTA.
 *
 * @module components/onboarding/SuccessStep
 */

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { CheckCircle, ArrowRight, Plus, LayoutGrid } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Modal, ModalContent, Button } from '../../design-system';
import { completeUnifiedOnboarding } from '../../services/onboardingService';

/**
 * Success step with celebration confetti and next action CTAs
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether step is visible
 * @param {Function} props.onComplete - Called when user completes onboarding
 * @param {Function} props.onClose - Called when user closes (same as complete)
 * @param {boolean} [props.screenPaired=false] - Whether screen was paired during onboarding
 */
export function SuccessStep({ isOpen, onComplete, onClose, screenPaired = false }) {
  const [completing, setCompleting] = useState(false);

  // Trigger confetti celebration when modal opens
  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        disableForReducedMotion: true,
        zIndex: 10001, // Above modal overlay (10000)
      });
    }
  }, [isOpen]);

  /**
   * Handle primary CTA - Go to Dashboard
   */
  const handleGoToDashboard = async () => {
    setCompleting(true);
    await completeUnifiedOnboarding();
    onComplete?.();
    // No need to reset completing since component unmounts
  };

  /**
   * Handle secondary CTA - complete onboarding and navigate
   * @param path
   */
  const handleSecondaryAction = async (path) => {
    await completeUnifiedOnboarding();
    window.location.href = path;
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="md"
      showCloseButton={false}
      closeOnOverlay={false}
    >
      {/* Green gradient header accent */}
      <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-t-xl" />

      <ModalContent className="text-center py-8">
        {/* Success icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={40} className="text-green-600" />
        </div>

        {/* Headline */}
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Your BizScreen is Ready!
        </h2>

        {/* Conditional subtext based on screen pairing status */}
        <p className="text-gray-600 mb-8">
          {screenPaired
            ? 'Your content is now live on your screen!'
            : "You're all set to create and display amazing content."}
        </p>

        {/* Primary CTA */}
        <Button
          variant="primary"
          size="lg"
          onClick={handleGoToDashboard}
          loading={completing}
          className="w-full sm:w-auto px-8"
        >
          Go to Dashboard
          <ArrowRight size={18} className="ml-2" />
        </Button>

        {/* Secondary CTAs */}
        <div className="flex justify-center gap-6 mt-6">
          <button
            onClick={() => handleSecondaryAction('/devices')}
            className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm transition-colors"
          >
            <Plus size={16} />
            Add More Screens
          </button>
          <button
            onClick={() => handleSecondaryAction('/templates')}
            className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm transition-colors"
          >
            <LayoutGrid size={16} />
            Browse Templates
          </button>
        </div>
      </ModalContent>
    </Modal>
  );
}

SuccessStep.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onComplete: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  screenPaired: PropTypes.bool,
};

export default SuccessStep;
