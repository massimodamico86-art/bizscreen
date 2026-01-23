/**
 * useKioskMode - Kiosk mode management hook
 *
 * Handles kiosk mode state, fullscreen management, and password-protected exit.
 * Extracted from Player.jsx ViewPage as part of Phase 7 refactoring.
 *
 * @module player/hooks/useKioskMode
 */

import { useState, useEffect, useCallback } from 'react';
import { useLogger } from '../../hooks/useLogger.js';
import {
  isFullscreen,
  enterFullscreen,
  exitFullscreen,
  validateKioskPassword,
  validatePinOffline,
} from '../../services/playerService';

const STORAGE_KEYS = {
  kioskMode: 'player_kiosk_mode',
  kioskPassword: 'player_kiosk_password',
};

/**
 * Hook for managing kiosk mode in the player
 *
 * @returns {Object} Kiosk mode state and handlers
 * @returns {boolean} kioskMode - Whether kiosk mode is active
 * @returns {boolean} showKioskExit - Whether the exit dialog is shown
 * @returns {string} kioskPasswordInput - Current password input value
 * @returns {string} kioskPasswordError - Password validation error message
 * @returns {Function} setKioskPasswordInput - Setter for password input
 * @returns {Function} handleKioskExit - Handler to attempt exit with password
 * @returns {Function} cancelKioskExit - Handler to cancel exit dialog
 * @returns {Function} initKioskMode - Initialize kiosk mode from localStorage
 */
export function useKioskMode() {
  const logger = useLogger('useKioskMode');

  // Kiosk mode state
  const [kioskMode, setKioskMode] = useState(() =>
    localStorage.getItem(STORAGE_KEYS.kioskMode) === 'true'
  );
  const [showKioskExit, setShowKioskExit] = useState(false);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [kioskPasswordInput, setKioskPasswordInput] = useState('');
  const [kioskPasswordError, setKioskPasswordError] = useState('');

  // Initialize kiosk mode on mount (enter fullscreen if enabled)
  useEffect(() => {
    if (kioskMode) {
      enterFullscreen().catch((err) =>
        logger.warn('Failed to enter fullscreen on init', { error: err })
      );
    }
  }, []); // Only run on mount

  // Keyboard handler (Escape to show exit dialog)
  useEffect(() => {
    if (!kioskMode) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowKioskExit(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [kioskMode]);

  // Re-enter fullscreen if exited in kiosk mode
  useEffect(() => {
    if (!kioskMode) return;

    const handleFullscreenChange = () => {
      if (!isFullscreen() && kioskMode) {
        // Re-enter fullscreen after a short delay
        setTimeout(() => {
          enterFullscreen().catch((err) =>
            logger.warn('Failed to re-enter fullscreen', { error: err })
          );
        }, 100);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [kioskMode, logger]);

  // Handle kiosk exit with password validation
  const handleKioskExit = useCallback(async () => {
    const savedPassword = localStorage.getItem(STORAGE_KEYS.kioskPassword);

    if (savedPassword) {
      // Validate password (supports both online and offline validation)
      const isValid = await validateKioskPassword(kioskPasswordInput, savedPassword);
      if (!isValid) {
        setKioskPasswordError('Incorrect password');
        return;
      }
    }

    // Exit kiosk mode
    setKioskMode(false);
    setShowKioskExit(false);
    setKioskPasswordInput('');
    setKioskPasswordError('');
    localStorage.setItem(STORAGE_KEYS.kioskMode, 'false');
    exitFullscreen().catch((err) =>
      logger.warn('Failed to exit fullscreen', { error: err })
    );
  }, [kioskPasswordInput, logger]);

  // Cancel kiosk exit
  const cancelKioskExit = useCallback(() => {
    setShowKioskExit(false);
    setKioskPasswordInput('');
    setKioskPasswordError('');
  }, []);

  // Handle kiosk exit with PIN (new method)
  const handlePinExit = useCallback(async (pin) => {
    try {
      const isValid = await validatePinOffline(pin);
      if (!isValid) {
        return false; // Let PinEntry component handle error display
      }

      // Exit kiosk mode
      setKioskMode(false);
      setShowPinEntry(false);
      localStorage.setItem(STORAGE_KEYS.kioskMode, 'false');
      exitFullscreen().catch((err) =>
        logger.warn('Failed to exit fullscreen', { error: err })
      );
      logger.info('Exited kiosk mode via PIN');
      return true;
    } catch (err) {
      logger.error('PIN validation error', { error: err });
      return false;
    }
  }, [logger]);

  // Show PIN entry (called by tap sequence trigger)
  const showPinEntryDialog = useCallback(() => {
    setShowPinEntry(true);
  }, []);

  // Dismiss PIN entry
  const dismissPinEntry = useCallback(() => {
    setShowPinEntry(false);
  }, []);

  // Initialize kiosk mode (for manual triggering from parent component)
  const initKioskMode = useCallback(() => {
    const savedKioskMode = localStorage.getItem(STORAGE_KEYS.kioskMode);
    if (savedKioskMode === 'true') {
      setKioskMode(true);
      enterFullscreen().catch((err) =>
        logger.warn('Failed to enter fullscreen', { error: err })
      );
    }
  }, [logger]);

  return {
    kioskMode,
    showKioskExit,
    showPinEntry,
    kioskPasswordInput,
    kioskPasswordError,
    setKioskPasswordInput,
    handleKioskExit,
    handlePinExit,
    cancelKioskExit,
    showPinEntryDialog,
    dismissPinEntry,
    initKioskMode,
  };
}
