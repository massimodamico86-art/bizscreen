/**
 * Playlist Service
 *
 * CRUD operations for playlists and playlist items.
 * Playlists are ordered collections of media items that can be
 * assigned to screens or layout zones for playback.
 *
 * @module services/playlistService
 */
import { supabase } from '../supabase';
import { logActivity, ACTIONS, RESOURCE_TYPES } from './activityLogService';

/**
 * @typedef {Object} PlaylistItem
 * @property {string} id - Playlist item UUID
 * @property {string} playlist_id - Parent playlist UUID
 * @property {'media'|'app'} item_type - Type of content
 * @property {string} item_id - Referenced media/app UUID
 * @property {number} position - Display order position
 * @property {number|null} duration - Override duration in seconds
 * @property {Object} [media] - Nested media asset data
 */

/**
 * @typedef {Object} Playlist
 * @property {string} id - Playlist UUID
 * @property {string} owner_id - Owner's user UUID
 * @property {string} name - Playlist name
 * @property {string|null} description - Playlist description
 * @property {number} default_duration - Default item duration in seconds
 * @property {'fade'|'slide'|'none'} transition_effect - Transition between items
 * @property {boolean} shuffle - Whether to shuffle playback order
 * @property {string} created_at - ISO timestamp
 * @property {string} updated_at - ISO timestamp
 * @property {PlaylistItem[]} [items] - Playlist items when fetched
 */

/**
 * Fetch all playlists for the current user
 *
 * @param {Object} [options] - Query options
 * @param {string} [options.search=''] - Filter by name (case-insensitive)
 * @param {number} [options.limit=100] - Maximum results to return
 * @returns {Promise<Playlist[]>} Array of playlists with item counts
 * @throws {Error} If database query fails
 */
export async function fetchPlaylists({ search = '', limit = 100 } = {}) {
  let query = supabase
    .from('playlists')
    .select(`
      *,
      items:playlist_items(count)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get a single playlist with its items
 */
export async function getPlaylist(id) {
  const { data, error } = await supabase
    .from('playlists')
    .select(`
      *,
      items:playlist_items(
        *,
        media:media_assets(id, name, type, url, thumbnail_url, duration)
      )
    `)
    .eq('id', id)
    .order('position', { foreignTable: 'playlist_items', ascending: true })
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new playlist
 */
export async function createPlaylist({
  name,
  description = null,
  defaultDuration = 10,
  transitionEffect = 'fade',
  shuffle = false
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { data, error } = await supabase
    .from('playlists')
    .insert({
      owner_id: user.id,
      name,
      description,
      default_duration: defaultDuration,
      transition_effect: transitionEffect,
      shuffle
    })
    .select()
    .single();

  if (error) throw error;

  // Log activity
  if (data) {
    logActivity(
      ACTIONS.PLAYLIST_CREATED,
      RESOURCE_TYPES.PLAYLIST,
      data.id,
      data.name
    );
  }

  return data;
}

/**
 * Update a playlist
 */
export async function updatePlaylist(id, updates) {
  const allowedFields = ['name', 'description', 'default_duration', 'transition_effect', 'shuffle'];

  const filteredUpdates = {};
  for (const key of allowedFields) {
    if (key in updates) {
      filteredUpdates[key] = updates[key];
    }
  }

  const { data, error } = await supabase
    .from('playlists')
    .update(filteredUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Log activity
  if (data) {
    logActivity(
      ACTIONS.PLAYLIST_UPDATED,
      RESOURCE_TYPES.PLAYLIST,
      data.id,
      data.name,
      { updates: filteredUpdates }
    );
  }

  return data;
}

/**
 * Delete a playlist
 */
export async function deletePlaylist(id) {
  // Get playlist info before deleting for logging
  const { data: playlist } = await supabase
    .from('playlists')
    .select('id, name')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', id);

  if (error) throw error;

  // Log activity
  if (playlist) {
    logActivity(
      ACTIONS.PLAYLIST_DELETED,
      RESOURCE_TYPES.PLAYLIST,
      playlist.id,
      playlist.name
    );
  }

  return true;
}

/**
 * Add an item to a playlist
 */
export async function addPlaylistItem(playlistId, { itemType, itemId, duration = null }) {
  // Get the highest position
  const { data: existingItems } = await supabase
    .from('playlist_items')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = existingItems?.length > 0 ? existingItems[0].position + 1 : 0;

  const { data, error } = await supabase
    .from('playlist_items')
    .insert({
      playlist_id: playlistId,
      item_type: itemType,
      item_id: itemId,
      position: nextPosition,
      duration
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove an item from a playlist
 */
export async function removePlaylistItem(itemId) {
  const { error } = await supabase
    .from('playlist_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
  return true;
}

/**
 * Reorder playlist items
 * @param {string} playlistId
 * @param {Array<{id: string, position: number}>} newOrder
 */
export async function reorderPlaylistItems(playlistId, newOrder) {
  // Use a transaction-like approach: delete all and re-insert
  // Or update each item's position individually
  const updates = newOrder.map(({ id, position }) =>
    supabase
      .from('playlist_items')
      .update({ position })
      .eq('id', id)
      .eq('playlist_id', playlistId)
  );

  const results = await Promise.all(updates);
  const errors = results.filter(r => r.error);

  if (errors.length > 0) {
    throw new Error('Failed to reorder some items');
  }

  return true;
}

/**
 * Update a playlist item's duration
 */
export async function updatePlaylistItemDuration(itemId, duration) {
  const { data, error } = await supabase
    .from('playlist_items')
    .update({ duration })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get playlist usage - where this playlist is being used
 */
export async function getPlaylistUsage(id) {
  const { data, error } = await supabase.rpc('get_playlist_usage', {
    p_playlist_id: id
  });

  if (error) throw error;
  return data;
}

/**
 * Check if playlist is in use
 */
export async function isPlaylistInUse(id) {
  const { data, error } = await supabase.rpc('is_playlist_in_use', {
    p_playlist_id: id
  });

  if (error) throw error;
  return data;
}

/**
 * Delete a playlist safely - checks for usage first
 * @param {string} id - Playlist ID
 * @param {Object} options - Options
 * @param {boolean} options.force - If true, delete even if in use
 * @returns {Object} { success: boolean, error?: string, code?: string, usage?: Object }
 */
export async function deletePlaylistSafely(id, { force = false } = {}) {
  // First check usage
  const usage = await getPlaylistUsage(id);

  if (usage?.error) {
    return { success: false, error: usage.error };
  }

  // If in use and not forcing, return usage info
  if (usage?.is_in_use && !force) {
    return {
      success: false,
      error: 'Playlist is in use',
      code: 'IN_USE',
      usage
    };
  }

  // Proceed with deletion
  try {
    await deletePlaylist(id);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Duplicate a playlist
 */
export async function duplicatePlaylist(id) {
  // Get the original playlist with items
  const original = await getPlaylist(id);
  if (!original) throw new Error('Playlist not found');

  // Create the new playlist
  const newPlaylist = await createPlaylist({
    name: `${original.name} (Copy)`,
    description: original.description,
    defaultDuration: original.default_duration,
    transitionEffect: original.transition_effect,
    shuffle: original.shuffle
  });

  // Copy all items
  if (original.items && original.items.length > 0) {
    const itemsToInsert = original.items.map(item => ({
      playlist_id: newPlaylist.id,
      item_type: item.item_type,
      item_id: item.item_id,
      position: item.position,
      duration: item.duration
    }));

    const { error } = await supabase
      .from('playlist_items')
      .insert(itemsToInsert);

    if (error) throw error;
  }

  return newPlaylist;
}

/**
 * Save a playlist as a reusable template
 * @param {string} playlistId - The playlist ID to save as template
 * @param {Object} options - Template options
 * @param {string} options.name - Template name
 * @param {string} [options.description] - Template description
 * @param {string} [options.categoryId] - Category UUID
 * @param {string} [options.thumbnailUrl] - Thumbnail URL
 * @returns {Promise<{success: boolean, template_id: string, template_slug: string}>}
 */
export async function savePlaylistAsTemplate(playlistId, { name, description, categoryId, thumbnailUrl } = {}) {
  const { data, error } = await supabase.rpc('save_playlist_as_template', {
    p_playlist_id: playlistId,
    p_name: name,
    p_description: description || null,
    p_category_id: categoryId || null,
    p_thumbnail_url: thumbnailUrl || null,
  });

  if (error) throw error;

  // Log activity
  await logActivity({
    action: ACTIONS.CREATE,
    resourceType: RESOURCE_TYPES.TEMPLATE,
    resourceId: data.template_id,
    resourceName: name,
    details: { from_playlist: playlistId, item_count: data.item_count },
  });

  return data;
}
