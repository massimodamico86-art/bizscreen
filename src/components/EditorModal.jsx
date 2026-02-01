/**
 * EditorModal - Modal wrapper for Polotno design editor
 *
 * Opens the PolotnoEditor in a full-screen modal overlay, maintaining user context
 * on the page they came from. Includes loading states with 10s timeout and
 * error recovery with retry and fallback options.
 *
 * Per CONTEXT.md: "Editor opens in modal overlay (not full-page navigation)"
 */

import { useState, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw, ExternalLink, HelpCircle } from 'lucide-react';
import { Modal } from '../design-system/components/Modal';
import PolotnoEditor from './PolotnoEditor';

/**
 * EditorModal component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback when modal closes
 * @param {Object} props.templateData - Template data { id, name, thumbnail, orientation, width, height }
 * @param {Function} props.onSave - Callback for saving design
 * @param {Function} props.showToast - Toast notification function
 */
export default function EditorModal({
  isOpen,
  onClose,
  templateData,
  onSave,
  showToast,
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  // Handle editor ready
  const handleEditorReady = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  // Handle editor error (timeout or load failure)
  const handleEditorError = useCallback((errorData) => {
    setIsLoading(false);
    setError(errorData);
  }, []);

  // Handle retry - reset state and force editor reload
  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setRetryKey((prev) => prev + 1);
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    // Reset state when closing
    setIsLoading(true);
    setError(null);
    onClose?.();
  }, [onClose]);

  // Handle save from editor
  const handleEditorSave = useCallback(async (saveData) => {
    try {
      await onSave?.(saveData);
      showToast?.('Design saved successfully!', 'success');
    } catch (err) {
      showToast?.('Failed to save design: ' + err.message, 'error');
    }
  }, [onSave, showToast]);

  // Navigate to Design Studio (fallback)
  const handleOpenDesignStudio = useCallback(() => {
    handleClose();
    // Navigate to layouts page (Design Studio)
    window.location.hash = '#/layouts';
  }, [handleClose]);

  // Prepare initial design from template data
  const initialDesign = templateData ? {
    type: 'template',
    backgroundImage: templateData.thumbnail,
    width: templateData.width || 1920,
    height: templateData.height || 1080,
    name: templateData.name,
  } : null;

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      size="full"
      closeOnOverlay={false}
      closeOnEscape={false}
      showCloseButton={!isLoading && !error}
      className="!max-h-screen !h-screen !rounded-none"
    >
      {/* Loading overlay */}
      {isLoading && !error && (
        <div className="absolute inset-0 z-10 bg-gray-900 flex flex-col items-center justify-center">
          <Loader2 size={48} className="text-orange-500 animate-spin mb-4" />
          <p className="text-white text-lg font-medium mb-1">Loading design editor...</p>
          {templateData?.name && (
            <p className="text-gray-400 text-sm">Template: {templateData.name}</p>
          )}
          <p className="text-gray-500 text-sm mt-4">This may take a few seconds</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 z-10 bg-gray-900 flex flex-col items-center justify-center p-8">
          <div className="max-w-md text-center">
            {/* Error icon */}
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} className="text-red-400" />
            </div>

            {/* Error message */}
            <h2 className="text-xl font-bold text-white mb-2">
              Failed to Load Editor
            </h2>
            <p className="text-gray-400 mb-8">
              {error.message || 'The design editor took too long to load. Please try again.'}
            </p>

            {/* Action buttons */}
            <div className="space-y-3">
              {/* Primary: Retry */}
              <button
                onClick={handleRetry}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
              >
                <RefreshCw size={18} />
                Try Again
              </button>

              {/* Secondary: Open Design Studio */}
              <button
                onClick={handleOpenDesignStudio}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                <ExternalLink size={18} />
                Open Design Studio
              </button>

              {/* Tertiary: Contact Support */}
              <a
                href="mailto:support@bizscreen.com"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 text-gray-400 hover:text-white font-medium transition-colors"
              >
                <HelpCircle size={18} />
                Contact Support
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Polotno Editor */}
      <div className={`w-full h-full ${isLoading || error ? 'opacity-0' : 'opacity-100'}`}>
        <PolotnoEditor
          key={retryKey}
          onSave={handleEditorSave}
          onClose={handleClose}
          onReady={handleEditorReady}
          onError={handleEditorError}
          onRetry={handleRetry}
          initialDesign={initialDesign}
          designName={templateData?.name || 'Untitled Design'}
          width={templateData?.width || 1920}
          height={templateData?.height || 1080}
        />
      </div>
    </Modal>
  );
}
