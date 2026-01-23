/**
 * PixieEditorModal
 *
 * Modal wrapper for the Pixie image editor.
 * Allows editing images with filters, cropping, text, etc.
 * Uploads edited images to Cloudinary.
 *
 * Pixie is loaded from CDN and initialized when the modal opens.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, Upload } from 'lucide-react';
import { Button } from '../../design-system';
import {
  uploadBase64ToCloudinary,
  isCloudinaryConfigured,
} from '../../services/cloudinaryService';
import { useLogger } from '../../hooks/useLogger.js';

// Pixie CDN URL
const PIXIE_CDN_URL = 'https://unpkg.com/@nicholask/pixie@latest/dist/pixie.umd.js';
const PIXIE_CSS_URL = 'https://unpkg.com/@nicholask/pixie@latest/dist/pixie.css';

export default function PixieEditorModal({
  isOpen,
  onClose,
  imageUrl,
  onSave,
  uploadToCloudinary = true,
  showToast,
}) {
  const logger = useLogger('PixieEditorModal');
  const containerRef = useRef(null);
  const pixieRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Load Pixie script and CSS
  const loadPixie = useCallback(async () => {
    // Check if already loaded
    if (window.Pixie) return true;

    try {
      // Load CSS
      if (!document.querySelector(`link[href="${PIXIE_CSS_URL}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = PIXIE_CSS_URL;
        document.head.appendChild(link);
      }

      // Load script
      if (!document.querySelector(`script[src="${PIXIE_CDN_URL}"]`)) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = PIXIE_CDN_URL;
          script.async = true;
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      return true;
    } catch (err) {
      logger.error('Failed to load Pixie', { error: err.message });
      return false;
    }
  }, [logger]);

  // Handle save with optional Cloudinary upload
  const handleSaveImage = useCallback(async (dataUrl) => {
    if (!uploadToCloudinary || !isCloudinaryConfigured()) {
      // Return the data URL directly if Cloudinary not configured
      onSave?.(dataUrl);
      onClose();
      return;
    }

    setUploading(true);
    try {
      const result = await uploadBase64ToCloudinary(dataUrl, {
        folder: 'bizscreen/layouts/edited',
      });

      onSave?.(result.optimizedUrl || result.url);
      showToast?.({ type: 'success', message: 'Image saved successfully' });
      onClose();
    } catch (err) {
      logger.error('Failed to upload image', { error: err.message });
      setError('Failed to upload image. Please try again.');
      showToast?.({ type: 'error', message: 'Failed to upload image' });
    } finally {
      setUploading(false);
    }
  }, [uploadToCloudinary, onSave, onClose, showToast, logger]);

  // Initialize Pixie when modal opens
  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    let mounted = true;

    async function initPixie() {
      setLoading(true);
      setError(null);

      const loaded = await loadPixie();
      if (!loaded || !mounted) {
        if (mounted) {
          setError('Failed to load image editor');
          setLoading(false);
        }
        return;
      }

      // Wait for Pixie to be available
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!window.Pixie || !containerRef.current || !mounted) {
        if (mounted) {
          setError('Image editor not available');
          setLoading(false);
        }
        return;
      }

      try {
        // Initialize Pixie
        pixieRef.current = new window.Pixie({
          selector: containerRef.current,
          image: imageUrl,
          ui: {
            mode: 'overlay',
            theme: 'dark',
            nav: {
              position: 'top',
            },
            openImageDialog: false,
            colorPresets: {
              items: [
                'rgb(255, 255, 255)',
                'rgb(0, 0, 0)',
                'rgb(239, 68, 68)',
                'rgb(249, 115, 22)',
                'rgb(59, 130, 246)',
                'rgb(34, 197, 94)',
                'rgb(168, 85, 247)',
                'rgb(236, 72, 153)',
              ],
            },
          },
          tools: {
            crop: { defaultRatio: '16:9' },
          },
          onSave: (data) => {
            handleSaveImage(data);
          },
          onClose: () => {
            onClose();
          },
        });

        setLoading(false);
      } catch (err) {
        logger.error('Failed to initialize Pixie', { error: err.message });
        setError('Failed to initialize image editor');
        setLoading(false);
      }
    }

    initPixie();

    return () => {
      mounted = false;
      if (pixieRef.current?.destroy) {
        try {
          pixieRef.current.destroy();
        } catch (e) {
          // Ignore cleanup errors
        }
        pixieRef.current = null;
      }
    };
  }, [isOpen, imageUrl, loadPixie, handleSaveImage, onClose, logger]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pixieRef.current?.destroy) {
        try {
          pixieRef.current.destroy();
        } catch (e) {
          // Ignore cleanup errors
        }
        pixieRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      {/* Close button */}
      <button
        onClick={onClose}
        disabled={uploading}
        className="absolute top-4 right-4 z-50 p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-white transition-colors disabled:opacity-50"
        title="Close editor"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Editor container */}
      <div className="w-full h-full max-w-6xl max-h-[90vh] mx-4 bg-gray-900 rounded-lg overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
              <p className="text-gray-400">Loading image editor...</p>
            </div>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 z-10">
            <div className="text-center">
              <Upload className="w-8 h-8 text-blue-500 animate-pulse mx-auto mb-2" />
              <p className="text-gray-400">Uploading image...</p>
            </div>
          </div>
        )}

        {error && !uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ minHeight: '500px' }}
        />
      </div>
    </div>
  );
}

/**
 * Alternative: Simple fallback image editor
 * Used when Pixie fails to load
 */
export function SimpleImageEditor({
  imageUrl,
  onSave,
  onClose,
  uploadToCloudinary = true,
  showToast,
}) {
  const canvasRef = useRef(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      ctx.drawImage(img, 0, 0);
    };
    img.src = imageUrl;
  }, [imageUrl, brightness, contrast, saturation]);

  const handleSave = async () => {
    if (!canvasRef.current) return;

    const dataUrl = canvasRef.current.toDataURL('image/png');

    if (!uploadToCloudinary || !isCloudinaryConfigured()) {
      onSave(dataUrl);
      onClose();
      return;
    }

    setUploading(true);
    try {
      const result = await uploadBase64ToCloudinary(dataUrl, {
        folder: 'bizscreen/layouts/edited',
      });

      onSave(result.optimizedUrl || result.url);
      showToast?.({ type: 'success', message: 'Image saved successfully' });
      onClose();
    } catch (err) {
      logger.error('Failed to upload image', { error: err.message });
      showToast?.({ type: 'error', message: 'Failed to upload image' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Edit Image</h2>
          <button
            onClick={onClose}
            disabled={uploading}
            className="text-gray-400 hover:text-white disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <canvas ref={canvasRef} className="max-w-full h-auto mx-auto mb-4 rounded" />

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Brightness</label>
            <input
              type="range"
              min="0"
              max="200"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full"
              disabled={uploading}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Contrast</label>
            <input
              type="range"
              min="0"
              max="200"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="w-full"
              disabled={uploading}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Saturation</label>
            <input
              type="range"
              min="0"
              max="200"
              value={saturation}
              onChange={(e) => setSaturation(Number(e.target.value))}
              className="w-full"
              disabled={uploading}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={uploading}>
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
