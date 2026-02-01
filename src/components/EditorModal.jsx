/**
 * EditorModal - Modal wrapper for Polotno design editor
 *
 * Opens the PolotnoEditor in a full-screen modal overlay, maintaining user context
 * on the page they came from. Includes loading states with 10s timeout and
 * error recovery with retry and fallback options.
 *
 * Per CONTEXT.md: "Editor opens in modal overlay (not full-page navigation)"
 */

import { useState, useCallback, useRef } from 'react';
import { Loader2, AlertCircle, RefreshCw, ExternalLink, HelpCircle } from 'lucide-react';
import { Modal } from '../design-system/components/Modal';
import PolotnoEditor from './PolotnoEditor';
import PostSaveDialog from './PostSaveDialog';
import UnsavedChangesDialog from './UnsavedChangesDialog';

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
  const [showPostSaveDialog, setShowPostSaveDialog] = useState(false);
  const [savedDesignName, setSavedDesignName] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Ref to trigger save from UnsavedChangesDialog
  const pendingSaveResolve = useRef(null);

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

  // Handle close attempt - intercept if dirty
  const handleCloseAttempt = useCallback(() => {
    if (isDirty) {
      // Show unsaved changes dialog
      setShowUnsavedDialog(true);
    } else {
      // Close directly
      handleActualClose();
    }
  }, [isDirty]);

  // Actual close - reset all state
  const handleActualClose = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setIsDirty(false);
    setShowUnsavedDialog(false);
    onClose?.();
  }, [onClose]);

  // Handle dirty state changes from editor
  const handleDirtyChange = useCallback((dirty) => {
    setIsDirty(dirty);
  }, []);

  // Handle save from editor
  const handleEditorSave = useCallback(async (saveData) => {
    try {
      await onSave?.(saveData);
      // Set the saved design name for the dialog
      setSavedDesignName(saveData?.name || templateData?.name || null);
      // Show post-save dialog instead of toast
      setShowPostSaveDialog(true);
    } catch (err) {
      showToast?.('Failed to save design: ' + err.message, 'error');
    }
  }, [onSave, showToast, templateData?.name]);

  // Handle "Keep Editing" from PostSaveDialog
  const handleKeepEditing = useCallback(() => {
    setShowPostSaveDialog(false);
    // Stay in editor - nothing else to do
  }, []);

  // Handle "Cancel" from UnsavedChangesDialog - return to editor
  const handleUnsavedCancel = useCallback(() => {
    setShowUnsavedDialog(false);
  }, []);

  // Handle "Discard" from UnsavedChangesDialog - close without saving
  const handleUnsavedDiscard = useCallback(() => {
    setShowUnsavedDialog(false);
    setIsDirty(false);
    handleActualClose();
  }, [handleActualClose]);

  // Handle "Save" from UnsavedChangesDialog - save then close
  const handleUnsavedSave = useCallback(async () => {
    // Trigger save via the iframe - this is tricky since we need to call into the iframe
    // The save button is in the iframe, so we need to use postMessage to trigger it
    // For now, we'll close and warn the user to save first
    // TODO: In a future iteration, we could send a 'triggerSave' message to the iframe
    setIsSaving(true);
    try {
      // Send message to iframe to trigger save
      const iframe = document.querySelector('iframe[title="Design Editor"]');
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          { target: 'polotno-editor', action: 'triggerSave' },
          '*'
        );
        // Wait for save confirmation (the save handler will clear dirty state)
        // We'll use a timeout as a fallback
        await new Promise((resolve) => {
          pendingSaveResolve.current = resolve;
          // Fallback timeout in case save doesn't complete
          setTimeout(() => {
            if (pendingSaveResolve.current) {
              pendingSaveResolve.current();
              pendingSaveResolve.current = null;
            }
          }, 5000);
        });
      }
    } finally {
      setIsSaving(false);
      setShowUnsavedDialog(false);
      // Don't auto-close after save - the PostSaveDialog will handle that
    }
  }, []);

  // Handle "View My Template" from PostSaveDialog
  const handleViewTemplate = useCallback(() => {
    setShowPostSaveDialog(false);
    handleActualClose();
    // Navigate to media library where saved designs appear
    window.location.hash = '#/media-images';
  }, [handleActualClose]);

  // Navigate to Design Studio (fallback)
  const handleOpenDesignStudio = useCallback(() => {
    handleActualClose();
    // Navigate to layouts page (Design Studio)
    window.location.hash = '#/layouts';
  }, [handleActualClose]);

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
      onClose={handleCloseAttempt}
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
          onClose={handleCloseAttempt}
          onReady={handleEditorReady}
          onError={handleEditorError}
          onDirtyChange={handleDirtyChange}
          onRetry={handleRetry}
          initialDesign={initialDesign}
          designName={templateData?.name || 'Untitled Design'}
          width={templateData?.width || 1920}
          height={templateData?.height || 1080}
        />
      </div>

      {/* Post-save dialog */}
      <PostSaveDialog
        open={showPostSaveDialog}
        onKeepEditing={handleKeepEditing}
        onViewTemplate={handleViewTemplate}
        savedDesignName={savedDesignName}
      />

      {/* Unsaved changes dialog */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onSave={handleUnsavedSave}
        onDiscard={handleUnsavedDiscard}
        onCancel={handleUnsavedCancel}
        loading={isSaving}
      />
    </Modal>
  );
}
