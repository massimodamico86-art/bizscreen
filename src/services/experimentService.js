/**
 * Experiment Service - A/B testing and experiment variant assignment
 *
 * Provides functions to get experiment variants for the current tenant,
 * with stable assignment and caching support.
 */
import { supabase } from '../supabase';

// In-memory cache for experiment variants
let variantCache = {
  data: new Map(),
  tenantId: null,
  timestamp: null,
  ttl: 10 * 60 * 1000, // 10 minutes cache TTL
};

// localStorage key for persistent cache
const CACHE_KEY = 'bizscreen_experiment_variants';

/**
 * @typedef {Object} ExperimentVariant
 * @property {string} experimentKey - Experiment identifier
 * @property {string} variantKey - Assigned variant key
 * @property {string} variantName - Display name of the variant
 * @property {Object} config - Variant-specific configuration
 * @property {boolean} isNewAssignment - Whether this is a fresh assignment
 */

/**
 * Load cached variants from localStorage
 * @returns {Object|null}
 */
function loadFromLocalStorage() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.timestamp && Date.now() - parsed.timestamp < variantCache.ttl) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load experiment variants from localStorage:', e);
  }
  return null;
}

/**
 * Save variants to localStorage
 * @param {Object} cacheData
 */
function saveToLocalStorage(cacheData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (e) {
    console.warn('Failed to save experiment variants to localStorage:', e);
  }
}

/**
 * Clear the experiment cache
 */
export function clearExperimentCache() {
  variantCache = {
    data: new Map(),
    tenantId: null,
    timestamp: null,
    ttl: variantCache.ttl,
  };
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (e) {
    // Ignore localStorage errors
  }
}

/**
 * Get the current user's tenant ID
 * @returns {Promise<string|null>}
 */
async function getCurrentTenantId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // In this schema, user.id IS the tenant_id for clients
  // (profiles.id = auth.users.id = tenant identifier)
  return user.user_metadata?.tenant_id || user.id;
}

/**
 * Get a variant for a specific experiment
 * @param {string} experimentKey - The experiment key
 * @param {boolean} [forceRefresh=false] - Bypass cache
 * @returns {Promise<ExperimentVariant|null>}
 */
export async function getVariant(experimentKey, forceRefresh = false) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return null;
  }

  // Check in-memory cache
  if (
    !forceRefresh &&
    variantCache.tenantId === tenantId &&
    variantCache.data.has(experimentKey) &&
    variantCache.timestamp &&
    Date.now() - variantCache.timestamp < variantCache.ttl
  ) {
    return variantCache.data.get(experimentKey);
  }

  // Check localStorage cache
  if (!forceRefresh) {
    const localCache = loadFromLocalStorage();
    if (localCache && localCache.tenantId === tenantId && localCache.data) {
      const cachedVariants = new Map(localCache.data);
      if (cachedVariants.has(experimentKey)) {
        variantCache.data = cachedVariants;
        variantCache.tenantId = tenantId;
        variantCache.timestamp = localCache.timestamp;
        return cachedVariants.get(experimentKey);
      }
    }
  }

  // Fetch from database
  const { data, error } = await supabase.rpc('get_experiment_variant', {
    p_tenant_id: tenantId,
    p_experiment_key: experimentKey,
  });

  if (error) {
    console.error('Error fetching experiment variant:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const row = data[0];
  const variant = {
    experimentKey: row.experiment_key,
    variantKey: row.variant_key,
    variantName: row.variant_name,
    config: row.variant_config || {},
    isNewAssignment: row.is_new_assignment,
  };

  // Update caches
  variantCache.data.set(experimentKey, variant);
  variantCache.tenantId = tenantId;
  variantCache.timestamp = Date.now();

  saveToLocalStorage({
    data: Array.from(variantCache.data.entries()),
    tenantId,
    timestamp: Date.now(),
  });

  return variant;
}

/**
 * Get variants for multiple experiments
 * @param {string[]} experimentKeys - Array of experiment keys
 * @returns {Promise<Map<string, ExperimentVariant>>}
 */
export async function getVariants(experimentKeys) {
  const results = new Map();

  // Fetch all in parallel
  const promises = experimentKeys.map(key => getVariant(key));
  const variants = await Promise.all(promises);

  experimentKeys.forEach((key, index) => {
    if (variants[index]) {
      results.set(key, variants[index]);
    }
  });

  return results;
}

/**
 * Synchronous variant check (uses cache only)
 * @param {string} experimentKey - The experiment key
 * @returns {ExperimentVariant|null}
 */
export function getVariantSync(experimentKey) {
  if (!variantCache.data || !variantCache.data.has(experimentKey)) {
    const localCache = loadFromLocalStorage();
    if (localCache && localCache.data) {
      variantCache.data = new Map(localCache.data);
    }
  }

  return variantCache.data?.get(experimentKey) || null;
}

/**
 * Check if tenant is in a specific variant
 * @param {string} experimentKey - The experiment key
 * @param {string} variantKey - The variant key to check
 * @returns {Promise<boolean>}
 */
export async function isInVariant(experimentKey, variantKey) {
  const variant = await getVariant(experimentKey);
  return variant?.variantKey === variantKey;
}

/**
 * Track an experiment conversion event
 * @param {string} experimentKey - The experiment key
 * @param {string} eventName - The conversion event name
 * @param {Object} [metadata] - Additional event metadata
 * @returns {Promise<void>}
 */
export async function trackExperimentEvent(experimentKey, eventName, metadata = {}) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return;

  const variant = await getVariant(experimentKey);
  if (!variant) return;

  // Log to analytics (could be extended to use a dedicated events table)
  const { error } = await supabase
    .from('activity_logs')
    .insert({
      tenant_id: tenantId,
      action: 'experiment_event',
      entity_type: 'experiment',
      metadata: {
        experiment_key: experimentKey,
        variant_key: variant.variantKey,
        event_name: eventName,
        ...metadata,
      },
    });

  if (error) {
    console.error('Error tracking experiment event:', error);
  }
}

// Common experiment keys
export const Experiments = {
  ONBOARDING_FLOW: 'onboarding_flow_v2',
  DASHBOARD_LAYOUT: 'dashboard_layout',
  PRICING_PAGE: 'pricing_page_design',
};

// ============================================
// Admin Functions (for FeatureFlagsPage)
// ============================================

/**
 * Get all experiments (admin view)
 * @returns {Promise<Array>}
 */
export async function getAllExperiments() {
  const { data, error } = await supabase
    .from('experiments')
    .select(`
      *,
      experiment_variants(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all experiments:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get experiment by ID with variants and assignment counts
 * @param {string} experimentId - The experiment ID
 * @returns {Promise<Object|null>}
 */
export async function getExperimentDetails(experimentId) {
  const { data: experiment, error: expError } = await supabase
    .from('experiments')
    .select(`
      *,
      experiment_variants(*)
    `)
    .eq('id', experimentId)
    .single();

  if (expError) {
    console.error('Error fetching experiment:', expError);
    throw expError;
  }

  if (!experiment) return null;

  // Get assignment counts per variant
  const { data: counts, error: countError } = await supabase
    .from('experiment_assignments')
    .select('variant_id')
    .eq('experiment_id', experimentId);

  if (!countError && counts) {
    const countMap = {};
    counts.forEach(a => {
      countMap[a.variant_id] = (countMap[a.variant_id] || 0) + 1;
    });
    experiment.experiment_variants.forEach(v => {
      v.assignment_count = countMap[v.id] || 0;
    });
  }

  return experiment;
}

/**
 * Create a new experiment (admin only)
 * @param {Object} experiment - Experiment data
 * @param {Array} variants - Array of variant objects
 * @returns {Promise<Object>}
 */
export async function createExperiment(experiment, variants) {
  // Create experiment
  const { data: exp, error: expError } = await supabase
    .from('experiments')
    .insert({
      key: experiment.key,
      name: experiment.name,
      description: experiment.description,
      status: experiment.status || 'draft',
      start_date: experiment.startDate,
      end_date: experiment.endDate,
    })
    .select()
    .single();

  if (expError) {
    console.error('Error creating experiment:', expError);
    throw expError;
  }

  // Create variants
  if (variants && variants.length > 0) {
    const variantInserts = variants.map(v => ({
      experiment_id: exp.id,
      key: v.key,
      name: v.name,
      weight: v.weight || 50,
      config: v.config || {},
    }));

    const { error: varError } = await supabase
      .from('experiment_variants')
      .insert(variantInserts);

    if (varError) {
      console.error('Error creating variants:', varError);
      throw varError;
    }
  }

  return exp;
}

/**
 * Update experiment status (admin)
 * @param {string} experimentId - The experiment ID
 * @param {string} status - New status (draft, running, paused, completed)
 * @returns {Promise<Object>}
 */
export async function updateExperimentStatus(experimentId, status) {
  const { data, error } = await supabase
    .from('experiments')
    .update({ status })
    .eq('id', experimentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating experiment status:', error);
    throw error;
  }

  clearExperimentCache();
  return data;
}

/**
 * Delete an experiment and its variants (admin)
 * @param {string} experimentId - The experiment ID
 * @returns {Promise<void>}
 */
export async function deleteExperiment(experimentId) {
  const { error } = await supabase
    .from('experiments')
    .delete()
    .eq('id', experimentId);

  if (error) {
    console.error('Error deleting experiment:', error);
    throw error;
  }

  clearExperimentCache();
}
