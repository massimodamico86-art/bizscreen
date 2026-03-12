/**
 * useApiCall - Wraps any async data-fetching function with exponential backoff
 * retry, loading/error/data state management, and a refetch interface.
 *
 * Composes useRetryWithBackoff internally, adding data state management on top.
 * Unlike useRetryWithBackoff (which expects a void function that throws on error),
 * useApiCall accepts a function that RETURNS data.
 *
 * @param {Function} fetchFn - Async function that returns data (e.g., () => fetchScreens(tenantId))
 * @param {Object} [options]
 * @param {number} [options.maxRetries=3] - Max automatic retries before stopping
 * @param {number} [options.baseDelay=1000] - Base delay in ms for exponential backoff
 * @param {number} [options.maxDelay=10000] - Max delay cap in ms
 * @param {number} [options.pollInterval=0] - Polling interval in ms (0 = no auto-polling)
 * @param {boolean} [options.enabled=true] - Whether to start fetching
 * @param {*} [options.initialData=null] - Initial data value before first fetch
 * @param {Function} [options.onSuccess] - Callback invoked with data on successful fetch
 * @param {Function} [options.onError] - Callback invoked with error on failed fetch
 *
 * @returns {{ data: *, loading: boolean, error: string|null, retryCount: number, maxedOut: boolean, retry: () => void, refetch: () => void }}
 *
 * @example
 * const { data: screens, loading, error, maxedOut, retry } = useApiCall(
 *   () => fetchScreens(tenantId),
 *   { enabled: !!tenantId }
 * );
 *
 * if (loading) return <Skeleton />;
 * if (maxedOut) return <ErrorState onRetry={retry} />;
 * return <ScreenList screens={screens} />;
 */
import { useState, useCallback, useRef } from 'react';
import { useRetryWithBackoff } from './useRetryWithBackoff';

export function useApiCall(fetchFn, options = {}) {
  const {
    initialData = null,
    onSuccess,
    onError,
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    pollInterval = 0,
    enabled = true,
  } = options;

  const [data, setData] = useState(initialData);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  // Wrapper that bridges useRetryWithBackoff's void/throw contract
  // with useApiCall's data-returning contract
  const wrappedFetchFn = useCallback(async () => {
    try {
      const result = await fetchFn();
      setData(result);
      if (onSuccessRef.current) {
        onSuccessRef.current(result);
      }
    } catch (err) {
      if (onErrorRef.current) {
        onErrorRef.current(err);
      }
      throw err; // Re-throw so useRetryWithBackoff handles retry logic
    }
  }, [fetchFn]);

  const { loading, error, retryCount, maxedOut, retry } = useRetryWithBackoff(
    wrappedFetchFn,
    {
      maxRetries,
      baseDelay,
      maxDelay,
      pollInterval,
      enabled,
    }
  );

  // refetch clears current data and retries from scratch
  const refetch = useCallback(() => {
    setData(initialData);
    retry();
  }, [retry, initialData]);

  return { data, loading, error, retryCount, maxedOut, retry, refetch };
}
