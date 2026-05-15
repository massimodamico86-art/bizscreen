import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook that provides an AbortSignal scoped to the component lifecycle.
 * Aborts on unmount and when dependencies change.
 * Handles React 19 StrictMode double-invocation (mount -> abort -> remount).
 *
 * @returns {{ getSignal: () => AbortSignal }}
 */
export function useAbortSignal() {
  const controllerRef = useRef(null);

  useEffect(() => {
    // Only create a controller if getSignal() has not already lazily created
    // one during the render phase. Replacing an existing controller here would
    // orphan the signal the caller already holds (it would never be aborted).
    if (!controllerRef.current) {
      controllerRef.current = new AbortController();
    }
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, []);

  const getSignal = useCallback(() => {
    if (!controllerRef.current) {
      controllerRef.current = new AbortController();
    }
    return controllerRef.current.signal;
  }, []);

  return { getSignal };
}

export default useAbortSignal;
