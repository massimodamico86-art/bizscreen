/**
 * Google Sheets Service
 *
 * Service for fetching and syncing data from Google Sheets.
 * Uses the Google Sheets API v4 (read-only, public sheets).
 *
 * Features:
 * - Fetch sheet data via API key
 * - Convert sheet rows to internal format
 * - Detect changes between old and new data
 * - Sync data sources from sheets
 */

import { supabase } from '../supabase';

import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('GoogleSheetsService');

// Get API key from environment
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// Google Sheets API base URL
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

export const INTEGRATION_TYPES = {
  NONE: 'none',
  GOOGLE_SHEETS: 'google_sheets',
};

// Sync status values
export const SYNC_STATUS = {
  OK: 'ok',
  ERROR: 'error',
  NO_CHANGE: 'no_change',
  PENDING: 'pending',
};

// ============================================================================
// GOOGLE SHEETS API
// ============================================================================

/**
 * Parse a Google Sheets URL to extract the sheet ID
 * @param {string} urlOrId - Full URL or sheet ID
 * @returns {string|null} Sheet ID or null if invalid
 */
export function parseSheetId(urlOrId) {
  if (!urlOrId) return null;

  // If it's already just an ID (no slashes)
  if (!urlOrId.includes('/')) {
    return urlOrId;
  }

  // Parse from URL: https://docs.google.com/spreadsheets/d/{SHEET_ID}/...
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Fetch data from a Google Sheet
 * @param {string} sheetId - Google Sheet ID
 * @param {string} range - A1 notation range (e.g., 'Sheet1!A1:C50' or 'A1:C50')
 * @returns {Promise<{headers: string[], rows: object[]}>}
 */
export async function fetchSheetData(sheetId, range = 'A1:Z1000') {
  if (!GOOGLE_API_KEY) {
    throw new Error('Google API key not configured. Set VITE_GOOGLE_API_KEY in your environment.');
  }

  const parsedId = parseSheetId(sheetId);
  if (!parsedId) {
    throw new Error('Invalid Google Sheet ID or URL');
  }

  // Build API URL
  const url = `${SHEETS_API_BASE}/${parsedId}/values/${encodeURIComponent(range)}?key=${GOOGLE_API_KEY}&valueRenderOption=FORMATTED_VALUE`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 403) {
        throw new Error('Sheet is not publicly accessible. Make sure the sheet is shared with "Anyone with the link".');
      }
      if (response.status === 404) {
        throw new Error('Sheet not found. Check the Sheet ID and make sure it exists.');
      }
      throw new Error(error.error?.message || `Failed to fetch sheet: ${response.status}`);
    }

    const data = await response.json();
    const values = data.values || [];

    if (values.length === 0) {
      return { headers: [], rows: [] };
    }

    // First row is headers
    const headers = values[0].map((h, i) => normalizeHeaderName(h || `Column${i + 1}`));

    // Rest are data rows
    const rows = values.slice(1).map((row, rowIndex) => {
      const values = {};
      headers.forEach((header, i) => {
        values[header] = row[i] !== undefined ? String(row[i]) : '';
      });
      return { values, orderIndex: rowIndex };
    });

    return { headers, rows };
  } catch (error) {
    logger.error('Fetch error:', { error: error });
    throw error;
  }
}

/**
 * Normalize a header name to be a valid field name
 * @param {string} header - Original header text
 * @returns {string} Normalized field name
 */
function normalizeHeaderName(header) {
  // Convert to lowercase, replace spaces/special chars with underscores
  return header
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    || 'column';
}

/**
 * Convert sheet values to internal row format
 * @param {string[]} headers - Header names
 * @param {any[][]} sheetValues - Raw sheet values (excluding header row)
 * @returns {object[]} Array of row objects with values
 */
export function convertSheetRowsToInternalRows(headers, sheetValues) {
  return sheetValues.map((row, index) => {
    const values = {};
    headers.forEach((header, i) => {
      values[header] = row[i] !== undefined ? String(row[i]) : '';
    });
    return { values, orderIndex: index };
  });
}

/**
 * Detect changes between old and new row data
 * @param {object[]} oldRows - Existing rows
 * @param {object[]} newRows - New rows from sheet
 * @returns {{changed: boolean, addedCount: number, removedCount: number, updatedCount: number, summary: string}}
 */
export function detectChangedRows(oldRows, newRows) {
  const oldCount = oldRows?.length || 0;
  const newCount = newRows?.length || 0;

  // Quick check: if counts differ, there are definitely changes
  if (oldCount !== newCount) {
    return {
      changed: true,
      addedCount: Math.max(0, newCount - oldCount),
      removedCount: Math.max(0, oldCount - newCount),
      updatedCount: 0,
      summary: `Row count changed from ${oldCount} to ${newCount}`,
    };
  }

  // Deep comparison of values
  let updatedCount = 0;
  for (let i = 0; i < newCount; i++) {
    const oldValues = oldRows[i]?.values || {};
    const newValues = newRows[i]?.values || {};

    // Compare all keys
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
    for (const key of allKeys) {
      if (String(oldValues[key] || '') !== String(newValues[key] || '')) {
        updatedCount++;
        break; // Count each row only once
      }
    }
  }

  return {
    changed: updatedCount > 0,
    addedCount: 0,
    removedCount: 0,
    updatedCount,
    summary: updatedCount > 0
      ? `${updatedCount} row${updatedCount === 1 ? '' : 's'} updated`
      : 'No changes detected',
  };
}

/**
 * Generate field definitions from headers
 * @param {string[]} headers - Column headers
 * @param {object[]} sampleRows - Sample rows to infer types
 * @returns {object[]} Field definitions
 */
export function generateFieldDefinitions(headers, sampleRows = []) {
  return headers.map((name, index) => {
    // Try to infer data type from sample values
    let dataType = 'text';
    if (sampleRows.length > 0) {
      const sampleValue = sampleRows[0]?.values?.[name];
      if (sampleValue !== undefined && sampleValue !== '') {
        dataType = inferDataType(sampleValue);
      }
    }

    return {
      name,
      label: formatLabelFromName(name),
      dataType,
      orderIndex: index,
    };
  });
}

/**
 * Infer data type from a sample value
 * @param {string} value - Sample value
 * @returns {string} Data type
 */
function inferDataType(value) {
  const str = String(value).trim();

  // Currency (starts with $ or ends with currency symbol)
  if (/^\$[\d,]+\.?\d*$/.test(str) || /^[\d,]+\.?\d*\s*\$?$/.test(str)) {
    return 'currency';
  }

  // Number (integers or decimals)
  if (/^-?[\d,]+\.?\d*$/.test(str) && !isNaN(parseFloat(str.replace(/,/g, '')))) {
    return 'number';
  }

  // Boolean
  if (/^(true|false|yes|no|0|1)$/i.test(str)) {
    return 'boolean';
  }

  // Date (various formats)
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str) || /^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return 'date';
  }

  // URL (image)
  if (/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)/i.test(str)) {
    return 'image_url';
  }

  return 'text';
}

/**
 * Format a field name as a human-readable label
 * @param {string} name - Field name
 * @returns {string} Human-readable label
 */
function formatLabelFromName(name) {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ============================================================================
// DATA SOURCE SYNC
// ============================================================================

/**
 * Sync a data source from its linked Google Sheet
 * @param {object} dataSource - Data source object with integration config
 * @returns {Promise<{success: boolean, message: string, changes: object}>}
 */
export async function syncDataSourceFromSheet(dataSource) {
  const startTime = Date.now();

  if (!dataSource?.integration_config?.sheetId) {
    return {
      success: false,
      message: 'No Google Sheet linked to this data source',
      changes: null,
    };
  }

  const { sheetId, range = 'A1:Z1000' } = dataSource.integration_config;

  try {
    // Fetch sheet data
    const { headers, rows } = await fetchSheetData(sheetId, range);

    if (headers.length === 0) {
      return {
        success: false,
        message: 'Sheet appears to be empty or has no headers',
        changes: null,
      };
    }

    // Generate field definitions
    const fieldDefinitions = generateFieldDefinitions(headers, rows);

    // Detect changes
    const changes = detectChangedRows(dataSource.rows || [], rows);

    // If no changes, just update sync status
    if (!changes.changed) {
      await updateSyncStatus(dataSource.id, SYNC_STATUS.NO_CHANGE, {
        message: 'No changes detected',
        syncDurationMs: Date.now() - startTime,
      });

      return {
        success: true,
        message: 'No changes detected',
        changes,
      };
    }

    // Sync rows to database
    const { data: syncResult, error: syncError } = await supabase
      .rpc('sync_data_source_rows', {
        p_data_source_id: dataSource.id,
        p_new_rows: rows.map(r => ({ values: r.values })),
        p_field_definitions: fieldDefinitions,
      });

    if (syncError) throw syncError;

    // Update sync status
    await updateSyncStatus(dataSource.id, SYNC_STATUS.OK, {
      message: changes.summary,
      changedRows: changes.addedCount + changes.removedCount + changes.updatedCount,
      addedRows: changes.addedCount,
      removedRows: changes.removedCount,
      updatedRows: changes.updatedCount,
      syncDurationMs: Date.now() - startTime,
    });

    // Broadcast update for real-time listeners
    await broadcastDataSourceUpdate(dataSource.id);

    return {
      success: true,
      message: changes.summary,
      changes,
      rowCount: rows.length,
    };
  } catch (error) {
    logger.error('Sync error:', { error: error });

    // Update sync status with error
    await updateSyncStatus(dataSource.id, SYNC_STATUS.ERROR, {
      message: error.message,
      error: error.message,
      syncDurationMs: Date.now() - startTime,
    });

    return {
      success: false,
      message: error.message,
      changes: null,
    };
  }
}

/**
 * Update sync status in database
 * @param {string} dataSourceId
 * @param {string} status
 * @param {object} options
 */
async function updateSyncStatus(dataSourceId, status, options = {}) {
  try {
    await supabase.rpc('update_data_source_sync_status', {
      p_data_source_id: dataSourceId,
      p_status: status,
      p_message: options.message || null,
      p_changed_rows: options.changedRows || 0,
      p_added_rows: options.addedRows || 0,
      p_removed_rows: options.removedRows || 0,
      p_updated_rows: options.updatedRows || 0,
      p_sync_duration_ms: options.syncDurationMs || null,
      p_error: options.error || null,
    });
  } catch (err) {
    logger.error('Failed to update sync status:', { error: err });
  }
}

/**
 * Broadcast data source update notification
 * @param {string} dataSourceId
 */
async function broadcastDataSourceUpdate(dataSourceId) {
  try {
    await supabase.rpc('broadcast_data_source_update', {
      p_data_source_id: dataSourceId,
    });
  } catch (err) {
    logger.error('Failed to broadcast update:', { error: err });
  }
}

// ============================================================================
// LINK/UNLINK OPERATIONS
// ============================================================================

/**
 * Link a data source to a Google Sheet
 * @param {string} dataSourceId
 * @param {string} sheetIdOrUrl - Sheet ID or full URL
 * @param {string} range - A1 notation range
 * @param {number} pollIntervalMinutes - Sync interval
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function linkToGoogleSheet(dataSourceId, sheetIdOrUrl, range = 'A1:Z1000', pollIntervalMinutes = 5) {
  const sheetId = parseSheetId(sheetIdOrUrl);
  if (!sheetId) {
    return { success: false, message: 'Invalid Google Sheet ID or URL' };
  }

  try {
    // Test fetch to validate the sheet is accessible
    await fetchSheetData(sheetId, range);

    // Link in database
    const { error } = await supabase.rpc('link_data_source_to_google_sheets', {
      p_data_source_id: dataSourceId,
      p_sheet_id: sheetId,
      p_range: range,
      p_poll_interval_minutes: pollIntervalMinutes,
    });

    if (error) throw error;

    return { success: true, message: 'Successfully linked to Google Sheet' };
  } catch (error) {
    logger.error('Link error:', { error: error });
    return { success: false, message: error.message };
  }
}

/**
 * Unlink a data source from external integration
 * @param {string} dataSourceId
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function unlinkIntegration(dataSourceId) {
  try {
    const { error } = await supabase.rpc('unlink_data_source_integration', {
      p_data_source_id: dataSourceId,
    });

    if (error) throw error;

    return { success: true, message: 'Integration removed' };
  } catch (error) {
    logger.error('Unlink error:', { error: error });
    return { success: false, message: error.message };
  }
}

// ============================================================================
// SYNC HISTORY
// ============================================================================

/**
 * Get sync history for a data source
 * @param {string} dataSourceId
 * @param {number} limit
 * @returns {Promise<object[]>}
 */
export async function getSyncHistory(dataSourceId, limit = 20) {
  try {
    const { data, error } = await supabase.rpc('get_data_source_sync_history', {
      p_data_source_id: dataSourceId,
      p_limit: limit,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Failed to get sync history:', { error: error });
    return [];
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  INTEGRATION_TYPES,
  SYNC_STATUS,
  parseSheetId,
  fetchSheetData,
  convertSheetRowsToInternalRows,
  detectChangedRows,
  generateFieldDefinitions,
  syncDataSourceFromSheet,
  linkToGoogleSheet,
  unlinkIntegration,
  getSyncHistory,
};
