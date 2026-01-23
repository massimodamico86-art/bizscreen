import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('S3UploadService');

/**
 * S3 Upload Service
 *
 * Handles file uploads to AWS S3 using presigned URLs
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Get file type category from MIME type
 */
function getMediaType(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('document') ||
      mimeType.includes('spreadsheet') || mimeType.includes('presentation') ||
      mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('powerpoint')) {
    return 'document';
  }
  return 'other';
}

/**
 * Generate thumbnail URL for images/videos
 */
function generateThumbnailUrl(fileUrl, mediaType) {
  // For images, we can use the same URL (or a resized version if CloudFront is set up)
  if (mediaType === 'image') {
    return fileUrl;
  }
  // For videos, you might want to generate a thumbnail separately
  // or use a placeholder
  return null;
}

/**
 * Get presigned URL from API
 */
async function getPresignedUrl(filename, contentType, folder = 'uploads') {
  const response = await fetch(`${API_BASE}/api/media/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filename, contentType, folder }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get upload URL');
  }

  return response.json();
}

/**
 * Upload a single file to S3
 *
 * @param {File} file - The file to upload
 * @param {Object} options - Upload options
 * @param {string} options.folder - Folder to upload to (default: 'uploads')
 * @param {Function} options.onProgress - Progress callback (0-100)
 * @returns {Promise<Object>} Upload result with URL and metadata
 */
export async function uploadFileToS3(file, options = {}) {
  const { folder = 'uploads', onProgress } = options;

  // Get presigned URL
  const { uploadUrl, fileUrl, key, mediaType } = await getPresignedUrl(
    file.name,
    file.type,
    folder
  );

  // Upload file using XMLHttpRequest for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          url: fileUrl,
          key,
          name: file.name,
          originalFilename: file.name,
          size: file.size,
          type: file.type,
          mediaType,
          thumbnail: generateThumbnailUrl(fileUrl, mediaType),
          width: null, // Would need to read image dimensions
          height: null,
          duration: null, // Would need to read video duration
          format: file.name.split('.').pop().toLowerCase(),
          resourceType: mediaType,
          optimizedUrl: fileUrl, // S3 doesn't auto-optimize like Cloudinary
        });
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    // Send the file
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

/**
 * Upload multiple files to S3
 *
 * @param {FileList|File[]} files - Files to upload
 * @param {Object} options - Upload options
 * @param {string} options.folder - Folder to upload to
 * @param {Function} options.onFileProgress - Progress callback for each file (file, progress)
 * @param {Function} options.onFileComplete - Callback when a file completes (file, result)
 * @param {Function} options.onFileError - Callback when a file fails (file, error)
 * @returns {Promise<Object[]>} Array of upload results
 */
export async function uploadFilesToS3(files, options = {}) {
  const {
    folder = 'uploads',
    onFileProgress,
    onFileComplete,
    onFileError,
  } = options;

  const results = [];
  const fileArray = Array.from(files);

  for (const file of fileArray) {
    try {
      const result = await uploadFileToS3(file, {
        folder,
        onProgress: (progress) => onFileProgress?.(file, progress),
      });
      results.push(result);
      onFileComplete?.(file, result);
    } catch (error) {
      logger.error('Error uploading file', { filename: file.name, error });
      onFileError?.(file, error);
    }
  }

  return results;
}

/**
 * Get image dimensions from file
 */
export function getImageDimensions(file) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve({ width: null, height: null });
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: null, height: null });
    };

    img.src = objectUrl;
  });
}

/**
 * Get video duration from file
 */
export function getVideoDuration(file) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('video/')) {
      resolve(null);
      return;
    }

    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(Math.round(video.duration));
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    video.src = objectUrl;
  });
}

/**
 * Validate file before upload
 */
export function validateFile(file, options = {}) {
  const {
    maxSize = 100 * 1024 * 1024, // 100MB default
    allowedTypes = null, // null = allow all supported types
  } = options;

  const errors = [];

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`);
  }

  // Check file type if restrictions specified
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} not allowed`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  uploadFileToS3,
  uploadFilesToS3,
  getImageDimensions,
  getVideoDuration,
  validateFile,
};
