/**
 * useStuckDetection - Stuck detection hook for player recovery
 *
 * Monitors video playback and page activity to detect stuck states.
 * Extracted from Player.jsx as part of Phase 24 refactoring.
 *
 * @module player/hooks/useStuckDetection
 */

import { useEffect, useRef } from 'react';
import { useLogger } from '../../hooks/useLogger.js';

/**
 * Stuck detection thresholds
 * @constant
 */
const STUCK_DETECTION = {
  maxVideoStallMs: 30000, // 30 seconds without video progress
  maxNoActivityMs: 300000, // 5 minutes without any activity
  checkIntervalMs: 10000, // Check every 10 seconds
};

/**
 * Hook for detecting stuck video playback and page inactivity
 *
 * Monitors video element progress and page activity timestamps.
 * Calls provided callbacks when stuck conditions are detected.
 * Does NOT perform recovery actions - that's the consumer's responsibility.
 *
 * @param {Object} options - Configuration options
 * @param {React.RefObject} options.videoRef - Ref to video element
 * @param {React.RefObject} options.lastVideoTimeRef - Ref tracking last video currentTime
 * @param {React.RefObject} options.lastActivityRef - Ref tracking last activity timestamp
 * @param {Function} [options.onVideoStuck] - Callback when video is stuck
 * @param {Function} [options.onPageStuck] - Callback when page is inactive too long
 */
export function useStuckDetection({
  videoRef,
  lastVideoTimeRef,
  lastActivityRef,
  onVideoStuck,
  onPageStuck,
}) {
  const logger = useLogger('useStuckDetection');
  const intervalRef = useRef(null);

  useEffect(() => {
    const checkStuck = () => {
      const now = Date.now();

      // Check for video stall
      if (videoRef?.current && !videoRef.current.paused && !videoRef.current.ended) {
        const currentTime = videoRef.current.currentTime;

        if (currentTime === lastVideoTimeRef?.current) {
          // Video hasn't progressed
          const stallDuration = now - (lastActivityRef?.current || now);

          if (stallDuration > STUCK_DETECTION.maxVideoStallMs) {
            logger.warn('Video stuck detected', {
              stallDuration,
              threshold: STUCK_DETECTION.maxVideoStallMs,
            });

            // Notify consumer - they decide what action to take
            if (onVideoStuck) {
              onVideoStuck({ stallDuration, currentTime });
            }

            // Reset activity timer after notification
            if (lastActivityRef) {
              lastActivityRef.current = now;
            }
          }
        } else {
          // Video is progressing - update tracking refs
          if (lastVideoTimeRef) {
            lastVideoTimeRef.current = currentTime;
          }
          if (lastActivityRef) {
            lastActivityRef.current = now;
          }
        }
      }

      // Check for general inactivity (page might be frozen)
      const inactiveDuration = now - (lastActivityRef?.current || now);

      if (inactiveDuration > STUCK_DETECTION.maxNoActivityMs) {
        logger.warn('Page inactive for too long', {
          inactiveDuration,
          threshold: STUCK_DETECTION.maxNoActivityMs,
        });

        // Notify consumer - they decide what action to take
        if (onPageStuck) {
          onPageStuck({ inactiveDuration });
        }
      }
    };

    // Start monitoring
    intervalRef.current = setInterval(checkStuck, STUCK_DETECTION.checkIntervalMs);
    logger.debug('Stuck detection started', {
      checkInterval: STUCK_DETECTION.checkIntervalMs,
    });

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        logger.debug('Stuck detection stopped');
      }
    };
  }, [videoRef, lastVideoTimeRef, lastActivityRef, onVideoStuck, onPageStuck, logger]);
}
