/**
 * useStuckDetection - Stuck detection hook for player recovery
 *
 * Monitors video playback, page activity, and blank screen states.
 * Extracted from Player.jsx as part of Phase 24 refactoring.
 * Extended in Phase 66 with blank screen detection.
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
  blankScreenGraceMs: 10000, // 10 seconds after mount before blank screen checks
  blankConfirmChecks: 3, // Must be blank for 3 consecutive checks (30s total)
};

/**
 * Hook for detecting stuck video playback, page inactivity, and blank screens
 *
 * Monitors video element progress and page activity timestamps.
 * Detects blank screens after a grace period with consecutive confirmation checks.
 * Calls provided callbacks when stuck conditions are detected.
 * Does NOT perform recovery actions - that's the consumer's responsibility.
 *
 * @param {Object} options - Configuration options
 * @param {React.RefObject} options.videoRef - Ref to video element
 * @param {React.RefObject} options.lastVideoTimeRef - Ref tracking last video currentTime
 * @param {React.RefObject} options.lastActivityRef - Ref tracking last activity timestamp
 * @param {React.RefObject} [options.contentContainerRef] - Ref to content container DOM element (Phase 66)
 * @param {boolean} [options.loading] - Whether content is currently loading (Phase 66)
 * @param {Function} [options.onVideoStuck] - Callback when video is stuck
 * @param {Function} [options.onPageStuck] - Callback when page is inactive too long
 * @param {Function} [options.onBlankScreen] - Callback when blank screen is confirmed (Phase 66)
 */
export function useStuckDetection({
  videoRef,
  lastVideoTimeRef,
  lastActivityRef,
  contentContainerRef,
  loading,
  onVideoStuck,
  onPageStuck,
  onBlankScreen,
}) {
  const logger = useLogger('useStuckDetection');
  const intervalRef = useRef(null);
  const mountTimeRef = useRef(Date.now());
  const blankCheckCountRef = useRef(0);

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

      // Blank screen detection (Phase 66)
      if (contentContainerRef?.current && !loading) {
        const elapsed = now - mountTimeRef.current;
        if (elapsed > STUCK_DETECTION.blankScreenGraceMs) {
          const container = contentContainerRef.current;
          const isBlank = container.children.length === 0 ||
                          container.getBoundingClientRect().width === 0 ||
                          container.getBoundingClientRect().height === 0;
          if (isBlank) {
            blankCheckCountRef.current++;
            if (blankCheckCountRef.current >= STUCK_DETECTION.blankConfirmChecks) {
              logger.warn('Blank screen detected', {
                confirmations: blankCheckCountRef.current,
              });
              if (onBlankScreen) {
                onBlankScreen({ confirmations: blankCheckCountRef.current });
              }
              blankCheckCountRef.current = 0;
            }
          } else {
            blankCheckCountRef.current = 0;
          }
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
  }, [videoRef, lastVideoTimeRef, lastActivityRef, contentContainerRef, loading, onVideoStuck, onPageStuck, onBlankScreen, logger]);
}
