/**
 * useRetryWithBackoff - Manages data fetching with exponential backoff retry.
 *
 * Provides bounded retry behavior for async operations: on failure, retries
 * with exponential backoff up to maxRetries, then stops and exposes a manual
 * retry function. On success, polls at a regular interval.
 *
 * @param {Function} fetchFn - Async function to call (must throw on error)
 * @param {Object} options
 * @param {number} [options.maxRetries=5] - Max automatic retries before stopping
 * @param {number} [options.baseDelay=2000] - Base delay in ms for backoff
 * @param {number} [options.maxDelay=30000] - Max delay cap in ms
 * @param {number} [options.pollInterval=30000] - Normal polling interval in ms when healthy
 * @param {boolean} [options.enabled=true] - Whether to start fetching
 *
 * @returns {{ loading: boolean, error: string|null, retryCount: number, maxedOut: boolean, retry: () => void }}
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export function useRetryWithBackoff(fetchFn, options = {}) {
  const {
    maxRetries = 5,
    baseDelay = 2000,
    maxDelay = 30000,
    pollInterval = 30000,
    enabled = true,
  } = options;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [maxedOut, setMaxedOut] = useState(false);

  const timerRef = useRef(null);
  const mountedRef = useRef(true);
  // Track the current retry count inside the async cycle without stale closures
  const retryCountRef = useRef(0);

  // Clear any pending timer
  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Core fetch cycle - defined as a ref-stored function to avoid dependency loops
  const executeFetch = useCallback(async () => {
    if (!mountedRef.current) return;

    setLoading(true);

    try {
      await fetchFn();

      if (!mountedRef.current) return;

      // Success: reset retry state, schedule next poll
      retryCountRef.current = 0;
      setRetryCount(0);
      setError(null);
      setMaxedOut(false);
      setLoading(false);

      // Schedule next healthy poll
      clearTimer();
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          executeFetch();
        }
      }, pollInterval);
    } catch (err) {
      if (!mountedRef.current) return;

      const nextRetry = retryCountRef.current + 1;
      retryCountRef.current = nextRetry;
      setRetryCount(nextRetry);
      setError(err.message || 'An error occurred');
      setLoading(false);

      if (nextRetry >= maxRetries) {
        // Max retries exhausted - stop automatic retries
        setMaxedOut(true);
        clearTimer();
      } else {
        // Schedule next retry with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(2, nextRetry - 1), maxDelay);
        clearTimer();
        timerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            executeFetch();
          }
        }, delay);
      }
    }
  }, [fetchFn, maxRetries, baseDelay, maxDelay, pollInterval, clearTimer]);

  // Manual retry - resets all state and restarts the cycle
  const retry = useCallback(() => {
    retryCountRef.current = 0;
    setRetryCount(0);
    setMaxedOut(false);
    setError(null);
    clearTimer();
    executeFetch();
  }, [executeFetch, clearTimer]);

  // Start/stop based on enabled flag
  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      // Reset and start fresh
      retryCountRef.current = 0;
      setRetryCount(0);
      setMaxedOut(false);
      setError(null);
      executeFetch();
    } else {
      clearTimer();
    }

    return () => {
      mountedRef.current = false;
      clearTimer();
    };
  }, [enabled, executeFetch, clearTimer]);

  return { loading, error, retryCount, maxedOut, retry };
}
