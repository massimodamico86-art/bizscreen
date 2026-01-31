/**
 * ScreenPairingStep Component
 *
 * Screen pairing step in unified onboarding flow.
 * Features OTP display, QR code for pairing, live polling for device connection,
 * and confetti celebration on successful pairing.
 *
 * @module components/onboarding/ScreenPairingStep
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Monitor, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { Modal, ModalHeader, ModalContent, ModalFooter, Button } from '../../design-system';
import { createScreen } from '../../services/screenService';
import { supabase } from '../../supabase';

// OTP expires in 15 minutes (per migration 033)
const OTP_EXPIRY_MINUTES = 15;
// Polling interval in ms (per PairPage.jsx pattern)
const POLL_INTERVAL_MS = 3000;

/**
 * Format OTP code as grouped digits: ABC 123
 * @param {string} code - 6-character OTP code
 * @returns {string} Formatted code with space
 */
function formatOtpCode(code) {
  if (!code || code.length !== 6) return code || '';
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/**
 * Format remaining time as M:SS
 * @param {number} seconds - Remaining seconds
 * @returns {string} Formatted time string
 */
function formatTimeRemaining(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Trigger confetti celebration
 * Respects reduced motion preference via built-in option
 */
function triggerConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    disableForReducedMotion: true,
    zIndex: 10001, // Above modal overlay (10000)
  });
}

/**
 * Screen pairing step with OTP/QR code display and live pairing detection
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether step is visible
 * @param {Function} props.onComplete - Called when pairing succeeds
 * @param {Function} props.onClose - Called when user skips
 */
export function ScreenPairingStep({ isOpen, onComplete, onClose }) {
  // Screen state
  const [screen, setScreen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pairing state
  const [isPaired, setIsPaired] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pairedDeviceName, setPairedDeviceName] = useState(null);

  // OTP expiry timer
  const [expirySeconds, setExpirySeconds] = useState(OTP_EXPIRY_MINUTES * 60);
  const [isExpired, setIsExpired] = useState(false);

  // Refs to prevent duplicate operations
  const screenCreatedRef = useRef(false);
  const pollIntervalRef = useRef(null);
  const expiryIntervalRef = useRef(null);

  /**
   * Create screen on mount
   */
  const handleCreateScreen = useCallback(async () => {
    // Prevent duplicate creation
    if (screenCreatedRef.current || loading) return;

    setLoading(true);
    setError(null);
    screenCreatedRef.current = true;

    try {
      const newScreen = await createScreen({ name: 'Onboarding Screen' });
      setScreen(newScreen);
      // Reset expiry timer when new screen is created
      setExpirySeconds(OTP_EXPIRY_MINUTES * 60);
      setIsExpired(false);
    } catch (err) {
      setError(err.message || 'Failed to create screen');
      screenCreatedRef.current = false; // Allow retry
    } finally {
      setLoading(false);
    }
  }, [loading]);

  /**
   * Handle retry button click
   */
  const handleRetry = useCallback(() => {
    screenCreatedRef.current = false;
    setScreen(null);
    setError(null);
    handleCreateScreen();
  }, [handleCreateScreen]);

  /**
   * Generate new OTP code (regenerate screen)
   */
  const handleGenerateNewCode = useCallback(() => {
    screenCreatedRef.current = false;
    setScreen(null);
    setIsExpired(false);
    handleCreateScreen();
  }, [handleCreateScreen]);

  // Create screen on mount when opened
  useEffect(() => {
    if (isOpen && !screen && !screenCreatedRef.current) {
      handleCreateScreen();
    }
  }, [isOpen, screen, handleCreateScreen]);

  // OTP expiry countdown timer
  useEffect(() => {
    if (!isOpen || !screen || isPaired) {
      if (expiryIntervalRef.current) {
        clearInterval(expiryIntervalRef.current);
        expiryIntervalRef.current = null;
      }
      return;
    }

    expiryIntervalRef.current = setInterval(() => {
      setExpirySeconds((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          clearInterval(expiryIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (expiryIntervalRef.current) {
        clearInterval(expiryIntervalRef.current);
        expiryIntervalRef.current = null;
      }
    };
  }, [isOpen, screen, isPaired]);

  // Poll for pairing detection
  useEffect(() => {
    if (!isOpen || !screen || isPaired) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const pollForPairing = async () => {
      try {
        const { data, error: queryError } = await supabase
          .from('tv_devices')
          .select('id, is_paired, device_name')
          .eq('id', screen.id)
          .eq('is_paired', true)
          .single();

        if (data && !queryError) {
          // Device paired!
          setIsPaired(true);
          setPairedDeviceName(data.device_name);
          setShowSuccess(true);

          // Clear polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }

          // Trigger confetti celebration
          triggerConfetti();

          // Auto-advance after 2 second delay
          setTimeout(() => {
            onComplete?.();
          }, 2000);
        }
      } catch {
        // Ignore errors, keep polling
        // PGRST116 (no rows) is expected when not yet paired
      }
    };

    pollIntervalRef.current = setInterval(pollForPairing, POLL_INTERVAL_MS);

    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isOpen, screen, isPaired, onComplete]);

  // Build QR code URL
  const qrCodeUrl = screen?.id
    ? `${window.location.origin}/pair/${screen.id}`
    : '';

  // Render success state
  if (showSuccess) {
    return (
      <Modal
        open={isOpen}
        onClose={() => {}}
        size="md"
        showCloseButton={false}
        closeOnOverlay={false}
      >
        {/* Gradient header accent */}
        <div className="h-2 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-t-xl" />

        <ModalHeader className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Screen Connected!
          </h2>
        </ModalHeader>

        <ModalContent className="text-center py-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <p className="text-lg text-gray-600">
            Your {pairedDeviceName || 'screen'} is now ready
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Continuing automatically...
          </p>
        </ModalContent>

        <ModalFooter />
      </Modal>
    );
  }

  // Render error state
  if (error) {
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
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle size={40} className="text-red-600" />
          </div>
          <p className="text-gray-600 mb-4">
            {error}
          </p>
          <Button
            variant="secondary"
            onClick={handleRetry}
            icon={<RefreshCw size={18} />}
          >
            Try Again
          </Button>
        </ModalContent>

        <ModalFooter className="flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip for now
          </button>
        </ModalFooter>
      </Modal>
    );
  }

  // Render loading state
  if (loading || !screen) {
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
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-teal-100 flex items-center justify-center animate-pulse">
            <Monitor size={40} className="text-teal-600" />
          </div>
          <p className="text-gray-600">
            Generating pairing code...
          </p>
        </ModalContent>

        <ModalFooter className="flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip for now
          </button>
        </ModalFooter>
      </Modal>
    );
  }

  // Render main pairing UI
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

      <ModalContent className="py-6">
        {/* QR Code - Primary method (larger, more prominent) */}
        <div className="text-center mb-8">
          <p className="text-sm font-medium text-gray-700 mb-4">
            Scan with your TV
          </p>
          <div className="inline-block p-4 bg-white rounded-xl shadow-md border border-gray-100">
            <QRCodeSVG
              value={qrCodeUrl}
              size={180}
              level="M"
              includeMargin={false}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-400">or enter code manually</span>
          </div>
        </div>

        {/* OTP Code - Secondary/fallback method */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-3">
            Enter this code on your TV
          </p>
          <div className="inline-block px-6 py-4 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-3xl font-mono font-bold tracking-widest text-gray-900">
              {formatOtpCode(screen.otp_code)}
            </span>
          </div>

          {/* Expiry timer */}
          {!isExpired ? (
            <p className="text-sm text-gray-400 mt-3">
              Code expires in {formatTimeRemaining(expirySeconds)}
            </p>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-red-500 mb-2">Code expired</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerateNewCode}
                icon={<RefreshCw size={16} />}
              >
                Generate new code
              </Button>
            </div>
          )}
        </div>

        {/* Waiting indicator */}
        <div className="mt-8 flex items-center justify-center gap-2 text-gray-400">
          <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
          <span className="text-sm">Waiting for connection...</span>
        </div>
      </ModalContent>

      <ModalFooter className="flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={onClose}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          I&apos;ll connect a screen later
        </button>
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
