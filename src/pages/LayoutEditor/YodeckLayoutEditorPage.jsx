/**
 * YodeckLayoutEditorPage
 *
 * Main layout editor page with Yodeck-style interface.
 * Features:
 * - Centered 16:9 canvas on light gray background
 * - Dark grid overlay
 * - Drag and resize elements
 * - Left sidebar for adding content
 * - Right panel for element properties
 * - Top toolbar with zoom, undo/redo, save
 * - Pixie image editor integration with Cloudinary uploads
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  LayoutEditorCanvas,
  LayoutPropertiesPanel,
  LeftSidebar,
  TopToolbar,
  PixieEditorModal,
  LayoutPreviewModal,
  createDefaultLayout,
} from '../../components/layout-editor';
import { useLayout } from '../../hooks/useLayout';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../../design-system';
import { InsertContentModal } from '../../components/modals/InsertContentModal';

// History state for undo/redo
const MAX_HISTORY = 50;

export default function YodeckLayoutEditorPage({ layoutId, showToast, onNavigate }) {
  // Use the layout hook for Supabase integration
  const {
    layout,
    setLayout,
    isLoading,
    error,
    isSaving,
    hasUnsavedChanges,
    saveLayoutNow,
    updateLayout: saveLayoutDebounced,
    updateElement,
    addElement,
    deleteElement,
    duplicateElement,
  } = useLayout(layoutId, {
    debounceMs: 800,
    onSaveSuccess: (msg) => showToast?.({ type: 'success', message: msg }),
    onSaveError: (msg) => showToast?.({ type: 'error', message: msg }),
  });

  // Editor state
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [smartGuidesEnabled, setSmartGuidesEnabled] = useState(true);
  const [showLayersPanel, setShowLayersPanel] = useState(false);

  // Canvas orientation and size
  const [orientation, setOrientation] = useState(() => {
    // Initialize from layout or default to 16:9 landscape
    if (layout?.canvasSize) {
      return layout.canvasSize.width > layout.canvasSize.height ? '16:9' : '9:16';
    }
    return '16:9';
  });
  const [canvasSize, setCanvasSize] = useState(() => {
    return layout?.canvasSize || { width: 1920, height: 1080 };
  });

  // History for undo/redo (local state)
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Pixie editor state
  const [pixieOpen, setPixieOpen] = useState(false);
  const [editingImageElement, setEditingImageElement] = useState(null);

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);

  // Media library modal state
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);

  // Media items (would come from media library)
  const [mediaItems, setMediaItems] = useState([]);

  // Initialize history when layout loads
  useEffect(() => {
    if (layout && history.length === 0) {
      setHistory([JSON.parse(JSON.stringify(layout))]);
      setHistoryIndex(0);
    }
  }, [layout, history.length]);

  // Sync canvas size from layout when it loads
  useEffect(() => {
    if (layout?.canvasSize) {
      setCanvasSize(layout.canvasSize);
      // Determine orientation from canvas size
      if (layout.canvasSize.width > layout.canvasSize.height) {
        setOrientation('16:9');
      } else if (layout.canvasSize.height > layout.canvasSize.width) {
        setOrientation('9:16');
      } else {
        setOrientation('1:1');
      }
    }
  }, [layout?.canvasSize?.width, layout?.canvasSize?.height]);

  // Handle orientation change
  const handleOrientationChange = useCallback((newOrientation) => {
    setOrientation(newOrientation);
  }, []);

  // Push state to history
  const pushHistory = useCallback((newLayout) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newLayout)));
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex]);

  // Update layout with history tracking
  const handleLayoutUpdate = useCallback((updates) => {
    const newLayout = { ...layout, ...updates };
    pushHistory(newLayout);
    setLayout(newLayout);
    saveLayoutDebounced(newLayout);
  }, [layout, pushHistory, setLayout, saveLayoutDebounced]);

  // Handle canvas size change (must be after handleLayoutUpdate)
  const handleCanvasSizeChange = useCallback((newSize) => {
    setCanvasSize(newSize);
    // Also update the layout so it persists
    handleLayoutUpdate({ canvasSize: newSize });
  }, [handleLayoutUpdate]);

  // Selected element
  const selectedElement = useMemo(() => {
    if (!selectedElementId || !layout?.elements) return null;
    return layout.elements.find((el) => el.id === selectedElementId);
  }, [selectedElementId, layout?.elements]);

  // Add element handler
  const handleAddElement = useCallback((element) => {
    const newElements = [...(layout?.elements || []), element];
    handleLayoutUpdate({ elements: newElements });
    setSelectedElementId(element.id);
  }, [layout?.elements, handleLayoutUpdate]);

  // Update element handler
  const handleElementUpdate = useCallback((elementId, updates) => {
    const newElements = layout.elements.map((el) =>
      el.id === elementId ? { ...el, ...updates } : el
    );
    handleLayoutUpdate({ elements: newElements });
  }, [layout?.elements, handleLayoutUpdate]);

  // Delete element handler
  const handleDeleteElement = useCallback(() => {
    if (!selectedElementId) return;
    const newElements = layout.elements.filter((el) => el.id !== selectedElementId);
    handleLayoutUpdate({ elements: newElements });
    setSelectedElementId(null);
  }, [selectedElementId, layout?.elements, handleLayoutUpdate]);

  // Duplicate element handler
  const handleDuplicateElement = useCallback(() => {
    if (!selectedElement) return;
    const newElement = {
      ...JSON.parse(JSON.stringify(selectedElement)),
      id: `${selectedElement.type}-${Date.now()}`,
      position: {
        ...selectedElement.position,
        x: Math.min(selectedElement.position.x + 0.05, 1 - selectedElement.position.width),
        y: Math.min(selectedElement.position.y + 0.05, 1 - selectedElement.position.height),
      },
    };
    handleAddElement(newElement);
  }, [selectedElement, handleAddElement]);

  // Lock/unlock element
  const handleLockElement = useCallback(() => {
    if (!selectedElementId) return;
    handleElementUpdate(selectedElementId, { locked: !selectedElement?.locked });
  }, [selectedElementId, selectedElement?.locked, handleElementUpdate]);

  // Layer controls
  const handleBringForward = useCallback(() => {
    if (!selectedElementId) return;
    handleElementUpdate(selectedElementId, { layer: (selectedElement?.layer || 1) + 1 });
  }, [selectedElementId, selectedElement?.layer, handleElementUpdate]);

  const handleSendBackward = useCallback(() => {
    if (!selectedElementId) return;
    handleElementUpdate(selectedElementId, { layer: Math.max(1, (selectedElement?.layer || 1) - 1) });
  }, [selectedElementId, selectedElement?.layer, handleElementUpdate]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const prevLayout = JSON.parse(JSON.stringify(history[newIndex]));
      setLayout(prevLayout);
      saveLayoutDebounced(prevLayout);
    }
  }, [historyIndex, history, setLayout, saveLayoutDebounced]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextLayout = JSON.parse(JSON.stringify(history[newIndex]));
      setLayout(nextLayout);
      saveLayoutDebounced(nextLayout);
    }
  }, [historyIndex, history, setLayout, saveLayoutDebounced]);

  // Save layout
  const handleSave = useCallback(async () => {
    await saveLayoutNow(layout);
  }, [layout, saveLayoutNow]);

  // Preview - opens modal
  const handlePreview = useCallback(() => {
    setPreviewOpen(true);
  }, []);

  // Open standalone preview in new route
  const handleOpenStandalonePreview = useCallback((layoutIdToPreview) => {
    setPreviewOpen(false);
    onNavigate?.(`yodeck-layout-preview-${layoutIdToPreview}`);
  }, [onNavigate]);

  // Back navigation
  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        onNavigate?.('layouts');
      }
    } else {
      onNavigate?.('layouts');
    }
  }, [hasUnsavedChanges, onNavigate]);

  // Open media library
  const handleOpenMediaLibrary = useCallback(() => {
    setMediaLibraryOpen(true);
  }, []);

  // Handle content selected from media library modal
  const handleMediaLibrarySelect = useCallback((item, type) => {
    // Create a new element based on the selected content type
    const basePosition = {
      x: 0.1,
      y: 0.1,
      width: 0.3,
      height: type === 'media' && item.media_type === 'video' ? 0.3 * (9/16) : 0.3,
    };

    let newElement = null;

    if (type === 'media') {
      // Image or video element
      const isVideo = item.media_type === 'video' || item.type === 'video';
      newElement = {
        id: `${isVideo ? 'video' : 'image'}-${Date.now()}`,
        type: isVideo ? 'video' : 'image',
        position: {
          ...basePosition,
          height: isVideo ? basePosition.width * (9/16) : basePosition.width * (item.height / item.width || 9/16),
        },
        props: {
          url: item.url,
          name: item.name,
          fit: 'contain',
        },
        layer: (layout?.elements?.length || 0) + 1,
      };
    } else if (type === 'playlists') {
      // Playlist element (zone)
      newElement = {
        id: `playlist-${Date.now()}`,
        type: 'playlist',
        position: basePosition,
        props: {
          playlistId: item.id,
          playlistName: item.name,
        },
        layer: (layout?.elements?.length || 0) + 1,
      };
    } else if (type === 'layouts') {
      // Nested layout element
      newElement = {
        id: `layout-${Date.now()}`,
        type: 'layout',
        position: basePosition,
        props: {
          layoutId: item.id,
          layoutName: item.name,
        },
        layer: (layout?.elements?.length || 0) + 1,
      };
    }

    if (newElement) {
      handleAddElement(newElement);
      showToast?.({ type: 'success', message: `Added ${item.name} to layout` });
    }
  }, [layout?.elements?.length, handleAddElement, showToast]);

  // Edit image with Pixie
  const handleEditImage = useCallback((element) => {
    if (element?.type === 'image' && element?.props?.url) {
      setEditingImageElement(element);
      setPixieOpen(true);
    }
  }, []);

  // Save edited image from Pixie (now receives Cloudinary URL)
  const handlePixieSave = useCallback((imageUrl) => {
    if (editingImageElement) {
      handleElementUpdate(editingImageElement.id, {
        props: { ...editingImageElement.props, url: imageUrl },
      });
    }
    setPixieOpen(false);
    setEditingImageElement(null);
  }, [editingImageElement, handleElementUpdate]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      // Don't handle if typing in an input
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        e.preventDefault();
        handleDeleteElement();
      }

      // Undo: Ctrl/Cmd + Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      // Redo: Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }

      // Save: Ctrl/Cmd + S
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      // Duplicate: Ctrl/Cmd + D
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        handleDuplicateElement();
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        setSelectedElementId(null);
      }

      // Arrow keys to nudge selected element
      if (selectedElementId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const nudge = e.shiftKey ? 0.01 : 0.005; // Shift for larger nudge
        const element = layout?.elements?.find(el => el.id === selectedElementId);
        if (element && !element.locked) {
          let { x, y } = element.position;
          if (e.key === 'ArrowUp') y = Math.max(0, y - nudge);
          if (e.key === 'ArrowDown') y = Math.min(1 - element.position.height, y + nudge);
          if (e.key === 'ArrowLeft') x = Math.max(0, x - nudge);
          if (e.key === 'ArrowRight') x = Math.min(1 - element.position.width, x + nudge);
          handleElementUpdate(selectedElementId, { position: { ...element.position, x, y } });
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedElementId,
    layout?.elements,
    handleDeleteElement,
    handleUndo,
    handleRedo,
    handleSave,
    handleDuplicateElement,
    handleElementUpdate,
  ]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
          <p className="text-gray-400">Loading layout editor...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !layout) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Failed to load layout</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button variant="outline" onClick={() => onNavigate?.('layouts')}>
            Back to Layouts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 overflow-hidden">
      {/* Top toolbar */}
      <TopToolbar
        layoutName={layout?.name}
        onNameChange={(name) => handleLayoutUpdate({ name })}
        background={layout?.background}
        onBackgroundChange={(background) => handleLayoutUpdate({ background })}
        zoom={zoom}
        onZoomChange={setZoom}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onPreview={handlePreview}
        onSave={handleSave}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        onBack={handleBack}
        selectedElement={selectedElement}
        onDeleteElement={handleDeleteElement}
        onDuplicateElement={handleDuplicateElement}
        onLockElement={handleLockElement}
        onBringForward={handleBringForward}
        onSendBackward={handleSendBackward}
        showLayersPanel={showLayersPanel}
        onToggleLayersPanel={() => setShowLayersPanel(!showLayersPanel)}
        orientation={orientation}
        canvasSize={canvasSize}
        onOrientationChange={handleOrientationChange}
        onCanvasSizeChange={handleCanvasSizeChange}
        onNavigate={onNavigate}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <LeftSidebar
          onAddElement={handleAddElement}
          onOpenMediaLibrary={handleOpenMediaLibrary}
          mediaItems={mediaItems}
          playlists={[]}
          smartGuidesEnabled={smartGuidesEnabled}
          onSmartGuidesChange={setSmartGuidesEnabled}
          showGrid={showGrid}
          onShowGridChange={setShowGrid}
        />

        {/* Canvas area */}
        <div className="flex-1 overflow-hidden">
          <LayoutEditorCanvas
            elements={layout?.elements || []}
            selectedElementId={selectedElementId}
            onElementSelect={setSelectedElementId}
            onElementUpdate={handleElementUpdate}
            background={layout?.background}
            zoom={zoom}
            showGrid={showGrid}
            smartGuidesEnabled={smartGuidesEnabled}
            canvasSize={canvasSize}
            onDoubleClick={(elementId) => {
              const element = layout?.elements?.find((el) => el.id === elementId);
              if (element?.type === 'image') {
                handleEditImage(element);
              }
            }}
          />
        </div>

        {/* Right properties panel */}
        <LayoutPropertiesPanel
          element={selectedElement}
          onElementUpdate={handleElementUpdate}
          onEditImage={handleEditImage}
        />
      </div>

      {/* Pixie image editor modal */}
      <PixieEditorModal
        isOpen={pixieOpen}
        onClose={() => {
          setPixieOpen(false);
          setEditingImageElement(null);
        }}
        imageUrl={editingImageElement?.props?.url}
        onSave={handlePixieSave}
        showToast={showToast}
      />

      {/* Layout Preview Modal */}
      <LayoutPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        layout={layout}
        layoutId={layoutId}
        onOpenStandalone={handleOpenStandalonePreview}
      />

      {/* Media Library Modal */}
      <InsertContentModal
        open={mediaLibraryOpen}
        onClose={() => setMediaLibraryOpen(false)}
        onSelect={handleMediaLibrarySelect}
        title="Insert Content"
        initialTab="media"
      />
    </div>
  );
}
