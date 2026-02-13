// src/player/hooks/useDataRefreshOrchestrator.js
// Central data refresh coordinator with registry, tick loop, and deduplication
// Multiple widgets sharing the same data source result in a single fetch

import { useRef, useState, useEffect, useCallback } from 'react';

const TICK_INTERVAL_MS = 10_000; // 10 seconds
const JITTER_MAX_MS = 30_000; // Maximum jitter offset for staggering fetches

/**
 * useDataRefreshOrchestrator - Central coordinator that manages a single tick loop
 * checking which data sources need refreshing.
 *
 * Returns an orchestrator object to be provided via DataRefreshContext:
 *   { register, getData, getAll, version }
 *
 * - register(sourceKey, fetchFn, intervalMs, cacheFn) -> unregister function
 * - getData(sourceKey) -> { data, lastFetchedAt, isLoading, error }
 * - getAll() -> Map of all data store entries
 * - version -> number that increments on every data change (triggers re-renders)
 */
export function useDataRefreshOrchestrator() {
  // Registry: sourceKey -> { fetchFn, intervalMs, cacheFn, lastFetchedAt, isLoading, subscriberCount }
  const registryRef = useRef(new Map());

  // Data store: sourceKey -> { data, lastFetchedAt, isLoading, error }
  const dataStoreRef = useRef(new Map());

  // Version counter for triggering consumer re-renders
  const versionRef = useRef(0);
  const [version, setVersion] = useState(0);

  // Track whether component is mounted to avoid state updates after unmount
  const mountedRef = useRef(true);

  const incrementVersion = useCallback(() => {
    versionRef.current += 1;
    if (mountedRef.current) {
      setVersion(versionRef.current);
    }
  }, []);

  /**
   * Execute a fetch for a specific source key
   */
  const executeFetch = useCallback(async (sourceKey) => {
    const entry = registryRef.current.get(sourceKey);
    if (!entry || entry.isLoading) return;

    // Mark loading in both registry and data store
    entry.isLoading = true;
    const storeEntry = dataStoreRef.current.get(sourceKey) || {
      data: null,
      lastFetchedAt: null,
      isLoading: true,
      error: null,
    };
    storeEntry.isLoading = true;
    dataStoreRef.current.set(sourceKey, storeEntry);
    incrementVersion();

    try {
      const data = await entry.fetchFn();

      const now = Date.now();
      entry.lastFetchedAt = now;
      entry.isLoading = false;

      dataStoreRef.current.set(sourceKey, {
        data,
        lastFetchedAt: now,
        isLoading: false,
        error: null,
      });

      // Cache if cacheFn provided
      if (entry.cacheFn) {
        try {
          await entry.cacheFn(data);
        } catch (cacheErr) {
          console.warn(`[DataRefreshOrchestrator] Cache failed for "${sourceKey}":`, cacheErr);
        }
      }
    } catch (err) {
      console.warn(`[DataRefreshOrchestrator] Fetch failed for "${sourceKey}":`, err);
      entry.isLoading = false;

      const existing = dataStoreRef.current.get(sourceKey) || {
        data: null,
        lastFetchedAt: null,
        isLoading: false,
        error: null,
      };
      existing.isLoading = false;
      existing.error = err;
      dataStoreRef.current.set(sourceKey, existing);
    }

    incrementVersion();
  }, [incrementVersion]);

  /**
   * Register a data source with the orchestrator
   *
   * @param {string} sourceKey - Unique key identifying the data source
   * @param {Function} fetchFn - Async function that fetches data
   * @param {number} intervalMs - Refresh interval in milliseconds
   * @param {Function} [cacheFn] - Optional async function to cache fetched data
   * @returns {Function} unregister - Call to unsubscribe
   */
  const register = useCallback((sourceKey, fetchFn, intervalMs, cacheFn) => {
    const existing = registryRef.current.get(sourceKey);

    if (existing) {
      // Source already registered -- increment subscriber count
      existing.subscriberCount += 1;
      // Update fetchFn/cacheFn in case they changed
      existing.fetchFn = fetchFn;
      existing.cacheFn = cacheFn;
    } else {
      // New source -- add with jitter for staggered refreshes
      const jitter = Math.random() * JITTER_MAX_MS;
      const lastFetchedAt = Date.now() - intervalMs + jitter;

      registryRef.current.set(sourceKey, {
        fetchFn,
        intervalMs,
        cacheFn: cacheFn || null,
        lastFetchedAt,
        isLoading: false,
        subscriberCount: 1,
      });

      // Immediate fetch on first registration
      executeFetch(sourceKey);
    }

    // Return unregister function
    let unregistered = false;
    return () => {
      if (unregistered) return;
      unregistered = true;

      const entry = registryRef.current.get(sourceKey);
      if (!entry) return;

      entry.subscriberCount -= 1;

      // When no subscribers remain, stop polling but keep cached data
      // (registry entry removed so tick loop skips it, dataStore preserved)
      if (entry.subscriberCount <= 0) {
        registryRef.current.delete(sourceKey);
      }
    };
  }, [executeFetch]);

  /**
   * Get data for a specific source key
   *
   * @param {string} sourceKey
   * @returns {{ data: any, lastFetchedAt: number|null, isLoading: boolean, error: Error|null }}
   */
  const getData = useCallback((sourceKey) => {
    const entry = dataStoreRef.current.get(sourceKey);
    if (!entry) {
      return { data: null, lastFetchedAt: null, isLoading: false, error: null };
    }
    return { ...entry };
  }, []);

  /**
   * Get the full data store map (for debugging)
   *
   * @returns {Map}
   */
  const getAll = useCallback(() => {
    return dataStoreRef.current;
  }, []);

  // Master tick loop
  useEffect(() => {
    const tickId = setInterval(() => {
      const now = Date.now();

      for (const [sourceKey, entry] of registryRef.current.entries()) {
        if (
          entry.subscriberCount > 0 &&
          !entry.isLoading &&
          now - entry.lastFetchedAt >= entry.intervalMs
        ) {
          executeFetch(sourceKey);
        }
      }
    }, TICK_INTERVAL_MS);

    return () => clearInterval(tickId);
  }, [executeFetch]);

  // Track mount state for safe state updates
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { register, getData, getAll, version };
}
