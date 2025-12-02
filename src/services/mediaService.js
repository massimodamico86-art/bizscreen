// Media Asset Service - CRUD operations for media library
import { supabase } from '../supabase';

/**
 * Media asset types
 */
export const MEDIA_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  WEB_PAGE: 'web_page',
  APP: 'app'
};

/**
 * Get file type from mime type
 */
export function getMediaTypeFromMime(mimeType) {
  if (!mimeType) return null;

  if (mimeType.startsWith('image/')) return MEDIA_TYPES.IMAGE;
  if (mimeType.startsWith('video/')) return MEDIA_TYPES.VIDEO;
  if (mimeType.startsWith('audio/')) return MEDIA_TYPES.AUDIO;
  if (mimeType === 'application/pdf' || mimeType.startsWith('text/')) return MEDIA_TYPES.DOCUMENT;

  return null;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename) {
  return filename?.split('.').pop()?.toLowerCase() || '';
}

/**
 * Validate file type and size
 */
export function validateMediaFile(file, maxSizeMB = 100) {
  const errors = [];

  // Check file size
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    errors.push(`File size exceeds ${maxSizeMB}MB limit`);
  }

  // Check file type
  const mediaType = getMediaTypeFromMime(file.type);
  if (!mediaType) {
    errors.push(`Unsupported file type: ${file.type}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    mediaType
  };
}

/**
 * Fetch all media assets with optional filtering
 */
export async function fetchMediaAssets({ type = null, search = '', limit = 100 } = {}) {
  let query = supabase
    .from('media_assets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (type) {
    query = query.eq('type', type);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get a single media asset by ID
 */
export async function getMediaAsset(id) {
  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new media asset record
 */
export async function createMediaAsset({
  name,
  type,
  url,
  thumbnailUrl = null,
  mimeType = null,
  fileSize = null,
  duration = null,
  width = null,
  height = null,
  description = null,
  tags = [],
  configJson = null,
  folderId = null
}) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('User must be authenticated');

  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      owner_id: user.id,
      name,
      type,
      url,
      thumbnail_url: thumbnailUrl,
      mime_type: mimeType,
      file_size: fileSize,
      duration,
      width,
      height,
      description,
      tags,
      config_json: configJson,
      folder_id: folderId
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a media asset
 */
export async function updateMediaAsset(id, updates) {
  const allowedFields = [
    'name', 'description', 'tags', 'config_json', 'folder_id',
    'thumbnail_url', 'duration', 'width', 'height'
  ];

  const filteredUpdates = {};
  for (const key of allowedFields) {
    if (key in updates) {
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      filteredUpdates[snakeKey] = updates[key];
    }
  }

  const { data, error } = await supabase
    .from('media_assets')
    .update(filteredUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a media asset
 */
export async function deleteMediaAsset(id) {
  const { error } = await supabase
    .from('media_assets')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

/**
 * Get media usage - where this media is being used
 */
export async function getMediaUsage(id) {
  const { data, error } = await supabase.rpc('get_media_usage', {
    p_media_id: id
  });

  if (error) throw error;
  return data;
}

/**
 * Check if media is in use
 */
export async function isMediaInUse(id) {
  const { data, error } = await supabase.rpc('is_media_in_use', {
    p_media_id: id
  });

  if (error) throw error;
  return data;
}

/**
 * Delete a media asset safely - checks for usage first
 * @param {string} id - Media ID
 * @param {Object} options - Options
 * @param {boolean} options.force - If true, delete even if in use
 * @returns {Object} { success: boolean, error?: string, code?: string, usage?: Object }
 */
export async function deleteMediaAssetSafely(id, { force = false } = {}) {
  // First check usage
  const usage = await getMediaUsage(id);

  if (usage?.error) {
    return { success: false, error: usage.error };
  }

  // If in use and not forcing, return usage info
  if (usage?.is_in_use && !force) {
    return {
      success: false,
      error: 'Media is in use',
      code: 'IN_USE',
      usage
    };
  }

  // Proceed with deletion
  try {
    await deleteMediaAsset(id);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Duplicate a media asset
 */
export async function duplicateMediaAsset(id) {
  const original = await getMediaAsset(id);

  if (!original) throw new Error('Media asset not found');

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      owner_id: user.id,
      name: `${original.name} (Copy)`,
      type: original.type,
      url: original.url,
      thumbnail_url: original.thumbnail_url,
      mime_type: original.mime_type,
      file_size: original.file_size,
      duration: original.duration,
      width: original.width,
      height: original.height,
      description: original.description,
      tags: original.tags,
      config_json: original.config_json,
      folder_id: original.folder_id
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a web page media asset
 */
export async function createWebPageAsset({ name, url, description = null, tags = [] }) {
  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }

  return createMediaAsset({
    name: name || url,
    type: MEDIA_TYPES.WEB_PAGE,
    url,
    description,
    tags
  });
}

/**
 * Batch delete media assets
 */
export async function batchDeleteMediaAssets(ids) {
  if (!ids || ids.length === 0) return { deleted: 0 };

  const { error } = await supabase
    .from('media_assets')
    .delete()
    .in('id', ids);

  if (error) throw error;
  return { deleted: ids.length };
}

/**
 * Move media assets to a folder
 */
export async function moveMediaToFolder(mediaIds, folderId) {
  const { error } = await supabase
    .from('media_assets')
    .update({ folder_id: folderId })
    .in('id', mediaIds);

  if (error) throw error;
  return true;
}

/**
 * Add tags to a media asset
 */
export async function addTagsToMedia(id, newTags) {
  const asset = await getMediaAsset(id);
  const existingTags = asset.tags || [];
  const combinedTags = [...new Set([...existingTags, ...newTags])];

  return updateMediaAsset(id, { tags: combinedTags });
}

/**
 * Remove tags from a media asset
 */
export async function removeTagsFromMedia(id, tagsToRemove) {
  const asset = await getMediaAsset(id);
  const existingTags = asset.tags || [];
  const filteredTags = existingTags.filter(tag => !tagsToRemove.includes(tag));

  return updateMediaAsset(id, { tags: filteredTags });
}

// ============================================
// APP CREATION HELPERS
// ============================================

/**
 * App types supported by the system
 */
export const APP_TYPE_KEYS = {
  CLOCK: 'clock',
  WEB_PAGE: 'web_page',
  WEATHER: 'weather',
  RSS_TICKER: 'rss_ticker',
  DATA_TABLE: 'data_table',
  CALENDAR: 'calendar'
};

/**
 * Create a generic app asset
 * @param {string} appType - The app type (clock, web_page, etc.)
 * @param {string} name - Display name for the app
 * @param {Object} config - App-specific configuration
 * @returns {Promise<Object>} Created media asset
 */
export async function createAppAsset(appType, name, config = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const configJson = {
    appType,
    ...config
  };

  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      owner_id: user.id,
      name,
      type: MEDIA_TYPES.APP,
      url: '', // Apps don't have a URL
      config_json: configJson
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a Clock app
 * @param {Object} options - Clock configuration
 * @param {string} options.name - Display name
 * @param {string} options.format - Time format ('HH:mm', 'hh:mm A', etc.)
 * @param {boolean} options.showSeconds - Whether to show seconds
 * @param {boolean} options.showDate - Whether to show date
 * @param {string} options.dateFormat - Date format ('MMM D, YYYY', 'YYYY-MM-DD', etc.)
 * @param {string} options.timezone - Timezone ('device' or specific timezone like 'America/New_York')
 * @returns {Promise<Object>} Created app asset
 */
export async function createClockApp({
  name = 'Clock',
  format = 'HH:mm',
  showSeconds = false,
  showDate = true,
  dateFormat = 'MMM D, YYYY',
  timezone = 'device'
} = {}) {
  return createAppAsset(APP_TYPE_KEYS.CLOCK, name, {
    format,
    showSeconds,
    showDate,
    dateFormat,
    timezone
  });
}

/**
 * Create a Web Page app
 * @param {Object} options - Web page configuration
 * @param {string} options.name - Display name
 * @param {string} options.url - The URL to display
 * @param {number} options.refreshSeconds - How often to refresh (0 = never)
 * @param {boolean} options.scrollEnabled - Whether scrolling is enabled
 * @param {number} options.zoomLevel - Zoom level (1 = 100%)
 * @returns {Promise<Object>} Created app asset
 */
export async function createWebPageApp({
  name,
  url,
  refreshSeconds = 0,
  scrollEnabled = false,
  zoomLevel = 1
} = {}) {
  // Validate URL
  if (!url) throw new Error('URL is required');
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }

  return createAppAsset(APP_TYPE_KEYS.WEB_PAGE, name || url, {
    url,
    refreshSeconds,
    scrollEnabled,
    zoomLevel
  });
}

/**
 * Fetch all app assets
 * @param {Object} options - Filter options
 * @param {string} options.appType - Filter by app type (clock, web_page, etc.)
 * @param {string} options.search - Search by name
 * @param {number} options.limit - Maximum results
 * @returns {Promise<Array>} App assets
 */
export async function fetchApps({ appType = null, search = '', limit = 100 } = {}) {
  let query = supabase
    .from('media_assets')
    .select('*')
    .eq('type', MEDIA_TYPES.APP)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Filter by appType if specified (done client-side since config_json is JSONB)
  let results = data || [];
  if (appType) {
    results = results.filter(app => app.config_json?.appType === appType);
  }

  return results;
}

/**
 * Delete an app asset
 * @param {string} id - App asset ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteApp(id) {
  return deleteMediaAsset(id);
}

/**
 * Update an app's configuration
 * @param {string} id - App asset ID
 * @param {Object} config - New configuration (merged with existing)
 * @returns {Promise<Object>} Updated app asset
 */
export async function updateAppConfig(id, config) {
  const asset = await getMediaAsset(id);
  if (!asset || asset.type !== MEDIA_TYPES.APP) {
    throw new Error('App not found');
  }

  const newConfig = {
    ...asset.config_json,
    ...config
  };

  return updateMediaAsset(id, { config_json: newConfig });
}

/**
 * Create a Weather app
 * @param {Object} options - Weather configuration
 * @param {string} options.name - Display name
 * @param {string} options.location - City name or coordinates (e.g., "New York" or "40.7128,-74.0060")
 * @param {string} options.units - 'imperial' or 'metric'
 * @param {string} options.layout - 'compact' or 'detailed'
 * @param {number} options.refreshMinutes - How often to refresh (min 2)
 * @returns {Promise<Object>} Created app asset
 */
export async function createWeatherApp({
  name = 'Weather',
  location = '',
  units = 'imperial',
  layout = 'detailed',
  refreshMinutes = 15
} = {}) {
  if (!location) throw new Error('Location is required');

  return createAppAsset(APP_TYPE_KEYS.WEATHER, name, {
    location,
    units,
    layout,
    refreshMinutes: Math.max(2, refreshMinutes)
  });
}

/**
 * Create an RSS Ticker app
 * @param {Object} options - RSS configuration
 * @param {string} options.name - Display name
 * @param {string} options.feedUrl - RSS feed URL
 * @param {number} options.maxItems - Maximum number of items to display
 * @param {number} options.scrollSpeed - Animation duration in seconds (10-60)
 * @param {number} options.refreshMinutes - How often to refresh (min 2)
 * @returns {Promise<Object>} Created app asset
 */
export async function createRssTickerApp({
  name = 'RSS Ticker',
  feedUrl = '',
  maxItems = 10,
  scrollSpeed = 30,
  refreshMinutes = 5
} = {}) {
  if (!feedUrl) throw new Error('Feed URL is required');

  // Validate URL
  try {
    new URL(feedUrl);
  } catch {
    throw new Error('Invalid feed URL format');
  }

  return createAppAsset(APP_TYPE_KEYS.RSS_TICKER, name, {
    feedUrl,
    maxItems: Math.min(50, Math.max(1, maxItems)),
    scrollSpeed: Math.min(60, Math.max(10, scrollSpeed)),
    refreshMinutes: Math.max(2, refreshMinutes)
  });
}

/**
 * Create a Data Table app (for menus, price boards, etc.)
 * @param {Object} options - Data table configuration
 * @param {string} options.name - Display name
 * @param {string} options.dataUrl - URL to CSV, TSV, or JSON data
 * @param {string} options.format - 'csv', 'tsv', or 'json'
 * @param {string} options.theme - 'light' or 'dark'
 * @param {number} options.maxRows - Maximum rows to display (0 = all)
 * @param {string[]} options.columns - Column names to include (empty = all)
 * @param {number} options.refreshMinutes - How often to refresh (min 2)
 * @returns {Promise<Object>} Created app asset
 */
export async function createDataTableApp({
  name = 'Data Table',
  dataUrl = '',
  format = 'csv',
  theme = 'dark',
  maxRows = 0,
  columns = [],
  refreshMinutes = 5
} = {}) {
  if (!dataUrl) throw new Error('Data URL is required');

  // Validate URL
  try {
    new URL(dataUrl);
  } catch {
    throw new Error('Invalid data URL format');
  }

  return createAppAsset(APP_TYPE_KEYS.DATA_TABLE, name, {
    dataUrl,
    format,
    theme,
    maxRows: Math.max(0, maxRows),
    columns,
    refreshMinutes: Math.max(2, refreshMinutes)
  });
}
