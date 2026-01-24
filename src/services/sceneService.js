/**
 * Scene Service
 *
 * Frontend service for managing TV scenes - the central concept
 * that links layouts, playlists, and business settings together.
 */

import { supabase } from '../supabase';
import { checkRateLimit, createRateLimitError } from './rateLimitService.js';
import { requiresApproval } from './permissionsService.js';
import { requestApproval, getOpenReviewForResource, APPROVAL_STATUS } from './approvalService.js';

/**
 * Create a new scene
 * @param {Object} params - Scene parameters
 * @param {string} params.tenantId - The tenant/user ID
 * @param {string} params.name - Scene name
 * @param {string} params.businessType - Type of business (restaurant, salon, etc.)
 * @param {string} params.layoutId - Associated layout ID
 * @param {string} params.primaryPlaylistId - Primary playlist ID
 * @param {string} params.secondaryPlaylistId - Secondary playlist ID (optional)
 * @param {Object} params.settings - Additional settings (brand, widgets, etc.)
 * @returns {Promise<Object>} Created scene
 */
export async function createScene({
  tenantId,
  name,
  businessType,
  layoutId,
  primaryPlaylistId,
  secondaryPlaylistId = null,
  settings = {}
}) {
  // Rate limit check
  const { data: { user } } = await supabase.auth.getUser();
  const rateCheck = await checkRateLimit('scene_create', {
    userId: user?.id,
    isAuthenticated: !!user,
  });

  if (!rateCheck.allowed) {
    throw createRateLimitError(rateCheck.retryAfter);
  }

  const { data, error } = await supabase
    .from('scenes')
    .insert([{
      tenant_id: tenantId,
      name,
      business_type: businessType,
      layout_id: layoutId || null,
      primary_playlist_id: primaryPlaylistId || null,
      secondary_playlist_id: secondaryPlaylistId || null,
      settings
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch scenes for a tenant with server-side pagination
 * @param {string} tenantId - The tenant/user ID
 * @param {Object} options - Pagination options
 * @param {number} options.page - Page number (1-based)
 * @param {number} options.pageSize - Number of items per page
 * @returns {Promise<Object>} Paginated result { data, totalCount, page, pageSize, totalPages }
 */
export async function fetchScenesForTenant(tenantId, { page = 1, pageSize = 50 } = {}) {
  // Calculate offset for pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('scenes')
    .select(`
      *,
      layout:layouts(id, name),
      primary_playlist:playlists!scenes_primary_playlist_id_fkey(id, name),
      secondary_playlist:playlists!scenes_secondary_playlist_id_fkey(id, name)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
    .range(from, to);

  if (error) throw error;

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data: data || [],
    totalCount,
    page,
    pageSize,
    totalPages
  };
}

/**
 * Fetch a single scene by ID
 * @param {string} sceneId - The scene ID
 * @returns {Promise<Object>} Scene data
 */
export async function fetchScene(sceneId) {
  const { data, error } = await supabase
    .from('scenes')
    .select(`
      *,
      layout:layouts(id, name, width, height),
      primary_playlist:playlists!scenes_primary_playlist_id_fkey(id, name),
      secondary_playlist:playlists!scenes_secondary_playlist_id_fkey(id, name)
    `)
    .eq('id', sceneId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a scene
 * @param {string} sceneId - The scene ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated scene
 */
export async function updateScene(sceneId, updates) {
  const { data, error } = await supabase
    .from('scenes')
    .update(updates)
    .eq('id', sceneId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Save scene and auto-submit for approval if user role requires it
 * @param {string} sceneId - Scene ID
 * @param {Object} updates - Scene updates
 * @param {string} sceneName - Scene name (for review request title)
 * @returns {Promise<{scene: Object, submittedForApproval: boolean, existingReview: Object|null, wasResubmission?: boolean}>}
 */
export async function saveSceneWithApproval(sceneId, updates, sceneName) {
  // Get current approval status before saving
  const { data: currentScene } = await supabase
    .from('scenes')
    .select('approval_status')
    .eq('id', sceneId)
    .single();

  // Save the scene
  const scene = await updateScene(sceneId, updates);

  // Check if user requires approval
  const needsApproval = await requiresApproval();

  if (!needsApproval) {
    // Owner/manager - save only, no approval needed
    return { scene, submittedForApproval: false, existingReview: null };
  }

  // If content was approved and is being edited, reset to draft and create new review
  if (currentScene?.approval_status === APPROVAL_STATUS.APPROVED) {
    // Reset to draft
    await supabase
      .from('scenes')
      .update({ approval_status: APPROVAL_STATUS.DRAFT })
      .eq('id', sceneId);

    // Submit for re-approval
    await requestApproval({
      resourceType: 'scene',
      resourceId: sceneId,
      title: `Re-review scene: ${sceneName}`,
      message: 'Content was edited after approval.',
    });

    return { scene, submittedForApproval: true, existingReview: null, wasResubmission: true };
  }

  // Check for existing open review (avoid duplicates)
  const existingReview = await getOpenReviewForResource('scene', sceneId);

  if (existingReview) {
    return { scene, submittedForApproval: false, existingReview };
  }

  // Auto-submit for approval
  await requestApproval({
    resourceType: 'scene',
    resourceId: sceneId,
    title: `Review scene: ${sceneName}`,
    message: '',
  });

  return { scene, submittedForApproval: true, existingReview: null };
}

/**
 * Delete a scene
 * @param {string} sceneId - The scene ID
 * @returns {Promise<void>}
 */
export async function deleteScene(sceneId) {
  const { error } = await supabase
    .from('scenes')
    .delete()
    .eq('id', sceneId);

  if (error) throw error;
}

/**
 * Check if a tenant has any scenes
 * @param {string} tenantId - The tenant/user ID
 * @returns {Promise<boolean>} True if tenant has scenes
 */
export async function hasScenesForTenant(tenantId) {
  const { count, error } = await supabase
    .from('scenes')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  if (error) throw error;
  return (count || 0) > 0;
}

/**
 * Get scene count for a tenant
 * @param {string} tenantId - The tenant/user ID
 * @returns {Promise<number>} Number of scenes
 */
export async function getSceneCount(tenantId) {
  const { count, error } = await supabase
    .from('scenes')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  if (error) throw error;
  return count || 0;
}

// ============================================
// PUBLISH SCENE TO DEVICES
// ============================================

/**
 * Publish a scene to one or more TV devices
 * Sets the active_scene_id on the specified devices
 * @param {Object} params
 * @param {string} params.sceneId - The scene ID to publish
 * @param {string[]} params.deviceIds - Array of device IDs to publish to
 * @returns {Promise<void>}
 */
export async function setSceneOnDevices({ sceneId, deviceIds }) {
  if (!sceneId || !deviceIds?.length) return;

  const { error } = await supabase
    .from('tv_devices')
    .update({ active_scene_id: sceneId })
    .in('id', deviceIds);

  if (error) throw error;
}

/**
 * Clear scene from devices (unpublish)
 * @param {string[]} deviceIds - Array of device IDs to clear
 * @returns {Promise<void>}
 */
export async function clearSceneFromDevices(deviceIds) {
  if (!deviceIds?.length) return;

  const { error } = await supabase
    .from('tv_devices')
    .update({ active_scene_id: null })
    .in('id', deviceIds);

  if (error) throw error;
}

/**
 * Fetch all TV devices for a tenant
 * @param {string} tenantId - The tenant/user ID
 * @returns {Promise<Array>} List of devices
 */
export async function fetchDevicesForTenant(tenantId) {
  const { data, error } = await supabase
    .from('tv_devices')
    .select(`
      id,
      device_name,
      is_online,
      last_seen,
      active_scene_id,
      assigned_playlist:playlists(id, name),
      assigned_layout:layouts(id, name)
    `)
    .eq('owner_id', tenantId)
    .order('device_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get count of devices using a specific scene
 * @param {string} sceneId - The scene ID
 * @returns {Promise<number>} Number of devices
 */
export async function getDeviceCountByScene(sceneId) {
  const { count, error } = await supabase
    .from('tv_devices')
    .select('id', { count: 'exact', head: true })
    .eq('active_scene_id', sceneId);

  if (error) throw error;
  return count || 0;
}

/**
 * Fetch scenes with device counts for a tenant with pagination
 * Uses optimized database function to avoid N+1 query pattern
 * @param {string} tenantId - The tenant/user ID
 * @param {Object} options - Pagination options
 * @param {number} options.page - Page number (1-based)
 * @param {number} options.pageSize - Number of items per page
 * @returns {Promise<Object>} Paginated result { data, totalCount, page, pageSize, totalPages }
 */
export async function fetchScenesWithDeviceCounts(tenantId, { page = 1, pageSize = 50 } = {}) {
  const { data, error } = await supabase.rpc('get_scenes_with_device_counts', {
    p_tenant_id: tenantId,
    p_page: page,
    p_page_size: pageSize
  });

  if (error) {
    throw new Error(`Failed to fetch scenes with device counts: ${error.message}`);
  }

  // RPC returns the paginated object directly
  return data || { data: [], totalCount: 0, page, pageSize, totalPages: 0 };
}

export default {
  createScene,
  fetchScenesForTenant,
  fetchScene,
  updateScene,
  saveSceneWithApproval,
  deleteScene,
  hasScenesForTenant,
  getSceneCount,
  setSceneOnDevices,
  clearSceneFromDevices,
  fetchDevicesForTenant,
  getDeviceCountByScene,
  fetchScenesWithDeviceCounts
};
