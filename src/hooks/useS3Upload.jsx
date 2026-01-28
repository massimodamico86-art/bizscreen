/**
 * useS3Upload Hook
 *
 * React hook for uploading files to AWS S3 with progress tracking
 * Replaces the Cloudinary upload widget with native file input
 */

import { useState, useCallback, useRef } from 'react';
import { createScopedLogger } from '../services/loggingService.js';

const logger = createScopedLogger('useS3Upload');
import {
  uploadFileToS3,
  getImageDimensions,
  getVideoDuration,
  validateFile,
} from '../services/s3UploadService';

/**
 * Hook for S3 file uploads
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.onSuccess - Callback when a file uploads successfully
 * @param {Function} options.onError - Callback when upload fails
 * @param {string} options.folder - S3 folder to upload to (default: 'media')
 * @param {number} options.maxFileSize - Max file size in bytes (default: 100MB)
 * @param {boolean} options.multiple - Allow multiple file uploads (default: true)
 * @param {string[]} options.accept - Accepted file types (default: images, videos, audio, docs)
 *
 * @returns {Object} Hook utilities
 */
export function useS3Upload({
  onSuccess,
  onError,
  folder = 'media',
  maxFileSize = 100 * 1024 * 1024, // 100MB
  multiple = true,
  accept = [
    'image/*',
    'video/*',
    'audio/*',
    'application/pdf',
    '.doc,.docx,.ppt,.pptx,.xls,.xlsx',
  ],
} = {}) {
  // State
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [errors, setErrors] = useState([]);

  // Hidden file input ref
  const fileInputRef = useRef(null);

  // Ref to store the latest handler (prevents stale closure issues)
  const handlerRef = useRef(null);

  /**
   * Open file picker dialog
   */
  const openFilePicker = useCallback(() => {
    logger.debug('[S3Upload] openFilePicker called, ref:', fileInputRef.current);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      logger.error('[S3Upload] fileInputRef.current is null - file input not mounted');
    }
  }, []);

  /**
   * Handle file selection (implementation)
   */
  const handleFileSelectImpl = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setProgress(0);
    setErrors([]);

    const fileArray = Array.from(files);
    const totalFiles = fileArray.length;
    let completedFiles = 0;

    for (const file of fileArray) {
      try {
        // Validate file
        const validation = validateFile(file, { maxSize: maxFileSize });
        if (!validation.valid) {
          setErrors(prev => [...prev, { file: file.name, errors: validation.errors }]);
          onError?.(new Error(validation.errors.join(', ')));
          continue;
        }

        setCurrentFile(file.name);

        // Get additional metadata for images/videos
        const [dimensions, duration] = await Promise.all([
          getImageDimensions(file),
          getVideoDuration(file),
        ]);

        // Upload file
        const result = await uploadFileToS3(file, {
          folder,
          onProgress: (fileProgress) => {
            // Calculate overall progress
            const overallProgress = ((completedFiles + fileProgress / 100) / totalFiles) * 100;
            setProgress(Math.round(overallProgress));
          },
        });

        // Add dimensions and duration to result
        result.width = dimensions.width;
        result.height = dimensions.height;
        result.duration = duration;

        // Add to uploaded files
        setUploadedFiles(prev => [...prev, result]);

        // Call success callback
        onSuccess?.(result);

        completedFiles++;
      } catch (error) {
        logger.error(`Error uploading ${file.name}:`, error);
        setErrors(prev => [...prev, { file: file.name, errors: [error.message] }]);
        onError?.(error);
      }
    }

    setUploading(false);
    setProgress(100);
    setCurrentFile(null);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Keep the handler ref updated with the latest implementation
  handlerRef.current = handleFileSelectImpl;

  // Stable handler that always calls the latest implementation
  const handleFileSelect = useCallback((event) => {
    logger.debug('[S3Upload] handleFileSelect called, files:', event?.target?.files?.length);
    handlerRef.current?.(event);
  }, []);

  /**
   * Handle drag and drop
   */
  const handleDrop = useCallback(async (event) => {
    event.preventDefault();

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    // Create a fake event object for handleFileSelect
    const fakeEvent = { target: { files } };
    await handleFileSelect(fakeEvent);
  }, [handleFileSelect]);

  /**
   * Clear uploaded files
   */
  const clearUploaded = useCallback(() => {
    setUploadedFiles([]);
    setErrors([]);
    setProgress(0);
  }, []);

  /**
   * Remove a specific uploaded file from the list
   */
  const removeUploaded = useCallback((index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Render hidden file input
   * This is a stable component that won't cause re-renders
   */
  const renderFileInput = () => (
    <input
      ref={fileInputRef}
      type="file"
      multiple={multiple}
      accept={accept.join(',')}
      onChange={handleFileSelect}
      style={{ display: 'none' }}
    />
  );

  return {
    // State
    uploading,
    progress,
    currentFile,
    uploadedFiles,
    errors,

    // Actions
    openFilePicker,
    handleDrop,
    clearUploaded,
    removeUploaded,

    // Render function (call this in JSX: {renderFileInput()})
    renderFileInput,
    // Legacy alias for backward compatibility
    FileInput: renderFileInput,

    // Ref for manual usage
    fileInputRef,
  };
}

export default useS3Upload;
