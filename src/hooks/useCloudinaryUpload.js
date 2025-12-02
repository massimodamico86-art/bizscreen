import { useCallback } from 'react';

/**
 * Custom hook for Cloudinary image uploads
 * Uses the Cloudinary Upload Widget loaded via script tag in index.html
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.onSuccess - Callback when upload succeeds
 * @param {Function} options.onError - Callback when upload fails
 * @param {string} options.folder - Cloudinary folder to upload to
 * @param {Array<string>} options.allowedFormats - Allowed file formats (default: ['jpg', 'jpeg', 'png', 'gif', 'webp'])
 * @param {number} options.maxFileSize - Max file size in bytes (default: 10MB)
 * @param {boolean} options.multiple - Allow multiple file uploads (default: false)
 * @param {Object} options.transformation - Image transformation options
 *
 * @returns {Function} openUploadWidget - Function to open the upload widget
 */
export const useCloudinaryUpload = ({
  onSuccess,
  onError,
  folder = 'bizscreen',
  allowedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'webm', 'mp3', 'wav', 'ogg', 'pdf'],
  maxFileSize = 104857600, // 100MB for videos
  multiple = true,
  transformation = null,
  resourceType = 'auto' // 'auto', 'image', 'video', 'raw'
} = {}) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const openUploadWidget = useCallback(() => {
    // Check if Cloudinary is loaded
    if (!window.cloudinary) {
      const error = new Error('Cloudinary Upload Widget not loaded. Make sure the script is included in index.html');
      console.error(error);
      onError?.(error);
      return;
    }

    // Check if credentials are configured
    if (!cloudName || !uploadPreset) {
      const error = new Error('Cloudinary credentials not configured. Please add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env file');
      console.error(error);
      onError?.(error);
      return;
    }

    // Widget configuration
    const widgetConfig = {
      cloudName,
      uploadPreset,
      sources: ['local', 'url', 'camera'],
      multiple,
      maxFileSize,
      clientAllowedFormats: allowedFormats,
      folder,
      resourceType,
      // Styling
      theme: 'minimal',
      styles: {
        palette: {
          window: '#FFFFFF',
          windowBorder: '#E5E7EB',
          tabIcon: '#3B82F6',
          menuIcons: '#6B7280',
          textDark: '#111827',
          textLight: '#FFFFFF',
          link: '#3B82F6',
          action: '#3B82F6',
          inactiveTabIcon: '#9CA3AF',
          error: '#EF4444',
          inProgress: '#3B82F6',
          complete: '#10B981',
          sourceBg: '#F9FAFB'
        },
        fonts: {
          default: {
            active: true
          }
        }
      },
      // Text customization
      text: {
        en: {
          or: 'or',
          back: 'Back',
          advanced: 'Advanced',
          close: 'Close',
          no_results: 'No results',
          search_placeholder: 'Search...',
          menu: {
            files: 'My Files',
            web: 'Web Address',
            camera: 'Camera'
          },
          local: {
            browse: 'Browse',
            dd_title_single: 'Drag and drop an image here',
            dd_title_multi: 'Drag and drop images here',
            drop_title_single: 'Drop image to upload',
            drop_title_multi: 'Drop images to upload'
          }
        }
      },
      // Show advanced options (crop, etc.)
      showAdvancedOptions: true,
      // Cropping
      cropping: true,
      croppingAspectRatio: null, // Allow free cropping
      croppingShowDimensions: true,
      // Show upload complete checkmark
      showCompletedButton: true,
      // Show thumbnail preview
      showPoweredBy: false,
      // Inline widget (false = modal)
      inline: false
    };

    // Add transformation if provided
    if (transformation) {
      widgetConfig.eager = [transformation];
    }

    // Create and open widget
    const widget = window.cloudinary.createUploadWidget(
      widgetConfig,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          onError?.(error);
          return;
        }

        // Handle different events
        if (result.event === 'success') {
          const info = result.info;
          const uploadedFile = {
            url: info.secure_url,
            publicId: info.public_id,
            format: info.format,
            width: info.width,
            height: info.height,
            size: info.bytes,
            thumbnail: info.thumbnail_url,
            // Resource type: image, video, raw
            resourceType: info.resource_type,
            // Duration in seconds (for video/audio)
            duration: info.duration ? Math.round(info.duration) : null,
            // Original filename
            originalFilename: info.original_filename,
            // Optimized URL with auto format and quality
            optimizedUrl: info.secure_url.replace('/upload/', '/upload/f_auto,q_auto/'),
            // Transformed URL if transformation was specified
            transformedUrl: info.eager?.[0]?.secure_url || info.secure_url
          };

          console.log('File uploaded successfully:', uploadedFile);
          onSuccess?.(uploadedFile);
        }

        if (result.event === 'close') {
          console.log('Upload widget closed');
        }

        if (result.event === 'abort') {
          console.log('Upload aborted');
        }
      }
    );

    widget.open();
  }, [cloudName, uploadPreset, folder, allowedFormats, maxFileSize, multiple, transformation, resourceType, onSuccess, onError]);

  return openUploadWidget;
};

/**
 * Helper function to generate Cloudinary transformation URLs
 *
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} transformations - Transformation options
 * @returns {string} Transformed image URL
 */
export const getCloudinaryUrl = (publicId, transformations = {}) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  if (!cloudName || !publicId) {
    return '';
  }

  const {
    width,
    height,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
    gravity = 'auto',
    effect
  } = transformations;

  const transforms = [];

  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (crop) transforms.push(`c_${crop}`);
  if (gravity) transforms.push(`g_${gravity}`);
  if (quality) transforms.push(`q_${quality}`);
  if (format) transforms.push(`f_${format}`);
  if (effect) transforms.push(`e_${effect}`);

  const transformString = transforms.length > 0 ? transforms.join(',') + '/' : '';

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformString}${publicId}`;
};
