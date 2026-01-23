/**
 * Data Feed Scheduler Service
 *
 * Manages periodic syncing of data sources with external integrations.
 * Runs client-side and checks for data sources that need syncing.
 *
 * Features:
 * - Periodic check for data sources due for sync
 * - Automatic retry on failure
 * - Rate limiting to prevent API abuse
 * - Event emission for sync status changes
 */

import { supabase } from '../supabase';
import { syncDataSourceFromSheet, INTEGRATION_TYPES } from './googleSheetsService';
import {
  raiseDataSourceSyncFailedAlert,
  autoResolveAlert,
  ALERT_TYPES,
} from './alertEngineService';
import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('DataFeedScheduler');

// ============================================================================
// SCHEDULER CONFIGURATION
// ============================================================================

const DEFAULT_CHECK_INTERVAL = 60 * 1000; // 1 minute
const MIN_CHECK_INTERVAL = 30 * 1000; // 30 seconds minimum
const MAX_CONCURRENT_SYNCS = 3;
const RETRY_DELAY = 5 * 60 * 1000; // 5 minutes retry delay on error

// ============================================================================
// SCHEDULER STATE
// ============================================================================

let schedulerInterval = null;
let isSchedulerRunning = false;
let activeSyncs = new Set();
let failedSources = new Map(); // sourceId -> lastFailureTime
let syncListeners = [];

// ============================================================================
// EVENT SYSTEM
// ============================================================================

/**
 * Subscribe to sync events
 * @param {function} callback - Called with {type, sourceId, data}
 * @returns {function} Unsubscribe function
 */
export function onSyncEvent(callback) {
  syncListeners.push(callback);
  return () => {
    syncListeners = syncListeners.filter(cb => cb !== callback);
  };
}

/**
 * Emit a sync event
 * @param {string} type - Event type
 * @param {string} sourceId - Data source ID
 * @param {object} data - Event data
 */
function emitSyncEvent(type, sourceId, data = {}) {
  const event = { type, sourceId, data, timestamp: new Date() };
  syncListeners.forEach(callback => {
    try {
      callback(event);
    } catch (err) {
      logger.error('Event listener error', { error: err });
    }
  });
}

// Event types
export const SYNC_EVENTS = {
  SYNC_STARTED: 'sync_started',
  SYNC_COMPLETED: 'sync_completed',
  SYNC_FAILED: 'sync_failed',
  SYNC_SKIPPED: 'sync_skipped',
  SCHEDULER_STARTED: 'scheduler_started',
  SCHEDULER_STOPPED: 'scheduler_stopped',
};

// ============================================================================
// SCHEDULER CONTROL
// ============================================================================

/**
 * Start the data feed scheduler
 * @param {number} checkInterval - Interval between checks in milliseconds
 */
export function startScheduler(checkInterval = DEFAULT_CHECK_INTERVAL) {
  if (isSchedulerRunning) {
    logger.debug('Scheduler already running');
    return;
  }

  const interval = Math.max(checkInterval, MIN_CHECK_INTERVAL);

  logger.info('Starting scheduler', { interval });

  isSchedulerRunning = true;
  emitSyncEvent(SYNC_EVENTS.SCHEDULER_STARTED, null, { interval });

  // Run immediately
  runScheduledCheck();

  // Set up periodic checks
  schedulerInterval = setInterval(runScheduledCheck, interval);
}

/**
 * Stop the data feed scheduler
 */
export function stopScheduler() {
  if (!isSchedulerRunning) return;

  logger.info('Stopping scheduler');

  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }

  isSchedulerRunning = false;
  emitSyncEvent(SYNC_EVENTS.SCHEDULER_STOPPED, null);
}

/**
 * Check if scheduler is running
 * @returns {boolean}
 */
export function isRunning() {
  return isSchedulerRunning;
}

/**
 * Get scheduler status
 * @returns {object}
 */
export function getStatus() {
  return {
    running: isSchedulerRunning,
    activeSyncs: activeSyncs.size,
    failedSources: failedSources.size,
    listeners: syncListeners.length,
  };
}

// ============================================================================
// SYNC EXECUTION
// ============================================================================

/**
 * Run a scheduled check for data sources needing sync
 */
async function runScheduledCheck() {
  if (activeSyncs.size >= MAX_CONCURRENT_SYNCS) {
    logger.debug('Max concurrent syncs reached, skipping check');
    return;
  }

  try {
    // Get data sources that need syncing
    const { data: sourcesToSync, error } = await supabase
      .rpc('list_data_sources_needing_sync');

    if (error) {
      logger.error('Failed to get sources', { error });
      return;
    }

    if (!sourcesToSync || sourcesToSync.length === 0) {
      return;
    }

    logger.debug('Found sources needing sync', { count: sourcesToSync.length });

    // Process each source (up to max concurrent)
    for (const source of sourcesToSync) {
      if (activeSyncs.size >= MAX_CONCURRENT_SYNCS) break;
      if (activeSyncs.has(source.id)) continue;

      // Check if this source recently failed
      const lastFailure = failedSources.get(source.id);
      if (lastFailure && Date.now() - lastFailure < RETRY_DELAY) {
        emitSyncEvent(SYNC_EVENTS.SYNC_SKIPPED, source.id, {
          reason: 'Recent failure, waiting for retry delay',
        });
        continue;
      }

      // Start sync in background
      syncDataSource(source);
    }
  } catch (err) {
    logger.error('Check error', { error: err });
  }
}

/**
 * Sync a single data source
 * @param {object} source - Data source to sync
 */
async function syncDataSource(source) {
  activeSyncs.add(source.id);
  emitSyncEvent(SYNC_EVENTS.SYNC_STARTED, source.id, { name: source.name });

  try {
    // Get full data source details for sync
    const { data: fullSource, error: fetchError } = await supabase
      .rpc('get_data_source_with_data', { p_data_source_id: source.id });

    if (fetchError) throw fetchError;

    // Determine sync method based on integration type
    let result;
    switch (source.integration_type) {
      case INTEGRATION_TYPES.GOOGLE_SHEETS:
        result = await syncDataSourceFromSheet({
          ...fullSource,
          integration_config: source.integration_config,
        });
        break;

      default:
        result = { success: false, message: `Unknown integration type: ${source.integration_type}` };
    }

    if (result.success) {
      // Clear from failed sources on success
      failedSources.delete(source.id);

      // Auto-resolve any open sync failure alerts
      try {
        await autoResolveAlert({
          type: ALERT_TYPES.DATA_SOURCE_SYNC_FAILED,
          dataSourceId: source.id,
          notes: 'Data source sync succeeded',
        });
      } catch (alertError) {
        logger.warn('Error resolving alert', { error: alertError });
      }

      emitSyncEvent(SYNC_EVENTS.SYNC_COMPLETED, source.id, {
        name: source.name,
        message: result.message,
        changes: result.changes,
      });
    } else {
      // Track failure
      failedSources.set(source.id, Date.now());

      // Raise sync failure alert
      try {
        await raiseDataSourceSyncFailedAlert(
          {
            id: source.id,
            name: source.name,
            tenant_id: source.tenant_id,
            type: source.integration_type,
          },
          { message: result.message }
        );
      } catch (alertError) {
        logger.warn('Error raising alert', { error: alertError });
      }

      emitSyncEvent(SYNC_EVENTS.SYNC_FAILED, source.id, {
        name: source.name,
        message: result.message,
      });
    }
  } catch (err) {
    logger.error('Sync error', { sourceId: source.id, error: err });

    failedSources.set(source.id, Date.now());

    // Raise sync failure alert
    try {
      await raiseDataSourceSyncFailedAlert(
        {
          id: source.id,
          name: source.name,
          tenant_id: source.tenant_id,
          type: source.integration_type,
        },
        err
      );
    } catch (alertError) {
      logger.warn('Error raising alert', { error: alertError });
    }

    emitSyncEvent(SYNC_EVENTS.SYNC_FAILED, source.id, {
      name: source.name,
      message: err.message,
    });
  } finally {
    activeSyncs.delete(source.id);
  }
}

/**
 * Manually trigger a sync for a specific data source
 * @param {string} dataSourceId
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function triggerManualSync(dataSourceId) {
  if (activeSyncs.has(dataSourceId)) {
    return { success: false, message: 'Sync already in progress' };
  }

  try {
    // Get data source details
    const { data: source, error } = await supabase
      .rpc('get_data_source_with_data', { p_data_source_id: dataSourceId });

    if (error) throw error;
    if (!source) throw new Error('Data source not found');

    if (!source.integrationConfig?.sheetId) {
      return { success: false, message: 'No external integration configured' };
    }

    activeSyncs.add(dataSourceId);
    emitSyncEvent(SYNC_EVENTS.SYNC_STARTED, dataSourceId, { name: source.name, manual: true });

    // Run sync based on integration type
    let result;
    const integrationType = source.integrationType || source.integrationString || 'none';

    if (integrationType === INTEGRATION_TYPES.GOOGLE_SHEETS) {
      result = await syncDataSourceFromSheet({
        id: source.id,
        name: source.name,
        rows: source.rows,
        integration_config: source.integrationConfig,
      });
    } else {
      result = { success: false, message: `Unknown integration type: ${integrationType}` };
    }

    if (result.success) {
      failedSources.delete(dataSourceId);
      emitSyncEvent(SYNC_EVENTS.SYNC_COMPLETED, dataSourceId, {
        name: source.name,
        message: result.message,
        changes: result.changes,
        manual: true,
      });
    } else {
      emitSyncEvent(SYNC_EVENTS.SYNC_FAILED, dataSourceId, {
        name: source.name,
        message: result.message,
        manual: true,
      });
    }

    return result;
  } catch (err) {
    logger.error('Manual sync error', { error: err });
    emitSyncEvent(SYNC_EVENTS.SYNC_FAILED, dataSourceId, {
      message: err.message,
      manual: true,
    });
    return { success: false, message: err.message };
  } finally {
    activeSyncs.delete(dataSourceId);
  }
}

/**
 * Clear failed status for a data source (allow immediate retry)
 * @param {string} dataSourceId
 */
export function clearFailedStatus(dataSourceId) {
  failedSources.delete(dataSourceId);
}

/**
 * Clear all failed statuses
 */
export function clearAllFailedStatuses() {
  failedSources.clear();
}

// ============================================================================
// AUTO-START ON PAGE VISIBILITY
// ============================================================================

/**
 * Initialize scheduler with visibility-aware behavior
 * Pauses when tab is hidden, resumes when visible
 */
export function initializeWithVisibilityAwareness() {
  // Start scheduler
  startScheduler();

  // Handle visibility changes
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        logger.debug('Tab hidden, pausing scheduler');
        stopScheduler();
      } else {
        logger.debug('Tab visible, resuming scheduler');
        startScheduler();
      }
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  startScheduler,
  stopScheduler,
  isRunning,
  getStatus,
  triggerManualSync,
  clearFailedStatus,
  clearAllFailedStatuses,
  onSyncEvent,
  initializeWithVisibilityAwareness,
  SYNC_EVENTS,
};
