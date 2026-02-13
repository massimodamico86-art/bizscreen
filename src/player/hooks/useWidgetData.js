// src/player/hooks/useWidgetData.js
// Consumer hook for widgets to subscribe to the data refresh orchestrator
// Falls back to standalone fetch when no DataRefreshProvider wraps the widget

import { useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { DataRefreshContext } from '../contexts/DataRefreshContext.jsx';

/**
 * useWidgetData - Subscribe to the orchestrator for coordinated data fetching
 *
 * When wrapped in a DataRefreshProvider, this registers the data source with
 * the central orchestrator so multiple widgets sharing the same sourceKey
 * result in a single fetch.
 *
 * When no provider is present (e.g., widget rendered in isolation), falls back
 * to a standalone fetch on mount with a console warning.
 *
 * @param {string} sourceKey - Unique key identifying the data source
 * @param {Function} fetchFn - Async function that fetches data
 * @param {number} intervalMs - Refresh interval in milliseconds
 * @param {Function} [cacheFn] - Optional async function to cache fetched data
 * @returns {{ data: any, lastFetchedAt: number|null, isLoading: boolean, error: Error|null }}
 */
export function useWidgetData(sourceKey, fetchFn, intervalMs, cacheFn) {
  const orchestrator = useContext(DataRefreshContext);

  // --- Orchestrated path: register/unregister ---
  const unregisterRef = useRef(null);

  useEffect(() => {
    if (!orchestrator) return;

    // Clean up previous registration if deps changed
    if (unregisterRef.current) {
      unregisterRef.current();
    }

    unregisterRef.current = orchestrator.register(sourceKey, fetchFn, intervalMs, cacheFn);

    return () => {
      if (unregisterRef.current) {
        unregisterRef.current();
        unregisterRef.current = null;
      }
    };
  }, [orchestrator, sourceKey, fetchFn, intervalMs, cacheFn]);

  // Read orchestrator version to trigger re-renders when data changes.
  // This is a state value from the orchestrator that increments on every fetch completion.
  const orchestratorVersion = orchestrator?.version;

  // Compute orchestrated result (memoized on version + sourceKey changes)
  const orchestratedResult = useMemo(() => {
    if (!orchestrator) return null;
    return orchestrator.getData(sourceKey);
    // orchestratorVersion ensures this recomputes when data updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orchestrator, sourceKey, orchestratorVersion]);

  // --- Fallback path (no provider) ---
  const [fallbackState, setFallbackState] = useState({
    data: null,
    lastFetchedAt: null,
    isLoading: false,
    error: null,
  });

  const fallbackWarned = useRef(false);

  const executeFallbackFetch = useCallback(async () => {
    setFallbackState((prev) => ({ ...prev, isLoading: true }));
    try {
      const data = await fetchFn();
      setFallbackState({
        data,
        lastFetchedAt: Date.now(),
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setFallbackState((prev) => ({
        ...prev,
        isLoading: false,
        error: err,
      }));
    }
  }, [fetchFn]);

  useEffect(() => {
    if (orchestrator) return; // Using orchestrated path

    if (!fallbackWarned.current) {
      console.warn(
        `[useWidgetData] No DataRefreshProvider found for "${sourceKey}". ` +
        'Falling back to standalone fetch. Wrap your widget tree in <DataRefreshProvider> ' +
        'to enable coordinated data refresh.'
      );
      fallbackWarned.current = true;
    }

    executeFallbackFetch();
  }, [orchestrator, sourceKey, executeFallbackFetch]);

  // Return orchestrator data or fallback data
  if (orchestratedResult) {
    return orchestratedResult;
  }

  return fallbackState;
}
