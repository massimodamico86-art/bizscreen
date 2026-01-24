/**
 * GDPR Deletion Service
 *
 * Handles deletion of user media files from external storage providers.
 * Required for GDPR Article 17 compliance - right to erasure must propagate
 * to all third-party data processors.
 */

import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('gdprDeletionService');

/**
 * Parse media URL to determine storage provider and extract key/public_id
 * @param {string} url - Media URL
 * @returns {{ provider: 's3'|'cloudinary'|'unknown', key: string|null }}
 */
export function parseMediaUrl(url) {
  if (!url) return { provider: 'unknown', key: null };

  // Cloudinary URL pattern: https://res.cloudinary.com/cloud_name/image/upload/v1234/folder/filename.ext
  if (url.includes('cloudinary.com')) {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    return {
      provider: 'cloudinary',
      key: match ? match[1] : null,
    };
  }

  // S3 URL patterns:
  // https://bucket.s3.region.amazonaws.com/key
  // https://s3.region.amazonaws.com/bucket/key
  if (url.includes('s3.') && url.includes('amazonaws.com')) {
    try {
      const urlObj = new URL(url);
      // Remove leading slash from pathname
      const key = urlObj.pathname.startsWith('/')
        ? urlObj.pathname.slice(1)
        : urlObj.pathname;
      return {
        provider: 's3',
        key,
      };
    } catch {
      return { provider: 's3', key: null };
    }
  }

  return { provider: 'unknown', key: null };
}

/**
 * Separate media URLs by provider
 * @param {Array<{url: string, thumbnailUrl?: string}>} mediaItems
 * @returns {{ s3Keys: string[], cloudinaryPublicIds: string[] }}
 */
export function categorizeMediaUrls(mediaItems) {
  const s3Keys = [];
  const cloudinaryPublicIds = [];

  for (const item of mediaItems) {
    // Main URL
    const mainParsed = parseMediaUrl(item.url);
    if (mainParsed.provider === 's3' && mainParsed.key) {
      s3Keys.push(mainParsed.key);
    } else if (mainParsed.provider === 'cloudinary' && mainParsed.key) {
      cloudinaryPublicIds.push(mainParsed.key);
    }

    // Thumbnail URL (if different from main)
    if (item.thumbnailUrl && item.thumbnailUrl !== item.url) {
      const thumbParsed = parseMediaUrl(item.thumbnailUrl);
      if (thumbParsed.provider === 's3' && thumbParsed.key) {
        s3Keys.push(thumbParsed.key);
      } else if (thumbParsed.provider === 'cloudinary' && thumbParsed.key) {
        cloudinaryPublicIds.push(thumbParsed.key);
      }
    }
  }

  return {
    s3Keys: [...new Set(s3Keys)], // Dedupe
    cloudinaryPublicIds: [...new Set(cloudinaryPublicIds)],
  };
}

/**
 * Delete files from S3
 * Note: This requires server-side execution with AWS credentials.
 * For client-side, this will call an API endpoint.
 *
 * @param {string[]} keys - S3 object keys to delete
 * @returns {Promise<{success: boolean, deleted: number, errors: string[]}>}
 */
export async function deleteS3Files(keys) {
  if (!keys || keys.length === 0) {
    return { success: true, deleted: 0, errors: [] };
  }

  const errors = [];

  try {
    // Call server API endpoint for S3 deletion
    // S3 DeleteObjects allows max 1000 per request
    const API_BASE = import.meta.env.VITE_API_URL || '';
    const chunks = chunkArray(keys, 1000);
    let totalDeleted = 0;

    for (const chunk of chunks) {
      const response = await fetch(`${API_BASE}/api/gdpr/delete-s3`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: chunk }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        errors.push(error.error || `Failed to delete ${chunk.length} files`);
      } else {
        const result = await response.json();
        totalDeleted += result.deleted || chunk.length;
      }
    }

    logger.info('S3 deletion completed', { totalDeleted, errors: errors.length });
    return { success: errors.length === 0, deleted: totalDeleted, errors };
  } catch (error) {
    logger.error('S3 deletion failed', { error: error.message, keyCount: keys.length });
    return { success: false, deleted: 0, errors: [error.message] };
  }
}

/**
 * Delete files from Cloudinary
 * Note: Requires server-side execution with Admin API credentials.
 *
 * @param {string[]} publicIds - Cloudinary public IDs to delete
 * @returns {Promise<{success: boolean, deleted: number, errors: string[]}>}
 */
export async function deleteCloudinaryFiles(publicIds) {
  if (!publicIds || publicIds.length === 0) {
    return { success: true, deleted: 0, errors: [] };
  }

  const errors = [];

  try {
    // Call server API endpoint for Cloudinary deletion
    // Admin API allows max 100 per request
    const API_BASE = import.meta.env.VITE_API_URL || '';
    const chunks = chunkArray(publicIds, 100);
    let totalDeleted = 0;

    for (const chunk of chunks) {
      const response = await fetch(`${API_BASE}/api/gdpr/delete-cloudinary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicIds: chunk }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        errors.push(error.error || `Failed to delete ${chunk.length} files`);
      } else {
        const result = await response.json();
        totalDeleted += result.deleted || chunk.length;
      }
    }

    logger.info('Cloudinary deletion completed', { totalDeleted, errors: errors.length });
    return { success: errors.length === 0, deleted: totalDeleted, errors };
  } catch (error) {
    logger.error('Cloudinary deletion failed', { error: error.message, idCount: publicIds.length });
    return { success: false, deleted: 0, errors: [error.message] };
  }
}

/**
 * Chunk array into smaller arrays
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array[]} - Array of chunks
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Delete all media files for a user
 * @param {Array<{url: string, thumbnailUrl?: string}>} mediaItems
 * @returns {Promise<{success: boolean, s3: object, cloudinary: object}>}
 */
export async function deleteUserMediaFiles(mediaItems) {
  const { s3Keys, cloudinaryPublicIds } = categorizeMediaUrls(mediaItems);

  logger.info('Starting media deletion', {
    s3Count: s3Keys.length,
    cloudinaryCount: cloudinaryPublicIds.length,
  });

  const [s3Result, cloudinaryResult] = await Promise.all([
    deleteS3Files(s3Keys),
    deleteCloudinaryFiles(cloudinaryPublicIds),
  ]);

  const success = s3Result.success && cloudinaryResult.success;

  logger.info('Media deletion complete', {
    success,
    s3Deleted: s3Result.deleted,
    cloudinaryDeleted: cloudinaryResult.deleted,
    errors: [...s3Result.errors, ...cloudinaryResult.errors],
  });

  return {
    success,
    s3: s3Result,
    cloudinary: cloudinaryResult,
  };
}

export default {
  parseMediaUrl,
  categorizeMediaUrls,
  deleteS3Files,
  deleteCloudinaryFiles,
  deleteUserMediaFiles,
};
