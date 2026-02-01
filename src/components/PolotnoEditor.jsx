/**
 * Polotno Design Editor Component
 *
 * Embeds Polotno Studio in an iframe with React 18 (isolated from main app's React 19).
 * Communicates via postMessage for save/export functionality.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useLogger } from '../hooks/useLogger.js';

/**
 * PolotnoEditor component
 *
 * @param {Object} props
 * @param {Function} props.onSave - Callback when user saves design
 * @param {Function} props.onClose - Callback when user closes editor
 * @param {Function} props.onReady - Callback when editor is ready (for parent state tracking)
 * @param {Function} props.onError - Callback when error occurs (for parent error handling)
 * @param {Function} props.onRetry - Not used directly, but component re-mounts on key change
 * @param {Object} props.initialDesign - Initial design data to load
 * @param {string} props.designName - Name of the design
 * @param {number} props.width - Canvas width
 * @param {number} props.height - Canvas height
 * @param {Array} props.templates - Templates to show in side panel
 */
export default function PolotnoEditor({
  onSave,
  onClose,
  onReady,
  onError,
  initialDesign = null,
  designName = 'Untitled Design',
  width = 1920,
  height = 1080,
  templates = [], // Templates to show in the side panel
}) {
  const logger = useLogger('PolotnoEditor');
  const iframeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Build iframe URL with params - points to bundled Polotno editor
  const iframeSrc = `/polotno/index.html?width=${width}&height=${height}&name=${encodeURIComponent(designName)}`;

  // Handle messages from iframe
  const handleMessage = useCallback(async (event) => {
    // Only accept messages from our iframe
    if (event.data?.source !== 'polotno-editor') return;

    const { type, data } = event.data;

    switch (type) {
      case 'ready':
        setIsLoading(false);
        setError(null);
        // Notify parent that editor is ready
        onReady?.();
        // Load initial design if provided
        if (initialDesign) {
          if (initialDesign.type === 'template' && initialDesign.backgroundImage) {
            // Load template as background image
            sendToIframe('loadTemplate', {
              backgroundImage: initialDesign.backgroundImage,
              width: initialDesign.width,
              height: initialDesign.height,
              name: initialDesign.name,
            });
          } else if (initialDesign.json) {
            // Load saved design from JSON
            sendToIframe('loadDesign', { json: initialDesign.json });
          } else {
            // Legacy: pass as-is
            sendToIframe('loadDesign', { json: initialDesign });
          }
        }
        break;

      case 'save':
        if (onSave && data) {
          try {
            await onSave({
              name: designName,
              imageDataUrl: data.dataUrl,
              json: data.json,
              width: data.width,
              height: data.height,
            });
          } catch (err) {
            logger.error('Save handler failed', { error: err, designName });
          }
        }
        break;

      case 'close':
        onClose?.();
        break;

      case 'imageExported':
        // Handle export completion if needed
        break;

      case 'error':
        setError(data?.message || 'An error occurred');
        // Notify parent of the error
        onError?.({ type: 'iframe', message: data?.message || 'An error occurred' });
        break;

      case 'requestTemplates':
        // Send templates to the iframe
        sendToIframe('setTemplates', { templates });
        break;
    }
  }, [initialDesign, onSave, onClose, onReady, onError, designName, templates]);

  // Send message to iframe
  const sendToIframe = useCallback((action, payload = {}) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { target: 'polotno-editor', action, payload },
        '*'
      );
    }
  }, []);

  // Set up message listener
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  // Handle iframe load timeout (10 seconds per CONTEXT.md decision)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        const errorMessage = 'Editor took too long to load. Please try again.';
        setError(errorMessage);
        // Notify parent of timeout error
        onError?.({ type: 'timeout', message: errorMessage });
      }
    }, 10000); // 10 second timeout per CONTEXT.md

    return () => clearTimeout(timeout);
  }, [isLoading, onError]);

  // Export design (callable from parent)
  const exportDesign = useCallback(() => {
    sendToIframe('exportImage');
  }, [sendToIframe]);

  // Get design JSON (callable from parent)
  const getDesign = useCallback(() => {
    sendToIframe('getDesign');
  }, [sendToIframe]);

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-2xl">!</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Failed to Load Editor</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-gray-900 flex flex-col items-center justify-center">
          <Loader2 size={48} className="text-orange-500 animate-spin mb-4" />
          <p className="text-gray-400">Loading Polotno editor...</p>
          <p className="text-gray-500 text-sm mt-2">This may take a few seconds</p>
        </div>
      )}

      {/* Polotno iframe */}
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        className="w-full h-full border-0"
        title="Design Editor"
        allow="clipboard-read; clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"
      />
    </div>
  );
}

// Preset sizes for digital signage
export const DESIGN_PRESETS = [
  { id: 'landscape-hd', name: 'Landscape HD (16:9)', width: 1920, height: 1080, icon: 'Monitor' },
  { id: 'portrait-hd', name: 'Portrait HD (9:16)', width: 1080, height: 1920, icon: 'Smartphone' },
  { id: 'landscape-4k', name: 'Landscape 4K', width: 3840, height: 2160, icon: 'Monitor' },
  { id: 'square', name: 'Square (1:1)', width: 1080, height: 1080, icon: 'Square' },
  { id: 'ultrawide', name: 'Ultrawide (21:9)', width: 2560, height: 1080, icon: 'RectangleHorizontal' },
];
