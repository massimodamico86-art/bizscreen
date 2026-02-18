// Screen Group Service - CRUD operations for screen groups
import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('ScreenGroupService');

/**
 * Fetch all screen groups for the current tenant
 * @param {Object} options - Filter options
 * @param {string} options.locationId - Filter by location
 * @param {string} options.search - Search by name
 * @returns {Promise<Array>} Screen groups with counts
 */
export async function fetchScreenGroups({ locationId = null, search = '' } = {}) {
  let query = supabase
    .from('v_screen_groups_with_counts')
    .select('*')
    .order('name', { ascending: true });

  if (locationId) {
    query = query.eq('location_id', locationId);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get a single screen group by ID
 * @param {string} id - Screen group ID
 * @returns {Promise<Object>} Screen group
 */
export async function getScreenGroup(id) {
  const { data, error } = await supabase
    .from('screen_groups')
    .select(`
      *,
      location:locations(id, name)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new screen group
 * @param {Object} data - Screen group data
 * @param {string} data.name - Group name
 * @param {string} data.description - Optional description
 * @param {string} data.locationId - Optional location ID
 * @param {string[]} data.tags - Optional tags
 * @returns {Promise<Object>} Created screen group
 */
export async function createScreenGroup({ name, description = '', locationId = null, tags = [] }) {
  if (!name?.trim()) throw new Error('Name is required');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  // Get user's tenant_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, managed_tenant_id')
    .eq('id', user.id)
    .single();

  const tenantId = profile?.managed_tenant_id || user.id;

  const { data, error } = await supabase
    .from('screen_groups')
    .insert({
      tenant_id: tenantId,
      name: name.trim(),
      description: description?.trim() || null,
      location_id: locationId || null,
      tags: tags || []
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a screen group
 * @param {string} id - Screen group ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated screen group
 */
export async function updateScreenGroup(id, updates) {
  const allowedFields = ['name', 'description', 'location_id', 'tags'];
  const filteredUpdates = {};

  for (const key of allowedFields) {
    if (key in updates) {
      filteredUpdates[key] = updates[key];
    }
  }

  // Handle camelCase to snake_case
  if ('locationId' in updates) {
    filteredUpdates.location_id = updates.locationId;
  }

  const { data, error } = await supabase
    .from('screen_groups')
    .update(filteredUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a screen group
 * @param {string} id - Screen group ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteScreenGroup(id) {
  // First, unassign all screens from this group
  await supabase
    .from('tv_devices')
    .update({ screen_group_id: null })
    .eq('screen_group_id', id);

  const { error } = await supabase
    .from('screen_groups')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

/**
 * Get screens in a group
 * @param {string} groupId - Screen group ID
 * @returns {Promise<Array>} Screens in the group
 */
export async function getScreensInGroup(groupId) {
  const { data, error } = await supabase
    .from('tv_devices')
    .select(`
      id,
      name,
      is_online,
      last_seen_at,
      location:locations(id, name)
    `)
    .eq('screen_group_id', groupId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get screens not in any group (or optionally not in a specific group)
 * @param {string} excludeGroupId - Optional group ID to exclude
 * @param {string} locationId - Optional location filter
 * @returns {Promise<Array>} Unassigned screens
 */
export async function getUnassignedScreens(excludeGroupId = null, locationId = null) {
  let query = supabase
    .from('tv_devices')
    .select(`
      id,
      name,
      is_online,
      last_seen_at,
      screen_group_id,
      location:locations(id, name)
    `)
    .order('name', { ascending: true });

  if (excludeGroupId) {
    query = query.or(`screen_group_id.is.null,screen_group_id.neq.${excludeGroupId}`);
  } else {
    query = query.is('screen_group_id', null);
  }

  if (locationId) {
    query = query.eq('location_id', locationId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Assign screens to a group
 * @param {string} groupId - Screen group ID
 * @param {string[]} screenIds - Array of screen IDs to assign
 * @returns {Promise<number>} Number of screens assigned
 */
export async function assignScreensToGroup(groupId, screenIds) {
  if (!screenIds || screenIds.length === 0) return 0;

  const { error, _count } = await supabase
    .from('tv_devices')
    .update({ screen_group_id: groupId })
    .in('id', screenIds);

  if (error) throw error;
  return screenIds.length;
}

/**
 * Remove a screen from its group
 * @param {string} screenId - Screen ID
 * @returns {Promise<boolean>} Success
 */
export async function removeScreenFromGroup(screenId) {
  const { error } = await supabase
    .from('tv_devices')
    .update({ screen_group_id: null })
    .eq('id', screenId);

  if (error) throw error;
  return true;
}

/**
 * Remove multiple screens from a group
 * @param {string[]} screenIds - Array of screen IDs
 * @returns {Promise<number>} Number of screens removed
 */
export async function removeScreensFromGroup(screenIds) {
  if (!screenIds || screenIds.length === 0) return 0;

  const { error } = await supabase
    .from('tv_devices')
    .update({ screen_group_id: null })
    .in('id', screenIds);

  if (error) throw error;
  return screenIds.length;
}

/**
 * Get all screen groups as options for dropdowns
 * @returns {Promise<Array>} Screen groups as {value, label} options
 */
export async function getScreenGroupOptions() {
  const { data, error } = await supabase
    .from('screen_groups')
    .select('id, name, location_id')
    .order('name', { ascending: true });

  if (error) throw error;

  return (data || []).map(g => ({
    value: g.id,
    label: g.name,
    locationId: g.location_id
  }));
}

/**
 * Fetch screen groups with scene info and device counts
 * Uses the RPC function for richer data
 * @param {string} tenantId - Optional tenant ID filter
 * @returns {Promise<Array>} Screen groups with scene info
 */
export async function fetchScreenGroupsWithScenes(tenantId = null) {
  const { data, error } = await supabase
    .rpc('get_screen_groups_with_scenes', { p_tenant_id: tenantId });

  if (error) throw error;
  return data || [];
}

/**
 * Publish a scene to a screen group
 * Sets the scene on the group and all member devices
 * @param {string} groupId - Screen group ID
 * @param {string} sceneId - Scene ID to publish
 * @param {boolean} updateDevices - Whether to update all devices (default: true)
 * @returns {Promise<Object>} Result with success status and device count
 */
export async function publishSceneToGroup(groupId, sceneId, updateDevices = true) {
  if (!groupId) throw new Error('Group ID is required');
  if (!sceneId) throw new Error('Scene ID is required');

  const { data, error } = await supabase
    .rpc('publish_scene_to_group', {
      p_group_id: groupId,
      p_scene_id: sceneId,
      p_update_devices: updateDevices
    });

  if (error) throw error;
  return data;
}

/**
 * Unpublish/clear scene from a screen group
 * @param {string} groupId - Screen group ID
 * @param {boolean} clearDevices - Whether to clear all devices (default: true)
 * @returns {Promise<Object>} Result with success status
 */
export async function unpublishSceneFromGroup(groupId, clearDevices = true) {
  if (!groupId) throw new Error('Group ID is required');

  const { data, error } = await supabase
    .rpc('unpublish_scene_from_group', {
      p_group_id: groupId,
      p_clear_devices: clearDevices
    });

  if (error) throw error;
  return data;
}

/**
 * Publish a scene to multiple screen groups at once
 * @param {string[]} groupIds - Array of screen group IDs
 * @param {string} sceneId - Scene ID to publish
 * @returns {Promise<Object>} Result with total devices updated
 */
export async function publishSceneToMultipleGroups(groupIds, sceneId) {
  if (!groupIds || groupIds.length === 0) throw new Error('At least one group ID is required');
  if (!sceneId) throw new Error('Scene ID is required');

  const { data, error } = await supabase
    .rpc('publish_scene_to_multiple_groups', {
      p_group_ids: groupIds,
      p_scene_id: sceneId
    });

  if (error) throw error;
  return data;
}

/**
 * Get group's active scene info
 * @param {string} groupId - Screen group ID
 * @returns {Promise<Object|null>} Active scene or null
 */
export async function getGroupActiveScene(groupId) {
  const { data, error } = await supabase
    .from('screen_groups')
    .select(`
      active_scene_id,
      active_scene:scenes(id, name, business_type, is_active)
    `)
    .eq('id', groupId)
    .single();

  if (error) throw error;
  return data?.active_scene || null;
}

/**
 * Update group language settings
 * Sets both display_language and location_code for a screen group.
 * Devices in the group will inherit this language setting.
 *
 * @param {string} groupId - Screen group ID
 * @param {Object} settings - Language settings object
 * @param {string|null} settings.display_language - Language code (e.g., 'en', 'es') or null
 * @param {string|null} settings.location_code - Country/region code (e.g., 'US', 'MX') or null
 * @returns {Promise<Object>} Updated screen group
 */
export async function updateGroupLanguage(groupId, settings) {
  logger.debug('Updating group language settings', { groupId, settings });

  const { data, error } = await supabase
    .from('screen_groups')
    .update({
      display_language: settings.display_language || null,
      location_code: settings.location_code || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', groupId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update group language', { error: error.message, groupId });
    throw error;
  }

  logger.info('Group language settings updated', { groupId, displayLanguage: settings.display_language });
  return data;
}

/**
 * Fetch all distinct tags across screen groups for the current tenant
 * Flattens and deduplicates client-side since tags is a TEXT[] column
 * @returns {Promise<string[]>} Sorted unique array of tag strings
 */
export async function fetchAllGroupTags() {
  const { data, error } = await supabase
    .from('screen_groups')
    .select('tags');

  if (error) throw error;

  const allTags = (data || [])
    .flatMap(row => row.tags || [])
    .filter(Boolean);

  return [...new Set(allTags)].sort();
}

/**
 * Fetch screen groups with scene info, filtered by tag
 * Uses fetchScreenGroupsWithScenes RPC then filters client-side
 * (RPC doesn't support .contains(), and screen_groups is typically <100 rows)
 * @param {string} tag - Tag to filter by
 * @returns {Promise<Array>} Filtered screen groups with scene info
 */
export async function fetchScreenGroupsWithScenesByTag(tag) {
  const groups = await fetchScreenGroupsWithScenes();
  if (!tag) return groups;
  return groups.filter(g => g.tags?.includes(tag));
}

/**
 * Push a playlist to all screens in a group
 * Sets assigned_playlist_id on all devices in the group and marks them for refresh
 * @param {string} groupId - Screen group ID
 * @param {string} playlistId - Playlist ID to push (or falsy to clear)
 * @returns {Promise<{devicesUpdated: number}>}
 */
export async function pushPlaylistToGroup(groupId, playlistId) {
  if (!groupId) throw new Error('Group ID is required');

  const { data, error } = await supabase
    .from('tv_devices')
    .update({
      assigned_playlist_id: playlistId || null,
      needs_refresh: true,
      updated_at: new Date().toISOString()
    })
    .eq('screen_group_id', groupId)
    .select('id');

  if (error) throw error;

  const devicesUpdated = data?.length || 0;
  logger.info('Pushed playlist to group', { groupId, playlistId, devicesUpdated });
  return { devicesUpdated };
}

/**
 * Bulk delete multiple screen groups
 * Unassigns all screens from the groups first, then deletes the groups
 * @param {string[]} groupIds - Array of group IDs to delete
 * @returns {Promise<{deletedCount: number}>}
 */
export async function bulkDeleteScreenGroups(groupIds) {
  if (!groupIds || groupIds.length === 0) throw new Error('At least one group ID is required');

  // Unassign all screens from these groups
  await supabase
    .from('tv_devices')
    .update({ screen_group_id: null })
    .in('screen_group_id', groupIds);

  // Delete the groups
  const { error } = await supabase
    .from('screen_groups')
    .delete()
    .in('id', groupIds);

  if (error) throw error;
  return { deletedCount: groupIds.length };
}

/**
 * Bulk add tags to multiple screen groups (additive/union, not replace)
 * @param {string[]} groupIds - Array of group IDs
 * @param {string[]} newTags - Tags to add
 * @returns {Promise<{updatedCount: number}>}
 */
export async function bulkAddTagsToGroups(groupIds, newTags) {
  if (!groupIds || groupIds.length === 0) throw new Error('At least one group ID is required');
  if (!newTags || newTags.length === 0) throw new Error('At least one tag is required');

  const normalizedTags = newTags.map(t => t.trim().toLowerCase()).filter(Boolean);

  // Fetch current tags for all target groups
  const { data: groups, error: fetchError } = await supabase
    .from('screen_groups')
    .select('id, tags')
    .in('id', groupIds);

  if (fetchError) throw fetchError;

  // Update each group with merged tags
  const updates = (groups || []).map(g => {
    const existing = g.tags || [];
    const merged = [...new Set([...existing, ...normalizedTags])];
    return supabase.from('screen_groups').update({ tags: merged }).eq('id', g.id);
  });

  await Promise.all(updates);
  return { updatedCount: groupIds.length };
}

export default {
  fetchScreenGroups,
  fetchScreenGroupsWithScenes,
  getScreenGroup,
  createScreenGroup,
  updateScreenGroup,
  deleteScreenGroup,
  getScreensInGroup,
  getUnassignedScreens,
  assignScreensToGroup,
  removeScreenFromGroup,
  removeScreensFromGroup,
  getScreenGroupOptions,
  publishSceneToGroup,
  unpublishSceneFromGroup,
  publishSceneToMultipleGroups,
  getGroupActiveScene,
  updateGroupLanguage,
  fetchAllGroupTags,
  fetchScreenGroupsWithScenesByTag,
  pushPlaylistToGroup,
  bulkDeleteScreenGroups,
  bulkAddTagsToGroups,
};
