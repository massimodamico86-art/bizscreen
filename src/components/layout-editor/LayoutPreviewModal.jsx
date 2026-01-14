/**
 * LayoutPreviewModal
 *
 * Modal component for previewing layouts in fullscreen.
 * Features:
 * - Dark overlay backdrop
 * - Layout rendered in preview mode (no editing chrome)
 * - Close button and Escape key to dismiss
 * - Open in new window option
 * - 16:9 aspect ratio maintained
 *
 * Matches Yodeck-style design with clean preview experience.
 */

import { useEffect, useCallback } from 'react';
import { X, ExternalLink, Maximize2 } from 'lucide-react';
import LayoutEditorCanvas from './LayoutEditorCanvas';
import { YODECK_COLORS } from '../../config/yodeckTheme';

export default function LayoutPreviewModal({
  isOpen,
  onClose,
  layout,
  layoutId,
  onOpenStandalone,
}) {
  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle open in new window
  const handleOpenNewWindow = useCallback(() => {
    if (layoutId) {
      // Navigate to standalone preview route
      onOpenStandalone?.(layoutId);
    }
  }, [layoutId, onOpenStandalone]);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Layout Preview"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Preview container */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {/* Top toolbar */}
        <div className="flex items-center justify-between px-6 py-4 bg-black/50">
          <div className="flex items-center gap-4">
            <h2 className="text-white text-lg font-medium">
              Preview: {layout?.name || 'Untitled Layout'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Open in new window button */}
            {layoutId && (
              <button
                onClick={handleOpenNewWindow}
                className="flex items-center gap-2 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-sm"
                title="Open in new window"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Open in new window</span>
              </button>
            )}

            {/* Fullscreen toggle could go here */}
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Close preview (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Canvas area - centered preview */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div
            className="relative rounded-lg overflow-hidden shadow-2xl"
            style={{
              width: '90%',
              maxWidth: 'calc((100vh - 160px) * 16 / 9)',
              aspectRatio: '16 / 9',
            }}
          >
            {/* Render canvas in preview mode */}
            {layout ? (
              <LayoutEditorCanvas
                elements={layout.elements || []}
                selectedElementId={null}
                onElementSelect={() => {}}
                onElementUpdate={() => {}}
                background={layout.background}
                zoom={1}
                showGrid={false}
                smartGuidesEnabled={false}
                mode="preview"
              />
            ) : (
              <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                <p className="text-gray-500">No layout data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom info bar */}
        <div className="flex items-center justify-center px-6 py-3 bg-black/50 text-white/60 text-sm">
          <span>Press ESC or click outside to close</span>
        </div>
      </div>
    </div>
  );
}
