/**
 * LayoutPreviewPage
 *
 * Standalone fullscreen preview page for layouts.
 * Route: yodeck-layout-preview-{layoutId}
 *
 * Features:
 * - Full viewport layout preview
 * - No editing chrome, clean preview experience
 * - Back to editor button
 * - Fullscreen toggle
 * - Escape key to exit fullscreen / go back
 *
 * Matches Yodeck-style design.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLayout } from '../../hooks/useLayout';
import { YODECK_COLORS } from '../../config/yodeckTheme';

export default function LayoutPreviewPage({ layoutId, showToast, onNavigate }) {
  // Use the layout hook to fetch layout data
  const { layout, isLoading, error } = useLayout(layoutId, {
    debounceMs: 0, // No debounce needed for read-only preview
  });

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Error entering fullscreen:', err);
        showToast?.({ type: 'error', message: 'Could not enter fullscreen mode' });
      });
    } else {
      document.exitFullscreen?.().then(() => {
        setIsFullscreen(false);
      });
    }
  }, [showToast]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape to exit fullscreen or go back
      if (e.key === 'Escape') {
        if (isFullscreen) {
          document.exitFullscreen?.();
        } else {
          handleBack();
        }
      }

      // F to toggle fullscreen
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, toggleFullscreen]);

  // Navigate back to editor
  const handleBack = useCallback(() => {
    if (isFullscreen) {
      document.exitFullscreen?.();
    }
    onNavigate?.(`yodeck-layout-${layoutId}`);
  }, [layoutId, onNavigate, isFullscreen]);

  // Navigate to edit mode
  const handleEdit = useCallback(() => {
    if (isFullscreen) {
      document.exitFullscreen?.();
    }
    onNavigate?.(`yodeck-layout-${layoutId}`);
  }, [layoutId, onNavigate, isFullscreen]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
          <p className="text-gray-400">Loading preview...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !layout) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Failed to load layout</h2>
          <p className="text-gray-400 mb-4">{error || 'Layout not found'}</p>
          <Button variant="outline" onClick={() => onNavigate?.('layouts')}>
            Back to Layouts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden">
      {/* Top control bar - hidden in fullscreen, shown normally */}
      {!isFullscreen && (
        <div className="flex items-center justify-between px-6 py-4 bg-black/90 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Back to editor"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </button>

            <div className="flex items-center gap-2 text-white">
              <Monitor className="w-5 h-5 text-gray-500" />
              <span className="font-medium">{layout.name || 'Untitled Layout'}</span>
              <span className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded">
                Preview
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Edit layout"
            >
              <Edit className="w-4 h-4" />
              <span className="text-sm">Edit</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-3 py-2 text-white/80 hover:text-white rounded-lg transition-colors"
              style={{ backgroundColor: YODECK_COLORS.primary + '20' }}
              title="Toggle fullscreen (F)"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
              <span className="text-sm">Fullscreen</span>
            </button>
          </div>
        </div>
      )}

      {/* Preview canvas - fills remaining space */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div
          className="relative rounded-lg overflow-hidden shadow-2xl"
          style={{
            width: isFullscreen ? '100vw' : '95%',
            height: isFullscreen ? '100vh' : 'auto',
            maxWidth: isFullscreen ? '100vw' : 'calc((100vh - 120px) * 16 / 9)',
            aspectRatio: isFullscreen ? 'auto' : '16 / 9',
          }}
        >
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
        </div>
      </div>

      {/* Bottom info bar - hidden in fullscreen */}
      {!isFullscreen && (
        <div className="flex items-center justify-center px-6 py-2 bg-black/90 border-t border-gray-800 text-gray-500 text-xs">
          <span>Press F for fullscreen  |  ESC to exit</span>
        </div>
      )}

      {/* Fullscreen exit hint - shown briefly in fullscreen */}
      {isFullscreen && (
        <div
          className="absolute top-4 right-4 px-3 py-2 bg-black/70 text-white/70 text-sm rounded-lg opacity-0 hover:opacity-100 transition-opacity"
          style={{ zIndex: 100 }}
        >
          Press ESC to exit fullscreen
        </div>
      )}
    </div>
  );
}
