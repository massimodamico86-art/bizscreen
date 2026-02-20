/**
 * useAutoRecovery - Auto-recovery orchestrator with crash counter
 *
 * Manages progressive recovery from blank/frozen/crashed player states.
 * Uses a localStorage-persisted crash counter to prevent infinite reload loops.
 *
 * Recovery strategy (progressive escalation):
 *   Count 0-1: Soft reload (re-fetch content from server)
 *   Count 2-4: Hard reload (window.location.reload)
 *   Count 5:   Cached content fallback (load from IndexedDB)
 *   Count >= 6: Exhausted (stop recovery, render static fallback)
 *
 * @module player/hooks/useAutoRecovery
 */

import { useState, useEffect, useCallback } from 'react';
import { useLogger } from '../../hooks/useLogger.js';
import { getCachedContent } from '../../services/playerService';

/**
 * localStorage keys for recovery state persistence across page reloads
 * @constant
 */
const RECOVERY_KEYS = {
  crashCount: 'player_recovery_count',
  lastRecoveryAt: 'player_last_recovery_at',
  recoveryPhase: 'player_recovery_phase',
};

/**
 * Maximum recovery attempts before giving up
 * @constant
 */
const MAX_RECOVERY_ATTEMPTS = 6;

// ============================================
// Module-level helpers (synchronous localStorage access)
// ============================================

/**
 * Get current crash count from localStorage (synchronous)
 * @returns {number} Current crash count (0 if not set)
 */
function getCrashCount() {
  const count = localStorage.getItem(RECOVERY_KEYS.crashCount);
  return count ? parseInt(count, 10) : 0;
}

/**
 * Increment crash count in localStorage BEFORE recovery attempt
 * @returns {number} New crash count after increment
 */
function incrementCrashCount() {
  const newCount = getCrashCount() + 1;
  localStorage.setItem(RECOVERY_KEYS.crashCount, String(newCount));
  localStorage.setItem(RECOVERY_KEYS.lastRecoveryAt, new Date().toISOString());
  return newCount;
}

/**
 * Reset crash counter (call when content is successfully displayed)
 * Removes all 3 recovery keys from localStorage
 */
function resetCrashCount() {
  localStorage.removeItem(RECOVERY_KEYS.crashCount);
  localStorage.removeItem(RECOVERY_KEYS.lastRecoveryAt);
  localStorage.removeItem(RECOVERY_KEYS.recoveryPhase);
}

/**
 * Determine recovery action based on current crash count
 * @param {number} count - Current crash count
 * @returns {'soft_reload'|'hard_reload'|'cached_fallback'|'exhausted'} Recovery action
 */
function getRecoveryAction(count) {
  if (count >= MAX_RECOVERY_ATTEMPTS) return 'exhausted';
  if (count >= 5) return 'cached_fallback';
  if (count >= 2) return 'hard_reload';
  return 'soft_reload';
}

/**
 * Hook for orchestrating auto-recovery with persistent crash counter
 *
 * @param {Object} options - Configuration options
 * @param {string} options.screenId - Screen UUID
 * @param {React.RefObject} options.contentContainerRef - Ref to content container DOM element
 * @param {React.RefObject} options.loadContentRef - Ref to loadContent function
 * @param {boolean} options.loading - Whether content is currently loading
 * @param {Object|null} options.content - Current content data
 * @returns {Object} Recovery state and trigger function
 * @returns {boolean} returns.isExhausted - Whether all recovery attempts are used up
 * @returns {number} returns.crashCount - Current crash count
 * @returns {Function} returns.triggerRecovery - Async function to trigger recovery with reason string
 */
export function useAutoRecovery({
  screenId,
  contentContainerRef,
  loadContentRef,
  loading,
  content,
}) {
  const logger = useLogger('useAutoRecovery');
  const [isExhausted, setIsExhausted] = useState(false);

  // Check crash count on mount (synchronous read)
  useEffect(() => {
    const count = getCrashCount();
    if (count >= MAX_RECOVERY_ATTEMPTS) {
      logger.error('Recovery exhausted on mount', { crashCount: count });
      setIsExhausted(true);
    }
  }, [logger]);

  // Reset crash counter when content successfully renders
  useEffect(() => {
    if (!loading && content && contentContainerRef?.current?.children?.length > 0) {
      const count = getCrashCount();
      if (count > 0) {
        logger.info('Content displayed successfully, resetting crash counter', {
          previousCount: count,
        });
        resetCrashCount();
      }
    }
  }, [loading, content, contentContainerRef, logger]);

  // Recovery trigger
  const triggerRecovery = useCallback(async (reason) => {
    const count = incrementCrashCount();
    const action = getRecoveryAction(count);

    logger.warn('Recovery triggered', { reason, crashCount: count, action });

    // Store recovery phase for telemetry reporting
    localStorage.setItem(RECOVERY_KEYS.recoveryPhase, action);

    switch (action) {
      case 'soft_reload':
        try {
          await loadContentRef.current?.(screenId, true);
        } catch {
          // Soft reload failed -- next detection cycle will retry
        }
        break;

      case 'hard_reload':
        window.location.reload();
        break;

      case 'cached_fallback':
        try {
          const cached = await getCachedContent(`content-${screenId}`);
          if (cached) {
            await loadContentRef.current?.(screenId, false);
          } else {
            // No cache available, fall through to hard reload
            window.location.reload();
          }
        } catch {
          // Cache read failed, fall through to hard reload
          window.location.reload();
        }
        break;

      case 'exhausted':
        setIsExhausted(true);
        break;
    }
  }, [screenId, loadContentRef, logger]);

  return {
    isExhausted,
    crashCount: getCrashCount(),
    triggerRecovery,
  };
}
