/**
 * ResumePrompt Component
 *
 * Modal prompt for users returning to incomplete onboarding.
 * Shows Resume/Restart/Skip options when user returns mid-onboarding.
 *
 * @module components/onboarding/ResumePrompt
 */

import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { Play, RotateCcw } from 'lucide-react';
import { Modal, ModalContent, ModalFooter, Button, fadeInScale } from '../../design-system';

/**
 * Modal prompt for users returning to incomplete onboarding
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether prompt is visible
 * @param {string} props.currentStep - The step user was on (for display)
 * @param {Function} props.onResume - Called when user wants to continue
 * @param {Function} props.onRestart - Called when user wants to start over
 * @param {Function} props.onSkip - Called when user wants to skip entirely
 */
export function ResumePrompt({ isOpen, currentStep, onResume, onRestart, onSkip }) {
  // Human-readable step names
  const stepLabels = {
    welcome_tour: 'Welcome Tour',
    industry_selection: 'Industry Selection',
    starter_pack: 'Starter Pack',
    screen_pairing: 'Screen Pairing',
  };

  const stepLabel = stepLabels[currentStep] || 'setup';

  return (
    <Modal
      open={isOpen}
      onClose={onSkip}
      size="sm"
      showCloseButton={false}
      closeOnOverlay={false}
    >
      <ModalContent className="text-center py-6">
        <motion.div {...fadeInScale}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            <Play size={28} className="text-blue-600 ml-1" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Continue where you left off?
          </h3>
          <p className="text-gray-500 mb-6">
            You were on the {stepLabel} step. Would you like to continue?
          </p>
        </motion.div>
      </ModalContent>

      <ModalFooter className="flex-col gap-2">
        <Button
          variant="primary"
          onClick={onResume}
          icon={<Play size={18} />}
          className="w-full"
        >
          Resume Setup
        </Button>
        <Button
          variant="secondary"
          onClick={onRestart}
          icon={<RotateCcw size={18} />}
          className="w-full"
        >
          Start Over
        </Button>
        <button
          onClick={onSkip}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors mt-2"
        >
          Skip for now
        </button>
      </ModalFooter>
    </Modal>
  );
}

ResumePrompt.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  currentStep: PropTypes.string.isRequired,
  onResume: PropTypes.func.isRequired,
  onRestart: PropTypes.func.isRequired,
  onSkip: PropTypes.func.isRequired,
};

export default ResumePrompt;
