/**
 * Language Service
 *
 * Provides CRUD operations for language variants of scenes.
 * Supports multi-language content for digital signage.
 *
 * @module services/languageService
 */

import { supabase } from '../supabase';
import { SUPPORTED_LOCALES } from '../i18n/i18nConfig';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('LanguageService');

// ============================================
// LOCATION TO LANGUAGE MAPPING
// ============================================

/**
 * Maps country/region codes to primary language
 * Used for auto-assigning language based on device location
 */
export const LOCATION_LANGUAGE_MAP = {
  'US': 'en',
  'GB': 'en',
  'CA': 'en',
  'AU': 'en',
  'NZ': 'en',
  'IE': 'en',
  'ES': 'es',
  'MX': 'es',
  'AR': 'es',
  'CO': 'es',
  'CL': 'es',
  'PE': 'es',
  'FR': 'fr',
  'BE': 'fr', // Belgium (French default)
  'CH': 'de', // Switzerland (German default)
  'DE': 'de',
  'AT': 'de',
  'IT': 'it',
  'PT': 'pt',
  'BR': 'pt',
  'JP': 'ja',
  'CN': 'zh',
  'TW': 'zh',
  'HK': 'zh',
  'KR': 'ko',
  'NL': 'nl',
  'PL': 'pl',
  'RU': 'ru',
};

/**
 * Get language code for a location/country code
 * @param {string} locationCode - Country/region code (e.g., 'US', 'ES', 'FR')
 * @returns {string} Language code (defaults to 'en' if not mapped)
 */
export function getLanguageForLocation(locationCode) {
  if (!locationCode) {
    logger.debug('No location code provided, defaulting to en');
    return 'en';
  }

  const upperCode = locationCode.toUpperCase();
  const language = LOCATION_LANGUAGE_MAP[upperCode] || 'en';

  logger.debug('Resolved language for location', { location: upperCode, language });
  return language;
}

/**
 * Get all available locations with their country names
 * @returns {Array<{code: string, name: string}>} Array of location objects
 */
export function getAvailableLocations() {
  // Use Intl.DisplayNames for localized country names
  const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });

  return Object.keys(LOCATION_LANGUAGE_MAP)
    .map(code => ({
      code,
      name: displayNames.of(code) || code,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ============================================
// LANGUAGE COLORS FOR UI BADGES
// ============================================

/**
 * Color classes for language badges (Tailwind CSS)
 */
export const LANGUAGE_COLORS = {
  en: 'bg-blue-50 text-blue-700 border-blue-200',
  es: 'bg-orange-50 text-orange-700 border-orange-200',
  pt: 'bg-green-50 text-green-700 border-green-200',
  it: 'bg-red-50 text-red-700 border-red-200',
  fr: 'bg-purple-50 text-purple-700 border-purple-200',
  de: 'bg-amber-50 text-amber-700 border-amber-200',
};

/**
 * Get color classes for a language code
 * @param {string} code - Language code
 * @returns {string} Tailwind color classes
 */
export function getLanguageColor(code) {
  return LANGUAGE_COLORS[code] || 'bg-gray-50 text-gray-700 border-gray-200';
}

// ============================================
// LANGUAGE INFO HELPERS
// ============================================

/**
 * Get display information for a language code
 * @param {string} code - Language code (e.g., 'en', 'es')
 * @returns {Object} Language info { code, name, nativeName }
 */
export function getLanguageDisplayInfo(code) {
  const locale = SUPPORTED_LOCALES.find(l => l.code === code);
  if (locale) {
    return {
      code: locale.code,
      name: locale.name,
      nativeName: locale.nativeName,
    };
  }
  // Fallback for unknown codes
  return {
    code,
    name: code.toUpperCase(),
    nativeName: code.toUpperCase(),
  };
}

/**
 * Get all supported languages with display info
 * @returns {Array} Array of language info objects
 */
export function getSupportedLanguages() {
  return SUPPORTED_LOCALES.map(locale => ({
    code: locale.code,
    name: locale.name,
    nativeName: locale.nativeName,
    direction: locale.direction,
  }));
}

// ============================================
// LANGUAGE GROUP OPERATIONS
// ============================================

/**
 * Create a new language group for a tenant
 * @param {string} tenantId - The tenant/user ID
 * @param {string} defaultLanguage - Default language code (default: 'en')
 * @returns {Promise<Object>} Created language group
 */
export async function createLanguageGroup(tenantId, defaultLanguage = 'en') {
  logger.debug('Creating language group', { tenantId, defaultLanguage });

  const { data, error } = await supabase
    .from('scene_language_groups')
    .insert({
      tenant_id: tenantId,
      default_language: defaultLanguage,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create language group', { error: error.message, tenantId });
    throw error;
  }

  logger.info('Language group created', { groupId: data.id, tenantId });
  return data;
}

/**
 * Get a language group by ID
 * @param {string} groupId - The language group ID
 * @returns {Promise<Object|null>} Language group or null
 */
export async function getLanguageGroup(groupId) {
  const { data, error } = await supabase
    .from('scene_language_groups')
    .select('*')
    .eq('id', groupId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data;
}

/**
 * Update a language group
 * @param {string} groupId - The language group ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated language group
 */
export async function updateLanguageGroup(groupId, updates) {
  const allowedFields = ['default_language'];
  const updateData = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field];
    }
  }

  const { data, error } = await supabase
    .from('scene_language_groups')
    .update(updateData)
    .eq('id', groupId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// LANGUAGE VARIANT OPERATIONS
// ============================================

/**
 * Create a language variant of a scene
 * Copies the original scene's slides and creates a new scene in the same language group
 *
 * @param {string} originalSceneId - The original scene ID to create variant from
 * @param {string} languageCode - The language code for the new variant (e.g., 'es', 'fr')
 * @returns {Promise<Object>} The created variant scene
 */
export async function createLanguageVariant(originalSceneId, languageCode) {
  logger.debug('Creating language variant', { originalSceneId, languageCode });

  // 1. Fetch the original scene with all details
  const { data: original, error: fetchError } = await supabase
    .from('scenes')
    .select('*')
    .eq('id', originalSceneId)
    .single();

  if (fetchError) {
    logger.error('Failed to fetch original scene', { error: fetchError.message, sceneId: originalSceneId });
    throw fetchError;
  }

  // 2. Ensure language group exists
  let groupId = original.language_group_id;

  if (!groupId) {
    // Create a new language group and update the original scene
    const group = await createLanguageGroup(
      original.tenant_id,
      original.language_code || 'en'
    );
    groupId = group.id;

    // Update original scene with the group ID and language code
    const { error: updateError } = await supabase
      .from('scenes')
      .update({
        language_group_id: groupId,
        language_code: original.language_code || 'en',
      })
      .eq('id', originalSceneId);

    if (updateError) {
      logger.error('Failed to update original scene with group', { error: updateError.message });
      throw updateError;
    }

    logger.debug('Created language group and updated original', { groupId, originalSceneId });
  }

  // 3. Check if variant for this language already exists
  const { data: existingVariant } = await supabase
    .from('scenes')
    .select('id')
    .eq('language_group_id', groupId)
    .eq('language_code', languageCode)
    .single();

  if (existingVariant) {
    logger.warn('Variant already exists for this language', { groupId, languageCode });
    throw new Error(`A ${languageCode.toUpperCase()} variant already exists for this scene`);
  }

  // 4. Create the new variant scene
  const variantName = `${original.name} (${languageCode.toUpperCase()})`;

  const { data: variant, error: createError } = await supabase
    .from('scenes')
    .insert({
      tenant_id: original.tenant_id,
      name: variantName,
      business_type: original.business_type,
      layout_id: original.layout_id,
      primary_playlist_id: original.primary_playlist_id,
      secondary_playlist_id: original.secondary_playlist_id,
      settings: original.settings,
      is_active: original.is_active,
      language_group_id: groupId,
      language_code: languageCode,
    })
    .select()
    .single();

  if (createError) {
    logger.error('Failed to create variant scene', { error: createError.message });
    throw createError;
  }

  // 5. Copy slides from original to variant
  // Import dynamically to avoid circular dependency issues
  const { copySlides } = await import('./sceneDesignService.js');
  await copySlides(originalSceneId, variant.id);

  logger.info('Language variant created', {
    variantId: variant.id,
    originalId: originalSceneId,
    languageCode,
  });

  return variant;
}

/**
 * Fetch all language variants for a scene
 * @param {string} sceneId - Any scene ID (will find its group and return all variants)
 * @returns {Promise<Array>} Array of variant objects { id, name, language_code, is_default }
 */
export async function fetchLanguageVariants(sceneId) {
  // 1. Get the scene's language group
  const { data: scene, error: fetchError } = await supabase
    .from('scenes')
    .select('id, language_group_id, language_code')
    .eq('id', sceneId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return []; // Scene not found
    }
    throw fetchError;
  }

  // 2. If no language group, return just this scene as the only "variant"
  if (!scene.language_group_id) {
    return [{
      id: sceneId,
      name: null, // Will be filled by caller if needed
      language_code: scene.language_code || 'en',
      is_default: true,
    }];
  }

  // 3. Get the group's default language
  const { data: group, error: groupError } = await supabase
    .from('scene_language_groups')
    .select('default_language')
    .eq('id', scene.language_group_id)
    .single();

  if (groupError) throw groupError;

  // 4. Query all scenes in the group
  const { data: variants, error: variantsError } = await supabase
    .from('scenes')
    .select('id, name, language_code')
    .eq('language_group_id', scene.language_group_id)
    .order('language_code', { ascending: true });

  if (variantsError) throw variantsError;

  // 5. Map to variant objects with is_default flag
  return (variants || []).map(v => ({
    id: v.id,
    name: v.name,
    language_code: v.language_code,
    is_default: v.language_code === group.default_language,
  }));
}

/**
 * Get available language codes for a scene
 * @param {string} sceneId - The scene ID
 * @returns {Promise<Array<string>>} Array of language codes (e.g., ['en', 'es', 'fr'])
 */
export async function getAvailableLanguagesForScene(sceneId) {
  const variants = await fetchLanguageVariants(sceneId);
  return variants.map(v => v.language_code);
}

/**
 * Get languages that don't have variants yet for a scene
 * @param {string} sceneId - The scene ID
 * @returns {Promise<Array>} Array of available language options
 */
export async function getMissingLanguagesForScene(sceneId) {
  const existingCodes = await getAvailableLanguagesForScene(sceneId);
  const allLanguages = getSupportedLanguages();

  return allLanguages.filter(lang => !existingCodes.includes(lang.code));
}

// ============================================
// DEVICE LANGUAGE RESOLUTION
// ============================================

/**
 * Resolve the correct scene variant for a device's language
 * Uses the database RPC for consistent fallback logic
 *
 * @param {string} sceneId - The scene ID to resolve
 * @param {string} deviceLanguage - The device's display language (e.g., 'es')
 * @returns {Promise<string>} The resolved scene ID (may be different from input)
 */
export async function resolveSceneForDevice(sceneId, deviceLanguage = 'en') {
  logger.debug('Resolving scene for device language', { sceneId, deviceLanguage });

  const { data, error } = await supabase.rpc('get_scene_for_device_language', {
    p_scene_id: sceneId,
    p_device_language: deviceLanguage,
  });

  if (error) {
    logger.error('Failed to resolve scene for device', { error: error.message, sceneId });
    throw error;
  }

  const resolvedId = data;
  if (resolvedId && resolvedId !== sceneId) {
    logger.debug('Resolved to different scene', { originalId: sceneId, resolvedId, deviceLanguage });
  }

  return resolvedId || sceneId;
}

/**
 * Update a device's display language
 * @param {string} deviceId - The device ID
 * @param {string} languageCode - The new display language
 * @returns {Promise<Object>} Updated device
 */
export async function setDeviceDisplayLanguage(deviceId, languageCode) {
  logger.debug('Setting device display language', { deviceId, languageCode });

  const { data, error } = await supabase
    .from('tv_devices')
    .update({
      display_language: languageCode,
      needs_refresh: true, // Trigger content refresh
    })
    .eq('id', deviceId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to set device language', { error: error.message, deviceId });
    throw error;
  }

  logger.info('Device display language updated', { deviceId, languageCode });
  return data;
}

/**
 * Get a device's display language
 * @param {string} deviceId - The device ID
 * @returns {Promise<string>} The device's display language code
 */
export async function getDeviceDisplayLanguage(deviceId) {
  const { data, error } = await supabase
    .from('tv_devices')
    .select('display_language')
    .eq('id', deviceId)
    .single();

  if (error) throw error;
  return data?.display_language || 'en';
}

// ============================================
// DELETE OPERATIONS
// ============================================

/**
 * Delete a language variant
 * Note: Cannot delete the default language variant
 *
 * @param {string} variantSceneId - The variant scene ID to delete
 * @returns {Promise<void>}
 */
export async function deleteLanguageVariant(variantSceneId) {
  // 1. Get the variant's info
  const { data: variant, error: fetchError } = await supabase
    .from('scenes')
    .select('id, language_group_id, language_code')
    .eq('id', variantSceneId)
    .single();

  if (fetchError) throw fetchError;

  if (!variant.language_group_id) {
    throw new Error('This scene is not a language variant');
  }

  // 2. Check if this is the default language
  const { data: group, error: groupError } = await supabase
    .from('scene_language_groups')
    .select('default_language')
    .eq('id', variant.language_group_id)
    .single();

  if (groupError) throw groupError;

  if (variant.language_code === group.default_language) {
    throw new Error('Cannot delete the default language variant');
  }

  // 3. Delete the variant
  const { error: deleteError } = await supabase
    .from('scenes')
    .delete()
    .eq('id', variantSceneId);

  if (deleteError) throw deleteError;

  logger.info('Language variant deleted', { variantId: variantSceneId });
}

// ============================================
// EXPORTS
// ============================================

export default {
  // Location mapping
  LOCATION_LANGUAGE_MAP,
  getLanguageForLocation,
  getAvailableLocations,
  // Colors
  LANGUAGE_COLORS,
  getLanguageColor,
  // Info helpers
  getLanguageDisplayInfo,
  getSupportedLanguages,
  // Language group operations
  createLanguageGroup,
  getLanguageGroup,
  updateLanguageGroup,
  // Variant operations
  createLanguageVariant,
  fetchLanguageVariants,
  getAvailableLanguagesForScene,
  getMissingLanguagesForScene,
  // Device language
  resolveSceneForDevice,
  setDeviceDisplayLanguage,
  getDeviceDisplayLanguage,
  // Delete
  deleteLanguageVariant,
};
