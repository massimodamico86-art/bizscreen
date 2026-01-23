// Data Source Service - CRUD operations for dynamic data sources
import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('DataSourceService');

/**
 * Data source types
 */
export const DATA_SOURCE_TYPES = {
  INTERNAL_TABLE: 'internal_table',
  CSV_IMPORT: 'csv_import',
  GOOGLE_SHEETS: 'google_sheets',
};

/**
 * Integration types for external data sources
 */
export const INTEGRATION_TYPES = {
  NONE: 'none',
  GOOGLE_SHEETS: 'google_sheets',
};

/**
 * Sync status values
 */
export const SYNC_STATUS = {
  OK: 'ok',
  ERROR: 'error',
  NO_CHANGE: 'no_change',
  PENDING: 'pending',
};

/**
 * Field data types
 */
export const FIELD_DATA_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  CURRENCY: 'currency',
  IMAGE_URL: 'image_url',
  BOOLEAN: 'boolean',
  DATE: 'date',
};

/**
 * Default format options by data type
 */
export const DEFAULT_FORMAT_OPTIONS = {
  currency: { symbol: '$', decimals: 2 },
  number: { decimals: 0 },
  date: { format: 'MM/DD/YYYY' },
};

// ============================================================================
// DATA SOURCE CRUD
// ============================================================================

/**
 * Fetch all data sources for the current user's client
 * Uses RPC function for optimized query with counts
 * @returns {Promise<Array>} Array of data sources with field/row counts
 */
export async function fetchDataSources() {
  const { data, error } = await supabase.rpc('list_data_sources');

  if (error) {
    logger.error('Failed to fetch data sources', { error });
    throw error;
  }

  return data || [];
}

/**
 * Get a single data source with all its fields and rows
 * @param {string} id - Data source UUID
 * @returns {Promise<Object|null>} Data source with fields and rows
 */
export async function getDataSource(id) {
  if (!id) {
    throw new Error('Data source ID is required');
  }

  const { data, error } = await supabase.rpc('get_data_source_with_data', {
    p_data_source_id: id,
  });

  if (error) {
    logger.error('Failed to fetch data source', { error });
    throw error;
  }

  return data;
}

/**
 * Get a data source by name (for lookups)
 * @param {string} name - Data source name
 * @returns {Promise<Object|null>} Data source or null
 */
export async function getDataSourceByName(name) {
  if (!name) return null;

  const { data, error } = await supabase
    .from('data_sources')
    .select('id, name, description, type')
    .eq('name', name)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch by name', { error });
    throw error;
  }

  return data;
}

/**
 * Create a new data source
 * @param {Object} dataSource - Data source object
 * @param {string} dataSource.name - Name of the data source
 * @param {string} [dataSource.description] - Description
 * @param {string} [dataSource.type] - Type (defaults to internal_table)
 * @param {string} dataSource.clientId - Client ID
 * @returns {Promise<Object>} Created data source
 */
export async function createDataSource({ name, description, type = DATA_SOURCE_TYPES.INTERNAL_TABLE, clientId }) {
  if (!name?.trim()) {
    throw new Error('Data source name is required');
  }
  if (!clientId) {
    throw new Error('Client ID is required');
  }

  const { data, error } = await supabase
    .from('data_sources')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      type,
      client_id: clientId,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create data source', { error });
    throw error;
  }

  return data;
}

/**
 * Update a data source
 * @param {string} id - Data source UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated data source
 */
export async function updateDataSource(id, updates) {
  if (!id) {
    throw new Error('Data source ID is required');
  }

  const allowedFields = ['name', 'description', 'type'];
  const filteredUpdates = {};

  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  if (Object.keys(filteredUpdates).length === 0) {
    throw new Error('No valid fields to update');
  }

  const { data, error } = await supabase
    .from('data_sources')
    .update(filteredUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update data source', { error });
    throw error;
  }

  return data;
}

/**
 * Delete a data source (cascades to fields and rows)
 * @param {string} id - Data source UUID
 * @returns {Promise<void>}
 */
export async function deleteDataSource(id) {
  if (!id) {
    throw new Error('Data source ID is required');
  }

  const { error } = await supabase.from('data_sources').delete().eq('id', id);

  if (error) {
    logger.error('Failed to delete data source', { error });
    throw error;
  }
}

// ============================================================================
// FIELD CRUD
// ============================================================================

/**
 * Get fields for a data source
 * @param {string} dataSourceId - Data source UUID
 * @returns {Promise<Array>} Array of fields ordered by order_index
 */
export async function getDataSourceFields(dataSourceId) {
  if (!dataSourceId) {
    throw new Error('Data source ID is required');
  }

  const { data, error } = await supabase
    .from('data_source_fields')
    .select('*')
    .eq('data_source_id', dataSourceId)
    .order('order_index');

  if (error) {
    logger.error('Failed to fetch fields', { error });
    throw error;
  }

  return data || [];
}

/**
 * Create a new field
 * @param {Object} field - Field object
 * @param {string} field.dataSourceId - Parent data source ID
 * @param {string} field.name - Machine-readable name
 * @param {string} field.label - Human-readable label
 * @param {string} [field.dataType] - Data type (defaults to text)
 * @param {number} [field.orderIndex] - Order index
 * @param {string} [field.defaultValue] - Default value
 * @param {Object} [field.formatOptions] - Format options
 * @returns {Promise<Object>} Created field
 */
export async function createField({
  dataSourceId,
  name,
  label,
  dataType = FIELD_DATA_TYPES.TEXT,
  orderIndex,
  defaultValue,
  formatOptions,
}) {
  if (!dataSourceId) {
    throw new Error('Data source ID is required');
  }
  if (!name?.trim()) {
    throw new Error('Field name is required');
  }
  if (!label?.trim()) {
    throw new Error('Field label is required');
  }

  // Sanitize name to be a valid identifier
  const sanitizedName = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!sanitizedName) {
    throw new Error('Field name must contain alphanumeric characters');
  }

  // If no order index, get max and add 1
  let finalOrderIndex = orderIndex;
  if (finalOrderIndex === undefined) {
    const { data: maxData } = await supabase
      .from('data_source_fields')
      .select('order_index')
      .eq('data_source_id', dataSourceId)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    finalOrderIndex = (maxData?.order_index ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from('data_source_fields')
    .insert({
      data_source_id: dataSourceId,
      name: sanitizedName,
      label: label.trim(),
      data_type: dataType,
      order_index: finalOrderIndex,
      default_value: defaultValue ?? null,
      format_options: formatOptions ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create field', { error });
    throw error;
  }

  return data;
}

/**
 * Update a field
 * @param {string} id - Field UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated field
 */
export async function updateField(id, updates) {
  if (!id) {
    throw new Error('Field ID is required');
  }

  const allowedFields = ['name', 'label', 'data_type', 'order_index', 'default_value', 'format_options'];
  const filteredUpdates = {};

  // Map camelCase to snake_case
  const fieldMap = {
    dataType: 'data_type',
    orderIndex: 'order_index',
    defaultValue: 'default_value',
    formatOptions: 'format_options',
  };

  for (const [key, value] of Object.entries(updates)) {
    const dbKey = fieldMap[key] || key;
    if (allowedFields.includes(dbKey) && value !== undefined) {
      filteredUpdates[dbKey] = value;
    }
  }

  if (Object.keys(filteredUpdates).length === 0) {
    throw new Error('No valid fields to update');
  }

  const { data, error } = await supabase
    .from('data_source_fields')
    .update(filteredUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update field', { error });
    throw error;
  }

  return data;
}

/**
 * Delete a field
 * @param {string} id - Field UUID
 * @returns {Promise<void>}
 */
export async function deleteField(id) {
  if (!id) {
    throw new Error('Field ID is required');
  }

  const { error } = await supabase.from('data_source_fields').delete().eq('id', id);

  if (error) {
    logger.error('Failed to delete field', { error });
    throw error;
  }
}

/**
 * Reorder fields
 * @param {string} dataSourceId - Data source UUID
 * @param {Array<{id: string, orderIndex: number}>} fieldOrders - Array of field IDs with new order indexes
 * @returns {Promise<void>}
 */
export async function reorderFields(dataSourceId, fieldOrders) {
  if (!dataSourceId) {
    throw new Error('Data source ID is required');
  }

  // Update each field's order_index
  const updates = fieldOrders.map(({ id, orderIndex }) =>
    supabase.from('data_source_fields').update({ order_index: orderIndex }).eq('id', id).eq('data_source_id', dataSourceId)
  );

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error);

  if (errors.length > 0) {
    logger.error('Failed to reorder fields', { errors });
    throw new Error('Failed to reorder some fields');
  }
}

// ============================================================================
// ROW CRUD
// ============================================================================

/**
 * Get rows for a data source
 * @param {string} dataSourceId - Data source UUID
 * @param {Object} [options] - Query options
 * @param {boolean} [options.includeInactive] - Include inactive rows
 * @returns {Promise<Array>} Array of rows ordered by order_index
 */
export async function getDataSourceRows(dataSourceId, { includeInactive = false } = {}) {
  if (!dataSourceId) {
    throw new Error('Data source ID is required');
  }

  let query = supabase
    .from('data_source_rows')
    .select('*')
    .eq('data_source_id', dataSourceId)
    .order('order_index');

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to fetch rows', { error });
    throw error;
  }

  return data || [];
}

/**
 * Create a new row
 * @param {Object} row - Row object
 * @param {string} row.dataSourceId - Parent data source ID
 * @param {Object} row.values - Key-value pairs of field values
 * @param {number} [row.orderIndex] - Order index
 * @returns {Promise<Object>} Created row
 */
export async function createRow({ dataSourceId, values, orderIndex }) {
  if (!dataSourceId) {
    throw new Error('Data source ID is required');
  }

  // If no order index, get max and add 1
  let finalOrderIndex = orderIndex;
  if (finalOrderIndex === undefined) {
    const { data: maxData } = await supabase
      .from('data_source_rows')
      .select('order_index')
      .eq('data_source_id', dataSourceId)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    finalOrderIndex = (maxData?.order_index ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from('data_source_rows')
    .insert({
      data_source_id: dataSourceId,
      values: values || {},
      order_index: finalOrderIndex,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create row', { error });
    throw error;
  }

  return data;
}

/**
 * Update a row
 * @param {string} id - Row UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated row
 */
export async function updateRow(id, updates) {
  if (!id) {
    throw new Error('Row ID is required');
  }

  const allowedFields = ['values', 'order_index', 'is_active'];
  const filteredUpdates = {};

  // Map camelCase to snake_case
  const fieldMap = {
    orderIndex: 'order_index',
    isActive: 'is_active',
  };

  for (const [key, value] of Object.entries(updates)) {
    const dbKey = fieldMap[key] || key;
    if (allowedFields.includes(dbKey) && value !== undefined) {
      filteredUpdates[dbKey] = value;
    }
  }

  if (Object.keys(filteredUpdates).length === 0) {
    throw new Error('No valid fields to update');
  }

  const { data, error } = await supabase.from('data_source_rows').update(filteredUpdates).eq('id', id).select().single();

  if (error) {
    logger.error('Failed to update row', { error });
    throw error;
  }

  return data;
}

/**
 * Update a single field value in a row
 * @param {string} id - Row UUID
 * @param {string} fieldName - Field name to update
 * @param {any} value - New value
 * @returns {Promise<Object>} Updated row
 */
export async function updateRowValue(id, fieldName, value) {
  if (!id) {
    throw new Error('Row ID is required');
  }
  if (!fieldName) {
    throw new Error('Field name is required');
  }

  // First get the current row values
  const { data: currentRow, error: fetchError } = await supabase
    .from('data_source_rows')
    .select('values')
    .eq('id', id)
    .single();

  if (fetchError) {
    logger.error('Failed to fetch row', { error: fetchError });
    throw fetchError;
  }

  // Update the specific field
  const updatedValues = {
    ...currentRow.values,
    [fieldName]: value,
  };

  return updateRow(id, { values: updatedValues });
}

/**
 * Delete a row (hard delete)
 * @param {string} id - Row UUID
 * @returns {Promise<void>}
 */
export async function deleteRow(id) {
  if (!id) {
    throw new Error('Row ID is required');
  }

  const { error } = await supabase.from('data_source_rows').delete().eq('id', id);

  if (error) {
    logger.error('Failed to delete row', { error });
    throw error;
  }
}

/**
 * Soft delete a row (set is_active to false)
 * @param {string} id - Row UUID
 * @returns {Promise<Object>} Updated row
 */
export async function deactivateRow(id) {
  return updateRow(id, { is_active: false });
}

/**
 * Reactivate a soft-deleted row
 * @param {string} id - Row UUID
 * @returns {Promise<Object>} Updated row
 */
export async function reactivateRow(id) {
  return updateRow(id, { is_active: true });
}

/**
 * Reorder rows
 * @param {string} dataSourceId - Data source UUID
 * @param {Array<{id: string, orderIndex: number}>} rowOrders - Array of row IDs with new order indexes
 * @returns {Promise<void>}
 */
export async function reorderRows(dataSourceId, rowOrders) {
  if (!dataSourceId) {
    throw new Error('Data source ID is required');
  }

  // Update each row's order_index
  const updates = rowOrders.map(({ id, orderIndex }) =>
    supabase.from('data_source_rows').update({ order_index: orderIndex }).eq('id', id).eq('data_source_id', dataSourceId)
  );

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error);

  if (errors.length > 0) {
    logger.error('Failed to reorder rows', { errors });
    throw new Error('Failed to reorder some rows');
  }
}

// ============================================================================
// CSV IMPORT
// ============================================================================

/**
 * Parse CSV content into rows
 * @param {string} csvContent - Raw CSV string
 * @param {Object} [options] - Parse options
 * @param {boolean} [options.hasHeaders] - First row is headers (default true)
 * @param {string} [options.delimiter] - Field delimiter (default comma)
 * @returns {{headers: string[], rows: Array<string[]>}} Parsed CSV data
 */
export function parseCSV(csvContent, { hasHeaders = true, delimiter = ',' } = {}) {
  if (!csvContent?.trim()) {
    return { headers: [], rows: [] };
  }

  const lines = csvContent.trim().split(/\r?\n/);

  // Simple CSV parsing (handles quoted fields with commas)
  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parsedLines = lines.map(parseLine);

  if (hasHeaders && parsedLines.length > 0) {
    const headers = parsedLines[0];
    const rows = parsedLines.slice(1);
    return { headers, rows };
  }

  return { headers: [], rows: parsedLines };
}

/**
 * Import CSV data into a data source
 * @param {string} dataSourceId - Data source UUID
 * @param {Array<Object>} rows - Array of {values: {...}} objects
 * @param {Object} [options] - Import options
 * @param {boolean} [options.replaceExisting] - Replace all existing rows
 * @returns {Promise<{importedCount: number}>} Import result
 */
export async function importCSVData(dataSourceId, rows, { replaceExisting = false } = {}) {
  if (!dataSourceId) {
    throw new Error('Data source ID is required');
  }
  if (!Array.isArray(rows)) {
    throw new Error('Rows must be an array');
  }

  const { data, error } = await supabase.rpc('import_csv_to_data_source', {
    p_data_source_id: dataSourceId,
    p_rows: rows.map((r) => ({ values: r.values || r })),
    p_replace_existing: replaceExisting,
  });

  if (error) {
    logger.error('Failed to import CSV', { error });
    throw error;
  }

  return { importedCount: data };
}

/**
 * Create a data source from CSV with auto-detected fields
 * @param {Object} options - Options
 * @param {string} options.name - Data source name
 * @param {string} options.csvContent - Raw CSV content
 * @param {string} options.clientId - Client ID
 * @param {string} [options.description] - Description
 * @param {string} [options.filename] - Original filename
 * @returns {Promise<Object>} Created data source with fields and row count
 */
export async function createDataSourceFromCSV({ name, csvContent, clientId, description, filename }) {
  if (!name?.trim()) {
    throw new Error('Data source name is required');
  }
  if (!csvContent?.trim()) {
    throw new Error('CSV content is required');
  }
  if (!clientId) {
    throw new Error('Client ID is required');
  }

  // Parse CSV
  const { headers, rows } = parseCSV(csvContent);

  if (headers.length === 0) {
    throw new Error('CSV must have at least one column');
  }

  // Create data source
  const dataSource = await createDataSource({
    name,
    description,
    type: DATA_SOURCE_TYPES.CSV_IMPORT,
    clientId,
  });

  try {
    // Create fields from headers
    const fieldPromises = headers.map((header, index) =>
      createField({
        dataSourceId: dataSource.id,
        name: header,
        label: header,
        dataType: FIELD_DATA_TYPES.TEXT,
        orderIndex: index,
      })
    );
    const fields = await Promise.all(fieldPromises);

    // Create field name mapping (sanitized names)
    const fieldNameMap = {};
    fields.forEach((field, index) => {
      fieldNameMap[headers[index]] = field.name;
    });

    // Convert rows to value objects
    const rowObjects = rows.map((row) => {
      const values = {};
      headers.forEach((header, index) => {
        const fieldName = fieldNameMap[header];
        values[fieldName] = row[index] ?? '';
      });
      return { values };
    });

    // Import rows
    await importCSVData(dataSource.id, rowObjects, { replaceExisting: true });

    // Update metadata
    await supabase
      .from('data_sources')
      .update({
        csv_import_metadata: {
          filename,
          importedAt: new Date().toISOString(),
          rowCount: rows.length,
          columnCount: headers.length,
        },
      })
      .eq('id', dataSource.id);

    return {
      ...dataSource,
      fields,
      rowCount: rows.length,
    };
  } catch (error) {
    // Cleanup on failure
    await deleteDataSource(dataSource.id).catch(() => {});
    throw error;
  }
}

// ============================================================================
// DATA BINDING RESOLUTION
// ============================================================================

/**
 * Resolve a single data binding to its value
 * @param {string} dataSourceId - Data source UUID
 * @param {string} fieldName - Field name
 * @param {number} [rowIndex] - Row index (0-based)
 * @returns {Promise<string|null>} Resolved value or null
 */
export async function resolveBinding(dataSourceId, fieldName, rowIndex = 0) {
  if (!dataSourceId || !fieldName) {
    return null;
  }

  const { data, error } = await supabase.rpc('resolve_data_binding', {
    p_data_source_id: dataSourceId,
    p_field_name: fieldName,
    p_row_index: rowIndex,
  });

  if (error) {
    logger.error('Failed to resolve binding', { error });
    return null;
  }

  return data;
}

/**
 * Resolve multiple bindings for a scene/slide
 * @param {Array<Object>} bindings - Array of binding objects
 * @returns {Promise<Map<string, string>>} Map of binding keys to values
 */
export async function resolveMultipleBindings(bindings) {
  const results = new Map();

  if (!Array.isArray(bindings) || bindings.length === 0) {
    return results;
  }

  // Group bindings by data source for efficient fetching
  const byDataSource = new Map();
  for (const binding of bindings) {
    if (!binding.sourceId || !binding.field) continue;

    const key = binding.sourceId;
    if (!byDataSource.has(key)) {
      byDataSource.set(key, []);
    }
    byDataSource.get(key).push(binding);
  }

  // Fetch each data source once and resolve all its bindings
  for (const [dataSourceId, sourceBindings] of byDataSource) {
    const dataSource = await getDataSource(dataSourceId);
    if (!dataSource?.rows) continue;

    for (const binding of sourceBindings) {
      const { field, rowSelector = { mode: 'index', index: 0 } } = binding;

      // Determine which row to use
      let row;
      if (rowSelector.mode === 'index') {
        row = dataSource.rows[rowSelector.index ?? 0];
      } else if (rowSelector.mode === 'match' && rowSelector.matchField && rowSelector.matchValue !== undefined) {
        row = dataSource.rows.find((r) => r.values[rowSelector.matchField] === rowSelector.matchValue);
      } else if (rowSelector.mode === 'all') {
        // Return all values for this field as an array
        const allValues = dataSource.rows.map((r) => r.values[field]);
        const bindingKey = `${dataSourceId}:${field}:all`;
        results.set(bindingKey, allValues);
        continue;
      }

      if (row) {
        const value = row.values[field];
        const bindingKey = `${dataSourceId}:${field}:${JSON.stringify(rowSelector)}`;
        results.set(bindingKey, value ?? '');
      }
    }
  }

  return results;
}

/**
 * Get a binding key for a data binding object
 * @param {Object} binding - Data binding object
 * @returns {string} Unique binding key
 */
export function getBindingKey(binding) {
  if (!binding?.sourceId || !binding?.field) {
    return '';
  }
  const rowSelector = binding.rowSelector || { mode: 'index', index: 0 };
  return `${binding.sourceId}:${binding.field}:${JSON.stringify(rowSelector)}`;
}

// ============================================================================
// VALUE FORMATTING
// ============================================================================

/**
 * Format a value based on field data type and format options
 * @param {any} value - The raw value
 * @param {string} dataType - Field data type
 * @param {Object} [formatOptions] - Format options
 * @returns {string} Formatted value
 */
export function formatValue(value, dataType, formatOptions = {}) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  switch (dataType) {
    case FIELD_DATA_TYPES.CURRENCY: {
      const num = parseFloat(value);
      if (isNaN(num)) return String(value);
      const { symbol = '$', decimals = 2 } = formatOptions;
      return `${symbol}${num.toFixed(decimals)}`;
    }

    case FIELD_DATA_TYPES.NUMBER: {
      const num = parseFloat(value);
      if (isNaN(num)) return String(value);
      const { decimals = 0 } = formatOptions;
      return num.toFixed(decimals);
    }

    case FIELD_DATA_TYPES.BOOLEAN:
      return value === true || value === 'true' || value === '1' ? 'Yes' : 'No';

    case FIELD_DATA_TYPES.DATE: {
      // Handle date-only strings (YYYY-MM-DD) without timezone shift
      const dateOnlyMatch = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      let year, month, day;

      if (dateOnlyMatch) {
        // Parse date-only string directly to avoid timezone issues
        year = parseInt(dateOnlyMatch[1], 10);
        month = dateOnlyMatch[2];
        day = dateOnlyMatch[3];
      } else {
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value);
        month = String(date.getMonth() + 1).padStart(2, '0');
        day = String(date.getDate()).padStart(2, '0');
        year = date.getFullYear();
      }

      // Simple date formatting
      const { format = 'MM/DD/YYYY' } = formatOptions;
      return format.replace('MM', month).replace('DD', day).replace('YYYY', String(year));
    }

    case FIELD_DATA_TYPES.IMAGE_URL:
    case FIELD_DATA_TYPES.TEXT:
    default:
      return String(value);
  }
}

// ============================================================================
// GOOGLE SHEETS INTEGRATION
// ============================================================================

/**
 * Link a data source to a Google Sheet for automatic syncing
 * @param {string} dataSourceId - Data source UUID
 * @param {string} sheetId - Google Sheet ID
 * @param {string} [range] - Sheet range (e.g., 'Sheet1!A:Z')
 * @param {number} [pollIntervalMinutes] - Sync interval in minutes (default 15)
 * @returns {Promise<Object>} Updated data source
 */
export async function linkToGoogleSheet(dataSourceId, sheetId, range = 'Sheet1!A:Z', pollIntervalMinutes = 15) {
  if (!dataSourceId) {
    throw new Error('Data source ID is required');
  }
  if (!sheetId) {
    throw new Error('Google Sheet ID is required');
  }

  const { data, error } = await supabase.rpc('link_data_source_to_google_sheets', {
    p_data_source_id: dataSourceId,
    p_sheet_id: sheetId,
    p_range: range,
    p_poll_interval_minutes: pollIntervalMinutes,
  });

  if (error) {
    logger.error('Failed to link to Google Sheets', { error });
    throw error;
  }

  return data;
}

/**
 * Unlink a data source from its external integration
 * @param {string} dataSourceId - Data source UUID
 * @returns {Promise<Object>} Updated data source
 */
export async function unlinkIntegration(dataSourceId) {
  if (!dataSourceId) {
    throw new Error('Data source ID is required');
  }

  const { data, error } = await supabase.rpc('unlink_data_source_integration', {
    p_data_source_id: dataSourceId,
  });

  if (error) {
    logger.error('Failed to unlink integration', { error });
    throw error;
  }

  return data;
}

/**
 * Update sync status after a sync operation
 * @param {string} dataSourceId - Data source UUID
 * @param {string} status - Sync status (ok, error, no_change)
 * @param {string} [errorMessage] - Error message if status is error
 * @param {number} [rowsUpdated] - Number of rows updated
 * @returns {Promise<void>}
 */
export async function updateSyncStatus(dataSourceId, status, errorMessage = null, rowsUpdated = 0) {
  if (!dataSourceId) {
    throw new Error('Data source ID is required');
  }

  const { error } = await supabase.rpc('update_data_source_sync_status', {
    p_data_source_id: dataSourceId,
    p_status: status,
    p_error_message: errorMessage,
    p_rows_updated: rowsUpdated,
  });

  if (error) {
    logger.error('Failed to update sync status', { error });
    throw error;
  }
}

/**
 * Get data sources that need syncing (poll interval has passed)
 * @returns {Promise<Array>} Array of data sources needing sync
 */
export async function listDataSourcesNeedingSync() {
  const { data, error } = await supabase.rpc('list_data_sources_needing_sync');

  if (error) {
    logger.error('Failed to list sources needing sync', { error });
    throw error;
  }

  return data || [];
}

/**
 * Get data sources with active integrations
 * @returns {Promise<Array>} Array of data sources with integrations
 */
export async function listDataSourcesWithIntegrations() {
  const { data, error } = await supabase
    .from('data_sources')
    .select('*')
    .neq('integration_type', 'none')
    .order('name');

  if (error) {
    logger.error('Failed to list integrated sources', { error });
    throw error;
  }

  return data || [];
}

/**
 * Get sync history for a data source
 * @param {string} dataSourceId - Data source UUID
 * @param {number} [limit] - Max number of logs to return (default 20)
 * @returns {Promise<Array>} Array of sync log entries
 */
export async function getSyncHistory(dataSourceId, limit = 20) {
  if (!dataSourceId) {
    throw new Error('Data source ID is required');
  }

  const { data, error } = await supabase
    .from('data_source_sync_logs')
    .select('*')
    .eq('data_source_id', dataSourceId)
    .order('synced_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Failed to fetch sync history', { error });
    throw error;
  }

  return data || [];
}

/**
 * Sync data source rows (upsert with change detection)
 * @param {string} dataSourceId - Data source UUID
 * @param {Array<Object>} rows - Array of row objects with values
 * @returns {Promise<{rowsUpdated: number, rowsDeleted: number}>} Sync result
 */
export async function syncDataSourceRows(dataSourceId, rows) {
  if (!dataSourceId) {
    throw new Error('Data source ID is required');
  }
  if (!Array.isArray(rows)) {
    throw new Error('Rows must be an array');
  }

  const { data, error } = await supabase.rpc('sync_data_source_rows', {
    p_data_source_id: dataSourceId,
    p_rows: rows,
  });

  if (error) {
    logger.error('Failed to sync rows', { error });
    throw error;
  }

  return data;
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to real-time updates for a data source
 * @param {string} dataSourceId - Data source UUID
 * @param {Function} onUpdate - Callback when rows are updated
 * @returns {Object} Subscription object with unsubscribe method
 */
export function subscribeToDataSource(dataSourceId, onUpdate) {
  if (!dataSourceId) {
    throw new Error('Data source ID is required');
  }
  if (typeof onUpdate !== 'function') {
    throw new Error('onUpdate callback is required');
  }

  // Subscribe to row changes
  const rowSubscription = supabase
    .channel(`data_source_rows:${dataSourceId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'data_source_rows',
        filter: `data_source_id=eq.${dataSourceId}`,
      },
      (payload) => {
        logger.debug('Row change detected', { eventType: payload.eventType });
        onUpdate({
          type: 'row_change',
          eventType: payload.eventType,
          row: payload.new || payload.old,
        });
      }
    )
    .subscribe();

  // Subscribe to data source metadata changes (sync status, etc.)
  const metaSubscription = supabase
    .channel(`data_source_meta:${dataSourceId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'data_sources',
        filter: `id=eq.${dataSourceId}`,
      },
      (payload) => {
        logger.debug('Metadata change detected');
        onUpdate({
          type: 'metadata_change',
          dataSource: payload.new,
        });
      }
    )
    .subscribe();

  return {
    unsubscribe: async () => {
      await supabase.removeChannel(rowSubscription);
      await supabase.removeChannel(metaSubscription);
    },
  };
}

/**
 * Subscribe to all data source updates for a client
 * Used by Player to receive push updates for any data source
 * @param {string} clientId - Client UUID
 * @param {Function} onUpdate - Callback when any data source is updated
 * @returns {Object} Subscription object with unsubscribe method
 */
export function subscribeToClientDataSources(clientId, onUpdate) {
  if (!clientId) {
    throw new Error('Client ID is required');
  }
  if (typeof onUpdate !== 'function') {
    throw new Error('onUpdate callback is required');
  }

  // Subscribe to all row changes for this client's data sources
  const subscription = supabase
    .channel(`client_data_sources:${clientId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'data_source_rows',
      },
      async (payload) => {
        // Verify the data source belongs to this client
        const { data: ds } = await supabase
          .from('data_sources')
          .select('id, client_id')
          .eq('id', payload.new?.data_source_id || payload.old?.data_source_id)
          .single();

        if (ds?.client_id === clientId) {
          logger.debug('Client data source updated', { dataSourceId: ds.id });
          onUpdate({
            dataSourceId: ds.id,
            eventType: payload.eventType,
            row: payload.new || payload.old,
          });
        }
      }
    )
    .subscribe();

  return {
    unsubscribe: async () => {
      await supabase.removeChannel(subscription);
    },
  };
}

/**
 * Broadcast a manual data source update notification
 * Use this after syncing to notify all subscribers
 * @param {string} dataSourceId - Data source UUID
 * @returns {Promise<void>}
 */
export async function broadcastDataSourceUpdate(dataSourceId) {
  if (!dataSourceId) {
    throw new Error('Data source ID is required');
  }

  const { error } = await supabase.rpc('broadcast_data_source_update', {
    p_data_source_id: dataSourceId,
  });

  if (error) {
    logger.warn('Failed to broadcast update', { error });
    // Don't throw - broadcast failures shouldn't break sync
  }
}
