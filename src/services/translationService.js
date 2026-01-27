/**
 * Translation Service
 *
 * Provides dashboard queries and bulk operations for translation workflow management.
 * Supports the translation dashboard UI for reviewing and approving scene translations.
 *
 * @module services/translationService
 */

import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('TranslationService');

// Valid translation statuses
const VALID_STATUSES = ['draft', 'review', 'approved'];

// ============================================
// DASHBOARD QUERIES
// ============================================

/**
 * Fetch translation dashboard data
 * Returns scenes with their language variants and translation statuses
 *
 * @param {Object} filters - Optional filters
 * @param {string} [filters.status] - Filter by status (draft/review/approved)
 * @param {string} [filters.languageCode] - Filter by language code
 * @returns {Promise<Array>} Array of dashboard rows with variants
 */
export async function fetchTranslationDashboard(filters = {}) {
  const { status = null, languageCode = null } = filters;

  logger.debug('Fetching translation dashboard', {
    statusFilter: status,
    languageFilter: languageCode,
  });

  const { data, error } = await supabase.rpc('get_translation_dashboard', {
    p_status_filter: status,
    p_language_filter: languageCode,
  });

  if (error) {
    logger.error('Failed to fetch translation dashboard', { error: error.message });
    throw error;
  }

  logger.debug('Translation dashboard fetched', { count: data?.length || 0 });
  return data || [];
}

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Bulk update translation status for multiple scenes
 *
 * @param {string[]} sceneIds - Array of scene UUIDs to update
 * @param {string} newStatus - New status (draft/review/approved)
 * @returns {Promise<number>} Count of updated scenes
 * @throws {Error} If newStatus is invalid
 */
export async function bulkUpdateStatus(sceneIds, newStatus) {
  // Validate status
  if (!VALID_STATUSES.includes(newStatus)) {
    const error = new Error(`Invalid status: ${newStatus}. Must be one of: ${VALID_STATUSES.join(', ')}`);
    logger.error('Invalid status for bulk update', { newStatus, validStatuses: VALID_STATUSES });
    throw error;
  }

  // Validate sceneIds
  if (!Array.isArray(sceneIds) || sceneIds.length === 0) {
    const error = new Error('sceneIds must be a non-empty array');
    logger.error('Invalid sceneIds for bulk update', { sceneIds });
    throw error;
  }

  logger.debug('Bulk updating translation status', {
    sceneCount: sceneIds.length,
    newStatus,
  });

  const { data, error } = await supabase.rpc('bulk_update_translation_status', {
    p_scene_ids: sceneIds,
    p_new_status: newStatus,
  });

  if (error) {
    logger.error('Failed to bulk update translation status', { error: error.message });
    throw error;
  }

  const count = data || 0;
  logger.info('Translation status bulk updated', { count, newStatus });

  return count;
}

// ============================================
// SINGLE SCENE STATUS UPDATE
// ============================================

/**
 * Update translation status for a single scene
 *
 * @param {string} sceneId - Scene UUID to update
 * @param {string} newStatus - New status (draft/review/approved)
 * @returns {Promise<Object>} Updated scene data
 */
export async function updateSceneStatus(sceneId, newStatus) {
  // Validate status
  if (!VALID_STATUSES.includes(newStatus)) {
    const error = new Error(`Invalid status: ${newStatus}. Must be one of: ${VALID_STATUSES.join(', ')}`);
    logger.error('Invalid status for update', { newStatus });
    throw error;
  }

  logger.debug('Updating scene translation status', { sceneId, newStatus });

  const { data, error } = await supabase
    .from('scenes')
    .update({
      translation_status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sceneId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update scene status', { error: error.message, sceneId });
    throw error;
  }

  logger.info('Scene translation status updated', { sceneId, newStatus });
  return data;
}

// ============================================
// AI TRANSLATION SUGGESTIONS
// ============================================

/**
 * Get AI translation suggestions for a scene
 * Calls the /api/translations/suggest endpoint to get Claude-generated translations
 *
 * @param {string} sourceSceneId - The scene ID to translate from
 * @param {string} targetLanguage - The target language code (e.g., 'es', 'fr')
 * @returns {Promise<Object>} Translation suggestions { sourceLanguage, targetLanguage, translations, originalTexts }
 */
export async function getAiTranslationSuggestion(sourceSceneId, targetLanguage) {
  logger.debug('Requesting AI translation suggestion', { sourceSceneId, targetLanguage });

  const response = await fetch('/api/translations/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceSceneId, targetLanguage }),
  });

  if (!response.ok) {
    const error = await response.json();
    logger.error('AI translation suggestion failed', { error, sourceSceneId, targetLanguage });
    throw new Error(error.error || 'Failed to get translation suggestion');
  }

  const result = await response.json();
  logger.info('AI translation suggestion received', {
    sourceSceneId,
    targetLanguage,
    textCount: result.translations?.texts?.length || 0,
  });

  return result;
}

// ============================================
// STATUS CONSTANTS
// ============================================

/**
 * Translation status constants
 */
export const TRANSLATION_STATUSES = {
  DRAFT: 'draft',
  REVIEW: 'review',
  APPROVED: 'approved',
};

/**
 * Status display labels
 */
export const STATUS_LABELS = {
  draft: 'Draft',
  review: 'In Review',
  approved: 'Approved',
};

/**
 * Status color classes (Tailwind CSS)
 */
export const STATUS_COLORS = {
  draft: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  review: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
};

// ============================================
// EXPORTS
// ============================================

export default {
  // Dashboard queries
  fetchTranslationDashboard,
  // Bulk operations
  bulkUpdateStatus,
  // Single scene
  updateSceneStatus,
  // AI suggestions
  getAiTranslationSuggestion,
  // Constants
  TRANSLATION_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
};
