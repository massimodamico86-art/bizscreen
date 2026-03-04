// Document Service - Upload, convert, and manage document media assets
//
// Documents (PDF, Word, PowerPoint, Excel) are uploaded to Supabase Storage
// then converted server-side to PNG page images via the doc-converter Edge
// Function, making them compatible with WebOS/Tizen smart TV players.

import { supabase } from '../supabase';
import { MEDIA_TYPES, getFileExtension } from './mediaService.js';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('DocumentService');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * All accepted document MIME types (PDF + 6 Office variants).
 */
export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check if a MIME type is a supported document format.
 * @param {string} mimeType
 * @returns {boolean}
 */
export function isDocumentMimeType(mimeType) {
  return DOCUMENT_MIME_TYPES.includes(mimeType);
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

/**
 * Upload a document file and trigger server-side conversion to page images.
 *
 * Flow:
 *   1. Upload to Supabase Storage (documents/originals/{userId}/{timestamp}-{name})
 *   2. Create media_assets record with conversionStatus: 'pending'
 *   3. Invoke doc-converter Edge Function (async -- returns immediately)
 *   4. Return the media asset record
 *
 * @param {File} file - The document file to upload
 * @param {Object} options
 * @param {Function} [options.onStatusChange] - Callback: ('uploading'|'converting') => void
 * @returns {Promise<Object>} The created media_assets record
 */
export async function uploadDocument(file, { onStatusChange } = {}) {
  if (!file) throw new Error('File is required');
  if (!isDocumentMimeType(file.type)) {
    throw new Error(`Unsupported document type: ${file.type}`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  // -- 1. Upload to Supabase Storage ----------------------------------------
  onStatusChange?.('uploading');
  logger.info('Uploading document', { name: file.name, type: file.type, size: file.size });

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `documents/originals/${user.id}/${timestamp}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(storagePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    logger.error('Storage upload failed', uploadError);
    throw uploadError;
  }

  // -- 2. Get public URL ----------------------------------------------------
  const { data: { publicUrl } } = supabase.storage
    .from('media')
    .getPublicUrl(storagePath);

  // -- 3. Create media_assets record ----------------------------------------
  const originalFormat = getFileExtension(file.name);
  const assetName = file.name.replace(/\.[^/.]+$/, ''); // filename without extension

  const { data: asset, error: insertError } = await supabase
    .from('media_assets')
    .insert({
      owner_id: user.id,
      name: assetName,
      type: MEDIA_TYPES.DOCUMENT,
      url: publicUrl,
      mime_type: file.type,
      file_size: file.size,
      config_json: {
        conversionStatus: 'pending',
        convertedPages: [],
        pageCount: 0,
        originalFormat,
      },
    })
    .select()
    .single();

  if (insertError) {
    logger.error('Failed to create media_assets record', insertError);
    throw insertError;
  }

  // -- 4. Invoke doc-converter Edge Function (fire-and-forget) --------------
  onStatusChange?.('converting');
  logger.info('Invoking doc-converter', { mediaId: asset.id });

  const { error: fnError } = await supabase.functions.invoke('doc-converter', {
    body: {
      mediaId: asset.id,
      storageUrl: publicUrl,
      mimeType: file.type,
    },
  });

  if (fnError) {
    // Log but do not throw -- conversion can be retried later
    logger.warn('doc-converter invocation failed (will retry via polling)', fnError);
  }

  return asset;
}

// ---------------------------------------------------------------------------
// Conversion status
// ---------------------------------------------------------------------------

/**
 * Get the current conversion status for a document media asset.
 *
 * @param {string} mediaId - UUID of the media_assets record
 * @returns {Promise<{status: string, pageCount: number, convertedPages: string[], error: string|null}>}
 */
export async function getConversionStatus(mediaId) {
  const { data, error } = await supabase
    .from('media_assets')
    .select('config_json')
    .eq('id', mediaId)
    .single();

  if (error) throw error;

  const config = data?.config_json || {};
  return {
    status: config.conversionStatus || 'unknown',
    pageCount: config.pageCount || 0,
    convertedPages: config.convertedPages || [],
    error: config.conversionError || null,
  };
}

/**
 * Poll for conversion completion with exponential backoff.
 *
 * @param {string} mediaId - UUID of the media_assets record
 * @param {Object} options
 * @param {Function} [options.onComplete] - Called with conversion result on success
 * @param {Function} [options.onError]    - Called with error on failure or timeout
 * @param {number}   [options.maxAttempts=30] - Maximum poll attempts
 * @param {number}   [options.intervalMs=2000] - Initial interval (doubles each attempt, capped at 15s)
 * @returns {Function} cancel - Call to abort polling: () => void
 */
export function pollConversionStatus(mediaId, {
  onComplete,
  onError,
  maxAttempts = 30,
  intervalMs = 2000,
} = {}) {
  let attempt = 0;
  let timeoutId = null;
  let cancelled = false;

  async function poll() {
    if (cancelled) return;
    attempt++;

    try {
      const result = await getConversionStatus(mediaId);

      if (result.status === 'complete') {
        logger.info('Conversion complete', { mediaId, pages: result.pageCount });
        onComplete?.(result);
        return;
      }

      if (result.status === 'error') {
        logger.warn('Conversion error', { mediaId, error: result.error });
        onError?.(new Error(result.error || 'Conversion failed'));
        return;
      }

      // Still pending -- schedule next poll with exponential backoff
      if (attempt >= maxAttempts) {
        logger.warn('Conversion polling timed out', { mediaId, attempts: attempt });
        onError?.(new Error('Conversion timed out after maximum polling attempts'));
        return;
      }

      const nextInterval = Math.min(intervalMs * Math.pow(2, attempt - 1), 15000);
      timeoutId = setTimeout(poll, nextInterval);
    } catch (err) {
      logger.error('Polling error', err);
      onError?.(err);
    }
  }

  // Start first poll
  timeoutId = setTimeout(poll, intervalMs);

  // Return cancel function
  return () => {
    cancelled = true;
    if (timeoutId) clearTimeout(timeoutId);
  };
}
