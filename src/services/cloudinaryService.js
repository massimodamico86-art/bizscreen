import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('CloudinaryService');

/**
 * Cloudinary Service
 *
 * Service for uploading images to Cloudinary.
 * Supports blob/base64 uploads for the layout editor.
 *
 * @module services/cloudinaryService
 */

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured() {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);
}

/**
 * Upload an image blob to Cloudinary
 *
 * @param {Blob|File} blob - The image blob or file to upload
 * @param {Object} options - Upload options
 * @param {string} options.folder - Cloudinary folder (default: 'bizscreen/layouts')
 * @param {string} options.publicId - Custom public ID (optional)
 * @param {string} options.fileName - Original file name for reference
 * @returns {Promise<Object>} Upload result with url, publicId, etc.
 */
export async function uploadImageBlobToCloudinary(blob, options = {}) {
  const {
    folder = 'bizscreen/layouts',
    publicId,
    fileName,
  } = options;

  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary not configured. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET environment variables.');
  }

  const formData = new FormData();
  formData.append('file', blob, fileName || 'image.png');
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', folder);

  if (publicId) {
    formData.append('public_id', publicId);
  }

  try {
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Upload failed with status ${response.status}`);
    }

    const data = await response.json();

    return {
      url: data.secure_url,
      publicId: data.public_id,
      format: data.format,
      width: data.width,
      height: data.height,
      size: data.bytes,
      resourceType: data.resource_type,
      // Optimized URL with auto format and quality
      optimizedUrl: data.secure_url.replace('/upload/', '/upload/f_auto,q_auto/'),
      // Thumbnail URL
      thumbnailUrl: data.secure_url.replace('/upload/', '/upload/c_fill,w_150,h_150/'),
    };
  } catch (error) {
    logger.error('Cloudinary upload error:', { error: error });
    throw error;
  }
}

/**
 * Upload a base64 image to Cloudinary
 *
 * @param {string} base64Data - Base64 encoded image data (with or without data URL prefix)
 * @param {Object} options - Upload options
 * @param {string} options.folder - Cloudinary folder (default: 'bizscreen/layouts')
 * @param {string} options.publicId - Custom public ID (optional)
 * @returns {Promise<Object>} Upload result with url, publicId, etc.
 */
export async function uploadBase64ToCloudinary(base64Data, options = {}) {
  const {
    folder = 'bizscreen/layouts',
    publicId,
  } = options;

  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary not configured. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET environment variables.');
  }

  // Ensure base64 has proper data URL prefix
  const dataUrl = base64Data.startsWith('data:')
    ? base64Data
    : `data:image/png;base64,${base64Data}`;

  const formData = new FormData();
  formData.append('file', dataUrl);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', folder);

  if (publicId) {
    formData.append('public_id', publicId);
  }

  try {
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Upload failed with status ${response.status}`);
    }

    const data = await response.json();

    return {
      url: data.secure_url,
      publicId: data.public_id,
      format: data.format,
      width: data.width,
      height: data.height,
      size: data.bytes,
      resourceType: data.resource_type,
      optimizedUrl: data.secure_url.replace('/upload/', '/upload/f_auto,q_auto/'),
      thumbnailUrl: data.secure_url.replace('/upload/', '/upload/c_fill,w_150,h_150/'),
    };
  } catch (error) {
    logger.error('Cloudinary upload error:', { error: error });
    throw error;
  }
}

/**
 * Convert data URL to Blob
 *
 * @param {string} dataUrl - Data URL to convert
 * @returns {Blob} Converted blob
 */
export function dataUrlToBlob(dataUrl) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}

/**
 * Generate a Cloudinary transformation URL
 *
 * @param {string} url - Original Cloudinary URL
 * @param {Object} transforms - Transformation options
 * @returns {string} Transformed URL
 */
export function getTransformedUrl(url, transforms = {}) {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  const {
    width,
    height,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
    gravity = 'auto',
    effect,
  } = transforms;

  const parts = [];

  if (width) parts.push(`w_${width}`);
  if (height) parts.push(`h_${height}`);
  if (crop) parts.push(`c_${crop}`);
  if (gravity) parts.push(`g_${gravity}`);
  if (quality) parts.push(`q_${quality}`);
  if (format) parts.push(`f_${format}`);
  if (effect) parts.push(`e_${effect}`);

  if (parts.length === 0) {
    return url;
  }

  const transformString = parts.join(',');
  return url.replace('/upload/', `/upload/${transformString}/`);
}

export default {
  isCloudinaryConfigured,
  uploadImageBlobToCloudinary,
  uploadBase64ToCloudinary,
  dataUrlToBlob,
  getTransformedUrl,
};
