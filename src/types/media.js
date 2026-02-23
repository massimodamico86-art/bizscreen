/**
 * Unified Media System Type Definitions
 *
 * This file defines the types for the unified media system that replaces
 * separate carousel and background media management.
 */

/**
 * @typedef {'image' | 'video'} MediaType
 */

/**
 * @typedef {Object} MediaItem
 * @property {string} id - Unique identifier for the media item
 * @property {string} url - URL to the media file
 * @property {'predefined' | 'uploaded'} source - Source of the media item
 * @property {boolean} [muted] - Whether this video item is muted (video items only, default: true)
 */

/**
 * @typedef {Object} UnifiedMediaState
 * @property {MediaType} activeType - Currently active media type (image or video)
 * @property {MediaItem[]} imageItems - Array of image media items
 * @property {MediaItem[]} videoItems - Array of video media items
 * @property {number} imageRotationIntervalSeconds - Rotation interval for images in seconds (default: 10, range: 3-300)
 */

/**
 * Default unified media state
 * @type {UnifiedMediaState}
 */
export const DEFAULT_UNIFIED_MEDIA_STATE = {
  activeType: 'image',
  imageItems: [],
  videoItems: [],
  imageRotationIntervalSeconds: 10
};

/**
 * Validation constants
 */
export const MEDIA_CONSTRAINTS = {
  IMAGE_ROTATION_INTERVAL_MIN: 3,
  IMAGE_ROTATION_INTERVAL_MAX: 300,
  IMAGE_ROTATION_INTERVAL_DEFAULT: 10,
  MAX_UPLOADED_IMAGES: 10,
  MAX_VIDEO_SIZE_MB: 40,
  ALLOWED_VIDEO_FORMATS: ['.mp4', '.webm'],
  MAX_VIDEO_DURATION_SECONDS: 120,
  IMAGE_ASPECT_RATIOS: ['3:2', '2.3:1']
};

/**
 * Helper function to validate rotation interval
 * @param {number} value - The interval value to validate
 * @returns {number} - Valid interval value
 */
export function validateRotationInterval(value) {
  const numValue = Number(value);
  if (isNaN(numValue)) {
    return MEDIA_CONSTRAINTS.IMAGE_ROTATION_INTERVAL_DEFAULT;
  }
  if (numValue < MEDIA_CONSTRAINTS.IMAGE_ROTATION_INTERVAL_MIN) {
    return MEDIA_CONSTRAINTS.IMAGE_ROTATION_INTERVAL_MIN;
  }
  if (numValue > MEDIA_CONSTRAINTS.IMAGE_ROTATION_INTERVAL_MAX) {
    return MEDIA_CONSTRAINTS.IMAGE_ROTATION_INTERVAL_MAX;
  }
  return numValue;
}

/**
 * Generate a unique ID for media items
 * @returns {string}
 */
export function generateMediaId() {
  return `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
