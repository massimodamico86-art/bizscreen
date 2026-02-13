// src/player/contexts/DataRefreshContext.js
// React context for the data refresh orchestrator
// Provides centralized data fetching coordination to all player widgets

import { createContext } from 'react';

/**
 * DataRefreshContext - Shares the data refresh orchestrator with widget tree
 *
 * Value shape (provided by useDataRefreshOrchestrator):
 *   { register, getData, getAll, version }
 *
 * Default is null -- widgets detect missing provider and fall back to standalone fetch.
 */
export const DataRefreshContext = createContext(null);

/**
 * DataRefreshProvider - Wraps player widget tree with orchestrator context
 *
 * @param {Object} props
 * @param {Object} props.value - Orchestrator object from useDataRefreshOrchestrator
 * @param {React.ReactNode} props.children
 */
export function DataRefreshProvider({ value, children }) {
  return (
    <DataRefreshContext.Provider value={value}>
      {children}
    </DataRefreshContext.Provider>
  );
}
