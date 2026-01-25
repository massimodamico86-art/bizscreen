/**
 * Layout Service
 *
 * CRUD operations for multi-zone screen layouts.
 * Layouts define spatial arrangements of content zones on a screen,
 * where each zone can display a playlist or static media asset.
 *
 * @module services/layoutService
 */
import { supabase } from '../supabase';
import { logActivity, ACTIONS, RESOURCE_TYPES } from './activityLogService';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('LayoutService');

/**
 * @typedef {Object} LayoutZone
 * @property {string} id - Zone UUID
 * @property {string} layout_id - Parent layout UUID
 * @property {string} zone_name - Display name for the zone
 * @property {number} x_percent - X position as percentage (0-100)
 * @property {number} y_percent - Y position as percentage (0-100)
 * @property {number} width_percent - Width as percentage (0-100)
 * @property {number} height_percent - Height as percentage (0-100)
 * @property {number} z_index - Stacking order (higher = on top)
 * @property {string|null} assigned_playlist_id - Assigned playlist UUID
 * @property {string|null} assigned_media_id - Assigned static media UUID
 * @property {Object} [playlists] - Nested playlist data
 * @property {Object} [media] - Nested media data
 */

/**
 * @typedef {Object} Layout
 * @property {string} id - Layout UUID
 * @property {string} owner_id - Owner's user UUID
 * @property {string} name - Layout name
 * @property {string|null} description - Layout description
 * @property {string} created_at - ISO timestamp
 * @property {string} updated_at - ISO timestamp
 * @property {LayoutZone[]} [layout_zones] - Zones when fetched
 * @property {number} [zone_count] - Zone count when listed
 */

/**
 * Fetch layouts for the current user with pagination
 *
 * @param {Object} options - Pagination options
 * @param {number} options.page - Page number (1-based), defaults to 1
 * @param {number} options.pageSize - Items per page, defaults to 50
 * @returns {Promise<Object>} Paginated result { data, totalCount, page, pageSize, totalPages }
 * @throws {Error} If database query fails
 */
export async function fetchLayouts({ page = 1, pageSize = 50 } = {}) {
  // Calculate offset for pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('layouts')
    .select(`
      *,
      layout_zones(count)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  // Transform the count from array to number
  const transformedData = (data || []).map(layout => ({
    ...layout,
    zone_count: layout.layout_zones?.[0]?.count || 0
  }));

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data: transformedData,
    totalCount,
    page,
    pageSize,
    totalPages
  };
}

/**
 * Create a new layout
 */
export async function createLayout({ name, description = null }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { data, error } = await supabase
    .from('layouts')
    .insert({
      owner_id: user.id,
      name,
      description
    })
    .select()
    .single();

  if (error) throw error;

  // Log activity
  if (data) {
    logActivity(
      ACTIONS.LAYOUT_CREATED,
      RESOURCE_TYPES.LAYOUT,
      data.id,
      data.name
    );
  }

  return data;
}

/**
 * Delete a layout and its zones (cascade should handle zones)
 */
export async function deleteLayout(id) {
  // Get layout info before deleting for logging
  const { data: layout } = await supabase
    .from('layouts')
    .select('id, name')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('layouts')
    .delete()
    .eq('id', id);

  if (error) throw error;

  // Log activity
  if (layout) {
    logActivity(
      ACTIONS.LAYOUT_DELETED,
      RESOURCE_TYPES.LAYOUT,
      layout.id,
      layout.name
    );
  }

  return true;
}

/**
 * Fetch a single layout with all its zones
 */
export async function fetchLayoutWithZones(id) {
  const { data, error } = await supabase
    .from('layouts')
    .select(`
      *,
      layout_zones(
        id,
        zone_name,
        x_percent,
        y_percent,
        width_percent,
        height_percent,
        z_index,
        assigned_playlist_id,
        assigned_media_id,
        playlists:assigned_playlist_id(id, name),
        media:assigned_media_id(id, name, type, thumbnail_url)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;

  // Sort zones by z_index
  if (data && data.layout_zones) {
    data.layout_zones.sort((a, b) => (a.z_index || 0) - (b.z_index || 0));
  }

  return data;
}

/**
 * Update a layout's basic info
 */
export async function updateLayout(id, updates) {
  const allowedFields = ['name', 'description'];
  const filteredUpdates = {};

  for (const key of allowedFields) {
    if (key in updates) {
      filteredUpdates[key] = updates[key];
    }
  }

  const { data, error } = await supabase
    .from('layouts')
    .update(filteredUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Log activity
  if (data) {
    logActivity(
      ACTIONS.LAYOUT_UPDATED,
      RESOURCE_TYPES.LAYOUT,
      data.id,
      data.name,
      { updates: filteredUpdates }
    );
  }

  return data;
}

/**
 * Create a new zone in a layout
 */
export async function createLayoutZone(layoutId, defaults = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const zoneData = {
    layout_id: layoutId,
    zone_name: defaults.zone_name || 'New Zone',
    x_percent: defaults.x_percent ?? 0,
    y_percent: defaults.y_percent ?? 0,
    width_percent: defaults.width_percent ?? 50,
    height_percent: defaults.height_percent ?? 50,
    z_index: defaults.z_index ?? 0,
    assigned_playlist_id: defaults.assigned_playlist_id || null,
    assigned_media_id: defaults.assigned_media_id || null
  };

  const { data, error } = await supabase
    .from('layout_zones')
    .insert(zoneData)
    .select(`
      *,
      playlists:assigned_playlist_id(id, name),
      media:assigned_media_id(id, name, type, thumbnail_url)
    `)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a layout zone
 */
export async function updateLayoutZone(zoneId, updates) {
  const allowedFields = [
    'zone_name', 'x_percent', 'y_percent',
    'width_percent', 'height_percent', 'z_index',
    'assigned_playlist_id', 'assigned_media_id'
  ];

  const filteredUpdates = {};
  for (const key of allowedFields) {
    if (key in updates) {
      filteredUpdates[key] = updates[key];
    }
  }

  const { data, error } = await supabase
    .from('layout_zones')
    .update(filteredUpdates)
    .eq('id', zoneId)
    .select(`
      *,
      playlists:assigned_playlist_id(id, name),
      media:assigned_media_id(id, name, type, thumbnail_url)
    `)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a layout zone
 */
export async function deleteLayoutZone(zoneId) {
  const { error } = await supabase
    .from('layout_zones')
    .delete()
    .eq('id', zoneId);

  if (error) throw error;
  return true;
}

/**
 * Get layout usage - where this layout is being used
 */
export async function getLayoutUsage(id) {
  const { data, error } = await supabase.rpc('get_layout_usage', {
    p_layout_id: id
  });

  if (error) throw error;
  return data;
}

/**
 * Check if layout is in use
 */
export async function isLayoutInUse(id) {
  const { data, error } = await supabase.rpc('is_layout_in_use', {
    p_layout_id: id
  });

  if (error) throw error;
  return data;
}

/**
 * Delete a layout safely - checks for usage first
 * @param {string} id - Layout ID
 * @param {Object} options - Options
 * @param {boolean} options.force - If true, delete even if in use
 * @returns {Object} { success: boolean, error?: string, code?: string, usage?: Object }
 */
export async function deleteLayoutSafely(id, { force = false } = {}) {
  // First check usage
  const usage = await getLayoutUsage(id);

  if (usage?.error) {
    return { success: false, error: usage.error };
  }

  // If in use and not forcing, return usage info
  if (usage?.is_in_use && !force) {
    return {
      success: false,
      error: 'Layout is in use',
      code: 'IN_USE',
      usage
    };
  }

  // Proceed with deletion
  try {
    await deleteLayout(id);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Duplicate a layout with all its zones
 */
export async function duplicateLayout(id) {
  const original = await fetchLayoutWithZones(id);
  if (!original) throw new Error('Layout not found');

  // Create new layout
  const newLayout = await createLayout({
    name: `${original.name} (Copy)`,
    description: original.description
  });

  // Copy all zones
  if (original.layout_zones && original.layout_zones.length > 0) {
    for (const zone of original.layout_zones) {
      await createLayoutZone(newLayout.id, {
        zone_name: zone.zone_name,
        x_percent: zone.x_percent,
        y_percent: zone.y_percent,
        width_percent: zone.width_percent,
        height_percent: zone.height_percent,
        z_index: zone.z_index,
        assigned_playlist_id: zone.assigned_playlist_id,
        assigned_media_id: zone.assigned_media_id
      });
    }
  }

  return fetchLayoutWithZones(newLayout.id);
}
