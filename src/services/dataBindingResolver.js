// Data Binding Resolver - Utilities for resolving data bindings in Editor and Player
import { getDataSource, formatValue, FIELD_DATA_TYPES } from './dataSourceService';

/**
 * Cache for resolved data sources
 * Key: dataSourceId, Value: { data, timestamp, expiresAt }
 */
const dataSourceCache = new Map();

/**
 * Cache TTL in milliseconds (5 minutes for editor, configurable for player)
 */
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/**
 * Clear the data source cache
 */
export function clearBindingCache() {
  dataSourceCache.clear();
}

/**
 * Clear a specific data source from cache
 * @param {string} dataSourceId - Data source ID to clear
 */
export function clearCachedDataSource(dataSourceId) {
  dataSourceCache.delete(dataSourceId);
}

/**
 * Get a data source with caching
 * @param {string} dataSourceId - Data source UUID
 * @param {Object} [options] - Options
 * @param {number} [options.cacheTTL] - Cache TTL in ms
 * @param {boolean} [options.forceRefresh] - Force cache refresh
 * @returns {Promise<Object|null>} Data source with fields and rows
 */
export async function getCachedDataSource(dataSourceId, { cacheTTL = DEFAULT_CACHE_TTL, forceRefresh = false } = {}) {
  if (!dataSourceId) return null;

  const cached = dataSourceCache.get(dataSourceId);
  const now = Date.now();

  // Return cached if valid and not forcing refresh
  if (cached && !forceRefresh && cached.expiresAt > now) {
    return cached.data;
  }

  // Fetch fresh data
  try {
    const data = await getDataSource(dataSourceId);
    if (data) {
      dataSourceCache.set(dataSourceId, {
        data,
        timestamp: now,
        expiresAt: now + cacheTTL,
      });
    }
    return data;
  } catch (error) {
    console.error('[DataBindingResolver] Failed to fetch data source:', error);
    // Return stale data if available
    return cached?.data || null;
  }
}

/**
 * Preload multiple data sources into cache
 * @param {string[]} dataSourceIds - Array of data source IDs to preload
 * @param {Object} [options] - Options
 * @returns {Promise<Map<string, Object>>} Map of data source IDs to their data
 */
export async function preloadDataSources(dataSourceIds, options = {}) {
  const results = new Map();
  if (!Array.isArray(dataSourceIds)) return results;
  const uniqueIds = [...new Set(dataSourceIds.filter(Boolean))];

  await Promise.all(
    uniqueIds.map(async (id) => {
      const data = await getCachedDataSource(id, options);
      if (data) {
        results.set(id, data);
      }
    })
  );

  return results;
}

/**
 * Resolve a single data binding to its display value
 * @param {Object} binding - Data binding object
 * @param {string} binding.sourceId - Data source UUID
 * @param {string} binding.field - Field name
 * @param {Object} [binding.rowSelector] - Row selector
 * @param {Object} [binding.format] - Format options
 * @param {Object} [options] - Options
 * @param {Map<string, Object>} [options.preloadedSources] - Preloaded data sources
 * @returns {Promise<string>} Resolved and formatted value
 */
export async function resolveBinding(binding, options = {}) {
  if (!binding?.sourceId || !binding?.field) {
    return '';
  }

  const { sourceId, field, rowSelector = { mode: 'index', index: 0 }, format = {} } = binding;
  const { preloadedSources } = options;

  // Get data source (from preloaded or cache)
  let dataSource = preloadedSources?.get(sourceId);
  if (!dataSource) {
    dataSource = await getCachedDataSource(sourceId);
  }

  if (!dataSource?.rows?.length) {
    return format.fallback || '';
  }

  // Find the target row
  let row;
  if (rowSelector.mode === 'index') {
    const index = rowSelector.index ?? 0;
    row = dataSource.rows[index];
  } else if (rowSelector.mode === 'match' && rowSelector.matchField && rowSelector.matchValue !== undefined) {
    row = dataSource.rows.find((r) => r.values?.[rowSelector.matchField] === rowSelector.matchValue);
  }

  if (!row) {
    return format.fallback || '';
  }

  // Get raw value
  const rawValue = row.values?.[field];

  if (rawValue === undefined || rawValue === null) {
    return format.fallback || '';
  }

  // Find field definition for data type
  const fieldDef = dataSource.fields?.find((f) => f.name === field);
  const dataType = fieldDef?.dataType || FIELD_DATA_TYPES.TEXT;
  const formatOptions = { ...(fieldDef?.formatOptions || {}), ...format };

  // Format and return
  return formatValue(rawValue, dataType, formatOptions);
}

/**
 * Resolve all bindings in a block
 * @param {Object} block - Block with potential dataBinding property
 * @param {Object} [options] - Options
 * @param {Map<string, Object>} [options.preloadedSources] - Preloaded data sources
 * @returns {Promise<Object>} Block with resolved values
 */
export async function resolveBlockBindings(block, options = {}) {
  if (!block) return block;

  const resolved = { ...block };

  // Check for dataBinding property
  if (block.dataBinding) {
    // For text blocks, resolve the content binding
    if (block.dataBinding.sourceId && block.dataBinding.field) {
      const value = await resolveBinding(block.dataBinding, options);
      if (value) {
        resolved.resolvedContent = value;
      }
    }
  }

  // Check for individual property bindings
  if (block.propertyBindings) {
    resolved.resolvedProperties = {};
    for (const [propName, binding] of Object.entries(block.propertyBindings)) {
      const value = await resolveBinding(binding, options);
      resolved.resolvedProperties[propName] = value;
    }
  }

  return resolved;
}

/**
 * Resolve all bindings in a slide's blocks
 * @param {Array<Object>} blocks - Array of blocks
 * @param {Object} [options] - Options
 * @returns {Promise<Array<Object>>} Blocks with resolved values
 */
export async function resolveSlideBindings(blocks, options = {}) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return blocks;
  }

  // Collect all unique data source IDs
  const dataSourceIds = new Set();
  for (const block of blocks) {
    if (block.dataBinding?.sourceId) {
      dataSourceIds.add(block.dataBinding.sourceId);
    }
    if (block.propertyBindings) {
      for (const binding of Object.values(block.propertyBindings)) {
        if (binding?.sourceId) {
          dataSourceIds.add(binding.sourceId);
        }
      }
    }
  }

  // Preload all data sources
  const preloadedSources = await preloadDataSources([...dataSourceIds], options);

  // Resolve all blocks
  return Promise.all(blocks.map((block) => resolveBlockBindings(block, { ...options, preloadedSources })));
}

/**
 * Extract all data source IDs from a design_json
 * @param {Object} designJson - Scene design JSON
 * @returns {string[]} Array of unique data source IDs
 */
export function extractDataSourceIds(designJson) {
  const ids = new Set();

  if (!designJson?.slides) return [];

  for (const slide of designJson.slides) {
    if (!slide?.blocks) continue;

    for (const block of slide.blocks) {
      if (block.dataBinding?.sourceId) {
        ids.add(block.dataBinding.sourceId);
      }
      if (block.propertyBindings) {
        for (const binding of Object.values(block.propertyBindings)) {
          if (binding?.sourceId) {
            ids.add(binding.sourceId);
          }
        }
      }
    }
  }

  return [...ids];
}

/**
 * Check if a block has any data bindings
 * @param {Object} block - Block to check
 * @returns {boolean} True if block has bindings
 */
export function hasBindings(block) {
  if (!block) return false;
  return !!(block.dataBinding?.sourceId || (block.propertyBindings && Object.keys(block.propertyBindings).length > 0));
}

/**
 * Get display text for a binding (for UI)
 * @param {Object} binding - Data binding object
 * @returns {string} Human-readable binding description
 */
export function getBindingDisplayText(binding) {
  if (!binding?.sourceId || !binding?.field) {
    return 'No binding';
  }

  const { rowSelector = { mode: 'index', index: 0 } } = binding;

  let rowDesc = '';
  if (rowSelector.mode === 'index') {
    rowDesc = `Row ${(rowSelector.index ?? 0) + 1}`;
  } else if (rowSelector.mode === 'match') {
    rowDesc = `${rowSelector.matchField}="${rowSelector.matchValue}"`;
  } else if (rowSelector.mode === 'all') {
    rowDesc = 'All rows';
  }

  return `${binding.field} (${rowDesc})`;
}

/**
 * Create a binding object
 * @param {Object} params - Binding parameters
 * @param {string} params.sourceId - Data source ID
 * @param {string} params.field - Field name
 * @param {Object} [params.rowSelector] - Row selector
 * @param {Object} [params.format] - Format options
 * @returns {Object} Data binding object
 */
export function createBinding({ sourceId, field, rowSelector, format }) {
  const binding = {
    sourceId,
    field,
    rowSelector: rowSelector || { mode: 'index', index: 0 },
  };

  if (format) {
    binding.format = format;
  }

  return binding;
}

/**
 * Create a row selector for index-based access
 * @param {number} index - Row index (0-based)
 * @returns {Object} Row selector
 */
export function indexRowSelector(index) {
  return { mode: 'index', index };
}

/**
 * Create a row selector for match-based access
 * @param {string} matchField - Field to match on
 * @param {any} matchValue - Value to match
 * @returns {Object} Row selector
 */
export function matchRowSelector(matchField, matchValue) {
  return { mode: 'match', matchField, matchValue };
}

/**
 * Create a row selector for all rows
 * @returns {Object} Row selector
 */
export function allRowsSelector() {
  return { mode: 'all' };
}

// ============================================================================
// PLAYER-SPECIFIC UTILITIES
// ============================================================================

/**
 * Prefetch all data sources for a scene (for player startup)
 * @param {Object} designJson - Scene design JSON
 * @param {Object} [options] - Options
 * @param {number} [options.cacheTTL] - Cache TTL (longer for player)
 * @returns {Promise<boolean>} True if all sources loaded successfully
 */
export async function prefetchSceneDataSources(designJson, options = { cacheTTL: 30 * 60 * 1000 }) {
  const dataSourceIds = extractDataSourceIds(designJson);

  if (dataSourceIds.length === 0) {
    return true;
  }

  try {
    await preloadDataSources(dataSourceIds, options);
    return true;
  } catch (error) {
    console.error('[DataBindingResolver] Failed to prefetch data sources:', error);
    return false;
  }
}

/**
 * Check if data sources need refresh (for player polling)
 * @param {string[]} dataSourceIds - Data source IDs to check
 * @param {number} [maxAge] - Maximum age in ms before refresh needed
 * @returns {string[]} Array of data source IDs that need refresh
 */
export function getStaleDataSourceIds(dataSourceIds, maxAge = 5 * 60 * 1000) {
  const now = Date.now();
  const stale = [];

  for (const id of dataSourceIds) {
    const cached = dataSourceCache.get(id);
    if (!cached || cached.timestamp + maxAge < now) {
      stale.push(id);
    }
  }

  return stale;
}

/**
 * Refresh stale data sources
 * @param {Object} designJson - Scene design JSON
 * @param {number} [maxAge] - Maximum age in ms
 * @returns {Promise<number>} Number of sources refreshed
 */
export async function refreshStaleDataSources(designJson, maxAge = 5 * 60 * 1000) {
  const dataSourceIds = extractDataSourceIds(designJson);
  const staleIds = getStaleDataSourceIds(dataSourceIds, maxAge);

  if (staleIds.length === 0) {
    return 0;
  }

  await preloadDataSources(staleIds, { forceRefresh: true });
  return staleIds.length;
}
