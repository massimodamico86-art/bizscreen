/**
 * ScreenPairingStep Component
 *
 * Placeholder for screen pairing step in onboarding.
 * Full implementation will come in Phase 32 with OTP display and QR code.
 *
 * @module components/onboarding/ScreenPairingStep
 */

import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Monitor, ArrowRight } from 'lucide-react';
import { Modal, ModalHeader, ModalContent, ModalFooter, Button } from '../../design-system';

/**
 * Placeholder for screen pairing step
 * Full implementation in Phase 32
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether step is visible
 * @param {Function} props.onComplete - Called when step completes
 * @param {Function} props.onClose - Called when user skips
 */
export function ScreenPairingStep({ isOpen, onComplete, onClose }) {
  // For Phase 31, auto-complete this step after a brief delay
  // Phase 32 will replace this with actual pairing UI
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onComplete]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="md"
      showCloseButton={false}
      closeOnOverlay={false}
    >
      {/* Gradient header accent */}
      <div className="h-2 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-t-xl" />

      <ModalHeader className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Connect Your Screen
        </h2>
        <p className="text-gray-500">
          Pair a display to start showing content
        </p>
      </ModalHeader>

      <ModalContent className="text-center py-8">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-teal-100 flex items-center justify-center">
          <Monitor size={40} className="text-teal-600" />
        </div>
        <p className="text-gray-600 mb-4">
          Screen pairing will be available in the next update.
        </p>
        <p className="text-sm text-gray-400">
          Continuing automatically...
        </p>
      </ModalContent>

      <ModalFooter className="flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          onClick={onClose}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors order-2 sm:order-1"
        >
          Skip for now
        </button>
        <Button
          variant="primary"
          onClick={onComplete}
          icon={<ArrowRight size={18} />}
          iconPosition="right"
          className="order-1 sm:order-2"
        >
          Continue
        </Button>
      </ModalFooter>
    </Modal>
  );
}

ScreenPairingStep.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onComplete: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ScreenPairingStep;
