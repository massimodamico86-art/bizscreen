/**
 * useTapSequence - Hidden tap gesture detection hook
 *
 * Tracks consecutive taps within a timeout window. Used for the hidden
 * kiosk exit trigger (5 taps in bottom-right corner with no visual feedback).
 *
 * Design decisions:
 * - Uses refs instead of state to avoid re-renders (no visual feedback)
 * - Timeout resets on each tap (not cumulative)
 * - Callback only fires once sequence completes
 *
 * @module player/hooks/useTapSequence
 */

import { useRef, useCallback } from 'react';

/**
 * Hook for detecting a sequence of consecutive taps
 *
 * @param {Object} options - Configuration options
 * @param {number} options.requiredTaps - Number of taps to trigger (default: 5)
 * @param {number} options.timeoutMs - Max time between taps in ms (default: 2000)
 * @param {Function} options.onTrigger - Callback when sequence completes
 * @returns {Object} { handleTap, reset } - Attach handleTap to onClick/onTouchEnd
 *
 * @example
 * const { handleTap } = useTapSequence({
 *   requiredTaps: 5,
 *   timeoutMs: 2000,
 *   onTrigger: () => setShowPinEntry(true)
 * });
 *
 * <div onClick={handleTap} onTouchEnd={handleTap} />
 */
export function useTapSequence({
  requiredTaps = 5,
  timeoutMs = 2000,
  onTrigger
} = {}) {
  // Use refs to avoid re-renders (no visual feedback during sequence)
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  const handleTap = useCallback((event) => {
    // Prevent double-firing on touch devices (both onClick and onTouchEnd)
    if (event.type === 'touchend') {
      event.preventDefault();
    }

    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;

    // Reset if timeout exceeded between taps
    if (timeSinceLastTap > timeoutMs) {
      tapCountRef.current = 0;
    }

    // Record this tap
    lastTapTimeRef.current = now;
    tapCountRef.current += 1;

    // Check if sequence complete
    if (tapCountRef.current >= requiredTaps) {
      // Reset for next sequence
      tapCountRef.current = 0;
      lastTapTimeRef.current = 0;

      // Fire callback
      onTrigger?.();
    }
  }, [requiredTaps, timeoutMs, onTrigger]);

  // Expose reset function for edge cases (component unmount, etc.)
  const reset = useCallback(() => {
    tapCountRef.current = 0;
    lastTapTimeRef.current = 0;
  }, []);

  return {
    handleTap,
    reset
  };
}

export default useTapSequence;
