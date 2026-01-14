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
 * Orders by sort_order first, then by created_at for items with same sort_order
 */
export async function fetchMediaAssets({ type = null, search = '', limit = 100, folderId = undefined } = {}) {
  let query = supabase
    .from('media_assets')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (type) {
    query = query.eq('type', type);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  // Filter by folder if specified (null = root, undefined = all)
  if (folderId !== undefined) {
    if (folderId === null) {
      query = query.is('folder_id', null);
    } else {
      query = query.eq('folder_id', folderId);
    }
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
 * Upload media from a data URL (base64 encoded image)
 * Useful for saving designs from canvas/editor tools
 */
export async function uploadMediaFromDataUrl(dataUrl, options = {}) {
  const {
    name = 'design.png',
    type = 'image/png',
    source = 'design_editor',
    metadata = {},
  } = options;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  // Convert data URL to blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  // Generate unique filename
  const timestamp = Date.now();
  const ext = name.split('.').pop() || 'png';
  const filename = `${user.id}/${timestamp}-${name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  // Upload to Supabase storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('media')
    .upload(filename, blob, {
      contentType: type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('media')
    .getPublicUrl(filename);

  // Create media asset record
  const mediaAsset = await createMediaAsset({
    name: name.replace(`.${ext}`, ''),
    type: 'image',
    url: publicUrl,
    mimeType: type,
    fileSize: blob.size,
    width: metadata.width || null,
    height: metadata.height || null,
    description: `Created with ${source}`,
    tags: [source],
    configJson: metadata.designJson ? { designJson: metadata.designJson } : null,
  });

  return mediaAsset;
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
export async function createWebPageAsset({ name, url, description = null, tags = [], folderId = null }) {
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
    tags,
    folderId
  });
}

// ============================================
// EXTERNAL VIDEO SERVICES
// ============================================

/**
 * Parse YouTube URL and extract video ID
 * Supports: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
 */
export function parseYouTubeUrl(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Parse Vimeo URL and extract video ID
 * Supports: vimeo.com/ID, player.vimeo.com/video/ID
 */
export function parseVimeoUrl(url) {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Create a YouTube video asset
 */
export async function createYouTubeAsset({ url, name = null, description = null, tags = [], folderId = null }) {
  const videoId = parseYouTubeUrl(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL. Please use a valid YouTube video link.');
  }

  // Generate embed URL and thumbnail
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  const originalUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return createMediaAsset({
    name: name || `YouTube Video ${videoId}`,
    type: MEDIA_TYPES.VIDEO,
    url: embedUrl,
    thumbnailUrl,
    description,
    tags,
    folderId,
    configJson: {
      source: 'youtube',
      videoId,
      originalUrl,
      embedUrl,
    }
  });
}

/**
 * Create a Vimeo video asset
 */
export async function createVimeoAsset({ url, name = null, description = null, tags = [], folderId = null }) {
  const videoId = parseVimeoUrl(url);
  if (!videoId) {
    throw new Error('Invalid Vimeo URL. Please use a valid Vimeo video link.');
  }

  // Generate embed URL
  const embedUrl = `https://player.vimeo.com/video/${videoId}`;
  const originalUrl = `https://vimeo.com/${videoId}`;

  // Vimeo thumbnails require API access, use placeholder
  const thumbnailUrl = null; // Could be fetched via Vimeo API if configured

  return createMediaAsset({
    name: name || `Vimeo Video ${videoId}`,
    type: MEDIA_TYPES.VIDEO,
    url: embedUrl,
    thumbnailUrl,
    description,
    tags,
    folderId,
    configJson: {
      source: 'vimeo',
      videoId,
      originalUrl,
      embedUrl,
    }
  });
}

/**
 * Create a stream asset (RTSP, HLS, DASH)
 * Supports live streams and on-demand streaming URLs
 */
export async function createStreamAsset({
  url,
  name = null,
  streamType = 'auto', // 'hls', 'dash', 'rtsp', 'auto'
  description = null,
  tags = [],
  folderId = null
}) {
  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid stream URL');
  }

  // Auto-detect stream type from URL
  let detectedType = streamType;
  if (streamType === 'auto') {
    if (url.includes('.m3u8')) detectedType = 'hls';
    else if (url.includes('.mpd')) detectedType = 'dash';
    else if (url.startsWith('rtsp://')) detectedType = 'rtsp';
    else detectedType = 'hls'; // Default to HLS
  }

  return createMediaAsset({
    name: name || `Stream - ${detectedType.toUpperCase()}`,
    type: MEDIA_TYPES.VIDEO,
    url,
    description,
    tags,
    folderId,
    configJson: {
      source: 'stream',
      streamType: detectedType,
      isLive: true,
    }
  });
}

// ============================================
// STOCK MEDIA
// ============================================

/**
 * Create a stock image/video asset from external provider
 * @param {Object} params
 * @param {string} params.url - Direct URL to the media
 * @param {string} params.thumbnailUrl - Thumbnail URL
 * @param {string} params.name - Asset name
 * @param {string} params.type - 'image' or 'video'
 * @param {string} params.provider - Stock provider (pexels, unsplash, pixabay)
 * @param {string} params.providerAssetId - Original ID from provider
 * @param {string} params.photographer - Credit/attribution
 */
export async function createStockAsset({
  url,
  thumbnailUrl,
  name,
  type = 'image',
  provider,
  providerAssetId,
  photographer = null,
  description = null,
  tags = [],
  folderId = null
}) {
  return createMediaAsset({
    name: name || `Stock ${type}`,
    type: type === 'video' ? MEDIA_TYPES.VIDEO : MEDIA_TYPES.IMAGE,
    url,
    thumbnailUrl,
    description,
    tags,
    folderId,
    configJson: {
      source: 'stock',
      provider,
      providerAssetId,
      photographer,
      attribution: photographer ? `Photo by ${photographer} on ${provider}` : null,
    }
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

// ============================================
// DRAG AND DROP ORDERING
// ============================================

/**
 * Reorder a media item to a new position within its folder
 * Uses RPC function for atomic reordering
 *
 * @param {string} mediaId - ID of the media to reorder
 * @param {number} newSortOrder - New position (0-indexed)
 * @param {string|null} folderId - Target folder ID (null for root, or different folder to move)
 * @returns {Promise<boolean>} Success status
 */
export async function reorderMedia(mediaId, newSortOrder, folderId = undefined) {
  const { data, error } = await supabase.rpc('reorder_media_item', {
    p_media_id: mediaId,
    p_new_sort_order: newSortOrder,
    p_folder_id: folderId === undefined ? null : folderId
  });

  if (error) throw error;
  return data;
}

/**
 * Move a media item to a folder and place at the end
 * Uses RPC function to set proper sort_order
 *
 * @param {string} mediaId - ID of the media to move
 * @param {string|null} folderId - Target folder ID (null for root)
 * @returns {Promise<Object>} Updated media asset
 */
export async function moveMediaToFolderOrdered(mediaId, folderId = null) {
  const { data, error } = await supabase.rpc('move_media_to_folder_ordered', {
    p_media_id: mediaId,
    p_folder_id: folderId
  });

  if (error) throw error;
  return data;
}

/**
 * Batch update sort_order for multiple media items
 * Useful for optimistic UI updates after drag operations
 *
 * @param {Array<{id: string, sort_order: number}>} updates - Array of updates
 * @returns {Promise<boolean>} Success status
 */
export async function batchUpdateMediaOrder(updates) {
  if (!updates || updates.length === 0) return true;

  // Supabase doesn't support batch updates directly, so we use Promise.all
  // In production, you might want an RPC function for this
  const promises = updates.map(({ id, sort_order }) =>
    supabase
      .from('media_assets')
      .update({ sort_order, updated_at: new Date().toISOString() })
      .eq('id', id)
  );

  const results = await Promise.all(promises);

  // Check for errors
  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    throw new Error(`Failed to update ${errors.length} items`);
  }

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
