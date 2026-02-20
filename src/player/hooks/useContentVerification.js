/**
 * useContentVerification - Content verification state management with transition-aware re-sync
 *
 * Manages the content mismatch lifecycle:
 * 1. Heartbeat detects mismatch -> onMismatchDetected queues a pending sync
 * 2. At playlist item transition -> checkAndSync attempts content reload
 * 3. Retries up to MAX_SYNC_RETRIES times before gracefully giving up
 * 4. Never interrupts active playback -- sync only happens between items
 *
 * Completely separate from Phase 66 auto-recovery (crash counter).
 * Mismatch is NOT a crash -- it's a content version discrepancy.
 *
 * @module player/hooks/useContentVerification
 */

import { useRef, useCallback, useEffect } from 'react';
import { useLogger } from '../../hooks/useLogger.js';

const MAX_SYNC_RETRIES = 3;

/**
 * Hook for content verification and transition-aware re-sync
 *
 * @param {Object} params
 * @param {string} params.screenId - Screen UUID
 * @param {React.RefObject} params.loadContentRef - Ref to loadContent function for re-fetching
 * @param {Object} params.content - Current content object from usePlayerContent
 * @returns {Object} Verification controls
 */
export function useContentVerification({ screenId, loadContentRef, content }) {
  const logger = useLogger('useContentVerification');

  // All refs -- no useState to avoid unnecessary re-renders
  const pendingSyncRef = useRef(false);
  const retryCountRef = useRef(0);

  /**
   * Called by heartbeat when server signals content mismatch.
   * Queues a re-sync but does NOT trigger any immediate action.
   * Sync happens at the next playlist item transition (VERI-04).
   */
  const onMismatchDetected = useCallback((expectedVersion, reportedVersion) => {
    if (pendingSyncRef.current) {
      // Already pending -- don't log again to avoid noise
      return;
    }
    logger.warn('Content mismatch detected', {
      expected: expectedVersion,
      reported: reportedVersion,
    });
    pendingSyncRef.current = true;
  }, [logger]);

  /**
   * Called at playlist item transition points (between items).
   * If a sync is pending, attempts to reload content.
   *
   * @returns {Promise<boolean>} true if content was successfully reloaded
   */
  const checkAndSync = useCallback(async () => {
    if (!pendingSyncRef.current) {
      return false;
    }

    logger.info('Attempting content sync at transition point', {
      retryCount: retryCountRef.current,
      maxRetries: MAX_SYNC_RETRIES,
    });

    try {
      await loadContentRef.current?.(screenId, false);
      // Success -- reset state
      logger.info('Content sync successful');
      pendingSyncRef.current = false;
      retryCountRef.current = 0;
      return true;
    } catch (err) {
      retryCountRef.current += 1;
      if (retryCountRef.current >= MAX_SYNC_RETRIES) {
        logger.warn('Content sync retries exhausted, keeping current content', {
          retryCount: retryCountRef.current,
          error: err.message,
        });
        // Give up gracefully -- stale content is better than blank
        pendingSyncRef.current = false;
        retryCountRef.current = 0;
      } else {
        logger.warn('Content sync failed, will retry at next transition', {
          retryCount: retryCountRef.current,
          maxRetries: MAX_SYNC_RETRIES,
          error: err.message,
        });
      }
      return false;
    }
  }, [screenId, loadContentRef, logger]);

  /**
   * Getter for pending sync state
   */
  const hasPendingSync = useCallback(() => {
    return pendingSyncRef.current;
  }, []);

  /**
   * Auto-reset effect: when content identity changes (successful reload
   * through any path -- manual publish, needs_refresh push, polling, etc.),
   * reset pending sync and retry counter.
   */
  useEffect(() => {
    pendingSyncRef.current = false;
    retryCountRef.current = 0;
  }, [
    content?.mode,
    content?.source,
    content?.playlist?.id,
    content?.layout?.id,
  ]);

  return {
    onMismatchDetected,
    checkAndSync,
    hasPendingSync,
  };
}
